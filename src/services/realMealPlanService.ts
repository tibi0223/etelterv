/**
 * Real Meal Plan Service
 * Integration layer between the master algorithm and the database
 */

import {
  generateMasterMealPlan,
  createDefaultMasterSettings,
  createDefaultUserPreferences,
  MasterGenerationInput,
  MasterGenerationResult
} from './masterMealPlanGenerator';

import {
  fetchRecipesWithMacros,
  fetchUserMealHistory,
  fetchRecipeScalability,
  fetchUserFavorites,
  saveMealPlanToHistory,
  fetchIngredientConstraints,
  transformToRecipeWithHistory
} from './database/newMealPlanQueries';

export interface RealMealPlanRequest {
  user_id: string;
  target_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  preferences?: {
    meal_count?: number;
    preferred_meal_types?: string[];
    exclude_recipe_ids?: number[];
    favorite_boost?: number;
    recent_penalty?: number;
  };
  algorithm_settings?: {
    max_attempts?: number;
    score_threshold?: number;
    deviation_threshold?: number;
    final_deviation_limit?: number;
    enable_lp_optimization?: boolean;
    enable_recipe_swapping?: boolean;
  };
  save_to_history?: boolean;
}

export interface RealMealPlanResponse {
  success: boolean;
  status: string;
  message: string;
  data?: {
    meal_plan: {
      [meal_type: string]: {
        recipe_id: number;
        recipe_name: string;
        final_score: number;
        macros: {
          protein: number;
          carbs: number;
          fat: number;
          calories: number;
        };
        is_favorite: boolean;
        penalty: number;
        reward: number;
      };
    };
    totals: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    targets: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    quality_metrics: {
      average_score: number;
      total_deviation_percent: number;
      recipe_diversity_score: number;
      nutritional_balance_score: number;
      user_satisfaction_score: number;
    };
    optimization_applied: {
      recipe_swapping: boolean;
      lp_optimization: boolean;
    };
    generation_metadata: {
      total_attempts: number;
      generation_time_ms: number;
      steps_completed: string[];
    };
  };
  debug_info?: {
    filtered_recipes_count: number;
    initial_combination_score: number;
    failure_reasons?: string[];
    validation_details?: any;
  };
}

/**
 * Generate a real meal plan using the master algorithm with database integration
 */
