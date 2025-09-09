-- Reset all admin pins to allow re-setup due to hash function changes
UPDATE public.profiles 
SET admin_pin = NULL, pin_set_at = NULL 
WHERE role IN ('super_admin', 'admin');