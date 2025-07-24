import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock, RotateCcw, Trash2 } from "lucide-react";
import { Recipe } from "@/types/recipe";
import { RecipeContent } from "./RecipeContent";
import { RecipeModal } from "./RecipeModal";
import { LoadingChef } from "@/components/ui/LoadingChef";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useMultiDayPlanGeneration } from "@/hooks/useMultiDayPlanGeneration";
import { SharedMealTypeSelector } from "./shared/SharedMealTypeSelector";
import { SharedIngredientSelector } from "./shared/SharedIngredientSelector";
import { SharedGenerationButton } from "./shared/SharedGenerationButton";
import { DayCountSelector } from "./DayCountSelector";
import { useToast } from "@/hooks/use-toast";

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

interface MultiDayMealPlanGeneratorProps {
  user: any;
}

export function MultiDayMealPlanGenerator({ user }: MultiDayMealPlanGeneratorProps) {
  const [selectedDays, setSelectedDays] = useState(3);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [showIngredientSelection, setShowIngredientSelection] = useState(false);
  const [currentMealIngredients, setCurrentMealIngredients] = useState<MealIngredients>({});
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRecipeContext, setCurrentRecipeContext] = useState<{day: number, mealType: string} | null>(null);
  
  const { toast } = useToast();
  
  // Add ref for the summary section - MOVED TO TOP
  const summaryRef = useRef<HTMLDivElement>(null);
  
  const {
    categories,
    getRecipesByMealType,
    getFilteredIngredients,
    getFavoriteForIngredient,
    convertToStandardRecipe,
    loading: dataLoading,
    userPreferences,
    saveRating
  } = useSupabaseData(user?.id);

  const {
    multiDayPlan,
    isGenerating,
    generateMultiDayPlan,
    clearPlan,
    setMultiDayPlan,
    setIsGenerating,
    regenerateSingleRecipe
  } = useMultiDayPlanGeneration({
    getRecipesByMealType,
    convertToStandardRecipe
  });

  // Auto-scroll effect - MOVED TO TOP
  useEffect(() => {
    if (multiDayPlan.length > 0 && !isGenerating && summaryRef.current) {
      // Small delay to ensure the content is rendered
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 300);
    }
  }, [multiDayPlan.length, isGenerating]);

  // Define meal order for consistent display
  const mealOrder = ['reggeli', 'tízórai', 'ebéd', 'uzsonna', 'vacsora'];

  const handleMealToggle = (mealKey: string) => {
    setSelectedMeals(prev => {
      const newSelectedMeals = prev.includes(mealKey) 
        ? prev.filter(m => m !== mealKey)
        : [...prev, mealKey];
      
      setShowIngredientSelection(newSelectedMeals.length > 0);
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

  const getPreferenceForIngredient = (ingredient: string, category: string): 'like' | 'dislike' | 'neutral' => {
    const preference = userPreferences.find(pref => 
      pref.ingredient.toLowerCase() === ingredient.toLowerCase() &&
      pref.category.toLowerCase() === category.toLowerCase()
    );
    return preference ? preference.preference : 'neutral';
  };

  const handleGenerateWithIngredients = async () => {
    console.log(`🎯 ${selectedDays} napos étrend generálás alapanyagokkal:`, currentMealIngredients);
    
    if (selectedMeals.length === 0) {
      return;
    }

    // Don't clear ingredients - keep them persistent
    await generateMultiDayPlan(selectedDays, selectedMeals, currentMealIngredients);
  };

  const handleRecipeClick = (recipe: Recipe, day: number, mealType: string) => {
    console.log('🔍 Recept megnyitása modalban:', recipe.név);
    setSelectedRecipe(recipe);
    setCurrentRecipeContext({ day, mealType });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(null);
    setCurrentRecipeContext(null);
  };

  const handleRating = async (rating: number) => {
    if (!selectedRecipe || !user?.id) {
      toast({
        title: "Hiba",
        description: "Be kell jelentkezni az értékeléshez.",
        variant: "destructive"
      });
      return;
    }

    const success = await saveRating(selectedRecipe.név, rating);
    
    if (success) {
      toast({
        title: "Köszönjük az értékelést!",
        description: `${rating}/5 csillag mentve az adatbázisba.`,
      });
    } else {
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni az értékelést.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateSimilar = async () => {
    if (!currentRecipeContext) return;
    
    console.log('🔄 Hasonló recept generálása:', currentRecipeContext);
    
    const mealSpecificIngredients = currentMealIngredients[currentRecipeContext.mealType] || [];
    const newRecipe = await regenerateSingleRecipe(
      currentRecipeContext.day,
      currentRecipeContext.mealType,
      mealSpecificIngredients
    );
    
    if (newRecipe) {
      toast({
        title: "Új recept generálva!",
        description: `${newRecipe.név} receptet generáltunk a ${currentRecipeContext.mealType} helyére.`,
      });
      handleCloseModal();
    } else {
      toast({
        title: "Hiba",
        description: "Nem sikerült új receptet generálni.",
        variant: "destructive"
      });
    }
  };

  const getMealTypeDisplayName = (mealType: string) => {
    switch (mealType) {
      case 'reggeli': return '🌅 Reggeli';
      case 'tízórai': return '☕ Tízórai';
      case 'ebéd': return '🍽️ Ebéd';
      case 'uzsonna': return '🥨 Uzsonna';
      case 'vacsora': return '🌙 Vacsora';
      default: return mealType;
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingChef />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <LoadingChef />
          <p className="text-white text-lg mt-4">
            {selectedDays} napos étrend generálása...
          </p>
          <p className="text-white/70 text-sm mt-2">
            Receptek kiválasztása preferenciáid alapján
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Day Count Selector */}
      <DayCountSelector
        selectedDays={selectedDays}
        onDaysChange={setSelectedDays}
      />

      {/* Shared Meal Type Selector */}
      <SharedMealTypeSelector
        selectedMeals={selectedMeals}
        onMealToggle={handleMealToggle}
        getRecipeCount={getRecipeCount}
        title="Válaszd ki az étkezéseket"
        subtitle="Kattints az étkezésekre a kiválasztáshoz"
      />

      {/* Shared Ingredient Selector - Keep ingredients persistent */}
      <SharedIngredientSelector
        selectedMeals={selectedMeals}
        getFavoriteForIngredient={getFavoriteForIngredient}
        getPreferenceForIngredient={getPreferenceForIngredient}
        onMealIngredientsChange={handleMealIngredientsChange}
        initialMealIngredients={currentMealIngredients}
        showIngredientSelection={showIngredientSelection}
        title="Alapanyag szűrés (opcionális) - ÚJ rendszer"
      />

      {/* Shared Generation Button */}
      <SharedGenerationButton
        selectedMeals={selectedMeals}
        selectedIngredients={Object.values(currentMealIngredients).flat()}
        isGenerating={isGenerating}
        onGenerate={handleGenerateWithIngredients}
        buttonText={`${selectedDays} napos étrend generálása`}
        icon="calendar"
      />

      {/* Action Buttons */}
      {multiDayPlan.length > 0 && (
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleGenerateWithIngredients}
            className="bg-gradient-to-r from-blue-600/80 to-cyan-600/80 hover:from-blue-700/90 hover:to-cyan-700/90 backdrop-blur-sm border border-blue-300/20 text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Újragenerálás
          </Button>

          <Button
            onClick={clearPlan}
            variant="outline"
            className="bg-red-600/20 border-red-400/50 text-red-200 hover:bg-red-600/30 hover:text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Törlés
          </Button>
        </div>
      )}

      {/* Generated Meal Plan */}
      {multiDayPlan.length > 0 && (
        <div className="space-y-6" ref={summaryRef}>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              🍽️ {multiDayPlan.length} napos étrendterv
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Preferenciáid alapján összeállított receptek
            </p>
          </div>
          
          {multiDayPlan.map((dayPlan) => (
            <Card key={dayPlan.day} className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-400" />
                  {dayPlan.day}. nap
                  <Badge variant="secondary" className="bg-white/20 text-white/90 ml-2">
                    {dayPlan.date}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`grid grid-cols-1 gap-6 ${
                  selectedMeals.length === 1 ? 'md:grid-cols-1' :
                  selectedMeals.length === 2 ? 'md:grid-cols-2' :
                  selectedMeals.length === 3 ? 'md:grid-cols-3' :
                  selectedMeals.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
                  'md:grid-cols-2 lg:grid-cols-5'
                }`}>
                  {mealOrder.filter(mealType => selectedMeals.includes(mealType)).map((mealType) => {
                    const recipe = dayPlan.meals[mealType];
                    return (
                      <div key={mealType} className="space-y-3">
                        <h3 className="text-lg font-semibold text-white capitalize border-b border-white/20 pb-2">
                          {getMealTypeDisplayName(mealType)}
                        </h3>
                        
                        {recipe ? (
                          <div 
                            className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                            onClick={() => handleRecipeClick(recipe, dayPlan.day, mealType)}
                          >
                            <RecipeContent recipe={recipe} compact />
                          </div>
                        ) : (
                          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center text-white/60">
                            <p className="text-sm">Nincs elérhető recept</p>
                            <p className="text-xs mt-1">Próbáld újragenerálni az étrendet</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Summary Statistics */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10 shadow-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center">
                <h3 className="text-white font-bold text-lg mb-3">📊 Étrend összesítő</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-white/80">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {multiDayPlan.length}
                    </div>
                    <div className="text-sm">nap</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {multiDayPlan.reduce((acc, day) => acc + Object.values(day.meals).filter(recipe => recipe !== null).length, 0)}
                    </div>
                    <div className="text-sm">recept</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {multiDayPlan.length * selectedMeals.length}
                    </div>
                    <div className="text-sm">étkezés</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {selectedMeals.length > 0 ? Math.round((multiDayPlan.reduce((acc, day) => acc + Object.values(day.meals).filter(recipe => recipe !== null).length, 0) / (multiDayPlan.length * selectedMeals.length)) * 100) : 0}%
                    </div>
                    <div className="text-sm">lefedettség</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          user={user}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onRating={handleRating}
          onGenerateSimilar={handleGenerateSimilar}
        />
      )}
    </div>
  );
}
