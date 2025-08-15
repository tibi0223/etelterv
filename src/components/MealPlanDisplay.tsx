import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Recipe {
  recipe_id: number;
  recipe_name: string;
  base_protein: number;
  base_carbs: number;
  base_fat: number;
  base_calories: number;
  scalability?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients?: Array<{
    name: string;
    original_quantity: number;
    original_unit: string;
    original_protein: number;
    original_carbs: number;
    original_fat: number;
    original_calories: number;
    scaled_quantity?: number;
    scaled_protein?: number;
    scaled_carbs?: number;
    scaled_fat?: number;
    scaled_calories?: number;
  }>;
}

interface ScaledMacros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface Meal {
  mealType: string;
  recipe: Recipe;
  scaledMacros: ScaledMacros;
  scaleFactor: number;
  ingredientDetails?: Array<{
    name: string;
    original_quantity: number;
    original_unit: string;
    original_protein: number;
    original_carbs: number;
    original_fat: number;
    original_calories: number;
    scaled_quantity: number;
    scaled_protein: number;
    scaled_carbs: number;
    scaled_fat: number;
    scaled_calories: number;
  }>;
}

interface MealPlanData {
  meals: Meal[];
  totalMacros: ScaledMacros;
  targetMacros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  deviations: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
}

interface MealPlanDisplayProps {
  data: MealPlanData;
}

