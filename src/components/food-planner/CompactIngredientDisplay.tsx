
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Heart } from 'lucide-react';

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface CompactIngredientDisplayProps {
  selectedIngredients: SelectedIngredient[];
  onRemoveIngredient: (ingredient: string, category: string) => void;
  isExpanded: boolean;
}

export function CompactIngredientDisplay({
  selectedIngredients,
  onRemoveIngredient,
  isExpanded
}: CompactIngredientDisplayProps) {
  if (selectedIngredients.length === 0) return null;

  return (
    <div className="space-y-2">
      <span className="text-white/90 text-sm font-medium">
        Kiválasztott alapanyagok ({selectedIngredients.length})
      </span>
      
      <div className={`space-y-2 ${!isExpanded ? 'max-h-20 overflow-hidden' : ''}`}>
        {selectedIngredients.map((item, index) => (
          <div key={index} className="flex flex-wrap gap-1 sm:gap-2">
            <Badge 
              variant="default" 
              className="text-xs bg-blue-500/80 hover:bg-blue-500 flex items-center gap-1"
            >
              <span className="truncate max-w-[120px] sm:max-w-none">
                {item.ingredient} ({item.category})
              </span>
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-200" 
                onClick={() => onRemoveIngredient(item.ingredient, item.category)}
              />
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
