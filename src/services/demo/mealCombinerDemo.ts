/**
 * Demo for Meal Combiner
 * Shows how meal combinations are generated with score thresholds
 */

import {
  selectTopRecipesByCategory,
  getBestMealCombination,
  analyzeCombinationQuality,
  DEFAULT_COMBINER_CRITERIA,
  DEFAULT_MEAL_DISTRIBUTIONS,
  MealTypeMapping,
  CombinerCriteria
} from '../mealCombiner';
import { VarietyAdjustment } from '../recipeRanker';

// Sample ranked recipes (after variety adjustments)
const sampleRankedRecipes: VarietyAdjustment[] = [
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
    recipe_id: 2,
    recipe_name: 'Overnight Oats',
    base_score: 78.3,
    penalty: 0,
    reward: 8,
    final_score: 86.3,
    is_favorite: false,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 0
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
  },
  {
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
  {
    recipe_id: 9,
    recipe_name: 'Vegetable Stir Fry',
    base_score: 71.2,
    penalty: 0,
    reward: 5,
    final_score: 76.2,
    is_favorite: false,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 0
  },
  {
    recipe_id: 10,
    recipe_name: 'Protein Bar',
    base_score: 68.4,
    penalty: 0,
    reward: 0,
    final_score: 68.4,
    is_favorite: false,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1
  }
];

// Sample meal type mappings
const sampleMealTypeMappings: MealTypeMapping[] = [
  { recipe_id: 1, meal_types: ['reggeli', 'tízórai'] },
  { recipe_id: 2, meal_types: ['reggeli'] },
  { recipe_id: 3, meal_types: ['reggeli'] },
  { recipe_id: 4, meal_types: ['ebéd', 'vacsora'] },
  { recipe_id: 5, meal_types: ['ebéd'] },
  { recipe_id: 6, meal_types: ['ebéd', 'vacsora'] },
  { recipe_id: 7, meal_types: ['vacsora'] },
  { recipe_id: 8, meal_types: ['reggeli', 'uzsonna'] },
  { recipe_id: 9, meal_types: ['ebéd', 'vacsora'] },
  { recipe_id: 10, meal_types: ['tízórai', 'uzsonna'] }
];

// Sample recipe base data (macros)
const sampleRecipeBaseData = [
  { recipe_id: 1, Feherje_g: 30, Szenhidrat_g: 15, Zsir_g: 5 },
  { recipe_id: 2, Feherje_g: 12, Szenhidrat_g: 45, Zsir_g: 8 },
  { recipe_id: 3, Feherje_g: 18, Szenhidrat_g: 2, Zsir_g: 12 },
  { recipe_id: 4, Feherje_g: 35, Szenhidrat_g: 8, Zsir_g: 10 },
  { recipe_id: 5, Feherje_g: 22, Szenhidrat_g: 55, Zsir_g: 15 },
  { recipe_id: 6, Feherje_g: 8, Szenhidrat_g: 60, Zsir_g: 3 },
  { recipe_id: 7, Feherje_g: 40, Szenhidrat_g: 0, Zsir_g: 18 },
  { recipe_id: 8, Feherje_g: 15, Szenhidrat_g: 20, Zsir_g: 5 },
  { recipe_id: 9, Feherje_g: 6, Szenhidrat_g: 25, Zsir_g: 8 },
  { recipe_id: 10, Feherje_g: 20, Szenhidrat_g: 25, Zsir_g: 8 }
];

