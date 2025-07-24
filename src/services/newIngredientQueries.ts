import { supabase } from '../integrations/supabase/client';

export interface NewIngredient {
  Elelmiszer_nev: string;
  Hozzarendelt_ID: string;
  Kategoria_ID: number;
  Kep: string | null;
}

export interface IngredientCategory {
  Kategoria_ID: number;
  Kategoriak: string;
}

// Cache for ingredients to avoid repeated DB calls
let ingredientCache: NewIngredient[] | null = null;
let categoryCache: IngredientCategory[] | null = null;

export const fetchNewIngredients = async (): Promise<NewIngredient[]> => {
  if (ingredientCache) {
    console.log('🔄 Használom a cache-elt alapanyagokat:', ingredientCache.length, 'db');
    return ingredientCache;
  }
  
  console.log('🔄 Új alapanyagok betöltése az elelmiszer_kep táblából...');
  
  const { data, error } = await supabase
    .from('elelmiszer_kep')
    .select('*');
    
  if (error) {
    console.error('❌ Hiba az alapanyagok betöltésekor:', error);
    return [];
  }
  
  console.log('✅ Alapanyagok betöltve:', data?.length || 0, 'db');
  ingredientCache = data || [];
  return ingredientCache;
};

export const fetchIngredientCategories = async (): Promise<IngredientCategory[]> => {
  if (categoryCache) {
    console.log('🔄 Használom a cache-elt kategóriákat:', categoryCache.length, 'db');
    return categoryCache;
  }
  
  console.log('🔄 Kategóriák betöltése az elelmiszer_kategoriak táblából...');
  
  const { data, error } = await supabase
    .from('elelmiszer_kategoriak')
    .select('*')
    .order('Kategoriak');
    
  if (error) {
    console.error('❌ Hiba a kategóriák betöltésekor:', error);
    return [];
  }
  
  console.log('✅ Kategóriák betöltve:', data?.length || 0, 'db');
  categoryCache = data || [];
  return categoryCache;
};

export const fetchIngredientsByCategory = async (categoryId: number): Promise<NewIngredient[]> => {
  console.log('🔄 Alapanyagok betöltése kategória szerint:', categoryId);
  
  const ingredients = await fetchNewIngredients();
  const filtered = ingredients.filter(ing => ing.Kategoria_ID === categoryId);
  
  console.log('✅ Kategória alapanyagai:', filtered.length, 'db');
  return filtered;
};

export const findIngredientByName = async (name: string): Promise<NewIngredient | null> => {
  const ingredients = await fetchNewIngredients();
  const found = ingredients.find(ing => 
    ing.Elelmiszer_nev?.toLowerCase().trim() === name.toLowerCase().trim()
  );
  
  if (found) {
    console.log('✅ Alapanyag találat:', name, '->', found.Hozzarendelt_ID);
  } else {
    console.warn('❌ Nincs alapanyag találat:', name);
  }
  
  return found || null;
};

export const findIngredientByAssignedId = async (assignedId: string): Promise<NewIngredient | null> => {
  const ingredients = await fetchNewIngredients();
  const found = ingredients.find(ing => ing.Hozzarendelt_ID === assignedId);
  
  return found || null;
};

// Cache invalidation functions
export const clearIngredientCache = () => {
  console.log('🧹 Cache törölve');
  ingredientCache = null;
  categoryCache = null;
};