/**
 * Demo for Meal Validator
 * Shows how meal plan validation works with different scenarios
 */

import {
  validateMealPlan,
  createDefaultValidationCriteria,
  quickValidationCheck,
  ValidationCriteria
} from '../mealValidator';
import { MealCombination } from '../mealCombiner';
import { LPOptimizationResult } from '../lpOptimizer';

// Test scenario 1: Good meal plan (should pass validation)
const goodMealPlan: MealCombination = {
  meal_plan_id: 'good_plan_demo',
  total_score: 267.5,
  average_score: 89.2,
  meets_threshold: true,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 10,
        recipe_name: 'Oatmeal with Berries',
        base_score: 88.3,
        penalty: 0,
        reward: 5,
        final_score: 93.3,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 32, carbs: 45, fat: 12, calories: 392 } // 28% of total
    },
    ebéd: {
      recipe: {
        recipe_id: 25,
        recipe_name: 'Grilled Chicken Bowl',
        base_score: 85.8,
        penalty: 0,
        reward: 0,
        final_score: 85.8,
        is_favorite: false,
        usage_count_last_7_days: 1,
        usage_count_last_30_days: 2
      },
      assigned_macros: { protein: 48, carbs: 55, fat: 18, calories: 546 } // 39% of total
    },
    vacsora: {
      recipe: {
        recipe_id: 18,
        recipe_name: 'Salmon with Sweet Potato',
        base_score: 88.5,
        penalty: 0,
        reward: 10,
        final_score: 98.5,
        is_favorite: true,
        days_since_last_use: 9,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 35, carbs: 42, fat: 16, calories: 412 } // 33% of total
    }
  },
  total_macros: {
    protein: 115,    // Target: 120g (-4.2% deviation)
    carbs: 142,      // Target: 150g (-5.3% deviation)
    fat: 46,         // Target: 50g (-8.0% deviation)
    calories: 1350   // Target: 1400 (-3.6% deviation)
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 50,
    calories: 1400
  },
  deviation: {
    protein_percent: 4.2,
    carbs_percent: 5.3,
    fat_percent: 8.0,
    calories_percent: 3.6,
    total_percent: 5.3  // Excellent deviation!
  }
};

// Test scenario 2: Poor meal plan (should fail validation)
const poorMealPlan: MealCombination = {
  meal_plan_id: 'poor_plan_demo',
  total_score: 195.8,
  average_score: 65.3,
  meets_threshold: false,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 3,
        recipe_name: 'Basic Toast',
        base_score: 45.2,
        penalty: 10,
        reward: 0,
        final_score: 35.2,
        is_favorite: false,
        usage_count_last_7_days: 3,
        usage_count_last_30_days: 8
      },
      assigned_macros: { protein: 8, carbs: 35, fat: 3, calories: 195 } // 15% of total
    },
    ebéd: {
      recipe: {
        recipe_id: 12,
        recipe_name: 'Pasta Carbonara',
        base_score: 78.5,
        penalty: 0,
        reward: 0,
        final_score: 78.5,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 25, carbs: 85, fat: 35, calories: 695 } // 55% of total (too high!)
    },
    vacsora: {
      recipe: {
        recipe_id: 6,
        recipe_name: 'Simple Salad',
        base_score: 82.1,
        penalty: 0,
        reward: 0,
        final_score: 82.1,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 12, carbs: 15, fat: 8, calories: 160 } // 30% of total
    }
  },
  total_macros: {
    protein: 45,     // Target: 120g (-62.5% deviation!)
    carbs: 135,      // Target: 150g (-10% deviation)
    fat: 46,         // Target: 50g (-8% deviation)
    calories: 1050   // Target: 1400 (-25% deviation!)
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 50,
    calories: 1400
  },
  deviation: {
    protein_percent: 62.5,  // Terrible protein deficit!
    carbs_percent: 10.0,
    fat_percent: 8.0,
    calories_percent: 25.0,
    total_percent: 26.4     // Way too high!
  }
};

