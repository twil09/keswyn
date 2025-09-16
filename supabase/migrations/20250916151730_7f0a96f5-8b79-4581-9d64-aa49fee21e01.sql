-- Add new role to enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'owner') THEN
    ALTER TYPE public.app_role ADD VALUE 'owner';
  END IF;
END$$;

-- Update is_admin to include owner and super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role IN ('owner','super_admin','admin')
  )
$$;

-- Update is_super_admin to include owner as highest rank
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('owner','super_admin')
  )
$$;

-- Ensure new signups for specific emails become owner rather than super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role, max_classes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CASE 
      WHEN NEW.email IN ('taywil0809@outlook.com', 'keswyn@outlook.com') THEN 'owner'::app_role
      ELSE 'free_student'::app_role
    END,
    CASE 
      WHEN NEW.email IN ('taywil0809@outlook.com', 'keswyn@outlook.com') THEN -1
      ELSE 0
    END
  );
  RETURN NEW;
END;
$$;