
import { Recipe } from "@/types/recipe";

interface FullScreenNutritionInfoProps {
  recipe: Recipe;
}

export function FullScreenNutritionInfo({ recipe }: FullScreenNutritionInfoProps) {
  if (!recipe.elkészítésiIdő && !recipe.fehérje && !recipe.szénhidrát && !recipe.zsír) {
    return null;
  }

  return (
    <div className="mb-6 sm:mb-8">
      <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">📊 Tápértékek</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        {recipe.elkészítésiIdő && (
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-3 sm:p-6 text-center border border-blue-300/30">
            <div className="text-xl sm:text-3xl mb-2 sm:mb-3">⏱️</div>
            <div className="text-white font-semibold text-xs sm:text-lg leading-tight">{recipe.elkészítésiIdő}</div>
          </div>
        )}
        {recipe.fehérje && (
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-xl p-3 sm:p-6 text-center border border-red-300/30">
            <div className="text-xl sm:text-3xl mb-2 sm:mb-3">🥩</div>
            <div className="text-white font-semibold text-xs sm:text-lg leading-tight">{recipe.fehérje}g<br className="sm:hidden" /> fehérje</div>
          </div>
        )}
        {recipe.szénhidrát && (
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-xl p-3 sm:p-6 text-center border border-yellow-300/30">
            <div className="text-xl sm:text-3xl mb-2 sm:mb-3">🍞</div>
            <div className="text-white font-semibold text-xs sm:text-lg leading-tight">{recipe.szénhidrát}g<br className="sm:hidden" /> szénhidrát</div>
          </div>
        )}
        {recipe.zsír && (
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-xl p-3 sm:p-6 text-center border border-green-300/30">
            <div className="text-xl sm:text-3xl mb-2 sm:mb-3">🥑</div>
            <div className="text-white font-semibold text-xs sm:text-lg leading-tight">{recipe.zsír}g<br className="sm:hidden" /> zsír</div>
          </div>
        )}
      </div>
    </div>
  );
}
