-- Add admin pin system
ALTER TABLE public.profiles 
ADD COLUMN admin_pin TEXT,
ADD COLUMN pin_set_at TIMESTAMP WITH TIME ZONE;