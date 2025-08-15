/**
 * JavaScript LP Optimizer Service
 * Implements linear programming optimization using javascript-lp-solver
 */

// @ts-ignore - javascript-lp-solver doesn't have TypeScript definitions
import solver from 'javascript-lp-solver';
import { MealCombination } from './mealCombiner';
import { RecipeScalability } from './recipeScorer';

export interface IngredientConstraint {
  ingredient_id: number;
  ingredient_name: string;
  recipe_id: number;
  recipe_name: string;
  meal_type: string;
  
  // Macro contributions per gram
  protein_per_g: number;
  carbs_per_g: number;
  fat_per_g: number;
  calories_per_g: number;
  
  // Scaling constraints
  base_quantity: number;        // Original recipe quantity (g)
  min_scale_factor: number;     // Minimum scaling (e.g., 0.5 = 50%)
  max_scale_factor: number;     // Maximum scaling (e.g., 2.0 = 200%)
  
  // Binding constraints (ingredients that must scale together)
  binding_group?: string;       // e.g., "R1-A" for bound ingredients
  
  // Ingredient type for special handling
  ingredient_type: 'FO_MAKRO' | 'KIEGESZITO' | 'IZESITO' | 'KOTOTT';
}

export interface LPOptimizationInput {
  combination: MealCombination;
  ingredient_constraints: IngredientConstraint[];
  scalability_data: RecipeScalability[];
  optimization_criteria: {
    target_macros: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    weights: {
      protein_weight: number;     // Importance of hitting protein target (0-1)
      carbs_weight: number;       // Importance of hitting carbs target (0-1)
      fat_weight: number;         // Importance of hitting fat target (0-1)
      calories_weight: number;    // Importance of hitting calories target (0-1)
    };
    penalties: {
      excess_penalty: number;     // Penalty for exceeding targets
      deficit_penalty: number;    // Penalty for being under targets
      scaling_penalty: number;    // Penalty for extreme scaling
    };
  };
}

export interface LPOptimizationResult {
  success: boolean;
  status: string;               // LP solver status
  objective_value: number;      // Final objective function value
  
  // Optimized quantities
  optimized_quantities: Array<{
    ingredient_id: number;
    ingredient_name: string;
    recipe_id: number;
    meal_type: string;
    original_quantity: number;
    optimized_quantity: number;
    scale_factor: number;
  }>;
  
  // Resulting macros
  optimized_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  
  // Deviations from target
  deviations: {
    protein_deviation: number;    // Absolute difference
    carbs_deviation: number;
    fat_deviation: number;
    calories_deviation: number;
    protein_percent: number;      // Percentage deviation
    carbs_percent: number;
    fat_percent: number;
    calories_percent: number;
    total_percent: number;        // Average deviation
  };
  
  // Optimization metadata
  metadata: {
    variables_count: number;
    constraints_count: number;
    solve_time_ms: number;
    iterations?: number;
  };
}

/**
 * Calculate dynamic upper bounds based on calorie target and scalability
 * Formula: upper_M = 1 + (cél_cal / 2200) * 1.5 * új_skala_avg_M
 */
export function calculateDynamicUpperBounds(
  targetCalories: number,
  scalability: RecipeScalability
): {
  protein_upper: number;
  carbs_upper: number;
  fat_upper: number;
  calories_upper: number;
} {
  const calorieRatio = targetCalories / 2200; // Reference calorie level
  const scaleFactor = 1.5;
  
  const avgScalability = (
    scalability.protein_scalability + 
    scalability.carbs_scalability + 
    scalability.fat_scalability
  ) / 3;
  
  const baseUpper = 1 + (calorieRatio * scaleFactor * avgScalability);
  
  return {
    protein_upper: Math.max(1.2, Math.min(5.0, 1 + (calorieRatio * scaleFactor * scalability.protein_scalability))),
    carbs_upper: Math.max(1.2, Math.min(5.0, 1 + (calorieRatio * scaleFactor * scalability.carbs_scalability))),
    fat_upper: Math.max(1.2, Math.min(5.0, 1 + (calorieRatio * scaleFactor * scalability.fat_scalability))),
    calories_upper: Math.max(1.2, Math.min(5.0, baseUpper))
  };
}

/**
 * Build LP model for javascript-lp-solver
 */
