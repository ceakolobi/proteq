-- Adicionar demo_user ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'demo_user';