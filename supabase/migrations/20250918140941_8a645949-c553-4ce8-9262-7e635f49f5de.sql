-- Update existing owner accounts to have the correct role
UPDATE public.profiles 
SET 
  role = 'owner',
  max_classes = -1
WHERE email IN ('taywil0809@outlook.com', 'keswyn@outlook.com');