const MacroBar: React.FC<{ 
  label: string; 
  current: number; 
  target: number; 
  unit: string;
  color: string;
}> = ({ label, current, target, unit, color }) => {
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const deviation = Math.abs(current - target);
  const deviationPercent = target > 0 ? (deviation / target) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <div className="text-right">
          <span className={`text-sm font-bold ${percentage > 120 ? 'text-red-600' : percentage < 80 ? 'text-orange-600' : 'text-green-600'}`}>
            {current.toFixed(1)}{unit}
          </span>
          <span className="text-xs text-gray-500 ml-1">/ {target.toFixed(0)}{unit}</span>
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${color}`}
      />
      <div className="text-xs text-gray-500 text-right">
        Eltérés: {deviation.toFixed(1)}{unit} ({deviationPercent.toFixed(1)}%)
      </div>
    </div>
  );
};

const MealCard: React.FC<{ meal: Meal; index: number }> = ({ meal, index }) => {
  const mealTypes = ['Reggeli', 'Ebéd', 'Vacsora', 'Snack'];
  const mealName = mealTypes[index] || `${index + 1}. étkezés`;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{mealName}</CardTitle>
          <Badge variant="outline" className="bg-blue-50">
            {meal.scaleFactor}x skálázva
          </Badge>
        </div>
        <h3 className="text-xl font-bold text-blue-800">{meal.recipe.recipe_name}</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Eredeti vs Skálázott Makrók */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-600 mb-2">Eredeti recept (1x)</h4>
            <div className="space-y-1 text-sm">
              <div>Fehérje: <span className="font-medium">{meal.recipe.base_protein.toFixed(1)}g</span></div>
              <div>Szénhidrát: <span className="font-medium">{meal.recipe.base_carbs.toFixed(1)}g</span></div>
              <div>Zsír: <span className="font-medium">{meal.recipe.base_fat.toFixed(1)}g</span></div>
              <div>Kalória: <span className="font-medium">{meal.recipe.base_calories.toFixed(0)} kcal</span></div>
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-semibold text-sm text-green-700 mb-2">Skálázott adag ({meal.scaleFactor}x)</h4>
            <div className="space-y-1 text-sm">
              <div>Fehérje: <span className="font-bold text-green-800">{meal.scaledMacros.protein.toFixed(1)}g</span></div>
              <div>Szénhidrát: <span className="font-bold text-green-800">{meal.scaledMacros.carbs.toFixed(1)}g</span></div>
              <div>Zsír: <span className="font-bold text-green-800">{meal.scaledMacros.fat.toFixed(1)}g</span></div>
              <div>Kalória: <span className="font-bold text-green-800">{meal.scaledMacros.calories.toFixed(0)} kcal</span></div>
            </div>
          </div>
        </div>
        
        {/* Skálázhatóság */}
        {meal.recipe.scalability && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-semibold text-sm text-blue-700 mb-2">Skálázhatóság</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>P: <span className="font-medium">{meal.recipe.scalability.protein.toFixed(2)}</span></div>
              <div>C: <span className="font-medium">{meal.recipe.scalability.carbs.toFixed(2)}</span></div>
              <div>F: <span className="font-medium">{meal.recipe.scalability.fat.toFixed(2)}</span></div>
            </div>
          </div>
        )}
        
        {/* Részletes Alapanyag Adatok */}
        {meal.ingredientDetails && meal.ingredientDetails.length > 0 && (
          <div className="bg-purple-50 p-3 rounded-lg">
            <h4 className="font-semibold text-sm text-purple-700 mb-2">📝 Alapanyagok Részletei</h4>
            <div className="space-y-3">
              {meal.ingredientDetails.map((ingredient, index) => (
                <div key={index} className="border-b border-purple-200 pb-3 last:border-b-0">
                  <div className="font-medium text-sm text-purple-800 mb-2">{ingredient.name}</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2 rounded border">
                      <div className="font-semibold text-gray-600 mb-1">Eredeti:</div>
                      <div className="space-y-1">
                        <div><span className="font-medium">Mennyiség:</span> {ingredient.original_quantity}{ingredient.original_unit}</div>
                        <div><span className="font-medium">P:</span> {ingredient.original_protein.toFixed(1)}g</div>
                        <div><span className="font-medium">C:</span> {ingredient.original_carbs.toFixed(1)}g</div>
                        <div><span className="font-medium">F:</span> {ingredient.original_fat.toFixed(1)}g</div>
                      </div>
                    </div>
                    <div className="bg-green-100 p-2 rounded border">
                      <div className="font-semibold text-green-700 mb-1">Skálázott:</div>
                      <div className="space-y-1">
                        <div><span className="font-medium">Mennyiség:</span> {ingredient.scaled_quantity.toFixed(1)}{ingredient.original_unit}</div>
                        <div><span className="font-medium">P:</span> {ingredient.scaled_protein.toFixed(1)}g</div>
                        <div><span className="font-medium">C:</span> {ingredient.scaled_carbs.toFixed(1)}g</div>
                        <div><span className="font-medium">F:</span> {ingredient.scaled_fat.toFixed(1)}g</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const MealPlanDisplay: React.FC<MealPlanDisplayProps> = ({ data }) => {
  const { meals, totalMacros, targetMacros, deviations } = data;
  
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4">
      {/* Összesítő Makrók */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">📊 Napi Makró Összesítő</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MacroBar 
              label="Fehérje" 
              current={totalMacros.protein} 
              target={targetMacros.protein} 
              unit="g" 
              color="bg-red-100" 
            />
            <MacroBar 
              label="Szénhidrát" 
              current={totalMacros.carbs} 
              target={targetMacros.carbs} 
              unit="g" 
              color="bg-yellow-100" 
            />
            <MacroBar 
              label="Zsír" 
              current={totalMacros.fat} 
              target={targetMacros.fat} 
              unit="g" 
              color="bg-blue-100" 
            />
            <MacroBar 
              label="Kalória" 
              current={totalMacros.calories} 
              target={targetMacros.calories} 
              unit=" kcal" 
              color="bg-purple-100" 
            />
          </div>
          
          {/* Összesített eredmény */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{totalMacros.protein.toFixed(0)}g</div>
                <div className="text-sm text-gray-600">Fehérje</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{totalMacros.carbs.toFixed(0)}g</div>
                <div className="text-sm text-gray-600">Szénhidrát</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalMacros.fat.toFixed(0)}g</div>
                <div className="text-sm text-gray-600">Zsír</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalMacros.calories.toFixed(0)}</div>
                <div className="text-sm text-gray-600">kcal</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Étkezések */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">🍽️ Napi Étkezések</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {meals.map((meal, index) => (
            <MealCard key={index} meal={meal} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MealPlanDisplay;