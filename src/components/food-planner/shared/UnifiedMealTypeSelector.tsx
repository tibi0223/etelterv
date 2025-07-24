
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat } from "lucide-react";

interface UnifiedMealTypeSelectorProps {
  selectedMeals?: string[];
  selectedMealType?: string;
  onMealToggle?: (mealKey: string) => void;
  onSelectMealType?: (mealType: string) => void;
  getRecipeCount: (mealType: string) => number;
  title?: string;
  subtitle?: string;
  mode?: 'single' | 'multiple';
}

export function UnifiedMealTypeSelector({ 
  selectedMeals = [],
  selectedMealType = "",
  onMealToggle,
  onSelectMealType,
  getRecipeCount,
  title = "Válaszd ki az étkezéseket",
  subtitle = "Kattints az étkezésekre a kiválasztáshoz",
  mode = 'multiple'
}: UnifiedMealTypeSelectorProps) {
  const mealTypes = [
    { key: 'reggeli', name: '🌅 Reggeli', icon: '🌅' },
    { key: 'tízórai', name: '☕ Tízórai', icon: '☕' },
    { key: 'ebéd', name: '🍽️ Ebéd', icon: '🍽️' },
    { key: 'uzsonna', name: '🥨 Uzsonna', icon: '🥨' },
    { key: 'vacsora', name: '🌙 Vacsora', icon: '🌙' }
  ];

  const handleClick = (mealKey: string) => {
    if (mode === 'single' && onSelectMealType) {
      onSelectMealType(mealKey);
    } else if (mode === 'multiple' && onMealToggle) {
      onMealToggle(mealKey);
    }
  };

  const isSelected = (mealKey: string) => {
    if (mode === 'single') {
      return selectedMealType === mealKey;
    }
    return selectedMeals.includes(mealKey);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
      <CardContent className="p-4 sm:p-6">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <ChefHat className="w-6 h-6 text-purple-400" />
            {title}
          </h2>
          <p className="text-white/70 text-sm sm:text-base">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {mealTypes.map((meal) => {
            const selected = isSelected(meal.key);
            const recipeCount = getRecipeCount(meal.key);
            
            return (
              <div
                key={meal.key}
                onClick={() => handleClick(meal.key)}
                className={`relative p-4 sm:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  selected
                    ? 'bg-gradient-to-br from-green-600/40 to-emerald-600/40 border-green-400/60 shadow-2xl shadow-green-500/20'
                    : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{meal.icon}</div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">
                    {meal.name}
                  </h3>
                  <Badge 
                    variant="secondary" 
                    className="bg-black/20 text-white/90 text-xs sm:text-sm"
                  >
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {recipeCount} recept
                  </Badge>
                </div>
                
                {selected && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
