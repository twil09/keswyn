-- Fix function search path warnings by updating functions that are missing SET search_path

-- Update get_current_user_role to include search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(auth.uid())
$$;

-- Update get_user_subscription_status to include search_path
CREATE OR REPLACE FUNCTION public.get_user_subscription_status()
RETURNS TABLE(subscription_tier text, subscription_end timestamp with time zone, subscribed boolean)
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
  LIMIT 1
$$;