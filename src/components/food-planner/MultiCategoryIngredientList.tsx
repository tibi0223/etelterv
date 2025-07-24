
import { Button } from "@/components/ui/button";
import { Heart, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortIngredientsByPreference } from "@/services/ingredientSorting";

interface MultiCategoryIngredientListProps {
  selectedCategory: string | null;
  getFilteredIngredients: (category: string) => string[];
  getFavoriteForIngredient: (ingredient: string, category: string) => boolean;
  getPreferenceForIngredient?: (ingredient: string, category: string) => 'like' | 'dislike' | 'neutral';
  onAddSelectedIngredient: (ingredient: string) => void;
  isIngredientSelected: (ingredient: string) => boolean;
}

export function MultiCategoryIngredientList({
  selectedCategory,
  getFilteredIngredients,
  getFavoriteForIngredient,
  getPreferenceForIngredient,
  onAddSelectedIngredient,
  isIngredientSelected
}: MultiCategoryIngredientListProps) {
  if (!selectedCategory) return null;

  const getSortedIngredients = (category: string) => {
    const ingredients = getFilteredIngredients(category);
    
    return sortIngredientsByPreference(
      ingredients,
      (ingredient) => getFavoriteForIngredient(ingredient, category),
      (ingredient) => getPreferenceForIngredient ? getPreferenceForIngredient(ingredient, category) : 'neutral',
      category
    );
  };

  const sortedIngredients = getSortedIngredients(selectedCategory);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white">
        {selectedCategory} alapanyagai
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {sortedIngredients.map(ingredient => {
          const isFavorite = getFavoriteForIngredient(ingredient, selectedCategory);
          const preference = getPreferenceForIngredient ? getPreferenceForIngredient(ingredient, selectedCategory) : 'neutral';
          const isSelected = isIngredientSelected(ingredient);
          
          let buttonClasses = cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative border-2 min-h-[60px] flex items-center justify-center"
          );

          if (isSelected) {
            buttonClasses = cn(buttonClasses, "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg border-green-400 transform scale-105");
          } else if (isFavorite) {
            buttonClasses = cn(buttonClasses, "bg-gradient-to-r from-pink-500/80 to-rose-500/80 text-white hover:from-pink-600/90 hover:to-rose-600/90 shadow-md border-pink-400");
          } else if (preference === 'like') {
            buttonClasses = cn(buttonClasses, "bg-gradient-to-r from-green-500/60 to-emerald-500/60 text-white hover:from-green-600/80 hover:to-emerald-600/80 border-green-400");
          } else {
            buttonClasses = cn(buttonClasses, "bg-white/10 text-white hover:bg-white/20 border-white/20 hover:border-white/40");
          }

          return (
            <button
              key={ingredient}
              onClick={() => onAddSelectedIngredient(ingredient)}
              className={buttonClasses}
            >
              {isSelected && (
                <Check className="absolute top-1 right-1 w-4 h-4 text-white bg-green-600 rounded-full p-0.5" />
              )}
              {isFavorite && !isSelected && (
                <Heart className="absolute top-1 right-1 w-4 h-4 text-white fill-white drop-shadow-sm" />
              )}
              <span className="text-center">{ingredient}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
