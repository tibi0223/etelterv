import { Alapanyag } from './database/types';
import { CombinedRecipe } from './database/types';
import {
  scaleRecipe,
  scaleRecipeProportionally,
  ScalingOutput,
  Macros,
  calculateTotalMacros
} from './macroScaler';
import { testRecipeIngredients } from '@/lib/testData/testRecipeIngredients';
import { UserPreference } from './preferenceFilters';
import { UserFavorite } from './userFavorites';

// Kiegészítés: a valós adatbázisból jövő receptekhez is legyen ingredients mező
export interface MealPlanInput {
  availableRecipes: CombinedRecipe[];
  allNutritionData: Alapanyag[];
  mealTypes: string[];
  dailyTarget: Macros;
  userPreferences?: UserPreference[];
  userFavorites?: UserFavorite[];
}

export interface MealPlanOutput {
  success: boolean;
  message: string;
  scaledMeals: {
    mealNumber: number;
    recipe: CombinedRecipe;
    scalingResult: ScalingOutput;
    targetMacrosForMeal: Macros;
  }[];
  finalTotals: Macros;
}

const mealDistributionPercentages: { [key: number]: number[] } = {
  1: [1.0],
  2: [0.4, 0.6], // Reggeli: 40%, Ebéd: 60%
  3: [0.30, 0.45, 0.25], // Reggeli, Ebéd, Vacsora
  4: [0.30, 0.10, 0.40, 0.20], // Reggeli, Tízórai, Ebéd, Vacsora
  5: [0.25, 0.10, 0.35, 0.10, 0.20], // Reggeli, Tízórai, Ebéd, Uzsonna, Vacsora
};

// Helper function to calculate the distance between two macro objects
const calculateMacroDistance = (macros1: Macros, macros2: Macros): number => {
  const proteinDiff = macros1.protein - macros2.protein;
  const carbsDiff = macros1.carbs - macros2.carbs;
  const fatDiff = macros1.fat - macros2.fat;
  const calorieDiff = (macros1.calories - macros2.calories) / 4; // Calories are weighted less heavily

  return Math.sqrt(proteinDiff**2 + carbsDiff**2 + fatDiff**2 + calorieDiff**2);
};

export const areMacrosWithinMacroTolerance = (
  actual: Macros,
  target: Macros,
  tolerance: number
): boolean => {
  // Csak a fehérje, szénhidrát és zsír számít a toleranciába
  const proteinDiff = Math.abs(actual.protein - target.protein) / (target.protein || 1);
  const carbsDiff = Math.abs(actual.carbs - target.carbs) / (target.carbs || 1);
  const fatDiff = Math.abs(actual.fat - target.fat) / (target.fat || 1);
  
  return proteinDiff <= tolerance && carbsDiff <= tolerance && fatDiff <= tolerance;
};

// Adapter: ReceptAlapanyagV2 -> TestRecipeIngredient
function convertToTestRecipeIngredient(ingredient) {
  return {
    ...ingredient,
    Skálázhatóság_Típus: ingredient.Tipus || ingredient.Skálázhatóság_Típus || '',
    Arány_Csoport: ingredient.Kotes || ingredient.Arány_Csoport || '',
    // plusz minden egyéb property, ami kellhet
  };
}

// Adapter: CombinedRecipe -> TestRecipe
function convertToTestRecipe(recipe: any): any {
  return {
    'Receptnév': recipe.név,
    'Recept ID': recipe.id,
    'Elkészítése': recipe.elkészítés,
    'Kép': recipe.kép,
    'Recept_Skálázhatóság': recipe.Recept_Skálázhatóság,
    // plusz minden egyéb property, ami kellhet
  };
}

