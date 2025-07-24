
import { Button } from "@/components/ui/button";
import { ChefHat, Calendar, Utensils } from "lucide-react";

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface SharedGenerationButtonProps {
  selectedMeals: string[];
  selectedIngredients: SelectedIngredient[];
  isGenerating: boolean;
  onGenerate: () => void;
  buttonText?: string;
  icon?: 'chef' | 'calendar' | 'utensils';
  disabled?: boolean;
}

export function SharedGenerationButton({
  selectedMeals,
  selectedIngredients,
  isGenerating,
  onGenerate,
  buttonText,
  icon = 'chef',
  disabled = false
}: SharedGenerationButtonProps) {
  const getIcon = () => {
    switch (icon) {
      case 'calendar': return <Calendar className="w-5 h-5 mr-2" />;
      case 'utensils': return <Utensils className="w-5 h-5 mr-2" />;
      default: return <ChefHat className="w-5 h-5 mr-2" />;
    }
  };

  const getDefaultButtonText = () => {
    if (selectedMeals.length === 0) return 'Válassz étkezéseket';
    if (selectedMeals.length === 1) return `${selectedMeals[0]} generálása`;
    return `${selectedMeals.length} étkezés generálása`;
  };

  const finalButtonText = buttonText || getDefaultButtonText();

  if (selectedMeals.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8">
        <p className="text-white/60 text-sm sm:text-base">
          Válassz legalább egy étkezést a generáláshoz
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-4 sm:py-6">
      <div className="mb-3 sm:mb-4">
        <p className="text-white/80 text-sm sm:text-base mb-2">
          Kiválasztott étkezések: <span className="font-semibold">{selectedMeals.join(', ')}</span>
        </p>
        {selectedIngredients.length > 0 && (
          <p className="text-white/60 text-xs sm:text-sm">
            {selectedIngredients.length} alapanyag szűrő aktív
          </p>
        )}
      </div>
      
      <Button
        onClick={onGenerate}
        disabled={isGenerating || disabled}
        className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700/90 hover:to-pink-700/90 backdrop-blur-sm border border-purple-300/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
            Generálás...
          </>
        ) : (
          <>
            {getIcon()}
            {finalButtonText}
          </>
        )}
      </Button>
    </div>
  );
}
