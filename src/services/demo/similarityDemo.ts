/**
 * Demo for Cosine Similarity Calculator
 * Run this to test the similarity calculations
 */

import {
  calculateCosineSimilarity,
  calculateNormalizedCosineSimilarity,
  recipeToMacroVector,
  targetToMacroVector,
  MacroVector
} from '../similarityCalculator';

// Demo function to test cosine similarity
export function runSimilarityDemo() {
  console.log('🧮 Cosine Similarity Calculator Demo\n');

  // Test Case 1: Identical vectors
  console.log('Test 1: Identical vectors (should be ~100%)');
  const recipe1: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
  const target1: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
  const result1 = calculateCosineSimilarity(recipe1, target1);
  console.log(`Recipe: P=${recipe1.protein}g, C=${recipe1.carbs}g, F=${recipe1.fat}g, Cal=${recipe1.calories}`);
  console.log(`Target: P=${target1.protein}g, C=${target1.carbs}g, F=${target1.fat}g, Cal=${target1.calories}`);
  console.log(`Similarity: ${result1.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 2: High protein recipe vs high protein target
  console.log('Test 2: High protein recipe vs high protein target (should be high)');
  const recipe2: MacroVector = { protein: 35, carbs: 10, fat: 8, calories: 230 };
  const target2: MacroVector = { protein: 30, carbs: 15, fat: 10, calories: 250 };
  const result2 = calculateCosineSimilarity(recipe2, target2);
  console.log(`Recipe: P=${recipe2.protein}g, C=${recipe2.carbs}g, F=${recipe2.fat}g, Cal=${recipe2.calories}`);
  console.log(`Target: P=${target2.protein}g, C=${target2.carbs}g, F=${target2.fat}g, Cal=${target2.calories}`);
  console.log(`Similarity: ${result2.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 3: High protein recipe vs high carb target (mismatch)
  console.log('Test 3: High protein recipe vs high carb target (should be low)');
  const recipe3: MacroVector = { protein: 35, carbs: 5, fat: 3, calories: 185 };
  const target3: MacroVector = { protein: 8, carbs: 60, fat: 5, calories: 300 };
  const result3 = calculateCosineSimilarity(recipe3, target3);
  console.log(`Recipe: P=${recipe3.protein}g, C=${recipe3.carbs}g, F=${recipe3.fat}g, Cal=${recipe3.calories}`);
  console.log(`Target: P=${target3.protein}g, C=${target3.carbs}g, F=${target3.fat}g, Cal=${target3.calories}`);
  console.log(`Similarity: ${result3.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 4: Different portions but same ratios (normalized)
  console.log('Test 4: Different portions, same ratios (normalized should be ~100%)');
  const recipe4: MacroVector = { protein: 10, carbs: 20, fat: 5, calories: 150 };
  const target4: MacroVector = { protein: 30, carbs: 60, fat: 15, calories: 450 };
  const result4normal = calculateCosineSimilarity(recipe4, target4);
  const result4normalized = calculateNormalizedCosineSimilarity(recipe4, target4);
  console.log(`Recipe: P=${recipe4.protein}g, C=${recipe4.carbs}g, F=${recipe4.fat}g, Cal=${recipe4.calories}`);
  console.log(`Target: P=${target4.protein}g, C=${target4.carbs}g, F=${target4.fat}g, Cal=${target4.calories}`);
  console.log(`Normal Similarity: ${result4normal.normalizedSimilarity.toFixed(1)}%`);
  console.log(`Normalized Similarity: ${result4normalized.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 5: Real recipe data conversion
  console.log('Test 5: Real recipe data conversion');
  const realRecipe = {
    Feherje_g: 25,
    Szenhidrat_g: 40,
    Zsir_g: 12
  };
  const realTarget = {
    protein: 30,
    carbs: 45,
    fat: 15,
    calories: 390
  };
  
  const recipeVector = recipeToMacroVector(realRecipe);
  const targetVector = targetToMacroVector(realTarget);
  const result5 = calculateCosineSimilarity(recipeVector, targetVector);
  
  console.log(`Recipe: P=${recipeVector.protein}g, C=${recipeVector.carbs}g, F=${recipeVector.fat}g, Cal=${recipeVector.calories}`);
  console.log(`Target: P=${targetVector.protein}g, C=${targetVector.carbs}g, F=${targetVector.fat}g, Cal=${targetVector.calories}`);
  console.log(`Similarity: ${result5.normalizedSimilarity.toFixed(1)}%\n`);

  console.log('✅ Cosine Similarity Demo Complete!');
}

// Uncomment to run demo in development
// runSimilarityDemo();
 * Demo for Cosine Similarity Calculator
 * Run this to test the similarity calculations
 */

import {
  calculateCosineSimilarity,
  calculateNormalizedCosineSimilarity,
  recipeToMacroVector,
  targetToMacroVector,
  MacroVector
} from '../similarityCalculator';

// Demo function to test cosine similarity
export function runSimilarityDemo() {
  console.log('🧮 Cosine Similarity Calculator Demo\n');

  // Test Case 1: Identical vectors
  console.log('Test 1: Identical vectors (should be ~100%)');
  const recipe1: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
  const target1: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
  const result1 = calculateCosineSimilarity(recipe1, target1);
  console.log(`Recipe: P=${recipe1.protein}g, C=${recipe1.carbs}g, F=${recipe1.fat}g, Cal=${recipe1.calories}`);
  console.log(`Target: P=${target1.protein}g, C=${target1.carbs}g, F=${target1.fat}g, Cal=${target1.calories}`);
  console.log(`Similarity: ${result1.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 2: High protein recipe vs high protein target
  console.log('Test 2: High protein recipe vs high protein target (should be high)');
  const recipe2: MacroVector = { protein: 35, carbs: 10, fat: 8, calories: 230 };
  const target2: MacroVector = { protein: 30, carbs: 15, fat: 10, calories: 250 };
  const result2 = calculateCosineSimilarity(recipe2, target2);
  console.log(`Recipe: P=${recipe2.protein}g, C=${recipe2.carbs}g, F=${recipe2.fat}g, Cal=${recipe2.calories}`);
  console.log(`Target: P=${target2.protein}g, C=${target2.carbs}g, F=${target2.fat}g, Cal=${target2.calories}`);
  console.log(`Similarity: ${result2.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 3: High protein recipe vs high carb target (mismatch)
  console.log('Test 3: High protein recipe vs high carb target (should be low)');
  const recipe3: MacroVector = { protein: 35, carbs: 5, fat: 3, calories: 185 };
  const target3: MacroVector = { protein: 8, carbs: 60, fat: 5, calories: 300 };
  const result3 = calculateCosineSimilarity(recipe3, target3);
  console.log(`Recipe: P=${recipe3.protein}g, C=${recipe3.carbs}g, F=${recipe3.fat}g, Cal=${recipe3.calories}`);
  console.log(`Target: P=${target3.protein}g, C=${target3.carbs}g, F=${target3.fat}g, Cal=${target3.calories}`);
  console.log(`Similarity: ${result3.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 4: Different portions but same ratios (normalized)
  console.log('Test 4: Different portions, same ratios (normalized should be ~100%)');
  const recipe4: MacroVector = { protein: 10, carbs: 20, fat: 5, calories: 150 };
  const target4: MacroVector = { protein: 30, carbs: 60, fat: 15, calories: 450 };
  const result4normal = calculateCosineSimilarity(recipe4, target4);
  const result4normalized = calculateNormalizedCosineSimilarity(recipe4, target4);
  console.log(`Recipe: P=${recipe4.protein}g, C=${recipe4.carbs}g, F=${recipe4.fat}g, Cal=${recipe4.calories}`);
  console.log(`Target: P=${target4.protein}g, C=${target4.carbs}g, F=${target4.fat}g, Cal=${target4.calories}`);
  console.log(`Normal Similarity: ${result4normal.normalizedSimilarity.toFixed(1)}%`);
  console.log(`Normalized Similarity: ${result4normalized.normalizedSimilarity.toFixed(1)}%\n`);

  // Test Case 5: Real recipe data conversion
  console.log('Test 5: Real recipe data conversion');
  const realRecipe = {
    Feherje_g: 25,
    Szenhidrat_g: 40,
    Zsir_g: 12
  };
  const realTarget = {
    protein: 30,
    carbs: 45,
    fat: 15,
    calories: 390
  };
  
  const recipeVector = recipeToMacroVector(realRecipe);
  const targetVector = targetToMacroVector(realTarget);
  const result5 = calculateCosineSimilarity(recipeVector, targetVector);
  
  console.log(`Recipe: P=${recipeVector.protein}g, C=${recipeVector.carbs}g, F=${recipeVector.fat}g, Cal=${recipeVector.calories}`);
  console.log(`Target: P=${targetVector.protein}g, C=${targetVector.carbs}g, F=${targetVector.fat}g, Cal=${targetVector.calories}`);
  console.log(`Similarity: ${result5.normalizedSimilarity.toFixed(1)}%\n`);

  console.log('✅ Cosine Similarity Demo Complete!');
}

// Uncomment to run demo in development
// runSimilarityDemo();