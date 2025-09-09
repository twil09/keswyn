-- Fix security vulnerability in subscribers table
-- Remove the overly permissive policy that allows unrestricted access
DROP POLICY IF EXISTS "Service can insert/update subscriptions" ON public.subscribers;

-- Create more restrictive policies for service operations
-- Allow service role (for Stripe webhooks) to manage subscriptions
CREATE POLICY "Service role can manage subscriptions" 
ON public.subscribers 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated service functions to insert/update subscriptions
-- This is for edge functions that need to create/update subscription records
CREATE POLICY "Authenticated services can insert subscriptions" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated services can update subscriptions" 
ON public.subscribers 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Ensure the existing user policies remain for user access to their own data
-- (These should already exist but let's make sure they're properly defined)

-- Users can view their own subscription (keep existing)
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
CREATE POLICY "Users can view their own subscription" 
ON public.subscribers 
FOR SELECT 
USING ((user_id = auth.uid()) OR (email = auth.email()));

-- Users can update their own subscription (keep existing)  
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;
CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING ((user_id = auth.uid()) OR (email = auth.email()));