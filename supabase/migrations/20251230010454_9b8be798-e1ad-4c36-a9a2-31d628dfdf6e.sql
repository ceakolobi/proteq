-- Temporarily disable the trigger to update admin email
ALTER TABLE profiles DISABLE TRIGGER protect_admin_principal_profile_trigger;

-- Update the admin email in profiles
UPDATE profiles 
SET email = 'kolobi2013cf@gmail.com', updated_at = now() 
WHERE id = 'ed4f430f-8eac-43bf-b838-969611ef2a45';

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER protect_admin_principal_profile_trigger;