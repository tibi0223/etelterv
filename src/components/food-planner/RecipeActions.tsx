
import { StarRating } from "./StarRating";
import { FavoriteButton } from "./FavoriteButton";
import { Recipe } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface RecipeActionsProps {
  recipe: Recipe;
  user: any;
  onRegenerate: () => void;
  onNewRecipe: () => void;
  onRating: (rating: number) => void;
  onGenerateSimilar?: () => void;
  isFullScreen?: boolean;
  showButtons?: boolean;
}

export function RecipeActions({ 
  recipe, 
  user, 
  onRegenerate, 
  onNewRecipe, 
  onRating, 
  onGenerateSimilar,
  isFullScreen = false,
  showButtons = true
}: RecipeActionsProps) {
  const titleClass = isFullScreen
    ? "text-base sm:text-xl font-bold text-white mb-3 sm:mb-4"
    : "text-sm sm:text-base font-bold text-white mb-2 sm:mb-3";

  const handleGenerateSimilarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Generate Similar button clicked - preventing page reload');
    if (onGenerateSimilar) {
      onGenerateSimilar();
    }
  };

  return (
    <div className={`${isFullScreen ? 'text-center pt-3 sm:pt-4 border-t border-white/20' : 'mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20'}`}>
      <div className="text-center mb-2 sm:mb-3">
        <h3 className={titleClass}>⭐ Értékeld a receptet:</h3>
        <StarRating 
          recipeName={recipe.név} 
          onRate={onRating}
        />
      </div>

      {showButtons && (
        <div className="flex justify-center gap-2 mt-2 sm:mt-3">
          <FavoriteButton user={user} recipe={recipe} />
          
          <Button
            type="button"
            onClick={handleGenerateSimilarClick}
            className="bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-700/90 hover:to-emerald-700/90 backdrop-blur-sm border border-green-300/20 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Hasonló generálása
          </Button>
        </div>
      )}
    </div>
  );
}
