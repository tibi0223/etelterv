
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UnifiedMealTypeSelector } from "./shared/UnifiedMealTypeSelector";

interface MealTypeSelectorProps {
  selectedMealType: string;
  onSelectMealType: (mealType: string) => void;
  onGetRandomRecipe: () => void;
  onShowMultiCategorySelection: () => void;
}

export function MealTypeSelector({
  selectedMealType,
  onSelectMealType,
  onGetRandomRecipe,
  onShowMultiCategorySelection
}: MealTypeSelectorProps) {
  // ÚJ RENDSZER: Recipe count számítás már nem szükséges itt
  const getRecipeCount = (mealType: string) => {
    return 0; // Placeholder - az új rendszerben dinamikusan számolódik
  };

  return (
    <div className="mb-6 sm:mb-8">
      <UnifiedMealTypeSelector
        selectedMealType={selectedMealType}
        onSelectMealType={onSelectMealType}
        getRecipeCount={getRecipeCount}
        title="Válaszd ki az étkezést"
        subtitle="Kattints az étkezésre a kiválasztáshoz"
        mode="single"
      />

      {selectedMealType && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            onClick={onGetRandomRecipe}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            🎲 Véletlenszerű recept
          </Button>
          
          <Button
            onClick={onShowMultiCategorySelection}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            🎯 Szűrés alapanyagok szerint
          </Button>
        </div>
      )}
    </div>
  );
}
