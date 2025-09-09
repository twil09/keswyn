-- Add is_premium column to courses table and fix admin account creation

-- Add is_premium column to courses table
ALTER TABLE public.courses 
ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;

-- Update the handle_new_user function to properly handle admin accounts
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
$$;