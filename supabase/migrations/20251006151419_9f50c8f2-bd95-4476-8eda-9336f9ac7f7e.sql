-- Phase 1: Create secure user_roles table (CRITICAL - roles must be in separate table)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT user_id, role, created_at
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Phase 2: Create secure role-checking functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY 
    CASE role
      WHEN 'owner' THEN 1
      WHEN 'super_admin' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'premium_teacher' THEN 4
      WHEN 'free_teacher' THEN 5
      WHEN 'premium_student' THEN 6
      WHEN 'free_student' THEN 7
      ELSE 8
    END
  LIMIT 1
$$;

-- Update existing security functions to use user_roles table
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner', 'super_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_teacher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('premium_teacher', 'free_teacher')
  )
$$;

-- Phase 3: Secure PIN system with proper bcrypt hashing using extensions.crypt
-- Secure PIN hashing function using bcrypt
CREATE OR REPLACE FUNCTION public.hash_admin_pin_secure(pin_text text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT extensions.crypt(pin_text, extensions.gen_salt('bf'))
$$;

-- Secure PIN verification function
CREATE OR REPLACE FUNCTION public.verify_admin_pin_secure(pin_text text, hashed_pin text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT extensions.crypt(pin_text, hashed_pin) = hashed_pin
$$;

-- Function to set admin PIN with proper security
CREATE OR REPLACE FUNCTION public.set_admin_pin_secure(pin_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admins can set admin PINs
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Only super admins can set PINs';
  END IF;
  
  -- Validate PIN length (minimum 6 characters)
  IF length(pin_text) < 6 THEN
    RAISE EXCEPTION 'PIN must be at least 6 characters';
  END IF;
  
  -- Update with secure hash
  UPDATE public.profiles 
  SET 
    admin_pin = hash_admin_pin_secure(pin_text),
    pin_set_at = now()
  WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;

-- Phase 4: Secure get_safe_profile to prevent email exposure
CREATE OR REPLACE FUNCTION public.get_safe_profile(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  role app_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  subscription_status text,
  subscription_tier text,
  subscription_end timestamp with time zone,
  max_classes integer,
  pin_set_at timestamp with time zone,
  has_admin_pin boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    CASE 
      WHEN p.user_id = auth.uid() OR is_super_admin() THEN p.full_name
      ELSE NULL
    END as full_name,
    CASE 
      WHEN p.user_id = auth.uid() OR is_super_admin() THEN p.email
      ELSE NULL
    END as email,
    get_user_role(p.user_id) as role,
    p.created_at,
    p.updated_at,
    p.subscription_status,
    p.subscription_tier,
    p.subscription_end,
    p.max_classes,
    p.pin_set_at,
    (p.admin_pin IS NOT NULL) as has_admin_pin
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (
      p.user_id = auth.uid() OR 
      is_super_admin()
    );
$$;

-- Phase 5: Secure role change system to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.request_role_change(_target_user_id uuid, _new_role app_role, _requested_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id uuid;
  requester_role app_role;
  target_current_role app_role;
  target_email text;
  requester_email text;
BEGIN
  -- Get requester's highest role
  SELECT get_user_role(_requested_by) INTO requester_role;
  
  -- Only admins and above can request role changes
  IF requester_role NOT IN ('owner', 'super_admin', 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only admins can request role changes';
  END IF;
  
  -- Get target user's current role and email
  SELECT get_user_role(_target_user_id) INTO target_current_role;
  SELECT email INTO target_email FROM public.profiles WHERE user_id = _target_user_id;
  SELECT email INTO requester_email FROM public.profiles WHERE user_id = _requested_by;
  
  -- CRITICAL: Prevent privilege escalation
  -- Only owners can grant owner/super_admin roles
  IF _new_role IN ('owner', 'super_admin') AND requester_role != 'owner' THEN
    RAISE EXCEPTION 'Access denied: Only owners can grant owner or super_admin roles';
  END IF;
  
  -- Prevent regular admins from changing owner/super_admin roles
  IF target_current_role IN ('owner', 'super_admin') AND requester_role != 'owner' THEN
    RAISE EXCEPTION 'Access denied: Only owners can modify owner or super_admin roles';
  END IF;
  
  -- Create role change request with audit trail
  INSERT INTO public.role_change_requests (
    target_user_id,
    new_role,
    requested_by,
    requester_email,
    target_email,
    status
  ) VALUES (
    _target_user_id,
    _new_role,
    _requested_by,
    requester_email,
    target_email,
    'pending'
  ) RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$;

-- Update approve_role_change with proper security
CREATE OR REPLACE FUNCTION public.approve_role_change(_request_id uuid, _approval_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record record;
BEGIN
  -- Get the request
  SELECT * INTO request_record 
  FROM public.role_change_requests 
  WHERE id = _request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  -- Verify approval email is authorized
  IF _approval_email NOT IN ('taywil0809@outlook.com', 'keswyn@outlook.com') THEN
    RAISE EXCEPTION 'Unauthorized approval email';
  END IF;
  
  -- Delete old role from user_roles
  DELETE FROM public.user_roles 
  WHERE user_id = request_record.target_user_id;
  
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (
    request_record.target_user_id,
    request_record.new_role,
    request_record.requested_by
  );
  
  -- Also update profiles table for backwards compatibility (temporary)
  UPDATE public.profiles 
  SET role = request_record.new_role
  WHERE user_id = request_record.target_user_id;
  
  -- Mark request as approved
  UPDATE public.role_change_requests 
  SET 
    status = 'approved',
    approved_at = now(),
    approved_by = _approval_email
  WHERE id = _request_id;
  
  RETURN TRUE;
END;
$$;

-- Update handle_new_user to use user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_max_classes integer;
BEGIN
  -- Determine role based on email
  IF NEW.email IN ('taywil0809@outlook.com', 'keswyn@outlook.com') THEN
    user_role := 'owner'::app_role;
    user_max_classes := -1;
  ELSE
    user_role := 'free_student'::app_role;
    user_max_classes := 0;
  END IF;
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name, email, role, max_classes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    user_role,
    user_max_classes
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_details jsonb,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (is_super_admin());