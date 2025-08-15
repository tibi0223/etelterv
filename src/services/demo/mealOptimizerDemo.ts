/**
 * Demo for Meal Optimizer
 * Shows how weak macro swapping optimization works
 */

import {
  optimizeMealCombination,
  identifyMacroWeaknesses,
  findMacroStrongRecipes,
  DEFAULT_OPTIMIZER_CRITERIA,
  OptimizerCriteria
} from '../mealOptimizer';
import { MealCombination } from '../mealCombiner';
import { VarietyAdjustment } from '../recipeRanker';
import { RecipeScalability } from '../recipeScorer';

// Sample suboptimal meal combination (with macro weaknesses)
const sampleWeakCombination: MealCombination = {
  meal_plan_id: 'plan_demo_weak',
  total_score: 235.8,
  average_score: 78.6,  // Below 80 threshold
  meets_threshold: false,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 8,
        recipe_name: 'Greek Yogurt Bowl',
        base_score: 79.5,
        penalty: 0,
        reward: 0,
        final_score: 79.5,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 0
      },
      assigned_macros: { protein: 15, carbs: 20, fat: 5, calories: 180 }
    },
    ebéd: {
      recipe: {
        recipe_id: 6,
        recipe_name: 'Rice Bowl',
        base_score: 75.4,
        penalty: 0,
        reward: 0,
        final_score: 75.4,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 0
      },
      assigned_macros: { protein: 8, carbs: 60, fat: 3, calories: 290 }
    },
    vacsora: {
      recipe: {
        recipe_id: 9,
        recipe_name: 'Vegetable Stir Fry',
        base_score: 80.9,
        penalty: 0,
        reward: 0,
        final_score: 80.9,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 0
      },
      assigned_macros: { protein: 6, carbs: 25, fat: 8, calories: 175 }
    }
  },
  total_macros: {
    protein: 29,    // Way too low! Target: 120g
    carbs: 105,     // Too low! Target: 150g
    fat: 16,        // Way too low! Target: 60g
    calories: 645   // Too low! Target: 1500
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 60,
    calories: 1500
  },
  deviation: {
    protein_percent: 75.8,   // Huge protein deficit
    carbs_percent: 30.0,     // Carb deficit
    fat_percent: 73.3,       // Huge fat deficit
    calories_percent: 57.0,  // Calorie deficit
    total_percent: 59.0      // Very high overall deviation
  }
};

