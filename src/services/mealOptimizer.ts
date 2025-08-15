/**
 * Meal Optimizer Service
 * Builds weak macro swapping logic for recipe combinations
 */

import { MealCombination } from './mealCombiner';
import { VarietyAdjustment } from './recipeRanker';
import { RecipeScalability } from './recipeScorer';

export interface MacroWeakness {
  macro_type: 'protein' | 'carbs' | 'fat' | 'calories';
  current_value: number;
  target_value: number;
  deviation_percent: number;
  severity: 'low' | 'medium' | 'high';
  needs_increase: boolean;  // true if current < target
}

export interface SwapCandidate {
  current_recipe: VarietyAdjustment;
  replacement_recipe: VarietyAdjustment;
  meal_type: string;
  improvement: {
    score_change: number;           // Change in total score
    macro_improvement: number;      // Improvement in weak macro (grams)
    deviation_improvement: number;  // Reduction in deviation %
  };
  trade_offs: {
    other_macros_affected: { [macro: string]: number }; // How other macros change
    variety_impact: number;         // Impact on variety score
  };
}

export interface OptimizationResult {
  original_combination: MealCombination;
  optimized_combination: MealCombination;
  improvements: {
    score_improvement: number;
    deviation_reduction: number;
    weak_macros_fixed: number;
  };
  swaps_made: Array<{
    meal_type: string;
    old_recipe: string;
    new_recipe: string;
    reason: string;
  }>;
  final_analysis: {
    remaining_weaknesses: MacroWeakness[];
    optimization_success: boolean;
    quality_score: number;
  };
}

export interface OptimizerCriteria {
  maxSwaps: number;                    // Maximum number of swaps to try
  minImprovementThreshold: number;     // Minimum improvement to justify swap
  macroTolerances: {
    protein: number;                   // Acceptable deviation % for protein
    carbs: number;                     // Acceptable deviation % for carbs
    fat: number;                       // Acceptable deviation % for fat
    calories: number;                  // Acceptable deviation % for calories
  };
  swapPreferences: {
    preserveVariety: boolean;          // Try to maintain variety
    favoriteProtection: boolean;       // Avoid swapping favorite recipes
    scoreWeight: number;               // Weight for score vs macro improvement (0-1)
  };
}

export const DEFAULT_OPTIMIZER_CRITERIA: OptimizerCriteria = {
  maxSwaps: 3,
  minImprovementThreshold: 5, // 5% improvement minimum
  macroTolerances: {
    protein: 15,  // 15% tolerance
    carbs: 20,    // 20% tolerance  
    fat: 25,      // 25% tolerance
    calories: 10  // 10% tolerance
  },
  swapPreferences: {
    preserveVariety: true,
    favoriteProtection: true,
    scoreWeight: 0.6  // 60% score, 40% macro improvement
  }
};

/**
 * Identify weak macros in a meal combination
 */
export function identifyMacroWeaknesses(
  combination: MealCombination,
  tolerances: OptimizerCriteria['macroTolerances']
): MacroWeakness[] {
  const weaknesses: MacroWeakness[] = [];
  
  const macros = [
    { type: 'protein' as const, current: combination.total_macros.protein, target: combination.target_macros.protein, tolerance: tolerances.protein },
    { type: 'carbs' as const, current: combination.total_macros.carbs, target: combination.target_macros.carbs, tolerance: tolerances.carbs },
    { type: 'fat' as const, current: combination.total_macros.fat, target: combination.target_macros.fat, tolerance: tolerances.fat },
    { type: 'calories' as const, current: combination.total_macros.calories, target: combination.target_macros.calories, tolerance: tolerances.calories }
  ];
  
  for (const macro of macros) {
    if (macro.target === 0) continue;
    
    const deviationPercent = Math.abs(macro.current - macro.target) / macro.target * 100;
    
    if (deviationPercent > macro.tolerance) {
      const severity = deviationPercent > macro.tolerance * 2 ? 'high' : 
                      deviationPercent > macro.tolerance * 1.5 ? 'medium' : 'low';
      
      weaknesses.push({
        macro_type: macro.type,
        current_value: macro.current,
        target_value: macro.target,
        deviation_percent: Math.round(deviationPercent * 100) / 100,
        severity,
        needs_increase: macro.current < macro.target
      });
    }
  }
  
  return weaknesses.sort((a, b) => b.deviation_percent - a.deviation_percent);
}

