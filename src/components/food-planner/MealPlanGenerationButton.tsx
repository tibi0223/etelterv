
import { Button } from "@/components/ui/button";
import { RefreshCw, Star } from "lucide-react";

interface MealPlanGenerationButtonProps {
  selectedMeals: string[];
  selectedIngredients: any[];
  isGenerating: boolean;
  onGenerateMealPlan: () => Promise<void>;
}

export function MealPlanGenerationButton({
  selectedMeals,
  selectedIngredients,
  isGenerating,
  onGenerateMealPlan
}: MealPlanGenerationButtonProps) {
  // Mindig mutassa a gombot, ha van kiválasztott étkezés
  if (selectedMeals.length === 0) {
    return null;
  }

  const ingredientCount = selectedIngredients?.length || 0;
  const buttonText = ingredientCount > 0 
    ? `Étrend generálása (${selectedMeals.length} étkezés, ${ingredientCount} alapanyag)`
    : `Étrend generálása (${selectedMeals.length} étkezés)`;

  // Rövidebb szöveg mobilon
  const mobileButtonText = ingredientCount > 0 
    ? `Generálás (${selectedMeals.length}+${ingredientCount})`
    : `Generálás (${selectedMeals.length})`;

  console.log('🎯 MealPlanGenerationButton render:', {
    selectedMeals: selectedMeals.length,
    ingredientCount,
    buttonText
  });

  return (
    <div className="text-center px-2 sm:px-0">
      <Button
        onClick={() => {
          console.log('🎯 Étrend generálása gomb megnyomva');
          onGenerateMealPlan();
        }}
        disabled={isGenerating}
        size="lg"
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg transition-all duration-300 text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-3 h-10 sm:h-auto"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
            <span className="sm:hidden">Generálás...</span>
            <span className="hidden sm:inline">Étrend generálása...</span>
          </>
        ) : (
          <>
            <Star className="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5" />
            <span className="sm:hidden">{mobileButtonText}</span>
            <span className="hidden sm:inline">{buttonText}</span>
          </>
        )}
      </Button>
    </div>
  );
}
