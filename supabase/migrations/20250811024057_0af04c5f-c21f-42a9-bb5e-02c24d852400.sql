-- Update admin check for taywil0809@outlook.com and admin access
-- First, let's update the trigger to ensure proper admin assignment
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger function with proper admin assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role, max_classes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CASE 
      WHEN NEW.email IN ('taywil0809@outlook.com', 'admin@keswyn.co.uk') THEN 'super_admin'::app_role
      ELSE 'free_student'::app_role
    END,
    CASE 
      WHEN NEW.email IN ('taywil0809@outlook.com', 'admin@keswyn.co.uk') THEN -1
      ELSE 0
    END
  );
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure taywil0809@outlook.com has proper admin role
UPDATE public.profiles 
SET role = 'super_admin'::app_role, max_classes = -1 
WHERE email = 'taywil0809@outlook.com';

-- Update admin functions to include super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$function$;