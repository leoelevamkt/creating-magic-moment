ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS sex text;
ALTER TABLE public.patients ALTER COLUMN birth_date DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN schooling DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.patients ADD CONSTRAINT patients_sex_check CHECK (sex IS NULL OR sex IN ('feminino','masculino','outro','nao_informado'));