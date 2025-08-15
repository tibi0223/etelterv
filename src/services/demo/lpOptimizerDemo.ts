/**
 * Demo for LP Optimizer
 * Shows how JavaScript Linear Programming optimization works
 */

import {
  solveLPOptimization,
  createDefaultOptimizationCriteria,
  calculateDynamicUpperBounds,
  LPOptimizationInput,
  IngredientConstraint
} from '../lpOptimizer';
import { MealCombination } from '../mealCombiner';
import { RecipeScalability } from '../recipeScorer';

// Sample meal combination that needs optimization
const sampleCombination: MealCombination = {
  meal_plan_id: 'plan_lp_demo',
  total_score: 255.2,
  average_score: 85.1,
  meets_threshold: true,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 1,
        recipe_name: 'Protein Smoothie',
        base_score: 85.5,
        penalty: 0,
        reward: 5,
        final_score: 90.5,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 25, carbs: 12, fat: 4, calories: 176 }
    },
    ebéd: {
      recipe: {
        recipe_id: 4,
        recipe_name: 'Chicken Salad',
        base_score: 90.2,
        penalty: 0,
        reward: 10,
        final_score: 100.2,
        is_favorite: true,
        days_since_last_use: 8,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 30, carbs: 6, fat: 8, calories: 192 }
    },
    vacsora: {
      recipe: {
        recipe_id: 7,
        recipe_name: 'Salmon Fillet',
        base_score: 92.1,
        penalty: 0,
        reward: 0,
        final_score: 92.1,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 35, carbs: 0, fat: 15, calories: 255 }
    }
  },
  total_macros: {
    protein: 90,     // Target: 120g (need +30g)
    carbs: 18,       // Target: 150g (need +132g!)
    fat: 27,         // Target: 60g (need +33g)
    calories: 623    // Target: 1500 (need +877!)
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 60,
    calories: 1500
  },
  deviation: {
    protein_percent: 25.0,
    carbs_percent: 88.0,  // Huge carb deficit!
    fat_percent: 55.0,
    calories_percent: 58.5,
    total_percent: 56.6
  }
};

// Sample ingredient constraints (simulating recipe ingredients)
const sampleIngredientConstraints: IngredientConstraint[] = [
  // Protein Smoothie ingredients
  {
    ingredient_id: 101,
    ingredient_name: 'Whey Protein Powder',
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    meal_type: 'reggeli',
    protein_per_g: 0.8,   // 80g protein per 100g
    carbs_per_g: 0.05,    // 5g carbs per 100g
    fat_per_g: 0.02,      // 2g fat per 100g
    calories_per_g: 3.6,  // 360 calories per 100g
    base_quantity: 30,    // 30g in original recipe
    min_scale_factor: 0.5,
    max_scale_factor: 3.0,
    ingredient_type: 'FO_MAKRO'
  },
  {
    ingredient_id: 102,
    ingredient_name: 'Banana',
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    meal_type: 'reggeli',
    protein_per_g: 0.01,  // 1g protein per 100g
    carbs_per_g: 0.23,    // 23g carbs per 100g
    fat_per_g: 0.003,     // 0.3g fat per 100g
    calories_per_g: 0.96, // 96 calories per 100g
    base_quantity: 100,   // 100g in original recipe
    min_scale_factor: 0.8,
    max_scale_factor: 2.0,
    binding_group: 'R1-A', // Bound with milk
    ingredient_type: 'KIEGESZITO'
  },
  {
    ingredient_id: 103,
    ingredient_name: 'Almond Milk',
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    meal_type: 'reggeli',
    protein_per_g: 0.004, // 0.4g protein per 100ml
    carbs_per_g: 0.008,   // 0.8g carbs per 100ml
    fat_per_g: 0.011,     // 1.1g fat per 100ml
    calories_per_g: 0.17, // 17 calories per 100ml
    base_quantity: 250,   // 250ml in original recipe
    min_scale_factor: 0.8,
    max_scale_factor: 2.0,
    binding_group: 'R1-A', // Bound with banana
    ingredient_type: 'KIEGESZITO'
  },
  
  // Chicken Salad ingredients
  {
    ingredient_id: 201,
    ingredient_name: 'Chicken Breast',
    recipe_id: 4,
    recipe_name: 'Chicken Salad',
    meal_type: 'ebéd',
    protein_per_g: 0.31,  // 31g protein per 100g
    carbs_per_g: 0,       // 0g carbs per 100g
    fat_per_g: 0.036,     // 3.6g fat per 100g
    calories_per_g: 1.55, // 155 calories per 100g
    base_quantity: 120,   // 120g in original recipe
    min_scale_factor: 0.7,
    max_scale_factor: 2.5,
    ingredient_type: 'FO_MAKRO'
  },
  {
    ingredient_id: 202,
    ingredient_name: 'Mixed Greens',
    recipe_id: 4,
    recipe_name: 'Chicken Salad',
    meal_type: 'ebéd',
    protein_per_g: 0.022, // 2.2g protein per 100g
    carbs_per_g: 0.036,   // 3.6g carbs per 100g
    fat_per_g: 0.003,     // 0.3g fat per 100g
    calories_per_g: 0.18, // 18 calories per 100g
    base_quantity: 80,    // 80g in original recipe
    min_scale_factor: 0.5,
    max_scale_factor: 3.0,
    ingredient_type: 'KIEGESZITO'
  },
  {
    ingredient_id: 203,
    ingredient_name: 'Olive Oil',
    recipe_id: 4,
    recipe_name: 'Chicken Salad',
    meal_type: 'ebéd',
    protein_per_g: 0,     // 0g protein per 100g
    carbs_per_g: 0,       // 0g carbs per 100g
    fat_per_g: 1.0,       // 100g fat per 100g (pure fat)
    calories_per_g: 9.0,  // 900 calories per 100g
    base_quantity: 10,    // 10g in original recipe
    min_scale_factor: 0.5,
    max_scale_factor: 4.0,
    ingredient_type: 'FO_MAKRO'
  },
  
  // Salmon Fillet ingredients
  {
    ingredient_id: 301,
    ingredient_name: 'Salmon Fillet',
    recipe_id: 7,
    recipe_name: 'Salmon Fillet',
    meal_type: 'vacsora',
    protein_per_g: 0.25,  // 25g protein per 100g
    carbs_per_g: 0,       // 0g carbs per 100g
    fat_per_g: 0.14,      // 14g fat per 100g
    calories_per_g: 2.31, // 231 calories per 100g
    base_quantity: 150,   // 150g in original recipe
    min_scale_factor: 0.6,
    max_scale_factor: 2.0,
    ingredient_type: 'FO_MAKRO'
  },
  {
    ingredient_id: 302,
    ingredient_name: 'Sweet Potato',
    recipe_id: 7,
    recipe_name: 'Salmon Fillet',
    meal_type: 'vacsora',
    protein_per_g: 0.02,  // 2g protein per 100g
    carbs_per_g: 0.17,    // 17g carbs per 100g
    fat_per_g: 0.001,     // 0.1g fat per 100g
    calories_per_g: 0.76, // 76 calories per 100g
    base_quantity: 0,     // Not in original, can be added
    min_scale_factor: 0,
    max_scale_factor: 5.0,
    ingredient_type: 'KIEGESZITO'
  }
];

