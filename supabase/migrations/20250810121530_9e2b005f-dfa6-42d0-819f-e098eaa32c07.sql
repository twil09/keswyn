-- Step 1: Add new enum values (must be in separate transaction)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'premium_teacher';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'free_teacher';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'premium_student';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'free_student';