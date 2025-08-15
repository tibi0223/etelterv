/**
 * Master Meal Plan Generator
 * Orchestrates the complete meal planning algorithm using all components
 */

import { calculateCosineSimilarity } from './similarityCalculator';
import { calculateRecipeScore, RecipeScalability } from './recipeScorer';
import { strictPreFilterRecipes } from './strictPreFilter';
import { rankRecipesWithVariety, RecipeWithHistory } from './recipeRanker';
import { selectTopRecipesByCategory, MealCombination } from './mealCombiner';
import { swapWeakMacroRecipes } from './mealOptimizer';
import { 
  solveLPOptimization, 
  createDefaultOptimizationCriteria,
  LPOptimizationInput,
  LPOptimizationResult,
  IngredientConstraint 
} from './lpOptimizer';
import { 
  validateMealPlan, 
  createDefaultValidationCriteria,
  quickValidationCheck,
  ValidationResult 
} from './mealValidator';

export interface MasterGenerationInput {
  // Target macros
  target_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  
  // Available recipes with history data
  recipes: RecipeWithHistory[];
  
  // Recipe scalability data (from database)
  scalability_data: RecipeScalability[];
  
  // User preferences
  preferences: {
    meal_count: number;                    // 3 or 4 meals
    preferred_meal_types: string[];        // ['reggeli', 'ebéd', 'vacsora', 'uzsonna']
    exclude_recipe_ids?: number[];         // Recipes to avoid
    favorite_boost: number;                // Extra points for favorites (default: 10)
    recent_penalty: number;                // Penalty for recent recipes (default: 10)
  };
  
  // Algorithm settings
  algorithm_settings: {
    max_attempts: number;                  // Max iterations (default: 10)
    score_threshold: number;               // Min average score (default: 80)
    deviation_threshold: number;           // Max deviation for LP trigger (default: 12%)
    final_deviation_limit: number;         // Max final deviation (default: 20%)
    enable_lp_optimization: boolean;       // Use LP optimization (default: true)
    enable_recipe_swapping: boolean;       // Use recipe swapping (default: true)
  };
}

export interface MasterGenerationResult {
  success: boolean;
  status: 'success' | 'failed_validation' | 'failed_generation' | 'failed_optimization' | 'max_attempts_reached';
  
  // Final meal plan
  final_meal_plan?: MealCombination;
  
  // Optimization results (if applied)
  lp_optimization?: LPOptimizationResult;
  
  // Validation results
  validation: ValidationResult;
  
  // Generation process metadata
  generation_metadata: {
    total_attempts: number;
    filtered_recipes_count: number;
    initial_combination_score: number;
    swapping_applied: boolean;
    lp_optimization_applied: boolean;
    generation_time_ms: number;
    steps_completed: string[];
    failure_reasons?: string[];
  };
  
  // Quality metrics
  quality_metrics: {
    final_deviation_percent: number;
    final_average_score: number;
    recipe_diversity_score: number;        // How varied the recipes are
    nutritional_balance_score: number;     // How balanced the nutrition is
    user_satisfaction_score: number;       // Predicted user satisfaction
  };
}

/**
 * Generate a complete meal plan using the master algorithm
 */