// Sample scalability data
const sampleScalabilityData: RecipeScalability[] = [
  { recipe_id: 1, protein_scalability: 0.8, carbs_scalability: 0.6, fat_scalability: 0.4, protein_density: 25, carbs_density: 12, fat_density: 8 },
  { recipe_id: 4, protein_scalability: 0.9, carbs_scalability: 0.3, fat_scalability: 0.5, protein_density: 30, carbs_density: 6, fat_density: 8 },
  { recipe_id: 7, protein_scalability: 0.9, carbs_scalability: 0.1, fat_scalability: 0.8, protein_density: 35, carbs_density: 0, fat_density: 15 }
];

export function runLPOptimizerDemo() {
  console.log('🧮 JavaScript LP Optimizer Demo\n');

  // Show the current situation
  console.log('=== Current Meal Combination (Before LP Optimization) ===');
  console.log(`Average Score: ${sampleCombination.average_score.toFixed(1)} (${sampleCombination.meets_threshold ? '✅' : '❌'})`);
  console.log(`Total Deviation: ${sampleCombination.deviation.total_percent.toFixed(1)}%\n`);

  console.log('Current Macros vs Targets:');
  console.log(`  Protein: ${sampleCombination.total_macros.protein}g / ${sampleCombination.target_macros.protein}g (${sampleCombination.deviation.protein_percent.toFixed(1)}% off)`);
  console.log(`  Carbs: ${sampleCombination.total_macros.carbs}g / ${sampleCombination.target_macros.carbs}g (${sampleCombination.deviation.carbs_percent.toFixed(1)}% off)`);
  console.log(`  Fat: ${sampleCombination.total_macros.fat}g / ${sampleCombination.target_macros.fat}g (${sampleCombination.deviation.fat_percent.toFixed(1)}% off)`);
  console.log(`  Calories: ${sampleCombination.total_macros.calories} / ${sampleCombination.target_macros.calories} (${sampleCombination.deviation.calories_percent.toFixed(1)}% off)`);

  console.log('\n' + '='.repeat(70));

  // Show dynamic upper bounds calculation
  console.log('\n=== Dynamic Upper Bounds Calculation ===\n');
  
  sampleScalabilityData.forEach(scalability => {
    const bounds = calculateDynamicUpperBounds(sampleCombination.target_macros.calories, scalability);
    console.log(`Recipe ${scalability.recipe_id} bounds:`);
    console.log(`  Protein: max ${bounds.protein_upper.toFixed(2)}x scaling`);
    console.log(`  Carbs: max ${bounds.carbs_upper.toFixed(2)}x scaling`);
    console.log(`  Fat: max ${bounds.fat_upper.toFixed(2)}x scaling`);
    console.log(`  Calories: max ${bounds.calories_upper.toFixed(2)}x scaling`);
    console.log('');
  });

  console.log('='.repeat(70));

  // Show ingredient constraints
  console.log('\n=== Ingredient Constraints ===\n');
  
  const recipeGroups = new Map<number, IngredientConstraint[]>();
  sampleIngredientConstraints.forEach(ingredient => {
    if (!recipeGroups.has(ingredient.recipe_id)) {
      recipeGroups.set(ingredient.recipe_id, []);
    }
    recipeGroups.get(ingredient.recipe_id)!.push(ingredient);
  });

  recipeGroups.forEach((ingredients, recipeId) => {
    const recipeName = ingredients[0].recipe_name;
    console.log(`${recipeName} (Recipe ${recipeId}):`);
    
    ingredients.forEach(ingredient => {
      const bindingText = ingredient.binding_group ? ` [Group: ${ingredient.binding_group}]` : ' [Independent]';
      console.log(`  - ${ingredient.ingredient_name}: ${ingredient.base_quantity}g`);
      console.log(`    P:${ingredient.protein_per_g}g/g C:${ingredient.carbs_per_g}g/g F:${ingredient.fat_per_g}g/g Cal:${ingredient.calories_per_g}/g`);
      console.log(`    Scale: ${ingredient.min_scale_factor}x - ${ingredient.max_scale_factor}x${bindingText}`);
    });
    console.log('');
  });

  console.log('='.repeat(70));

  // Run LP optimization
  console.log('\n=== Running LP Optimization ===\n');
  
  const optimizationInput: LPOptimizationInput = {
    combination: sampleCombination,
    ingredient_constraints: sampleIngredientConstraints,
    scalability_data: sampleScalabilityData,
    optimization_criteria: createDefaultOptimizationCriteria(sampleCombination.target_macros)
  };

  console.log('Optimization Criteria:');
  const criteria = optimizationInput.optimization_criteria;
  console.log(`  Weights: P:${criteria.weights.protein_weight} C:${criteria.weights.carbs_weight} F:${criteria.weights.fat_weight} Cal:${criteria.weights.calories_weight}`);
  console.log(`  Penalties: Excess:${criteria.penalties.excess_penalty} Deficit:${criteria.penalties.deficit_penalty} Scaling:${criteria.penalties.scaling_penalty}`);

  console.log('\nSolving LP problem...');
  const startTime = Date.now();
  const result = solveLPOptimization(optimizationInput);
  const endTime = Date.now();

  console.log(`\nLP Solver Results:`);
  console.log(`  Status: ${result.status} (${result.success ? '✅' : '❌'})`);
  console.log(`  Solve time: ${result.metadata.solve_time_ms}ms`);
  console.log(`  Variables: ${result.metadata.variables_count}`);
  console.log(`  Constraints: ${result.metadata.constraints_count}`);
  
  if (result.success) {
    console.log(`  Objective value: ${result.objective_value.toFixed(4)}`);
    console.log(`  Iterations: ${result.metadata.iterations || 'N/A'}`);
  }

  console.log('\n' + '='.repeat(70));

  if (result.success) {
    // Show optimized quantities
    console.log('\n=== Optimized Quantities ===\n');
    
    const quantitiesByRecipe = new Map<number, typeof result.optimized_quantities>();
    result.optimized_quantities.forEach(qty => {
      if (!quantitiesByRecipe.has(qty.recipe_id)) {
        quantitiesByRecipe.set(qty.recipe_id, []);
      }
      quantitiesByRecipe.get(qty.recipe_id)!.push(qty);
    });

    quantitiesByRecipe.forEach((quantities, recipeId) => {
      const recipeName = quantities[0]?.recipe_id ? 
        sampleIngredientConstraints.find(ing => ing.recipe_id === recipeId)?.recipe_name : 
        `Recipe ${recipeId}`;
      
      console.log(`${recipeName}:`);
      quantities.forEach(qty => {
        const changeText = qty.scale_factor !== 1.0 ? 
          ` (${qty.scale_factor.toFixed(2)}x scaling)` : 
          ' (no change)';
        const changeIcon = qty.scale_factor > 1.2 ? '📈' : 
                          qty.scale_factor < 0.8 ? '📉' : '➡️';
        
        console.log(`  ${changeIcon} ${qty.ingredient_name}: ${qty.original_quantity}g → ${qty.optimized_quantity}g${changeText}`);
      });
      console.log('');
    });

    // Show optimized macros
    console.log('=== Optimized Macros ===\n');
    
    console.log('Before vs After Optimization:');
    console.log(`  Protein: ${sampleCombination.total_macros.protein}g → ${result.optimized_macros.protein}g (Target: ${sampleCombination.target_macros.protein}g)`);
    console.log(`  Carbs: ${sampleCombination.total_macros.carbs}g → ${result.optimized_macros.carbs}g (Target: ${sampleCombination.target_macros.carbs}g)`);
    console.log(`  Fat: ${sampleCombination.total_macros.fat}g → ${result.optimized_macros.fat}g (Target: ${sampleCombination.target_macros.fat}g)`);
    console.log(`  Calories: ${sampleCombination.total_macros.calories} → ${result.optimized_macros.calories} (Target: ${sampleCombination.target_macros.calories})`);

    console.log('\nDeviation Improvements:');
    console.log(`  Protein: ${sampleCombination.deviation.protein_percent.toFixed(1)}% → ${result.deviations.protein_percent.toFixed(1)}%`);
    console.log(`  Carbs: ${sampleCombination.deviation.carbs_percent.toFixed(1)}% → ${result.deviations.carbs_percent.toFixed(1)}%`);
    console.log(`  Fat: ${sampleCombination.deviation.fat_percent.toFixed(1)}% → ${result.deviations.fat_percent.toFixed(1)}%`);
    console.log(`  Calories: ${sampleCombination.deviation.calories_percent.toFixed(1)}% → ${result.deviations.calories_percent.toFixed(1)}%`);
    console.log(`  TOTAL: ${sampleCombination.deviation.total_percent.toFixed(1)}% → ${result.deviations.total_percent.toFixed(1)}%`);

    const totalImprovement = sampleCombination.deviation.total_percent - result.deviations.total_percent;
    console.log(`\n🎯 Overall improvement: ${totalImprovement > 0 ? '-' : '+'}${Math.abs(totalImprovement).toFixed(1)}% deviation`);

    // Success metrics
    const successMetrics = [];
    if (result.deviations.total_percent < 20) successMetrics.push('✅ Under 20% total deviation');
    if (result.deviations.total_percent < sampleCombination.deviation.total_percent) successMetrics.push('✅ Improved from original');
    if (result.deviations.protein_percent < 15) successMetrics.push('✅ Protein within 15%');
    if (result.deviations.carbs_percent < 20) successMetrics.push('✅ Carbs within 20%');
    if (result.deviations.fat_percent < 25) successMetrics.push('✅ Fat within 25%');

    if (successMetrics.length > 0) {
      console.log('\nSuccess Metrics:');
      successMetrics.forEach(metric => console.log(`  ${metric}`));
    }

  } else {
    console.log('\n❌ Optimization Failed');
    console.log(`Reason: ${result.status}`);
    console.log('\nPossible solutions:');
    console.log('  - Relax ingredient scaling constraints');
    console.log('  - Add more flexible ingredients');
    console.log('  - Adjust target macros');
    console.log('  - Use fallback recipe generation');
  }

  console.log('\n' + '='.repeat(70));

  // Test with different criteria
  console.log('\n=== Testing Different Optimization Criteria ===\n');
  
  const aggressiveCriteria = createDefaultOptimizationCriteria(sampleCombination.target_macros);
  aggressiveCriteria.penalties.deficit_penalty = 5.0; // Higher penalty for being under target
  aggressiveCriteria.penalties.excess_penalty = 1.0;  // Lower penalty for overshooting
  aggressiveCriteria.weights.carbs_weight = 0.4;      // Focus more on carbs (the biggest problem)
  aggressiveCriteria.weights.protein_weight = 0.2;

  const aggressiveInput: LPOptimizationInput = {
    ...optimizationInput,
    optimization_criteria: aggressiveCriteria
  };

  console.log('Testing aggressive criteria (focus on carbs, penalize deficits heavily)...');
  const aggressiveResult = solveLPOptimization(aggressiveInput);

  if (aggressiveResult.success) {
    console.log(`  Aggressive result deviation: ${aggressiveResult.deviations.total_percent.toFixed(1)}%`);
    console.log(`  Carbs deviation: ${aggressiveResult.deviations.carbs_percent.toFixed(1)}%`);
    
    if (aggressiveResult.deviations.total_percent < result.deviations.total_percent) {
      console.log('  ✅ Aggressive criteria performed better!');
    } else {
      console.log('  ➡️ Default criteria were sufficient');
    }
  } else {
    console.log('  ❌ Aggressive criteria failed to find solution');
  }

  console.log('\n✅ LP Optimizer Demo Complete!');
}

