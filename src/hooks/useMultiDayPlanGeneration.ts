import { useState } from 'react';
import { Recipe } from '@/types/recipe';
import { filterRecipesByMultipleIngredients } from '@/services/recipeFilters';

interface MultiDayMealPlan {
  day: number;
  date: string;
  meals: {
    [mealType: string]: Recipe | null;
  };
}

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface MealIngredients {
  [mealType: string]: SelectedIngredient[];
}

interface UseMultiDayPlanGenerationProps {
  getRecipesByMealType: (mealType: string) => Promise<any[]>;
  convertToStandardRecipe: (recipe: any) => Recipe;
}

export function useMultiDayPlanGeneration({
  getRecipesByMealType,
  convertToStandardRecipe
}: UseMultiDayPlanGenerationProps) {
  const [multiDayPlan, setMultiDayPlan] = useState<MultiDayMealPlan[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMultiDayPlan = async (
    days: number, 
    selectedMeals: string[] = ['reggeli', 'ebéd', 'vacsora'], 
    mealIngredients: MealIngredients = {}
  ): Promise<MultiDayMealPlan[]> => {
    if (days <= 0) {
      console.log('❌ Érvénytelen napok száma:', days);
      return [];
    }

    console.log(`🍽️ ${days} napos étrend generálás indítása`);
    console.log('📋 Kiválasztott étkezések:', selectedMeals);
    console.log('🎯 Alapanyag szűrők:', mealIngredients);
    
    setIsGenerating(true);
    
    try {
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 2000));
      const newPlan: MultiDayMealPlan[] = [];
      
      for (let day = 1; day <= days; day++) {
        const date = new Date();
        date.setDate(date.getDate() + day - 1);
        const formattedDate = date.toLocaleDateString('hu-HU');
        
        console.log(`📅 ${day}. nap generálása (${formattedDate})`);
        
        const dayPlan: MultiDayMealPlan = {
          day,
          date: formattedDate,
          meals: {}
        };
        
        // Generate recipes for selected meal types only
        for (const mealType of selectedMeals) {
          console.log(`🔍 ${mealType} recept keresése...`);
          
          const mealSpecificIngredients = mealIngredients[mealType] || [];
          let foundRecipes = await getRecipesByMealType(mealType);
          
          if (mealSpecificIngredients.length > 0) {
            const ingredientNames = mealSpecificIngredients.map(ing => ing.ingredient);
            foundRecipes = await filterRecipesByMultipleIngredients(foundRecipes, ingredientNames);
          }
          
          if (foundRecipes.length > 0) {
            const randomIndex = Math.floor(Math.random() * foundRecipes.length);
            const selectedSupabaseRecipe = foundRecipes[randomIndex];
            const standardRecipe = convertToStandardRecipe(selectedSupabaseRecipe);
            dayPlan.meals[mealType] = standardRecipe;
            
            console.log(`✅ ${mealType}: "${standardRecipe.név}" kiválasztva`);
          } else {
            dayPlan.meals[mealType] = null;
            console.log(`❌ ${mealType}: Nincs elérhető recept`);
          }
        }
        
        newPlan.push(dayPlan);
      }
      
      await minLoadingTime;
      setMultiDayPlan(newPlan);
      
      console.log(`✅ ${days} napos étrend sikeresen generálva!`);
      console.log('📊 Végeredmény:', newPlan);
      
      return newPlan;
      
    } catch (error) {
      console.error('❌ Hiba a többnapos étrend generálásakor:', error);
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSingleRecipe = async (
    day: number,
    mealType: string,
    ingredients: SelectedIngredient[] = []
  ): Promise<Recipe | null> => {
    console.log(`🔄 Egyetlen recept újragenerálása: ${day}. nap, ${mealType}`);
    
    try {
      let foundRecipes = await getRecipesByMealType(mealType);
      
      // Apply ingredient filtering if ingredients are selected
      if (ingredients.length > 0) {
        const ingredientNames = ingredients.map(ing => ing.ingredient);
        foundRecipes = await filterRecipesByMultipleIngredients(foundRecipes, ingredientNames);
      }
      
      if (foundRecipes.length === 0) {
        return null;
      }
      
      // Get current recipe to avoid duplicating it
      const currentPlan = multiDayPlan.find(plan => plan.day === day);
      const currentRecipe = currentPlan?.meals[mealType];
      
      // Filter out the current recipe if it exists
      const availableRecipes = currentRecipe 
        ? foundRecipes.filter(recipe => {
            const standardRecipe = convertToStandardRecipe(recipe);
            return standardRecipe.név !== currentRecipe.név;
          })
        : foundRecipes;
      
      if (availableRecipes.length === 0) {
        console.log(`❌ ${mealType}: Nincs más elérhető recept`);
        // If no other recipes available, use any recipe (including current one)
        const randomIndex = Math.floor(Math.random() * foundRecipes.length);
        const selectedSupabaseRecipe = foundRecipes[randomIndex];
        const newRecipe = convertToStandardRecipe(selectedSupabaseRecipe);
        
        // Update the plan
        setMultiDayPlan(prevPlan => 
          prevPlan.map(planDay => 
            planDay.day === day 
              ? { ...planDay, meals: { ...planDay.meals, [mealType]: newRecipe } }
              : planDay
          )
        );
        
        console.log(`✅ ${mealType}: "${newRecipe.név}" újragenerálva (ugyanaz maradt)`);
        return newRecipe;
      }
      
      const randomIndex = Math.floor(Math.random() * availableRecipes.length);
      const selectedSupabaseRecipe = availableRecipes[randomIndex];
      const newRecipe = convertToStandardRecipe(selectedSupabaseRecipe);
      
      // Update the specific recipe in the plan
      setMultiDayPlan(prevPlan => 
        prevPlan.map(planDay => 
          planDay.day === day 
            ? { ...planDay, meals: { ...planDay.meals, [mealType]: newRecipe } }
            : planDay
        )
      );
      
      console.log(`✅ ${mealType}: "${newRecipe.név}" újragenerálva`);
      return newRecipe;
      
    } catch (error) {
      console.error('❌ Hiba az egyetlen recept újragenerálásakor:', error);
      return null;
    }
  };

  const clearPlan = () => {
    setMultiDayPlan([]);
    console.log('🗑️ Többnapos étrend törölve');
  };

  return {
    multiDayPlan,
    isGenerating,
    generateMultiDayPlan,
    clearPlan,
    setMultiDayPlan,
    setIsGenerating,
    regenerateSingleRecipe
  };
}
