
-- Ételpreferenciák tábla létrehozása
CREATE TABLE public.Ételpreferenciák (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT NOT NULL,
  ingredient TEXT NOT NULL,
  preference TEXT NOT NULL CHECK (preference IN ('like', 'dislike', 'neutral')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, ingredient)
);

-- RLS engedélyezése
ALTER TABLE public.Ételpreferenciák ENABLE ROW LEVEL SECURITY;

-- RLS szabályok létrehozása
CREATE POLICY "Users can view their own food preferences" 
  ON public.Ételpreferenciák 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own food preferences" 
  ON public.Ételpreferenciák 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food preferences" 
  ON public.Ételpreferenciák 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food preferences" 
  ON public.Ételpreferenciák 
  FOR DELETE 
  USING (auth.uid() = user_id);
