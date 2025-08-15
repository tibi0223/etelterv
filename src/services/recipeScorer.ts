import { calculateCosineSimilarity } from './similarityCalculator';
import type { RecipeWithHistory } from './recipeRanker';

export interface RecipeScalability {
  recipe_id: number;
  protein_scalability: number;
  carbs_scalability: number;
  fat_scalability: number;
  protein_density: number;
  carbs_density: number;
  fat_density: number;
}

export function calculateRecipeScore(
  recipe: RecipeWithHistory,
  target: { protein: number; carbs: number; fat: number; calories: number },
  scalability: RecipeScalability
): {
  total_score: number;
  cosine_similarity: number;        // 0-100
  weighted_scalability: number;     // 0-100
  size_factor: number;              // 0-100
} {
  const rec = {
    protein: recipe.base_macros.protein,
    carbs: recipe.base_macros.carbs,
    fat: recipe.base_macros.fat,
    calories: recipe.base_macros.calories,
  };

  // 1) Cosine similarity (0-100)
  const cos = calculateCosineSimilarity(rec, target).normalizedSimilarity;

  // 2) Weighted scalability (P/C/F súlyok a cél arányaiból)
  const totalPCF = Math.max(1e-6, target.protein + target.carbs + target.fat);
  const wP = target.protein / totalPCF;
  const wC = target.carbs / totalPCF;
  const wF = target.fat / totalPCF;
  const wSkala =
    (scalability.protein_scalability || 0) * wP +
    (scalability.carbs_scalability || 0) * wC +
    (scalability.fat_scalability || 0) * wF;
  const weightedSkalaPct = Math.max(0, Math.min(1, wSkala)) * 100;

  // 3) Size factor (kategória szerinti cal célhoz viszonyítva)
  const dist: Record<string, number> = {
    'reggeli': 0.28, 'ebéd': 0.40, 'vacsora': 0.32,
    'uzsonna': 0.20, 'snack': 0.20,
  };
  const category = (recipe.category || '').toLowerCase();
  const frac = dist[category] ?? (1 / 3);
  const categoryGoal = Math.max(1, target.calories * frac);
  const sizeFactor = Math.min(1, rec.calories / categoryGoal) * 100;

  // Súlyok: cosine 40, skála 40, méret 20
  const total =
    0.4 * cos +
    0.4 * weightedSkalaPct +
    0.2 * sizeFactor;

  return {
    total_score: Math.max(0, Math.min(100, total)),
    cosine_similarity: cos,
    weighted_scalability: weightedSkalaPct,
    size_factor: sizeFactor,
  };
}
