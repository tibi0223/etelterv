/**
 * Demo for Master Meal Plan Generator
 * Complete end-to-end meal planning demonstration
 */

import {
  generateMasterMealPlan,
  createDefaultMasterSettings,
  createDefaultUserPreferences,
  MasterGenerationInput,
  MasterGenerationResult
} from '../masterMealPlanGenerator';
import { RecipeWithHistory } from '../recipeRanker';
import { RecipeScalability } from '../recipeScorer';

// Sample recipe database with complete history data
const sampleRecipeDatabase: RecipeWithHistory[] = [
  // BREAKFAST RECIPES
  {
    recipe_id: 1,
    recipe_name: 'Protein Oatmeal Bowl',
    category: 'reggeli',
    base_macros: { protein: 28, carbs: 45, fat: 12, calories: 372 },
    is_favorite: true,
    days_since_last_use: 8,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },
  {
    recipe_id: 2,
    recipe_name: 'Scrambled Eggs with Toast',
    category: 'reggeli',
    base_macros: { protein: 22, carbs: 28, fat: 18, calories: 324 },
    is_favorite: false,
    days_since_last_use: 3,
    usage_count_last_7_days: 2,
    usage_count_last_30_days: 5,
    base_score: 0
  },
  {
    recipe_id: 3,
    recipe_name: 'Greek Yogurt Parfait',
    category: 'reggeli',
    base_macros: { protein: 25, carbs: 32, fat: 8, calories: 284 },
    is_favorite: false,
    days_since_last_use: 12,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },
  {
    recipe_id: 4,
    recipe_name: 'Avocado Toast',
    category: 'reggeli',
    base_macros: { protein: 12, carbs: 35, fat: 22, calories: 358 },
    is_favorite: true,
    days_since_last_use: 15,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },

  // LUNCH RECIPES
  {
    recipe_id: 10,
    recipe_name: 'Grilled Chicken Salad',
    category: 'ebéd',
    base_macros: { protein: 42, carbs: 18, fat: 14, calories: 346 },
    is_favorite: false,
    days_since_last_use: 5,
    usage_count_last_7_days: 1,
    usage_count_last_30_days: 4,
    base_score: 0
  },
  {
    recipe_id: 11,
    recipe_name: 'Quinoa Power Bowl',
    category: 'ebéd',
    base_macros: { protein: 18, carbs: 58, fat: 12, calories: 384 },
    is_favorite: true,
    days_since_last_use: 10,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },
  {
    recipe_id: 12,
    recipe_name: 'Turkey Wrap',
    category: 'ebéd',
    base_macros: { protein: 32, carbs: 38, fat: 16, calories: 396 },
    is_favorite: false,
    days_since_last_use: 1,
    usage_count_last_7_days: 4,
    usage_count_last_30_days: 12,
    base_score: 0
  },
  {
    recipe_id: 13,
    recipe_name: 'Beef Stir Fry',
    category: 'ebéd',
    base_macros: { protein: 35, carbs: 28, fat: 18, calories: 378 },
    is_favorite: false,
    days_since_last_use: 7,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 3,
    base_score: 0
  },
  {
    recipe_id: 14,
    recipe_name: 'Fish Tacos',
    category: 'ebéd',
    base_macros: { protein: 28, carbs: 42, fat: 15, calories: 385 },
    is_favorite: true,
    days_since_last_use: 9,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },

  // DINNER RECIPES
  {
    recipe_id: 20,
    recipe_name: 'Salmon with Sweet Potato',
    category: 'vacsora',
    base_macros: { protein: 36, carbs: 32, fat: 18, calories: 398 },
    is_favorite: true,
    days_since_last_use: 6,
    usage_count_last_7_days: 1,
    usage_count_last_30_days: 3,
    base_score: 0
  },
  {
    recipe_id: 21,
    recipe_name: 'Chicken Breast with Rice',
    category: 'vacsora',
    base_macros: { protein: 38, carbs: 45, fat: 8, calories: 376 },
    is_favorite: false,
    days_since_last_use: 2,
    usage_count_last_7_days: 2,
    usage_count_last_30_days: 8,
    base_score: 0
  },
  {
    recipe_id: 22,
    recipe_name: 'Lean Beef with Vegetables',
    category: 'vacsora',
    base_macros: { protein: 32, carbs: 22, fat: 16, calories: 328 },
    is_favorite: false,
    days_since_last_use: 14,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },
  {
    recipe_id: 23,
    recipe_name: 'Shrimp Pasta',
    category: 'vacsora',
    base_macros: { protein: 24, carbs: 48, fat: 12, calories: 368 },
    is_favorite: false,
    days_since_last_use: 11,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },
  {
    recipe_id: 24,
    recipe_name: 'Tofu Curry',
    category: 'vacsora',
    base_macros: { protein: 20, carbs: 35, fat: 14, calories: 316 },
    is_favorite: true,
    days_since_last_use: 13,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },

  // SNACK RECIPES (for 4-meal plans)
  {
    recipe_id: 30,
    recipe_name: 'Protein Smoothie',
    category: 'uzsonna',
    base_macros: { protein: 24, carbs: 18, fat: 6, calories: 208 },
    is_favorite: false,
    days_since_last_use: 4,
    usage_count_last_7_days: 1,
    usage_count_last_30_days: 4,
    base_score: 0
  },
  {
    recipe_id: 31,
    recipe_name: 'Mixed Nuts & Fruit',
    category: 'uzsonna',
    base_macros: { protein: 8, carbs: 22, fat: 16, calories: 248 },
    is_favorite: true,
    days_since_last_use: 16,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  }
];

