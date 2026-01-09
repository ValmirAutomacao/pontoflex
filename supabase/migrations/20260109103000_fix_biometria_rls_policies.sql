-- Migration: Enable RLS policies for funcionarios_biometria table
-- This allows public INSERT/UPDATE for biometry registration via token link

-- Enable RLS on funcionarios_biometria if not already enabled
ALTER TABLE public.funcionarios_biometria ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "allow_public_select_biometria" ON public.funcionarios_biometria;
DROP POLICY IF EXISTS "allow_public_insert_biometria" ON public.funcionarios_biometria;
DROP POLICY IF EXISTS "allow_public_update_biometria" ON public.funcionarios_biometria;
DROP POLICY IF EXISTS "allow_authenticated_all_biometria" ON public.funcionarios_biometria;

-- Policy 1: Allow public SELECT (for validation and verification)
CREATE POLICY "allow_public_select_biometria" ON public.funcionarios_biometria
    FOR SELECT
    TO public
    USING (true);

-- Policy 2: Allow public INSERT (for remote biometry registration via token)
CREATE POLICY "allow_public_insert_biometria" ON public.funcionarios_biometria
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Policy 3: Allow public UPDATE (for updating biometry via token)
CREATE POLICY "allow_public_update_biometria" ON public.funcionarios_biometria
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Policy 4: Allow authenticated users full access (for admin operations)
CREATE POLICY "allow_authenticated_all_biometria" ON public.funcionarios_biometria
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add updated_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'funcionarios_biometria' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.funcionarios_biometria ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Comment for documentation
COMMENT ON TABLE public.funcionarios_biometria IS 'Stores facial biometry descriptors for employees. RLS policies allow public access for remote biometry registration via token.';
