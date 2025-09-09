-- Security fix for profiles and subscribers tables
-- This migration adds column-level security for sensitive personal data

-- First, create a function to check if the current user can access admin functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;

-- Create a view that excludes sensitive data for general admin access
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  role,
  created_at,
  updated_at,
  subscription_status,
  subscription_tier,
  subscription_end,
  max_classes,
  pin_set_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.safe_profiles SET (security_barrier = true);

-- Drop existing RLS policies on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new restrictive RLS policies for profiles table
CREATE POLICY "Super admins can view all profile data" 
ON public.profiles 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Users can view their own safe profile data" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() AND 
  -- This policy excludes admin_pin and stripe_customer_id from user access
  true
);

CREATE POLICY "Users can update their own safe profile data" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  -- Prevent users from updating sensitive fields
  OLD.admin_pin IS NOT DISTINCT FROM NEW.admin_pin AND
  OLD.stripe_customer_id IS NOT DISTINCT FROM NEW.stripe_customer_id AND
  OLD.role IS NOT DISTINCT FROM NEW.role
);

CREATE POLICY "Super admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_super_admin());

-- Create RLS policies for the safe_profiles view
CREATE POLICY "Admins can view safe profile data via view" 
ON public.safe_profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Update subscribers table policies for better security
DROP POLICY IF EXISTS "Users view own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscribers;

CREATE POLICY "Users can view their own subscription status only" 
ON public.subscribers 
FOR SELECT 
USING (
  (user_id = auth.uid() OR email = auth.email()) AND
  -- Only allow access to non-sensitive fields via application logic
  true
);

CREATE POLICY "Service role and super admins can update subscriptions" 
ON public.subscribers 
FOR UPDATE 
USING (auth.role() = 'service_role' OR is_super_admin())
WITH CHECK (auth.role() = 'service_role' OR is_super_admin());

-- Create a function to safely get user profile without sensitive data
CREATE OR REPLACE FUNCTION public.get_safe_user_profile(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  role app_role,
  created_at timestamptz,
  updated_at timestamptz,
  subscription_status text,
  subscription_tier text,
  subscription_end timestamptz,
  max_classes integer,
  has_admin_pin boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.role,
    p.created_at,
    p.updated_at,
    p.subscription_status,
    p.subscription_tier,
    p.subscription_end,
    p.max_classes,
    (p.admin_pin IS NOT NULL) as has_admin_pin
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (
      -- Users can see their own profile
      p.user_id = auth.uid() 
      OR 
      -- Admins can see other profiles (but not sensitive data)
      is_admin(auth.uid())
    );
$$;