export async function generateRealMealPlan(
  request: RealMealPlanRequest
): Promise<RealMealPlanResponse> {
  
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting real meal plan generation for user ${request.user_id}`);

    // Step 1: Fetch all required data from database
    console.log('📊 Fetching data from database...');
    
    const [
      dbRecipes,
      userHistory,
      scalabilityData,
      userFavorites
    ] = await Promise.all([
      fetchRecipesWithMacros(),
      fetchUserMealHistory(request.user_id, 30),
      fetchRecipeScalability(),
      fetchUserFavorites(request.user_id)
    ]);

    console.log(`✅ Data fetched: ${dbRecipes.length} recipes, ${userHistory.length} history records, ${userFavorites.length} favorites`);

    // Step 2: Transform data to required format
    console.log('🔄 Transforming data...');
    
    const recipesWithHistory = transformToRecipeWithHistory(
      dbRecipes,
      userHistory,
      userFavorites
    );

    if (recipesWithHistory.length === 0) {
      return {
        success: false,
        status: 'no_recipes',
        message: 'No recipes found in database'
      };
    }

    // Step 3: Prepare algorithm input
    console.log('⚙️ Preparing algorithm input...');
    
    const defaultPreferences = createDefaultUserPreferences();
    const defaultSettings = createDefaultMasterSettings();

    const algorithmInput: MasterGenerationInput = {
      target_macros: request.target_macros,
      recipes: recipesWithHistory,
      scalability_data: scalabilityData,
      preferences: {
        ...defaultPreferences,
        ...request.preferences
      },
      algorithm_settings: {
        ...defaultSettings,
        ...request.algorithm_settings
      }
    };

    // Step 4: Generate meal plan using master algorithm
    console.log('🧠 Running master meal plan algorithm...');
    
    const masterResult: MasterGenerationResult = await generateMasterMealPlan(algorithmInput);

    // Step 5: Process results
    if (!masterResult.success || !masterResult.final_meal_plan) {
      return {
        success: false,
        status: masterResult.status,
        message: getErrorMessage(masterResult.status),
        debug_info: {
          filtered_recipes_count: masterResult.generation_metadata.filtered_recipes_count,
          initial_combination_score: masterResult.generation_metadata.initial_combination_score,
          failure_reasons: masterResult.generation_metadata.failure_reasons
        }
      };
    }

    // Step 6: Save to history if requested
    if (request.save_to_history !== false) {
      console.log('💾 Saving meal plan to history...');
      
      const historyRecords = Object.entries(masterResult.final_meal_plan.meals).map(([mealType, meal]) => ({
        recipe_id: meal.recipe.recipe_id,
        meal_type: mealType
      }));

      try {
        await saveMealPlanToHistory(request.user_id, historyRecords);
      } catch (historyError) {
        console.warn('⚠️ Failed to save to history, but continuing:', historyError);
      }
    }

    // Step 7: Format response
    console.log('✅ Formatting response...');
    
    const finalMacros = masterResult.lp_optimization?.success ? 
      masterResult.lp_optimization.optimized_macros : 
      masterResult.final_meal_plan.total_macros;

    const response: RealMealPlanResponse = {
      success: true,
      status: 'success',
      message: 'Meal plan generated successfully',
      data: {
        meal_plan: formatMealPlan(masterResult.final_meal_plan),
        totals: finalMacros,
        targets: request.target_macros,
        quality_metrics: masterResult.quality_metrics,
        optimization_applied: {
          recipe_swapping: masterResult.generation_metadata.swapping_applied,
          lp_optimization: masterResult.generation_metadata.lp_optimization_applied
        },
        generation_metadata: {
          total_attempts: masterResult.generation_metadata.total_attempts,
          generation_time_ms: masterResult.generation_metadata.generation_time_ms,
          steps_completed: masterResult.generation_metadata.steps_completed
        }
      },
      debug_info: {
        filtered_recipes_count: masterResult.generation_metadata.filtered_recipes_count,
        initial_combination_score: masterResult.generation_metadata.initial_combination_score,
        validation_details: masterResult.validation
      }
    };

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Real meal plan generation completed successfully in ${totalTime}ms`);

    return response;

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Real meal plan generation failed:', error);

    return {
      success: false,
      status: 'error',
      message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      debug_info: {
        filtered_recipes_count: 0,
        initial_combination_score: 0,
        failure_reasons: [error instanceof Error ? error.message : 'Unknown error']
      }
    };
  }
}

/**
 * Format meal plan for API response
 */
function formatMealPlan(mealPlan: any): RealMealPlanResponse['data']['meal_plan'] {
  const formatted: any = {};

  Object.entries(mealPlan.meals).forEach(([mealType, meal]: [string, any]) => {
    formatted[mealType] = {
      recipe_id: meal.recipe.recipe_id,
      recipe_name: meal.recipe.recipe_name,
      final_score: Math.round(meal.recipe.final_score * 10) / 10,
      macros: {
        protein: Math.round(meal.assigned_macros.protein * 10) / 10,
        carbs: Math.round(meal.assigned_macros.carbs * 10) / 10,
        fat: Math.round(meal.assigned_macros.fat * 10) / 10,
        calories: Math.round(meal.assigned_macros.calories)
      },
      is_favorite: meal.recipe.is_favorite || false,
      penalty: meal.recipe.penalty || 0,
      reward: meal.recipe.reward || 0
    };
  });

  return formatted;
}

/**
 * Get user-friendly error messages
 */