// Uncomment to run demo in development
// runLPOptimizerDemo();
 * Demo for LP Optimizer
 * Shows how JavaScript Linear Programming optimization works
 */

import {
  solveLPOptimization,
  createDefaultOptimizationCriteria,
  calculateDynamicUpperBounds,
  LPOptimizationInput,
  IngredientConstraint
} from '../lpOptimizer';
import { MealCombination } from '../mealCombiner';
import { RecipeScalability } from '../recipeScorer';

// Sample meal combination that needs optimization
const sampleCombination: MealCombination = {
  meal_plan_id: 'plan_lp_demo',
  total_score: 255.2,
  average_score: 85.1,
  meets_threshold: true,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 1,
        recipe_name: 'Protein Smoothie',
        base_score: 85.5,
        penalty: 0,
        reward: 5,
        final_score: 90.5,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 25, carbs: 12, fat: 4, calories: 176 }
    },
    ebéd: {
      recipe: {
        recipe_id: 4,
        recipe_name: 'Chicken Salad',
        base_score: 90.2,
        penalty: 0,
        reward: 10,
        final_score: 100.2,
        is_favorite: true,
        days_since_last_use: 8,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 30, carbs: 6, fat: 8, calories: 192 }
    },
    vacsora: {
      recipe: {
        recipe_id: 7,
        recipe_name: 'Salmon Fillet',
        base_score: 92.1,
        penalty: 0,
        reward: 0,
        final_score: 92.1,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 35, carbs: 0, fat: 15, calories: 255 }
    }
  },
  total_macros: {
    protein: 90,     // Target: 120g (need +30g)
    carbs: 18,       // Target: 150g (need +132g!)
    fat: 27,         // Target: 60g (need +33g)
    calories: 623    // Target: 1500 (need +877!)
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 60,
    calories: 1500
  },
  deviation: {
    protein_percent: 25.0,
    carbs_percent: 88.0,  // Huge carb deficit!
    fat_percent: 55.0,
    calories_percent: 58.5,
    total_percent: 56.6
  }
};

