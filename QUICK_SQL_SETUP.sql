-- 🚀 QUICK SQL SETUP for New Meal Plan Generator
-- Copy this entire script and run it in Supabase SQL Editor

-- 1. Function to get recipes with calculated macros
CREATE OR REPLACE FUNCTION get_recipes_with_macros()
RETURNS TABLE (
    recipe_id INTEGER,
    recipe_name TEXT,
    category TEXT,
    base_protein DECIMAL,
    base_carbs DECIMAL,
    base_fat DECIMAL,
    base_calories DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r."Recept ID"::INTEGER as recipe_id,
        r."Recept neve"::TEXT as recipe_name,
        COALESCE(e."Név", 'egyéb')::TEXT as category,
        COALESCE(SUM(
            extract_numeric_value(a."Fehérje/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_protein,
        COALESCE(SUM(
            extract_numeric_value(a."Szénhidrát/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_carbs,
        COALESCE(SUM(
            extract_numeric_value(a."Zsir/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_fat,
        COALESCE(SUM(
            extract_numeric_value(a."Kcal/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_calories
    FROM receptek r
    LEFT JOIN étkezések e ON r."Étkezés" = e."ID"
    LEFT JOIN recept_alapanyag ra ON r."Recept ID" = ra."Recept_ID"
    LEFT JOIN alapanyag a ON extract_numeric_value(ra."Élelmiszer ID"::TEXT) = a."ID"::INTEGER
    WHERE r."Recept ID" IS NOT NULL
    GROUP BY r."Recept ID", r."Recept neve", e."Név"
    HAVING SUM(COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0)) > 0
    ORDER BY r."Recept ID";
END;
$$ LANGUAGE plpgsql;

-- 2. Function for ingredient constraints (simplified for LP)
CREATE OR REPLACE FUNCTION get_ingredient_constraints_for_recipes(p_recipe_ids INTEGER[])
RETURNS TABLE (
    ingredient_id INTEGER,
    ingredient_name TEXT,
    recipe_id INTEGER,
    recipe_name TEXT,
    meal_type TEXT,
    protein_per_g DECIMAL,
    carbs_per_g DECIMAL,
    fat_per_g DECIMAL,
    calories_per_g DECIMAL,
    base_quantity DECIMAL,
    min_scale_factor DECIMAL,
    max_scale_factor DECIMAL,
    binding_group TEXT,
    ingredient_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a."ID"::INTEGER as ingredient_id,
        a."Élelmiszer neve"::TEXT as ingredient_name,
        r."Recept ID"::INTEGER as recipe_id,
        r."Recept neve"::TEXT as recipe_name,
        COALESCE(e."Név", 'egyéb')::TEXT as meal_type,
        (extract_numeric_value(a."Fehérje/100g"::TEXT) / 100)::DECIMAL as protein_per_g,
        (extract_numeric_value(a."Szénhidrát/100g"::TEXT) / 100)::DECIMAL as carbs_per_g,
        (extract_numeric_value(a."Zsir/100g"::TEXT) / 100)::DECIMAL as fat_per_g,
        (extract_numeric_value(a."Kcal/100g"::TEXT) / 100)::DECIMAL as calories_per_g,
        extract_numeric_value(ra."Mennyiség"::TEXT)::DECIMAL as base_quantity,
        0.7::DECIMAL as min_scale_factor,
        2.5::DECIMAL as max_scale_factor,
        CASE 
            WHEN ra."Kotes" IS NOT NULL THEN CONCAT('R', r."Recept ID", '-', ra."Kotes")
            ELSE NULL
        END::TEXT as binding_group,
        'KIEGESZITO'::TEXT as ingredient_type
    FROM receptek r
    LEFT JOIN étkezések e ON r."Étkezés" = e."ID"
    INNER JOIN recept_alapanyag ra ON r."Recept ID" = ra."Recept_ID"
    INNER JOIN alapanyag a ON extract_numeric_value(ra."Élelmiszer ID"::TEXT) = a."ID"::INTEGER
    WHERE r."Recept ID" = ANY(p_recipe_ids)
    AND extract_numeric_value(ra."Mennyiség"::TEXT) > 0
    ORDER BY r."Recept ID", a."ID";
END;
$$ LANGUAGE plpgsql;

-- 3. Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    recipe_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_favorites_user
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_favorites_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES receptek("Recept ID")
        ON DELETE CASCADE,
    CONSTRAINT unique_user_recipe_favorite
        UNIQUE (user_id, recipe_id)
);

-- 4. Enable RLS and policies
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_favorites_all_policy" ON user_favorites
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_recipes_with_macros() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ingredient_constraints_for_recipes(INTEGER[]) TO authenticated, anon;
-- Copy this entire script and run it in Supabase SQL Editor

-- 1. Function to get recipes with calculated macros
CREATE OR REPLACE FUNCTION get_recipes_with_macros()
RETURNS TABLE (
    recipe_id INTEGER,
    recipe_name TEXT,
    category TEXT,
    base_protein DECIMAL,
    base_carbs DECIMAL,
    base_fat DECIMAL,
    base_calories DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r."Recept ID"::INTEGER as recipe_id,
        r."Recept neve"::TEXT as recipe_name,
        COALESCE(e."Név", 'egyéb')::TEXT as category,
        COALESCE(SUM(
            extract_numeric_value(a."Fehérje/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_protein,
        COALESCE(SUM(
            extract_numeric_value(a."Szénhidrát/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_carbs,
        COALESCE(SUM(
            extract_numeric_value(a."Zsir/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_fat,
        COALESCE(SUM(
            extract_numeric_value(a."Kcal/100g"::TEXT) * 
            COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0) / 100
        ), 0)::DECIMAL as base_calories
    FROM receptek r
    LEFT JOIN étkezések e ON r."Étkezés" = e."ID"
    LEFT JOIN recept_alapanyag ra ON r."Recept ID" = ra."Recept_ID"
    LEFT JOIN alapanyag a ON extract_numeric_value(ra."Élelmiszer ID"::TEXT) = a."ID"::INTEGER
    WHERE r."Recept ID" IS NOT NULL
    GROUP BY r."Recept ID", r."Recept neve", e."Név"
    HAVING SUM(COALESCE(extract_numeric_value(ra."Mennyiség"::TEXT), 0)) > 0
    ORDER BY r."Recept ID";
END;
$$ LANGUAGE plpgsql;

-- 2. Function for ingredient constraints (simplified for LP)
CREATE OR REPLACE FUNCTION get_ingredient_constraints_for_recipes(p_recipe_ids INTEGER[])
RETURNS TABLE (
    ingredient_id INTEGER,
    ingredient_name TEXT,
    recipe_id INTEGER,
    recipe_name TEXT,
    meal_type TEXT,
    protein_per_g DECIMAL,
    carbs_per_g DECIMAL,
    fat_per_g DECIMAL,
    calories_per_g DECIMAL,
    base_quantity DECIMAL,
    min_scale_factor DECIMAL,
    max_scale_factor DECIMAL,
    binding_group TEXT,
    ingredient_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a."ID"::INTEGER as ingredient_id,
        a."Élelmiszer neve"::TEXT as ingredient_name,
        r."Recept ID"::INTEGER as recipe_id,
        r."Recept neve"::TEXT as recipe_name,
        COALESCE(e."Név", 'egyéb')::TEXT as meal_type,
        (extract_numeric_value(a."Fehérje/100g"::TEXT) / 100)::DECIMAL as protein_per_g,
        (extract_numeric_value(a."Szénhidrát/100g"::TEXT) / 100)::DECIMAL as carbs_per_g,
        (extract_numeric_value(a."Zsir/100g"::TEXT) / 100)::DECIMAL as fat_per_g,
        (extract_numeric_value(a."Kcal/100g"::TEXT) / 100)::DECIMAL as calories_per_g,
        extract_numeric_value(ra."Mennyiség"::TEXT)::DECIMAL as base_quantity,
        0.7::DECIMAL as min_scale_factor,
        2.5::DECIMAL as max_scale_factor,
        CASE 
            WHEN ra."Kotes" IS NOT NULL THEN CONCAT('R', r."Recept ID", '-', ra."Kotes")
            ELSE NULL
        END::TEXT as binding_group,
        'KIEGESZITO'::TEXT as ingredient_type
    FROM receptek r
    LEFT JOIN étkezések e ON r."Étkezés" = e."ID"
    INNER JOIN recept_alapanyag ra ON r."Recept ID" = ra."Recept_ID"
    INNER JOIN alapanyag a ON extract_numeric_value(ra."Élelmiszer ID"::TEXT) = a."ID"::INTEGER
    WHERE r."Recept ID" = ANY(p_recipe_ids)
    AND extract_numeric_value(ra."Mennyiség"::TEXT) > 0
    ORDER BY r."Recept ID", a."ID";
END;
$$ LANGUAGE plpgsql;

-- 3. Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    recipe_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_favorites_user
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_favorites_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES receptek("Recept ID")
        ON DELETE CASCADE,
    CONSTRAINT unique_user_recipe_favorite
        UNIQUE (user_id, recipe_id)
);

-- 4. Enable RLS and policies
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_favorites_all_policy" ON user_favorites
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_recipes_with_macros() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ingredient_constraints_for_recipes(INTEGER[]) TO authenticated, anon;
 