-- ============================================
-- MIGRAÇÃO: Trigger de Cálculo de Alta Performance v2
-- Descrição: Implementa hierarquia de regras, adicional noturno e extras pagas.
-- Data: 2026-01-11
-- ============================================

-- 1. Função para resolver qual regra aplicar (Hierarquia: Funcionário > Local > Empresa)
CREATE OR REPLACE FUNCTION obter_regra_viva(
    p_funcionario_id UUID,
    p_local_id UUID,
    p_empresa_id UUID
) RETURNS UUID AS $$
DECLARE
    v_regra_id UUID;
BEGIN
    -- 1. Prioridade: Regra específica do Funcionário
    SELECT regra_horas_id INTO v_regra_id FROM funcionarios WHERE id = p_funcionario_id;
    IF v_regra_id IS NOT NULL THEN RETURN v_regra_id; END IF;

    -- 2. Segunda opção: Regra do Local de Trabalho
    IF p_local_id IS NOT NULL THEN
        SELECT regra_horas_id INTO v_regra_id FROM locais_trabalho WHERE id = p_local_id;
        IF v_regra_id IS NOT NULL THEN RETURN v_regra_id; END IF;
    END IF;

    -- 3. Fallback: Regra padrão da Empresa
    SELECT id INTO v_regra_id FROM regra_horas_config 
    WHERE empresa_id = p_empresa_id AND is_default = true AND ativo = true 
    LIMIT 1;
    
    RETURN v_regra_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Função para calcular minutos em um intervalo específico
CREATE OR REPLACE FUNCTION intersecao_minutos(
    p_ent TIMESTAMP, p_sai TIMESTAMP, 
    p_inicio_ref TIME, p_fim_ref TIME
) RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER := 0;
    v_curr_date DATE;
    v_ref_ini TIMESTAMP;
    v_ref_fim TIMESTAMP;
