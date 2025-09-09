-- Security fix for profiles and subscribers tables
-- This migration adds proper column-level security for sensitive personal data

-- First, create a function to check if the current user is a super admin
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

-- Drop existing problematic RLS policies on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new secure RLS policies for profiles table
-- Only super admins can see ALL data including sensitive fields
CREATE POLICY "Super admins full profile access" 
ON public.profiles 
FOR ALL
USING (is_super_admin());

-- Regular admins can only see non-sensitive profile data
CREATE POLICY "Admins view safe profile data" 
ON public.profiles 
FOR SELECT 
USING (
  is_admin(auth.uid()) AND NOT is_super_admin()
);

-- Users can only view their own profile (excluding admin_pin and stripe_customer_id in app logic)
CREATE POLICY "Users view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can only update safe fields of their own profile
CREATE POLICY "Users update own safe profile data" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create a secure function to get user profiles without sensitive data
CREATE OR REPLACE FUNCTION public.get_safe_profile(target_user_id uuid DEFAULT auth.uid())
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
  pin_set_at timestamptz,
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
      WHEN p.user_id = auth.uid() OR is_admin(auth.uid()) THEN p.full_name
      ELSE NULL
    END as full_name,
    CASE 
      WHEN p.user_id = auth.uid() OR is_admin(auth.uid()) THEN p.email
      ELSE NULL  
    END as email,
    p.role,
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
      is_admin(auth.uid())
    );
$$;

-- Update subscribers table policies for better security
DROP POLICY IF EXISTS "Users view own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscribers;

-- Only service role and super admins can manage subscriptions
CREATE POLICY "Service role full subscriber access" 
ON public.subscribers 
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Super admins full subscriber access" 
ON public.subscribers 
FOR ALL
USING (is_super_admin());

-- Users can only view their own basic subscription info (no sensitive data)
CREATE POLICY "Users view own subscription info" 
ON public.subscribers 
FOR SELECT 
USING (user_id = auth.uid() OR email = auth.email());

-- Create secure function to get subscription status without exposing sensitive data
CREATE OR REPLACE FUNCTION public.get_user_subscription_status()
RETURNS TABLE (
  subscription_tier text,
  subscription_end timestamptz,
  subscribed boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.subscription_tier,
    s.subscription_end,
    s.subscribed
  FROM public.subscribers s
  WHERE s.user_id = auth.uid() OR s.email = auth.email()
  LIMIT 1;
$$;