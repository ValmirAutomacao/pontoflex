-- ============================================
-- MIGRAÇÃO: Cálculo Automático de Banco de Horas
-- Data: 2026-01-11
-- ============================================

-- 1. Função para calcular minutos trabalhados em um dia
CREATE OR REPLACE FUNCTION calcular_minutos_trabalhados_dia(p_funcionario_id UUID, p_data DATE)
RETURNS INTEGER AS $$
DECLARE
    regs RECORD;
    v_total_minutos INTEGER := 0;
    v_entrada TIME;
    v_saida_almoco TIME;
    v_retorno_almoco TIME;
    v_saida TIME;
BEGIN
    -- Buscar os registros do dia
    SELECT 
        MAX(CASE WHEN tipo_registro = 'entrada' THEN hora_registro END) as entrada,
        MAX(CASE WHEN tipo_registro = 'saida_almoco' THEN hora_registro END) as saida_almoco,
        MAX(CASE WHEN tipo_registro = 'retorno_almoco' THEN hora_registro END) as retorno_almoco,
        MAX(CASE WHEN tipo_registro = 'saida' THEN hora_registro END) as saida
    INTO v_entrada, v_saida_almoco, v_retorno_almoco, v_saida
    FROM registros_ponto
    WHERE funcionario_id = p_funcionario_id AND data_registro = p_data;

    -- Cálculo: (Saída Almoço - Entrada) + (Saída - Retorno Almoço)
    IF v_entrada IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
        v_total_minutos := v_total_minutos + (EXTRACT(EPOCH FROM (v_saida_almoco - v_entrada)) / 60)::INTEGER;
    END IF;

    IF v_retorno_almoco IS NOT NULL AND v_saida IS NOT NULL THEN
        v_total_minutos := v_total_minutos + (EXTRACT(EPOCH FROM (v_saida - v_retorno_almoco)) / 60)::INTEGER;
    ELSIF v_entrada IS NOT NULL AND v_saida IS NOT NULL AND v_saida_almoco IS NULL THEN
        -- Caso direto sem almoço registrado
        v_total_minutos := (EXTRACT(EPOCH FROM (v_saida - v_entrada)) / 60)::INTEGER;
    END IF;

    RETURN v_total_minutos;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Função principal de processamento do Banco de Horas
CREATE OR REPLACE FUNCTION processar_banco_horas_registro()
RETURNS TRIGGER AS $$
DECLARE
    v_funcionario RECORD;
    v_jornada RECORD;
    v_minutos_trabalhados INTEGER;
    v_saldo_dia INTEGER;
    v_mov_id UUID;
    v_empresa_id UUID;
BEGIN
    -- Obter dados do funcionário e sua jornada
    SELECT f.*, j.carga_horaria_diaria 
    INTO v_funcionario
    FROM funcionarios f
    LEFT JOIN jornadas_trabalho j ON f.jornada_id = j.id
    WHERE f.id = NEW.funcionario_id;

    -- Se não tem jornada definida, não calcula automaticamente
    IF v_funcionario.carga_horaria_diaria IS NULL OR v_funcionario.carga_horaria_diaria = 0 THEN
        RETURN NEW;
    END IF;

    -- Calcular total trabalhado no dia do registro
    v_minutos_trabalhados := calcular_minutos_trabalhados_dia(NEW.funcionario_id, NEW.data_registro);

    -- Só processamos se houver pelo menos uma entrada e uma saída no dia
    -- Ou se já for o fim do dia e quisermos calcular o débito (falta)
    -- Para este MVP, vamos calcular apenas quando houver o registro de 'saida'
    IF NOT EXISTS (
        SELECT 1 FROM registros_ponto 
        WHERE funcionario_id = NEW.funcionario_id 
        AND data_registro = NEW.data_registro 
        AND tipo_registro = 'saida'
    ) THEN
        RETURN NEW;
    END IF;

    -- Cálculo do saldo (Minutos Trabalhados - Carga Horária)
    -- carga_horaria_diaria costuma estar em horas no banco, converter para minutos
    -- Se estiver em minutos, ajustar. Notei que em muitas tabelas de Ponto Flex tratamos como horas.
    -- Verificando schema: carga_horaria_diaria é integer. Vou assumir minutos se > 24, senão horas.
    IF v_funcionario.carga_horaria_diaria <= 24 THEN
        v_saldo_dia := v_minutos_trabalhados - (v_funcionario.carga_horaria_diaria * 60);
    ELSE
        v_saldo_dia := v_minutos_trabalhados - v_funcionario.carga_horaria_diaria;
    END IF;

    -- Remover movimentações automáticas anteriores deste mesmo dia para evitar duplicidade
    DELETE FROM banco_horas_movimentacoes 
    WHERE funcionario_id = NEW.funcionario_id 
    AND data_referencia = NEW.data_registro
    AND tipo IN ('credito', 'debito')
    AND descricao LIKE '[Auto] %';

    -- Se o saldo for diferente de 0, criar nova movimentação
    IF v_saldo_dia != 0 THEN
        INSERT INTO banco_horas_movimentacoes (
            funcionario_id,
            empresa_id,
            data_referencia,
            tipo,
            minutos,
            descricao,
            status,
            created_at
        ) VALUES (
            NEW.funcionario_id,
            NEW.empresa_id,
            NEW.data_registro,
            CASE WHEN v_saldo_dia > 0 THEN 'credito' ELSE 'debito' END,
            v_saldo_dia,
            '[Auto] Saldo do dia ' || to_char(NEW.data_registro, 'DD/MM/YYYY'),
            'aprovado',
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar o Trigger
DROP TRIGGER IF EXISTS trg_processar_banco_horas ON registros_ponto;
CREATE TRIGGER trg_processar_banco_horas
AFTER INSERT OR UPDATE ON registros_ponto
FOR EACH ROW
EXECUTE FUNCTION processar_banco_horas_registro();

-- 4. Comentário
COMMENT ON FUNCTION processar_banco_horas_registro IS 'Calcula automaticamente crédito/débito de banco de horas ao registrar ponto';