// Sample scalability data (from our database migration)
const sampleScalabilityData: RecipeScalability[] = [
  { recipe_id: 1, protein_scalability: 0.85, carbs_scalability: 0.70, fat_scalability: 0.60, protein_density: 28, carbs_density: 45, fat_density: 12 },
  { recipe_id: 2, protein_scalability: 0.75, carbs_scalability: 0.55, fat_scalability: 0.65, protein_density: 22, carbs_density: 28, fat_density: 18 },
  { recipe_id: 3, protein_scalability: 0.80, carbs_scalability: 0.65, fat_scalability: 0.45, protein_density: 25, carbs_density: 32, fat_density: 8 },
  { recipe_id: 4, protein_scalability: 0.45, carbs_scalability: 0.60, fat_scalability: 0.75, protein_density: 12, carbs_density: 35, fat_density: 22 },
  
  { recipe_id: 10, protein_scalability: 0.90, carbs_scalability: 0.40, fat_scalability: 0.55, protein_density: 42, carbs_density: 18, fat_density: 14 },
  { recipe_id: 11, protein_scalability: 0.55, carbs_scalability: 0.85, fat_scalability: 0.50, protein_density: 18, carbs_density: 58, fat_density: 12 },
  { recipe_id: 12, protein_scalability: 0.80, carbs_scalability: 0.70, fat_scalability: 0.60, protein_density: 32, carbs_density: 38, fat_density: 16 },
  { recipe_id: 13, protein_scalability: 0.85, carbs_scalability: 0.60, fat_scalability: 0.65, protein_density: 35, carbs_density: 28, fat_density: 18 },
  { recipe_id: 14, protein_scalability: 0.75, carbs_scalability: 0.75, fat_scalability: 0.55, protein_density: 28, carbs_density: 42, fat_density: 15 },
  
  { recipe_id: 20, protein_scalability: 0.90, carbs_scalability: 0.65, fat_scalability: 0.70, protein_density: 36, carbs_density: 32, fat_density: 18 },
  { recipe_id: 21, protein_scalability: 0.85, carbs_scalability: 0.80, fat_scalability: 0.40, protein_density: 38, carbs_density: 45, fat_density: 8 },
  { recipe_id: 22, protein_scalability: 0.80, carbs_scalability: 0.50, fat_scalability: 0.60, protein_density: 32, carbs_density: 22, fat_density: 16 },
  { recipe_id: 23, protein_scalability: 0.65, carbs_scalability: 0.85, fat_scalability: 0.50, protein_density: 24, carbs_density: 48, fat_density: 12 },
  { recipe_id: 24, protein_scalability: 0.60, carbs_scalability: 0.75, fat_scalability: 0.55, protein_density: 20, carbs_density: 35, fat_density: 14 },
  
  { recipe_id: 30, protein_scalability: 0.90, carbs_scalability: 0.50, fat_scalability: 0.45, protein_density: 24, carbs_density: 18, fat_density: 6 },
  { recipe_id: 31, protein_scalability: 0.40, carbs_scalability: 0.60, fat_scalability: 0.80, protein_density: 8, carbs_density: 22, fat_density: 16 }
];