export function buildLPModel(input: LPOptimizationInput): any {
  const { combination, ingredient_constraints, scalability_data, optimization_criteria } = input;
  const { target_macros, weights, penalties } = optimization_criteria;
  
  // Create scalability map for quick lookup
  const scalabilityMap = new Map<number, RecipeScalability>();
  scalability_data.forEach(s => scalabilityMap.set(s.recipe_id, s));
  
  // LP Model structure
  const model: any = {
    optimize: 'minimize',
    opType: 'min',
    constraints: {},
    variables: {},
    options: {
      tolerance: 1e-6,
      timeout: 30000 // 30 seconds timeout
    }
  };
  
  // Group ingredients by binding groups
  const bindingGroups = new Map<string, IngredientConstraint[]>();
  const independentIngredients: IngredientConstraint[] = [];
  
  ingredient_constraints.forEach(ingredient => {
    if (ingredient.binding_group) {
      if (!bindingGroups.has(ingredient.binding_group)) {
        bindingGroups.set(ingredient.binding_group, []);
      }
      bindingGroups.get(ingredient.binding_group)!.push(ingredient);
    } else {
      independentIngredients.push(ingredient);
    }
  });
  
  // Create variables for independent ingredients
  independentIngredients.forEach(ingredient => {
    const scalability = scalabilityMap.get(ingredient.recipe_id);
    const bounds = scalability ? 
      calculateDynamicUpperBounds(target_macros.calories, scalability) : 
      { protein_upper: 2.0, carbs_upper: 2.0, fat_upper: 2.0, calories_upper: 2.0 };
    
    const varName = `ing_${ingredient.ingredient_id}`;
    model.variables[varName] = {
      protein: ingredient.protein_per_g * ingredient.base_quantity,
      carbs: ingredient.carbs_per_g * ingredient.base_quantity,
      fat: ingredient.fat_per_g * ingredient.base_quantity,
      calories: ingredient.calories_per_g * ingredient.base_quantity,
      // Objective: minimize deviation + scaling penalty
      objective: penalties.scaling_penalty, // Base penalty for scaling
      min: ingredient.min_scale_factor,
      max: Math.min(ingredient.max_scale_factor, bounds.protein_upper) // Use dynamic upper bound
    };
  });
  
  // Create variables for binding groups (one scale factor per group)
  bindingGroups.forEach((ingredients, groupName) => {
    const varName = `group_${groupName}`;
    
    // Calculate group totals
    let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;
    let minScale = 1.0, maxScale = 2.0;
    
    ingredients.forEach(ingredient => {
      totalProtein += ingredient.protein_per_g * ingredient.base_quantity;
      totalCarbs += ingredient.carbs_per_g * ingredient.base_quantity;
      totalFat += ingredient.fat_per_g * ingredient.base_quantity;
      totalCalories += ingredient.calories_per_g * ingredient.base_quantity;
      
      minScale = Math.max(minScale, ingredient.min_scale_factor);
      maxScale = Math.min(maxScale, ingredient.max_scale_factor);
    });
    
    // Get dynamic bounds for the recipe
    const firstIngredient = ingredients[0];
    const scalability = scalabilityMap.get(firstIngredient.recipe_id);
    const bounds = scalability ? 
      calculateDynamicUpperBounds(target_macros.calories, scalability) : 
      { protein_upper: 2.0, carbs_upper: 2.0, fat_upper: 2.0, calories_upper: 2.0 };
    
    model.variables[varName] = {
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      calories: totalCalories,
      objective: penalties.scaling_penalty * ingredients.length, // Penalty scales with group size
      min: minScale,
      max: Math.min(maxScale, bounds.protein_upper) // Use dynamic upper bound
    };
  });
  
  // Add deviation variables for each macro (positive and negative)
  const macros = ['protein', 'carbs', 'fat', 'calories'] as const;
  macros.forEach(macro => {
    // Positive deviation (excess)
    model.variables[`${macro}_excess`] = {
      [macro]: 1,
      objective: weights[`${macro}_weight`] * penalties.excess_penalty,
      min: 0,
      max: target_macros[macro] * 2 // Max 200% of target as excess
    };
    
    // Negative deviation (deficit)
    model.variables[`${macro}_deficit`] = {
      [macro]: -1,
      objective: weights[`${macro}_weight`] * penalties.deficit_penalty,
      min: 0,
      max: target_macros[macro] // Max 100% of target as deficit
    };
  });
  
  // Add constraints for macro targets
  macros.forEach(macro => {
    model.constraints[`${macro}_balance`] = {
      equal: target_macros[macro]
    };
  });
  
  // Add special constraints for FO_MAKRO ingredients (if needed)
  const foMakroIngredients = ingredient_constraints.filter(ing => ing.ingredient_type === 'FO_MAKRO');
  if (foMakroIngredients.length > 0) {
    // Constraint to limit excessive pure macro additions
    model.constraints['fo_makro_limit'] = {
      max: target_macros.calories * 0.1 // Max 10% of calories from pure macro sources
    };
    
    foMakroIngredients.forEach(ingredient => {
      const varName = `ing_${ingredient.ingredient_id}`;
      if (model.variables[varName]) {
        model.constraints['fo_makro_limit'][varName] = ingredient.calories_per_g * ingredient.base_quantity;
      }
    });
  }
  
  return model;
}

