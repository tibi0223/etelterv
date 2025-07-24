
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/recipe';

export const addToFavorites = async (userId: string, recipe: Recipe) => {
  const { error } = await supabase
    .from('favorites')
    .insert({
      user_id: userId,
      recipe_name: recipe.név,
      recipe_data: recipe as any // Cast to any to satisfy Json type requirement
    });

  if (error) {
    console.error('Kedvencek hozzáadási hiba:', error);
    throw error;
  }

  return true;
};

export const removeFromFavorites = async (userId: string, recipeName: string) => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_name', recipeName);

  if (error) {
    console.error('Kedvencek törlési hiba:', error);
    throw error;
  }

  return true;
};

export const getFavorites = async (userId: string) => {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Kedvencek betöltési hiba:', error);
    throw error;
  }

  return data;
};

export const isFavorite = async (userId: string, recipeName: string) => {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('recipe_name', recipeName)
    .maybeSingle();

  if (error) {
    console.error('Kedvenc ellenőrzési hiba:', error);
    return false;
  }

  return !!data;
};