// Sample ingredient constraints (simulating recipe ingredients)
const sampleIngredientConstraints: IngredientConstraint[] = [
  // Protein Smoothie ingredients
  {
    ingredient_id: 101,
    ingredient_name: 'Whey Protein Powder',
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    meal_type: 'reggeli',
    protein_per_g: 0.8,   // 80g protein per 100g
    carbs_per_g: 0.05,    // 5g carbs per 100g
    fat_per_g: 0.02,      // 2g fat per 100g
    calories_per_g: 3.6,  // 360 calories per 100g
    base_quantity: 30,    // 30g in original recipe
    min_scale_factor: 0.5,
    max_scale_factor: 3.0,
    ingredient_type: 'FO_MAKRO'
  },
  {
    ingredient_id: 102,
    ingredient_name: 'Banana',
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    meal_type: 'reggeli',
    protein_per_g: 0.01,  // 1g protein per 100g
    carbs_per_g: 0.23,    // 23g carbs per 100g
    fat_per_g: 0.003,     // 0.3g fat per 100g
    calories_per_g: 0.96, // 96 calories per 100g
    base_quantity: 100,   // 100g in original recipe
    min_scale_factor: 0.8,
    max_scale_factor: 2.0,
    binding_group: 'R1-A', // Bound with milk
    ingredient_type: 'KIEGESZITO'
  },
  {
    ingredient_id: 103,
    ingredient_name: 'Almond Milk',
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    meal_type: 'reggeli',
    protein_per_g: 0.004, // 0.4g protein per 100ml
    carbs_per_g: 0.008,   // 0.8g carbs per 100ml
    fat_per_g: 0.011,     // 1.1g fat per 100ml
    calories_per_g: 0.17, // 17 calories per 100ml
    base_quantity: 250,   // 250ml in original recipe
    min_scale_factor: 0.8,
    max_scale_factor: 2.0,
    binding_group: 'R1-A', // Bound with banana
    ingredient_type: 'KIEGESZITO'
  },
  
  // Chicken Salad ingredients
  {
    ingredient_id: 201,
    ingredient_name: 'Chicken Breast',
    recipe_id: 4,
    recipe_name: 'Chicken Salad',
    meal_type: 'ebéd',
    protein_per_g: 0.31,  // 31g protein per 100g
    carbs_per_g: 0,       // 0g carbs per 100g
    fat_per_g: 0.036,     // 3.6g fat per 100g
    calories_per_g: 1.55, // 155 calories per 100g
    base_quantity: 120,   // 120g in original recipe
    min_scale_factor: 0.7,
    max_scale_factor: 2.5,
    ingredient_type: 'FO_MAKRO'
  },
  {
    ingredient_id: 202,
    ingredient_name: 'Mixed Greens',
    recipe_id: 4,
    recipe_name: 'Chicken Salad',
    meal_type: 'ebéd',
    protein_per_g: 0.022, // 2.2g protein per 100g
    carbs_per_g: 0.036,   // 3.6g carbs per 100g
    fat_per_g: 0.003,     // 0.3g fat per 100g
    calories_per_g: 0.18, // 18 calories per 100g
    base_quantity: 80,    // 80g in original recipe
    min_scale_factor: 0.5,
    max_scale_factor: 3.0,
    ingredient_type: 'KIEGESZITO'
  },
  {
    ingredient_id: 203,
    ingredient_name: 'Olive Oil',
    recipe_id: 4,
    recipe_name: 'Chicken Salad',
    meal_type: 'ebéd',
    protein_per_g: 0,     // 0g protein per 100g
    carbs_per_g: 0,       // 0g carbs per 100g
    fat_per_g: 1.0,       // 100g fat per 100g (pure fat)
    calories_per_g: 9.0,  // 900 calories per 100g
    base_quantity: 10,    // 10g in original recipe
    min_scale_factor: 0.5,
    max_scale_factor: 4.0,
    ingredient_type: 'FO_MAKRO'
  },
  
  // Salmon Fillet ingredients
  {
    ingredient_id: 301,
    ingredient_name: 'Salmon Fillet',
    recipe_id: 7,
    recipe_name: 'Salmon Fillet',
    meal_type: 'vacsora',
    protein_per_g: 0.25,  // 25g protein per 100g
    carbs_per_g: 0,       // 0g carbs per 100g
    fat_per_g: 0.14,      // 14g fat per 100g
    calories_per_g: 2.31, // 231 calories per 100g
    base_quantity: 150,   // 150g in original recipe
    min_scale_factor: 0.6,
    max_scale_factor: 2.0,
    ingredient_type: 'FO_MAKRO'
  },
  {
    ingredient_id: 302,
    ingredient_name: 'Sweet Potato',
    recipe_id: 7,
    recipe_name: 'Salmon Fillet',
    meal_type: 'vacsora',
    protein_per_g: 0.02,  // 2g protein per 100g
    carbs_per_g: 0.17,    // 17g carbs per 100g
    fat_per_g: 0.001,     // 0.1g fat per 100g
    calories_per_g: 0.76, // 76 calories per 100g
    base_quantity: 0,     // Not in original, can be added
    min_scale_factor: 0,
    max_scale_factor: 5.0,
    ingredient_type: 'KIEGESZITO'
  }
];

