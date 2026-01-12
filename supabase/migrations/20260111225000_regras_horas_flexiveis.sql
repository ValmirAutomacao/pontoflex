-- ============================================
-- MIGRAÇÃO: Nova Arquitetura de Regras de Horas Flexíveis
-- Data: 2026-01-11
-- ============================================

-- 1. Tabela de Definições de Regras de Horas
CREATE TABLE IF NOT EXISTS regra_horas_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    apelido VARCHAR(100) NOT NULL,
    
    -- Tipo de Modelo
    tipo_modelo VARCHAR(20) DEFAULT 'BANCO' CHECK (tipo_modelo IN ('BANCO', 'PAGAMENTO')),
    
    -- Configurações de Banco (usadas se tipo_modelo = 'BANCO')
    tipo_ciclo VARCHAR(20) DEFAULT 'mensal' CHECK (tipo_ciclo IN ('mensal', 'trimestral', 'semestral', 'anual')),
    dia_inicio_ciclo INTEGER DEFAULT 1 CHECK (dia_inicio_ciclo >= 1 AND dia_inicio_ciclo <= 28),
    validade_meses INTEGER DEFAULT 3,
    limite_credito_horas INTEGER DEFAULT 40,
    limite_debito_horas INTEGER DEFAULT 10,
    permite_saldo_negativo BOOLEAN DEFAULT false,
    
    -- Percentuais de Horas Extras
    percentual_he_50 DECIMAL(5,2) DEFAULT 50.00,
    percentual_he_100 DECIMAL(5,2) DEFAULT 100.00,
    
    -- Adicional Noturno
    adicional_noturno_percentual DECIMAL(5,2) DEFAULT 20.00,
    inicio_horario_noturno TIME DEFAULT '22:00',
    fim_horario_noturno TIME DEFAULT '05:00',
    
    -- Controle
    is_default BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir apenas uma regra default por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_default_regra_empresa ON regra_horas_config (empresa_id) WHERE (is_default = true);

-- 2. Adicionar vínculos nas tabelas existentes
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS regra_horas_id UUID REFERENCES regra_horas_config(id) ON DELETE SET NULL;
ALTER TABLE locais_trabalho ADD COLUMN IF NOT EXISTS regra_horas_id UUID REFERENCES regra_horas_config(id) ON DELETE SET NULL;

-- 3. Tabela de Horas Extras para Pagamento (Folha)
CREATE TABLE IF NOT EXISTS horas_extras_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    data_referencia DATE NOT NULL,
    
    minutos_50 INTEGER DEFAULT 0,
    minutos_100 INTEGER DEFAULT 0,
    minutos_noturnos INTEGER DEFAULT 0, -- Adicional noturno simples
    minutos_he_noturna INTEGER DEFAULT 0, -- Hora extra dentro do horário noturno
    
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'pago', 'cancelado')),
    regra_id UUID REFERENCES regra_horas_config(id) ON DELETE SET NULL,
    descricao TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Refatorar banco_horas_movimentacoes para aceitar regra_id
ALTER TABLE banco_horas_movimentacoes ADD COLUMN IF NOT EXISTS regra_id UUID REFERENCES regra_horas_config(id) ON DELETE SET NULL;

-- 5. Migrar dados da configuração global antiga para a nova tabela
INSERT INTO regra_horas_config (
    empresa_id, apelido, tipo_modelo, tipo_ciclo, dia_inicio_ciclo, 
    limite_credito_horas, limite_debito_horas, permite_saldo_negativo, 
    is_default, ativo, created_at
)
SELECT 
    empresa_id, 'Regra Padrão (Migrada)', 'BANCO', tipo_ciclo, dia_inicio_ciclo,
    limite_credito_horas, limite_debito_horas, permite_saldo_negativo,
    true, ativo, created_at
FROM banco_horas_config
ON CONFLICT DO NOTHING;

-- 6. RLS Policies
ALTER TABLE regra_horas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE horas_extras_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode ver suas regras de horas" ON regra_horas_config
    FOR SELECT USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Empresa pode gerir suas regras de horas" ON regra_horas_config
    FOR ALL USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Empresa pode ver suas horas extras pagamento" ON horas_extras_pagamento
    FOR SELECT USING (empresa_id = get_my_empresa_id());

CREATE POLICY "Empresa pode gerir suas horas extras pagamento" ON horas_extras_pagamento
    FOR ALL USING (empresa_id = get_my_empresa_id());

-- 7. Comentários
COMMENT ON TABLE regra_horas_config IS 'Definições de modelos de banco de horas ou pagamento de horas extras';
COMMENT ON TABLE horas_extras_pagamento IS 'Registro de horas extras e adicionais noturnos calculados para pagamento em folha';