// Test scenario 3: Meal plan after LP optimization
const lpOptimizedResult: LPOptimizationResult = {
  success: true,
  status: 'optimal',
  objective_value: 8.5,
  optimized_quantities: [
    {
      ingredient_id: 101,
      ingredient_name: 'Chicken Breast',
      recipe_id: 25,
      meal_type: 'ebéd',
      original_quantity: 120,
      optimized_quantity: 145,
      scale_factor: 1.21
    },
    {
      ingredient_id: 102,
      ingredient_name: 'Brown Rice',
      recipe_id: 25,
      meal_type: 'ebéd',
      original_quantity: 60,
      optimized_quantity: 85,
      scale_factor: 1.42
    }
  ],
  optimized_macros: {
    protein: 118,    // Much better!
    carbs: 148,      // Close to target
    fat: 49,         // Perfect
    calories: 1385   // Great
  },
  deviations: {
    protein_deviation: 2,
    carbs_deviation: 2,
    fat_deviation: 1,
    calories_deviation: 15,
    protein_percent: 1.7,
    carbs_percent: 1.3,
    fat_percent: 2.0,
    calories_percent: 1.1,
    total_percent: 1.5  // Excellent after optimization!
  },
  metadata: {
    variables_count: 12,
    constraints_count: 8,
    solve_time_ms: 45,
    iterations: 23
  }
};

// Test different validation criteria
const strictCriteria: ValidationCriteria = {
  max_total_deviation_percent: 10,        // Very strict
  max_individual_deviation_percent: 15,   // Very strict
  meal_distribution: {
    reggeli: { target_percent: 25, tolerance_percent: 3 },
    ebéd: { target_percent: 40, tolerance_percent: 3 },
    vacsora: { target_percent: 35, tolerance_percent: 3 }
  },
  min_recipe_score: 85,                   // High quality required
  min_average_score: 90,                  // Very high average
  min_protein_density: 0.15,              // 15% protein minimum
  max_fat_percent: 30,                    // 30% fat maximum
  min_carb_percent: 25                    // 25% carb minimum
};

const relaxedCriteria: ValidationCriteria = {
  max_total_deviation_percent: 30,        // More lenient
  max_individual_deviation_percent: 40,   // More lenient
  meal_distribution: {
    reggeli: { target_percent: 28, tolerance_percent: 10 },
    ebéd: { target_percent: 39, tolerance_percent: 10 },
    vacsora: { target_percent: 33, tolerance_percent: 10 }
  },
  min_recipe_score: 60,                   // Lower quality OK
  min_average_score: 70,                  // Lower average OK
  min_protein_density: 0.10,              // 10% protein minimum
  max_fat_percent: 45,                    // 45% fat maximum
  min_carb_percent: 15                    // 15% carb minimum
};

