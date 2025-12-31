-- Add new roles to the app_role enum
-- gerente (GERENTE), operacional (OPERACIONAL), and ensure demo_user exists

-- First, check and add the new enum values
DO $$
BEGIN
  -- Add gerente if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gerente' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'gerente';
  END IF;
END $$;

DO $$
BEGIN
  -- Add operacional if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operacional' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'operacional';
  END IF;
END $$;

DO $$
BEGIN
  -- Add demo_user if not exists (was added earlier but ensure it exists)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'demo_user' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'demo_user';
  END IF;
END $$;