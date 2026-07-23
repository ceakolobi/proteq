-- LGPD + UTM no funil público (/). Sem RLS, sem enum novo.
-- Aplicar manualmente no projeto sfobrbxzdbgjoxgjerus (SQL Editor).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS consentimento_lgpd     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimento_lgpd_em  timestamptz,
  ADD COLUMN IF NOT EXISTS utm_source             text,
  ADD COLUMN IF NOT EXISTS utm_medium             text,
  ADD COLUMN IF NOT EXISTS utm_campaign           text;
