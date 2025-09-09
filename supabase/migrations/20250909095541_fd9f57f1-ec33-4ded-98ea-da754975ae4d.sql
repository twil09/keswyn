-- Create security definer function to check if user can access course
CREATE OR REPLACE FUNCTION public.can_access_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT (
    -- Check if user is admin or teacher
    is_admin(_user_id) OR is_teacher(_user_id) OR
    -- Check if course is free and user is authenticated
    (EXISTS (SELECT 1 FROM public.courses WHERE id = _course_id AND is_premium = false) AND _user_id IS NOT NULL) OR
    -- Check if user is enrolled in any class for this course
    EXISTS (
      SELECT 1 
      FROM public.class_enrollments ce
      JOIN public.profiles p ON (ce.student_id = p.id)
      WHERE p.user_id = _user_id 
      AND ce.is_active = true
      AND ce.class_id IN (
        SELECT cl.id 
        FROM public.classes cl 
        WHERE cl.id = ce.class_id
      )
    )
  )
$function$;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view courses they're enrolled in or free courses" ON public.courses;

-- Create new simplified policy using the security definer function
CREATE POLICY "Users can view accessible courses" ON public.courses
FOR SELECT
USING (can_access_course(id, auth.uid()));