function getErrorMessage(status: string): string {
  switch (status) {
    case 'failed_validation':
      return 'Could not generate a meal plan that meets quality standards. Try adjusting your macro targets or preferences.';
    case 'failed_generation':
      return 'Failed to generate meal plan. This might be due to insufficient recipes or conflicting constraints.';
    case 'failed_optimization':
      return 'Generated meal plan but optimization failed. The plan may not meet all macro targets perfectly.';
    case 'max_attempts_reached':
      return 'Reached maximum generation attempts. The best available meal plan was returned, but it may not meet all criteria.';
    default:
      return 'An unexpected error occurred during meal plan generation.';
  }
}

/**
 * Quick meal plan generation with default settings
 */
export async function generateQuickMealPlan(
  userId: string,
  targetMacros: { protein: number; carbs: number; fat: number; calories: number }
): Promise<RealMealPlanResponse> {
  
  return generateRealMealPlan({
    user_id: userId,
    target_macros: targetMacros,
    save_to_history: true
  });
}

/**
 * Advanced meal plan generation with custom settings
 */
export async function generateAdvancedMealPlan(
  userId: string,
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  options: {
    mealCount?: number;
    excludeRecipes?: number[];
    maxAttempts?: number;
    enableLPOptimization?: boolean;
  }
): Promise<RealMealPlanResponse> {
  
  return generateRealMealPlan({
    user_id: userId,
    target_macros: targetMacros,
    preferences: {
      meal_count: options.mealCount || 3,
      exclude_recipe_ids: options.excludeRecipes,
      preferred_meal_types: options.mealCount === 4 ? 
        ['reggeli', 'ebéd', 'uzsonna', 'vacsora'] : 
        ['reggeli', 'ebéd', 'vacsora']
    },
    algorithm_settings: {
      max_attempts: options.maxAttempts || 10,
      enable_lp_optimization: options.enableLPOptimization !== false
    },
    save_to_history: true
  });
}
 * Real Meal Plan Service
 * Integration layer between the master algorithm and the database
 */

import {
  generateMasterMealPlan,
  createDefaultMasterSettings,
  createDefaultUserPreferences,
  MasterGenerationInput,
  MasterGenerationResult
} from './masterMealPlanGenerator';

import {
  fetchRecipesWithMacros,
  fetchUserMealHistory,
  fetchRecipeScalability,
  fetchUserFavorites,
  saveMealPlanToHistory,
  fetchIngredientConstraints,
  transformToRecipeWithHistory
} from './database/newMealPlanQueries';

export interface RealMealPlanRequest {
  user_id: string;
  target_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  preferences?: {
    meal_count?: number;
    preferred_meal_types?: string[];
    exclude_recipe_ids?: number[];
    favorite_boost?: number;
    recent_penalty?: number;
  };
  algorithm_settings?: {
    max_attempts?: number;
    score_threshold?: number;
    deviation_threshold?: number;
    final_deviation_limit?: number;
    enable_lp_optimization?: boolean;
    enable_recipe_swapping?: boolean;
  };
  save_to_history?: boolean;
}

export interface RealMealPlanResponse {
  success: boolean;
  status: string;
  message: string;
  data?: {
    meal_plan: {
      [meal_type: string]: {
        recipe_id: number;
        recipe_name: string;
        final_score: number;
        macros: {
          protein: number;
          carbs: number;
          fat: number;
          calories: number;
        };
        is_favorite: boolean;
        penalty: number;
        reward: number;
      };
    };
    totals: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    targets: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    quality_metrics: {
      average_score: number;
      total_deviation_percent: number;
      recipe_diversity_score: number;
      nutritional_balance_score: number;
      user_satisfaction_score: number;
    };
    optimization_applied: {
      recipe_swapping: boolean;
      lp_optimization: boolean;
    };
    generation_metadata: {
      total_attempts: number;
      generation_time_ms: number;
      steps_completed: string[];
    };
  };
  debug_info?: {
    filtered_recipes_count: number;
    initial_combination_score: number;
    failure_reasons?: string[];
    validation_details?: any;
  };
}