export function runMealValidatorDemo() {
  console.log('✅ Meal Validator Demo\n');

  console.log('=== Testing Different Meal Plans ===\n');

  // Test 1: Good meal plan with default criteria
  console.log('📋 **Test 1: Good Meal Plan (Default Criteria)**');
  const defaultCriteria = createDefaultValidationCriteria(3);
  const goodResult = validateMealPlan(goodMealPlan, defaultCriteria);

  console.log(`Result: ${goodResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${goodResult.overall_score}/100)`);
  console.log(`Deviation: ${goodResult.deviation_validation.total_deviation_percent.toFixed(1)}% (limit: ${defaultCriteria.max_total_deviation_percent}%)`);
  console.log(`Average Score: ${goodResult.quality_validation.average_score.toFixed(1)} (min: ${defaultCriteria.min_average_score})`);
  
  if (goodResult.validation_summary.critical_failures.length > 0) {
    console.log('Critical Failures:');
    goodResult.validation_summary.critical_failures.forEach(failure => console.log(`  ❌ ${failure}`));
  }
  
  if (goodResult.validation_summary.warnings.length > 0) {
    console.log('Warnings:');
    goodResult.validation_summary.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 2: Poor meal plan
  console.log('📋 **Test 2: Poor Meal Plan (Default Criteria)**');
  const poorResult = validateMealPlan(poorMealPlan, defaultCriteria);

  console.log(`Result: ${poorResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${poorResult.overall_score}/100)`);
  console.log(`Deviation: ${poorResult.deviation_validation.total_deviation_percent.toFixed(1)}% (limit: ${defaultCriteria.max_total_deviation_percent}%)`);
  console.log(`Average Score: ${poorResult.quality_validation.average_score.toFixed(1)} (min: ${defaultCriteria.min_average_score})`);
  
  console.log('Critical Failures:');
  poorResult.validation_summary.critical_failures.forEach(failure => console.log(`  ❌ ${failure}`));
  
  console.log('Recommendations:');
  poorResult.validation_summary.recommendations.forEach(rec => console.log(`  💡 ${rec}`));

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 3: Poor meal plan with LP optimization
  console.log('📋 **Test 3: Poor Meal Plan + LP Optimization**');
  const optimizedResult = validateMealPlan(poorMealPlan, defaultCriteria, lpOptimizedResult);

  console.log(`Result: ${optimizedResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${optimizedResult.overall_score}/100)`);
  console.log(`Deviation: ${optimizedResult.deviation_validation.total_deviation_percent.toFixed(1)}% (limit: ${defaultCriteria.max_total_deviation_percent}%)`);
  console.log(`Average Score: ${optimizedResult.quality_validation.average_score.toFixed(1)} (min: ${defaultCriteria.min_average_score})`);
  
  console.log('Improvement from LP:');
  console.log(`  Deviation: ${poorResult.deviation_validation.total_deviation_percent.toFixed(1)}% → ${optimizedResult.deviation_validation.total_deviation_percent.toFixed(1)}%`);
  console.log(`  Protein: ${poorMealPlan.total_macros.protein}g → ${lpOptimizedResult.optimized_macros.protein}g`);
  console.log(`  Calories: ${poorMealPlan.total_macros.calories} → ${lpOptimizedResult.optimized_macros.calories}`);

  console.log('\n' + '='.repeat(70) + '\n');

  // Test different validation criteria
  console.log('=== Testing Different Validation Criteria ===\n');

  console.log('📋 **Strict Criteria vs Good Meal Plan**');
  const strictResult = validateMealPlan(goodMealPlan, strictCriteria);
  console.log(`Result: ${strictResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${strictResult.overall_score}/100)`);
  console.log(`Required avg score: ${strictCriteria.min_average_score} (actual: ${strictResult.quality_validation.average_score.toFixed(1)})`);
  console.log(`Max deviation: ${strictCriteria.max_total_deviation_percent}% (actual: ${strictResult.deviation_validation.total_deviation_percent.toFixed(1)}%)`);

  console.log('\n📋 **Relaxed Criteria vs Poor Meal Plan**');
  const relaxedResult = validateMealPlan(poorMealPlan, relaxedCriteria);
  console.log(`Result: ${relaxedResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${relaxedResult.overall_score}/100)`);
  console.log(`Required avg score: ${relaxedCriteria.min_average_score} (actual: ${relaxedResult.quality_validation.average_score.toFixed(1)})`);
  console.log(`Max deviation: ${relaxedCriteria.max_total_deviation_percent}% (actual: ${relaxedResult.deviation_validation.total_deviation_percent.toFixed(1)}%)`);

  console.log('\n' + '='.repeat(70) + '\n');

  // Test meal distribution validation
  console.log('=== Meal Distribution Analysis ===\n');

  console.log('📊 **Good Meal Plan Distribution:**');
  Object.entries(goodResult.distribution_validation.meal_distributions).forEach(([meal, dist]) => {
    const status = dist.is_within_range ? '✅' : '❌';
    console.log(`  ${status} ${meal}: ${dist.actual_percent}% (target: ${dist.target_percent}% ±${dist.tolerance_percent}%)`);
  });

  console.log('\n📊 **Poor Meal Plan Distribution:**');
  Object.entries(poorResult.distribution_validation.meal_distributions).forEach(([meal, dist]) => {
    const status = dist.is_within_range ? '✅' : '❌';
    console.log(`  ${status} ${meal}: ${dist.actual_percent}% (target: ${dist.target_percent}% ±${dist.tolerance_percent}%)`);
  });

  console.log('\n' + '='.repeat(70) + '\n');

  // Test nutritional validation
  console.log('=== Nutritional Balance Analysis ===\n');

  function showNutritionAnalysis(result: any, title: string) {
    console.log(`📊 **${title}:**`);
    console.log(`  Protein density: ${(result.nutritional_validation.protein_density * 100).toFixed(1)}% of calories`);
    console.log(`  Fat percentage: ${result.nutritional_validation.fat_percent.toFixed(1)}% of calories`);
    console.log(`  Carb percentage: ${result.nutritional_validation.carb_percent.toFixed(1)}% of calories`);
    console.log(`  Nutritional balance: ${result.nutritional_validation.passes ? '✅ GOOD' : '❌ POOR'}`);
    
    if (result.nutritional_validation.violations.length > 0) {
      console.log('  Issues:');
      result.nutritional_validation.violations.forEach((violation: string) => console.log(`    ⚠️ ${violation}`));
    }
    console.log('');
  }

  showNutritionAnalysis(goodResult, 'Good Meal Plan');
  showNutritionAnalysis(poorResult, 'Poor Meal Plan');

  console.log('='.repeat(70) + '\n');

  // Quick validation check demo
  console.log('=== Quick Validation Check ===\n');

  const quickGood = quickValidationCheck(goodMealPlan);
  const quickPoor = quickValidationCheck(poorMealPlan);

  console.log('📋 **Quick Check Results:**');
  console.log(`Good Plan: ${quickGood.passes ? '✅ PASS' : '❌ FAIL'} (${quickGood.totalDeviation.toFixed(1)}% deviation)`);
  if (quickGood.mainIssues.length > 0) {
    console.log(`  Issues: ${quickGood.mainIssues.join(', ')}`);
  }

  console.log(`Poor Plan: ${quickPoor.passes ? '✅ PASS' : '❌ FAIL'} (${quickPoor.totalDeviation.toFixed(1)}% deviation)`);
  if (quickPoor.mainIssues.length > 0) {
    console.log(`  Issues: ${quickPoor.mainIssues.join(', ')}`);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // Summary and recommendations
  console.log('=== Validation Summary ===\n');

  console.log('🎯 **Key Validation Points:**');
  console.log('  1. Total deviation should be <20% for acceptance');
  console.log('  2. Individual macro deviations should be <25%');
  console.log('  3. Average recipe score should be >80');
  console.log('  4. Meal distribution should be within ±5% of targets');
  console.log('  5. Nutritional balance should meet basic health guidelines');

  console.log('\n💡 **Usage Recommendations:**');
  console.log('  - Use quick validation for fast screening');
  console.log('  - Use full validation for detailed analysis');
  console.log('  - Apply LP optimization when deviation >12%');
  console.log('  - Consider fallback generation when validation fails completely');
  console.log('  - Adjust criteria based on user preferences and constraints');

  console.log('\n✅ Meal Validator Demo Complete!');
}

// Uncomment to run demo in development
// runMealValidatorDemo();
 * Demo for Meal Validator
 * Shows how meal plan validation works with different scenarios
 */

import {
  validateMealPlan,
  createDefaultValidationCriteria,
  quickValidationCheck,
  ValidationCriteria
} from '../mealValidator';
import { MealCombination } from '../mealCombiner';
import { LPOptimizationResult } from '../lpOptimizer';

// Test scenario 1: Good meal plan (should pass validation)
const goodMealPlan: MealCombination = {
  meal_plan_id: 'good_plan_demo',
  total_score: 267.5,
  average_score: 89.2,
  meets_threshold: true,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 10,
        recipe_name: 'Oatmeal with Berries',
        base_score: 88.3,
        penalty: 0,
        reward: 5,
        final_score: 93.3,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 32, carbs: 45, fat: 12, calories: 392 } // 28% of total
    },
    ebéd: {
      recipe: {
        recipe_id: 25,
        recipe_name: 'Grilled Chicken Bowl',
        base_score: 85.8,
        penalty: 0,
        reward: 0,
        final_score: 85.8,
        is_favorite: false,
        usage_count_last_7_days: 1,
        usage_count_last_30_days: 2
      },
      assigned_macros: { protein: 48, carbs: 55, fat: 18, calories: 546 } // 39% of total
    },
    vacsora: {
      recipe: {
        recipe_id: 18,
        recipe_name: 'Salmon with Sweet Potato',
        base_score: 88.5,
        penalty: 0,
        reward: 10,
        final_score: 98.5,
        is_favorite: true,
        days_since_last_use: 9,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 35, carbs: 42, fat: 16, calories: 412 } // 33% of total
    }
  },
  total_macros: {
    protein: 115,    // Target: 120g (-4.2% deviation)
    carbs: 142,      // Target: 150g (-5.3% deviation)
    fat: 46,         // Target: 50g (-8.0% deviation)
    calories: 1350   // Target: 1400 (-3.6% deviation)
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 50,
    calories: 1400
  },
  deviation: {
    protein_percent: 4.2,
    carbs_percent: 5.3,
    fat_percent: 8.0,
    calories_percent: 3.6,
    total_percent: 5.3  // Excellent deviation!
  }
};