/**
 * Solve LP optimization problem
 */
export function solveLPOptimization(input: LPOptimizationInput): LPOptimizationResult {
  const startTime = Date.now();
  
  try {
    // Build the LP model
    const model = buildLPModel(input);
    
    // Count variables and constraints
    const variablesCount = Object.keys(model.variables).length;
    const constraintsCount = Object.keys(model.constraints).length;
    
    // Solve the model
    const solution = solver.Solve(model);
    const solveTime = Date.now() - startTime;
    
    if (!solution || !solution.feasible) {
      return {
        success: false,
        status: solution ? 'infeasible' : 'error',
        objective_value: Infinity,
        optimized_quantities: [],
        optimized_macros: { protein: 0, carbs: 0, fat: 0, calories: 0 },
        deviations: {
          protein_deviation: 0, carbs_deviation: 0, fat_deviation: 0, calories_deviation: 0,
          protein_percent: 0, carbs_percent: 0, fat_percent: 0, calories_percent: 0, total_percent: 0
        },
        metadata: {
          variables_count: variablesCount,
          constraints_count: constraintsCount,
          solve_time_ms: solveTime
        }
      };
    }
    
    // Extract optimized quantities
    const optimizedQuantities: LPOptimizationResult['optimized_quantities'] = [];
    const optimizedMacros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
    
    // Process independent ingredients
    input.ingredient_constraints.forEach(ingredient => {
      if (!ingredient.binding_group) {
        const varName = `ing_${ingredient.ingredient_id}`;
        const scaleFactor = solution[varName] || 1.0;
        const optimizedQuantity = ingredient.base_quantity * scaleFactor;
        
        optimizedQuantities.push({
          ingredient_id: ingredient.ingredient_id,
          ingredient_name: ingredient.ingredient_name,
          recipe_id: ingredient.recipe_id,
          meal_type: ingredient.meal_type,
          original_quantity: ingredient.base_quantity,
          optimized_quantity: Math.round(optimizedQuantity * 100) / 100,
          scale_factor: Math.round(scaleFactor * 1000) / 1000
        });
        
        // Add to total macros
        optimizedMacros.protein += ingredient.protein_per_g * optimizedQuantity;
        optimizedMacros.carbs += ingredient.carbs_per_g * optimizedQuantity;
        optimizedMacros.fat += ingredient.fat_per_g * optimizedQuantity;
        optimizedMacros.calories += ingredient.calories_per_g * optimizedQuantity;
      }
    });
    
    // Process binding groups
    const processedGroups = new Set<string>();
    input.ingredient_constraints.forEach(ingredient => {
      if (ingredient.binding_group && !processedGroups.has(ingredient.binding_group)) {
        processedGroups.add(ingredient.binding_group);
        
        const varName = `group_${ingredient.binding_group}`;
        const scaleFactor = solution[varName] || 1.0;
        
        // Apply same scale factor to all ingredients in the group
        input.ingredient_constraints
          .filter(ing => ing.binding_group === ingredient.binding_group)
          .forEach(groupIngredient => {
            const optimizedQuantity = groupIngredient.base_quantity * scaleFactor;
            
            optimizedQuantities.push({
              ingredient_id: groupIngredient.ingredient_id,
              ingredient_name: groupIngredient.ingredient_name,
              recipe_id: groupIngredient.recipe_id,
              meal_type: groupIngredient.meal_type,
              original_quantity: groupIngredient.base_quantity,
              optimized_quantity: Math.round(optimizedQuantity * 100) / 100,
              scale_factor: Math.round(scaleFactor * 1000) / 1000
            });
            
            // Add to total macros
            optimizedMacros.protein += groupIngredient.protein_per_g * optimizedQuantity;
            optimizedMacros.carbs += groupIngredient.carbs_per_g * optimizedQuantity;
            optimizedMacros.fat += groupIngredient.fat_per_g * optimizedQuantity;
            optimizedMacros.calories += groupIngredient.calories_per_g * optimizedQuantity;
          });
      }
    });
    
    // Round macros
    Object.keys(optimizedMacros).forEach(key => {
      optimizedMacros[key as keyof typeof optimizedMacros] = 
        Math.round(optimizedMacros[key as keyof typeof optimizedMacros] * 100) / 100;
    });
    
    // Calculate deviations
    const targetMacros = input.optimization_criteria.target_macros;
    const deviations = {
      protein_deviation: Math.abs(optimizedMacros.protein - targetMacros.protein),
      carbs_deviation: Math.abs(optimizedMacros.carbs - targetMacros.carbs),
      fat_deviation: Math.abs(optimizedMacros.fat - targetMacros.fat),
      calories_deviation: Math.abs(optimizedMacros.calories - targetMacros.calories),
      protein_percent: targetMacros.protein > 0 ? Math.abs(optimizedMacros.protein - targetMacros.protein) / targetMacros.protein * 100 : 0,
      carbs_percent: targetMacros.carbs > 0 ? Math.abs(optimizedMacros.carbs - targetMacros.carbs) / targetMacros.carbs * 100 : 0,
      fat_percent: targetMacros.fat > 0 ? Math.abs(optimizedMacros.fat - targetMacros.fat) / targetMacros.fat * 100 : 0,
      calories_percent: targetMacros.calories > 0 ? Math.abs(optimizedMacros.calories - targetMacros.calories) / targetMacros.calories * 100 : 0,
      total_percent: 0
    };
    
    deviations.total_percent = (deviations.protein_percent + deviations.carbs_percent + deviations.fat_percent + deviations.calories_percent) / 4;
    
    // Round deviation percentages
    Object.keys(deviations).forEach(key => {
      if (key.endsWith('_percent')) {
        deviations[key as keyof typeof deviations] = 
          Math.round(deviations[key as keyof typeof deviations] * 100) / 100;
      }
    });
    
    return {
      success: true,
      status: 'optimal',
      objective_value: solution.result || 0,
      optimized_quantities,
      optimized_macros,
      deviations,
      metadata: {
        variables_count: variablesCount,
        constraints_count: constraintsCount,
        solve_time_ms: solveTime,
        iterations: solution.iterations
      }
    };
    
  } catch (error) {
    const solveTime = Date.now() - startTime;
    console.error('LP Optimization Error:', error);
    
    return {
      success: false,
      status: 'error',
      objective_value: Infinity,
      optimized_quantities: [],
      optimized_macros: { protein: 0, carbs: 0, fat: 0, calories: 0 },
      deviations: {
        protein_deviation: 0, carbs_deviation: 0, fat_deviation: 0, calories_deviation: 0,
        protein_percent: 0, carbs_percent: 0, fat_percent: 0, calories_percent: 0, total_percent: 0
      },
      metadata: {
        variables_count: 0,
        constraints_count: 0,
        solve_time_ms: solveTime
      }
    };
  }
}

