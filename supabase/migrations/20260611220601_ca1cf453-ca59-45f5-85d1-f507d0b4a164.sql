-- Update companies table with new structure
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS has_outsourced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS outsourced_services TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_contact TEXT;

-- Update existing rows to have values for required fields if they are null
UPDATE public.companies SET responsible_name = 'Não informado' WHERE responsible_name IS NULL;
UPDATE public.companies SET responsible_contact = 'Não informado' WHERE responsible_contact IS NULL;

-- Make fields required
ALTER TABLE public.companies 
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN contract_end_date SET NOT NULL,
ALTER COLUMN responsible_name SET NOT NULL,
ALTER COLUMN responsible_contact SET NOT NULL;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Policies for companies
DROP POLICY IF EXISTS "Sellers can manage their own companies" ON public.companies;
CREATE POLICY "Sellers can manage their own companies" 
ON public.companies 
FOR ALL 
TO authenticated 
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Ensure admin still has access (assuming admin role exists or service_role handles it)
GRANT ALL ON public.companies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