// Test scenario 2: Poor meal plan (should fail validation)
const poorMealPlan: MealCombination = {
  meal_plan_id: 'poor_plan_demo',
  total_score: 195.8,
  average_score: 65.3,
  meets_threshold: false,
  meals: {
    reggeli: {
      recipe: {
        recipe_id: 3,
        recipe_name: 'Basic Toast',
        base_score: 45.2,
        penalty: 10,
        reward: 0,
        final_score: 35.2,
        is_favorite: false,
        usage_count_last_7_days: 3,
        usage_count_last_30_days: 8
      },
      assigned_macros: { protein: 8, carbs: 35, fat: 3, calories: 195 } // 15% of total
    },
    ebéd: {
      recipe: {
        recipe_id: 12,
        recipe_name: 'Pasta Carbonara',
        base_score: 78.5,
        penalty: 0,
        reward: 0,
        final_score: 78.5,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 25, carbs: 85, fat: 35, calories: 695 } // 55% of total (too high!)
    },
    vacsora: {
      recipe: {
        recipe_id: 6,
        recipe_name: 'Simple Salad',
        base_score: 82.1,
        penalty: 0,
        reward: 0,
        final_score: 82.1,
        is_favorite: false,
        usage_count_last_7_days: 0,
        usage_count_last_30_days: 1
      },
      assigned_macros: { protein: 12, carbs: 15, fat: 8, calories: 160 } // 30% of total
    }
  },
  total_macros: {
    protein: 45,     // Target: 120g (-62.5% deviation!)
    carbs: 135,      // Target: 150g (-10% deviation)
    fat: 46,         // Target: 50g (-8% deviation)
    calories: 1050   // Target: 1400 (-25% deviation!)
  },
  target_macros: {
    protein: 120,
    carbs: 150,
    fat: 50,
    calories: 1400
  },
  deviation: {
    protein_percent: 62.5,  // Terrible protein deficit!
    carbs_percent: 10.0,
    fat_percent: 8.0,
    calories_percent: 25.0,
    total_percent: 26.4     // Way too high!
  }
};