export async function generateAndScaleMealPlan(input: MealPlanInput): Promise<MealPlanOutput> {
  const { availableRecipes, allNutritionData, mealTypes, dailyTarget } = input;

  // 1. Filter recipes by scalability and macro capability
  const scalableRecipes = availableRecipes.filter(recipe => 
    recipe.Recept_Skálázhatóság !== 'Nem skálázható'
  );

  const macroCapableRecipes = scalableRecipes.filter(recipe => {
    const ingredients = (recipe.ingredients || []).map(convertToTestRecipeIngredient);
    const macros = calculateTotalMacros(ingredients, allNutritionData);
    return macros.protein > 5 && macros.carbs > 5 && macros.fat > 1;
  });

  if (macroCapableRecipes.length === 0) {
    return {
      success: false,
      message: 'Nincs megfelelő recept a megadott feltételekkel.',
      scaledMeals: [],
      finalTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }

  // 2. Create recipe pools by meal type
  const recipePools = mealTypes.map(type => {
    return macroCapableRecipes.filter(recipe => {
      return recipe.mealTypes.some(recipeMealType => 
        recipeMealType.toLowerCase() === type.toLowerCase()
      );
    });
  });

  // Check if we have recipes for all meal types
  const emptyPools = recipePools.filter(pool => pool.length === 0);
  if (emptyPools.length > 0) {
    return {
      success: false,
      message: `Nincs recept a következő étkezési típusokhoz: ${mealTypes.filter((_, index) => recipePools[index].length === 0).join(', ')}`,
      scaledMeals: [],
      finalTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }

  // 3. Normal meal plan generation (removed intelligent generation for now)
  const mealCount = mealTypes.length;
  const distribution = mealDistributionPercentages[mealCount] || [1.0];
  let attempt = 0;
  const MAX_ATTEMPTS = 200;
  let bestResult: MealPlanOutput | null = null;
  let bestTotalAbsError = Infinity;

  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    
    const selectedRecipes = recipePools.map((pool, index) => {
      const selectedRecipe = pool[Math.floor(Math.random() * pool.length)];
      
      const expectedMealType = mealTypes[index];
      const hasCorrectMealType = selectedRecipe.mealTypes.some(mt => 
        mt.toLowerCase() === expectedMealType.toLowerCase()
      );
      
      if (!hasCorrectMealType) {
        const validRecipes = pool.filter(r => 
          r.mealTypes.some(mt => mt.toLowerCase() === expectedMealType.toLowerCase())
        );
        
        if (validRecipes.length > 0) {
          const correctedRecipe = validRecipes[Math.floor(Math.random() * validRecipes.length)];
          return correctedRecipe;
        } else {
          return selectedRecipe;
        }
      }
      
      return selectedRecipe;
    });

    const scaledMeals = selectedRecipes.map((recipe, index) => {
      const mealPercentage = distribution[index];
      const targetMacrosForMeal: Macros = {
        calories: dailyTarget.calories * mealPercentage,
        protein: dailyTarget.protein * mealPercentage,
        carbs: dailyTarget.carbs * mealPercentage,
        fat: dailyTarget.fat * mealPercentage,
      };
      const ingredients = (recipe.ingredients || []).map(convertToTestRecipeIngredient);
      const scalingInput = {
        recipe: convertToTestRecipe(recipe),
        ingredients,
        targetMacros: targetMacrosForMeal,
        allNutritionData,
        limits: { upper: 25.0, lower: 0.05 },
      };
      const scalingResult = scaleRecipe(scalingInput);
      return { mealNumber: index + 1, recipe, scalingResult, targetMacrosForMeal };
    });

    const finalTotals = scaledMeals.reduce(
      (totals, meal) => {
        totals.calories += meal.scalingResult.scaledMacros.calories;
        totals.protein += meal.scalingResult.scaledMacros.protein;
        totals.carbs += meal.scalingResult.scaledMacros.carbs;
        totals.fat += meal.scalingResult.scaledMacros.fat;
        return totals;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    
    const proteinAccuracy = ((1 - Math.abs(finalTotals.protein - dailyTarget.protein) / dailyTarget.protein) * 100).toFixed(1);
    const carbsAccuracy = ((1 - Math.abs(finalTotals.carbs - dailyTarget.carbs) / dailyTarget.carbs) * 100).toFixed(1);
    const fatAccuracy = ((1 - Math.abs(finalTotals.fat - dailyTarget.fat) / dailyTarget.fat) * 100).toFixed(1);
    
    if (areMacrosWithinMacroTolerance(finalTotals, dailyTarget, 0.05)) {
      return {
        success: true,
        message: `Sikeres étrend generálva ${attempt} próbálkozásból. Pontosság: P:${proteinAccuracy}%, C:${carbsAccuracy}%, F:${fatAccuracy}%`,
        scaledMeals,
        finalTotals,
      };
    }
    
    const totalAbsError =
      Math.abs(finalTotals.calories - dailyTarget.calories) +
      Math.abs(finalTotals.protein - dailyTarget.protein) +
      Math.abs(finalTotals.carbs - dailyTarget.carbs) +
      Math.abs(finalTotals.fat - dailyTarget.fat);
    if (totalAbsError < bestTotalAbsError) {
      bestTotalAbsError = totalAbsError;
      
      const bestProteinAccuracy = ((1 - Math.abs(finalTotals.protein - dailyTarget.protein) / dailyTarget.protein) * 100).toFixed(1);
      const bestCarbsAccuracy = ((1 - Math.abs(finalTotals.carbs - dailyTarget.carbs) / dailyTarget.carbs) * 100).toFixed(1);
      const bestFatAccuracy = ((1 - Math.abs(finalTotals.fat - dailyTarget.fat) / dailyTarget.fat) * 100).toFixed(1);
      
      bestResult = {
        success: false,
        message: `Nem sikerült 5%-os hibahatáron belüli étrendet generálni, de ez a legjobb közelítés (${attempt} próbálkozásból). Pontosság: P:${bestProteinAccuracy}%, C:${bestCarbsAccuracy}%, F:${bestFatAccuracy}%`,
        scaledMeals,
        finalTotals,
      };
    }
  }
  
  if (bestResult) {
    return {
      success: false,
      message: `Nem sikerült 5%-os hibahatáron belüli étrendet generálni ${MAX_ATTEMPTS} próbálkozás alatt. Próbáld meg más makró célokkal vagy étkezés típusokkal.`,
      scaledMeals: [],
      finalTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }
  return {
    success: false,
    message: `Nem sikerült 5%-os hibahatáron belüli étrendet generálni ${MAX_ATTEMPTS} próbálkozás alatt. Próbáld meg más makró célokkal vagy étkezés típusokkal.`,
    scaledMeals: [],
    finalTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
} 