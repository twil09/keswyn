-- Create security definer function to check if user can access class
CREATE OR REPLACE FUNCTION public.can_access_class(_class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT (
    -- Check if user is admin
    is_admin(_user_id) OR
    -- Check if user is the teacher of this class
    EXISTS (
      SELECT 1 
      FROM public.classes c
      JOIN public.profiles p ON (c.teacher_id = p.id)
      WHERE c.id = _class_id AND p.user_id = _user_id
    ) OR
    -- Check if user is enrolled in this class
    EXISTS (
      SELECT 1 
      FROM public.class_enrollments ce
      JOIN public.profiles p ON (ce.student_id = p.id)
      WHERE ce.class_id = _class_id 
      AND p.user_id = _user_id
      AND ce.is_active = true
    )
  )
$function$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can view classes they're enrolled in" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage their own classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON public.classes;

-- Create new simplified policies using the security definer function
CREATE POLICY "Users can view accessible classes" ON public.classes
FOR SELECT
USING (can_access_class(id, auth.uid()));

CREATE POLICY "Teachers and admins can manage classes" ON public.classes
FOR ALL
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = teacher_id
  )
);