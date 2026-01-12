-- ============================================
-- MIGRAÇÃO: Banco de Horas
-- Data: 2026-01-11
-- Descrição: Cria estrutura para gestão de banco de horas
-- ============================================

-- ============================================
-- 1. TABELA: Configuração do Banco de Horas por Empresa
-- ============================================
CREATE TABLE IF NOT EXISTS banco_horas_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Configurações de ciclo
    tipo_ciclo VARCHAR(20) DEFAULT 'mensal' CHECK (tipo_ciclo IN ('mensal', 'trimestral', 'semestral', 'anual')),
    dia_inicio_ciclo INTEGER DEFAULT 1 CHECK (dia_inicio_ciclo >= 1 AND dia_inicio_ciclo <= 28),
    
    -- Limites
    limite_credito_horas INTEGER DEFAULT 40, -- Máximo de horas que podem ser acumuladas
    limite_debito_horas INTEGER DEFAULT 10,  -- Máximo de horas negativas permitidas
    
    -- Regras
    permite_saldo_negativo BOOLEAN DEFAULT false,
    expira_saldo_ciclo BOOLEAN DEFAULT false, -- Se true, zera saldo no fim do ciclo
    
    -- Valores para cálculo
    percentual_hora_extra_50 DECIMAL(5,2) DEFAULT 50.00,  -- Adicional de 50%
    percentual_hora_extra_100 DECIMAL(5,2) DEFAULT 100.00, -- Adicional de 100%
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Garantir que cada empresa tenha apenas uma configuração
    CONSTRAINT unique_empresa_banco_horas UNIQUE (empresa_id)
);

-- Índice para busca por empresa
CREATE INDEX IF NOT EXISTS idx_banco_horas_config_empresa ON banco_horas_config(empresa_id);

