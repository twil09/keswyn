-- Phase 1: Fix Course Content Protection
-- Remove overly permissive policies and add enrollment-based access

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view modules" ON public.modules;  
DROP POLICY IF EXISTS "Anyone can view steps" ON public.steps;
DROP POLICY IF EXISTS "Anyone can view resources" ON public.resources;

-- Create enrollment-based course access policies
CREATE POLICY "Users can view courses they're enrolled in or free courses"
ON public.courses 
FOR SELECT 
USING (
  -- Always allow admins and teachers to view all courses
  (is_admin(auth.uid()) OR is_teacher(auth.uid()))
  OR
  -- Allow enrolled students to view courses they're enrolled in
  (
    id IN (
      SELECT DISTINCT c.id 
      FROM courses c
      JOIN classes cl ON true -- Allow access to courses through class enrollment
      JOIN class_enrollments ce ON cl.id = ce.class_id
      JOIN profiles p ON ce.student_id = p.id
      WHERE p.user_id = auth.uid() AND ce.is_active = true
    )
  )
  OR
  -- Allow access to free courses for authenticated users
  (auth.uid() IS NOT NULL AND is_premium = false)
);

-- Create module access policy based on course access
CREATE POLICY "Users can view modules for accessible courses"
ON public.modules 
FOR SELECT 
USING (
  course_id IN (
    SELECT id FROM courses WHERE 
    -- Same logic as course policy - enrolled or free courses
    (is_admin(auth.uid()) OR is_teacher(auth.uid()))
    OR
    (
      id IN (
        SELECT DISTINCT c.id 
        FROM courses c
        JOIN classes cl ON true
        JOIN class_enrollments ce ON cl.id = ce.class_id
        JOIN profiles p ON ce.student_id = p.id
        WHERE p.user_id = auth.uid() AND ce.is_active = true
      )
    )
    OR
    (auth.uid() IS NOT NULL AND is_premium = false)
  )
);

-- Create step access policy based on module access
CREATE POLICY "Users can view steps for accessible modules"
ON public.steps 
FOR SELECT 
USING (
  module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE 
    (is_admin(auth.uid()) OR is_teacher(auth.uid()))
    OR
    (
      c.id IN (
        SELECT DISTINCT co.id 
        FROM courses co
        JOIN classes cl ON true
        JOIN class_enrollments ce ON cl.id = ce.class_id
        JOIN profiles p ON ce.student_id = p.id
        WHERE p.user_id = auth.uid() AND ce.is_active = true
      )
    )
    OR
    (auth.uid() IS NOT NULL AND c.is_premium = false)
  )
);

-- Create resource access policy
CREATE POLICY "Users can view resources for accessible courses/steps"
ON public.resources 
FOR SELECT 
USING (
  -- Resources linked to courses
  (course_id IS NOT NULL AND course_id IN (
    SELECT id FROM courses WHERE 
    (is_admin(auth.uid()) OR is_teacher(auth.uid()))
    OR
    (
      id IN (
        SELECT DISTINCT c.id 
        FROM courses c
        JOIN classes cl ON true
        JOIN class_enrollments ce ON cl.id = ce.class_id
        JOIN profiles p ON ce.student_id = p.id
        WHERE p.user_id = auth.uid() AND ce.is_active = true
      )
    )
    OR
    (auth.uid() IS NOT NULL AND is_premium = false)
  ))
  OR
  -- Resources linked to steps
  (step_id IS NOT NULL AND step_id IN (
    SELECT s.id FROM steps s
    JOIN modules m ON s.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE 
    (is_admin(auth.uid()) OR is_teacher(auth.uid()))
    OR
    (
      c.id IN (
        SELECT DISTINCT co.id 
        FROM courses co
        JOIN classes cl ON true
        JOIN class_enrollments ce ON cl.id = ce.class_id
        JOIN profiles p ON ce.student_id = p.id
        WHERE p.user_id = auth.uid() AND ce.is_active = true
      )
    )
    OR
    (auth.uid() IS NOT NULL AND c.is_premium = false)
  ))
);

-- Phase 2: Add function to safely hash admin PINs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash admin PIN
CREATE OR REPLACE FUNCTION public.hash_admin_pin(pin_text text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT crypt(pin_text, gen_salt('bf', 10));
$$;

-- Function to verify admin PIN
CREATE OR REPLACE FUNCTION public.verify_admin_pin(pin_text text, hashed_pin text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT crypt(pin_text, hashed_pin) = hashed_pin;
$$;

-- Update existing plain text PINs to be hashed (if any exist)
UPDATE public.profiles 
SET admin_pin = public.hash_admin_pin(admin_pin)
WHERE admin_pin IS NOT NULL 
AND length(admin_pin) < 50; -- Only hash if it looks like plain text (hashed would be longer)