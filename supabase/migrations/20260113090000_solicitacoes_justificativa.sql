-- Migration: Solicitações de Justificativa e Notificações
-- Data: 2026-01-13
-- Descrição: Cria as tabelas para o sistema de solicitações de justificativa/atestado e notificações in-app

-- =====================================================
-- TABELA: solicitacoes_justificativa
-- Workflow de solicitações de justificativa e atestados médicos
-- =====================================================
CREATE TABLE IF NOT EXISTS solicitacoes_justificativa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('justificativa', 'atestado')),
    
    -- Campos comuns
    motivo TEXT NOT NULL,
    data_ocorrencia DATE NOT NULL,
    hora_afetada TIME, -- NULL se for dia todo
    dia_inteiro BOOLEAN DEFAULT false,
    
    -- Campos específicos para atestado
    cid VARCHAR(10),
    quantidade_dias INTEGER,
    documento_url TEXT, -- Imagem do atestado (obrigatório para atestado)
    
    -- Workflow
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    aprovado_por UUID REFERENCES funcionarios(id),
    data_aprovacao TIMESTAMPTZ,
    observacao_aprovador TEXT,
    
    -- Auditoria
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_solicitacoes_funcionario ON solicitacoes_justificativa(funcionario_id);
CREATE INDEX idx_solicitacoes_empresa ON solicitacoes_justificativa(empresa_id);
CREATE INDEX idx_solicitacoes_status ON solicitacoes_justificativa(status);
CREATE INDEX idx_solicitacoes_data ON solicitacoes_justificativa(data_ocorrencia);

-- =====================================================
-- TABELA: notificacoes
-- Sistema de notificações in-app
-- =====================================================
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT,
    lida BOOLEAN DEFAULT false,
    link TEXT,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX idx_notificacoes_empresa ON notificacoes(empresa_id);

-- =====================================================
-- RLS Policies para solicitacoes_justificativa
-- =====================================================
ALTER TABLE solicitacoes_justificativa ENABLE ROW LEVEL SECURITY;

-- Funcionário pode ver suas próprias solicitações
CREATE POLICY "funcionario_view_own_solicitacoes" ON solicitacoes_justificativa
    FOR SELECT USING (
        funcionario_id = (SELECT id FROM funcionarios WHERE user_id = auth.uid())
        OR empresa_id = get_my_empresa_id()
    );

-- Funcionário pode criar suas próprias solicitações
CREATE POLICY "funcionario_create_solicitacoes" ON solicitacoes_justificativa
    FOR INSERT WITH CHECK (
        funcionario_id = (SELECT id FROM funcionarios WHERE user_id = auth.uid())
        OR empresa_id = get_my_empresa_id()
    );

-- Gestor/Admin pode atualizar solicitações da empresa (aprovar/rejeitar)
CREATE POLICY "gestor_update_solicitacoes" ON solicitacoes_justificativa
    FOR UPDATE USING (empresa_id = get_my_empresa_id());

-- =====================================================
-- RLS Policies para notificacoes
-- =====================================================
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver suas próprias notificações
CREATE POLICY "usuario_view_own_notificacoes" ON notificacoes
    FOR SELECT USING (
        usuario_id = (SELECT id FROM funcionarios WHERE user_id = auth.uid())
    );

-- Sistema pode criar notificações (via service role)
CREATE POLICY "sistema_create_notificacoes" ON notificacoes
    FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());

-- Usuário pode marcar suas notificações como lidas
CREATE POLICY "usuario_update_own_notificacoes" ON notificacoes
    FOR UPDATE USING (
        usuario_id = (SELECT id FROM funcionarios WHERE user_id = auth.uid())
    );

-- =====================================================
-- FUNÇÃO: Criar notificação ao criar solicitação
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_solicitacao()
RETURNS TRIGGER AS $$
DECLARE
    v_nome_funcionario TEXT;
    v_gestores RECORD;
BEGIN
    -- Busca o nome do funcionário
    SELECT nome INTO v_nome_funcionario 
    FROM funcionarios 
    WHERE id = NEW.funcionario_id;
    
    -- Notifica todos os gestores/admins da empresa
    FOR v_gestores IN 
        SELECT f.id 
        FROM funcionarios f
        JOIN funcoes fn ON fn.id = f.funcao_id
        WHERE f.empresa_id = NEW.empresa_id 
        AND fn.nivel = 1 -- Nível Gestão
    LOOP
        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link, empresa_id)
        VALUES (
            v_gestores.id,
            CASE WHEN NEW.tipo = 'atestado' THEN 'ATESTADO_PENDENTE' ELSE 'JUSTIFICATIVA_PENDENTE' END,
            CASE WHEN NEW.tipo = 'atestado' THEN 'Novo Atestado Médico' ELSE 'Nova Solicitação de Justificativa' END,
            v_nome_funcionario || ' enviou uma solicitação para aprovação.',
            '/aprovacao-justificativas',
            NEW.empresa_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificação automática
DROP TRIGGER IF EXISTS trigger_notify_solicitacao ON solicitacoes_justificativa;
CREATE TRIGGER trigger_notify_solicitacao
    AFTER INSERT ON solicitacoes_justificativa
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_solicitacao();

-- =====================================================
-- FUNÇÃO: Notificar funcionário sobre resultado
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_solicitacao_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'pendente' AND NEW.status IN ('aprovado', 'rejeitado') THEN
        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link, empresa_id)
        VALUES (
            NEW.funcionario_id,
            CASE WHEN NEW.status = 'aprovado' THEN 'SOLICITACAO_APROVADA' ELSE 'SOLICITACAO_REJEITADA' END,
            CASE WHEN NEW.status = 'aprovado' THEN 'Solicitação Aprovada ✓' ELSE 'Solicitação Rejeitada' END,
            CASE 
                WHEN NEW.status = 'aprovado' THEN 'Sua solicitação de ' || NEW.tipo || ' foi aprovada.'
                ELSE 'Sua solicitação de ' || NEW.tipo || ' foi rejeitada. ' || COALESCE(NEW.observacao_aprovador, '')
            END,
            '/minhas-solicitacoes',
            NEW.empresa_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificação de resultado
DROP TRIGGER IF EXISTS trigger_notify_solicitacao_result ON solicitacoes_justificativa;
CREATE TRIGGER trigger_notify_solicitacao_result
    AFTER UPDATE ON solicitacoes_justificativa
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_solicitacao_update();