export function runMealCombinerDemo() {
  console.log('🍽️ Meal Combiner Demo\n');

  // Target macros for the day
  const targetMacros = {
    protein: 120,  // 120g protein
    carbs: 150,    // 150g carbs
    fat: 60,       // 60g fat
    calories: 1500 // 1500 calories
  };

  console.log('Target Daily Macros:');
  console.log(`  Protein: ${targetMacros.protein}g`);
  console.log(`  Carbs: ${targetMacros.carbs}g`);
  console.log(`  Fat: ${targetMacros.fat}g`);
  console.log(`  Calories: ${targetMacros.calories}kcal\n`);

  console.log('Meal Distribution Plan:');
  DEFAULT_MEAL_DISTRIBUTIONS.forEach(dist => {
    console.log(`  ${dist.meal_type}: ${dist.target_percentage}% (${dist.min_percentage}-${dist.max_percentage}%)`);
  });

  console.log('\n' + '='.repeat(60));

  // Show available recipes by meal type
  console.log('\nAvailable Recipes by Meal Type:');
  
  const mealTypes = ['reggeli', 'ebéd', 'vacsora', 'tízórai', 'uzsonna'];
  mealTypes.forEach(mealType => {
    const recipes = sampleRankedRecipes.filter(recipe => {
      const mapping = sampleMealTypeMappings.find(m => m.recipe_id === recipe.recipe_id);
      return mapping && mapping.meal_types.includes(mealType);
    });
    
    console.log(`\n${mealType.toUpperCase()}:`);
    recipes.forEach(recipe => {
      const statusIcons = [];
      if (recipe.is_favorite) statusIcons.push('★');
      if (recipe.final_score >= 90) statusIcons.push('🔥');
      if (recipe.penalty < 0) statusIcons.push('⏰');
      
      console.log(`  - ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} ${statusIcons.join(' ')}`);
    });
  });

  console.log('\n' + '='.repeat(60));

  // Generate meal combinations with default criteria
  console.log('\n=== Generating Meal Combinations (Default Criteria) ===');
  console.log(`Minimum average score: ${DEFAULT_COMBINER_CRITERIA.minAverageScore}`);
  console.log(`Maximum combinations: ${DEFAULT_COMBINER_CRITERIA.maxCombinations}\n`);

  const result = selectTopRecipesByCategory(
    sampleRankedRecipes,
    sampleMealTypeMappings,
    targetMacros,
    sampleRecipeBaseData,
    DEFAULT_COMBINER_CRITERIA
  );

  console.log('Generation Stats:');
  console.log(`  Total recipes analyzed: ${result.stats.totalRecipes}`);
  console.log(`  Recipes above threshold (≥80): ${result.stats.recipesAboveThreshold}`);
  console.log(`  Average recipe score: ${result.stats.averageScore.toFixed(1)}`);
  console.log(`  Combinations generated: ${result.stats.combinationsGenerated}`);
  console.log(`  Combinations meeting threshold: ${result.stats.combinationsMeetingThreshold}`);

  // Show top 3 combinations
  console.log('\n=== Top 3 Meal Combinations ===\n');
  
  const topCombinations = result.combinations.slice(0, 3);
  topCombinations.forEach((combo, index) => {
    console.log(`${index + 1}. Combination ${combo.meal_plan_id.slice(-6)}`);
    console.log(`   Average Score: ${combo.average_score.toFixed(1)} ${combo.meets_threshold ? '✅' : '❌'}`);
    console.log(`   Total Deviation: ${combo.deviation.total_percent.toFixed(1)}%`);
    
    console.log('   Meals:');
    Object.entries(combo.meals).forEach(([mealType, meal]) => {
      const macros = meal.assigned_macros;
      console.log(`     ${mealType}: ${meal.recipe.recipe_name} (${meal.recipe.final_score.toFixed(1)}pts)`);
      if (macros) {
        console.log(`       P:${macros.protein.toFixed(1)}g C:${macros.carbs.toFixed(1)}g F:${macros.fat.toFixed(1)}g Cal:${macros.calories.toFixed(0)}`);
      }
    });
    
    console.log(`   Total Macros: P:${combo.total_macros.protein.toFixed(1)}g C:${combo.total_macros.carbs.toFixed(1)}g F:${combo.total_macros.fat.toFixed(1)}g Cal:${combo.total_macros.calories.toFixed(0)}`);
    console.log(`   Deviations: P:${combo.deviation.protein_percent.toFixed(1)}% C:${combo.deviation.carbs_percent.toFixed(1)}% F:${combo.deviation.fat_percent.toFixed(1)}% Cal:${combo.deviation.calories_percent.toFixed(1)}%`);
    console.log('');
  });

  console.log('='.repeat(60));

  // Get best combination and analyze it
  const bestCombination = getBestMealCombination(result.combinations);
  
  if (bestCombination) {
    console.log('\n=== Best Combination Analysis ===\n');
    
    const analysis = analyzeCombinationQuality(bestCombination);
    
    console.log(`Quality Score: ${analysis.quality_score.toFixed(1)}/100`);
    
    if (analysis.strengths.length > 0) {
      console.log('\nStrengths:');
      analysis.strengths.forEach(strength => console.log(`  ✅ ${strength}`));
    }
    
    if (analysis.weaknesses.length > 0) {
      console.log('\nWeaknesses:');
      analysis.weaknesses.forEach(weakness => console.log(`  ⚠️ ${weakness}`));
    }
    
    if (analysis.recommendations.length > 0) {
      console.log('\nRecommendations:');
      analysis.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
    }
  }

  console.log('\n' + '='.repeat(60));

  // Test with stricter criteria
  console.log('\n=== Testing Stricter Criteria ===\n');
  
  const strictCriteria: CombinerCriteria = {
    minAverageScore: 90,  // Higher threshold
    mealDistributions: DEFAULT_MEAL_DISTRIBUTIONS,
    maxCombinations: 25,  // Fewer combinations
    allowPartialCombinations: false,
    varietyWeight: 0.5    // More variety weight
  };

  const strictResult = selectTopRecipesByCategory(
    sampleRankedRecipes,
    sampleMealTypeMappings,
    targetMacros,
    sampleRecipeBaseData,
    strictCriteria
  );

  console.log('Strict Criteria Results:');
  console.log(`  Minimum score requirement: ${strictCriteria.minAverageScore}`);
  console.log(`  Combinations generated: ${strictResult.stats.combinationsGenerated}`);
  console.log(`  Combinations meeting threshold: ${strictResult.stats.combinationsMeetingThreshold}`);
  
  if (strictResult.stats.combinationsMeetingThreshold > 0) {
    const bestStrict = getBestMealCombination(strictResult.combinations);
    console.log(`  Best combination score: ${bestStrict?.average_score.toFixed(1)}`);
  } else {
    console.log('  ⚠️ No combinations met the strict criteria');
  }

  console.log('\n' + '='.repeat(60));

  // Test with relaxed criteria
  console.log('\n=== Testing Relaxed Criteria ===\n');
  
  const relaxedCriteria: CombinerCriteria = {
    minAverageScore: 70,  // Lower threshold
    mealDistributions: DEFAULT_MEAL_DISTRIBUTIONS,
    maxCombinations: 100, // More combinations
    allowPartialCombinations: true,  // Allow partial
    varietyWeight: 0.1    // Less variety weight
  };

  const relaxedResult = selectTopRecipesByCategory(
    sampleRankedRecipes,
    sampleMealTypeMappings,
    targetMacros,
    sampleRecipeBaseData,
    relaxedCriteria
  );

  console.log('Relaxed Criteria Results:');
  console.log(`  Minimum score requirement: ${relaxedCriteria.minAverageScore}`);
  console.log(`  Allow partial combinations: ${relaxedCriteria.allowPartialCombinations}`);
  console.log(`  Combinations generated: ${relaxedResult.stats.combinationsGenerated}`);
  console.log(`  Combinations meeting threshold: ${relaxedResult.stats.combinationsMeetingThreshold}`);
  
  const bestRelaxed = getBestMealCombination(relaxedResult.combinations);
  if (bestRelaxed) {
    console.log(`  Best combination score: ${bestRelaxed.average_score.toFixed(1)}`);
    console.log(`  Meal types covered: ${Object.keys(bestRelaxed.meals).length}`);
  }

  console.log('\n✅ Meal Combiner Demo Complete!');
}

