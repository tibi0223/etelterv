/**
 * Meal Combiner Service
 * Creates top recipe selection by meal category with >80 average score requirement
 */

import { VarietyAdjustment } from './recipeRanker';
import { RecipeScore } from './recipeScorer';

export interface MealTypeMapping {
  recipe_id: number;
  meal_types: string[];  // ['reggeli', 'ebéd', 'vacsora', etc.]
}

export interface MealCombination {
  meal_plan_id: string;
  total_score: number;
  average_score: number;
  meets_threshold: boolean;  // >80 average score
  meals: {
    [mealType: string]: {
      recipe: VarietyAdjustment;
      assigned_macros?: {
        protein: number;
        carbs: number;
        fat: number;
        calories: number;
      };
    };
  };
  total_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  target_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  deviation: {
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
    calories_percent: number;
    total_percent: number;
  };
}

export interface MealDistribution {
  meal_type: string;
  target_percentage: number;  // % of daily macros for this meal
  min_percentage: number;     // Minimum allowed %
  max_percentage: number;     // Maximum allowed %
}

export interface CombinerCriteria {
  minAverageScore: number;          // Minimum average score (default: 80)
  mealDistributions: MealDistribution[];  // How to distribute macros across meals
  maxCombinations: number;          // Max combinations to generate (default: 50)
  allowPartialCombinations: boolean; // Allow combinations missing some meal types
  varietyWeight: number;            // Weight for variety in combination selection (0-1)
}

export const DEFAULT_MEAL_DISTRIBUTIONS: MealDistribution[] = [
  { meal_type: 'reggeli', target_percentage: 28, min_percentage: 23, max_percentage: 33 },
  { meal_type: 'ebéd', target_percentage: 39, min_percentage: 34, max_percentage: 44 },
  { meal_type: 'vacsora', target_percentage: 22, min_percentage: 17, max_percentage: 27 },
  { meal_type: 'tízórai', target_percentage: 6, min_percentage: 3, max_percentage: 10 },
  { meal_type: 'uzsonna', target_percentage: 5, min_percentage: 2, max_percentage: 8 }
];

export const DEFAULT_COMBINER_CRITERIA: CombinerCriteria = {
  minAverageScore: 80,
  mealDistributions: DEFAULT_MEAL_DISTRIBUTIONS,
  maxCombinations: 50,
  allowPartialCombinations: false,
  varietyWeight: 0.3
};

/**
 * Get recipes suitable for a specific meal type
 */
export function getRecipesForMealType(
  recipes: VarietyAdjustment[],
  mealTypeMappings: MealTypeMapping[],
  mealType: string
): VarietyAdjustment[] {
  const mappingMap = new Map<number, string[]>();
  mealTypeMappings.forEach(mapping => {
    mappingMap.set(mapping.recipe_id, mapping.meal_types);
  });
  
  return recipes.filter(recipe => {
    const mealTypes = mappingMap.get(recipe.recipe_id);
    return mealTypes && mealTypes.includes(mealType);
  });
}

/**
 * Calculate macro distribution for a meal combination
 */
export function calculateMealMacros(
  recipes: { [mealType: string]: VarietyAdjustment },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  distributions: MealDistribution[]
): {
  meal_macros: { [mealType: string]: { protein: number; carbs: number; fat: number; calories: number } };
  total_macros: { protein: number; carbs: number; fat: number; calories: number };
} {
  const recipeDataMap = new Map();
  recipeBaseData.forEach(recipe => recipeDataMap.set(recipe.recipe_id, recipe));
  
  const mealMacros: { [mealType: string]: { protein: number; carbs: number; fat: number; calories: number } } = {};
  let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;
  
  for (const [mealType, recipe] of Object.entries(recipes)) {
    const baseData = recipeDataMap.get(recipe.recipe_id);
    if (!baseData) continue;
    
    const distribution = distributions.find(d => d.meal_type === mealType);
    const multiplier = distribution ? distribution.target_percentage / 100 : 0.25; // Default 25%
    
    const protein = (baseData.Feherje_g || 0) * multiplier;
    const carbs = (baseData.Szenhidrat_g || 0) * multiplier;
    const fat = (baseData.Zsir_g || 0) * multiplier;
    const calories = (protein * 4) + (carbs * 4) + (fat * 9);
    
    mealMacros[mealType] = { protein, carbs, fat, calories };
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    totalCalories += calories;
  }
  
  return {
    meal_macros: mealMacros,
    total_macros: {
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      calories: totalCalories
    }
  };
}

