-- Add unique constraint on email for profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Update Taylor Wilson's name
UPDATE public.profiles 
SET full_name = 'Taylor Wilson' 
WHERE email = 'taywil0809@outlook.com';

-- Add Micheal Williams as admin (using INSERT with conflict handling on email constraint)
INSERT INTO public.profiles (user_id, full_name, email, role) 
VALUES (
  gen_random_uuid(), -- This will be replaced with actual auth.user.id when they sign up
  'Micheal Williams',
  'admin@keswyn.co.uk',
  'admin'::app_role
) ON CONFLICT (email) DO UPDATE SET 
  role = 'admin'::app_role,
  full_name = 'Micheal Williams';