-- SQL Functions for Real Meal Plan Integration
-- Run these in Supabase SQL Editor

-- ============================================================================
-- View: recipe_scalability (global bound ratio based scalability per recipe)
-- ============================================================================
DROP VIEW IF EXISTS recipe_scalability;

CREATE VIEW recipe_scalability AS
WITH base AS (
  SELECT
    r."Recept ID"::int AS recipe_id,
    /* Calories (for global bound ratio) */
    COALESCE(SUM( extract_numeric_value(a."Kcal/100g"::text) * COALESCE(extract_numeric_value(ra."Mennyiség"::text),0) / 100 ),0)::decimal AS tot_cal,
    COALESCE(SUM( CASE WHEN ra."Kotes" IS NOT NULL
        THEN extract_numeric_value(a."Kcal/100g"::text) * COALESCE(extract_numeric_value(ra."Mennyiség"::text),0) / 100
        ELSE 0 END ),0)::decimal AS bound_cal,

    /* Macros total (for densities) */
    COALESCE(SUM( extract_numeric_value(a."Fehérje/100g"::text) * COALESCE(extract_numeric_value(ra."Mennyiség"::text),0) / 100 ),0)::decimal AS tot_p,
    COALESCE(SUM( extract_numeric_value(a."Szénhidrát/100g"::text) * COALESCE(extract_numeric_value(ra."Mennyiség"::text),0) / 100 ),0)::decimal AS tot_c,
    COALESCE(SUM( extract_numeric_value(a."Zsir/100g"::text) * COALESCE(extract_numeric_value(ra."Mennyiség"::text),0) / 100 ),0)::decimal AS tot_f,

    /* Total grams for density */
    COALESCE(SUM( COALESCE(extract_numeric_value(ra."Mennyiség"::text),0) ),0)::decimal AS tot_g
  FROM receptek r
  JOIN recept_alapanyag ra ON r."Recept ID" = ra."Recept_ID"
  JOIN alapanyag a ON extract_numeric_value(ra."Élelmiszer ID"::text) = a."ID"::int
  GROUP BY r."Recept ID"
),
dens AS (
  SELECT
    recipe_id, tot_cal, bound_cal, tot_p, tot_c, tot_f, tot_g,
    CASE WHEN tot_g > 0 THEN (tot_p / tot_g) * 100 ELSE 0 END AS density_p,
    CASE WHEN tot_g > 0 THEN (tot_c / tot_g) * 100 ELSE 0 END AS density_c,
    CASE WHEN tot_g > 0 THEN (tot_f / tot_g) * 100 ELSE 0 END AS density_f
  FROM base
),
ratio AS (
  SELECT
    recipe_id, density_p, density_c, density_f,
    CASE WHEN tot_cal > 0 THEN bound_cal / tot_cal ELSE 0 END AS bound_ratio_global,
    CASE WHEN tot_cal > 0 THEN (tot_cal - bound_cal) / tot_cal ELSE 0 END AS independent_ratio_global
  FROM dens
),
skala AS (
  SELECT
    recipe_id, density_p, density_c, density_f,
    /* original_skala_global = ind * 0.7 + (1 - bound) * 0.3 */
    (independent_ratio_global * 0.7 + (1 - bound_ratio_global) * 0.3) AS original_skala_global
  FROM ratio
)
SELECT
  recipe_id,
  LEAST(1.0, original_skala_global * NULLIF(density_p,0) / 20.0) AS protein_scalability,
  LEAST(1.0, original_skala_global * NULLIF(density_c,0) / 50.0) AS carbs_scalability,
  LEAST(1.0, (original_skala_global * NULLIF(density_f,0) / 15.0) * CASE WHEN density_f > 80 THEN 0.5 ELSE 1 END) AS fat_scalability,
  density_p AS protein_density,
  density_c AS carbs_density,
  density_f AS fat_density
FROM skala;

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

-- 2. Function to get ingredient constraints for LP optimization
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
        CASE 
            WHEN a."Típus" = 'FO_MAKRO' THEN 0.1::DECIMAL
            ELSE 0.7::DECIMAL
        END as min_scale_factor,
        CASE 
            WHEN a."Típus" = 'FO_MAKRO' THEN 5.0::DECIMAL
            ELSE 2.5::DECIMAL
        END as max_scale_factor,
        CASE 
            WHEN ra."Kotes" IS NOT NULL THEN CONCAT('R', r."Recept ID", '-', ra."Kotes")
            ELSE NULL
        END::TEXT as binding_group,
        COALESCE(a."Típus", 'KIEGESZITO')::TEXT as ingredient_type
    FROM receptek r
    LEFT JOIN étkezések e ON r."Étkezés" = e."ID"
    INNER JOIN recept_alapanyag ra ON r."Recept ID" = ra."Recept_ID"
    INNER JOIN alapanyag a ON extract_numeric_value(ra."Élelmiszer ID"::TEXT) = a."ID"::INTEGER
    WHERE r."Recept ID" = ANY(p_recipe_ids)
    AND extract_numeric_value(ra."Mennyiség"::TEXT) > 0
    ORDER BY r."Recept ID", a."ID";
END;
$$ LANGUAGE plpgsql;

-- 3. Create user_favorites table if it doesn't exist
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

-- Enable RLS on user_favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policy for user_favorites
CREATE POLICY "user_favorites_all_policy" ON user_favorites
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_meal_history_user_date ON user_meal_history(user_id, date_used);
CREATE INDEX IF NOT EXISTS idx_user_meal_history_recipe_date ON user_meal_history(recipe_id, date_used);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_recipe ON user_favorites(recipe_id);

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_recipes_with_macros() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ingredient_constraints_for_recipes(INTEGER[]) TO authenticated, anon;
-- Run these in Supabase SQL Editor

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

-- 2. Function to get ingredient constraints for LP optimization
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
        CASE 
            WHEN a."Típus" = 'FO_MAKRO' THEN 0.1::DECIMAL
            ELSE 0.7::DECIMAL
        END as min_scale_factor,
        CASE 
            WHEN a."Típus" = 'FO_MAKRO' THEN 5.0::DECIMAL
            ELSE 2.5::DECIMAL
        END as max_scale_factor,
        CASE 
            WHEN ra."Kotes" IS NOT NULL THEN CONCAT('R', r."Recept ID", '-', ra."Kotes")
            ELSE NULL
        END::TEXT as binding_group,
        COALESCE(a."Típus", 'KIEGESZITO')::TEXT as ingredient_type
    FROM receptek r
    LEFT JOIN étkezések e ON r."Étkezés" = e."ID"
    INNER JOIN recept_alapanyag ra ON r."Recept ID" = ra."Recept_ID"
    INNER JOIN alapanyag a ON extract_numeric_value(ra."Élelmiszer ID"::TEXT) = a."ID"::INTEGER
    WHERE r."Recept ID" = ANY(p_recipe_ids)
    AND extract_numeric_value(ra."Mennyiség"::TEXT) > 0
    ORDER BY r."Recept ID", a."ID";
END;
$$ LANGUAGE plpgsql;

-- 3. Create user_favorites table if it doesn't exist
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

-- Enable RLS on user_favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policy for user_favorites
CREATE POLICY "user_favorites_all_policy" ON user_favorites
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_meal_history_user_date ON user_meal_history(user_id, date_used);
CREATE INDEX IF NOT EXISTS idx_user_meal_history_recipe_date ON user_meal_history(recipe_id, date_used);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_recipe ON user_favorites(recipe_id);

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_recipes_with_macros() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ingredient_constraints_for_recipes(INTEGER[]) TO authenticated, anon;
 