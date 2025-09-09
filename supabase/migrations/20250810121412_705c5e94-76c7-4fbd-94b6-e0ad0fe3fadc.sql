-- First, update the app_role enum to include all the new roles
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM (
  'super_admin',
  'admin', 
  'premium_teacher',
  'free_teacher',
  'premium_student',
  'free_student'
);

-- Update profiles table to use the new enum and add subscription fields
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check,
ALTER COLUMN role TYPE app_role USING role::text::app_role,
ALTER COLUMN role SET DEFAULT 'free_student'::app_role,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS max_classes INTEGER DEFAULT 0;

-- Create a classes table for teacher classroom management
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'base64'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create class_enrollments table for student-class relationships
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(class_id, student_id)
);

-- Create subscribers table for Stripe integration
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Update the has_role function to work with new roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- Create function to check if user has admin privileges (super_admin or admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$function$;

-- Create function to check if user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role IN ('premium_teacher', 'free_teacher')
  )
$function$;

-- Update max_classes based on role
UPDATE public.profiles 
SET max_classes = CASE 
  WHEN role IN ('super_admin', 'admin', 'premium_teacher') THEN -1 -- unlimited
  WHEN role = 'free_teacher' THEN 5
  ELSE 0
END;

-- Set the specific emails as super admins
UPDATE public.profiles 
SET role = 'super_admin'::app_role 
WHERE email IN ('taywil0809@outlook.com', 'admin@keswyn.co.uk');

-- Create RLS policies for classes
CREATE POLICY "Teachers can manage their own classes" ON public.classes
  FOR ALL USING (
    teacher_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all classes" ON public.classes
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view classes they're enrolled in" ON public.classes
  FOR SELECT USING (
    id IN (
      SELECT class_id FROM public.class_enrollments 
      WHERE student_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create RLS policies for class_enrollments
CREATE POLICY "Teachers can manage enrollments for their classes" ON public.class_enrollments
  FOR ALL USING (
    class_id IN (
      SELECT id FROM public.classes 
      WHERE teacher_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Students can view their own enrollments" ON public.class_enrollments
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all enrollments" ON public.class_enrollments
  FOR ALL USING (is_admin(auth.uid()));

-- Create RLS policies for subscribers
CREATE POLICY "Users can view their own subscription" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can update their own subscription" ON public.subscribers
  FOR UPDATE USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Service can insert/update subscriptions" ON public.subscribers
  FOR ALL USING (true);

-- Update triggers for updated_at
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user function to set appropriate defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role, max_classes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CASE 
      WHEN NEW.email IN ('taywil0809@outlook.com', 'admin@keswyn.co.uk') THEN 'super_admin'::app_role
      ELSE 'free_student'::app_role
    END,
    CASE 
      WHEN NEW.email IN ('taywil0809@outlook.com', 'admin@keswyn.co.uk') THEN -1
      ELSE 0
    END
  );
  RETURN NEW;
END;
$function$;