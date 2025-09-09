-- Add unique constraint on email for profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Add admin accounts to demo_accounts table for invitation purposes
INSERT INTO public.demo_accounts (email, role, password_hint) 
VALUES 
  ('taywil0809@outlook.com', 'admin', 'Admin invitation - Taylor Wilson'),
  ('admin@keswyn.co.uk', 'admin', 'Admin invitation - Micheal Williams')
ON CONFLICT (email) DO UPDATE SET 
  role = EXCLUDED.role,
  password_hint = EXCLUDED.password_hint;