// Uncomment to run demo in development
// runMealCombinerDemo();
 * Demo for Meal Combiner
 * Shows how meal combinations are generated with score thresholds
 */

import {
  selectTopRecipesByCategory,
  getBestMealCombination,
  analyzeCombinationQuality,
  DEFAULT_COMBINER_CRITERIA,
  DEFAULT_MEAL_DISTRIBUTIONS,
  MealTypeMapping,
  CombinerCriteria
} from '../mealCombiner';
import { VarietyAdjustment } from '../recipeRanker';

// Sample ranked recipes (after variety adjustments)
const sampleRankedRecipes: VarietyAdjustment[] = [
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
    recipe_id: 2,
    recipe_name: 'Overnight Oats',
    base_score: 78.3,
    penalty: 0,
    reward: 8,
    final_score: 86.3,
    is_favorite: false,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 0
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
  },
  {
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
  {
    recipe_id: 9,
    recipe_name: 'Vegetable Stir Fry',
    base_score: 71.2,
    penalty: 0,
    reward: 5,
    final_score: 76.2,
    is_favorite: false,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 0
  },
  {
    recipe_id: 10,
    recipe_name: 'Protein Bar',
    base_score: 68.4,
    penalty: 0,
    reward: 0,
    final_score: 68.4,
    is_favorite: false,
    usage_count_last_7_days: 0,
    usage_count_last_30_days: 1
  }
];