/**
 * Calculate deviation from target macros
 */
export function calculateMacroDeviation(
  actual: { protein: number; carbs: number; fat: number; calories: number },
  target: { protein: number; carbs: number; fat: number; calories: number }
): {
  protein_percent: number;
  carbs_percent: number;
  fat_percent: number;
  calories_percent: number;
  total_percent: number;
} {
  const proteinDev = target.protein > 0 ? Math.abs(actual.protein - target.protein) / target.protein * 100 : 0;
  const carbsDev = target.carbs > 0 ? Math.abs(actual.carbs - target.carbs) / target.carbs * 100 : 0;
  const fatDev = target.fat > 0 ? Math.abs(actual.fat - target.fat) / target.fat * 100 : 0;
  const caloriesDev = target.calories > 0 ? Math.abs(actual.calories - target.calories) / target.calories * 100 : 0;
  
  const totalDev = (proteinDev + carbsDev + fatDev + caloriesDev) / 4;
  
  return {
    protein_percent: Math.round(proteinDev * 100) / 100,
    carbs_percent: Math.round(carbsDev * 100) / 100,
    fat_percent: Math.round(fatDev * 100) / 100,
    calories_percent: Math.round(caloriesDev * 100) / 100,
    total_percent: Math.round(totalDev * 100) / 100
  };
}

/**
 * Generate a single meal combination
 */
export function createMealCombination(
  selectedRecipes: { [mealType: string]: VarietyAdjustment },
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  distributions: MealDistribution[],
  planId: string = generatePlanId()
): MealCombination {
  // Calculate macros
  const macroCalc = calculateMealMacros(selectedRecipes, recipeBaseData, distributions);
  
  // Calculate scores
  const scores = Object.values(selectedRecipes).map(r => r.final_score);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
  
  // Calculate deviation
  const deviation = calculateMacroDeviation(macroCalc.total_macros, targetMacros);
  
  // Build meals object
  const meals: { [mealType: string]: any } = {};
  for (const [mealType, recipe] of Object.entries(selectedRecipes)) {
    meals[mealType] = {
      recipe,
      assigned_macros: macroCalc.meal_macros[mealType]
    };
  }
  
  return {
    meal_plan_id: planId,
    total_score: Math.round(totalScore * 100) / 100,
    average_score: Math.round(averageScore * 100) / 100,
    meets_threshold: averageScore >= 80, // Hardcoded threshold for now
    meals,
    total_macros: macroCalc.total_macros,
    target_macros: targetMacros,
    deviation
  };
}

/**
 * Generate all possible meal combinations
 */
export function generateMealCombinations(
  recipesByMealType: { [mealType: string]: VarietyAdjustment[] },
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  criteria: CombinerCriteria = DEFAULT_COMBINER_CRITERIA
): MealCombination[] {
  const combinations: MealCombination[] = [];
  const mealTypes = Object.keys(recipesByMealType);
  
  if (mealTypes.length === 0) return [];
  
  // Generate combinations recursively
  function generateCombos(
    currentCombo: { [mealType: string]: VarietyAdjustment },
    remainingMealTypes: string[],
    currentIndex: number = 0
  ) {
    if (combinations.length >= criteria.maxCombinations) return;
    
    if (remainingMealTypes.length === 0) {
      // Complete combination
      const combination = createMealCombination(
        currentCombo,
        targetMacros,
        recipeBaseData,
        criteria.mealDistributions
      );
      
      if (combination.meets_threshold || criteria.allowPartialCombinations) {
        combinations.push(combination);
      }
      return;
    }
    
    const currentMealType = remainingMealTypes[0];
    const availableRecipes = recipesByMealType[currentMealType] || [];
    const nextMealTypes = remainingMealTypes.slice(1);
    
    // Try top recipes for this meal type (limit to avoid explosion)
    const maxRecipesToTry = Math.min(availableRecipes.length, 3);
    
    for (let i = 0; i < maxRecipesToTry; i++) {
      const recipe = availableRecipes[i];
      
      generateCombos(
        { ...currentCombo, [currentMealType]: recipe },
        nextMealTypes,
        currentIndex + 1
      );
    }
  }
  
  generateCombos({}, mealTypes);
  
  // Sort by average score (descending)
  return combinations.sort((a, b) => b.average_score - a.average_score);
}