// Test scenario 3: Meal plan after LP optimization
const lpOptimizedResult: LPOptimizationResult = {
  success: true,
  status: 'optimal',
  objective_value: 8.5,
  optimized_quantities: [
    {
      ingredient_id: 101,
      ingredient_name: 'Chicken Breast',
      recipe_id: 25,
      meal_type: 'ebéd',
      original_quantity: 120,
      optimized_quantity: 145,
      scale_factor: 1.21
    },
    {
      ingredient_id: 102,
      ingredient_name: 'Brown Rice',
      recipe_id: 25,
      meal_type: 'ebéd',
      original_quantity: 60,
      optimized_quantity: 85,
      scale_factor: 1.42
    }
  ],
  optimized_macros: {
    protein: 118,    // Much better!
    carbs: 148,      // Close to target
    fat: 49,         // Perfect
    calories: 1385   // Great
  },
  deviations: {
    protein_deviation: 2,
    carbs_deviation: 2,
    fat_deviation: 1,
    calories_deviation: 15,
    protein_percent: 1.7,
    carbs_percent: 1.3,
    fat_percent: 2.0,
    calories_percent: 1.1,
    total_percent: 1.5  // Excellent after optimization!
  },
  metadata: {
    variables_count: 12,
    constraints_count: 8,
    solve_time_ms: 45,
    iterations: 23
  }
};

