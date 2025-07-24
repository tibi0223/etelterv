
-- Kedvencek tábla létrehozása
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  recipe_name TEXT NOT NULL,
  recipe_data JSONB NOT NULL, -- Az egész recept adatait tároljuk
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS engedélyezése
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Felhasználók csak saját kedvenceiket láthatják
CREATE POLICY "Users can view their own favorites" 
  ON public.favorites 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Felhasználók hozzáadhatnak kedvenceket
CREATE POLICY "Users can add favorites" 
  ON public.favorites 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Felhasználók törölhetik kedvenceiket
CREATE POLICY "Users can delete their own favorites" 
  ON public.favorites 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Egyedi index hogy egy recept csak egyszer legyen kedvenc felhasználónként
CREATE UNIQUE INDEX idx_favorites_user_recipe 
ON public.favorites(user_id, recipe_name);
