-- Update token_expires_at default to 72 hours (3 days) instead of 7 days
ALTER TABLE public.termos_aceite 
ALTER COLUMN token_expires_at SET DEFAULT (now() + INTERVAL '72 hours');