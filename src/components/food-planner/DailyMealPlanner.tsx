import { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { MealTypeCardSelector } from "./MealTypeCardSelector";
import { MealPlanGenerationButton } from "./MealPlanGenerationButton";
import { DailyMealHeader } from "./DailyMealHeader";
import { GeneratedMealPlan } from "./GeneratedMealPlan";
import { LoadingChef } from "@/components/ui/LoadingChef";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useMealPlanGeneration } from "@/hooks/useMealPlanGeneration";
import { filterRecipesByMultipleIngredients } from '@/services/recipeFilters';
import { SharedIngredientSelector } from "./shared/SharedIngredientSelector";

interface DailyMealPlannerProps {
  user: any;
  onToggleSingleRecipe: () => void;
}

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface MealIngredients {
  [mealType: string]: SelectedIngredient[];
}

export function DailyMealPlanner({ user, onToggleSingleRecipe }: DailyMealPlannerProps) {
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [showIngredientSelection, setShowIngredientSelection] = useState(false);
  const [currentMealIngredients, setCurrentMealIngredients] = useState<MealIngredients>({});
  // FIXED: Add state to preserve ingredients after generation
  const [preservedMealIngredients, setPreservedMealIngredients] = useState<MealIngredients>({});

  const {
    categories,
    getRecipesByMealType,
    getFilteredIngredients,
    loading,
    getFavoriteForIngredient,
    convertToStandardRecipe,
    userPreferences
  } = useSupabaseData(user?.id);

  const {
    generatedRecipes,
    isGenerating,
    handleGetMultipleCategoryRecipes,
    setGeneratedRecipes,
    setIsGenerating
  } = useMealPlanGeneration({
    selectedMeals,
    getRecipesByMealType,
    convertToStandardRecipe
  });

  // FIXED: Meal toggle - only state update, no automatic scrolling
  const handleMealToggle = (mealKey: string) => {
    setSelectedMeals(prev => {
      const newSelectedMeals = prev.includes(mealKey) 
        ? prev.filter(m => m !== mealKey)
        : [...prev, mealKey];
      
      // Show ingredient filter if there are selected meals - NO AUTO SCROLL
      const willShowIngredients = newSelectedMeals.length > 0;
      setShowIngredientSelection(willShowIngredients);
      
      return newSelectedMeals;
    });
  };

  const getRecipeCount = (mealType: string) => {
    // Simplified for now - will load recipes when needed
    return 0;
  };

  const handleMealIngredientsChange = (mealIngredients: MealIngredients) => {
    setCurrentMealIngredients(mealIngredients);
  };

  // Manual meal plan generation - only on button press
  const handleGenerateMealPlan = async () => {
    if (selectedMeals.length === 0) {
      return;
    }
    
    // FIXED: Preserve ingredients before generation
    setPreservedMealIngredients({ ...currentMealIngredients });
    
    // Scroll to generation button first
    setTimeout(() => {
      const generationButton = document.querySelector('.meal-plan-generation-button');
      if (generationButton) {
        generationButton.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
    
    await handleGetMultipleCategoryRecipes(currentMealIngredients);
  };

  // Handle similar recipe generation for a specific meal type
  const handleGenerateSimilar = async (recipe: any, mealType: string) => {
    console.log('🔄 Hasonló recept generálása:', recipe.név, 'típus:', mealType);
    
    // Create a new meal ingredients object with only the specific meal type
    const singleMealIngredients: MealIngredients = {};
    
    // FIXED: Use preserved ingredients if available, otherwise use current
    const ingredientsToUse = Object.keys(preservedMealIngredients).length > 0 ? preservedMealIngredients : currentMealIngredients;
    
    if (ingredientsToUse[mealType]) {
      singleMealIngredients[mealType] = ingredientsToUse[mealType];
    } else {
      // Otherwise, set empty array to get any recipe from this meal type
      singleMealIngredients[mealType] = [];
    }
    
    // Generate similar recipe for only this meal type
    await handleGetSingleMealTypeRecipe(mealType, singleMealIngredients);
  };

  // New function to generate recipe for a single meal type while preserving others
  const handleGetSingleMealTypeRecipe = async (targetMealType: string, mealIngredients: MealIngredients) => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    
    try {
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get current generated recipes
      const currentRecipes = [...generatedRecipes];
      
      // Generate new recipe for the target meal type
      const mealSpecificIngredients = mealIngredients[targetMealType] || [];
      const mealTypeRecipes = await getRecipesByMealType(targetMealType);

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
          mealType: targetMealType,
          category: mealSpecificIngredients.length > 0 ? mealSpecificIngredients.map(ing => ing.category).join(", ") : "Minden kategória",
          ingredient: mealSpecificIngredients.length > 0 ? mealSpecificIngredients.map(ing => ing.ingredient).join(", ") : "Minden alapanyag"
        };
        
        // Replace the recipe for this meal type in the current recipes array
        const updatedRecipes = currentRecipes.map(recipe => 
          recipe.mealType === targetMealType ? recipeWithMeta : recipe
        );
        
        // If no existing recipe for this meal type, add it
        if (!currentRecipes.some(recipe => recipe.mealType === targetMealType)) {
          updatedRecipes.push(recipeWithMeta);
        }

        await minLoadingTime;
        setGeneratedRecipes(updatedRecipes);
      }
      
    } catch (error) {
      console.error('❌ Hasonló recept generálási hiba:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Preference search function
  const getPreferenceForIngredient = (ingredient: string, category: string): 'like' | 'dislike' | 'neutral' => {
    const preference = userPreferences.find(pref => 
      pref.ingredient.toLowerCase() === ingredient.toLowerCase() &&
      pref.category.toLowerCase() === category.toLowerCase()
    );
    return preference ? preference.preference : 'neutral';
  };

  // Loading check after hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-3 sm:mb-4 text-purple-500" />
          <p className="text-gray-600 text-sm sm:text-base">Adatok betöltése...</p>
        </div>
      </div>
    );
  }

  // Full screen loading during generation
  if (isGenerating) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <LoadingChef />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-8 max-w-6xl mx-auto p-2 sm:p-6">
      <DailyMealHeader onToggleSingleRecipe={onToggleSingleRecipe} />

      <MealTypeCardSelector
        selectedMeals={selectedMeals}
        onMealToggle={handleMealToggle}
        getRecipeCount={getRecipeCount}
      />

      <div className="ingredient-selection-section">
        <SharedIngredientSelector
          selectedMeals={selectedMeals}
          getFavoriteForIngredient={getFavoriteForIngredient}
          getPreferenceForIngredient={getPreferenceForIngredient}
          onMealIngredientsChange={handleMealIngredientsChange}
          initialMealIngredients={preservedMealIngredients}
          showIngredientSelection={showIngredientSelection}
          title="Alapanyag szűrés (opcionális) - ÚJ rendszer"
        />
      </div>

      <div className="meal-plan-generation-button">
        <MealPlanGenerationButton
          selectedMeals={selectedMeals}
          selectedIngredients={Object.values(currentMealIngredients).flat()}
          isGenerating={isGenerating}
          onGenerateMealPlan={handleGenerateMealPlan}
        />
      </div>

      <GeneratedMealPlan 
        generatedRecipes={generatedRecipes} 
        user={user} 
        onGenerateSimilar={handleGenerateSimilar}
      />
    </div>
  );
}
