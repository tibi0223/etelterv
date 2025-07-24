
import { supabase } from '@/integrations/supabase/client';
import { SupabaseRecipe } from '@/types/supabase';
import { normalizeText } from '@/utils/textNormalization';

export interface UserPreference {
  id: string;
  user_id: string;
  category: string;
  ingredient: string;
  preference: 'like' | 'dislike' | 'neutral';
}

export const getUserPreferences = async (userId: string): Promise<UserPreference[]> => {
  const { data, error } = await supabase
    .from('Ételpreferenciák')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Preferenciák betöltési hiba:', error);
    return [];
  }

  return (data || []).map(item => ({
    ...item,
    preference: item.preference as 'like' | 'dislike' | 'neutral'
  }));
};

export const filterIngredientsByPreferences = (
  ingredients: string[],
  category: string,
  userPreferences: UserPreference[]
): string[] => {
  const filteredIngredients = ingredients.filter(ingredient => {
    const preference = userPreferences.find(pref => 
      normalizeText(pref.category) === normalizeText(category) &&
      normalizeText(pref.ingredient) === normalizeText(ingredient)
    );
    
    if (!preference) return true;
    
    const shouldKeep = preference.preference === 'like' || preference.preference === 'neutral';
    return shouldKeep;
  });
  
  return filteredIngredients;
};

export const prioritizeRecipesByPreferences = (
  recipes: SupabaseRecipe[],
  userPreferences: UserPreference[]
): SupabaseRecipe[] => {
  const categorizedRecipes = {
    liked: [] as SupabaseRecipe[],
    neutral: [] as SupabaseRecipe[],
    noPreference: [] as SupabaseRecipe[]
  };
  
  recipes.forEach(recipe => {
    const allIngredients = [
      recipe['Hozzavalo_1'], recipe['Hozzavalo_2'], recipe['Hozzav로_3'],
      recipe['Hozzavalo_4'], recipe['Hozzavalo_5'], recipe['Hozzavalo_6'],
      recipe['Hozzavalo_7'], recipe['Hozzavalo_8'], recipe['Hozzavalo_9'],
      recipe['Hozzavalo_10'], recipe['Hozzavalo_11'], recipe['Hozzavalo_12'],
      recipe['Hozzavalo_13'], recipe['Hozzavalo_14'], recipe['Hozzavalo_15'],
      recipe['Hozzavalo_16'], recipe['Hozzavalo_17'], recipe['Hozzavalo_18']
    ].filter(Boolean);
    
    let hasLikedIngredient = false;
    let hasDislikedIngredient = false;
    let hasNeutralIngredient = false;
    
    allIngredients.forEach(ingredient => {
      if (!ingredient) return;
      
      const preference = userPreferences.find(pref => {
        const ingredientNormalized = normalizeText(ingredient);
        const prefIngredientNormalized = normalizeText(pref.ingredient);
        
        return ingredientNormalized.includes(prefIngredientNormalized) ||
               prefIngredientNormalized.includes(ingredientNormalized);
      });
      
      if (preference) {
        if (preference.preference === 'like') hasLikedIngredient = true;
        else if (preference.preference === 'dislike') hasDislikedIngredient = true;
        else if (preference.preference === 'neutral') hasNeutralIngredient = true;
      }
    });
    
    if (hasDislikedIngredient) {
      return;
    }
    
    if (hasLikedIngredient) {
      categorizedRecipes.liked.push(recipe);
    } else if (hasNeutralIngredient) {
      categorizedRecipes.neutral.push(recipe);
    } else {
      categorizedRecipes.noPreference.push(recipe);
    }
  });
  
  const prioritizedRecipes = [
    ...categorizedRecipes.liked,
    ...categorizedRecipes.neutral,
    ...categorizedRecipes.noPreference
  ];
  
  return prioritizedRecipes;
};
