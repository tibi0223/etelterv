
import { useState, useEffect } from "react";
import { MealTypeSelector } from "./MealTypeSelector";
import { SharedIngredientSelector } from "./shared/SharedIngredientSelector";
import { RecipeDisplay } from "./RecipeDisplay";
import { MultiDayMealPlanGenerator } from "./MultiDayMealPlanGenerator";
import { DailyMealPlanner } from "./DailyMealPlanner";
import { FunctionSelector } from "./FunctionSelector";
import { Recipe } from "@/types/recipe";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { LoadingChef } from "@/components/ui/LoadingChef";
import { filterRecipesByMultipleIngredients } from "@/services/recipeFilters";
import { MacroScalerApp } from "./MacroScalerApp";
import { MultiDayMacroScaler } from "./MultiDayMacroScaler";

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

interface SingleRecipeAppProps {
  user: any;
  onToggleDailyPlanner: () => void;
}

export function SingleRecipeApp({ user, onToggleDailyPlanner }: SingleRecipeAppProps) {
  const [selectedMealType, setSelectedMealType] = useState("");
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'daily' | 'multi' | 'macro' | 'multi-day-macro'>('single');
  const [showIngredientSelection, setShowIngredientSelection] = useState(false);
  const [mealIngredients, setMealIngredients] = useState<MealIngredients>({});
  const [lastSearchParams, setLastSearchParams] = useState<{
    category: string;
    ingredient: string;
    mealType: string;
  }>({ category: "", ingredient: "", mealType: "" });
  
  const { 
    categories, 
    mealTypes, 
    loading: dataLoading, 
    getRecipesByMealType,
    getRecipesByCategory,
    getRandomRecipe,
    getFilteredIngredients,
    convertToStandardRecipe,
    getFavoriteForIngredient,
    getPreferenceForIngredient,
    refreshFavorites,
    recipes
  } = useSupabaseData(user.id);

  // Kedvencek újratöltése amikor a komponens mountálódik
  useEffect(() => {
    if (user?.id) {
      refreshFavorites();
    }
  }, [user?.id, refreshFavorites]);

  // AUTOMATIKUS receptgenerálás amikor meal type változik
  useEffect(() => {
    if (selectedMealType && !showIngredientSelection) {
      handleAutoGenerateRecipe();
    }
  }, [selectedMealType]);

  const handleAutoGenerateRecipe = async () => {
    if (!selectedMealType) return;
    
    setIsLoading(true);
    setCurrentRecipe(null);
    
    try {
      const foundRecipes = await getRecipesByMealType(selectedMealType);

      if (foundRecipes.length > 0) {
        const randomIndex = Math.floor(Math.random() * foundRecipes.length);
        const selectedSupabaseRecipe = foundRecipes[randomIndex];
        const standardRecipe = convertToStandardRecipe(selectedSupabaseRecipe);
        
        setCurrentRecipe(standardRecipe);
        setLastSearchParams({ category: "", ingredient: "", mealType: selectedMealType });
      }

    } catch (error) {
      console.error('❌ Hiba az automatikus recept generálásakor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMultipleCategoryRecipes = async (mealIngredients: MealIngredients) => {
    if (!selectedMealType) return;

    const selectedIngredients = mealIngredients[selectedMealType] || [];
    if (selectedIngredients.length === 0) return;

    setIsLoading(true);
    setCurrentRecipe(null);
    
    const ingredientsText = selectedIngredients.map(ing => `${ing.ingredient} (${ing.category})`).join(", ");
    setLastSearchParams({ category: "Több kategória", ingredient: ingredientsText, mealType: selectedMealType });

    try {
      // 1. Lépés: Lekérjük az étkezési típusnak megfelelő recepteket
      const mealTypeRecipes = await getRecipesByMealType(selectedMealType);
      
      if (mealTypeRecipes.length === 0) {
        return;
      }
      
      // 2. Lépés: Szűrjük a recepteket az alapanyagok alapján
      const ingredientNames = selectedIngredients.map(ing => ing.ingredient);
      const validRecipes = await filterRecipesByMultipleIngredients(mealTypeRecipes, ingredientNames);

      if (validRecipes.length > 0) {
        const randomIndex = Math.floor(Math.random() * validRecipes.length);
        const selectedSupabaseRecipe = validRecipes[randomIndex];
        const standardRecipe = convertToStandardRecipe(selectedSupabaseRecipe);
        
        setCurrentRecipe(standardRecipe);
      }

    } catch (error) {
      console.error('❌ Hiba a több kategóriás recept kérésekor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSimilar = async () => {
    console.log('🔄 Hasonló recept generálása ugyanazokkal a paraméterekkel...');
    
    if (showIngredientSelection && Object.keys(mealIngredients).length > 0) {
      // Ha van több kategóriás keresés, használjuk azt
      await getMultipleCategoryRecipes(mealIngredients);
    } else {
      // Egyszerű újragenerálás
      await regenerateRecipe();
    }
  };

  const regenerateRecipe = async () => {
    if (selectedMealType) {
      setIsLoading(true);
      setCurrentRecipe(null);
      
      try {
        let foundRecipes = [];
        
        if (lastSearchParams.category && lastSearchParams.ingredient) {
          foundRecipes = await getRecipesByCategory(lastSearchParams.category, lastSearchParams.ingredient, selectedMealType);
        } else if (lastSearchParams.category) {
          foundRecipes = await getRecipesByCategory(lastSearchParams.category, undefined, selectedMealType);
        } else {
          foundRecipes = await getRecipesByMealType(selectedMealType);
        }

        if (foundRecipes.length > 0) {
          const randomIndex = Math.floor(Math.random() * foundRecipes.length);
          const selectedSupabaseRecipe = foundRecipes[randomIndex];
          const standardRecipe = convertToStandardRecipe(selectedSupabaseRecipe);
          
          setCurrentRecipe(standardRecipe);
        }
      } catch (error) {
        console.error('❌ Hiba az újrageneráláskor:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resetForm = () => {
    setSelectedMealType("");
    setCurrentRecipe(null);
    setViewMode('single');
    setShowIngredientSelection(false);
    setMealIngredients({});
    setLastSearchParams({ category: "", ingredient: "", mealType: "" });
  };

  if (dataLoading) {
    return <LoadingChef />;
  }

  const handleMealTypeSelect = (mealType: string) => {
    setSelectedMealType(mealType);
    setShowIngredientSelection(false);
    setCurrentRecipe(null);
    setMealIngredients({});
  };

  const handleGetRandomRecipe = async () => {
    if (selectedMealType) {
      setShowIngredientSelection(false);
      await handleAutoGenerateRecipe();
    }
  };

  const handleShowIngredientSelection = () => {
    setShowIngredientSelection(true);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'multi':
        return <MultiDayMealPlanGenerator user={user} />;
      case 'daily':
        return (
          <DailyMealPlanner
            user={user}
            onToggleSingleRecipe={() => setViewMode('single')}
          />
        );
      case 'macro':
        return (
          <MacroScalerApp
            user={user}
            onBack={() => setViewMode('single')}
          />
        );
      case 'multi-day-macro':
        return (
          <MultiDayMacroScaler
            user={user}
          />
        );
      default:
        return (
          <>
            <MealTypeSelector
              selectedMealType={selectedMealType}
              onSelectMealType={handleMealTypeSelect}
              onGetRandomRecipe={handleGetRandomRecipe}
              onShowMultiCategorySelection={handleShowIngredientSelection}
            />

            {selectedMealType && showIngredientSelection && (
              <SharedIngredientSelector
                selectedMeals={[selectedMealType]}
                getFavoriteForIngredient={(ingredient: string, category?: string) => {
                  return getFavoriteForIngredient(ingredient, category || '');
                }}
                getPreferenceForIngredient={(ingredient: string, category?: string) => {
                  return getPreferenceForIngredient(ingredient, category || '');
                }}
                onMealIngredientsChange={setMealIngredients}
                initialMealIngredients={mealIngredients}
                title="Alapanyag szűrés (opcionális) - ÚJ rendszer"
              />
            )}

            {selectedMealType && showIngredientSelection && Object.keys(mealIngredients).length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => getMultipleCategoryRecipes(mealIngredients)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  🎯 Recept generálása kiválasztott alapanyagokkal
                </button>
              </div>
            )}

            <RecipeDisplay
              recipe={currentRecipe}
              isLoading={isLoading}
              onRegenerate={regenerateRecipe}
              onNewRecipe={resetForm}
              onGenerateSimilar={handleGenerateSimilar}
              user={user}
            />
          </>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6">
      {/* Compact Hero Section */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2 sm:mb-3">🍽️ Ételtervező</h1>
          <p className="text-white/80 text-sm sm:text-lg md:text-xl px-2 leading-relaxed">
            Válassz funkciót és kezdd el az ételek tervezését!
          </p>
        </div>
      </div>

      {/* New Function Selector */}
      <FunctionSelector
        selectedFunction={viewMode}
        onFunctionSelect={setViewMode}
      />

      {renderContent()}
    </div>
  );
}
