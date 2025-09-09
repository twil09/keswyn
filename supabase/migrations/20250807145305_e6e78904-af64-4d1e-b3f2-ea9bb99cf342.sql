-- Add unique constraint on email for profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);