export async function generateMasterMealPlan(
  input: MasterGenerationInput
): Promise<MasterGenerationResult> {
  
  const startTime = Date.now();
  const stepsCompleted: string[] = [];
  const failureReasons: string[] = [];
  
  try {
    // Initialize result structure
    let result: MasterGenerationResult = {
      success: false,
      status: 'failed_generation',
      validation: {} as ValidationResult,
      generation_metadata: {
        total_attempts: 0,
        filtered_recipes_count: 0,
        initial_combination_score: 0,
        swapping_applied: false,
        lp_optimization_applied: false,
        generation_time_ms: 0,
        steps_completed: [],
        failure_reasons: []
      },
      quality_metrics: {
        final_deviation_percent: 100,
        final_average_score: 0,
        recipe_diversity_score: 0,
        nutritional_balance_score: 0,
        user_satisfaction_score: 0
      }
    };

    console.log('🚀 Starting Master Meal Plan Generation...');
    
    // STEP 1: Strict pre-filtering by macro structure (only if ingredient data is available)
    console.log('📊 Step 1: Strict pre-filtering by macro structure...');
    const hasIngredientData = Array.isArray((input.recipes as any)) && (input.recipes as any).some((r: any) => r.ingredients?.length || r.hozzávalók?.length);
    let filteredRecipes: any[];
    if (hasIngredientData) {
      const pf = strictPreFilterRecipes(
        input.recipes as any,
        (globalThis as any).__nutritionStore ?? [],
        input.target_macros
      );
      pf.rejections.forEach(r => {
        console.log(`🚫 [PreFilter] ${r.recipeName} (${r.recipeId}) rejected: ${r.reasons.join(', ')}`);
      });
      filteredRecipes = pf.accepted as any;
    } else {
      console.log('ℹ️ No ingredient-level data detected in recipes. Skipping strict pre-filter for this run.');
      filteredRecipes = input.recipes as any;
    }
    
    result.generation_metadata.filtered_recipes_count = filteredRecipes.length;
    stepsCompleted.push('recipe_filtering');
    
    if (filteredRecipes.length < input.preferences.meal_count) {
      failureReasons.push(`Not enough recipes after filtering: ${filteredRecipes.length} < ${input.preferences.meal_count}`);
      throw new Error('Insufficient recipes after filtering');
    }
    
    console.log(`✅ Filtered to ${filteredRecipes.length} suitable recipes`);

    // STEP 2: Calculate recipe scores
    console.log('🔢 Step 2: Calculating recipe scores...');
    const scoredRecipes = filteredRecipes.map(recipe => {
      const scalability = input.scalability_data.find(s => s.recipe_id === recipe.recipe_id);
      if (!scalability) {
        console.warn(`No scalability data for recipe ${recipe.recipe_id}, using defaults`);
      }
      
      const score = calculateRecipeScore(
        recipe,
        input.target_macros,
        scalability || {
          recipe_id: recipe.recipe_id,
          protein_scalability: 0.5,
          carbs_scalability: 0.5,
          fat_scalability: 0.5,
          protein_density: 20,
          carbs_density: 50,
          fat_density: 15
        }
      );
      
      return {
        ...recipe,
        base_score: score.total_score,
        cosine_similarity: score.cosine_similarity,
        weighted_scalability: score.weighted_scalability
      };
    });
    
    stepsCompleted.push('recipe_scoring');
    console.log(`✅ Calculated scores for ${scoredRecipes.length} recipes`);

    // STEP 3: Apply variety logic (ranking with penalties/rewards)
    console.log('🎲 Step 3: Applying variety logic...');
    const rankedRecipes = rankRecipesWithVariety(
      scoredRecipes,
      {
        recent_usage_penalty: input.preferences.recent_penalty,
        favorite_not_used_reward: input.preferences.favorite_boost,
        recent_days_threshold: 3,
        favorite_days_threshold: 7
      }
    );
    
    stepsCompleted.push('recipe_ranking');
    console.log(`✅ Applied variety penalties and rewards`);

    // MAIN GENERATION LOOP
    let currentAttempt = 0;
    let bestCombination: MealCombination | null = null;
    let bestScore = 0;
    
    while (currentAttempt < input.algorithm_settings.max_attempts) {
      currentAttempt++;
      console.log(`\n🔄 Attempt ${currentAttempt}/${input.algorithm_settings.max_attempts}`);
      
      try {
        // STEP 4: Select top recipes by category
        console.log('🍽️ Step 4: Selecting top recipes by meal categories...');
        const combination = selectTopRecipesByCategory(
          rankedRecipes,
          input.target_macros,
          {
            meal_types: input.preferences.preferred_meal_types,
            min_average_score: input.algorithm_settings.score_threshold,
            enable_smart_selection: true,
            exclude_recipe_ids: input.preferences.exclude_recipe_ids
          }
        );
        
        if (!combination.meets_threshold) {
          console.log(`❌ Combination score ${combination.average_score.toFixed(1)} below threshold ${input.algorithm_settings.score_threshold}`);
          
          if (currentAttempt === 1) {
            result.generation_metadata.initial_combination_score = combination.average_score;
          }
          
          // Try recipe swapping if enabled
          if (input.algorithm_settings.enable_recipe_swapping) {
            console.log('🔄 Attempting recipe swapping...');
            const swappedCombination = swapWeakMacroRecipes(
              combination,
              rankedRecipes,
              input.target_macros,
              {
                min_improvement_threshold: 5,
                max_swaps_per_attempt: 2,
                prefer_higher_scores: true
              }
            );
            
            if (swappedCombination.average_score > combination.average_score) {
              console.log(`✅ Swapping improved score: ${combination.average_score.toFixed(1)} → ${swappedCombination.average_score.toFixed(1)}`);
              Object.assign(combination, swappedCombination);
              result.generation_metadata.swapping_applied = true;
            }
          }
          
          if (!combination.meets_threshold) {
            continue; // Try next attempt
          }
        }
        
        if (currentAttempt === 1) {
          result.generation_metadata.initial_combination_score = combination.average_score;
          stepsCompleted.push('recipe_combination');
        }
        
        console.log(`✅ Generated combination with ${combination.average_score.toFixed(1)} average score`);

        // STEP 5: Check if LP optimization is needed
        const needsOptimization = combination.deviation.total_percent > input.algorithm_settings.deviation_threshold;
        let finalCombination = combination;
        let lpResult: LPOptimizationResult | undefined;
        
        if (needsOptimization && input.algorithm_settings.enable_lp_optimization) {
          console.log(`🧮 Step 5: LP optimization needed (${combination.deviation.total_percent.toFixed(1)}% > ${input.algorithm_settings.deviation_threshold}%)`);
          
          // Create mock ingredient constraints (in real implementation, this would come from database)
          const ingredientConstraints: IngredientConstraint[] = createMockIngredientConstraints(combination);
          
          const lpInput: LPOptimizationInput = {
            combination: combination,
            ingredient_constraints: ingredientConstraints,
            scalability_data: input.scalability_data,
            optimization_criteria: createDefaultOptimizationCriteria(input.target_macros)
          };
          
          lpResult = solveLPOptimization(lpInput);
          
          if (lpResult.success) {
            console.log(`✅ LP optimization successful: ${combination.deviation.total_percent.toFixed(1)}% → ${lpResult.deviations.total_percent.toFixed(1)}%`);
            result.generation_metadata.lp_optimization_applied = true;
            stepsCompleted.push('lp_optimization');
          } else {
            console.log(`❌ LP optimization failed: ${lpResult.status}`);
            failureReasons.push(`LP optimization failed: ${lpResult.status}`);
          }
        } else {
          console.log(`✅ Step 5: No LP optimization needed (${combination.deviation.total_percent.toFixed(1)}% ≤ ${input.algorithm_settings.deviation_threshold}%)`);
        }

        // STEP 6: Validate final result
        console.log('✅ Step 6: Validating final meal plan...');
        const validationCriteria = createDefaultValidationCriteria(input.preferences.meal_count);
        validationCriteria.max_total_deviation_percent = input.algorithm_settings.final_deviation_limit;
        
        const validation = validateMealPlan(finalCombination, validationCriteria, lpResult);
        
        if (validation.is_valid) {
          console.log(`🎉 SUCCESSFUL GENERATION! (Score: ${validation.overall_score}/100)`);
          
          result.success = true;
          result.status = 'success';
          result.final_meal_plan = finalCombination;
          result.lp_optimization = lpResult;
          result.validation = validation;
          result.generation_metadata.total_attempts = currentAttempt;
          
          stepsCompleted.push('validation_passed');
          break;
        } else {
          console.log(`❌ Validation failed (Score: ${validation.overall_score}/100)`);
          failureReasons.push(`Validation failed: ${validation.validation_summary.critical_failures.join(', ')}`);
          
          // Keep track of best attempt
          if (combination.average_score > bestScore) {
            bestCombination = combination;
            bestScore = combination.average_score;
          }
        }
        
      } catch (error) {
        console.error(`❌ Attempt ${currentAttempt} failed:`, error);
        failureReasons.push(`Attempt ${currentAttempt}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Final result processing
    result.generation_metadata.total_attempts = currentAttempt;
    result.generation_metadata.generation_time_ms = Date.now() - startTime;
    result.generation_metadata.steps_completed = stepsCompleted;
    result.generation_metadata.failure_reasons = failureReasons;

    if (!result.success) {
      if (currentAttempt >= input.algorithm_settings.max_attempts) {
        result.status = 'max_attempts_reached';
        console.log(`❌ Maximum attempts (${input.algorithm_settings.max_attempts}) reached without success`);
      } else {
        result.status = 'failed_validation';
        console.log(`❌ Generation failed after ${currentAttempt} attempts`);
      }
      
      // Use best combination found
      if (bestCombination) {
        result.final_meal_plan = bestCombination;
        const finalValidation = validateMealPlan(
          bestCombination, 
          createDefaultValidationCriteria(input.preferences.meal_count)
        );
        result.validation = finalValidation;
      }
    }

    // Calculate quality metrics
    if (result.final_meal_plan) {
      result.quality_metrics = calculateQualityMetrics(result.final_meal_plan, result.lp_optimization);
    }

    return result;

  } catch (error) {
    const endTime = Date.now();
    console.error('❌ Master generation failed:', error);
    
    return {
      success: false,
      status: 'failed_generation',
      validation: {} as ValidationResult,
      generation_metadata: {
        total_attempts: 0,
        filtered_recipes_count: 0,
        initial_combination_score: 0,
        swapping_applied: false,
        lp_optimization_applied: false,
        generation_time_ms: endTime - startTime,
        steps_completed: stepsCompleted,
        failure_reasons: [error instanceof Error ? error.message : 'Unknown error']
      },
      quality_metrics: {
        final_deviation_percent: 100,
        final_average_score: 0,
        recipe_diversity_score: 0,
        nutritional_balance_score: 0,
        user_satisfaction_score: 0
      }
    };
  }
}

/**
 * Create mock ingredient constraints for LP optimization
 * In real implementation, this would query the database
 */
function createMockIngredientConstraints(combination: MealCombination): IngredientConstraint[] {
  const constraints: IngredientConstraint[] = [];
  
  Object.entries(combination.meals).forEach(([mealType, meal]) => {
    // Mock main ingredient constraint
    constraints.push({
      ingredient_id: meal.recipe.recipe_id * 100, // Mock ID
      ingredient_name: `Main ingredient for ${meal.recipe.recipe_name}`,
      recipe_id: meal.recipe.recipe_id,
      recipe_name: meal.recipe.recipe_name,
      meal_type: mealType,
      protein_per_g: meal.assigned_macros.protein / 100, // Assume 100g base
      carbs_per_g: meal.assigned_macros.carbs / 100,
      fat_per_g: meal.assigned_macros.fat / 100,
      calories_per_g: meal.assigned_macros.calories / 100,
      base_quantity: 100,
      min_scale_factor: 0.7,
      max_scale_factor: 2.5,
      ingredient_type: 'FO_MAKRO'
    });
  });
  
  return constraints;
}

/**
 * Calculate quality metrics for the final meal plan
 */
function calculateQualityMetrics(
  mealPlan: MealCombination,
  lpResult?: LPOptimizationResult
): MasterGenerationResult['quality_metrics'] {
  
  const finalDeviation = lpResult?.success ? 
    lpResult.deviations.total_percent : 
    mealPlan.deviation.total_percent;
  
  const finalScore = mealPlan.average_score;
  
  // Recipe diversity (how different are the recipes)
  const recipeIds = Object.values(mealPlan.meals).map(meal => meal.recipe.recipe_id);
  const uniqueRecipes = new Set(recipeIds).size;
  const diversityScore = (uniqueRecipes / recipeIds.length) * 100;
  
  // Nutritional balance (how well distributed are the macros)
  const macros = lpResult?.success ? lpResult.optimized_macros : mealPlan.total_macros;
  const proteinPercent = (macros.protein * 4) / macros.calories * 100;
  const carbPercent = (macros.carbs * 4) / macros.calories * 100;
  const fatPercent = (macros.fat * 9) / macros.calories * 100;
  
  // Ideal ranges: Protein 15-25%, Carbs 45-65%, Fat 20-35%
  const proteinBalance = Math.max(0, 100 - Math.abs(proteinPercent - 20) * 5);
  const carbBalance = Math.max(0, 100 - Math.abs(carbPercent - 55) * 2);
  const fatBalance = Math.max(0, 100 - Math.abs(fatPercent - 27.5) * 3);
  const nutritionalBalance = (proteinBalance + carbBalance + fatBalance) / 3;
  
  // User satisfaction prediction
  const deviationFactor = Math.max(0, 100 - finalDeviation * 4); // 25% deviation = 0 satisfaction
  const scoreFactor = Math.min(100, finalScore * 1.25); // 80 score = 100 satisfaction
  const userSatisfaction = (deviationFactor + scoreFactor) / 2;
  
  return {
    final_deviation_percent: Math.round(finalDeviation * 100) / 100,
    final_average_score: Math.round(finalScore * 100) / 100,
    recipe_diversity_score: Math.round(diversityScore * 100) / 100,
    nutritional_balance_score: Math.round(nutritionalBalance * 100) / 100,
    user_satisfaction_score: Math.round(userSatisfaction * 100) / 100
  };
}

/**
 * Create default generation settings
 */
export function createDefaultMasterSettings(): MasterGenerationInput['algorithm_settings'] {
  return {
    max_attempts: 10,
    score_threshold: 80,
    deviation_threshold: 12,
    final_deviation_limit: 20,
    enable_lp_optimization: true,
    enable_recipe_swapping: true
  };
}

/**
 * Create default user preferences
 */
export function createDefaultUserPreferences(): MasterGenerationInput['preferences'] {
  return {
    meal_count: 3,
    preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
    favorite_boost: 10,
    recent_penalty: 10
  };
}

import { calculateCosineSimilarity } from './similarityCalculator';
import { calculateRecipeScore, RecipeScalability } from './recipeScorer';
import { filterRecipesByMacroProfile } from './recipeFilter';
import { rankRecipesWithVariety, RecipeWithHistory } from './recipeRanker';
import { selectTopRecipesByCategory, MealCombination } from './mealCombiner';
import { swapWeakMacroRecipes } from './mealOptimizer';
import { 
  solveLPOptimization, 
  createDefaultOptimizationCriteria,
  LPOptimizationInput,
  LPOptimizationResult,
  IngredientConstraint 
} from './lpOptimizer';
import { 
  validateMealPlan, 
  createDefaultValidationCriteria,
  quickValidationCheck,
  ValidationResult 
} from './mealValidator';

export interface MasterGenerationInput {
  // Target macros
  target_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  
  // Available recipes with history data
  recipes: RecipeWithHistory[];
  
  // Recipe scalability data (from database)
  scalability_data: RecipeScalability[];
  
  // User preferences
  preferences: {
    meal_count: number;                    // 3 or 4 meals
    preferred_meal_types: string[];        // ['reggeli', 'ebéd', 'vacsora', 'uzsonna']
    exclude_recipe_ids?: number[];         // Recipes to avoid
    favorite_boost: number;                // Extra points for favorites (default: 10)
    recent_penalty: number;                // Penalty for recent recipes (default: 10)
  };
  
  // Algorithm settings
  algorithm_settings: {
    max_attempts: number;                  // Max iterations (default: 10)
    score_threshold: number;               // Min average score (default: 80)
    deviation_threshold: number;           // Max deviation for LP trigger (default: 12%)
    final_deviation_limit: number;         // Max final deviation (default: 20%)
    enable_lp_optimization: boolean;       // Use LP optimization (default: true)
    enable_recipe_swapping: boolean;       // Use recipe swapping (default: true)
  };
}

export interface MasterGenerationResult {
  success: boolean;
  status: 'success' | 'failed_validation' | 'failed_generation' | 'failed_optimization' | 'max_attempts_reached';
  
  // Final meal plan
  final_meal_plan?: MealCombination;
  
  // Optimization results (if applied)
  lp_optimization?: LPOptimizationResult;
  
  // Validation results
  validation: ValidationResult;
  
  // Generation process metadata
  generation_metadata: {
    total_attempts: number;
    filtered_recipes_count: number;
    initial_combination_score: number;
    swapping_applied: boolean;
    lp_optimization_applied: boolean;
    generation_time_ms: number;
    steps_completed: string[];
    failure_reasons?: string[];
  };
  
  // Quality metrics
  quality_metrics: {
    final_deviation_percent: number;
    final_average_score: number;
    recipe_diversity_score: number;        // How varied the recipes are
    nutritional_balance_score: number;     // How balanced the nutrition is
    user_satisfaction_score: number;       // Predicted user satisfaction
  };
}

/**
 * Generate a complete meal plan using the master algorithm
 */
export async function generateMasterMealPlan(
  input: MasterGenerationInput
): Promise<MasterGenerationResult> {
  
  const startTime = Date.now();
  const stepsCompleted: string[] = [];
  const failureReasons: string[] = [];
  
  try {
    // Initialize result structure
    let result: MasterGenerationResult = {
      success: false,
      status: 'failed_generation',
      validation: {} as ValidationResult,
      generation_metadata: {
        total_attempts: 0,
        filtered_recipes_count: 0,
        initial_combination_score: 0,
        swapping_applied: false,
        lp_optimization_applied: false,
        generation_time_ms: 0,
        steps_completed: [],
        failure_reasons: []
      },
      quality_metrics: {
        final_deviation_percent: 100,
        final_average_score: 0,
        recipe_diversity_score: 0,
        nutritional_balance_score: 0,
        user_satisfaction_score: 0
      }
    };

    console.log('🚀 Starting Master Meal Plan Generation...');
    
    // STEP 1: Filter recipes by macro profile
    console.log('📊 Step 1: Filtering recipes by macro profile...');
    const filteredRecipes = filterRecipesByMacroProfile(
      input.recipes,
      input.target_macros,
      { 
        similarity_threshold: 0.3,
        max_recipes_per_category: 20,
        enable_category_balancing: true
      }
    );
    
    result.generation_metadata.filtered_recipes_count = filteredRecipes.length;
    stepsCompleted.push('recipe_filtering');
    
    if (filteredRecipes.length < input.preferences.meal_count) {
      failureReasons.push(`Not enough recipes after filtering: ${filteredRecipes.length} < ${input.preferences.meal_count}`);
      throw new Error('Insufficient recipes after filtering');
    }
    
    console.log(`✅ Filtered to ${filteredRecipes.length} suitable recipes`);

    // STEP 2: Calculate recipe scores
    console.log('🔢 Step 2: Calculating recipe scores...');
    const scoredRecipes = filteredRecipes.map(recipe => {
      const scalability = input.scalability_data.find(s => s.recipe_id === recipe.recipe_id);
      if (!scalability) {
        console.warn(`No scalability data for recipe ${recipe.recipe_id}, using defaults`);
      }
      
      const score = calculateRecipeScore(
        recipe,
        input.target_macros,
        scalability || {
          recipe_id: recipe.recipe_id,
          protein_scalability: 0.5,
          carbs_scalability: 0.5,
          fat_scalability: 0.5,
          protein_density: 20,
          carbs_density: 50,
          fat_density: 15
        }
      );
      
      return {
        ...recipe,
        base_score: score.total_score,
        cosine_similarity: score.cosine_similarity,
        weighted_scalability: score.weighted_scalability
      };
    });
    
    stepsCompleted.push('recipe_scoring');
    console.log(`✅ Calculated scores for ${scoredRecipes.length} recipes`);

    // STEP 3: Apply variety logic (ranking with penalties/rewards)
    console.log('🎲 Step 3: Applying variety logic...');
    const rankedRecipes = rankRecipesWithVariety(
      scoredRecipes,
      {
        recent_usage_penalty: input.preferences.recent_penalty,
        favorite_not_used_reward: input.preferences.favorite_boost,
        recent_days_threshold: 3,
        favorite_days_threshold: 7
      }
    );
    
    stepsCompleted.push('recipe_ranking');
    console.log(`✅ Applied variety penalties and rewards`);

    // MAIN GENERATION LOOP
    let currentAttempt = 0;
    let bestCombination: MealCombination | null = null;
    let bestScore = 0;
    
    while (currentAttempt < input.algorithm_settings.max_attempts) {
      currentAttempt++;
      console.log(`\n🔄 Attempt ${currentAttempt}/${input.algorithm_settings.max_attempts}`);
      
      try {
        // STEP 4: Select top recipes by category
        console.log('🍽️ Step 4: Selecting top recipes by meal categories...');
        const combination = selectTopRecipesByCategory(
          rankedRecipes,
          input.target_macros,
          {
            meal_types: input.preferences.preferred_meal_types,
            min_average_score: input.algorithm_settings.score_threshold,
            enable_smart_selection: true,
            exclude_recipe_ids: input.preferences.exclude_recipe_ids
          }
        );
        
        if (!combination.meets_threshold) {
          console.log(`❌ Combination score ${combination.average_score.toFixed(1)} below threshold ${input.algorithm_settings.score_threshold}`);
          
          if (currentAttempt === 1) {
            result.generation_metadata.initial_combination_score = combination.average_score;
          }
          
          // Try recipe swapping if enabled
          if (input.algorithm_settings.enable_recipe_swapping) {
            console.log('🔄 Attempting recipe swapping...');
            const swappedCombination = swapWeakMacroRecipes(
              combination,
              rankedRecipes,
              input.target_macros,
              {
                min_improvement_threshold: 5,
                max_swaps_per_attempt: 2,
                prefer_higher_scores: true
              }
            );
            
            if (swappedCombination.average_score > combination.average_score) {
              console.log(`✅ Swapping improved score: ${combination.average_score.toFixed(1)} → ${swappedCombination.average_score.toFixed(1)}`);
              Object.assign(combination, swappedCombination);
              result.generation_metadata.swapping_applied = true;
            }
          }
          
          if (!combination.meets_threshold) {
            continue; // Try next attempt
          }
        }
        
        if (currentAttempt === 1) {
          result.generation_metadata.initial_combination_score = combination.average_score;
          stepsCompleted.push('recipe_combination');
        }
        
        console.log(`✅ Generated combination with ${combination.average_score.toFixed(1)} average score`);

        // STEP 5: Check if LP optimization is needed
        const needsOptimization = combination.deviation.total_percent > input.algorithm_settings.deviation_threshold;
        let finalCombination = combination;
        let lpResult: LPOptimizationResult | undefined;
        
        if (needsOptimization && input.algorithm_settings.enable_lp_optimization) {
          console.log(`🧮 Step 5: LP optimization needed (${combination.deviation.total_percent.toFixed(1)}% > ${input.algorithm_settings.deviation_threshold}%)`);
          
          // Create mock ingredient constraints (in real implementation, this would come from database)
          const ingredientConstraints: IngredientConstraint[] = createMockIngredientConstraints(combination);
          
          const lpInput: LPOptimizationInput = {
            combination: combination,
            ingredient_constraints: ingredientConstraints,
            scalability_data: input.scalability_data,
            optimization_criteria: createDefaultOptimizationCriteria(input.target_macros)
          };
          
          lpResult = solveLPOptimization(lpInput);
          
          if (lpResult.success) {
            console.log(`✅ LP optimization successful: ${combination.deviation.total_percent.toFixed(1)}% → ${lpResult.deviations.total_percent.toFixed(1)}%`);
            result.generation_metadata.lp_optimization_applied = true;
            stepsCompleted.push('lp_optimization');
          } else {
            console.log(`❌ LP optimization failed: ${lpResult.status}`);
            failureReasons.push(`LP optimization failed: ${lpResult.status}`);
          }
        } else {
          console.log(`✅ Step 5: No LP optimization needed (${combination.deviation.total_percent.toFixed(1)}% ≤ ${input.algorithm_settings.deviation_threshold}%)`);
        }

        // STEP 6: Validate final result
        console.log('✅ Step 6: Validating final meal plan...');
        const validationCriteria = createDefaultValidationCriteria(input.preferences.meal_count);
        validationCriteria.max_total_deviation_percent = input.algorithm_settings.final_deviation_limit;
        
        const validation = validateMealPlan(finalCombination, validationCriteria, lpResult);
        
        if (validation.is_valid) {
          console.log(`🎉 SUCCESSFUL GENERATION! (Score: ${validation.overall_score}/100)`);
          
          result.success = true;
          result.status = 'success';
          result.final_meal_plan = finalCombination;
          result.lp_optimization = lpResult;
          result.validation = validation;
          result.generation_metadata.total_attempts = currentAttempt;
          
          stepsCompleted.push('validation_passed');
          break;
        } else {
          console.log(`❌ Validation failed (Score: ${validation.overall_score}/100)`);
          failureReasons.push(`Validation failed: ${validation.validation_summary.critical_failures.join(', ')}`);
          
          // Keep track of best attempt
          if (combination.average_score > bestScore) {
            bestCombination = combination;
            bestScore = combination.average_score;
          }
        }
        
      } catch (error) {
        console.error(`❌ Attempt ${currentAttempt} failed:`, error);
        failureReasons.push(`Attempt ${currentAttempt}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Final result processing
    result.generation_metadata.total_attempts = currentAttempt;
    result.generation_metadata.generation_time_ms = Date.now() - startTime;
    result.generation_metadata.steps_completed = stepsCompleted;
    result.generation_metadata.failure_reasons = failureReasons;

    if (!result.success) {
      if (currentAttempt >= input.algorithm_settings.max_attempts) {
        result.status = 'max_attempts_reached';
        console.log(`❌ Maximum attempts (${input.algorithm_settings.max_attempts}) reached without success`);
      } else {
        result.status = 'failed_validation';
        console.log(`❌ Generation failed after ${currentAttempt} attempts`);
      }
      
      // Use best combination found
      if (bestCombination) {
        result.final_meal_plan = bestCombination;
        const finalValidation = validateMealPlan(
          bestCombination, 
          createDefaultValidationCriteria(input.preferences.meal_count)
        );
        result.validation = finalValidation;
      }
    }

    // Calculate quality metrics
    if (result.final_meal_plan) {
      result.quality_metrics = calculateQualityMetrics(result.final_meal_plan, result.lp_optimization);
    }

    return result;

  } catch (error) {
    const endTime = Date.now();
    console.error('❌ Master generation failed:', error);
    
    return {
      success: false,
      status: 'failed_generation',
      validation: {} as ValidationResult,
      generation_metadata: {
        total_attempts: 0,
        filtered_recipes_count: 0,
        initial_combination_score: 0,
        swapping_applied: false,
        lp_optimization_applied: false,
        generation_time_ms: endTime - startTime,
        steps_completed: stepsCompleted,
        failure_reasons: [error instanceof Error ? error.message : 'Unknown error']
      },
      quality_metrics: {
        final_deviation_percent: 100,
        final_average_score: 0,
        recipe_diversity_score: 0,
        nutritional_balance_score: 0,
        user_satisfaction_score: 0
      }
    };
  }
}

/**
 * Create mock ingredient constraints for LP optimization
 * In real implementation, this would query the database
 */
function createMockIngredientConstraints(combination: MealCombination): IngredientConstraint[] {
  const constraints: IngredientConstraint[] = [];
  
  Object.entries(combination.meals).forEach(([mealType, meal]) => {
    // Mock main ingredient constraint
    constraints.push({
      ingredient_id: meal.recipe.recipe_id * 100, // Mock ID
      ingredient_name: `Main ingredient for ${meal.recipe.recipe_name}`,
      recipe_id: meal.recipe.recipe_id,
      recipe_name: meal.recipe.recipe_name,
      meal_type: mealType,
      protein_per_g: meal.assigned_macros.protein / 100, // Assume 100g base
      carbs_per_g: meal.assigned_macros.carbs / 100,
      fat_per_g: meal.assigned_macros.fat / 100,
      calories_per_g: meal.assigned_macros.calories / 100,
      base_quantity: 100,
      min_scale_factor: 0.7,
      max_scale_factor: 2.5,
      ingredient_type: 'FO_MAKRO'
    });
  });
  
  return constraints;
}

/**
 * Calculate quality metrics for the final meal plan
 */
function calculateQualityMetrics(
  mealPlan: MealCombination,
  lpResult?: LPOptimizationResult
): MasterGenerationResult['quality_metrics'] {
  
  const finalDeviation = lpResult?.success ? 
    lpResult.deviations.total_percent : 
    mealPlan.deviation.total_percent;
  
  const finalScore = mealPlan.average_score;
  
  // Recipe diversity (how different are the recipes)
  const recipeIds = Object.values(mealPlan.meals).map(meal => meal.recipe.recipe_id);
  const uniqueRecipes = new Set(recipeIds).size;
  const diversityScore = (uniqueRecipes / recipeIds.length) * 100;
  
  // Nutritional balance (how well distributed are the macros)
  const macros = lpResult?.success ? lpResult.optimized_macros : mealPlan.total_macros;
  const proteinPercent = (macros.protein * 4) / macros.calories * 100;
  const carbPercent = (macros.carbs * 4) / macros.calories * 100;
  const fatPercent = (macros.fat * 9) / macros.calories * 100;
  
  // Ideal ranges: Protein 15-25%, Carbs 45-65%, Fat 20-35%
  const proteinBalance = Math.max(0, 100 - Math.abs(proteinPercent - 20) * 5);
  const carbBalance = Math.max(0, 100 - Math.abs(carbPercent - 55) * 2);
  const fatBalance = Math.max(0, 100 - Math.abs(fatPercent - 27.5) * 3);
  const nutritionalBalance = (proteinBalance + carbBalance + fatBalance) / 3;
  
  // User satisfaction prediction
  const deviationFactor = Math.max(0, 100 - finalDeviation * 4); // 25% deviation = 0 satisfaction
  const scoreFactor = Math.min(100, finalScore * 1.25); // 80 score = 100 satisfaction
  const userSatisfaction = (deviationFactor + scoreFactor) / 2;
  
  return {
    final_deviation_percent: Math.round(finalDeviation * 100) / 100,
    final_average_score: Math.round(finalScore * 100) / 100,
    recipe_diversity_score: Math.round(diversityScore * 100) / 100,
    nutritional_balance_score: Math.round(nutritionalBalance * 100) / 100,
    user_satisfaction_score: Math.round(userSatisfaction * 100) / 100
  };
}

/**
 * Create default generation settings
 */
export function createDefaultMasterSettings(): MasterGenerationInput['algorithm_settings'] {
  return {
    max_attempts: 10,
    score_threshold: 80,
    deviation_threshold: 12,
    final_deviation_limit: 20,
    enable_lp_optimization: true,
    enable_recipe_swapping: true
  };
}

/**
 * Create default user preferences
 */
export function createDefaultUserPreferences(): MasterGenerationInput['preferences'] {
  return {
    meal_count: 3,
    preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
    favorite_boost: 10,
    recent_penalty: 10
  };
}
 