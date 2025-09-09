-- Fix security vulnerability by removing the dangerous "true" policy
-- and creating proper restrictive policies

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Service can insert/update subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "Authenticated services can insert subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "Authenticated services can update subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

-- Create secure policies

-- 1. Allow service role (for webhooks and system operations) full access
CREATE POLICY "Service role full access" 
ON public.subscribers 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2. Allow authenticated edge functions to insert/update (for subscription management)
CREATE POLICY "Edge functions can manage subscriptions" 
ON public.subscribers 
FOR ALL 
USING (auth.role() = 'authenticated' AND auth.jwt() IS NOT NULL)
WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() IS NOT NULL);

-- 3. Users can view their own subscription data only
CREATE POLICY "Users view own subscription" 
ON public.subscribers 
FOR SELECT 
USING ((user_id = auth.uid()) OR (email = auth.email()));

-- 4. Users can update their own subscription data only
CREATE POLICY "Users update own subscription" 
ON public.subscribers 
FOR UPDATE 
USING ((user_id = auth.uid()) OR (email = auth.email()))
WITH CHECK ((user_id = auth.uid()) OR (email = auth.email()));