// Test different validation criteria
const strictCriteria: ValidationCriteria = {
  max_total_deviation_percent: 10,        // Very strict
  max_individual_deviation_percent: 15,   // Very strict
  meal_distribution: {
    reggeli: { target_percent: 25, tolerance_percent: 3 },
    ebéd: { target_percent: 40, tolerance_percent: 3 },
    vacsora: { target_percent: 35, tolerance_percent: 3 }
  },
  min_recipe_score: 85,                   // High quality required
  min_average_score: 90,                  // Very high average
  min_protein_density: 0.15,              // 15% protein minimum
  max_fat_percent: 30,                    // 30% fat maximum
  min_carb_percent: 25                    // 25% carb minimum
};

const relaxedCriteria: ValidationCriteria = {
  max_total_deviation_percent: 30,        // More lenient
  max_individual_deviation_percent: 40,   // More lenient
  meal_distribution: {
    reggeli: { target_percent: 28, tolerance_percent: 10 },
    ebéd: { target_percent: 39, tolerance_percent: 10 },
    vacsora: { target_percent: 33, tolerance_percent: 10 }
  },
  min_recipe_score: 60,                   // Lower quality OK
  min_average_score: 70,                  // Lower average OK
  min_protein_density: 0.10,              // 10% protein minimum
  max_fat_percent: 45,                    // 45% fat maximum
  min_carb_percent: 15                    // 15% carb minimum
};

