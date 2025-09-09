-- Fix security issues by adding search_path to functions created in previous migration

-- Update the student count function with proper search path
CREATE OR REPLACE FUNCTION public.update_course_student_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update student count for the affected course(s)
  UPDATE public.courses 
  SET student_count = (
    SELECT COUNT(DISTINCT ce.student_id)
    FROM public.class_enrollments ce
    JOIN public.classes c ON ce.class_id = c.id
    WHERE ce.is_active = true
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update the completion rate function with proper search path
CREATE OR REPLACE FUNCTION public.update_course_completion_rate(_course_id uuid)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_students integer;
  completed_students integer;
  rate decimal(5,2);
BEGIN
  -- Get total enrolled students for this course
  SELECT COUNT(DISTINCT ce.student_id) INTO total_students
  FROM public.class_enrollments ce
  JOIN public.classes cl ON ce.class_id = cl.id
  WHERE ce.is_active = true;
  
  -- Get students who have completed all steps in the course
  SELECT COUNT(DISTINCT up.user_id) INTO completed_students
  FROM public.user_progress up
  JOIN public.steps s ON up.step_id = s.id
  JOIN public.modules m ON s.module_id = m.id
  WHERE m.course_id = _course_id
    AND up.completed = true
  GROUP BY up.user_id
  HAVING COUNT(*) = (
    SELECT COUNT(*) 
    FROM public.steps s2
    JOIN public.modules m2 ON s2.module_id = m2.id
    WHERE m2.course_id = _course_id
  );
  
  -- Calculate completion rate
  IF total_students > 0 THEN
    rate = (COALESCE(completed_students, 0)::decimal / total_students) * 100;
  ELSE
    rate = 0;
  END IF;
  
  -- Update the course
  UPDATE public.courses 
  SET completion_rate = rate
  WHERE id = _course_id;
END;
$$;