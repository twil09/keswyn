-- Fix RLS policies to correctly recognize admins and teachers using existing helper functions
-- MODULES
DROP POLICY IF EXISTS "Admins and teachers can manage modules" ON public.modules;
CREATE POLICY "Admins and teachers can manage modules"
ON public.modules
FOR ALL
USING (is_admin(auth.uid()) OR is_teacher(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_teacher(auth.uid()));

-- STEPS
DROP POLICY IF EXISTS "Admins and teachers can manage steps" ON public.steps;
CREATE POLICY "Admins and teachers can manage steps"
ON public.steps
FOR ALL
USING (is_admin(auth.uid()) OR is_teacher(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_teacher(auth.uid()));

-- RESOURCES (for file metadata inserts)
DROP POLICY IF EXISTS "Admins and teachers can manage resources" ON public.resources;
CREATE POLICY "Admins and teachers can manage resources"
ON public.resources
FOR ALL
USING (is_admin(auth.uid()) OR is_teacher(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_teacher(auth.uid()));