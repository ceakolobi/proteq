-- Add percentual_extra column to cotas table for individual percentage increase
ALTER TABLE public.cotas 
ADD COLUMN IF NOT EXISTS percentual_extra numeric DEFAULT 0;