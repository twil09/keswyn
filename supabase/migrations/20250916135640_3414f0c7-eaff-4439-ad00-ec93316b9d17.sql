-- Security fixes: Admin PIN system, secure role management, and premium access

-- 1. Create secure admin PIN functions
CREATE OR REPLACE FUNCTION public.set_admin_pin(pin_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admins can set admin PINs
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  UPDATE public.profiles 
  SET 
    admin_pin = hash_admin_pin(pin_text),
    pin_set_at = now()
  WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_pin_secure(pin_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_pin text;
BEGIN
  SELECT admin_pin INTO stored_pin 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF stored_pin IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN verify_admin_pin(pin_text, stored_pin);
END;
$$;

-- 2. Create secure role management functions
CREATE OR REPLACE FUNCTION public.request_role_change(_target_user_id uuid, _new_role app_role, _requested_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id uuid;
  requester_role app_role;
  target_email text;
  requester_email text;
BEGIN
  -- Only admins can request role changes
  IF NOT (is_admin(_requested_by) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only admins can request role changes';
  END IF;
  
  -- Get requester role and target user email
  SELECT role INTO requester_role FROM public.profiles WHERE user_id = _requested_by;
  SELECT email INTO target_email FROM public.profiles WHERE user_id = _target_user_id;
  SELECT email INTO requester_email FROM public.profiles WHERE user_id = _requested_by;
  
  -- Create role change request
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

-- 3. Create role change requests table
CREATE TABLE IF NOT EXISTS public.role_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  new_role app_role NOT NULL,
  requested_by uuid NOT NULL,
  requester_email text NOT NULL,
  target_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verification_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by text
);

-- Enable RLS on role change requests
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Only super admins and the system can access role change requests
CREATE POLICY "Super admins can manage role change requests"
ON public.role_change_requests
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 4. Create approval function for role changes
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
  
  -- Verify approval email is authorized (taywil0809@outlook.com or keswyn@outlook.com)
  IF _approval_email NOT IN ('taywil0809@outlook.com', 'keswyn@outlook.com') THEN
    RAISE EXCEPTION 'Unauthorized approval email';
  END IF;
  
  -- Update the user's role
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

-- 5. Grant premium access to taywil0809@outlook.com
UPDATE public.profiles 
SET 
  role = 'premium_teacher',
  subscription_tier = 'premium_teacher',
  subscription_status = 'active',
  subscription_end = now() + interval '1 year',
  max_classes = -1
WHERE email = 'taywil0809@outlook.com';

-- Also update in subscribers table
INSERT INTO public.subscribers (
  user_id,
  email,
  subscribed,
  subscription_tier,
  subscription_end
) 
SELECT 
  user_id,
  email,
  true,
  'premium_teacher',
  now() + interval '1 year'
FROM public.profiles 
WHERE email = 'taywil0809@outlook.com'
ON CONFLICT (email) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'premium_teacher',
  subscription_end = now() + interval '1 year';

-- 6. Secure subscribers table - restrict to service role only
DROP POLICY IF EXISTS "Service role full access" ON public.subscribers;
DROP POLICY IF EXISTS "Service role full subscriber access" ON public.subscribers;
DROP POLICY IF EXISTS "Users view own subscription info" ON public.subscribers;

CREATE POLICY "Service role only access"
ON public.subscribers
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add secure function for subscription access
CREATE OR REPLACE FUNCTION public.get_user_subscription_secure()
RETURNS TABLE(subscription_tier text, subscription_end timestamp with time zone, subscribed boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.subscription_tier,
    p.subscription_end,
    CASE WHEN p.subscription_end > now() THEN true ELSE false END as subscribed
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$$;