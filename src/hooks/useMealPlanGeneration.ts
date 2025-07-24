
import { useState } from 'react';
import { filterRecipesByMultipleIngredients } from '@/services/recipeFilters';

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface MealIngredients {
  [mealType: string]: SelectedIngredient[];
}

interface UseMealPlanGenerationProps {
  selectedMeals: string[];
  getRecipesByMealType: (mealType: string) => Promise<any[]>;
  convertToStandardRecipe: (recipe: any) => any;
}

export function useMealPlanGeneration({
  selectedMeals,
  getRecipesByMealType,
  convertToStandardRecipe
}: UseMealPlanGenerationProps) {
  const [generatedRecipes, setGeneratedRecipes] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateMealPlan = async (mealIngredients: MealIngredients = {}) => {
    if (selectedMeals.length === 0) {
      return;
    }

    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    
    try {
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 2000));
      const newRecipes = [];

      for (const mealType of selectedMeals) {
        const mealSpecificIngredients = mealIngredients[mealType] || [];
        const mealTypeRecipes = await getRecipesByMealType(mealType);

        let validRecipes = [];

        if (mealSpecificIngredients.length > 0) {
          const ingredientNames = mealSpecificIngredients.map(ing => ing.ingredient);
          validRecipes = await filterRecipesByMultipleIngredients(mealTypeRecipes, ingredientNames);
        } else {
          validRecipes = mealTypeRecipes;
        }

        if (validRecipes.length > 0) {
          const randomIndex = Math.floor(Math.random() * validRecipes.length);
          const selectedSupabaseRecipe = validRecipes[randomIndex];
          const standardRecipe = convertToStandardRecipe(selectedSupabaseRecipe);
          
          const recipeWithMeta = {
            ...standardRecipe,
            mealType,
            category: mealSpecificIngredients.length > 0 ? mealSpecificIngredients.map(ing => ing.category).join(", ") : "Minden kategória",
            ingredient: mealSpecificIngredients.length > 0 ? mealSpecificIngredients.map(ing => ing.ingredient).join(", ") : "Minden alapanyag"
          };
          
          newRecipes.push(recipeWithMeta);
        }
      }

      await minLoadingTime;
      setGeneratedRecipes(newRecipes);
      
    } catch (error) {
      console.error('❌ Étrend generálási hiba:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGetMultipleCategoryRecipes = async (mealIngredients: MealIngredients) => {
    await handleGenerateMealPlan(mealIngredients);
  };

  return {
    generatedRecipes,
    isGenerating,
    selectedIngredients: [],
    handleGenerateMealPlan,
    handleGetMultipleCategoryRecipes,
    setGeneratedRecipes,
    setIsGenerating
  };
}