// Available recipes for optimization
const availableRecipesForOptimization: { [mealType: string]: VarietyAdjustment[] } = {
  reggeli: [
    {
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
    {
      recipe_id: 3,
      recipe_name: 'Scrambled Eggs',
      base_score: 82.1,
      penalty: 0,
      reward: 0,
      final_score: 82.1,
      is_favorite: false,
      usage_count_last_7_days: 0,
      usage_count_last_30_days: 2
    },
    {
      recipe_id: 2,
      recipe_name: 'Overnight Oats',
      base_score: 78.3,
      penalty: 0,
      reward: 8,
      final_score: 86.3,
      is_favorite: false,
      usage_count_last_7_days: 0,
      usage_count_last_30_days: 0
    }
  ],
  ebéd: [
    {
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
    {
      recipe_id: 5,
      recipe_name: 'Pasta Bolognese',
      base_score: 88.8,
      penalty: -5,
      reward: 0,
      final_score: 83.8,
      is_favorite: false,
      days_since_last_use: 2,
      usage_count_last_7_days: 1,
      usage_count_last_30_days: 3
    }
  ],
  vacsora: [
    {
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
    {
      recipe_id: 11,
      recipe_name: 'Beef Steak',
      base_score: 89.5,
      penalty: 0,
      reward: 0,
      final_score: 89.5,
      is_favorite: false,
      usage_count_last_7_days: 0,
      usage_count_last_30_days: 0
    }
  ]
};

// Recipe base data (macros)
const optimizerRecipeBaseData = [
  { recipe_id: 1, Feherje_g: 30, Szenhidrat_g: 15, Zsir_g: 5 },   // Protein Smoothie - High protein
  { recipe_id: 2, Feherje_g: 12, Szenhidrat_g: 45, Zsir_g: 8 },   // Overnight Oats - High carbs
  { recipe_id: 3, Feherje_g: 18, Szenhidrat_g: 2, Zsir_g: 12 },   // Scrambled Eggs - High protein/fat
  { recipe_id: 4, Feherje_g: 35, Szenhidrat_g: 8, Zsir_g: 10 },   // Chicken Salad - Very high protein
  { recipe_id: 5, Feherje_g: 22, Szenhidrat_g: 55, Zsir_g: 15 },  // Pasta Bolognese - High carbs
  { recipe_id: 6, Feherje_g: 8, Szenhidrat_g: 60, Zsir_g: 3 },    // Rice Bowl - High carbs, low protein
  { recipe_id: 7, Feherje_g: 40, Szenhidrat_g: 0, Zsir_g: 18 },   // Salmon Fillet - Very high protein/fat
  { recipe_id: 8, Feherje_g: 15, Szenhidrat_g: 20, Zsir_g: 5 },   // Greek Yogurt Bowl - Medium protein
  { recipe_id: 9, Feherje_g: 6, Szenhidrat_g: 25, Zsir_g: 8 },    // Vegetable Stir Fry - Low protein
  { recipe_id: 11, Feherje_g: 45, Szenhidrat_g: 0, Zsir_g: 20 }   // Beef Steak - Very high protein/fat
];

// Sample scalability data
const optimizerScalabilityData: RecipeScalability[] = [
  { recipe_id: 1, protein_scalability: 0.8, carbs_scalability: 0.6, fat_scalability: 0.4, protein_density: 25, carbs_density: 12, fat_density: 8 },
  { recipe_id: 2, protein_scalability: 0.5, carbs_scalability: 0.9, fat_scalability: 0.3, protein_density: 10, carbs_density: 40, fat_density: 6 },
  { recipe_id: 3, protein_scalability: 0.7, carbs_scalability: 0.2, fat_scalability: 0.7, protein_density: 15, carbs_density: 2, fat_density: 10 },
  { recipe_id: 4, protein_scalability: 0.9, carbs_scalability: 0.3, fat_scalability: 0.5, protein_density: 30, carbs_density: 6, fat_density: 8 },
  { recipe_id: 5, protein_scalability: 0.6, carbs_scalability: 0.9, fat_scalability: 0.4, protein_density: 18, carbs_density: 45, fat_density: 12 },
  { recipe_id: 6, protein_scalability: 0.2, carbs_scalability: 0.9, fat_scalability: 0.1, protein_density: 6, carbs_density: 50, fat_density: 2 },
  { recipe_id: 7, protein_scalability: 0.9, carbs_scalability: 0.1, fat_scalability: 0.8, protein_density: 35, carbs_density: 0, fat_density: 15 },
  { recipe_id: 8, protein_scalability: 0.6, carbs_scalability: 0.5, fat_scalability: 0.3, protein_density: 12, carbs_density: 15, fat_density: 4 },
  { recipe_id: 9, protein_scalability: 0.3, carbs_scalability: 0.7, fat_scalability: 0.4, protein_density: 4, carbs_density: 20, fat_density: 6 },
  { recipe_id: 11, protein_scalability: 0.9, carbs_scalability: 0.1, fat_scalability: 0.9, protein_density: 40, carbs_density: 0, fat_density: 18 }
];

export function runMealOptimizerDemo() {
  console.log('🔧 Meal Optimizer Demo\n');

  // Show the problematic initial combination
  console.log('=== Initial Combination (With Problems) ===');
  console.log(`Average Score: ${sampleWeakCombination.average_score.toFixed(1)} (${sampleWeakCombination.meets_threshold ? '✅' : '❌'} threshold)`);
  console.log(`Total Deviation: ${sampleWeakCombination.deviation.total_percent.toFixed(1)}%\n`);

  console.log('Current Meals:');
  Object.entries(sampleWeakCombination.meals).forEach(([mealType, meal]) => {
    const macros = meal.assigned_macros;
    console.log(`  ${mealType}: ${meal.recipe.recipe_name} (${meal.recipe.final_score.toFixed(1)}pts)`);
    if (macros) {
      console.log(`    P:${macros.protein}g C:${macros.carbs}g F:${macros.fat}g Cal:${macros.calories}`);
    }
  });

  console.log('\nTarget vs Actual Macros:');
  console.log(`  Protein: ${sampleWeakCombination.total_macros.protein}g / ${sampleWeakCombination.target_macros.protein}g (${sampleWeakCombination.deviation.protein_percent.toFixed(1)}% off)`);
  console.log(`  Carbs: ${sampleWeakCombination.total_macros.carbs}g / ${sampleWeakCombination.target_macros.carbs}g (${sampleWeakCombination.deviation.carbs_percent.toFixed(1)}% off)`);
  console.log(`  Fat: ${sampleWeakCombination.total_macros.fat}g / ${sampleWeakCombination.target_macros.fat}g (${sampleWeakCombination.deviation.fat_percent.toFixed(1)}% off)`);
  console.log(`  Calories: ${sampleWeakCombination.total_macros.calories} / ${sampleWeakCombination.target_macros.calories} (${sampleWeakCombination.deviation.calories_percent.toFixed(1)}% off)`);

  console.log('\n' + '='.repeat(60));

  // Analyze weaknesses
  console.log('\n=== Weakness Analysis ===');
  const weaknesses = identifyMacroWeaknesses(sampleWeakCombination, DEFAULT_OPTIMIZER_CRITERIA.macroTolerances);
  
  console.log(`Found ${weaknesses.length} macro weaknesses:\n`);
  weaknesses.forEach((weakness, index) => {
    const severity = weakness.severity === 'high' ? '🔴' : weakness.severity === 'medium' ? '🟡' : '🟢';
    const direction = weakness.needs_increase ? '↗️ Too Low' : '↘️ Too High';
    console.log(`${index + 1}. ${weakness.macro_type.toUpperCase()} ${severity} ${direction}`);
    console.log(`   Current: ${weakness.current_value.toFixed(1)} | Target: ${weakness.target_value.toFixed(1)} | Deviation: ${weakness.deviation_percent.toFixed(1)}%`);
  });

  console.log('\n' + '='.repeat(60));

  // Show potential strong recipes for each weakness
  console.log('\n=== Available Strong Recipes ===');
  
  const primaryWeakness = weaknesses[0];
  if (primaryWeakness) {
    console.log(`\nFocusing on PRIMARY weakness: ${primaryWeakness.macro_type.toUpperCase()}\n`);
    
    Object.entries(availableRecipesForOptimization).forEach(([mealType, recipes]) => {
      console.log(`${mealType.toUpperCase()} options strong in ${primaryWeakness.macro_type}:`);
      
      const strongRecipes = findMacroStrongRecipes(
        recipes,
        mealType,
        primaryWeakness.macro_type,
        optimizerRecipeBaseData,
        optimizerScalabilityData,
        sampleWeakCombination.meals[mealType]?.recipe.recipe_id
      );
      
      strongRecipes.forEach(recipe => {
        const baseData = optimizerRecipeBaseData.find(r => r.recipe_id === recipe.recipe_id);
        if (baseData) {
          let macroValue = 0;
          switch (primaryWeakness.macro_type) {
            case 'protein': macroValue = baseData.Feherje_g; break;
            case 'carbs': macroValue = baseData.Szenhidrat_g; break;
            case 'fat': macroValue = baseData.Zsir_g; break;
            case 'calories': macroValue = (baseData.Feherje_g * 4) + (baseData.Szenhidrat_g * 4) + (baseData.Zsir_g * 9); break;
          }
          console.log(`  - ${recipe.recipe_name}: ${macroValue}${primaryWeakness.macro_type === 'calories' ? 'kcal' : 'g'} ${primaryWeakness.macro_type} (${recipe.final_score.toFixed(1)}pts)`);
        }
      });
      console.log('');
    });
  }

  console.log('='.repeat(60));

  // Run optimization with default criteria
  console.log('\n=== Optimization Process (Default Criteria) ===\n');
  
  const optimizationResult = optimizeMealCombination(
    sampleWeakCombination,
    availableRecipesForOptimization,
    optimizerRecipeBaseData,
    optimizerScalabilityData,
    DEFAULT_OPTIMIZER_CRITERIA
  );

  console.log('Optimization Summary:');
  console.log(`  Swaps made: ${optimizationResult.swaps_made.length}/${DEFAULT_OPTIMIZER_CRITERIA.maxSwaps}`);
  console.log(`  Score improvement: ${optimizationResult.improvements.score_improvement > 0 ? '+' : ''}${optimizationResult.improvements.score_improvement.toFixed(1)} points`);
  console.log(`  Deviation reduction: ${optimizationResult.improvements.deviation_reduction > 0 ? '-' : ''}${optimizationResult.improvements.deviation_reduction.toFixed(1)}%`);
  console.log(`  Weak macros fixed: ${optimizationResult.improvements.weak_macros_fixed}`);
  console.log(`  Success: ${optimizationResult.final_analysis.optimization_success ? '✅' : '❌'}`);
  console.log(`  Final quality score: ${optimizationResult.final_analysis.quality_score}/100`);

  if (optimizationResult.swaps_made.length > 0) {
    console.log('\nSwaps Made:');
    optimizationResult.swaps_made.forEach((swap, index) => {
      console.log(`  ${index + 1}. ${swap.meal_type}: ${swap.old_recipe} → ${swap.new_recipe}`);
      console.log(`     Reason: ${swap.reason}`);
    });
  }

  console.log('\n=== Optimized Results ===');
  const optimized = optimizationResult.optimized_combination;
  console.log(`Average Score: ${optimized.average_score.toFixed(1)} (${optimized.meets_threshold ? '✅' : '❌'} threshold)`);
  console.log(`Total Deviation: ${optimized.deviation.total_percent.toFixed(1)}%\n`);

  console.log('Optimized Meals:');
  Object.entries(optimized.meals).forEach(([mealType, meal]) => {
    const macros = meal.assigned_macros;
    console.log(`  ${mealType}: ${meal.recipe.recipe_name} (${meal.recipe.final_score.toFixed(1)}pts)`);
    if (macros) {
      console.log(`    P:${macros.protein}g C:${macros.carbs}g F:${macros.fat}g Cal:${macros.calories}`);
    }
  });

  console.log('\nOptimized Macros:');
  console.log(`  Protein: ${optimized.total_macros.protein.toFixed(1)}g / ${optimized.target_macros.protein}g (${optimized.deviation.protein_percent.toFixed(1)}% off)`);
  console.log(`  Carbs: ${optimized.total_macros.carbs.toFixed(1)}g / ${optimized.target_macros.carbs}g (${optimized.deviation.carbs_percent.toFixed(1)}% off)`);
  console.log(`  Fat: ${optimized.total_macros.fat.toFixed(1)}g / ${optimized.target_macros.fat}g (${optimized.deviation.fat_percent.toFixed(1)}% off)`);
  console.log(`  Calories: ${optimized.total_macros.calories.toFixed(0)} / ${optimized.target_macros.calories} (${optimized.deviation.calories_percent.toFixed(1)}% off)`);

  // Show remaining weaknesses
  if (optimizationResult.final_analysis.remaining_weaknesses.length > 0) {
    console.log('\nRemaining Weaknesses:');
    optimizationResult.final_analysis.remaining_weaknesses.forEach(weakness => {
      console.log(`  - ${weakness.macro_type.toUpperCase()}: ${weakness.deviation_percent.toFixed(1)}% deviation (${weakness.severity})`);
    });
  } else {
    console.log('\n✅ All macro weaknesses resolved!');
  }

  console.log('\n' + '='.repeat(60));

  // Test with aggressive optimization criteria
  console.log('\n=== Testing Aggressive Optimization ===\n');
  
  const aggressiveCriteria: OptimizerCriteria = {
    maxSwaps: 5,  // More swaps allowed
    minImprovementThreshold: 2,  // Lower threshold
    macroTolerances: {
      protein: 10,  // Stricter tolerances
      carbs: 10,
      fat: 15,
      calories: 8
    },
    swapPreferences: {
      preserveVariety: false,     // Don't preserve variety
      favoriteProtection: false,  // Don't protect favorites
      scoreWeight: 0.3            // Focus more on macros than score
    }
  };

  const aggressiveResult = optimizeMealCombination(
    sampleWeakCombination,
    availableRecipesForOptimization,
    optimizerRecipeBaseData,
    optimizerScalabilityData,
    aggressiveCriteria
  );

  console.log('Aggressive Optimization Results:');
  console.log(`  Swaps made: ${aggressiveResult.swaps_made.length}/${aggressiveCriteria.maxSwaps}`);
  console.log(`  Score improvement: ${aggressiveResult.improvements.score_improvement > 0 ? '+' : ''}${aggressiveResult.improvements.score_improvement.toFixed(1)} points`);
  console.log(`  Deviation reduction: ${aggressiveResult.improvements.deviation_reduction > 0 ? '-' : ''}${aggressiveResult.improvements.deviation_reduction.toFixed(1)}%`);
  console.log(`  Final deviation: ${aggressiveResult.optimized_combination.deviation.total_percent.toFixed(1)}%`);
  console.log(`  Final quality: ${aggressiveResult.final_analysis.quality_score}/100`);

  console.log('\n=== Comparison Summary ===');
  console.log(`Original: Score ${sampleWeakCombination.average_score.toFixed(1)}, Deviation ${sampleWeakCombination.deviation.total_percent.toFixed(1)}%`);
  console.log(`Default Opt: Score ${optimizationResult.optimized_combination.average_score.toFixed(1)}, Deviation ${optimizationResult.optimized_combination.deviation.total_percent.toFixed(1)}%`);
  console.log(`Aggressive: Score ${aggressiveResult.optimized_combination.average_score.toFixed(1)}, Deviation ${aggressiveResult.optimized_combination.deviation.total_percent.toFixed(1)}%`);

  console.log('\n✅ Meal Optimizer Demo Complete!');
}

// Uncomment to run demo in development
// runMealOptimizerDemo();
 * Demo for Meal Optimizer
 * Shows how weak macro swapping optimization works
 */

import {
  optimizeMealCombination,
  identifyMacroWeaknesses,
  findMacroStrongRecipes,
  DEFAULT_OPTIMIZER_CRITERIA,
  OptimizerCriteria
} from '../mealOptimizer';
import { MealCombination } from '../mealCombiner';
import { VarietyAdjustment } from '../recipeRanker';
import { RecipeScalability } from '../recipeScorer';

// Sample suboptimal meal combination (with macro weaknesses)
const sampleWeakCombination: MealCombination = {
  meal_plan_id: 'plan_demo_weak',
  total_score: 235.8,
  average_score: 78.6,  // Below 80 threshold
  meets_threshold: false,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 8,
        recipe_name: 'Greek Yogurt Bowl',
        base_score: 79.5,
        penalty: 0,
        reward: 0,
        final_score: 79.5,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 0
      },
      assigned_macros: { protein: 15, carbs: 20, fat: 5, calories: 180 }
    },
    ebéd: {
      recipe: {
        recipe_id: 6,
        recipe_name: 'Rice Bowl',
        base_score: 75.4,
        penalty: 0,
        reward: 0,
        final_score: 75.4,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 0
      },
      assigned_macros: { protein: 8, carbs: 60, fat: 3, calories: 290 }
    },
    vacsora: {
      recipe: {
        recipe_id: 9,
        recipe_name: 'Vegetable Stir Fry',
        base_score: 80.9,
        penalty: 0,
        reward: 0,
        final_score: 80.9,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 0
      },
      assigned_macros: { protein: 6, carbs: 25, fat: 8, calories: 175 }
    }
  },
  total_macros: {
    protein: 29,    // Way too low! Target: 120g
    carbs: 105,     // Too low! Target: 150g
    fat: 16,        // Way too low! Target: 60g
    calories: 645   // Too low! Target: 1500
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 60,
    calories: 1500
  },
  deviation: {
    protein_percent: 75.8,   // Huge protein deficit
    carbs_percent: 30.0,     // Carb deficit
    fat_percent: 73.3,       // Huge fat deficit
    calories_percent: 57.0,  // Calorie deficit
    total_percent: 59.0      // Very high overall deviation
  }
};