/**
 * Find recipes that are strong in a specific macro
 */
export function findMacroStrongRecipes(
  availableRecipes: VarietyAdjustment[],
  mealType: string,
  targetMacro: 'protein' | 'carbs' | 'fat' | 'calories',
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  scalabilityData: RecipeScalability[],
  excludeRecipeId?: number
): VarietyAdjustment[] {
  const recipeDataMap = new Map();
  recipeBaseData.forEach(recipe => recipeDataMap.set(recipe.recipe_id, recipe));
  
  const scalabilityMap = new Map();
  scalabilityData.forEach(s => scalabilityMap.set(s.recipe_id, s));
  
  return availableRecipes
    .filter(recipe => recipe.recipe_id !== excludeRecipeId)
    .map(recipe => {
      const baseData = recipeDataMap.get(recipe.recipe_id);
      const scalability = scalabilityMap.get(recipe.recipe_id);
      
      if (!baseData || !scalability) return null;
      
      // Calculate macro strength score
      let macroValue = 0;
      let macroScalability = 0;
      
      switch (targetMacro) {
        case 'protein':
          macroValue = baseData.Feherje_g || 0;
          macroScalability = scalability.protein_scalability;
          break;
        case 'carbs':
          macroValue = baseData.Szenhidrat_g || 0;
          macroScalability = scalability.carbs_scalability;
          break;
        case 'fat':
          macroValue = baseData.Zsir_g || 0;
          macroScalability = scalability.fat_scalability;
          break;
        case 'calories':
          macroValue = (baseData.Feherje_g * 4) + (baseData.Szenhidrat_g * 4) + (baseData.Zsir_g * 9);
          macroScalability = (scalability.protein_scalability + scalability.carbs_scalability + scalability.fat_scalability) / 3;
          break;
      }
      
      // Combined strength score (value + scalability)
      const strengthScore = (macroValue * 0.7) + (macroScalability * 30); // Scale scalability to similar range
      
      return {
        ...recipe,
        macro_strength: strengthScore,
        macro_value: macroValue,
        macro_scalability: macroScalability
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.macro_strength || 0) - (a?.macro_strength || 0))
    .slice(0, 5); // Top 5 strongest recipes
}

/**
 * Evaluate a potential recipe swap
 */
export function evaluateSwap(
  combination: MealCombination,
  mealType: string,
  newRecipe: VarietyAdjustment,
  targetWeakness: MacroWeakness,
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  criteria: OptimizerCriteria
): SwapCandidate | null {
  const currentRecipe = combination.meals[mealType]?.recipe;
  if (!currentRecipe) return null;
  
  const recipeDataMap = new Map();
  recipeBaseData.forEach(recipe => recipeDataMap.set(recipe.recipe_id, recipe));
  
  const currentData = recipeDataMap.get(currentRecipe.recipe_id);
  const newData = recipeDataMap.get(newRecipe.recipe_id);
  
  if (!currentData || !newData) return null;
  
  // Calculate macro changes
  const proteinChange = (newData.Feherje_g || 0) - (currentData.Feherje_g || 0);
  const carbsChange = (newData.Szenhidrat_g || 0) - (currentData.Szenhidrat_g || 0);
  const fatChange = (newData.Zsir_g || 0) - (currentData.Zsir_g || 0);
  const caloriesChange = (proteinChange * 4) + (carbsChange * 4) + (fatChange * 9);
  
  // Calculate improvement for target weakness
  let macroImprovement = 0;
  switch (targetWeakness.macro_type) {
    case 'protein':
      macroImprovement = targetWeakness.needs_increase ? proteinChange : -proteinChange;
      break;
    case 'carbs':
      macroImprovement = targetWeakness.needs_increase ? carbsChange : -carbsChange;
      break;
    case 'fat':
      macroImprovement = targetWeakness.needs_increase ? fatChange : -fatChange;
      break;
    case 'calories':
      macroImprovement = targetWeakness.needs_increase ? caloriesChange : -caloriesChange;
      break;
  }
  
  // Must improve the target macro
  if (macroImprovement <= 0) return null;
  
  // Calculate new deviation
  const newTotalMacros = {
    protein: combination.total_macros.protein + proteinChange,
    carbs: combination.total_macros.carbs + carbsChange,
    fat: combination.total_macros.fat + fatChange,
    calories: combination.total_macros.calories + caloriesChange
  };
  
  const newTargetDeviation = Math.abs(newTotalMacros[targetWeakness.macro_type] - targetWeakness.target_value) / targetWeakness.target_value * 100;
  const deviationImprovement = targetWeakness.deviation_percent - newTargetDeviation;
  
  // Must improve deviation
  if (deviationImprovement <= 0) return null;
  
  // Score change calculation
  const scoreChange = newRecipe.final_score - currentRecipe.final_score;
  
  // Variety impact (negative if we lose variety)
  let varietyImpact = 0;
  if (criteria.swapPreferences.preserveVariety) {
    if (currentRecipe.usage_count_last_7_days === 0 && newRecipe.usage_count_last_7_days > 0) {
      varietyImpact = -5; // Penalty for reducing variety
    }
  }
  
  // Favorite protection
  if (criteria.swapPreferences.favoriteProtection && currentRecipe.is_favorite) {
    varietyImpact -= 10; // Strong penalty for swapping favorites
  }
  
  return {
    current_recipe: currentRecipe,
    replacement_recipe: newRecipe,
    meal_type: mealType,
    improvement: {
      score_change: Math.round(scoreChange * 100) / 100,
      macro_improvement: Math.round(macroImprovement * 100) / 100,
      deviation_improvement: Math.round(deviationImprovement * 100) / 100
    },
    trade_offs: {
      other_macros_affected: {
        protein: Math.round(proteinChange * 100) / 100,
        carbs: Math.round(carbsChange * 100) / 100,
        fat: Math.round(fatChange * 100) / 100,
        calories: Math.round(caloriesChange * 100) / 100
      },
      variety_impact: varietyImpact
    }
  };
}

/**
 * Execute a recipe swap on a meal combination
 */
export function executeSwap(
  combination: MealCombination,
  swap: SwapCandidate,
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>
): MealCombination {
  const newCombination = JSON.parse(JSON.stringify(combination)); // Deep clone
  
  // Update the meal
  newCombination.meals[swap.meal_type].recipe = swap.replacement_recipe;
  
  // Recalculate total macros
  newCombination.total_macros.protein += swap.trade_offs.other_macros_affected.protein;
  newCombination.total_macros.carbs += swap.trade_offs.other_macros_affected.carbs;
  newCombination.total_macros.fat += swap.trade_offs.other_macros_affected.fat;
  newCombination.total_macros.calories += swap.trade_offs.other_macros_affected.calories;
  
  // Recalculate scores
  const newScores = Object.values(newCombination.meals).map(meal => meal.recipe.final_score);
  newCombination.total_score = newScores.reduce((sum, score) => sum + score, 0);
  newCombination.average_score = newScores.length > 0 ? newCombination.total_score / newScores.length : 0;
  newCombination.meets_threshold = newCombination.average_score >= 80;
  
  // Recalculate deviation
  const macros = ['protein', 'carbs', 'fat', 'calories'] as const;
  macros.forEach(macro => {
    const target = newCombination.target_macros[macro];
    const actual = newCombination.total_macros[macro];
    const deviation = target > 0 ? Math.abs(actual - target) / target * 100 : 0;
    newCombination.deviation[`${macro}_percent`] = Math.round(deviation * 100) / 100;
  });
  
  const totalDev = (newCombination.deviation.protein_percent + 
                   newCombination.deviation.carbs_percent + 
                   newCombination.deviation.fat_percent + 
                   newCombination.deviation.calories_percent) / 4;
  newCombination.deviation.total_percent = Math.round(totalDev * 100) / 100;
  
  return newCombination;
}

/**
 * Optimize meal combination by swapping weak macro recipes
 */
export function optimizeMealCombination(
  combination: MealCombination,
  availableRecipesByMealType: { [mealType: string]: VarietyAdjustment[] },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  scalabilityData: RecipeScalability[],
  criteria: OptimizerCriteria = DEFAULT_OPTIMIZER_CRITERIA
): OptimizationResult {
  let currentCombination = JSON.parse(JSON.stringify(combination)); // Deep clone
  const swapsMade: Array<{ meal_type: string; old_recipe: string; new_recipe: string; reason: string }> = [];
  
  for (let swapAttempt = 0; swapAttempt < criteria.maxSwaps; swapAttempt++) {
    // Identify current weaknesses
    const weaknesses = identifyMacroWeaknesses(currentCombination, criteria.macroTolerances);
    
    if (weaknesses.length === 0) {
      break; // No more weaknesses to fix
    }
    
    // Focus on the most severe weakness
    const primaryWeakness = weaknesses[0];
    
    let bestSwap: SwapCandidate | null = null;
    
    // Try swapping recipes in each meal type
    for (const [mealType, mealData] of Object.entries(currentCombination.meals)) {
      const availableRecipes = availableRecipesByMealType[mealType] || [];
      
      // Find recipes strong in the weak macro
      const strongRecipes = findMacroStrongRecipes(
        availableRecipes,
        mealType,
        primaryWeakness.macro_type,
        recipeBaseData,
        scalabilityData,
        mealData.recipe.recipe_id
      );
      
      // Evaluate each strong recipe as a potential replacement
      for (const strongRecipe of strongRecipes) {
        const swapCandidate = evaluateSwap(
          currentCombination,
          mealType,
          strongRecipe,
          primaryWeakness,
          recipeBaseData,
          criteria
        );
        
        if (!swapCandidate) continue;
        
        // Calculate combined benefit score
        const scoreBenefit = swapCandidate.improvement.score_change * criteria.swapPreferences.scoreWeight;
        const macroBenefit = swapCandidate.improvement.deviation_improvement * (1 - criteria.swapPreferences.scoreWeight);
        const varietyPenalty = swapCandidate.trade_offs.variety_impact;
        
        const totalBenefit = scoreBenefit + macroBenefit + varietyPenalty;
        
        if (totalBenefit > criteria.minImprovementThreshold && 
            (!bestSwap || totalBenefit > bestSwap.improvement.score_change + bestSwap.improvement.deviation_improvement)) {
          bestSwap = swapCandidate;
        }
      }
    }
    
    // Execute the best swap if found
    if (bestSwap) {
      currentCombination = executeSwap(currentCombination, bestSwap, recipeBaseData);
      
      swapsMade.push({
        meal_type: bestSwap.meal_type,
        old_recipe: bestSwap.current_recipe.recipe_name,
        new_recipe: bestSwap.replacement_recipe.recipe_name,
        reason: `Improve ${primaryWeakness.macro_type} (${primaryWeakness.deviation_percent.toFixed(1)}% deviation)`
      });
    } else {
      break; // No beneficial swaps found
    }
  }
  
  // Final analysis
  const finalWeaknesses = identifyMacroWeaknesses(currentCombination, criteria.macroTolerances);
  const originalWeaknesses = identifyMacroWeaknesses(combination, criteria.macroTolerances);
  
  const scoreImprovement = currentCombination.average_score - combination.average_score;
  const deviationReduction = combination.deviation.total_percent - currentCombination.deviation.total_percent;
  const weakMacrosFixed = originalWeaknesses.length - finalWeaknesses.length;
  
  // Quality score (0-100)
  const qualityScore = Math.min(100, 
    (currentCombination.average_score * 0.6) + 
    (Math.max(0, 100 - currentCombination.deviation.total_percent) * 0.4)
  );
  
  return {
    original_combination: combination,
    optimized_combination: currentCombination,
    improvements: {
      score_improvement: Math.round(scoreImprovement * 100) / 100,
      deviation_reduction: Math.round(deviationReduction * 100) / 100,
      weak_macros_fixed: weakMacrosFixed
    },
    swaps_made: swapsMade,
    final_analysis: {
      remaining_weaknesses: finalWeaknesses,
      optimization_success: swapsMade.length > 0 && (scoreImprovement > 0 || deviationReduction > 0),
      quality_score: Math.round(qualityScore * 100) / 100
    }
  };
}
 * Meal Optimizer Service
 * Builds weak macro swapping logic for recipe combinations
 */

import { MealCombination } from './mealCombiner';
import { VarietyAdjustment } from './recipeRanker';
import { RecipeScalability } from './recipeScorer';

export interface MacroWeakness {
  macro_type: 'protein' | 'carbs' | 'fat' | 'calories';
  current_value: number;
  target_value: number;
  deviation_percent: number;
  severity: 'low' | 'medium' | 'high';
  needs_increase: boolean;  // true if current < target
}

export interface SwapCandidate {
  current_recipe: VarietyAdjustment;
  replacement_recipe: VarietyAdjustment;
  meal_type: string;
  improvement: {
    score_change: number;           // Change in total score
    macro_improvement: number;      // Improvement in weak macro (grams)
    deviation_improvement: number;  // Reduction in deviation %
  };
  trade_offs: {
    other_macros_affected: { [macro: string]: number }; // How other macros change
    variety_impact: number;         // Impact on variety score
  };
}

export interface OptimizationResult {
  original_combination: MealCombination;
  optimized_combination: MealCombination;
  improvements: {
    score_improvement: number;
    deviation_reduction: number;
    weak_macros_fixed: number;
  };
  swaps_made: Array<{
    meal_type: string;
    old_recipe: string;
    new_recipe: string;
    reason: string;
  }>;
  final_analysis: {
    remaining_weaknesses: MacroWeakness[];
    optimization_success: boolean;
    quality_score: number;
  };
}

export interface OptimizerCriteria {
  maxSwaps: number;                    // Maximum number of swaps to try
  minImprovementThreshold: number;     // Minimum improvement to justify swap
  macroTolerances: {
    protein: number;                   // Acceptable deviation % for protein
    carbs: number;                     // Acceptable deviation % for carbs
    fat: number;                       // Acceptable deviation % for fat
    calories: number;                  // Acceptable deviation % for calories
  };
  swapPreferences: {
    preserveVariety: boolean;          // Try to maintain variety
    favoriteProtection: boolean;       // Avoid swapping favorite recipes
    scoreWeight: number;               // Weight for score vs macro improvement (0-1)
  };
}

export const DEFAULT_OPTIMIZER_CRITERIA: OptimizerCriteria = {
  maxSwaps: 3,
  minImprovementThreshold: 5, // 5% improvement minimum
  macroTolerances: {
    protein: 15,  // 15% tolerance
    carbs: 20,    // 20% tolerance  
    fat: 25,      // 25% tolerance
    calories: 10  // 10% tolerance
  },
  swapPreferences: {
    preserveVariety: true,
    favoriteProtection: true,
    scoreWeight: 0.6  // 60% score, 40% macro improvement
  }
};

/**
 * Identify weak macros in a meal combination
 */
export function identifyMacroWeaknesses(
  combination: MealCombination,
  tolerances: OptimizerCriteria['macroTolerances']
): MacroWeakness[] {
  const weaknesses: MacroWeakness[] = [];
  
  const macros = [
    { type: 'protein' as const, current: combination.total_macros.protein, target: combination.target_macros.protein, tolerance: tolerances.protein },
    { type: 'carbs' as const, current: combination.total_macros.carbs, target: combination.target_macros.carbs, tolerance: tolerances.carbs },
    { type: 'fat' as const, current: combination.total_macros.fat, target: combination.target_macros.fat, tolerance: tolerances.fat },
    { type: 'calories' as const, current: combination.total_macros.calories, target: combination.target_macros.calories, tolerance: tolerances.calories }
  ];
  
  for (const macro of macros) {
    if (macro.target === 0) continue;
    
    const deviationPercent = Math.abs(macro.current - macro.target) / macro.target * 100;
    
    if (deviationPercent > macro.tolerance) {
      const severity = deviationPercent > macro.tolerance * 2 ? 'high' : 
                      deviationPercent > macro.tolerance * 1.5 ? 'medium' : 'low';
      
      weaknesses.push({
        macro_type: macro.type,
        current_value: macro.current,
        target_value: macro.target,
        deviation_percent: Math.round(deviationPercent * 100) / 100,
        severity,
        needs_increase: macro.current < macro.target
      });
    }
  }
  
  return weaknesses.sort((a, b) => b.deviation_percent - a.deviation_percent);
}

/**
 * Find recipes that are strong in a specific macro
 */
export function findMacroStrongRecipes(
  availableRecipes: VarietyAdjustment[],
  mealType: string,
  targetMacro: 'protein' | 'carbs' | 'fat' | 'calories',
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  scalabilityData: RecipeScalability[],
  excludeRecipeId?: number
): VarietyAdjustment[] {
  const recipeDataMap = new Map();
  recipeBaseData.forEach(recipe => recipeDataMap.set(recipe.recipe_id, recipe));
  
  const scalabilityMap = new Map();
  scalabilityData.forEach(s => scalabilityMap.set(s.recipe_id, s));
  
  return availableRecipes
    .filter(recipe => recipe.recipe_id !== excludeRecipeId)
    .map(recipe => {
      const baseData = recipeDataMap.get(recipe.recipe_id);
      const scalability = scalabilityMap.get(recipe.recipe_id);
      
      if (!baseData || !scalability) return null;
      
      // Calculate macro strength score
      let macroValue = 0;
      let macroScalability = 0;
      
      switch (targetMacro) {
        case 'protein':
          macroValue = baseData.Feherje_g || 0;
          macroScalability = scalability.protein_scalability;
          break;
        case 'carbs':
          macroValue = baseData.Szenhidrat_g || 0;
          macroScalability = scalability.carbs_scalability;
          break;
        case 'fat':
          macroValue = baseData.Zsir_g || 0;
          macroScalability = scalability.fat_scalability;
          break;
        case 'calories':
          macroValue = (baseData.Feherje_g * 4) + (baseData.Szenhidrat_g * 4) + (baseData.Zsir_g * 9);
          macroScalability = (scalability.protein_scalability + scalability.carbs_scalability + scalability.fat_scalability) / 3;
          break;
      }
      
      // Combined strength score (value + scalability)
      const strengthScore = (macroValue * 0.7) + (macroScalability * 30); // Scale scalability to similar range
      
      return {
        ...recipe,
        macro_strength: strengthScore,
        macro_value: macroValue,
        macro_scalability: macroScalability
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.macro_strength || 0) - (a?.macro_strength || 0))
    .slice(0, 5); // Top 5 strongest recipes
}

/**
 * Evaluate a potential recipe swap
 */
export function evaluateSwap(
  combination: MealCombination,
  mealType: string,
  newRecipe: VarietyAdjustment,
  targetWeakness: MacroWeakness,
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  criteria: OptimizerCriteria
): SwapCandidate | null {
  const currentRecipe = combination.meals[mealType]?.recipe;
  if (!currentRecipe) return null;
  
  const recipeDataMap = new Map();
  recipeBaseData.forEach(recipe => recipeDataMap.set(recipe.recipe_id, recipe));
  
  const currentData = recipeDataMap.get(currentRecipe.recipe_id);
  const newData = recipeDataMap.get(newRecipe.recipe_id);
  
  if (!currentData || !newData) return null;
  
  // Calculate macro changes
  const proteinChange = (newData.Feherje_g || 0) - (currentData.Feherje_g || 0);
  const carbsChange = (newData.Szenhidrat_g || 0) - (currentData.Szenhidrat_g || 0);
  const fatChange = (newData.Zsir_g || 0) - (currentData.Zsir_g || 0);
  const caloriesChange = (proteinChange * 4) + (carbsChange * 4) + (fatChange * 9);
  
  // Calculate improvement for target weakness
  let macroImprovement = 0;
  switch (targetWeakness.macro_type) {
    case 'protein':
      macroImprovement = targetWeakness.needs_increase ? proteinChange : -proteinChange;
      break;
    case 'carbs':
      macroImprovement = targetWeakness.needs_increase ? carbsChange : -carbsChange;
      break;
    case 'fat':
      macroImprovement = targetWeakness.needs_increase ? fatChange : -fatChange;
      break;
    case 'calories':
      macroImprovement = targetWeakness.needs_increase ? caloriesChange : -caloriesChange;
      break;
  }
  
  // Must improve the target macro
  if (macroImprovement <= 0) return null;
  
  // Calculate new deviation
  const newTotalMacros = {
    protein: combination.total_macros.protein + proteinChange,
    carbs: combination.total_macros.carbs + carbsChange,
    fat: combination.total_macros.fat + fatChange,
    calories: combination.total_macros.calories + caloriesChange
  };
  
  const newTargetDeviation = Math.abs(newTotalMacros[targetWeakness.macro_type] - targetWeakness.target_value) / targetWeakness.target_value * 100;
  const deviationImprovement = targetWeakness.deviation_percent - newTargetDeviation;
  
  // Must improve deviation
  if (deviationImprovement <= 0) return null;
  
  // Score change calculation
  const scoreChange = newRecipe.final_score - currentRecipe.final_score;
  
  // Variety impact (negative if we lose variety)
  let varietyImpact = 0;
  if (criteria.swapPreferences.preserveVariety) {
    if (currentRecipe.usage_count_last_7_days === 0 && newRecipe.usage_count_last_7_days > 0) {
      varietyImpact = -5; // Penalty for reducing variety
    }
  }
  
  // Favorite protection
  if (criteria.swapPreferences.favoriteProtection && currentRecipe.is_favorite) {
    varietyImpact -= 10; // Strong penalty for swapping favorites
  }
  
  return {
    current_recipe: currentRecipe,
    replacement_recipe: newRecipe,
    meal_type: mealType,
    improvement: {
      score_change: Math.round(scoreChange * 100) / 100,
      macro_improvement: Math.round(macroImprovement * 100) / 100,
      deviation_improvement: Math.round(deviationImprovement * 100) / 100
    },
    trade_offs: {
      other_macros_affected: {
        protein: Math.round(proteinChange * 100) / 100,
        carbs: Math.round(carbsChange * 100) / 100,
        fat: Math.round(fatChange * 100) / 100,
        calories: Math.round(caloriesChange * 100) / 100
      },
      variety_impact: varietyImpact
    }
  };
}

/**
 * Execute a recipe swap on a meal combination
 */
export function executeSwap(
  combination: MealCombination,
  swap: SwapCandidate,
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>
): MealCombination {
  const newCombination = JSON.parse(JSON.stringify(combination)); // Deep clone
  
  // Update the meal
  newCombination.meals[swap.meal_type].recipe = swap.replacement_recipe;
  
  // Recalculate total macros
  newCombination.total_macros.protein += swap.trade_offs.other_macros_affected.protein;
  newCombination.total_macros.carbs += swap.trade_offs.other_macros_affected.carbs;
  newCombination.total_macros.fat += swap.trade_offs.other_macros_affected.fat;
  newCombination.total_macros.calories += swap.trade_offs.other_macros_affected.calories;
  
  // Recalculate scores
  const newScores = Object.values(newCombination.meals).map(meal => meal.recipe.final_score);
  newCombination.total_score = newScores.reduce((sum, score) => sum + score, 0);
  newCombination.average_score = newScores.length > 0 ? newCombination.total_score / newScores.length : 0;
  newCombination.meets_threshold = newCombination.average_score >= 80;
  
  // Recalculate deviation
  const macros = ['protein', 'carbs', 'fat', 'calories'] as const;
  macros.forEach(macro => {
    const target = newCombination.target_macros[macro];
    const actual = newCombination.total_macros[macro];
    const deviation = target > 0 ? Math.abs(actual - target) / target * 100 : 0;
    newCombination.deviation[`${macro}_percent`] = Math.round(deviation * 100) / 100;
  });
  
  const totalDev = (newCombination.deviation.protein_percent + 
                   newCombination.deviation.carbs_percent + 
                   newCombination.deviation.fat_percent + 
                   newCombination.deviation.calories_percent) / 4;
  newCombination.deviation.total_percent = Math.round(totalDev * 100) / 100;
  
  return newCombination;
}

/**
 * Optimize meal combination by swapping weak macro recipes
 */
export function optimizeMealCombination(
  combination: MealCombination,
  availableRecipesByMealType: { [mealType: string]: VarietyAdjustment[] },
  recipeBaseData: Array<{
    recipe_id: number;
    Feherje_g: number;
    Szenhidrat_g: number;
    Zsir_g: number;
  }>,
  scalabilityData: RecipeScalability[],
  criteria: OptimizerCriteria = DEFAULT_OPTIMIZER_CRITERIA
): OptimizationResult {
  let currentCombination = JSON.parse(JSON.stringify(combination)); // Deep clone
  const swapsMade: Array<{ meal_type: string; old_recipe: string; new_recipe: string; reason: string }> = [];
  
  for (let swapAttempt = 0; swapAttempt < criteria.maxSwaps; swapAttempt++) {
    // Identify current weaknesses
    const weaknesses = identifyMacroWeaknesses(currentCombination, criteria.macroTolerances);
    
    if (weaknesses.length === 0) {
      break; // No more weaknesses to fix
    }
    
    // Focus on the most severe weakness
    const primaryWeakness = weaknesses[0];
    
    let bestSwap: SwapCandidate | null = null;
    
    // Try swapping recipes in each meal type
    for (const [mealType, mealData] of Object.entries(currentCombination.meals)) {
      const availableRecipes = availableRecipesByMealType[mealType] || [];
      
      // Find recipes strong in the weak macro
      const strongRecipes = findMacroStrongRecipes(
        availableRecipes,
        mealType,
        primaryWeakness.macro_type,
        recipeBaseData,
        scalabilityData,
        mealData.recipe.recipe_id
      );
      
      // Evaluate each strong recipe as a potential replacement
      for (const strongRecipe of strongRecipes) {
        const swapCandidate = evaluateSwap(
          currentCombination,
          mealType,
          strongRecipe,
          primaryWeakness,
          recipeBaseData,
          criteria
        );
        
        if (!swapCandidate) continue;
        
        // Calculate combined benefit score
        const scoreBenefit = swapCandidate.improvement.score_change * criteria.swapPreferences.scoreWeight;
        const macroBenefit = swapCandidate.improvement.deviation_improvement * (1 - criteria.swapPreferences.scoreWeight);
        const varietyPenalty = swapCandidate.trade_offs.variety_impact;
        
        const totalBenefit = scoreBenefit + macroBenefit + varietyPenalty;
        
        if (totalBenefit > criteria.minImprovementThreshold && 
            (!bestSwap || totalBenefit > bestSwap.improvement.score_change + bestSwap.improvement.deviation_improvement)) {
          bestSwap = swapCandidate;
        }
      }
    }
    
    // Execute the best swap if found
    if (bestSwap) {
      currentCombination = executeSwap(currentCombination, bestSwap, recipeBaseData);
      
      swapsMade.push({
        meal_type: bestSwap.meal_type,
        old_recipe: bestSwap.current_recipe.recipe_name,
        new_recipe: bestSwap.replacement_recipe.recipe_name,
        reason: `Improve ${primaryWeakness.macro_type} (${primaryWeakness.deviation_percent.toFixed(1)}% deviation)`
      });
    } else {
      break; // No beneficial swaps found
    }
  }
  
  // Final analysis
  const finalWeaknesses = identifyMacroWeaknesses(currentCombination, criteria.macroTolerances);
  const originalWeaknesses = identifyMacroWeaknesses(combination, criteria.macroTolerances);
  
  const scoreImprovement = currentCombination.average_score - combination.average_score;
  const deviationReduction = combination.deviation.total_percent - currentCombination.deviation.total_percent;
  const weakMacrosFixed = originalWeaknesses.length - finalWeaknesses.length;
  
  // Quality score (0-100)
  const qualityScore = Math.min(100, 
    (currentCombination.average_score * 0.6) + 
    (Math.max(0, 100 - currentCombination.deviation.total_percent) * 0.4)
  );
  
  return {
    original_combination: combination,
    optimized_combination: currentCombination,
    improvements: {
      score_improvement: Math.round(scoreImprovement * 100) / 100,
      deviation_reduction: Math.round(deviationReduction * 100) / 100,
      weak_macros_fixed: weakMacrosFixed
    },
    swaps_made: swapsMade,
    final_analysis: {
      remaining_weaknesses: finalWeaknesses,
      optimization_success: swapsMade.length > 0 && (scoreImprovement > 0 || deviationReduction > 0),
      quality_score: Math.round(qualityScore * 100) / 100
    }
  };
}
 