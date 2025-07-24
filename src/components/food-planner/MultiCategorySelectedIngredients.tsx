
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface MultiCategorySelectedIngredientsProps {
  selectedIngredients: SelectedIngredient[];
  onRemoveSelectedIngredient: (index: number) => void;
}

export function MultiCategorySelectedIngredients({
  selectedIngredients,
  onRemoveSelectedIngredient
}: MultiCategorySelectedIngredientsProps) {
  if (selectedIngredients.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-3">Kiválasztott alapanyagok ({selectedIngredients.length})</h3>
      <div className="flex flex-wrap gap-2">
        {selectedIngredients.map((item, index) => (
          <Badge
            key={index}
            className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white border border-purple-400/50 px-3 py-2 text-sm flex items-center gap-2 hover:from-purple-700/90 hover:to-pink-700/90 transition-all duration-300"
          >
            {item.ingredient}
            <span className="text-purple-200 text-xs">({item.category})</span>
            <button
              onClick={() => onRemoveSelectedIngredient(index)}
              className="ml-1 text-white hover:text-red-200 bg-red-500/60 hover:bg-red-500/80 rounded-full p-1 transition-all duration-200 border border-red-400/50"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
