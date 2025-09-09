-- Enable pgcrypto extension first
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Now create the functions with proper extension
CREATE OR REPLACE FUNCTION public.hash_admin_pin(pin_text text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT crypt(pin_text, gen_salt('bf'));
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_pin(pin_text text, hashed_pin text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  
SET search_path = public
AS $$
  SELECT crypt(pin_text, hashed_pin) = hashed_pin;
$$;