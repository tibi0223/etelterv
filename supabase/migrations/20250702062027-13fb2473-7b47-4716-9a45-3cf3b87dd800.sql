
-- Enable RLS and add read policies for the new recipe tables

-- Enable RLS on receptek table
ALTER TABLE public.receptek ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read recipes
CREATE POLICY "Enable read access for all users" ON public.receptek
FOR SELECT USING (true);

-- Enable RLS on recept_alapanyag table  
ALTER TABLE public.recept_alapanyag ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read recipe ingredients
CREATE POLICY "Enable read access for all users" ON public.recept_alapanyag
FOR SELECT USING (true);

-- Enable RLS on alapanyag table
ALTER TABLE public.alapanyag ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read ingredients
CREATE POLICY "Enable read access for all users" ON public.alapanyag
FOR SELECT USING (true);
