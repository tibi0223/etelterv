-- Mentett étrendek tábla létrehozása
CREATE TABLE public.saved_meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_name TEXT NOT NULL,
  plan_data JSONB NOT NULL, -- Az egész étrend adatait tároljuk
  target_macros JSONB NOT NULL, -- Cél makrók
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS engedélyezése
ALTER TABLE public.saved_meal_plans ENABLE ROW LEVEL SECURITY;

-- Felhasználók csak saját mentett étrendjeiket láthatják
CREATE POLICY "Users can view their own saved meal plans" 
  ON public.saved_meal_plans 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Felhasználók hozzáadhatnak mentett étrendeket
CREATE POLICY "Users can add saved meal plans" 
  ON public.saved_meal_plans 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Felhasználók frissíthetik saját mentett étrendjeiket
CREATE POLICY "Users can update their own saved meal plans" 
  ON public.saved_meal_plans 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Felhasználók törölhetik saját mentett étrendjeiket
CREATE POLICY "Users can delete their own saved meal plans" 
  ON public.saved_meal_plans 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexek a gyorsabb lekérdezéshez
CREATE INDEX idx_saved_meal_plans_user_id ON public.saved_meal_plans(user_id);
CREATE INDEX idx_saved_meal_plans_created_at ON public.saved_meal_plans(created_at);

-- Trigger az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_meal_plans_updated_at 
    BEFORE UPDATE ON public.saved_meal_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 