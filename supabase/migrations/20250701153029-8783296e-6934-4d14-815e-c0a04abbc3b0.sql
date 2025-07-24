
-- Először nézzük meg mi van az Étkezések táblában
SELECT * FROM "Étkezések" LIMIT 5;

-- Adjunk hozzá egy meal_type oszlopot a receptekv2 táblához
ALTER TABLE receptekv2 ADD COLUMN meal_type TEXT;

-- Vagy ha már létezik, ellenőrizzük
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'receptekv2';

-- Nézzük meg a receptekv2 tábla szerkezetét is
SELECT * FROM receptekv2 LIMIT 3;