/**
 * Create default optimization criteria
 */
export function createDefaultOptimizationCriteria(
  targetMacros: { protein: number; carbs: number; fat: number; calories: number }
): LPOptimizationInput['optimization_criteria'] {
  return {
    target_macros: targetMacros,
    weights: {
      protein_weight: 0.3,
      carbs_weight: 0.25,
      fat_weight: 0.25,
      calories_weight: 0.2
    },
    penalties: {
      excess_penalty: 2.0,      // Penalize overshooting targets
      deficit_penalty: 3.0,     // Penalize undershooting targets more
      scaling_penalty: 1.0      // Penalize extreme scaling
    }
  };
}
 * JavaScript LP Optimizer Service
 * Implements linear programming optimization using javascript-lp-solver
 */

// @ts-ignore - javascript-lp-solver doesn't have TypeScript definitions
import solver from 'javascript-lp-solver';
import { MealCombination } from './mealCombiner';
import { RecipeScalability } from './recipeScorer';

export interface IngredientConstraint {
  ingredient_id: number;
  ingredient_name: string;
  recipe_id: number;
  recipe_name: string;
  meal_type: string;
  
  // Macro contributions per gram
  protein_per_g: number;
  carbs_per_g: number;
  fat_per_g: number;
  calories_per_g: number;
  
