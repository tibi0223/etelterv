
import { SupabaseRecipe } from '@/types/supabase';
import { filterRecipesByIngredient } from './ingredientFilters';

export const filterRecipesByCategory = (
  recipes: SupabaseRecipe[],
  categories: Record<string, string[]>,
  category: string
): SupabaseRecipe[] => {
  const categoryIngredients = categories[category] || [];

  if (categoryIngredients.length === 0) {
    return [];
  }

  const categoryFilteredRecipes = recipes.filter(recipe => {
    return categoryIngredients.some(categoryIngredient => {
      const filtered = filterRecipesByIngredient([recipe], categoryIngredient);
      return filtered.length > 0;
    });
  });

  return categoryFilteredRecipes;
};