-- ============================================
-- 2. TABELA: Movimentações do Banco de Horas
-- ============================================
CREATE TABLE IF NOT EXISTS banco_horas_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Data de referência (dia do registro que gerou a movimentação)
    data_referencia DATE NOT NULL,
    
    -- Tipo de movimentação
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('credito', 'debito', 'compensacao', 'ajuste', 'expiracao')),
    
    -- Valor em minutos (positivo para crédito, negativo para débito)
    minutos INTEGER NOT NULL,
    
    -- Descrição/Justificativa
    descricao TEXT,
    
    -- Referência ao registro de ponto que gerou (se automático)
    registro_ponto_id UUID REFERENCES registros_ponto(id) ON DELETE SET NULL,
    
    -- Quem aprovou (para compensações manuais)
    aprovado_por UUID REFERENCES funcionarios(id),
    data_aprovacao TIMESTAMPTZ,
    
    -- Status da movimentação
    status VARCHAR(20) DEFAULT 'aprovado' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Índices compostos para consultas frequentes
    CONSTRAINT check_minutos_nao_zero CHECK (minutos != 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_banco_horas_mov_funcionario ON banco_horas_movimentacoes(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_banco_horas_mov_empresa ON banco_horas_movimentacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_banco_horas_mov_data ON banco_horas_movimentacoes(data_referencia);
CREATE INDEX IF NOT EXISTS idx_banco_horas_mov_tipo ON banco_horas_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_banco_horas_mov_funcionario_data ON banco_horas_movimentacoes(funcionario_id, data_referencia);

-- ============================================
-- 3. VIEW: Saldo Consolidado do Banco de Horas
-- ============================================
CREATE OR REPLACE VIEW banco_horas_saldo AS
SELECT 
    m.funcionario_id,
    m.empresa_id,
    f.nome AS funcionario_nome,
    f.cpf AS funcionario_cpf,
    
    -- Totais por tipo
    COALESCE(SUM(CASE WHEN m.tipo = 'credito' AND m.status = 'aprovado' THEN m.minutos ELSE 0 END), 0) AS total_credito_minutos,
    COALESCE(SUM(CASE WHEN m.tipo IN ('debito', 'compensacao') AND m.status = 'aprovado' THEN ABS(m.minutos) ELSE 0 END), 0) AS total_debito_minutos,
    COALESCE(SUM(CASE WHEN m.tipo = 'ajuste' AND m.status = 'aprovado' THEN m.minutos ELSE 0 END), 0) AS total_ajuste_minutos,
    
    -- Saldo atual (crédito - débito + ajustes)
    COALESCE(SUM(
        CASE 
            WHEN m.tipo = 'credito' AND m.status = 'aprovado' THEN m.minutos
            WHEN m.tipo IN ('debito', 'compensacao', 'expiracao') AND m.status = 'aprovado' THEN -ABS(m.minutos)
            WHEN m.tipo = 'ajuste' AND m.status = 'aprovado' THEN m.minutos
            ELSE 0 
        END
    ), 0) AS saldo_minutos,
    
    -- Formatado em horas
    CONCAT(
        FLOOR(ABS(COALESCE(SUM(
            CASE 
                WHEN m.tipo = 'credito' AND m.status = 'aprovado' THEN m.minutos
                WHEN m.tipo IN ('debito', 'compensacao', 'expiracao') AND m.status = 'aprovado' THEN -ABS(m.minutos)
                WHEN m.tipo = 'ajuste' AND m.status = 'aprovado' THEN m.minutos
                ELSE 0 
            END
        ), 0)) / 60),
        'h ',
        MOD(ABS(COALESCE(SUM(
            CASE 
                WHEN m.tipo = 'credito' AND m.status = 'aprovado' THEN m.minutos
                WHEN m.tipo IN ('debito', 'compensacao', 'expiracao') AND m.status = 'aprovado' THEN -ABS(m.minutos)
                WHEN m.tipo = 'ajuste' AND m.status = 'aprovado' THEN m.minutos
                ELSE 0 
            END
        ), 0)), 60),
        'm'
    ) AS saldo_formatado,
    
    -- Última movimentação
    MAX(m.created_at) AS ultima_movimentacao,
    
    -- Contagem de movimentações
    COUNT(*) AS total_movimentacoes

FROM banco_horas_movimentacoes m
INNER JOIN funcionarios f ON f.id = m.funcionario_id
WHERE m.status = 'aprovado'
GROUP BY m.funcionario_id, m.empresa_id, f.nome, f.cpf;

-- ============================================
-- 4. FUNÇÃO: Calcular saldo do banco de horas por período
-- ============================================
CREATE OR REPLACE FUNCTION calcular_saldo_banco_horas(
    p_funcionario_id UUID,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
    total_credito INTEGER,
    total_debito INTEGER,
    saldo INTEGER,
    saldo_formatado TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credito INTEGER;
    v_debito INTEGER;
    v_saldo INTEGER;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'credito' THEN minutos ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo IN ('debito', 'compensacao', 'expiracao') THEN ABS(minutos) ELSE 0 END), 0)
    INTO v_credito, v_debito
    FROM banco_horas_movimentacoes
    WHERE funcionario_id = p_funcionario_id
      AND status = 'aprovado'
      AND (p_data_inicio IS NULL OR data_referencia >= p_data_inicio)
      AND (p_data_fim IS NULL OR data_referencia <= p_data_fim);
    
    v_saldo := v_credito - v_debito;
    
    RETURN QUERY SELECT 
        v_credito,
        v_debito,
        v_saldo,
        CONCAT(
            CASE WHEN v_saldo < 0 THEN '-' ELSE '' END,
            FLOOR(ABS(v_saldo) / 60)::TEXT,
            'h ',
            MOD(ABS(v_saldo), 60)::TEXT,
            'm'
        )::TEXT;
END;
$$;

-- ============================================
-- 5. FUNÇÃO: Adicionar movimentação ao banco de horas
-- ============================================
CREATE OR REPLACE FUNCTION adicionar_movimentacao_banco_horas(
    p_funcionario_id UUID,
    p_empresa_id UUID,
    p_data_referencia DATE,
    p_tipo VARCHAR(20),
    p_minutos INTEGER,
    p_descricao TEXT DEFAULT NULL,
    p_registro_ponto_id UUID DEFAULT NULL,
    p_aprovado_por UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_movimentacao_id UUID;
    v_config RECORD;
    v_saldo_atual INTEGER;
BEGIN
    -- Buscar configuração da empresa
    SELECT * INTO v_config FROM banco_horas_config WHERE empresa_id = p_empresa_id AND ativo = true;
    
    -- Se não encontrar configuração, criar uma padrão
    IF NOT FOUND THEN
        INSERT INTO banco_horas_config (empresa_id) VALUES (p_empresa_id);
        SELECT * INTO v_config FROM banco_horas_config WHERE empresa_id = p_empresa_id;
    END IF;
    
    -- Calcular saldo atual
    SELECT COALESCE(saldo_minutos, 0) INTO v_saldo_atual
    FROM banco_horas_saldo
    WHERE funcionario_id = p_funcionario_id;
    
    IF v_saldo_atual IS NULL THEN
        v_saldo_atual := 0;
    END IF;
    
    -- Verificar limites para débito
    IF p_tipo IN ('debito', 'compensacao') THEN
        IF NOT v_config.permite_saldo_negativo AND (v_saldo_atual - ABS(p_minutos)) < 0 THEN
            RAISE EXCEPTION 'Saldo insuficiente no banco de horas. Saldo atual: % minutos', v_saldo_atual;
        END IF;
        
        IF v_config.permite_saldo_negativo AND (v_saldo_atual - ABS(p_minutos)) < -(v_config.limite_debito_horas * 60) THEN
            RAISE EXCEPTION 'Limite de débito excedido. Limite máximo: % horas', v_config.limite_debito_horas;
        END IF;
    END IF;
    
    -- Verificar limite de crédito
    IF p_tipo = 'credito' THEN
        IF (v_saldo_atual + p_minutos) > (v_config.limite_credito_horas * 60) THEN
            RAISE EXCEPTION 'Limite de crédito excedido. Limite máximo: % horas', v_config.limite_credito_horas;
        END IF;
    END IF;
    
    -- Inserir movimentação
    INSERT INTO banco_horas_movimentacoes (
        funcionario_id,
        empresa_id,
        data_referencia,
        tipo,
        minutos,
        descricao,
        registro_ponto_id,
        aprovado_por,
        data_aprovacao,
        status,
        created_by
    ) VALUES (
        p_funcionario_id,
        p_empresa_id,
        p_data_referencia,
        p_tipo,
        CASE WHEN p_tipo IN ('debito', 'compensacao') THEN -ABS(p_minutos) ELSE p_minutos END,
        p_descricao,
        p_registro_ponto_id,
        p_aprovado_por,
        CASE WHEN p_aprovado_por IS NOT NULL THEN NOW() ELSE NULL END,
        CASE WHEN p_aprovado_por IS NOT NULL THEN 'aprovado' ELSE 'pendente' END,
        auth.uid()
    )
    RETURNING id INTO v_movimentacao_id;
    
    RETURN v_movimentacao_id;
END;
$$;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE banco_horas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Policy para banco_horas_config
CREATE POLICY "Empresa pode ver sua config de banco de horas"
    ON banco_horas_config
    FOR SELECT
    USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Empresa pode criar sua config de banco de horas"
    ON banco_horas_config
    FOR INSERT
    WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Empresa pode atualizar sua config de banco de horas"
    ON banco_horas_config
    FOR UPDATE
    USING (empresa_id = get_my_empresa_id());

-- Policy para banco_horas_movimentacoes
CREATE POLICY "Empresa pode ver movimentacoes de banco de horas"
    ON banco_horas_movimentacoes
    FOR SELECT
    USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Empresa pode criar movimentacoes de banco de horas"
    ON banco_horas_movimentacoes
    FOR INSERT
    WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "Empresa pode atualizar movimentacoes de banco de horas"
    ON banco_horas_movimentacoes
    FOR UPDATE
    USING (empresa_id = get_my_empresa_id());

-- ============================================
-- 7. TRIGGER: Atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_banco_horas_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_banco_horas_config_updated_at
    BEFORE UPDATE ON banco_horas_config
    FOR EACH ROW
    EXECUTE FUNCTION update_banco_horas_config_updated_at();

-- ============================================
-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE banco_horas_config IS 'Configuração do banco de horas por empresa';
COMMENT ON TABLE banco_horas_movimentacoes IS 'Movimentações do banco de horas (créditos, débitos, compensações)';
COMMENT ON VIEW banco_horas_saldo IS 'View consolidada com saldo atual de cada funcionário';
COMMENT ON FUNCTION calcular_saldo_banco_horas IS 'Calcula saldo do banco de horas por período';
COMMENT ON FUNCTION adicionar_movimentacao_banco_horas IS 'Adiciona movimentação validando limites configurados';