// Available recipes for optimization
const availableRecipesForOptimization: { [mealType: string]: VarietyAdjustment[] } = {
  reggeli: [
    {
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
    {
      recipe_id: 3,
      recipe_name: 'Scrambled Eggs',
      base_score: 82.1,
      penalty: 0,
      reward: 0,
      final_score: 82.1,
      is_favorite: false,
      usage_count_last_7_days: 0,
      usage_count_last_30_days: 2
    },
    {
      recipe_id: 2,
      recipe_name: 'Overnight Oats',
      base_score: 78.3,
      penalty: 0,
      reward: 8,
      final_score: 86.3,
      is_favorite: false,
      usage_count_last_7_days: 0,
      usage_count_last_30_days: 0
    }
  ],
  ebéd: [
    {
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
    {
      recipe_id: 5,
      recipe_name: 'Pasta Bolognese',
      base_score: 88.8,
      penalty: -5,
      reward: 0,
      final_score: 83.8,
      is_favorite: false,
      days_since_last_use: 2,
      usage_count_last_7_days: 1,
      usage_count_last_30_days: 3
    }
  ],
  vacsora: [
    {
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
    {
      recipe_id: 11,
      recipe_name: 'Beef Steak',
      base_score: 89.5,
      penalty: 0,
      reward: 0,
      final_score: 89.5,
      is_favorite: false,
      usage_count_last_7_days: 0,
      usage_count_last_30_days: 0
    }
  ]
};

// Recipe base data (macros)
const optimizerRecipeBaseData = [
  { recipe_id: 1, Feherje_g: 30, Szenhidrat_g: 15, Zsir_g: 5 },   // Protein Smoothie - High protein
  { recipe_id: 2, Feherje_g: 12, Szenhidrat_g: 45, Zsir_g: 8 },   // Overnight Oats - High carbs
  { recipe_id: 3, Feherje_g: 18, Szenhidrat_g: 2, Zsir_g: 12 },   // Scrambled Eggs - High protein/fat
  { recipe_id: 4, Feherje_g: 35, Szenhidrat_g: 8, Zsir_g: 10 },   // Chicken Salad - Very high protein
  { recipe_id: 5, Feherje_g: 22, Szenhidrat_g: 55, Zsir_g: 15 },  // Pasta Bolognese - High carbs
  { recipe_id: 6, Feherje_g: 8, Szenhidrat_g: 60, Zsir_g: 3 },    // Rice Bowl - High carbs, low protein
  { recipe_id: 7, Feherje_g: 40, Szenhidrat_g: 0, Zsir_g: 18 },   // Salmon Fillet - Very high protein/fat
  { recipe_id: 8, Feherje_g: 15, Szenhidrat_g: 20, Zsir_g: 5 },   // Greek Yogurt Bowl - Medium protein
  { recipe_id: 9, Feherje_g: 6, Szenhidrat_g: 25, Zsir_g: 8 },    // Vegetable Stir Fry - Low protein
  { recipe_id: 11, Feherje_g: 45, Szenhidrat_g: 0, Zsir_g: 20 }   // Beef Steak - Very high protein/fat
];

// Sample scalability data
const optimizerScalabilityData: RecipeScalability[] = [
  { recipe_id: 1, protein_scalability: 0.8, carbs_scalability: 0.6, fat_scalability: 0.4, protein_density: 25, carbs_density: 12, fat_density: 8 },
  { recipe_id: 2, protein_scalability: 0.5, carbs_scalability: 0.9, fat_scalability: 0.3, protein_density: 10, carbs_density: 40, fat_density: 6 },
  { recipe_id: 3, protein_scalability: 0.7, carbs_scalability: 0.2, fat_scalability: 0.7, protein_density: 15, carbs_density: 2, fat_density: 10 },
  { recipe_id: 4, protein_scalability: 0.9, carbs_scalability: 0.3, fat_scalability: 0.5, protein_density: 30, carbs_density: 6, fat_density: 8 },
  { recipe_id: 5, protein_scalability: 0.6, carbs_scalability: 0.9, fat_scalability: 0.4, protein_density: 18, carbs_density: 45, fat_density: 12 },
  { recipe_id: 6, protein_scalability: 0.2, carbs_scalability: 0.9, fat_scalability: 0.1, protein_density: 6, carbs_density: 50, fat_density: 2 },
  { recipe_id: 7, protein_scalability: 0.9, carbs_scalability: 0.1, fat_scalability: 0.8, protein_density: 35, carbs_density: 0, fat_density: 15 },
  { recipe_id: 8, protein_scalability: 0.6, carbs_scalability: 0.5, fat_scalability: 0.3, protein_density: 12, carbs_density: 15, fat_density: 4 },
  { recipe_id: 9, protein_scalability: 0.3, carbs_scalability: 0.7, fat_scalability: 0.4, protein_density: 4, carbs_density: 20, fat_density: 6 },
  { recipe_id: 11, protein_scalability: 0.9, carbs_scalability: 0.1, fat_scalability: 0.9, protein_density: 40, carbs_density: 0, fat_density: 18 }
];

export function runMealOptimizerDemo() {
  console.log('🔧 Meal Optimizer Demo\n');

  // Show the problematic initial combination
  console.log('=== Initial Combination (With Problems) ===');
  console.log(`Average Score: ${sampleWeakCombination.average_score.toFixed(1)} (${sampleWeakCombination.meets_threshold ? '✅' : '❌'} threshold)`);
  console.log(`Total Deviation: ${sampleWeakCombination.deviation.total_percent.toFixed(1)}%\n`);

  console.log('Current Meals:');
  Object.entries(sampleWeakCombination.meals).forEach(([mealType, meal]) => {
    const macros = meal.assigned_macros;
    console.log(`  ${mealType}: ${meal.recipe.recipe_name} (${meal.recipe.final_score.toFixed(1)}pts)`);
    if (macros) {
      console.log(`    P:${macros.protein}g C:${macros.carbs}g F:${macros.fat}g Cal:${macros.calories}`);
    }
  });

  console.log('\nTarget vs Actual Macros:');
  console.log(`  Protein: ${sampleWeakCombination.total_macros.protein}g / ${sampleWeakCombination.target_macros.protein}g (${sampleWeakCombination.deviation.protein_percent.toFixed(1)}% off)`);
  console.log(`  Carbs: ${sampleWeakCombination.total_macros.carbs}g / ${sampleWeakCombination.target_macros.carbs}g (${sampleWeakCombination.deviation.carbs_percent.toFixed(1)}% off)`);
  console.log(`  Fat: ${sampleWeakCombination.total_macros.fat}g / ${sampleWeakCombination.target_macros.fat}g (${sampleWeakCombination.deviation.fat_percent.toFixed(1)}% off)`);
  console.log(`  Calories: ${sampleWeakCombination.total_macros.calories} / ${sampleWeakCombination.target_macros.calories} (${sampleWeakCombination.deviation.calories_percent.toFixed(1)}% off)`);

  console.log('\n' + '='.repeat(60));

  // Analyze weaknesses
  console.log('\n=== Weakness Analysis ===');
  const weaknesses = identifyMacroWeaknesses(sampleWeakCombination, DEFAULT_OPTIMIZER_CRITERIA.macroTolerances);
  
  console.log(`Found ${weaknesses.length} macro weaknesses:\n`);
  weaknesses.forEach((weakness, index) => {
    const severity = weakness.severity === 'high' ? '🔴' : weakness.severity === 'medium' ? '🟡' : '🟢';
    const direction = weakness.needs_increase ? '↗️ Too Low' : '↘️ Too High';
    console.log(`${index + 1}. ${weakness.macro_type.toUpperCase()} ${severity} ${direction}`);
    console.log(`   Current: ${weakness.current_value.toFixed(1)} | Target: ${weakness.target_value.toFixed(1)} | Deviation: ${weakness.deviation_percent.toFixed(1)}%`);
  });

  console.log('\n' + '='.repeat(60));

  // Show potential strong recipes for each weakness
  console.log('\n=== Available Strong Recipes ===');
  
  const primaryWeakness = weaknesses[0];
  if (primaryWeakness) {
    console.log(`\nFocusing on PRIMARY weakness: ${primaryWeakness.macro_type.toUpperCase()}\n`);
    
    Object.entries(availableRecipesForOptimization).forEach(([mealType, recipes]) => {
      console.log(`${mealType.toUpperCase()} options strong in ${primaryWeakness.macro_type}:`);
      
      const strongRecipes = findMacroStrongRecipes(
        recipes,
        mealType,
        primaryWeakness.macro_type,
        optimizerRecipeBaseData,
        optimizerScalabilityData,
        sampleWeakCombination.meals[mealType]?.recipe.recipe_id
      );
      
      strongRecipes.forEach(recipe => {
        const baseData = optimizerRecipeBaseData.find(r => r.recipe_id === recipe.recipe_id);
        if (baseData) {
          let macroValue = 0;
          switch (primaryWeakness.macro_type) {
            case 'protein': macroValue = baseData.Feherje_g; break;
            case 'carbs': macroValue = baseData.Szenhidrat_g; break;
            case 'fat': macroValue = baseData.Zsir_g; break;
            case 'calories': macroValue = (baseData.Feherje_g * 4) + (baseData.Szenhidrat_g * 4) + (baseData.Zsir_g * 9); break;
          }
          console.log(`  - ${recipe.recipe_name}: ${macroValue}${primaryWeakness.macro_type === 'calories' ? 'kcal' : 'g'} ${primaryWeakness.macro_type} (${recipe.final_score.toFixed(1)}pts)`);
        }
      });
      console.log('');
    });
  }

  console.log('='.repeat(60));

  // Run optimization with default criteria
  console.log('\n=== Optimization Process (Default Criteria) ===\n');
  
  const optimizationResult = optimizeMealCombination(
    sampleWeakCombination,
    availableRecipesForOptimization,
    optimizerRecipeBaseData,
    optimizerScalabilityData,
    DEFAULT_OPTIMIZER_CRITERIA
  );

  console.log('Optimization Summary:');
  console.log(`  Swaps made: ${optimizationResult.swaps_made.length}/${DEFAULT_OPTIMIZER_CRITERIA.maxSwaps}`);
  console.log(`  Score improvement: ${optimizationResult.improvements.score_improvement > 0 ? '+' : ''}${optimizationResult.improvements.score_improvement.toFixed(1)} points`);
  console.log(`  Deviation reduction: ${optimizationResult.improvements.deviation_reduction > 0 ? '-' : ''}${optimizationResult.improvements.deviation_reduction.toFixed(1)}%`);
  console.log(`  Weak macros fixed: ${optimizationResult.improvements.weak_macros_fixed}`);
  console.log(`  Success: ${optimizationResult.final_analysis.optimization_success ? '✅' : '❌'}`);
  console.log(`  Final quality score: ${optimizationResult.final_analysis.quality_score}/100`);

  if (optimizationResult.swaps_made.length > 0) {
    console.log('\nSwaps Made:');
    optimizationResult.swaps_made.forEach((swap, index) => {
      console.log(`  ${index + 1}. ${swap.meal_type}: ${swap.old_recipe} → ${swap.new_recipe}`);
      console.log(`     Reason: ${swap.reason}`);
    });
  }

  console.log('\n=== Optimized Results ===');
  const optimized = optimizationResult.optimized_combination;
  console.log(`Average Score: ${optimized.average_score.toFixed(1)} (${optimized.meets_threshold ? '✅' : '❌'} threshold)`);
  console.log(`Total Deviation: ${optimized.deviation.total_percent.toFixed(1)}%\n`);

  console.log('Optimized Meals:');
  Object.entries(optimized.meals).forEach(([mealType, meal]) => {
    const macros = meal.assigned_macros;
    console.log(`  ${mealType}: ${meal.recipe.recipe_name} (${meal.recipe.final_score.toFixed(1)}pts)`);
    if (macros) {
      console.log(`    P:${macros.protein}g C:${macros.carbs}g F:${macros.fat}g Cal:${macros.calories}`);
    }
  });

  console.log('\nOptimized Macros:');
  console.log(`  Protein: ${optimized.total_macros.protein.toFixed(1)}g / ${optimized.target_macros.protein}g (${optimized.deviation.protein_percent.toFixed(1)}% off)`);
  console.log(`  Carbs: ${optimized.total_macros.carbs.toFixed(1)}g / ${optimized.target_macros.carbs}g (${optimized.deviation.carbs_percent.toFixed(1)}% off)`);
  console.log(`  Fat: ${optimized.total_macros.fat.toFixed(1)}g / ${optimized.target_macros.fat}g (${optimized.deviation.fat_percent.toFixed(1)}% off)`);
  console.log(`  Calories: ${optimized.total_macros.calories.toFixed(0)} / ${optimized.target_macros.calories} (${optimized.deviation.calories_percent.toFixed(1)}% off)`);

  // Show remaining weaknesses
  if (optimizationResult.final_analysis.remaining_weaknesses.length > 0) {
    console.log('\nRemaining Weaknesses:');
    optimizationResult.final_analysis.remaining_weaknesses.forEach(weakness => {
      console.log(`  - ${weakness.macro_type.toUpperCase()}: ${weakness.deviation_percent.toFixed(1)}% deviation (${weakness.severity})`);
    });
  } else {
    console.log('\n✅ All macro weaknesses resolved!');
  }

  console.log('\n' + '='.repeat(60));

  // Test with aggressive optimization criteria
  console.log('\n=== Testing Aggressive Optimization ===\n');
  
  const aggressiveCriteria: OptimizerCriteria = {
    maxSwaps: 5,  // More swaps allowed
    minImprovementThreshold: 2,  // Lower threshold
    macroTolerances: {
      protein: 10,  // Stricter tolerances
      carbs: 10,
      fat: 15,
      calories: 8
    },
    swapPreferences: {
      preserveVariety: false,     // Don't preserve variety
      favoriteProtection: false,  // Don't protect favorites
      scoreWeight: 0.3            // Focus more on macros than score
    }
  };

  const aggressiveResult = optimizeMealCombination(
    sampleWeakCombination,
    availableRecipesForOptimization,
    optimizerRecipeBaseData,
    optimizerScalabilityData,
    aggressiveCriteria
  );

  console.log('Aggressive Optimization Results:');
  console.log(`  Swaps made: ${aggressiveResult.swaps_made.length}/${aggressiveCriteria.maxSwaps}`);
  console.log(`  Score improvement: ${aggressiveResult.improvements.score_improvement > 0 ? '+' : ''}${aggressiveResult.improvements.score_improvement.toFixed(1)} points`);
  console.log(`  Deviation reduction: ${aggressiveResult.improvements.deviation_reduction > 0 ? '-' : ''}${aggressiveResult.improvements.deviation_reduction.toFixed(1)}%`);
  console.log(`  Final deviation: ${aggressiveResult.optimized_combination.deviation.total_percent.toFixed(1)}%`);
  console.log(`  Final quality: ${aggressiveResult.final_analysis.quality_score}/100`);

  console.log('\n=== Comparison Summary ===');
  console.log(`Original: Score ${sampleWeakCombination.average_score.toFixed(1)}, Deviation ${sampleWeakCombination.deviation.total_percent.toFixed(1)}%`);
  console.log(`Default Opt: Score ${optimizationResult.optimized_combination.average_score.toFixed(1)}, Deviation ${optimizationResult.optimized_combination.deviation.total_percent.toFixed(1)}%`);
  console.log(`Aggressive: Score ${aggressiveResult.optimized_combination.average_score.toFixed(1)}, Deviation ${aggressiveResult.optimized_combination.deviation.total_percent.toFixed(1)}%`);

  console.log('\n✅ Meal Optimizer Demo Complete!');
}

// Uncomment to run demo in development
// runMealOptimizerDemo();
 