
import { X } from "lucide-react";
import { Recipe } from "@/types/recipe";
import { RecipeContent } from "./RecipeContent";
import { FullScreenNutritionInfo } from "./FullScreenNutritionInfo";
import { RecipeActions } from "./RecipeActions";

interface RecipeModalProps {
  recipe: Recipe;
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onRating: (rating: number) => void;
  onGenerateSimilar?: () => void;
}

export function RecipeModal({ recipe, user, isOpen, onClose, onRating, onGenerateSimilar }: RecipeModalProps) {
  const handleGenerateSimilarWrapper = () => {
    console.log('🔄 RecipeModal - Generate Similar wrapper called');
    if (onGenerateSimilar) {
      onGenerateSimilar();
    }
    // Close modal after generating similar recipe
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-scale-in">
        <button
          onClick={onClose}
          className="absolute -top-6 sm:-top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-8 sm:h-8" />
        </button>
        
        <div className="bg-gradient-to-br from-indigo-600/90 to-purple-700/90 backdrop-blur-sm rounded-2xl p-3 sm:p-8 text-white shadow-2xl border border-white/20">
          <RecipeContent recipe={recipe} isFullScreen={true} />
          
          <FullScreenNutritionInfo recipe={recipe} />

          <RecipeActions
            recipe={recipe}
            user={user}
            onRegenerate={() => {}}
            onNewRecipe={() => {}}
            onRating={onRating}
            onGenerateSimilar={handleGenerateSimilarWrapper}
            isFullScreen={true}
          />
          
          <div className="text-center mt-4 sm:mt-8">
            <p className="text-white/70 text-xs sm:text-lg">Kattints bárhova a bezáráshoz</p>
          </div>
        </div>
      </div>
    </div>
  );
}
