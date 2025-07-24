
import { UnifiedMealTypeSelector } from "./UnifiedMealTypeSelector";

interface SharedMealTypeSelectorProps {
  selectedMeals: string[];
  onMealToggle: (mealKey: string) => void;
  getRecipeCount: (mealType: string) => number;
  title?: string;
  subtitle?: string;
}

export function SharedMealTypeSelector({ 
  selectedMeals, 
  onMealToggle, 
  getRecipeCount,
  title = "Válaszd ki az étkezéseket",
  subtitle = "Kattints az étkezésekre a kiválasztáshoz"
}: SharedMealTypeSelectorProps) {
  return (
    <UnifiedMealTypeSelector
      selectedMeals={selectedMeals}
      onMealToggle={onMealToggle}
      getRecipeCount={getRecipeCount}
      title={title}
      subtitle={subtitle}
      mode="multiple"
    />
  );
}