/**
 * Generate a real meal plan using the master algorithm with database integration
 */
export async function generateRealMealPlan(
  request: RealMealPlanRequest
): Promise<RealMealPlanResponse> {
  
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting real meal plan generation for user ${request.user_id}`);

    // Step 1: Fetch all required data from database
    console.log('📊 Fetching data from database...');
    
    const [
      dbRecipes,
      userHistory,
      scalabilityData,
      userFavorites
    ] = await Promise.all([
      fetchRecipesWithMacros(),
      fetchUserMealHistory(request.user_id, 30),
      fetchRecipeScalability(),
      fetchUserFavorites(request.user_id)
    ]);

    console.log(`✅ Data fetched: ${dbRecipes.length} recipes, ${userHistory.length} history records, ${userFavorites.length} favorites`);

    // Step 2: Transform data to required format
    console.log('🔄 Transforming data...');
    
    const recipesWithHistory = transformToRecipeWithHistory(
      dbRecipes,
      userHistory,
      userFavorites
    );

    if (recipesWithHistory.length === 0) {
      return {
        success: false,
        status: 'no_recipes',
        message: 'No recipes found in database'
      };
    }

    // Step 3: Prepare algorithm input
    console.log('⚙️ Preparing algorithm input...');
    
    const defaultPreferences = createDefaultUserPreferences();
    const defaultSettings = createDefaultMasterSettings();

    const algorithmInput: MasterGenerationInput = {
      target_macros: request.target_macros,
      recipes: recipesWithHistory,
      scalability_data: scalabilityData,
      preferences: {
        ...defaultPreferences,
        ...request.preferences
      },
      algorithm_settings: {
        ...defaultSettings,
        ...request.algorithm_settings
      }
    };

    // Step 4: Generate meal plan using master algorithm
    console.log('🧠 Running master meal plan algorithm...');
    
    const masterResult: MasterGenerationResult = await generateMasterMealPlan(algorithmInput);

    // Step 5: Process results
    if (!masterResult.success || !masterResult.final_meal_plan) {
      return {
        success: false,
        status: masterResult.status,
        message: getErrorMessage(masterResult.status),
        debug_info: {
          filtered_recipes_count: masterResult.generation_metadata.filtered_recipes_count,
          initial_combination_score: masterResult.generation_metadata.initial_combination_score,
          failure_reasons: masterResult.generation_metadata.failure_reasons
        }
      };
    }

    // Step 6: Save to history if requested
    if (request.save_to_history !== false) {
      console.log('💾 Saving meal plan to history...');
      
      const historyRecords = Object.entries(masterResult.final_meal_plan.meals).map(([mealType, meal]) => ({
        recipe_id: meal.recipe.recipe_id,
        meal_type: mealType
      }));

      try {
        await saveMealPlanToHistory(request.user_id, historyRecords);
      } catch (historyError) {
        console.warn('⚠️ Failed to save to history, but continuing:', historyError);
      }
    }

    // Step 7: Format response
    console.log('✅ Formatting response...');
    
    const finalMacros = masterResult.lp_optimization?.success ? 
      masterResult.lp_optimization.optimized_macros : 
      masterResult.final_meal_plan.total_macros;

    const response: RealMealPlanResponse = {
      success: true,
      status: 'success',
      message: 'Meal plan generated successfully',
      data: {
        meal_plan: formatMealPlan(masterResult.final_meal_plan),
        totals: finalMacros,
        targets: request.target_macros,
        quality_metrics: masterResult.quality_metrics,
        optimization_applied: {
          recipe_swapping: masterResult.generation_metadata.swapping_applied,
          lp_optimization: masterResult.generation_metadata.lp_optimization_applied
        },
        generation_metadata: {
          total_attempts: masterResult.generation_metadata.total_attempts,
          generation_time_ms: masterResult.generation_metadata.generation_time_ms,
          steps_completed: masterResult.generation_metadata.steps_completed
        }
      },
      debug_info: {
        filtered_recipes_count: masterResult.generation_metadata.filtered_recipes_count,
        initial_combination_score: masterResult.generation_metadata.initial_combination_score,
        validation_details: masterResult.validation
      }
    };

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Real meal plan generation completed successfully in ${totalTime}ms`);

    return response;

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Real meal plan generation failed:', error);

    return {
      success: false,
      status: 'error',
      message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      debug_info: {
        filtered_recipes_count: 0,
        initial_combination_score: 0,
        failure_reasons: [error instanceof Error ? error.message : 'Unknown error']
      }
    };
  }
}

