-- Add cover fields to settings table
ALTER TABLE public.settings
ADD COLUMN cover_1 text DEFAULT NULL,
ADD COLUMN cover_2 text DEFAULT NULL,
ADD COLUMN cover_3 text DEFAULT NULL,
ADD COLUMN cover_4 text DEFAULT NULL,
ADD COLUMN cover_mode text DEFAULT 'single';