  // Scaling constraints
  base_quantity: number;        // Original recipe quantity (g)
  min_scale_factor: number;     // Minimum scaling (e.g., 0.5 = 50%)
  max_scale_factor: number;     // Maximum scaling (e.g., 2.0 = 200%)
  
  // Binding constraints (ingredients that must scale together)
  binding_group?: string;       // e.g., "R1-A" for bound ingredients
  
  // Ingredient type for special handling
  ingredient_type: 'FO_MAKRO' | 'KIEGESZITO' | 'IZESITO' | 'KOTOTT';
}

export interface LPOptimizationInput {
  combination: MealCombination;
  ingredient_constraints: IngredientConstraint[];
  scalability_data: RecipeScalability[];
  optimization_criteria: {
    target_macros: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    weights: {
      protein_weight: number;     // Importance of hitting protein target (0-1)
      carbs_weight: number;       // Importance of hitting carbs target (0-1)
      fat_weight: number;         // Importance of hitting fat target (0-1)
      calories_weight: number;    // Importance of hitting calories target (0-1)
    };
    penalties: {
      excess_penalty: number;     // Penalty for exceeding targets
      deficit_penalty: number;    // Penalty for being under targets
      scaling_penalty: number;    // Penalty for extreme scaling
    };
  };
}

export interface LPOptimizationResult {
  success: boolean;
  status: string;               // LP solver status
  objective_value: number;      // Final objective function value
  
  // Optimized quantities
  optimized_quantities: Array<{
    ingredient_id: number;
    ingredient_name: string;
    recipe_id: number;
    meal_type: string;
    original_quantity: number;
    optimized_quantity: number;
    scale_factor: number;
  }>;
  
  // Resulting macros
  optimized_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  
  // Deviations from target
  deviations: {
    protein_deviation: number;    // Absolute difference
    carbs_deviation: number;
    fat_deviation: number;
    calories_deviation: number;
    protein_percent: number;      // Percentage deviation
    carbs_percent: number;
    fat_percent: number;
    calories_percent: number;
    total_percent: number;        // Average deviation
  };
  
  // Optimization metadata
  metadata: {
    variables_count: number;
    constraints_count: number;
    solve_time_ms: number;
    iterations?: number;
  };
}

/**
 * Calculate dynamic upper bounds based on calorie target and scalability
 * Formula: upper_M = 1 + (cél_cal / 2200) * 1.5 * új_skala_avg_M
 */
export function calculateDynamicUpperBounds(
  targetCalories: number,
  scalability: RecipeScalability
): {
  protein_upper: number;
  carbs_upper: number;
  fat_upper: number;
  calories_upper: number;
} {
  const calorieRatio = targetCalories / 2200; // Reference calorie level
  const scaleFactor = 1.5;
  
  const avgScalability = (
    scalability.protein_scalability + 
    scalability.carbs_scalability + 
    scalability.fat_scalability
  ) / 3;
  
  const baseUpper = 1 + (calorieRatio * scaleFactor * avgScalability);
  
  return {
    protein_upper: Math.max(1.2, Math.min(5.0, 1 + (calorieRatio * scaleFactor * scalability.protein_scalability))),
    carbs_upper: Math.max(1.2, Math.min(5.0, 1 + (calorieRatio * scaleFactor * scalability.carbs_scalability))),
    fat_upper: Math.max(1.2, Math.min(5.0, 1 + (calorieRatio * scaleFactor * scalability.fat_scalability))),
    calories_upper: Math.max(1.2, Math.min(5.0, baseUpper))
  };
}

/**
 * Build LP model for javascript-lp-solver
 */