/**
 * Select top recipes by meal category with score threshold
 */
export function selectTopRecipesByCategory(
  rankedRecipes: VarietyAdjustment[],
  mealTypeMappings: MealTypeMapping[],
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  criteria: CombinerCriteria = DEFAULT_COMBINER_CRITERIA
): {
  combinations: MealCombination[];
  recipesByMealType: { [mealType: string]: VarietyAdjustment[] };
  stats: {
    totalRecipes: number;
    recipesAboveThreshold: number;
    averageScore: number;
    combinationsGenerated: number;
    combinationsMeetingThreshold: number;
  };
} {
  // Group recipes by meal type
  const recipesByMealType: { [mealType: string]: VarietyAdjustment[] } = {};
  
  criteria.mealDistributions.forEach(distribution => {
    const mealTypeRecipes = getRecipesForMealType(rankedRecipes, mealTypeMappings, distribution.meal_type);
    if (mealTypeRecipes.length > 0) {
      recipesByMealType[distribution.meal_type] = mealTypeRecipes;
    }
  });
  
  // Generate combinations
  const combinations = generateMealCombinations(
    recipesByMealType,
    targetMacros,
    recipeBaseData,
    criteria
  );
  
  // Calculate stats
  const recipesAboveThreshold = rankedRecipes.filter(r => r.final_score >= criteria.minAverageScore).length;
  const averageScore = rankedRecipes.length > 0 
    ? rankedRecipes.reduce((sum, r) => sum + r.final_score, 0) / rankedRecipes.length 
    : 0;
  const combinationsMeetingThreshold = combinations.filter(c => c.meets_threshold).length;
  
  return {
    combinations,
    recipesByMealType,
    stats: {
      totalRecipes: rankedRecipes.length,
      recipesAboveThreshold,
      averageScore: Math.round(averageScore * 100) / 100,
      combinationsGenerated: combinations.length,
      combinationsMeetingThreshold
    }
  };
}

/**
 * Get best meal combination with optional fallback
 */
export function getBestMealCombination(
  combinations: MealCombination[],
  fallbackToLowerThreshold: boolean = true
): MealCombination | null {
  if (combinations.length === 0) return null;
  
  // First try to find combinations meeting the threshold
  const goodCombinations = combinations.filter(c => c.meets_threshold);
  
  if (goodCombinations.length > 0) {
    return goodCombinations[0]; // Already sorted by score
  }
  
  // Fallback to best available combination
  if (fallbackToLowerThreshold && combinations.length > 0) {
    return combinations[0];
  }
  
  return null;
}

/**
 * Generate unique plan ID
 */
export function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analyze combination quality
 */
export function analyzeCombinationQuality(combination: MealCombination): {
  quality_score: number;  // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // Score breakdown
  let qualityScore = 0;
  
  // Average score component (40% weight)
  const scoreComponent = Math.min(100, combination.average_score);
  qualityScore += scoreComponent * 0.4;
  
  if (combination.average_score >= 90) {
    strengths.push('Excellent recipe quality scores');
  } else if (combination.average_score >= 80) {
    strengths.push('Good recipe quality scores');
  } else {
    weaknesses.push('Below optimal recipe quality scores');
    recommendations.push('Consider recipes with higher base scores');
  }
  
  // Deviation component (40% weight)
  const deviationPenalty = Math.min(100, combination.deviation.total_percent);
  const deviationComponent = Math.max(0, 100 - deviationPenalty);
  qualityScore += deviationComponent * 0.4;
  
  if (combination.deviation.total_percent <= 10) {
    strengths.push('Excellent macro target alignment');
  } else if (combination.deviation.total_percent <= 20) {
    strengths.push('Good macro target alignment');
  } else {
    weaknesses.push('High deviation from target macros');
    recommendations.push('Consider recipe swapping or portion adjustments');
  }
  
  // Variety component (20% weight)
  const mealCount = Object.keys(combination.meals).length;
  const varietyComponent = Math.min(100, (mealCount / 3) * 100); // Assumes 3 main meals
  qualityScore += varietyComponent * 0.2;
  
  if (mealCount >= 3) {
    strengths.push('Good meal variety coverage');
  } else {
    weaknesses.push('Limited meal variety');
    recommendations.push('Add more meal types for better coverage');
  }
  
  return {
    quality_score: Math.round(qualityScore * 100) / 100,
    strengths,
    weaknesses,
    recommendations
  };
}
 * Meal Combiner Service
 * Creates top recipe selection by meal category with >80 average score requirement
 */

