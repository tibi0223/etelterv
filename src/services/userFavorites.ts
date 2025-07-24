
import { supabase } from '@/integrations/supabase/client';

export interface UserFavorite {
  id: string;
  user_id: string;
  category: string;
  ingredient: string;
  created_at: string;
}

// Kedvencek betöltése
export const getUserFavorites = async (userId: string): Promise<UserFavorite[]> => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Kedvencek betöltési hiba:', error);
    return [];
  }

  return data || [];
};

// Kedvenc hozzáadása
export const addUserFavorite = async (userId: string, category: string, ingredient: string): Promise<boolean> => {
  const { error } = await supabase
    .from('user_favorites')
    .insert({
      user_id: userId,
      category,
      ingredient
    });

  if (error) {
    console.error('❌ Kedvenc hozzáadási hiba:', error);
    return false;
  }

  return true;
};

// Kedvenc eltávolítása
export const removeUserFavorite = async (userId: string, category: string, ingredient: string): Promise<boolean> => {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('category', category)
    .eq('ingredient', ingredient);

  if (error) {
    console.error('❌ Kedvenc eltávolítási hiba:', error);
    return false;
  }

  return true;
};

// Ellenőrzi, hogy kedvenc-e az alapanyag
export const isFavoriteIngredient = (
  ingredient: string, 
  category: string, 
  favorites: UserFavorite[]
): boolean => {
  return favorites.some(fav => 
    fav.ingredient === ingredient && fav.category === category
  );
};
