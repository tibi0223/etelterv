
-- Admin szerepkörök enum létrehozása
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- User roles tábla létrehozása
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- RLS engedélyezése a user_roles táblán
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer függvény admin szerepkör ellenőrzésére
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND role = 'admin'
  );
$$;

-- RLS policy: csak adminok láthatják az összes szerepkört
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS policy: csak adminok adhatnak szerepköröket
CREATE POLICY "Admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- RLS policy: csak adminok módosíthatják a szerepköröket
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS policy: csak adminok törölhetik a szerepköröket
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admin view létrehozása a felhasználói adatok összesítéséhez
CREATE OR REPLACE VIEW public.admin_user_overview AS
SELECT 
  au.id,
  au.email,
  au.created_at as user_created_at,
  p.full_name,
  p.age,
  p.weight,
  p.height,
  p.activity_level,
  p.dietary_preferences,
  p.allergies,
  p.avatar_url,
  ur.role,
  -- Kedvencek száma
  (SELECT COUNT(*) FROM public.favorites f WHERE f.user_id = au.id) as favorites_count,
  -- Preferenciák száma
  (SELECT COUNT(*) FROM public."Ételpreferenciák" ep WHERE ep.user_id = au.id) as preferences_count,
  -- Értékelések száma (ezt később implementáljuk)
  0 as ratings_count
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id;

-- RLS az admin view-hoz
ALTER VIEW public.admin_user_overview SET (security_invoker = true);

-- Policy az admin view-hoz
CREATE POLICY "Admins can view user overview"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = id);

-- Frissítsük a favorites táblát hogy adminok is láthassák
CREATE POLICY "Admins can view all favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- Frissítsük az Ételpreferenciák táblát hogy adminok is láthassák
CREATE POLICY "Admins can view all food preferences"
ON public."Ételpreferenciák"
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- Értékelések tábla frissítése hogy adminok is láthassák
ALTER TABLE public."Értékelések" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view ratings"
ON public."Értékelések"
FOR SELECT
TO authenticated
USING (true);

-- Először létrehozunk egy alapértelmezett admin felhasználót
-- FONTOS: Cseréld le az email címet a saját admin email címedre!
-- INSERT INTO public.user_roles (user_id, role, assigned_by) 
-- SELECT id, 'admin', id 
-- FROM auth.users 
-- WHERE email = 'admin@example.com';
