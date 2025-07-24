
-- Fix foreign key constraints to allow user deletion
-- Update user_health_conditions table foreign key to cascade delete
ALTER TABLE public.user_health_conditions 
DROP CONSTRAINT IF EXISTS user_health_conditions_user_id_fkey;

ALTER TABLE public.user_health_conditions 
ADD CONSTRAINT user_health_conditions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update Ételpreferenciák table foreign key to cascade delete
ALTER TABLE public."Ételpreferenciák" 
DROP CONSTRAINT IF EXISTS "Ételpreferenciák_user_id_fkey";

ALTER TABLE public."Ételpreferenciák" 
ADD CONSTRAINT "Ételpreferenciák_user_id_fkey" 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update profiles table foreign key to cascade delete (if not already set)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update favorites table foreign key to cascade delete
ALTER TABLE public.favorites 
DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;

ALTER TABLE public.favorites 
ADD CONSTRAINT favorites_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update user_roles table foreign key to cascade delete
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update Értékelések table foreign key to cascade delete
ALTER TABLE public."Értékelések" 
DROP CONSTRAINT IF EXISTS "Értékelések_user_id_fkey";

ALTER TABLE public."Értékelések" 
ADD CONSTRAINT "Értékelések_user_id_fkey" 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
