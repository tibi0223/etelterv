-- Makró célok hozzáadása a profiles táblához
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS target_protein INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS target_carbs INTEGER DEFAULT 160,
ADD COLUMN IF NOT EXISTS target_fat INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS target_calories INTEGER DEFAULT 1700;

-- Kommentek hozzáadása a mezőkhöz
COMMENT ON COLUMN public.profiles.target_protein IS 'Napi fehérje cél grammban';
COMMENT ON COLUMN public.profiles.target_carbs IS 'Napi szénhidrát cél grammban';
COMMENT ON COLUMN public.profiles.target_fat IS 'Napi zsír cél grammban';
COMMENT ON COLUMN public.profiles.target_calories IS 'Napi kalória cél kcal-ban';

-- Indexek létrehozása a gyorsabb lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_profiles_target_protein ON public.profiles(target_protein);
CREATE INDEX IF NOT EXISTS idx_profiles_target_carbs ON public.profiles(target_carbs);
CREATE INDEX IF NOT EXISTS idx_profiles_target_fat ON public.profiles(target_fat);
CREATE INDEX IF NOT EXISTS idx_profiles_target_calories ON public.profiles(target_calories);