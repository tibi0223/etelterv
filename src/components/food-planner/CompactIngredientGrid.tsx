
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { sortIngredientsByPreference } from '@/services/ingredientSorting';

interface CompactIngredientGridProps {
  selectedCategory: string;
  ingredients: string[];
  getFavoriteForIngredient?: (ingredient: string, category: string) => boolean;
  getPreferenceForIngredient?: (ingredient: string, category: string) => 'like' | 'dislike' | 'neutral';
  onIngredientToggle: (ingredient: string) => void;
  isIngredientSelected: (ingredient: string) => boolean;
  getIngredientButtonClass: (ingredient: string) => string;
}

export function CompactIngredientGrid({
  selectedCategory,
  ingredients,
  getFavoriteForIngredient,
  getPreferenceForIngredient,
  onIngredientToggle,
  isIngredientSelected,
  getIngredientButtonClass
}: CompactIngredientGridProps) {
  if (!selectedCategory) return null;

  const getDisplayedIngredients = () => {
    // Use the ingredients prop directly and apply sorting
    return sortIngredientsByPreference(
      ingredients,
      (ingredient) => getFavoriteForIngredient?.(ingredient, selectedCategory) || false,
      (ingredient) => getPreferenceForIngredient?.(ingredient, selectedCategory) || 'neutral',
      selectedCategory
    );
  };

  const displayedIngredients = getDisplayedIngredients();

  return (
    <div className="space-y-2">
      <span className="text-white/90 text-sm font-medium block">
        Elérhető alapanyagok ({displayedIngredients.length})
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {displayedIngredients.map((ingredient) => {
          const isFavorite = getFavoriteForIngredient?.(ingredient, selectedCategory) || false;
          const isSelected = isIngredientSelected(ingredient);
          
          return (
            <Button
              key={ingredient}
              onClick={() => onIngredientToggle(ingredient)}
              className={`
                text-xs sm:text-sm px-2 py-1 h-auto min-h-[32px] sm:min-h-[36px]
                transition-colors duration-200 truncate relative
                ${getIngredientButtonClass(ingredient)}
              `}
              title={ingredient}
            >
              {isFavorite && !isSelected && (
                <Heart className="absolute top-0.5 right-0.5 w-3 h-3 text-white fill-white" />
              )}
              <span className="truncate leading-tight">
                {ingredient}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
