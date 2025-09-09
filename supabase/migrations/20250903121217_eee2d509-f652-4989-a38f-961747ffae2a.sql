-- Fix security issue: Remove overly permissive policy for subscribers table
-- The current policy allows any authenticated user to manage all subscription data
-- This should be restricted to only service role and individual user access

-- Drop the problematic policy that allows any authenticated user to manage subscriptions
DROP POLICY IF EXISTS "Edge functions can manage subscriptions" ON public.subscribers;

-- The remaining policies are secure:
-- 1. "Service role full access" - allows edge functions to manage data
-- 2. "Users update own subscription" - allows users to update only their own data  
-- 3. "Users view own subscription" - allows users to view only their own data

-- Add a more restrictive policy for edge functions that only allows service role
-- (This may already exist but ensuring it's properly defined)
DROP POLICY IF EXISTS "Service role full access" ON public.subscribers;

CREATE POLICY "Service role full access" 
ON public.subscribers 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);