-- Add percentual_geral column to cotas table
ALTER TABLE public.cotas 
ADD COLUMN percentual_geral numeric DEFAULT 0;