import { VarietyAdjustment } from './recipeRanker';
import { RecipeScore } from './recipeScorer';

export interface MealTypeMapping {
  recipe_id: number;
  meal_types: string[];  // ['reggeli', 'ebéd', 'vacsora', etc.]
}

export interface MealCombination {
  meal_plan_id: string;
  total_score: number;
  average_score: number;
  meets_threshold: boolean;  // >80 average score
  meals: {
    [mealType: string]: {
      recipe: VarietyAdjustment;
      assigned_macros?: {
        protein: number;
        carbs: number;
        fat: number;
        calories: number;
      };
    };
  };
  total_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  target_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  deviation: {
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
    calories_percent: number;
    total_percent: number;
  };
}

export interface MealDistribution {
  meal_type: string;
  target_percentage: number;  // % of daily macros for this meal
  min_percentage: number;     // Minimum allowed %
  max_percentage: number;     // Maximum allowed %
}

export interface CombinerCriteria {
  minAverageScore: number;          // Minimum average score (default: 80)
  mealDistributions: MealDistribution[];  // How to distribute macros across meals
  maxCombinations: number;          // Max combinations to generate (default: 50)
  allowPartialCombinations: boolean; // Allow combinations missing some meal types
  varietyWeight: number;            // Weight for variety in combination selection (0-1)
}

export const DEFAULT_MEAL_DISTRIBUTIONS: MealDistribution[] = [
  { meal_type: 'reggeli', target_percentage: 28, min_percentage: 23, max_percentage: 33 },
  { meal_type: 'ebéd', target_percentage: 39, min_percentage: 34, max_percentage: 44 },
  { meal_type: 'vacsora', target_percentage: 22, min_percentage: 17, max_percentage: 27 },
  { meal_type: 'tízórai', target_percentage: 6, min_percentage: 3, max_percentage: 10 },
  { meal_type: 'uzsonna', target_percentage: 5, min_percentage: 2, max_percentage: 8 }
];

export const DEFAULT_COMBINER_CRITERIA: CombinerCriteria = {
  minAverageScore: 80,
  mealDistributions: DEFAULT_MEAL_DISTRIBUTIONS,
  maxCombinations: 50,
  allowPartialCombinations: false,
  varietyWeight: 0.3
};

/**
 * Get recipes suitable for a specific meal type
 */
export function getRecipesForMealType(
  recipes: VarietyAdjustment[],
  mealTypeMappings: MealTypeMapping[],
  mealType: string
): VarietyAdjustment[] {
  const mappingMap = new Map<number, string[]>();
  mealTypeMappings.forEach(mapping => {
    mappingMap.set(mapping.recipe_id, mapping.meal_types);
  });
  
  return recipes.filter(recipe => {
    const mealTypes = mappingMap.get(recipe.recipe_id);
    return mealTypes && mealTypes.includes(mealType);
  });
}

/**
 * Calculate macro distribution for a meal combination
 */
export function calculateMealMacros(
  recipes: { [mealType: string]: VarietyAdjustment },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  distributions: MealDistribution[]
): {
  meal_macros: { [mealType: string]: { protein: number; carbs: number; fat: number; calories: number } };
  total_macros: { protein: number; carbs: number; fat: number; calories: number };
} {
  const recipeDataMap = new Map();
  recipeBaseData.forEach(recipe => recipeDataMap.set(recipe.recipe_id, recipe));
  
  const mealMacros: { [mealType: string]: { protein: number; carbs: number; fat: number; calories: number } } = {};
  let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;
  
  for (const [mealType, recipe] of Object.entries(recipes)) {
    const baseData = recipeDataMap.get(recipe.recipe_id);
    if (!baseData) continue;
    
    const distribution = distributions.find(d => d.meal_type === mealType);
    const multiplier = distribution ? distribution.target_percentage / 100 : 0.25; // Default 25%
    
    const protein = (baseData.Feherje_g || 0) * multiplier;
    const carbs = (baseData.Szenhidrat_g || 0) * multiplier;
    const fat = (baseData.Zsir_g || 0) * multiplier;
    const calories = (protein * 4) + (carbs * 4) + (fat * 9);
    
    mealMacros[mealType] = { protein, carbs, fat, calories };
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    totalCalories += calories;
  }
  
  return {
    meal_macros: mealMacros,
    total_macros: {
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      calories: totalCalories
    }
  };
}