export function buildLPModel(input: LPOptimizationInput): any {
  const { combination, ingredient_constraints, scalability_data, optimization_criteria } = input;
  const { target_macros, weights, penalties } = optimization_criteria;
  
  // Create scalability map for quick lookup
  const scalabilityMap = new Map<number, RecipeScalability>();
  scalability_data.forEach(s => scalabilityMap.set(s.recipe_id, s));
  
  // LP Model structure
  const model: any = {
    optimize: 'minimize',
    opType: 'min',
    constraints: {},
    variables: {},
    options: {
      tolerance: 1e-6,
      timeout: 30000 // 30 seconds timeout
    }
  };
  
  // Group ingredients by binding groups
  const bindingGroups = new Map<string, IngredientConstraint[]>();
  const independentIngredients: IngredientConstraint[] = [];
  
  ingredient_constraints.forEach(ingredient => {
    if (ingredient.binding_group) {
      if (!bindingGroups.has(ingredient.binding_group)) {
        bindingGroups.set(ingredient.binding_group, []);
      }
      bindingGroups.get(ingredient.binding_group)!.push(ingredient);
    } else {
      independentIngredients.push(ingredient);
    }
  });
  
  // Create variables for independent ingredients
  independentIngredients.forEach(ingredient => {
    const scalability = scalabilityMap.get(ingredient.recipe_id);
    const bounds = scalability ? 
      calculateDynamicUpperBounds(target_macros.calories, scalability) : 
      { protein_upper: 2.0, carbs_upper: 2.0, fat_upper: 2.0, calories_upper: 2.0 };
    
    const varName = `ing_${ingredient.ingredient_id}`;
    model.variables[varName] = {
      protein: ingredient.protein_per_g * ingredient.base_quantity,
      carbs: ingredient.carbs_per_g * ingredient.base_quantity,
      fat: ingredient.fat_per_g * ingredient.base_quantity,
      calories: ingredient.calories_per_g * ingredient.base_quantity,
      // Objective: minimize deviation + scaling penalty
      objective: penalties.scaling_penalty, // Base penalty for scaling
      min: ingredient.min_scale_factor,
      max: Math.min(ingredient.max_scale_factor, bounds.protein_upper) // Use dynamic upper bound
    };
  });
  
  // Create variables for binding groups (one scale factor per group)
  bindingGroups.forEach((ingredients, groupName) => {
    const varName = `group_${groupName}`;
    
    // Calculate group totals
    let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;
    let minScale = 1.0, maxScale = 2.0;
    
    ingredients.forEach(ingredient => {
      totalProtein += ingredient.protein_per_g * ingredient.base_quantity;
      totalCarbs += ingredient.carbs_per_g * ingredient.base_quantity;
      totalFat += ingredient.fat_per_g * ingredient.base_quantity;
      totalCalories += ingredient.calories_per_g * ingredient.base_quantity;
      
      minScale = Math.max(minScale, ingredient.min_scale_factor);
      maxScale = Math.min(maxScale, ingredient.max_scale_factor);
    });
    
    // Get dynamic bounds for the recipe
    const firstIngredient = ingredients[0];
    const scalability = scalabilityMap.get(firstIngredient.recipe_id);
    const bounds = scalability ? 
      calculateDynamicUpperBounds(target_macros.calories, scalability) : 
      { protein_upper: 2.0, carbs_upper: 2.0, fat_upper: 2.0, calories_upper: 2.0 };
    
    model.variables[varName] = {
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      calories: totalCalories,
      objective: penalties.scaling_penalty * ingredients.length, // Penalty scales with group size
      min: minScale,
      max: Math.min(maxScale, bounds.protein_upper) // Use dynamic upper bound
    };
  });
  
  // Add deviation variables for each macro (positive and negative)
  const macros = ['protein', 'carbs', 'fat', 'calories'] as const;
  macros.forEach(macro => {
    // Positive deviation (excess)
    model.variables[`${macro}_excess`] = {
      [macro]: 1,
      objective: weights[`${macro}_weight`] * penalties.excess_penalty,
      min: 0,
      max: target_macros[macro] * 2 // Max 200% of target as excess
    };
    
    // Negative deviation (deficit)
    model.variables[`${macro}_deficit`] = {
      [macro]: -1,
      objective: weights[`${macro}_weight`] * penalties.deficit_penalty,
      min: 0,
      max: target_macros[macro] // Max 100% of target as deficit
    };
  });
  
  // Add constraints for macro targets
  macros.forEach(macro => {
    model.constraints[`${macro}_balance`] = {
      equal: target_macros[macro]
    };
  });
  
  // Add special constraints for FO_MAKRO ingredients (if needed)
  const foMakroIngredients = ingredient_constraints.filter(ing => ing.ingredient_type === 'FO_MAKRO');
  if (foMakroIngredients.length > 0) {
    // Constraint to limit excessive pure macro additions
    model.constraints['fo_makro_limit'] = {
      max: target_macros.calories * 0.1 // Max 10% of calories from pure macro sources
    };
    
    foMakroIngredients.forEach(ingredient => {
      const varName = `ing_${ingredient.ingredient_id}`;
      if (model.variables[varName]) {
        model.constraints['fo_makro_limit'][varName] = ingredient.calories_per_g * ingredient.base_quantity;
      }
    });
  }
  
  return model;
}

