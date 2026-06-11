-- Adicionar coluna samma_status se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'samma_status') THEN
        ALTER TABLE public.companies ADD COLUMN samma_status text NOT NULL DEFAULT 'not_served';
        ALTER TABLE public.companies ADD CONSTRAINT companies_samma_status_check CHECK (samma_status IN ('already_client', 'won_by_seller', 'not_served'));
    END IF;
END $$;

-- Migrar dados da coluna antiga se ela existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_samma_client') THEN
        UPDATE public.companies SET samma_status = 'already_client' WHERE is_samma_client = true;
        UPDATE public.companies SET samma_status = 'not_served' WHERE is_samma_client = false AND samma_status = 'already_client';
    END IF;
END $$;

-- Garantir que o service_role e usuários autenticados tenham acesso (já deve estar configurado, mas reforçando para novos campos se necessário por PostgREST)
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
