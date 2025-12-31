-- Add must_change_password field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Ensure Admin Principal users never have forced password change by default
UPDATE public.profiles 
SET must_change_password = false 
WHERE is_admin_principal = true;