/**
 * Calculate deviation from target macros
 */
export function calculateMacroDeviation(
  actual: { protein: number; carbs: number; fat: number; calories: number },
  target: { protein: number; carbs: number; fat: number; calories: number }
): {
  protein_percent: number;
  carbs_percent: number;
  fat_percent: number;
  calories_percent: number;
  total_percent: number;
} {
  const proteinDev = target.protein > 0 ? Math.abs(actual.protein - target.protein) / target.protein * 100 : 0;
  const carbsDev = target.carbs > 0 ? Math.abs(actual.carbs - target.carbs) / target.carbs * 100 : 0;
  const fatDev = target.fat > 0 ? Math.abs(actual.fat - target.fat) / target.fat * 100 : 0;
  const caloriesDev = target.calories > 0 ? Math.abs(actual.calories - target.calories) / target.calories * 100 : 0;
  
  const totalDev = (proteinDev + carbsDev + fatDev + caloriesDev) / 4;
  
  return {
    protein_percent: Math.round(proteinDev * 100) / 100,
    carbs_percent: Math.round(carbsDev * 100) / 100,
    fat_percent: Math.round(fatDev * 100) / 100,
    calories_percent: Math.round(caloriesDev * 100) / 100,
    total_percent: Math.round(totalDev * 100) / 100
  };
}

/**
 * Generate a single meal combination
 */
export function createMealCombination(
  selectedRecipes: { [mealType: string]: VarietyAdjustment },
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  distributions: MealDistribution[],
  planId: string = generatePlanId()
): MealCombination {
  // Calculate macros
  const macroCalc = calculateMealMacros(selectedRecipes, recipeBaseData, distributions);
  
  // Calculate scores
  const scores = Object.values(selectedRecipes).map(r => r.final_score);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
  
  // Calculate deviation
  const deviation = calculateMacroDeviation(macroCalc.total_macros, targetMacros);
  
  // Build meals object
  const meals: { [mealType: string]: any } = {};
  for (const [mealType, recipe] of Object.entries(selectedRecipes)) {
    meals[mealType] = {
      recipe,
      assigned_macros: macroCalc.meal_macros[mealType]
    };
  }
  
  return {
    meal_plan_id: planId,
    total_score: Math.round(totalScore * 100) / 100,
    average_score: Math.round(averageScore * 100) / 100,
    meets_threshold: averageScore >= 80, // Hardcoded threshold for now
    meals,
    total_macros: macroCalc.total_macros,
    target_macros: targetMacros,
    deviation
  };
}

/**
 * Generate all possible meal combinations
 */
export function generateMealCombinations(
  recipesByMealType: { [mealType: string]: VarietyAdjustment[] },
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  criteria: CombinerCriteria = DEFAULT_COMBINER_CRITERIA
): MealCombination[] {
  const combinations: MealCombination[] = [];
  const mealTypes = Object.keys(recipesByMealType);
  
  if (mealTypes.length === 0) return [];
  
  // Generate combinations recursively
  function generateCombos(
    currentCombo: { [mealType: string]: VarietyAdjustment },
    remainingMealTypes: string[],
    currentIndex: number = 0
  ) {
    if (combinations.length >= criteria.maxCombinations) return;
    
    if (remainingMealTypes.length === 0) {
      // Complete combination
      const combination = createMealCombination(
        currentCombo,
        targetMacros,
        recipeBaseData,
        criteria.mealDistributions
      );
      
      if (combination.meets_threshold || criteria.allowPartialCombinations) {
        combinations.push(combination);
      }
      return;
    }
    
    const currentMealType = remainingMealTypes[0];
    const availableRecipes = recipesByMealType[currentMealType] || [];
    const nextMealTypes = remainingMealTypes.slice(1);
    
    // Try top recipes for this meal type (limit to avoid explosion)
    const maxRecipesToTry = Math.min(availableRecipes.length, 3);
    
    for (let i = 0; i < maxRecipesToTry; i++) {
      const recipe = availableRecipes[i];
      
      generateCombos(
        { ...currentCombo, [currentMealType]: recipe },
        nextMealTypes,
        currentIndex + 1
      );
    }
  }
  
  generateCombos({}, mealTypes);
  
  // Sort by average score (descending)
  return combinations.sort((a, b) => b.average_score - a.average_score);
}

