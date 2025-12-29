-- Add cover_fixed_index column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS cover_fixed_index integer DEFAULT 1;