// Sample scalability data
const sampleScalabilityData: RecipeScalability[] = [
  { recipe_id: 1, protein_scalability: 0.8, carbs_scalability: 0.6, fat_scalability: 0.4, protein_density: 25, carbs_density: 12, fat_density: 8 },
  { recipe_id: 4, protein_scalability: 0.9, carbs_scalability: 0.3, fat_scalability: 0.5, protein_density: 30, carbs_density: 6, fat_density: 8 },
  { recipe_id: 7, protein_scalability: 0.9, carbs_scalability: 0.1, fat_scalability: 0.8, protein_density: 35, carbs_density: 0, fat_density: 15 }
];

export function runLPOptimizerDemo() {
  console.log('🧮 JavaScript LP Optimizer Demo\n');

  // Show the current situation
  console.log('=== Current Meal Combination (Before LP Optimization) ===');
  console.log(`Average Score: ${sampleCombination.average_score.toFixed(1)} (${sampleCombination.meets_threshold ? '✅' : '❌'})`);
  console.log(`Total Deviation: ${sampleCombination.deviation.total_percent.toFixed(1)}%\n`);

  console.log('Current Macros vs Targets:');
  console.log(`  Protein: ${sampleCombination.total_macros.protein}g / ${sampleCombination.target_macros.protein}g (${sampleCombination.deviation.protein_percent.toFixed(1)}% off)`);
  console.log(`  Carbs: ${sampleCombination.total_macros.carbs}g / ${sampleCombination.target_macros.carbs}g (${sampleCombination.deviation.carbs_percent.toFixed(1)}% off)`);
  console.log(`  Fat: ${sampleCombination.total_macros.fat}g / ${sampleCombination.target_macros.fat}g (${sampleCombination.deviation.fat_percent.toFixed(1)}% off)`);
  console.log(`  Calories: ${sampleCombination.total_macros.calories} / ${sampleCombination.target_macros.calories} (${sampleCombination.deviation.calories_percent.toFixed(1)}% off)`);

  console.log('\n' + '='.repeat(70));

  // Show dynamic upper bounds calculation
  console.log('\n=== Dynamic Upper Bounds Calculation ===\n');
  
  sampleScalabilityData.forEach(scalability => {
    const bounds = calculateDynamicUpperBounds(sampleCombination.target_macros.calories, scalability);
    console.log(`Recipe ${scalability.recipe_id} bounds:`);
    console.log(`  Protein: max ${bounds.protein_upper.toFixed(2)}x scaling`);
    console.log(`  Carbs: max ${bounds.carbs_upper.toFixed(2)}x scaling`);
    console.log(`  Fat: max ${bounds.fat_upper.toFixed(2)}x scaling`);
    console.log(`  Calories: max ${bounds.calories_upper.toFixed(2)}x scaling`);
    console.log('');
  });

  console.log('='.repeat(70));

  // Show ingredient constraints
  console.log('\n=== Ingredient Constraints ===\n');
  
  const recipeGroups = new Map<number, IngredientConstraint[]>();
  sampleIngredientConstraints.forEach(ingredient => {
    if (!recipeGroups.has(ingredient.recipe_id)) {
      recipeGroups.set(ingredient.recipe_id, []);
    }
    recipeGroups.get(ingredient.recipe_id)!.push(ingredient);
  });

  recipeGroups.forEach((ingredients, recipeId) => {
    const recipeName = ingredients[0].recipe_name;
    console.log(`${recipeName} (Recipe ${recipeId}):`);
    
    ingredients.forEach(ingredient => {
      const bindingText = ingredient.binding_group ? ` [Group: ${ingredient.binding_group}]` : ' [Independent]';
      console.log(`  - ${ingredient.ingredient_name}: ${ingredient.base_quantity}g`);
      console.log(`    P:${ingredient.protein_per_g}g/g C:${ingredient.carbs_per_g}g/g F:${ingredient.fat_per_g}g/g Cal:${ingredient.calories_per_g}/g`);
      console.log(`    Scale: ${ingredient.min_scale_factor}x - ${ingredient.max_scale_factor}x${bindingText}`);
    });
    console.log('');
  });

  console.log('='.repeat(70));

  // Run LP optimization
  console.log('\n=== Running LP Optimization ===\n');
  
  const optimizationInput: LPOptimizationInput = {
    combination: sampleCombination,
    ingredient_constraints: sampleIngredientConstraints,
    scalability_data: sampleScalabilityData,
    optimization_criteria: createDefaultOptimizationCriteria(sampleCombination.target_macros)
  };

  console.log('Optimization Criteria:');
  const criteria = optimizationInput.optimization_criteria;
  console.log(`  Weights: P:${criteria.weights.protein_weight} C:${criteria.weights.carbs_weight} F:${criteria.weights.fat_weight} Cal:${criteria.weights.calories_weight}`);
  console.log(`  Penalties: Excess:${criteria.penalties.excess_penalty} Deficit:${criteria.penalties.deficit_penalty} Scaling:${criteria.penalties.scaling_penalty}`);

  console.log('\nSolving LP problem...');
  const startTime = Date.now();
  const result = solveLPOptimization(optimizationInput);
  const endTime = Date.now();

  console.log(`\nLP Solver Results:`);
  console.log(`  Status: ${result.status} (${result.success ? '✅' : '❌'})`);
  console.log(`  Solve time: ${result.metadata.solve_time_ms}ms`);
  console.log(`  Variables: ${result.metadata.variables_count}`);
  console.log(`  Constraints: ${result.metadata.constraints_count}`);
  
  if (result.success) {
    console.log(`  Objective value: ${result.objective_value.toFixed(4)}`);
    console.log(`  Iterations: ${result.metadata.iterations || 'N/A'}`);
  }

  console.log('\n' + '='.repeat(70));

  if (result.success) {
    // Show optimized quantities
    console.log('\n=== Optimized Quantities ===\n');
    
    const quantitiesByRecipe = new Map<number, typeof result.optimized_quantities>();
    result.optimized_quantities.forEach(qty => {
      if (!quantitiesByRecipe.has(qty.recipe_id)) {
        quantitiesByRecipe.set(qty.recipe_id, []);
      }
      quantitiesByRecipe.get(qty.recipe_id)!.push(qty);
    });

    quantitiesByRecipe.forEach((quantities, recipeId) => {
      const recipeName = quantities[0]?.recipe_id ? 
        sampleIngredientConstraints.find(ing => ing.recipe_id === recipeId)?.recipe_name : 
        `Recipe ${recipeId}`;
      
      console.log(`${recipeName}:`);
      quantities.forEach(qty => {
        const changeText = qty.scale_factor !== 1.0 ? 
          ` (${qty.scale_factor.toFixed(2)}x scaling)` : 
          ' (no change)';
        const changeIcon = qty.scale_factor > 1.2 ? '📈' : 
                          qty.scale_factor < 0.8 ? '📉' : '➡️';
        
        console.log(`  ${changeIcon} ${qty.ingredient_name}: ${qty.original_quantity}g → ${qty.optimized_quantity}g${changeText}`);
      });
      console.log('');
    });

    // Show optimized macros
    console.log('=== Optimized Macros ===\n');
    
    console.log('Before vs After Optimization:');
    console.log(`  Protein: ${sampleCombination.total_macros.protein}g → ${result.optimized_macros.protein}g (Target: ${sampleCombination.target_macros.protein}g)`);
    console.log(`  Carbs: ${sampleCombination.total_macros.carbs}g → ${result.optimized_macros.carbs}g (Target: ${sampleCombination.target_macros.carbs}g)`);
    console.log(`  Fat: ${sampleCombination.total_macros.fat}g → ${result.optimized_macros.fat}g (Target: ${sampleCombination.target_macros.fat}g)`);
    console.log(`  Calories: ${sampleCombination.total_macros.calories} → ${result.optimized_macros.calories} (Target: ${sampleCombination.target_macros.calories})`);

    console.log('\nDeviation Improvements:');
    console.log(`  Protein: ${sampleCombination.deviation.protein_percent.toFixed(1)}% → ${result.deviations.protein_percent.toFixed(1)}%`);
    console.log(`  Carbs: ${sampleCombination.deviation.carbs_percent.toFixed(1)}% → ${result.deviations.carbs_percent.toFixed(1)}%`);
    console.log(`  Fat: ${sampleCombination.deviation.fat_percent.toFixed(1)}% → ${result.deviations.fat_percent.toFixed(1)}%`);
    console.log(`  Calories: ${sampleCombination.deviation.calories_percent.toFixed(1)}% → ${result.deviations.calories_percent.toFixed(1)}%`);
    console.log(`  TOTAL: ${sampleCombination.deviation.total_percent.toFixed(1)}% → ${result.deviations.total_percent.toFixed(1)}%`);

    const totalImprovement = sampleCombination.deviation.total_percent - result.deviations.total_percent;
    console.log(`\n🎯 Overall improvement: ${totalImprovement > 0 ? '-' : '+'}${Math.abs(totalImprovement).toFixed(1)}% deviation`);

    // Success metrics
    const successMetrics = [];
    if (result.deviations.total_percent < 20) successMetrics.push('✅ Under 20% total deviation');
    if (result.deviations.total_percent < sampleCombination.deviation.total_percent) successMetrics.push('✅ Improved from original');
    if (result.deviations.protein_percent < 15) successMetrics.push('✅ Protein within 15%');
    if (result.deviations.carbs_percent < 20) successMetrics.push('✅ Carbs within 20%');
    if (result.deviations.fat_percent < 25) successMetrics.push('✅ Fat within 25%');

    if (successMetrics.length > 0) {
      console.log('\nSuccess Metrics:');
      successMetrics.forEach(metric => console.log(`  ${metric}`));
    }

  } else {
    console.log('\n❌ Optimization Failed');
    console.log(`Reason: ${result.status}`);
    console.log('\nPossible solutions:');
    console.log('  - Relax ingredient scaling constraints');
    console.log('  - Add more flexible ingredients');
    console.log('  - Adjust target macros');
    console.log('  - Use fallback recipe generation');
  }

  console.log('\n' + '='.repeat(70));

  // Test with different criteria
  console.log('\n=== Testing Different Optimization Criteria ===\n');
  
  const aggressiveCriteria = createDefaultOptimizationCriteria(sampleCombination.target_macros);
  aggressiveCriteria.penalties.deficit_penalty = 5.0; // Higher penalty for being under target
  aggressiveCriteria.penalties.excess_penalty = 1.0;  // Lower penalty for overshooting
  aggressiveCriteria.weights.carbs_weight = 0.4;      // Focus more on carbs (the biggest problem)
  aggressiveCriteria.weights.protein_weight = 0.2;

  const aggressiveInput: LPOptimizationInput = {
    ...optimizationInput,
    optimization_criteria: aggressiveCriteria
  };

  console.log('Testing aggressive criteria (focus on carbs, penalize deficits heavily)...');
  const aggressiveResult = solveLPOptimization(aggressiveInput);

  if (aggressiveResult.success) {
    console.log(`  Aggressive result deviation: ${aggressiveResult.deviations.total_percent.toFixed(1)}%`);
    console.log(`  Carbs deviation: ${aggressiveResult.deviations.carbs_percent.toFixed(1)}%`);
    
    if (aggressiveResult.deviations.total_percent < result.deviations.total_percent) {
      console.log('  ✅ Aggressive criteria performed better!');
    } else {
      console.log('  ➡️ Default criteria were sufficient');
    }
  } else {
    console.log('  ❌ Aggressive criteria failed to find solution');
  }

  console.log('\n✅ LP Optimizer Demo Complete!');
}

// Uncomment to run demo in development
// runLPOptimizerDemo();
 