
import { UnifiedMealTypeSelector } from "./shared/UnifiedMealTypeSelector";

interface MealTypeCardSelectorProps {
  selectedMeals: string[];
  onMealToggle: (mealKey: string) => void;
  getRecipeCount: (mealType: string) => number;
}

export function MealTypeCardSelector({ 
  selectedMeals, 
  onMealToggle, 
  getRecipeCount
}: MealTypeCardSelectorProps) {
  return (
    <div className="mb-8">
      <UnifiedMealTypeSelector
        selectedMeals={selectedMeals}
        onMealToggle={onMealToggle}
        getRecipeCount={getRecipeCount}
        title="Válaszd ki az étkezéseket"
        subtitle="Kattints az étkezésekre a kiválasztáshoz"
        mode="multiple"
      />
    </div>
  );
}
