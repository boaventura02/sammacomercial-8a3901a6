ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS cep text,
  ALTER COLUMN contract_end_date DROP NOT NULL,
  ALTER COLUMN responsible_name DROP NOT NULL,
  ALTER COLUMN responsible_contact DROP NOT NULL;