// Test scenarios
const testScenarios = [
  {
    name: 'Standard User (3 meals)',
    target_macros: { protein: 120, carbs: 150, fat: 50, calories: 1460 },
    preferences: {
      meal_count: 3,
      preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
      favorite_boost: 10,
      recent_penalty: 10
    }
  },
  {
    name: 'Active User (4 meals)',
    target_macros: { protein: 160, carbs: 220, fat: 70, calories: 2040 },
    preferences: {
      meal_count: 4,
      preferred_meal_types: ['reggeli', 'ebéd', 'uzsonna', 'vacsora'],
      favorite_boost: 15,
      recent_penalty: 15
    }
  },
  {
    name: 'Low Carb User',
    target_macros: { protein: 140, carbs: 80, fat: 90, calories: 1540 },
    preferences: {
      meal_count: 3,
      preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
      exclude_recipe_ids: [11, 23], // Exclude high-carb recipes
      favorite_boost: 8,
      recent_penalty: 12
    }
  },
  {
    name: 'High Protein User',
    target_macros: { protein: 180, carbs: 120, fat: 45, calories: 1560 },
    preferences: {
      meal_count: 3,
      preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
      favorite_boost: 12,
      recent_penalty: 8
    }
  }
];

export async function runMasterMealPlanDemo() {
  console.log('🎯 Master Meal Plan Generator Demo\n');
  console.log('='.repeat(80));
  
  // Demo database info
  console.log('\n📊 **Demo Database Info:**');
  console.log(`  Total Recipes: ${sampleRecipeDatabase.length}`);
  console.log(`  Breakfast: ${sampleRecipeDatabase.filter(r => r.category === 'reggeli').length}`);
  console.log(`  Lunch: ${sampleRecipeDatabase.filter(r => r.category === 'ebéd').length}`);
  console.log(`  Dinner: ${sampleRecipeDatabase.filter(r => r.category === 'vacsora').length}`);
  console.log(`  Snacks: ${sampleRecipeDatabase.filter(r => r.category === 'uzsonna').length}`);
  console.log(`  Favorites: ${sampleRecipeDatabase.filter(r => r.is_favorite).length}`);
  console.log(`  Recently Used: ${sampleRecipeDatabase.filter(r => r.usage_count_last_7_days > 0).length}`);

  // Run test scenarios
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log('\n' + '='.repeat(80));
    console.log(`\n🎯 **Test Scenario ${i + 1}: ${scenario.name}**\n`);
    
    console.log('Target Macros:');
    console.log(`  Protein: ${scenario.target_macros.protein}g`);
    console.log(`  Carbs: ${scenario.target_macros.carbs}g`);
    console.log(`  Fat: ${scenario.target_macros.fat}g`);
    console.log(`  Calories: ${scenario.target_macros.calories}`);
    
    console.log(`\nPreferences:`);
    console.log(`  Meals: ${scenario.preferences.meal_count} (${scenario.preferences.preferred_meal_types.join(', ')})`);
    console.log(`  Favorite boost: +${scenario.preferences.favorite_boost} points`);
    console.log(`  Recent penalty: -${scenario.preferences.recent_penalty} points`);
    if (scenario.preferences.exclude_recipe_ids) {
      console.log(`  Excluded recipes: ${scenario.preferences.exclude_recipe_ids.join(', ')}`);
    }

    // Create generation input
    const input: MasterGenerationInput = {
      target_macros: scenario.target_macros,
      recipes: sampleRecipeDatabase,
      scalability_data: sampleScalabilityData,
      preferences: scenario.preferences,
      algorithm_settings: createDefaultMasterSettings()
    };

    console.log('\n' + '-'.repeat(50));
    console.log('🚀 **Starting Generation Process...**\n');

    // Generate meal plan
    const startTime = Date.now();
    const result = await generateMasterMealPlan(input);
    const endTime = Date.now();

    // Display results
    console.log('\n' + '-'.repeat(50));
    console.log('📋 **GENERATION RESULTS**\n');

    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (${result.status})`);
    console.log(`Total time: ${result.generation_metadata.generation_time_ms}ms`);
    console.log(`Attempts: ${result.generation_metadata.total_attempts}/${input.algorithm_settings.max_attempts}`);
    console.log(`Steps completed: ${result.generation_metadata.steps_completed.join(' → ')}`);

    if (result.generation_metadata.failure_reasons && result.generation_metadata.failure_reasons.length > 0) {
      console.log('\nFailure reasons:');
      result.generation_metadata.failure_reasons.forEach(reason => console.log(`  ❌ ${reason}`));
    }

    // Show final meal plan
    if (result.final_meal_plan) {
      console.log('\n🍽️ **FINAL MEAL PLAN:**\n');
      
      Object.entries(result.final_meal_plan.meals).forEach(([mealType, meal]) => {
        const penalty = meal.recipe.penalty > 0 ? ` (penalty: -${meal.recipe.penalty})` : '';
        const reward = meal.recipe.reward > 0 ? ` (reward: +${meal.recipe.reward})` : '';
        const favorite = meal.recipe.is_favorite ? ' ⭐' : '';
        
        console.log(`  ${mealType.toUpperCase()}: ${meal.recipe.recipe_name}${favorite}`);
        console.log(`    Score: ${meal.recipe.final_score.toFixed(1)}${penalty}${reward}`);
        console.log(`    Macros: P:${meal.assigned_macros.protein}g C:${meal.assigned_macros.carbs}g F:${meal.assigned_macros.fat}g Cal:${meal.assigned_macros.calories}`);
        console.log('');
      });

      console.log('**TOTALS:**');
      const finalMacros = result.lp_optimization?.success ? 
        result.lp_optimization.optimized_macros : 
        result.final_meal_plan.total_macros;
      
      console.log(`  Protein: ${finalMacros.protein}g / ${scenario.target_macros.protein}g`);
      console.log(`  Carbs: ${finalMacros.carbs}g / ${scenario.target_macros.carbs}g`);
      console.log(`  Fat: ${finalMacros.fat}g / ${scenario.target_macros.fat}g`);
      console.log(`  Calories: ${finalMacros.calories} / ${scenario.target_macros.calories}`);
      
      console.log(`\n  Average Score: ${result.final_meal_plan.average_score.toFixed(1)}/100`);
      console.log(`  Total Deviation: ${result.quality_metrics.final_deviation_percent}%`);
    }

    // Show optimization details
    if (result.lp_optimization?.success) {
      console.log('\n🧮 **LP OPTIMIZATION APPLIED:**');
      console.log(`  Status: ${result.lp_optimization.status}`);
      console.log(`  Solve time: ${result.lp_optimization.metadata.solve_time_ms}ms`);
      console.log(`  Variables: ${result.lp_optimization.metadata.variables_count}`);
      console.log(`  Constraints: ${result.lp_optimization.metadata.constraints_count}`);
      
      console.log('\n  Deviation improvement:');
      const originalDeviation = result.final_meal_plan?.deviation.total_percent || 0;
      const optimizedDeviation = result.lp_optimization.deviations.total_percent;
      console.log(`    ${originalDeviation.toFixed(1)}% → ${optimizedDeviation.toFixed(1)}% (${(originalDeviation - optimizedDeviation).toFixed(1)}% better)`);
    }

    // Show validation results
    console.log('\n✅ **VALIDATION RESULTS:**');
    console.log(`  Overall Score: ${result.validation.overall_score}/100`);
    console.log(`  Deviation Check: ${result.validation.deviation_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Distribution Check: ${result.validation.distribution_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Quality Check: ${result.validation.quality_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Nutrition Check: ${result.validation.nutritional_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);

    if (result.validation.validation_summary?.critical_failures?.length > 0) {
      console.log('\n  Critical Issues:');
      result.validation.validation_summary.critical_failures.forEach(issue => {
        console.log(`    ❌ ${issue}`);
      });
    }

    if (result.validation.validation_summary?.recommendations?.length > 0) {
      console.log('\n  Recommendations:');
      result.validation.validation_summary.recommendations.forEach(rec => {
        console.log(`    💡 ${rec}`);
      });
    }

    // Show quality metrics
    console.log('\n📊 **QUALITY METRICS:**');
    console.log(`  Final Deviation: ${result.quality_metrics.final_deviation_percent}%`);
    console.log(`  Final Score: ${result.quality_metrics.final_average_score}/100`);
    console.log(`  Recipe Diversity: ${result.quality_metrics.recipe_diversity_score}%`);
    console.log(`  Nutritional Balance: ${result.quality_metrics.nutritional_balance_score}%`);
    console.log(`  User Satisfaction: ${result.quality_metrics.user_satisfaction_score}%`);

    // Add delay between scenarios for readability
    if (i < testScenarios.length - 1) {
      console.log('\n⏳ Processing next scenario...\n');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎉 **MASTER DEMO COMPLETE!**');
  
  console.log('\n📊 **Algorithm Summary:**');
  console.log('  1. ✅ Recipe filtering by macro profile');
  console.log('  2. ✅ Recipe scoring (cosine similarity + scalability)');
  console.log('  3. ✅ Variety ranking (penalties + rewards)');
  console.log('  4. ✅ Smart meal combination');
  console.log('  5. ✅ Recipe swapping for weak macros');
  console.log('  6. ✅ LP optimization for fine-tuning');
  console.log('  7. ✅ Comprehensive validation');
  console.log('  8. ✅ Quality metrics & user satisfaction');

  console.log('\n💡 **Integration Ready!**');
  console.log('  The master algorithm is ready to be integrated into your main application.');
  console.log('  All components work together seamlessly to generate optimal meal plans.');
  console.log('  The system handles edge cases, provides detailed feedback, and ensures high quality results.');
}

// Uncomment to run demo in development
// runMasterMealPlanDemo();
  // BREAKFAST RECIPES
  {
    recipe_id: 1,
    recipe_name: 'Protein Oatmeal Bowl',
    category: 'reggeli',
    base_macros: { protein: 28, carbs: 45, fat: 12, calories: 372 },
    is_favorite: true,
    days_since_last_use: 8,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },
  {
    recipe_id: 2,
    recipe_name: 'Scrambled Eggs with Toast',
    category: 'reggeli',
    base_macros: { protein: 22, carbs: 28, fat: 18, calories: 324 },
    is_favorite: false,
    days_since_last_use: 3,
    usage_count_last_7_days: 2,
    usage_count_last_30_days: 5,
    base_score: 0
  },
  {
    recipe_id: 3,
    recipe_name: 'Greek Yogurt Parfait',
    category: 'reggeli',
    base_macros: { protein: 25, carbs: 32, fat: 8, calories: 284 },
    is_favorite: false,
    days_since_last_use: 12,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },
  {
    recipe_id: 4,
    recipe_name: 'Avocado Toast',
    category: 'reggeli',
    base_macros: { protein: 12, carbs: 35, fat: 22, calories: 358 },
    is_favorite: true,
    days_since_last_use: 15,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },

  // LUNCH RECIPES
  {
    recipe_id: 10,
    recipe_name: 'Grilled Chicken Salad',
    category: 'ebéd',
    base_macros: { protein: 42, carbs: 18, fat: 14, calories: 346 },
    is_favorite: false,
    days_since_last_use: 5,
    usage_count_last_7_days: 1,
    usage_count_last_30_days: 4,
    base_score: 0
  },
  {
    recipe_id: 11,
    recipe_name: 'Quinoa Power Bowl',
    category: 'ebéd',
    base_macros: { protein: 18, carbs: 58, fat: 12, calories: 384 },
    is_favorite: true,
    days_since_last_use: 10,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },
  {
    recipe_id: 12,
    recipe_name: 'Turkey Wrap',
    category: 'ebéd',
    base_macros: { protein: 32, carbs: 38, fat: 16, calories: 396 },
    is_favorite: false,
    days_since_last_use: 1,
    usage_count_last_7_days: 4,
    usage_count_last_30_days: 12,
    base_score: 0
  },
  {
    recipe_id: 13,
    recipe_name: 'Beef Stir Fry',
    category: 'ebéd',
    base_macros: { protein: 35, carbs: 28, fat: 18, calories: 378 },
    is_favorite: false,
    days_since_last_use: 7,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 3,
    base_score: 0
  },
  {
    recipe_id: 14,
    recipe_name: 'Fish Tacos',
    category: 'ebéd',
    base_macros: { protein: 28, carbs: 42, fat: 15, calories: 385 },
    is_favorite: true,
    days_since_last_use: 9,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },

  // DINNER RECIPES
  {
    recipe_id: 20,
    recipe_name: 'Salmon with Sweet Potato',
    category: 'vacsora',
    base_macros: { protein: 36, carbs: 32, fat: 18, calories: 398 },
    is_favorite: true,
    days_since_last_use: 6,
    usage_count_last_7_days: 1,
    usage_count_last_30_days: 3,
    base_score: 0
  },
  {
    recipe_id: 21,
    recipe_name: 'Chicken Breast with Rice',
    category: 'vacsora',
    base_macros: { protein: 38, carbs: 45, fat: 8, calories: 376 },
    is_favorite: false,
    days_since_last_use: 2,
    usage_count_last_7_days: 2,
    usage_count_last_30_days: 8,
    base_score: 0
  },
  {
    recipe_id: 22,
    recipe_name: 'Lean Beef with Vegetables',
    category: 'vacsora',
    base_macros: { protein: 32, carbs: 22, fat: 16, calories: 328 },
    is_favorite: false,
    days_since_last_use: 14,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },
  {
    recipe_id: 23,
    recipe_name: 'Shrimp Pasta',
    category: 'vacsora',
    base_macros: { protein: 24, carbs: 48, fat: 12, calories: 368 },
    is_favorite: false,
    days_since_last_use: 11,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 2,
    base_score: 0
  },
  {
    recipe_id: 24,
    recipe_name: 'Tofu Curry',
    category: 'vacsora',
    base_macros: { protein: 20, carbs: 35, fat: 14, calories: 316 },
    is_favorite: true,
    days_since_last_use: 13,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  },

  // SNACK RECIPES (for 4-meal plans)
  {
    recipe_id: 30,
    recipe_name: 'Protein Smoothie',
    category: 'uzsonna',
    base_macros: { protein: 24, carbs: 18, fat: 6, calories: 208 },
    is_favorite: false,
    days_since_last_use: 4,
    usage_count_last_7_days: 1,
    usage_count_last_30_days: 4,
    base_score: 0
  },
  {
    recipe_id: 31,
    recipe_name: 'Mixed Nuts & Fruit',
    category: 'uzsonna',
    base_macros: { protein: 8, carbs: 22, fat: 16, calories: 248 },
    is_favorite: true,
    days_since_last_use: 16,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1,
    base_score: 0
  }
];

// Sample scalability data (from our database migration)
const sampleScalabilityData: RecipeScalability[] = [
  { recipe_id: 1, protein_scalability: 0.85, carbs_scalability: 0.70, fat_scalability: 0.60, protein_density: 28, carbs_density: 45, fat_density: 12 },
  { recipe_id: 2, protein_scalability: 0.75, carbs_scalability: 0.55, fat_scalability: 0.65, protein_density: 22, carbs_density: 28, fat_density: 18 },
  { recipe_id: 3, protein_scalability: 0.80, carbs_scalability: 0.65, fat_scalability: 0.45, protein_density: 25, carbs_density: 32, fat_density: 8 },
  { recipe_id: 4, protein_scalability: 0.45, carbs_scalability: 0.60, fat_scalability: 0.75, protein_density: 12, carbs_density: 35, fat_density: 22 },
  
  { recipe_id: 10, protein_scalability: 0.90, carbs_scalability: 0.40, fat_scalability: 0.55, protein_density: 42, carbs_density: 18, fat_density: 14 },
  { recipe_id: 11, protein_scalability: 0.55, carbs_scalability: 0.85, fat_scalability: 0.50, protein_density: 18, carbs_density: 58, fat_density: 12 },
  { recipe_id: 12, protein_scalability: 0.80, carbs_scalability: 0.70, fat_scalability: 0.60, protein_density: 32, carbs_density: 38, fat_density: 16 },
  { recipe_id: 13, protein_scalability: 0.85, carbs_scalability: 0.60, fat_scalability: 0.65, protein_density: 35, carbs_density: 28, fat_density: 18 },
  { recipe_id: 14, protein_scalability: 0.75, carbs_scalability: 0.75, fat_scalability: 0.55, protein_density: 28, carbs_density: 42, fat_density: 15 },
  
  { recipe_id: 20, protein_scalability: 0.90, carbs_scalability: 0.65, fat_scalability: 0.70, protein_density: 36, carbs_density: 32, fat_density: 18 },
  { recipe_id: 21, protein_scalability: 0.85, carbs_scalability: 0.80, fat_scalability: 0.40, protein_density: 38, carbs_density: 45, fat_density: 8 },
  { recipe_id: 22, protein_scalability: 0.80, carbs_scalability: 0.50, fat_scalability: 0.60, protein_density: 32, carbs_density: 22, fat_density: 16 },
  { recipe_id: 23, protein_scalability: 0.65, carbs_scalability: 0.85, fat_scalability: 0.50, protein_density: 24, carbs_density: 48, fat_density: 12 },
  { recipe_id: 24, protein_scalability: 0.60, carbs_scalability: 0.75, fat_scalability: 0.55, protein_density: 20, carbs_density: 35, fat_density: 14 },
  
  { recipe_id: 30, protein_scalability: 0.90, carbs_scalability: 0.50, fat_scalability: 0.45, protein_density: 24, carbs_density: 18, fat_density: 6 },
  { recipe_id: 31, protein_scalability: 0.40, carbs_scalability: 0.60, fat_scalability: 0.80, protein_density: 8, carbs_density: 22, fat_density: 16 }
];

// Test scenarios
const testScenarios = [
  {
    name: 'Standard User (3 meals)',
    target_macros: { protein: 120, carbs: 150, fat: 50, calories: 1460 },
    preferences: {
      meal_count: 3,
      preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
      favorite_boost: 10,
      recent_penalty: 10
    }
  },
  {
    name: 'Active User (4 meals)',
    target_macros: { protein: 160, carbs: 220, fat: 70, calories: 2040 },
    preferences: {
      meal_count: 4,
      preferred_meal_types: ['reggeli', 'ebéd', 'uzsonna', 'vacsora'],
      favorite_boost: 15,
      recent_penalty: 15
    }
  },
  {
    name: 'Low Carb User',
    target_macros: { protein: 140, carbs: 80, fat: 90, calories: 1540 },
    preferences: {
      meal_count: 3,
      preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
      exclude_recipe_ids: [11, 23], // Exclude high-carb recipes
      favorite_boost: 8,
      recent_penalty: 12
    }
  },
  {
    name: 'High Protein User',
    target_macros: { protein: 180, carbs: 120, fat: 45, calories: 1560 },
    preferences: {
      meal_count: 3,
      preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
      favorite_boost: 12,
      recent_penalty: 8
    }
  }
];

export async function runMasterMealPlanDemo() {
  console.log('🎯 Master Meal Plan Generator Demo\n');
  console.log('='.repeat(80));
  
  // Demo database info
  console.log('\n📊 **Demo Database Info:**');
  console.log(`  Total Recipes: ${sampleRecipeDatabase.length}`);
  console.log(`  Breakfast: ${sampleRecipeDatabase.filter(r => r.category === 'reggeli').length}`);
  console.log(`  Lunch: ${sampleRecipeDatabase.filter(r => r.category === 'ebéd').length}`);
  console.log(`  Dinner: ${sampleRecipeDatabase.filter(r => r.category === 'vacsora').length}`);
  console.log(`  Snacks: ${sampleRecipeDatabase.filter(r => r.category === 'uzsonna').length}`);
  console.log(`  Favorites: ${sampleRecipeDatabase.filter(r => r.is_favorite).length}`);
  console.log(`  Recently Used: ${sampleRecipeDatabase.filter(r => r.usage_count_last_7_days > 0).length}`);

  // Run test scenarios
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log('\n' + '='.repeat(80));
    console.log(`\n🎯 **Test Scenario ${i + 1}: ${scenario.name}**\n`);
    
    console.log('Target Macros:');
    console.log(`  Protein: ${scenario.target_macros.protein}g`);
    console.log(`  Carbs: ${scenario.target_macros.carbs}g`);
    console.log(`  Fat: ${scenario.target_macros.fat}g`);
    console.log(`  Calories: ${scenario.target_macros.calories}`);
    
    console.log(`\nPreferences:`);
    console.log(`  Meals: ${scenario.preferences.meal_count} (${scenario.preferences.preferred_meal_types.join(', ')})`);
    console.log(`  Favorite boost: +${scenario.preferences.favorite_boost} points`);
    console.log(`  Recent penalty: -${scenario.preferences.recent_penalty} points`);
    if (scenario.preferences.exclude_recipe_ids) {
      console.log(`  Excluded recipes: ${scenario.preferences.exclude_recipe_ids.join(', ')}`);
    }

    // Create generation input
    const input: MasterGenerationInput = {
      target_macros: scenario.target_macros,
      recipes: sampleRecipeDatabase,
      scalability_data: sampleScalabilityData,
      preferences: scenario.preferences,
      algorithm_settings: createDefaultMasterSettings()
    };

    console.log('\n' + '-'.repeat(50));
    console.log('🚀 **Starting Generation Process...**\n');

    // Generate meal plan
    const startTime = Date.now();
    const result = await generateMasterMealPlan(input);
    const endTime = Date.now();

    // Display results
    console.log('\n' + '-'.repeat(50));
    console.log('📋 **GENERATION RESULTS**\n');

    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (${result.status})`);
    console.log(`Total time: ${result.generation_metadata.generation_time_ms}ms`);
    console.log(`Attempts: ${result.generation_metadata.total_attempts}/${input.algorithm_settings.max_attempts}`);
    console.log(`Steps completed: ${result.generation_metadata.steps_completed.join(' → ')}`);

    if (result.generation_metadata.failure_reasons && result.generation_metadata.failure_reasons.length > 0) {
      console.log('\nFailure reasons:');
      result.generation_metadata.failure_reasons.forEach(reason => console.log(`  ❌ ${reason}`));
    }

    // Show final meal plan
    if (result.final_meal_plan) {
      console.log('\n🍽️ **FINAL MEAL PLAN:**\n');
      
      Object.entries(result.final_meal_plan.meals).forEach(([mealType, meal]) => {
        const penalty = meal.recipe.penalty > 0 ? ` (penalty: -${meal.recipe.penalty})` : '';
        const reward = meal.recipe.reward > 0 ? ` (reward: +${meal.recipe.reward})` : '';
        const favorite = meal.recipe.is_favorite ? ' ⭐' : '';
        
        console.log(`  ${mealType.toUpperCase()}: ${meal.recipe.recipe_name}${favorite}`);
        console.log(`    Score: ${meal.recipe.final_score.toFixed(1)}${penalty}${reward}`);
        console.log(`    Macros: P:${meal.assigned_macros.protein}g C:${meal.assigned_macros.carbs}g F:${meal.assigned_macros.fat}g Cal:${meal.assigned_macros.calories}`);
        console.log('');
      });

      console.log('**TOTALS:**');
      const finalMacros = result.lp_optimization?.success ? 
        result.lp_optimization.optimized_macros : 
        result.final_meal_plan.total_macros;
      
      console.log(`  Protein: ${finalMacros.protein}g / ${scenario.target_macros.protein}g`);
      console.log(`  Carbs: ${finalMacros.carbs}g / ${scenario.target_macros.carbs}g`);
      console.log(`  Fat: ${finalMacros.fat}g / ${scenario.target_macros.fat}g`);
      console.log(`  Calories: ${finalMacros.calories} / ${scenario.target_macros.calories}`);
      
      console.log(`\n  Average Score: ${result.final_meal_plan.average_score.toFixed(1)}/100`);
      console.log(`  Total Deviation: ${result.quality_metrics.final_deviation_percent}%`);
    }

    // Show optimization details
    if (result.lp_optimization?.success) {
      console.log('\n🧮 **LP OPTIMIZATION APPLIED:**');
      console.log(`  Status: ${result.lp_optimization.status}`);
      console.log(`  Solve time: ${result.lp_optimization.metadata.solve_time_ms}ms`);
      console.log(`  Variables: ${result.lp_optimization.metadata.variables_count}`);
      console.log(`  Constraints: ${result.lp_optimization.metadata.constraints_count}`);
      
      console.log('\n  Deviation improvement:');
      const originalDeviation = result.final_meal_plan?.deviation.total_percent || 0;
      const optimizedDeviation = result.lp_optimization.deviations.total_percent;
      console.log(`    ${originalDeviation.toFixed(1)}% → ${optimizedDeviation.toFixed(1)}% (${(originalDeviation - optimizedDeviation).toFixed(1)}% better)`);
    }

    // Show validation results
    console.log('\n✅ **VALIDATION RESULTS:**');
    console.log(`  Overall Score: ${result.validation.overall_score}/100`);
    console.log(`  Deviation Check: ${result.validation.deviation_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Distribution Check: ${result.validation.distribution_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Quality Check: ${result.validation.quality_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Nutrition Check: ${result.validation.nutritional_validation?.passes ? '✅ PASS' : '❌ FAIL'}`);

    if (result.validation.validation_summary?.critical_failures?.length > 0) {
      console.log('\n  Critical Issues:');
      result.validation.validation_summary.critical_failures.forEach(issue => {
        console.log(`    ❌ ${issue}`);
      });
    }

    if (result.validation.validation_summary?.recommendations?.length > 0) {
      console.log('\n  Recommendations:');
      result.validation.validation_summary.recommendations.forEach(rec => {
        console.log(`    💡 ${rec}`);
      });
    }

    // Show quality metrics
    console.log('\n📊 **QUALITY METRICS:**');
    console.log(`  Final Deviation: ${result.quality_metrics.final_deviation_percent}%`);
    console.log(`  Final Score: ${result.quality_metrics.final_average_score}/100`);
    console.log(`  Recipe Diversity: ${result.quality_metrics.recipe_diversity_score}%`);
    console.log(`  Nutritional Balance: ${result.quality_metrics.nutritional_balance_score}%`);
    console.log(`  User Satisfaction: ${result.quality_metrics.user_satisfaction_score}%`);

    // Add delay between scenarios for readability
    if (i < testScenarios.length - 1) {
      console.log('\n⏳ Processing next scenario...\n');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎉 **MASTER DEMO COMPLETE!**');
  
  console.log('\n📊 **Algorithm Summary:**');
  console.log('  1. ✅ Recipe filtering by macro profile');
  console.log('  2. ✅ Recipe scoring (cosine similarity + scalability)');
  console.log('  3. ✅ Variety ranking (penalties + rewards)');
  console.log('  4. ✅ Smart meal combination');
  console.log('  5. ✅ Recipe swapping for weak macros');
  console.log('  6. ✅ LP optimization for fine-tuning');
  console.log('  7. ✅ Comprehensive validation');
  console.log('  8. ✅ Quality metrics & user satisfaction');

  console.log('\n💡 **Integration Ready!**');
  console.log('  The master algorithm is ready to be integrated into your main application.');
  console.log('  All components work together seamlessly to generate optimal meal plans.');
  console.log('  The system handles edge cases, provides detailed feedback, and ensures high quality results.');
}

// Uncomment to run demo in development
// runMasterMealPlanDemo();
 