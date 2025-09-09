-- Add student_count column to courses table to track real enrollment numbers
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS student_count integer DEFAULT 0;

-- Create a function to update student count when enrollments change
CREATE OR REPLACE FUNCTION public.update_course_student_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update student counts
DROP TRIGGER IF EXISTS trigger_update_course_student_count ON public.class_enrollments;
CREATE TRIGGER trigger_update_course_student_count
  AFTER INSERT OR UPDATE OR DELETE ON public.class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_student_count();

-- Add completion_rate column to courses to track completion statistics
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS completion_rate decimal(5,2) DEFAULT 0.00;

-- Create function to calculate completion rates
CREATE OR REPLACE FUNCTION public.update_course_completion_rate(_course_id uuid)
RETURNS void AS $$
DECLARE
  total_students integer;
  completed_students integer;
  completion_rate decimal(5,2);
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
    completion_rate = (COALESCE(completed_students, 0)::decimal / total_students) * 100;
  ELSE
    completion_rate = 0;
  END IF;
  
  -- Update the course
  UPDATE public.courses 
  SET completion_rate = completion_rate
  WHERE id = _course_id;
END;
$$ LANGUAGE plpgsql;