/**
 * Select top recipes by meal category with score threshold
 */
export function selectTopRecipesByCategory(
  rankedRecipes: VarietyAdjustment[],
  mealTypeMappings: MealTypeMapping[],
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  criteria: CombinerCriteria = DEFAULT_COMBINER_CRITERIA
): {
  combinations: MealCombination[];
  recipesByMealType: { [mealType: string]: VarietyAdjustment[] };
  stats: {
    totalRecipes: number;
    recipesAboveThreshold: number;
    averageScore: number;
    combinationsGenerated: number;
    combinationsMeetingThreshold: number;
  };
} {
  // Group recipes by meal type
  const recipesByMealType: { [mealType: string]: VarietyAdjustment[] } = {};
  
  criteria.mealDistributions.forEach(distribution => {
    const mealTypeRecipes = getRecipesForMealType(rankedRecipes, mealTypeMappings, distribution.meal_type);
    if (mealTypeRecipes.length > 0) {
      recipesByMealType[distribution.meal_type] = mealTypeRecipes;
    }
  });
  
  // Generate combinations
  const combinations = generateMealCombinations(
    recipesByMealType,
    targetMacros,
    recipeBaseData,
    criteria
  );
  
  // Calculate stats
  const recipesAboveThreshold = rankedRecipes.filter(r => r.final_score >= criteria.minAverageScore).length;
  const averageScore = rankedRecipes.length > 0 
    ? rankedRecipes.reduce((sum, r) => sum + r.final_score, 0) / rankedRecipes.length 
    : 0;
  const combinationsMeetingThreshold = combinations.filter(c => c.meets_threshold).length;
  
  return {
    combinations,
    recipesByMealType,
    stats: {
      totalRecipes: rankedRecipes.length,
      recipesAboveThreshold,
      averageScore: Math.round(averageScore * 100) / 100,
      combinationsGenerated: combinations.length,
      combinationsMeetingThreshold
    }
  };
}

/**
 * Get best meal combination with optional fallback
 */
export function getBestMealCombination(
  combinations: MealCombination[],
  fallbackToLowerThreshold: boolean = true
): MealCombination | null {
  if (combinations.length === 0) return null;
  
  // First try to find combinations meeting the threshold
  const goodCombinations = combinations.filter(c => c.meets_threshold);
  
  if (goodCombinations.length > 0) {
    return goodCombinations[0]; // Already sorted by score
  }
  
  // Fallback to best available combination
  if (fallbackToLowerThreshold && combinations.length > 0) {
    return combinations[0];
  }
  
  return null;
}

/**
 * Generate unique plan ID
 */
export function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analyze combination quality
 */
export function analyzeCombinationQuality(combination: MealCombination): {
  quality_score: number;  // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // Score breakdown
  let qualityScore = 0;
  
  // Average score component (40% weight)
  const scoreComponent = Math.min(100, combination.average_score);
  qualityScore += scoreComponent * 0.4;
  
  if (combination.average_score >= 90) {
    strengths.push('Excellent recipe quality scores');
  } else if (combination.average_score >= 80) {
    strengths.push('Good recipe quality scores');
  } else {
    weaknesses.push('Below optimal recipe quality scores');
    recommendations.push('Consider recipes with higher base scores');
  }
  
  // Deviation component (40% weight)
  const deviationPenalty = Math.min(100, combination.deviation.total_percent);
  const deviationComponent = Math.max(0, 100 - deviationPenalty);
  qualityScore += deviationComponent * 0.4;
  
  if (combination.deviation.total_percent <= 10) {
    strengths.push('Excellent macro target alignment');
  } else if (combination.deviation.total_percent <= 20) {
    strengths.push('Good macro target alignment');
  } else {
    weaknesses.push('High deviation from target macros');
    recommendations.push('Consider recipe swapping or portion adjustments');
  }
  
  // Variety component (20% weight)
  const mealCount = Object.keys(combination.meals).length;
  const varietyComponent = Math.min(100, (mealCount / 3) * 100); // Assumes 3 main meals
  qualityScore += varietyComponent * 0.2;
  
  if (mealCount >= 3) {
    strengths.push('Good meal variety coverage');
  } else {
    weaknesses.push('Limited meal variety');
    recommendations.push('Add more meal types for better coverage');
  }
  
  return {
    quality_score: Math.round(qualityScore * 100) / 100,
    strengths,
    weaknesses,
    recommendations
  };
}
 