BEGIN
    v_curr_date := p_ent::DATE;
    
    -- Tratar intervalo que vira o dia (ex: 22:00 às 05:00)
    IF p_inicio_ref > p_fim_ref THEN
        -- Parte 1: Início até meia-noite
        v_ref_ini := (v_curr_date || ' ' || p_inicio_ref)::TIMESTAMP;
        v_ref_fim := (v_curr_date || ' 23:59:59')::TIMESTAMP;
        v_total := v_total + LEAST(EXTRACT(EPOCH FROM (LEAST(p_sai, v_ref_fim) - GREATER(p_ent, v_ref_ini))) / 60, 0)::INTEGER;
        
        -- Parte 2: Meia-noite até fim
        v_ref_ini := (v_curr_date || ' 00:00:00')::TIMESTAMP;
        v_ref_fim := (v_curr_date || ' ' || p_fim_ref)::TIMESTAMP;
        -- Se o registro sai no dia seguinte, ou se a referência é no dia atual
        v_total := v_total + GREATER(EXTRACT(EPOCH FROM (LEAST(p_sai, v_ref_fim) - GREATER(p_ent, v_ref_ini))) / 60, 0)::INTEGER;
    ELSE
        v_ref_ini := (v_curr_date || ' ' || p_inicio_ref)::TIMESTAMP;
        v_ref_fim := (v_curr_date || ' ' || p_fim_ref)::TIMESTAMP;
        v_total := GREATER(EXTRACT(EPOCH FROM (LEAST(p_sai, v_ref_fim) - GREATER(p_ent, v_ref_ini))) / 60, 0)::INTEGER;
    END IF;

    RETURN GREATER(v_total, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Função principal de cálculo v2
CREATE OR REPLACE FUNCTION processar_ponto_v2()
RETURNS TRIGGER AS $$
DECLARE
    v_funcionario RECORD;
    v_regra RECORD;
    v_jornada RECORD;
    v_minutos_totais INTEGER := 0;
    v_minutos_noturnos INTEGER := 0;
    v_carga_horaria INTEGER;
    v_saldo_dia INTEGER;
    
    -- Auxiliares para cálculo de intervalo
    v_entrada TIMESTAMP;
    v_saida_almoco TIMESTAMP;
    v_retorno_almoco TIMESTAMP;
    v_saida TIMESTAMP;
    
    v_ent_reg TIME;
    v_sai_alm_reg TIME;
    v_ret_alm_reg TIME;
    v_sai_reg TIME;
BEGIN
    -- 1. Obter dados básicos
    SELECT f.*, j.carga_horaria_diaria 
    INTO v_funcionario
    FROM funcionarios f
    LEFT JOIN jornadas_trabalho j ON f.jornada_id = j.id
    WHERE f.id = NEW.funcionario_id;

    -- Se não tem jornada, não podemos calcular saldo
    IF v_funcionario.carga_horaria_diaria IS NULL THEN RETURN NEW; END IF;
    v_carga_horaria := CASE WHEN v_funcionario.carga_horaria_diaria <= 24 THEN v_funcionario.carga_horaria_diaria * 60 ELSE v_funcionario.carga_horaria_diaria END;

    -- 2. Resolver Regra
    SELECT * INTO v_regra FROM regra_horas_config 
    WHERE id = obter_regra_viva(NEW.funcionario_id, NEW.local_trabalho_id, NEW.empresa_id);

    -- 3. Buscar registros do dia (usando timestamp para precisão se disponível, senão compondo com data)
    SELECT 
        MAX(CASE WHEN tipo_registro = 'entrada' THEN hora_registro END),
        MAX(CASE WHEN tipo_registro = 'saida_almoco' THEN hora_registro END),
        MAX(CASE WHEN tipo_registro = 'retorno_almoco' THEN hora_registro END),
        MAX(CASE WHEN tipo_registro = 'saida' THEN hora_registro END)
    INTO v_ent_reg, v_sai_alm_reg, v_ret_alm_reg, v_sai_reg
    FROM registros_ponto
    WHERE funcionario_id = NEW.funcionario_id AND data_registro = NEW.data_registro;

    -- Compilar Timestamps (simplificado para mesmo dia, melhorias necessárias para jornadas que viram o dia)
    v_entrada := (NEW.data_registro || ' ' || v_ent_reg)::TIMESTAMP;
    v_saida_almoco := (NEW.data_registro || ' ' || v_sai_alm_reg)::TIMESTAMP;
    v_retorno_almoco := (NEW.data_registro || ' ' || v_ret_alm_reg)::TIMESTAMP;
    v_saida := (NEW.data_registro || ' ' || v_sai_reg)::TIMESTAMP;

    -- 4. Cálculo de Minutos Totais e Noturnos
    -- Primeiro Turno
    IF v_ent_reg IS NOT NULL AND v_sai_alm_reg IS NOT NULL THEN
        v_minutos_totais := v_minutos_totais + (EXTRACT(EPOCH FROM (v_saida_almoco - v_entrada)) / 60)::INTEGER;
        v_minutos_noturnos := v_minutos_noturnos + intersecao_minutos(v_entrada, v_saida_almoco, v_regra.inicio_horario_noturno, v_regra.fim_horario_noturno);
    END IF;

    -- Segundo Turno
    IF v_ret_alm_reg IS NOT NULL AND v_sai_reg IS NOT NULL THEN
        v_minutos_totais := v_minutos_totais + (EXTRACT(EPOCH FROM (v_saida - v_retorno_almoco)) / 60)::INTEGER;
        v_minutos_noturnos := v_minutos_noturnos + intersecao_minutos(v_retorno_almoco, v_saida, v_regra.inicio_horario_noturno, v_regra.fim_horario_noturno);
    ELSIF v_ent_reg IS NOT NULL AND v_sai_reg IS NOT NULL AND v_sai_alm_reg IS NULL THEN
        -- Turno único
        v_minutos_totais := (EXTRACT(EPOCH FROM (v_saida - v_entrada)) / 60)::INTEGER;
        v_minutos_noturnos := v_minutos_noturnos + intersecao_minutos(v_entrada, v_saida, v_regra.inicio_horario_noturno, v_regra.fim_horario_noturno);
    END IF;

    -- 5. Limpeza de registros automáticos anteriores
    DELETE FROM banco_horas_movimentacoes WHERE funcionario_id = NEW.funcionario_id AND data_referencia = NEW.data_registro AND descricao LIKE '[Auto]%';
    DELETE FROM horas_extras_pagamento WHERE funcionario_id = NEW.funcionario_id AND data_referencia = NEW.data_registro;

    -- 6. Aplicação da Regra (BANCO vs PAGAMENTO)
    v_saldo_dia := v_minutos_totais - v_carga_horaria;

    IF v_regra.tipo_modelo = 'BANCO' THEN
        IF v_saldo_dia != 0 THEN
            INSERT INTO banco_horas_movimentacoes (
                funcionario_id, empresa_id, data_referencia, tipo, minutos, 
                descricao, regra_id, status
            ) VALUES (
                NEW.funcionario_id, NEW.empresa_id, NEW.data_registro, 
                CASE WHEN v_saldo_dia > 0 THEN 'credito' ELSE 'debito' END,
                v_saldo_dia, '[Auto] Saldo via Regra: ' || v_regra.apelido, v_regra.id, 'aprovado'
            );
        END IF;
    ELSE
        -- Modelo PAGAMENTO (Horas Extras)
        IF v_saldo_dia > 0 THEN
            INSERT INTO horas_extras_pagamento (
                funcionario_id, empresa_id, data_referencia, minutos_50, regra_id
            ) VALUES (
                NEW.funcionario_id, NEW.empresa_id, NEW.data_registro, v_saldo_dia, v_regra.id
            );
        END IF;
    END IF;

    -- 7. Gravar Adicional Noturno se houver
    IF v_minutos_noturnos > 0 THEN
        -- Verifica se já existe registro de extras para o dia para atualizar ou criar
        IF EXISTS (SELECT 1 FROM horas_extras_pagamento WHERE funcionario_id = NEW.funcionario_id AND data_referencia = NEW.data_registro) THEN
            UPDATE horas_extras_pagamento SET minutos_noturnos = v_minutos_noturnos 
            WHERE funcionario_id = NEW.funcionario_id AND data_referencia = NEW.data_registro;
        ELSE
            INSERT INTO horas_extras_pagamento (
                funcionario_id, empresa_id, data_referencia, minutos_noturnos, regra_id
            ) VALUES (
                NEW.funcionario_id, NEW.empresa_id, NEW.data_registro, v_minutos_noturnos, v_regra.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Reatribui o Trigger
DROP TRIGGER IF EXISTS trg_processar_banco_horas ON registros_ponto;
CREATE TRIGGER trg_processar_banco_horas
AFTER INSERT OR UPDATE ON registros_ponto
FOR EACH ROW
EXECUTE FUNCTION processar_ponto_v2();