// Sample meal type mappings
const sampleMealTypeMappings: MealTypeMapping[] = [
  { recipe_id: 1, meal_types: ['reggeli', 'tízórai'] },
  { recipe_id: 2, meal_types: ['reggeli'] },
  { recipe_id: 3, meal_types: ['reggeli'] },
  { recipe_id: 4, meal_types: ['ebéd', 'vacsora'] },
  { recipe_id: 5, meal_types: ['ebéd'] },
  { recipe_id: 6, meal_types: ['ebéd', 'vacsora'] },
  { recipe_id: 7, meal_types: ['vacsora'] },
  { recipe_id: 8, meal_types: ['reggeli', 'uzsonna'] },
  { recipe_id: 9, meal_types: ['ebéd', 'vacsora'] },
  { recipe_id: 10, meal_types: ['tízórai', 'uzsonna'] }
];

// Sample recipe base data (macros)
const sampleRecipeBaseData = [
  { recipe_id: 1, Feherje_g: 30, Szenhidrat_g: 15, Zsir_g: 5 },
  { recipe_id: 2, Feherje_g: 12, Szenhidrat_g: 45, Zsir_g: 8 },
  { recipe_id: 3, Feherje_g: 18, Szenhidrat_g: 2, Zsir_g: 12 },
  { recipe_id: 4, Feherje_g: 35, Szenhidrat_g: 8, Zsir_g: 10 },
  { recipe_id: 5, Feherje_g: 22, Szenhidrat_g: 55, Zsir_g: 15 },
  { recipe_id: 6, Feherje_g: 8, Szenhidrat_g: 60, Zsir_g: 3 },
  { recipe_id: 7, Feherje_g: 40, Szenhidrat_g: 0, Zsir_g: 18 },
  { recipe_id: 8, Feherje_g: 15, Szenhidrat_g: 20, Zsir_g: 5 },
  { recipe_id: 9, Feherje_g: 6, Szenhidrat_g: 25, Zsir_g: 8 },
  { recipe_id: 10, Feherje_g: 20, Szenhidrat_g: 25, Zsir_g: 8 }
];

