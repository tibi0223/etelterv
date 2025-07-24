
import { Recipe } from "@/types/recipe";

interface NutritionInfoProps {
  recipe: Recipe;
}

export function NutritionInfo({ recipe }: NutritionInfoProps) {
  if (!recipe.elkészítésiIdő && !recipe.fehérje && !recipe.szénhidrát && !recipe.zsír && !recipe.kalória) {
    return null;
  }

  return (
    <div className="mb-3 sm:mb-4">
      <h3 className="text-sm sm:text-base font-bold text-white mb-2 sm:mb-3 text-center">📊 Tápértékek</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {recipe.elkészítésiIdő && (
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center border border-blue-300/30">
            <div className="text-sm sm:text-lg mb-1">⏱️</div>
            <div className="text-white font-semibold text-xs leading-tight">{recipe.elkészítésiIdő}</div>
          </div>
        )}
        {recipe.fehérje && (
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center border border-red-300/30">
            <div className="text-sm sm:text-lg mb-1">🥩</div>
            <div className="text-white font-semibold text-xs leading-tight">{recipe.fehérje}g<br />fehérje</div>
          </div>
        )}
        {recipe.szénhidrát && (
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center border border-yellow-300/30">
            <div className="text-sm sm:text-lg mb-1">🍞</div>
            <div className="text-white font-semibold text-xs leading-tight">{recipe.szénhidrát}g<br />szénhidrát</div>
          </div>
        )}
        {recipe.zsír && (
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center border border-green-300/30">
            <div className="text-sm sm:text-lg mb-1">🥑</div>
            <div className="text-white font-semibold text-xs leading-tight">{recipe.zsír}g<br />zsír</div>
          </div>
        )}
        {recipe.kalória && (
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center border border-purple-300/30">
            <div className="text-sm sm:text-lg mb-1">🔥</div>
            <div className="text-white font-semibold text-xs leading-tight">{recipe.kalória}<br />kalória</div>
          </div>
        )}
      </div>
    </div>
  );
}
