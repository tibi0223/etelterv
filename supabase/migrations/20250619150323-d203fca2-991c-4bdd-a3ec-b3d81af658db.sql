
-- Grant necessary permissions for the admin overview view
GRANT SELECT ON auth.users TO authenticated;

-- Ensure the admin_user_overview view has proper permissions
DROP VIEW IF EXISTS public.admin_user_overview;

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
  -- Értékelések száma
  0 as ratings_count
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.admin_user_overview TO authenticated;

-- Mivel VIEW-kra nem lehet RLS policy-t alkalmazni, 
-- a biztonságot a VIEW definíciójában kell kezelni
-- vagy a lekérdezésekben kell szűrni
