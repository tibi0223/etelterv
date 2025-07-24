
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactIngredientSelector } from "./CompactIngredientSelector";

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface MealIngredients {
  [mealType: string]: SelectedIngredient[];
}

interface IngredientSelectionSectionProps {
  showIngredientSelection: boolean;
  selectedMeals: string[];
  foodData: any;
  onMealIngredientsChange: (mealIngredients: MealIngredients) => void;
  getFavoriteForIngredient: (ingredient: string) => boolean;
  getPreferenceForIngredient?: (ingredient: string, category: string) => 'like' | 'dislike' | 'neutral';
  // FIXED: Add prop to receive preserved ingredients
  initialMealIngredients?: MealIngredients;
}

const mealTypes = [
  { key: 'reggeli', label: '🌅 Reggeli', emoji: '🌅' },
  { key: 'tízórai', label: '☕ Tízórai', emoji: '☕' },
  { key: 'ebéd', label: '🍽️ Ebéd', emoji: '🍽️' },
  { key: 'uzsonna', label: '🥨 Uzsonna', emoji: '🥨' },
  { key: 'vacsora', label: '🌙 Vacsora', emoji: '🌙' }
];

export function IngredientSelectionSection({
  showIngredientSelection,
  selectedMeals,
  foodData,
  onMealIngredientsChange,
  getFavoriteForIngredient,
  getPreferenceForIngredient,
  initialMealIngredients = {}
}: IngredientSelectionSectionProps) {
  // FIXED: Initialize with preserved ingredients
  const [mealIngredients, setMealIngredients] = useState<MealIngredients>(initialMealIngredients);

  // FIXED: Update state when initialMealIngredients changes
  useEffect(() => {
    if (Object.keys(initialMealIngredients).length > 0) {
      setMealIngredients(initialMealIngredients);
    }
  }, [initialMealIngredients]);

  if (!showIngredientSelection || selectedMeals.length === 0) {
    return null;
  }

  const handleIngredientsChange = (mealType: string, ingredients: SelectedIngredient[]) => {
    const newMealIngredients = {
      ...mealIngredients,
      [mealType]: ingredients
    };
    setMealIngredients(newMealIngredients);
    
    // Csak a state-et frissítjük, automatikus generálás nélkül
    onMealIngredientsChange(newMealIngredients);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10 shadow-xl mx-2 sm:mx-0">
      <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-lg sm:text-xl font-bold text-white">
          🎯 Étkezésenkénti alapanyag szűrő ({selectedMeals.length} étkezés)
        </CardTitle>
        <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
          Válasszon alapanyagokat minden étkezéshez külön-külön. A generálás gombbal indíthatja az étrend készítését.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-3 sm:pb-6">
        {selectedMeals.map((mealKey) => {
          const mealType = mealTypes.find(m => m.key === mealKey);
          if (!mealType) return null;

          return (
            <div key={mealKey} className="bg-white/5 rounded-lg border border-white/10 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <span className="text-xl sm:text-2xl">{mealType.emoji}</span>
                <h3 className="text-base sm:text-lg font-semibold text-white">{mealType.label}</h3>
              </div>
              
              <CompactIngredientSelector
                onIngredientsChange={(ingredients) => handleIngredientsChange(mealKey, ingredients)}
                getFavoriteForIngredient={(ingredient: string, category: string) => 
                  getFavoriteForIngredient(ingredient)
                }
                getPreferenceForIngredient={getPreferenceForIngredient}
                // FIXED: Pass initial ingredients for this meal type
                initialIngredients={mealIngredients[mealKey] || []}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
