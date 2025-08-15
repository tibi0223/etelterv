import { generateMasterMealPlan, createDefaultMasterSettings } from '@/services/masterMealPlanGenerator';
import type { RecipeWithHistory } from '@/services/recipeRanker';
import type { RecipeScalability } from '@/services/recipeScorer';

async function main() {
  const target = { protein: 120, carbs: 150, fat: 50, calories: 1460 };

  // Minimal in-memory sample data (no DB, no ingredients → strict pre-filter skipped safely)
  const recipes: RecipeWithHistory[] = [
    { recipe_id: 1, recipe_name: 'Protein Oatmeal Bowl', category: 'reggeli', base_macros: { protein: 28, carbs: 45, fat: 12, calories: 372 }, is_favorite: true, days_since_last_use: 8, usage_count_last_7_days: 0, usage_count_last_30_days: 2, base_score: 0 },
    { recipe_id: 10, recipe_name: 'Grilled Chicken Salad', category: 'ebéd', base_macros: { protein: 42, carbs: 18, fat: 14, calories: 346 }, is_favorite: false, days_since_last_use: 5, usage_count_last_7_days: 1, usage_count_last_30_days: 4, base_score: 0 },
    { recipe_id: 20, recipe_name: 'Salmon with Sweet Potato', category: 'vacsora', base_macros: { protein: 36, carbs: 32, fat: 18, calories: 398 }, is_favorite: true, days_since_last_use: 6, usage_count_last_7_days: 1, usage_count_last_30_days: 3, base_score: 0 },
  ];

  const scalability: RecipeScalability[] = [
    { recipe_id: 1, protein_scalability: 0.85, carbs_scalability: 0.70, fat_scalability: 0.60, protein_density: 28, carbs_density: 45, fat_density: 12 },
    { recipe_id: 10, protein_scalability: 0.90, carbs_scalability: 0.40, fat_scalability: 0.55, protein_density: 42, carbs_density: 18, fat_density: 14 },
    { recipe_id: 20, protein_scalability: 0.90, carbs_scalability: 0.65, fat_scalability: 0.70, protein_density: 36, carbs_density: 32, fat_density: 18 },
  ];

  const input = {
    target_macros: target,
    recipes,
    scalability_data: scalability,
    preferences: {
      meal_count: 3,
      preferred_meal_types: ['reggeli', 'ebéd', 'vacsora'],
      favorite_boost: 10,
      recent_penalty: 10,
    },
    algorithm_settings: createDefaultMasterSettings(),
  } as const;

  const result = await generateMasterMealPlan(input);
  console.log(JSON.stringify({
    success: result.success,
    status: result.status,
    totals: result.final_meal_plan?.total_macros,
    steps: result.generation_metadata.steps_completed,
    deviation: result.quality_metrics.final_deviation_percent,
  }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });


