-- ============================================
-- MIGRAÇÃO: Escalas de Serviço e Jornadas Complexas
-- Descrição: Criação das tabelas para suporte a 12x36, Horistas e Exceções.
-- Data: 2026-01-12
-- ============================================

-- 1. Tabela de Escalas (Modelos de Trabalho)
CREATE TABLE escalas_servico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('NORMAL', 'HORISTA', 'FLEXIVEL', '12X36', 'PLANTAO')),
    cor VARCHAR(7) DEFAULT '#3B82F6', -- Cor para exibição no calendário
    carga_horaria_diaria INTEGER, -- Minutos (opcional se for horista)
    carga_horaria_semanal INTEGER, -- Minutos
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Horários Semanais da Escala
CREATE TABLE escalas_horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escala_id UUID REFERENCES escalas_servico(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom, 1=Seg...
    entrada TIME,
    saida_almoco TIME,
    retorno_almoco TIME,
    saida TIME,
    is_folga BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Atribuição: Funcionário -> Escala
CREATE TABLE funcionarios_escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    escala_id UUID REFERENCES escalas_servico(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES empresas(id) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(funcionario_id, data_inicio)
);

-- 4. Exceções e Ajustes de Escala (Folgas trocadas, plantões extras)
CREATE TABLE escalas_excecoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) NOT NULL,
    empresa_id UUID REFERENCES empresas(id) NOT NULL,
    data DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('FOLGA', 'TROCA', 'PLANTAO_EXTRA', 'FERIADO_TRABALHADO')),
    escala_original_id UUID REFERENCES escalas_servico(id),
    escala_nova_id UUID REFERENCES escalas_servico(id),
    observacoes TEXT,
    aprovado_por UUID REFERENCES funcionarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Habilitar RLS
ALTER TABLE escalas_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas_excecoes ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS (Simplificadas para Empresa)
CREATE POLICY "Empresa visualiza suas escalas" ON escalas_servico FOR ALL USING (empresa_id IN (SELECT get_my_empresa_id()));
CREATE POLICY "Empresa visualiza seus horarios" ON escalas_horarios FOR ALL USING (escala_id IN (SELECT id FROM escalas_servico WHERE empresa_id IN (SELECT get_my_empresa_id())));
CREATE POLICY "Empresa visualiza atribuições" ON funcionarios_escalas FOR ALL USING (empresa_id IN (SELECT get_my_empresa_id()));
CREATE POLICY "Empresa visualiza exceções" ON escalas_excecoes FOR ALL USING (empresa_id IN (SELECT get_my_empresa_id()));

-- 7. Trigger para UpdatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_escalas_servico_updated_at BEFORE UPDATE ON escalas_servico FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
