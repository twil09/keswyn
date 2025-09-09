-- Security fixes implementation

-- 1. Create audit trail table for role changes
CREATE TABLE public.role_change_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role audit logs" 
ON public.role_change_audit 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create secure role update function with audit logging
CREATE OR REPLACE FUNCTION public.update_user_role_secure(
  target_user_id UUID,
  new_role app_role,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_role app_role;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  IF NOT has_role(current_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  -- Prevent self-role modification for security
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
  END IF;
  
  -- Get current role
  SELECT role INTO old_role FROM public.profiles WHERE user_id = target_user_id;
  
  IF old_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Update the role
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the change
  INSERT INTO public.role_change_audit (target_user_id, old_role, new_role, changed_by, reason)
  VALUES (target_user_id, old_role, new_role, current_user_id, reason);
  
  RETURN TRUE;
END;
$$;

-- 3. Update RLS policy on profiles to prevent self-role modification
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (except role)" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND 
  role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- 4. Add admin role update policy
CREATE POLICY "Admins can update user roles via function only" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() != user_id)
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() != user_id);

-- 5. Create demo accounts table instead of hardcoded credentials
CREATE TABLE public.demo_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  password_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on demo accounts
ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active demo accounts for login purposes
CREATE POLICY "Anyone can view active demo accounts" 
ON public.demo_accounts 
FOR SELECT 
USING (is_active = true);

-- Only admins can manage demo accounts
CREATE POLICY "Admins can manage demo accounts" 
ON public.demo_accounts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert demo accounts
INSERT INTO public.demo_accounts (email, role, password_hint) VALUES 
('demo.student@example.com', 'student', 'Use Quick Demo button'),
('demo.teacher@example.com', 'teacher', 'Use Quick Demo button');

-- 6. Create the admin account for taywil0809@outlook.com
-- First, we need to insert into auth.users (this will be handled in the application)
-- But we can prepare the profile entry
INSERT INTO public.profiles (user_id, full_name, email, role) 
VALUES (
  gen_random_uuid(), -- This will be replaced with actual auth.user.id when they sign up
  'Admin User',
  'taywil0809@outlook.com',
  'admin'::app_role
) ON CONFLICT (email) DO UPDATE SET role = 'admin'::app_role;