-- Adicionar novos campos ao cadastro de funcionários
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS pis_nis TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT;

-- Adicionar campos de validação de geolocalização aos registros de ponto
ALTER TABLE public.registros_ponto
ADD COLUMN IF NOT EXISTS distancia_metros DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS local_valido BOOLEAN DEFAULT TRUE;

-- Comentários para documentação
COMMENT ON COLUMN public.funcionarios.pis_nis IS 'Número do PIS/NIS do colaborador';
COMMENT ON COLUMN public.funcionarios.whatsapp IS 'Número de WhatsApp para comunicações';
COMMENT ON COLUMN public.registros_ponto.distancia_metros IS 'Distância em metros do local de trabalho no momento do registro';
COMMENT ON COLUMN public.registros_ponto.local_valido IS 'Indica se o registro foi feito dentro do raio de tolerância do local de trabalho';
