-- Add draft fields to associados to support multi-step persistence
ALTER TABLE public.associados
  ADD COLUMN IF NOT EXISTS draft_payload jsonb,
  ADD COLUMN IF NOT EXISTS draft_step integer,
  ADD COLUMN IF NOT EXISTS draft_last_updated timestamp with time zone;