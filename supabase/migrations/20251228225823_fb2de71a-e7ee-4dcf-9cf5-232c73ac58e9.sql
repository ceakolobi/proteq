-- Add percentual_geral column to cotas table for general percentage
ALTER TABLE public.cotas 
ADD COLUMN IF NOT EXISTS percentual_geral numeric DEFAULT 0;