export function runMealValidatorDemo() {
  console.log('✅ Meal Validator Demo\n');

  console.log('=== Testing Different Meal Plans ===\n');

  // Test 1: Good meal plan with default criteria
  console.log('📋 **Test 1: Good Meal Plan (Default Criteria)**');
  const defaultCriteria = createDefaultValidationCriteria(3);
  const goodResult = validateMealPlan(goodMealPlan, defaultCriteria);

  console.log(`Result: ${goodResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${goodResult.overall_score}/100)`);
  console.log(`Deviation: ${goodResult.deviation_validation.total_deviation_percent.toFixed(1)}% (limit: ${defaultCriteria.max_total_deviation_percent}%)`);
  console.log(`Average Score: ${goodResult.quality_validation.average_score.toFixed(1)} (min: ${defaultCriteria.min_average_score})`);
  
  if (goodResult.validation_summary.critical_failures.length > 0) {
    console.log('Critical Failures:');
    goodResult.validation_summary.critical_failures.forEach(failure => console.log(`  ❌ ${failure}`));
  }
  
  if (goodResult.validation_summary.warnings.length > 0) {
    console.log('Warnings:');
    goodResult.validation_summary.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 2: Poor meal plan
  console.log('📋 **Test 2: Poor Meal Plan (Default Criteria)**');
  const poorResult = validateMealPlan(poorMealPlan, defaultCriteria);

  console.log(`Result: ${poorResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${poorResult.overall_score}/100)`);
  console.log(`Deviation: ${poorResult.deviation_validation.total_deviation_percent.toFixed(1)}% (limit: ${defaultCriteria.max_total_deviation_percent}%)`);
  console.log(`Average Score: ${poorResult.quality_validation.average_score.toFixed(1)} (min: ${defaultCriteria.min_average_score})`);
  
  console.log('Critical Failures:');
  poorResult.validation_summary.critical_failures.forEach(failure => console.log(`  ❌ ${failure}`));
  
  console.log('Recommendations:');
  poorResult.validation_summary.recommendations.forEach(rec => console.log(`  💡 ${rec}`));

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 3: Poor meal plan with LP optimization
  console.log('📋 **Test 3: Poor Meal Plan + LP Optimization**');
  const optimizedResult = validateMealPlan(poorMealPlan, defaultCriteria, lpOptimizedResult);

  console.log(`Result: ${optimizedResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${optimizedResult.overall_score}/100)`);
  console.log(`Deviation: ${optimizedResult.deviation_validation.total_deviation_percent.toFixed(1)}% (limit: ${defaultCriteria.max_total_deviation_percent}%)`);
  console.log(`Average Score: ${optimizedResult.quality_validation.average_score.toFixed(1)} (min: ${defaultCriteria.min_average_score})`);
  
  console.log('Improvement from LP:');
  console.log(`  Deviation: ${poorResult.deviation_validation.total_deviation_percent.toFixed(1)}% → ${optimizedResult.deviation_validation.total_deviation_percent.toFixed(1)}%`);
  console.log(`  Protein: ${poorMealPlan.total_macros.protein}g → ${lpOptimizedResult.optimized_macros.protein}g`);
  console.log(`  Calories: ${poorMealPlan.total_macros.calories} → ${lpOptimizedResult.optimized_macros.calories}`);

  console.log('\n' + '='.repeat(70) + '\n');

  // Test different validation criteria
  console.log('=== Testing Different Validation Criteria ===\n');

  console.log('📋 **Strict Criteria vs Good Meal Plan**');
  const strictResult = validateMealPlan(goodMealPlan, strictCriteria);
  console.log(`Result: ${strictResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${strictResult.overall_score}/100)`);
  console.log(`Required avg score: ${strictCriteria.min_average_score} (actual: ${strictResult.quality_validation.average_score.toFixed(1)})`);
  console.log(`Max deviation: ${strictCriteria.max_total_deviation_percent}% (actual: ${strictResult.deviation_validation.total_deviation_percent.toFixed(1)}%)`);

  console.log('\n📋 **Relaxed Criteria vs Poor Meal Plan**');
  const relaxedResult = validateMealPlan(poorMealPlan, relaxedCriteria);
  console.log(`Result: ${relaxedResult.is_valid ? '✅ VALID' : '❌ INVALID'} (Score: ${relaxedResult.overall_score}/100)`);
  console.log(`Required avg score: ${relaxedCriteria.min_average_score} (actual: ${relaxedResult.quality_validation.average_score.toFixed(1)})`);
  console.log(`Max deviation: ${relaxedCriteria.max_total_deviation_percent}% (actual: ${relaxedResult.deviation_validation.total_deviation_percent.toFixed(1)}%)`);

  console.log('\n' + '='.repeat(70) + '\n');

  // Test meal distribution validation
  console.log('=== Meal Distribution Analysis ===\n');

  console.log('📊 **Good Meal Plan Distribution:**');
  Object.entries(goodResult.distribution_validation.meal_distributions).forEach(([meal, dist]) => {
    const status = dist.is_within_range ? '✅' : '❌';
    console.log(`  ${status} ${meal}: ${dist.actual_percent}% (target: ${dist.target_percent}% ±${dist.tolerance_percent}%)`);
  });

  console.log('\n📊 **Poor Meal Plan Distribution:**');
  Object.entries(poorResult.distribution_validation.meal_distributions).forEach(([meal, dist]) => {
    const status = dist.is_within_range ? '✅' : '❌';
    console.log(`  ${status} ${meal}: ${dist.actual_percent}% (target: ${dist.target_percent}% ±${dist.tolerance_percent}%)`);
  });

  console.log('\n' + '='.repeat(70) + '\n');

  // Test nutritional validation
  console.log('=== Nutritional Balance Analysis ===\n');

  function showNutritionAnalysis(result: any, title: string) {
    console.log(`📊 **${title}:**`);
    console.log(`  Protein density: ${(result.nutritional_validation.protein_density * 100).toFixed(1)}% of calories`);
    console.log(`  Fat percentage: ${result.nutritional_validation.fat_percent.toFixed(1)}% of calories`);
    console.log(`  Carb percentage: ${result.nutritional_validation.carb_percent.toFixed(1)}% of calories`);
    console.log(`  Nutritional balance: ${result.nutritional_validation.passes ? '✅ GOOD' : '❌ POOR'}`);
    
    if (result.nutritional_validation.violations.length > 0) {
      console.log('  Issues:');
      result.nutritional_validation.violations.forEach((violation: string) => console.log(`    ⚠️ ${violation}`));
    }
    console.log('');
  }

  showNutritionAnalysis(goodResult, 'Good Meal Plan');
  showNutritionAnalysis(poorResult, 'Poor Meal Plan');

  console.log('='.repeat(70) + '\n');

  // Quick validation check demo
  console.log('=== Quick Validation Check ===\n');

  const quickGood = quickValidationCheck(goodMealPlan);
  const quickPoor = quickValidationCheck(poorMealPlan);

  console.log('📋 **Quick Check Results:**');
  console.log(`Good Plan: ${quickGood.passes ? '✅ PASS' : '❌ FAIL'} (${quickGood.totalDeviation.toFixed(1)}% deviation)`);
  if (quickGood.mainIssues.length > 0) {
    console.log(`  Issues: ${quickGood.mainIssues.join(', ')}`);
  }

  console.log(`Poor Plan: ${quickPoor.passes ? '✅ PASS' : '❌ FAIL'} (${quickPoor.totalDeviation.toFixed(1)}% deviation)`);
  if (quickPoor.mainIssues.length > 0) {
    console.log(`  Issues: ${quickPoor.mainIssues.join(', ')}`);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // Summary and recommendations
  console.log('=== Validation Summary ===\n');

  console.log('🎯 **Key Validation Points:**');
  console.log('  1. Total deviation should be <20% for acceptance');
  console.log('  2. Individual macro deviations should be <25%');
  console.log('  3. Average recipe score should be >80');
  console.log('  4. Meal distribution should be within ±5% of targets');
  console.log('  5. Nutritional balance should meet basic health guidelines');

  console.log('\n💡 **Usage Recommendations:**');
  console.log('  - Use quick validation for fast screening');
  console.log('  - Use full validation for detailed analysis');
  console.log('  - Apply LP optimization when deviation >12%');
  console.log('  - Consider fallback generation when validation fails completely');
  console.log('  - Adjust criteria based on user preferences and constraints');

  console.log('\n✅ Meal Validator Demo Complete!');
}

// Uncomment to run demo in development
// runMealValidatorDemo();
 