/**
 * Solve LP optimization problem
 */
export function solveLPOptimization(input: LPOptimizationInput): LPOptimizationResult {
  const startTime = Date.now();
  
  try {
    // Build the LP model
    const model = buildLPModel(input);
    
    // Count variables and constraints
    const variablesCount = Object.keys(model.variables).length;
    const constraintsCount = Object.keys(model.constraints).length;
    
    // Solve the model
    const solution = solver.Solve(model);
    const solveTime = Date.now() - startTime;
    
    if (!solution || !solution.feasible) {
      return {
        success: false,
        status: solution ? 'infeasible' : 'error',
        objective_value: Infinity,
        optimized_quantities: [],
        optimized_macros: { protein: 0, carbs: 0, fat: 0, calories: 0 },
        deviations: {
          protein_deviation: 0, carbs_deviation: 0, fat_deviation: 0, calories_deviation: 0,
          protein_percent: 0, carbs_percent: 0, fat_percent: 0, calories_percent: 0, total_percent: 0
        },
        metadata: {
          variables_count: variablesCount,
          constraints_count: constraintsCount,
          solve_time_ms: solveTime
        }
      };
    }
    
    // Extract optimized quantities
    const optimizedQuantities: LPOptimizationResult['optimized_quantities'] = [];
    const optimizedMacros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
    
    // Process independent ingredients
    input.ingredient_constraints.forEach(ingredient => {
      if (!ingredient.binding_group) {
        const varName = `ing_${ingredient.ingredient_id}`;
        const scaleFactor = solution[varName] || 1.0;
        const optimizedQuantity = ingredient.base_quantity * scaleFactor;
        
        optimizedQuantities.push({
          ingredient_id: ingredient.ingredient_id,
          ingredient_name: ingredient.ingredient_name,
          recipe_id: ingredient.recipe_id,
          meal_type: ingredient.meal_type,
          original_quantity: ingredient.base_quantity,
          optimized_quantity: Math.round(optimizedQuantity * 100) / 100,
          scale_factor: Math.round(scaleFactor * 1000) / 1000
        });
        
        // Add to total macros
        optimizedMacros.protein += ingredient.protein_per_g * optimizedQuantity;
        optimizedMacros.carbs += ingredient.carbs_per_g * optimizedQuantity;
        optimizedMacros.fat += ingredient.fat_per_g * optimizedQuantity;
        optimizedMacros.calories += ingredient.calories_per_g * optimizedQuantity;
      }
    });
    
    // Process binding groups
    const processedGroups = new Set<string>();
    input.ingredient_constraints.forEach(ingredient => {
      if (ingredient.binding_group && !processedGroups.has(ingredient.binding_group)) {
        processedGroups.add(ingredient.binding_group);
        
        const varName = `group_${ingredient.binding_group}`;
        const scaleFactor = solution[varName] || 1.0;
        
        // Apply same scale factor to all ingredients in the group
        input.ingredient_constraints
          .filter(ing => ing.binding_group === ingredient.binding_group)
          .forEach(groupIngredient => {
            const optimizedQuantity = groupIngredient.base_quantity * scaleFactor;
            
            optimizedQuantities.push({
              ingredient_id: groupIngredient.ingredient_id,
              ingredient_name: groupIngredient.ingredient_name,
              recipe_id: groupIngredient.recipe_id,
              meal_type: groupIngredient.meal_type,
              original_quantity: groupIngredient.base_quantity,
              optimized_quantity: Math.round(optimizedQuantity * 100) / 100,
              scale_factor: Math.round(scaleFactor * 1000) / 1000
            });
            
            // Add to total macros
            optimizedMacros.protein += groupIngredient.protein_per_g * optimizedQuantity;
            optimizedMacros.carbs += groupIngredient.carbs_per_g * optimizedQuantity;
            optimizedMacros.fat += groupIngredient.fat_per_g * optimizedQuantity;
            optimizedMacros.calories += groupIngredient.calories_per_g * optimizedQuantity;
          });
      }
    });
    
    // Round macros
    Object.keys(optimizedMacros).forEach(key => {
      optimizedMacros[key as keyof typeof optimizedMacros] = 
        Math.round(optimizedMacros[key as keyof typeof optimizedMacros] * 100) / 100;
    });
    
    // Calculate deviations
    const targetMacros = input.optimization_criteria.target_macros;
    const deviations = {
      protein_deviation: Math.abs(optimizedMacros.protein - targetMacros.protein),
      carbs_deviation: Math.abs(optimizedMacros.carbs - targetMacros.carbs),
      fat_deviation: Math.abs(optimizedMacros.fat - targetMacros.fat),
      calories_deviation: Math.abs(optimizedMacros.calories - targetMacros.calories),
      protein_percent: targetMacros.protein > 0 ? Math.abs(optimizedMacros.protein - targetMacros.protein) / targetMacros.protein * 100 : 0,
      carbs_percent: targetMacros.carbs > 0 ? Math.abs(optimizedMacros.carbs - targetMacros.carbs) / targetMacros.carbs * 100 : 0,
      fat_percent: targetMacros.fat > 0 ? Math.abs(optimizedMacros.fat - targetMacros.fat) / targetMacros.fat * 100 : 0,
      calories_percent: targetMacros.calories > 0 ? Math.abs(optimizedMacros.calories - targetMacros.calories) / targetMacros.calories * 100 : 0,
      total_percent: 0
    };
    
    deviations.total_percent = (deviations.protein_percent + deviations.carbs_percent + deviations.fat_percent + deviations.calories_percent) / 4;
    
    // Round deviation percentages
    Object.keys(deviations).forEach(key => {
      if (key.endsWith('_percent')) {
        deviations[key as keyof typeof deviations] = 
          Math.round(deviations[key as keyof typeof deviations] * 100) / 100;
      }
    });
    
    return {
      success: true,
      status: 'optimal',
      objective_value: solution.result || 0,
      optimized_quantities,
      optimized_macros,
      deviations,
      metadata: {
        variables_count: variablesCount,
        constraints_count: constraintsCount,
        solve_time_ms: solveTime,
        iterations: solution.iterations
      }
    };
    
  } catch (error) {
    const solveTime = Date.now() - startTime;
    console.error('LP Optimization Error:', error);
    
    return {
      success: false,
      status: 'error',
      objective_value: Infinity,
      optimized_quantities: [],
      optimized_macros: { protein: 0, carbs: 0, fat: 0, calories: 0 },
      deviations: {
        protein_deviation: 0, carbs_deviation: 0, fat_deviation: 0, calories_deviation: 0,
        protein_percent: 0, carbs_percent: 0, fat_percent: 0, calories_percent: 0, total_percent: 0
      },
      metadata: {
        variables_count: 0,
        constraints_count: 0,
        solve_time_ms: solveTime
      }
    };
  }
}

/**
 * Create default optimization criteria
 */
export function createDefaultOptimizationCriteria(
  targetMacros: { protein: number; carbs: number; fat: number; calories: number }
): LPOptimizationInput['optimization_criteria'] {
  return {
    target_macros: targetMacros,
    weights: {
      protein_weight: 0.3,
      carbs_weight: 0.25,
      fat_weight: 0.25,
      calories_weight: 0.2
    },
    penalties: {
      excess_penalty: 2.0,      // Penalize overshooting targets
      deficit_penalty: 3.0,     // Penalize undershooting targets more
      scaling_penalty: 1.0      // Penalize extreme scaling
    }
  };
}
 