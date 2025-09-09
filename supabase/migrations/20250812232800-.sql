-- Fix courses table RLS policy to properly check admin and teacher roles
-- The current policy only checks for 'admin' and 'teacher' but misses 'super_admin'

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins and teachers can manage courses" ON public.courses;

-- Create updated policy using the proper admin/teacher checking functions
CREATE POLICY "Admins and teachers can manage courses" 
ON public.courses 
FOR ALL 
USING (is_admin(auth.uid()) OR is_teacher(auth.uid()));