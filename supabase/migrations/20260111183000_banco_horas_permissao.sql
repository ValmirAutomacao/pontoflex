-- ============================================
-- MIGRAÇÃO: Adicionar permissão modulo_banco_horas
-- e policy de DELETE para movimentações
-- Data: 2026-01-11
-- ============================================

-- 1. Adicionar permissão às funções existentes do tipo Administrador
UPDATE funcoes 
SET permissoes = permissoes || '"modulo_banco_horas"'::jsonb
WHERE nome ILIKE '%admin%' 
  AND permissoes IS NOT NULL 
  AND NOT permissoes::text LIKE '%modulo_banco_horas%';

-- 2. Criar policy de DELETE para movimentações
CREATE POLICY "Empresa pode deletar movimentacoes de banco de horas"
    ON banco_horas_movimentacoes
    FOR DELETE
    USING (empresa_id = get_my_empresa_id());

-- 3. Garantir que todas as funções administrativas tenham a nova permissão
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, permissoes 
        FROM funcoes 
        WHERE (nome ILIKE '%admin%' OR nome ILIKE '%gerente%' OR nome ILIKE '%gestor%')
          AND permissoes IS NOT NULL
    LOOP
        -- Verificar se já tem a permissão
        IF NOT (r.permissoes::text LIKE '%modulo_banco_horas%') THEN
            UPDATE funcoes 
            SET permissoes = (
                SELECT jsonb_agg(elem) 
                FROM (
                    SELECT jsonb_array_elements(r.permissoes) AS elem
                    UNION
                    SELECT '"modulo_banco_horas"'::jsonb
                ) sub
            )
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- 4. Comentário
COMMENT ON POLICY "Empresa pode deletar movimentacoes de banco de horas" ON banco_horas_movimentacoes IS 'Permite que empresas excluam suas próprias movimentações de banco de horas';