export function runMealCombinerDemo() {
  console.log('🍽️ Meal Combiner Demo\n');

  // Target macros for the day
  const targetMacros = {
    protein: 120,  // 120g protein
    carbs: 150,    // 150g carbs
    fat: 60,       // 60g fat
    calories: 1500 // 1500 calories
  };

  console.log('Target Daily Macros:');
  console.log(`  Protein: ${targetMacros.protein}g`);
  console.log(`  Carbs: ${targetMacros.carbs}g`);
  console.log(`  Fat: ${targetMacros.fat}g`);
  console.log(`  Calories: ${targetMacros.calories}kcal\n`);

  console.log('Meal Distribution Plan:');
  DEFAULT_MEAL_DISTRIBUTIONS.forEach(dist => {
    console.log(`  ${dist.meal_type}: ${dist.target_percentage}% (${dist.min_percentage}-${dist.max_percentage}%)`);
  });

  console.log('\n' + '='.repeat(60));

  // Show available recipes by meal type
  console.log('\nAvailable Recipes by Meal Type:');
  
  const mealTypes = ['reggeli', 'ebéd', 'vacsora', 'tízórai', 'uzsonna'];
  mealTypes.forEach(mealType => {
    const recipes = sampleRankedRecipes.filter(recipe => {
      const mapping = sampleMealTypeMappings.find(m => m.recipe_id === recipe.recipe_id);
      return mapping && mapping.meal_types.includes(mealType);
    });
    
    console.log(`\n${mealType.toUpperCase()}:`);
    recipes.forEach(recipe => {
      const statusIcons = [];
      if (recipe.is_favorite) statusIcons.push('★');
      if (recipe.final_score >= 90) statusIcons.push('🔥');
      if (recipe.penalty < 0) statusIcons.push('⏰');
      
      console.log(`  - ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} ${statusIcons.join(' ')}`);
    });
  });

  console.log('\n' + '='.repeat(60));

  // Generate meal combinations with default criteria
  console.log('\n=== Generating Meal Combinations (Default Criteria) ===');
  console.log(`Minimum average score: ${DEFAULT_COMBINER_CRITERIA.minAverageScore}`);
  console.log(`Maximum combinations: ${DEFAULT_COMBINER_CRITERIA.maxCombinations}\n`);

  const result = selectTopRecipesByCategory(
    sampleRankedRecipes,
    sampleMealTypeMappings,
    targetMacros,
    sampleRecipeBaseData,
    DEFAULT_COMBINER_CRITERIA
  );

  console.log('Generation Stats:');
  console.log(`  Total recipes analyzed: ${result.stats.totalRecipes}`);
  console.log(`  Recipes above threshold (≥80): ${result.stats.recipesAboveThreshold}`);
  console.log(`  Average recipe score: ${result.stats.averageScore.toFixed(1)}`);
  console.log(`  Combinations generated: ${result.stats.combinationsGenerated}`);
  console.log(`  Combinations meeting threshold: ${result.stats.combinationsMeetingThreshold}`);

  // Show top 3 combinations
  console.log('\n=== Top 3 Meal Combinations ===\n');
  
  const topCombinations = result.combinations.slice(0, 3);
  topCombinations.forEach((combo, index) => {
    console.log(`${index + 1}. Combination ${combo.meal_plan_id.slice(-6)}`);
    console.log(`   Average Score: ${combo.average_score.toFixed(1)} ${combo.meets_threshold ? '✅' : '❌'}`);
    console.log(`   Total Deviation: ${combo.deviation.total_percent.toFixed(1)}%`);
    
    console.log('   Meals:');
    Object.entries(combo.meals).forEach(([mealType, meal]) => {
      const macros = meal.assigned_macros;
      console.log(`     ${mealType}: ${meal.recipe.recipe_name} (${meal.recipe.final_score.toFixed(1)}pts)`);
      if (macros) {
        console.log(`       P:${macros.protein.toFixed(1)}g C:${macros.carbs.toFixed(1)}g F:${macros.fat.toFixed(1)}g Cal:${macros.calories.toFixed(0)}`);
      }
    });
    
    console.log(`   Total Macros: P:${combo.total_macros.protein.toFixed(1)}g C:${combo.total_macros.carbs.toFixed(1)}g F:${combo.total_macros.fat.toFixed(1)}g Cal:${combo.total_macros.calories.toFixed(0)}`);
    console.log(`   Deviations: P:${combo.deviation.protein_percent.toFixed(1)}% C:${combo.deviation.carbs_percent.toFixed(1)}% F:${combo.deviation.fat_percent.toFixed(1)}% Cal:${combo.deviation.calories_percent.toFixed(1)}%`);
    console.log('');
  });

  console.log('='.repeat(60));

  // Get best combination and analyze it
  const bestCombination = getBestMealCombination(result.combinations);
  
  if (bestCombination) {
    console.log('\n=== Best Combination Analysis ===\n');
    
    const analysis = analyzeCombinationQuality(bestCombination);
    
    console.log(`Quality Score: ${analysis.quality_score.toFixed(1)}/100`);
    
    if (analysis.strengths.length > 0) {
      console.log('\nStrengths:');
      analysis.strengths.forEach(strength => console.log(`  ✅ ${strength}`));
    }
    
    if (analysis.weaknesses.length > 0) {
      console.log('\nWeaknesses:');
      analysis.weaknesses.forEach(weakness => console.log(`  ⚠️ ${weakness}`));
    }
    
    if (analysis.recommendations.length > 0) {
      console.log('\nRecommendations:');
      analysis.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
    }
  }

  console.log('\n' + '='.repeat(60));

  // Test with stricter criteria
  console.log('\n=== Testing Stricter Criteria ===\n');
  
  const strictCriteria: CombinerCriteria = {
    minAverageScore: 90,  // Higher threshold
    mealDistributions: DEFAULT_MEAL_DISTRIBUTIONS,
    maxCombinations: 25,  // Fewer combinations
    allowPartialCombinations: false,
    varietyWeight: 0.5    // More variety weight
  };

  const strictResult = selectTopRecipesByCategory(
    sampleRankedRecipes,
    sampleMealTypeMappings,
    targetMacros,
    sampleRecipeBaseData,
    strictCriteria
  );

  console.log('Strict Criteria Results:');
  console.log(`  Minimum score requirement: ${strictCriteria.minAverageScore}`);
  console.log(`  Combinations generated: ${strictResult.stats.combinationsGenerated}`);
  console.log(`  Combinations meeting threshold: ${strictResult.stats.combinationsMeetingThreshold}`);
  
  if (strictResult.stats.combinationsMeetingThreshold > 0) {
    const bestStrict = getBestMealCombination(strictResult.combinations);
    console.log(`  Best combination score: ${bestStrict?.average_score.toFixed(1)}`);
  } else {
    console.log('  ⚠️ No combinations met the strict criteria');
  }

  console.log('\n' + '='.repeat(60));

  // Test with relaxed criteria
  console.log('\n=== Testing Relaxed Criteria ===\n');
  
  const relaxedCriteria: CombinerCriteria = {
    minAverageScore: 70,  // Lower threshold
    mealDistributions: DEFAULT_MEAL_DISTRIBUTIONS,
    maxCombinations: 100, // More combinations
    allowPartialCombinations: true,  // Allow partial
    varietyWeight: 0.1    // Less variety weight
  };

  const relaxedResult = selectTopRecipesByCategory(
    sampleRankedRecipes,
    sampleMealTypeMappings,
    targetMacros,
    sampleRecipeBaseData,
    relaxedCriteria
  );

  console.log('Relaxed Criteria Results:');
  console.log(`  Minimum score requirement: ${relaxedCriteria.minAverageScore}`);
  console.log(`  Allow partial combinations: ${relaxedCriteria.allowPartialCombinations}`);
  console.log(`  Combinations generated: ${relaxedResult.stats.combinationsGenerated}`);
  console.log(`  Combinations meeting threshold: ${relaxedResult.stats.combinationsMeetingThreshold}`);
  
  const bestRelaxed = getBestMealCombination(relaxedResult.combinations);
  if (bestRelaxed) {
    console.log(`  Best combination score: ${bestRelaxed.average_score.toFixed(1)}`);
    console.log(`  Meal types covered: ${Object.keys(bestRelaxed.meals).length}`);
  }

  console.log('\n✅ Meal Combiner Demo Complete!');
}

// Uncomment to run demo in development
// runMealCombinerDemo();
 