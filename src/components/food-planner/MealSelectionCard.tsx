
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface MealSelectionCardProps {
  mealType: string;
  mealLabel: string;
  emoji: string;
  isSelected: boolean;
  onToggle: (mealKey: string) => void;
  categories: string[];
  getIngredientsByCategory: (category: string) => string[];
  getFavoriteForIngredient?: (ingredient: string, category: string) => boolean;
  onGetRecipe: (mealType: string, category: string, ingredient: string) => Promise<void>;
  onSelectionChange: (mealType: string, category: string, ingredient: string) => void;
  isGenerating: boolean;
  showRecipeButton: boolean;
  hideToggle?: boolean;
}

export function MealSelectionCard({
  mealType,
  mealLabel,
  emoji,
  isSelected,
  onToggle,
  categories,
  getIngredientsByCategory,
  getFavoriteForIngredient,
  onGetRecipe,
  onSelectionChange,
  isGenerating,
  showRecipeButton,
  hideToggle = false
}: MealSelectionCardProps) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");

  const getSortedIngredients = (category: string): string[] => {
    const ingredients = getIngredientsByCategory(category);
    
    if (!getFavoriteForIngredient) {
      return ingredients.sort((a, b) => a.localeCompare(b));
    }

    // Sort ingredients: favorites first, then alphabetically
    return [...ingredients].sort((a, b) => {
      const aIsFavorite = getFavoriteForIngredient(a, category);
      const bIsFavorite = getFavoriteForIngredient(b, category);
      
      // If one is favorite and the other is not, favorite comes first
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      // If both are favorites or both are not favorites, sort alphabetically
      return a.localeCompare(b);
    });
  };

  const availableIngredients = selectedCategory ? getSortedIngredients(selectedCategory) : [];

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedIngredient("");
    onSelectionChange(mealType, category, "");
  };

  const handleIngredientChange = (ingredient: string) => {
    setSelectedIngredient(ingredient);
    onSelectionChange(mealType, selectedCategory, ingredient);
  };

  const handleGetRecipe = async () => {
    if (onGetRecipe) {
      await onGetRecipe(mealType, selectedCategory, selectedIngredient);
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 border-2",
      isSelected 
        ? "bg-gradient-to-br from-violet-500 to-purple-600 border-violet-400 shadow-lg" 
        : "bg-white/10 border-white/20 hover:bg-white/15"
    )}>
      <CardHeader className="pb-3 px-4 py-3">
        <div className="flex items-center gap-3">
          {!hideToggle && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(mealType)}
              className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
            />
          )}
          <div className="text-2xl">{emoji}</div>
          <CardTitle className="text-white text-lg font-bold">{mealLabel}</CardTitle>
        </div>
      </CardHeader>

      {isSelected && (
        <CardContent className="space-y-4 px-4 pb-4">
          <div className="space-y-3">
            <div>
              <label className="text-white/90 text-sm font-medium mb-2 block">
                Kategória (opcionális)
              </label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Válassz kategóriát..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="no-category" className="text-white hover:bg-gray-700">
                    Nincs megadva (random)
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem 
                      key={category} 
                      value={category}
                      className="text-white hover:bg-gray-700"
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && selectedCategory !== "no-category" && (
              <div>
                <label className="text-white/90 text-sm font-medium mb-2 block">
                  Alapanyag (opcionális)
                </label>
                <Select value={selectedIngredient} onValueChange={handleIngredientChange}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Válassz alapanyagot..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 max-h-60 overflow-y-auto">
                    <SelectItem value="no-ingredient" className="text-white hover:bg-gray-700">
                      Nincs megadva (random kategóriában)
                    </SelectItem>
                    {availableIngredients.map((ingredient) => {
                      const isFavorite = getFavoriteForIngredient ? getFavoriteForIngredient(ingredient, selectedCategory) : false;
                      return (
                        <SelectItem 
                          key={ingredient} 
                          value={ingredient}
                          className="text-white hover:bg-gray-700"
                        >
                          <div className="flex items-center gap-2 w-full">
                            {isFavorite && <Heart className="w-3 h-3 text-pink-500 fill-pink-500 flex-shrink-0" />}
                            <span className="flex-1">{ingredient}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {showRecipeButton && (
            <Button
              onClick={handleGetRecipe}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg transition-all duration-300"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Újragenerálás...
                </>
              ) : (
                "🔄 Újragenerálás"
              )}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