/**
 * Format meal plan for API response
 */
function formatMealPlan(mealPlan: any): RealMealPlanResponse['data']['meal_plan'] {
  const formatted: any = {};

  Object.entries(mealPlan.meals).forEach(([mealType, meal]: [string, any]) => {
    formatted[mealType] = {
      recipe_id: meal.recipe.recipe_id,
      recipe_name: meal.recipe.recipe_name,
      final_score: Math.round(meal.recipe.final_score * 10) / 10,
      macros: {
        protein: Math.round(meal.assigned_macros.protein * 10) / 10,
        carbs: Math.round(meal.assigned_macros.carbs * 10) / 10,
        fat: Math.round(meal.assigned_macros.fat * 10) / 10,
        calories: Math.round(meal.assigned_macros.calories)
      },
      is_favorite: meal.recipe.is_favorite || false,
      penalty: meal.recipe.penalty || 0,
      reward: meal.recipe.reward || 0
    };
  });

  return formatted;
}

/**
 * Get user-friendly error messages
 */
function getErrorMessage(status: string): string {
  switch (status) {
    case 'failed_validation':
      return 'Could not generate a meal plan that meets quality standards. Try adjusting your macro targets or preferences.';
    case 'failed_generation':
      return 'Failed to generate meal plan. This might be due to insufficient recipes or conflicting constraints.';
    case 'failed_optimization':
      return 'Generated meal plan but optimization failed. The plan may not meet all macro targets perfectly.';
    case 'max_attempts_reached':
      return 'Reached maximum generation attempts. The best available meal plan was returned, but it may not meet all criteria.';
    default:
      return 'An unexpected error occurred during meal plan generation.';
  }
}

/**
 * Quick meal plan generation with default settings
 */
export async function generateQuickMealPlan(
  userId: string,
  targetMacros: { protein: number; carbs: number; fat: number; calories: number }
): Promise<RealMealPlanResponse> {
  
  return generateRealMealPlan({
    user_id: userId,
    target_macros: targetMacros,
    save_to_history: true
  });
}

/**
 * Advanced meal plan generation with custom settings
 */
export async function generateAdvancedMealPlan(
  userId: string,
  targetMacros: { protein: number; carbs: number; fat: number; calories: number },
  options: {
    mealCount?: number;
    excludeRecipes?: number[];
    maxAttempts?: number;
    enableLPOptimization?: boolean;
  }
): Promise<RealMealPlanResponse> {
  
  return generateRealMealPlan({
    user_id: userId,
    target_macros: targetMacros,
    preferences: {
      meal_count: options.mealCount || 3,
      exclude_recipe_ids: options.excludeRecipes,
      preferred_meal_types: options.mealCount === 4 ? 
        ['reggeli', 'ebéd', 'uzsonna', 'vacsora'] : 
        ['reggeli', 'ebéd', 'vacsora']
    },
    algorithm_settings: {
      max_attempts: options.maxAttempts || 10,
      enable_lp_optimization: options.enableLPOptimization !== false
    },
    save_to_history: true
  });
}
 