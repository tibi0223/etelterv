
import { SupabaseRecipe } from '@/types/supabase';
import { normalizeText } from '@/utils/textNormalization';

export const getAllRecipeIngredients = (recipe: SupabaseRecipe): string[] => {
  return [
    recipe['Hozzavalo_1'], recipe['Hozzavalo_2'], recipe['Hozzavalo_3'],
    recipe['Hozzavalo_4'], recipe['Hozzavalo_5'], recipe['Hozzavalo_6'],
    recipe['Hozzavalo_7'], recipe['Hozzavalo_8'], recipe['Hozzavalo_9'],
    recipe['Hozzavalo_10'], recipe['Hozzavalo_11'], recipe['Hozzavalo_12'],
    recipe['Hozzavalo_13'], recipe['Hozzavalo_14'], recipe['Hozzavalo_15'],
    recipe['Hozzavalo_16'], recipe['Hozzavalo_17'], recipe['Hozzavalo_18']
  ].filter(Boolean).map(ing => ing?.toString() || '');
};

export const hasIngredientMatch = (recipeIngredients: string[], searchIngredient: string): boolean => {
  const searchNormalized = normalizeText(searchIngredient);
  
  return recipeIngredients.some(recipeIng => {
    const recipeIngNormalized = normalizeText(recipeIng);
    const exactMatch = recipeIngNormalized === searchNormalized;
    const containsIngredient = recipeIngNormalized.includes(searchNormalized);
    
    return exactMatch || containsIngredient;
  });
};

export const filterRecipesByIngredient = (
  recipes: SupabaseRecipe[],
  ingredient: string
): SupabaseRecipe[] => {
  const filteredRecipes = recipes.filter(recipe => {
    const allIngredients = getAllRecipeIngredients(recipe);
    return hasIngredientMatch(allIngredients, ingredient);
  });
  
  return filteredRecipes;
};

export const filterRecipesByMultipleIngredients = (
  recipes: SupabaseRecipe[],
  ingredients: string[]
): SupabaseRecipe[] => {
  const filteredRecipes = recipes.filter(recipe => {
    const recipeIngredients = getAllRecipeIngredients(recipe);
    
    const hasAllIngredients = ingredients.every(selectedIngredient => {
      return hasIngredientMatch(recipeIngredients, selectedIngredient);
    });
    
    return hasAllIngredients;
  });
  
  return filteredRecipes;
};
