
-- Először engedélyezzük az RLS-t a Preferencia táblán
ALTER TABLE public."Preferencia" ENABLE ROW LEVEL SECURITY;

-- Létrehozunk egy policy-t, amely mindenki számára olvashatóvá teszi az adatokat
CREATE POLICY "Everyone can read preferences data" ON public."Preferencia"
FOR SELECT USING (true);

-- Létrehozunk egy új táblát az ételkategóriákhoz a megadott húsfélékkel
CREATE TABLE public."Ételkategóriák_Új" (
    id BIGSERIAL PRIMARY KEY,
    "Húsfélék" TEXT,
    "Halak" TEXT,
    "Zöldségek / Vegetáriánus" TEXT,
    "Tejtermékek" TEXT,
    "Gyümölcsök" TEXT,
    "Gabonák és Tészták" TEXT,
    "Olajok és Magvak" TEXT
);

-- Engedélyezzük az RLS-t az új táblán is
ALTER TABLE public."Ételkategóriák_Új" ENABLE ROW LEVEL SECURITY;

-- Policy az új táblához
CREATE POLICY "Everyone can read new food categories" ON public."Ételkategóriák_Új"
FOR SELECT USING (true);

-- Beszúrjuk a húsfélék adatait
INSERT INTO public."Ételkategóriák_Új" ("Húsfélék") VALUES 
('Csirkemáj'),
('Csirkemell'),
('Csirkemell sonka'),
('Darált csirkemell'),
('Darált marha'),
('Darált hús'),
('Darált pulyka'),
('Darált pulykamell'),
('Fekete erdei sonka'),
('Főtt, füstölt sonka'),
('Pulykamell'),
('Pulykamell sonka'),
('Sertéscomb'),
('Sertéskaraj'),
('Sonka'),
('Marhafelsál'),
('Marha'),
('Virsli');

-- Átmásoljuk a többi kategória adatait a régi Ételkategóriák táblából
INSERT INTO public."Ételkategóriák_Új" ("Halak", "Zöldségek / Vegetáriánus", "Tejtermékek", "Gyümölcsök", "Gabonák és Tészták", "Olajok és Magvak")
SELECT DISTINCT "Halak", "Zöldségek / Vegetáriánus", "Tejtermékek", "Gyümölcsök", "Gabonák és Tészták", "Olajok és Magvak"
FROM public."Ételkategóriák"
WHERE "Halak" IS NOT NULL 
   OR "Zöldségek / Vegetáriánus" IS NOT NULL 
   OR "Tejtermékek" IS NOT NULL 
   OR "Gyümölcsök" IS NOT NULL 
   OR "Gabonák és Tészták" IS NOT NULL 
   OR "Olajok és Magvak" IS NOT NULL;
