ALTER TABLE public.associados
  ADD COLUMN IF NOT EXISTS cnh_numero    TEXT,
  ADD COLUMN IF NOT EXISTS cnh_categoria TEXT,
  ADD COLUMN IF NOT EXISTS cnh_validade  DATE,
  ADD COLUMN IF NOT EXISTS cnh_estado    TEXT;
