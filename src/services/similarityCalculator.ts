/**
 * Similarity Calculator Service
 * Implements cosine similarity for recipe-target macro comparison
 */

export interface MacroVector {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface SimilarityResult {
  cosineSimilarity: number;
  normalizedSimilarity: number; // 0-100 scale
}

/**
 * Normalize a macro vector to unit length
 */
export function normalizeVector(vector: MacroVector): MacroVector {
  const magnitude = Math.sqrt(
    vector.protein ** 2 + 
    vector.carbs ** 2 + 
    vector.fat ** 2 + 
    vector.calories ** 2
  );
  
  if (magnitude === 0) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }
  
  return {
    protein: vector.protein / magnitude,
    carbs: vector.carbs / magnitude,
    fat: vector.fat / magnitude,
    calories: vector.calories / magnitude
  };
}

/**
 * Calculate dot product of two macro vectors
 */
export function dotProduct(vector1: MacroVector, vector2: MacroVector): number {
  return (
    vector1.protein * vector2.protein +
    vector1.carbs * vector2.carbs +
    vector1.fat * vector2.fat +
    vector1.calories * vector2.calories
  );
}

/**
 * Calculate vector magnitude
 */
export function vectorMagnitude(vector: MacroVector): number {
  return Math.sqrt(
    vector.protein ** 2 + 
    vector.carbs ** 2 + 
    vector.fat ** 2 + 
    vector.calories ** 2
  );
}

/**
 * Calculate cosine similarity between recipe and target macros
 * Formula: cosine_similarity = (recipe · target) / (|recipe| * |target|)
 * 
 * @param recipeMacros - Recipe macro profile
 * @param targetMacros - Target macro profile
 * @returns SimilarityResult with cosine similarity (0-1) and normalized score (0-100)
 */
export function calculateCosineSimilarity(
  recipeMacros: MacroVector,
  targetMacros: MacroVector
): SimilarityResult {
  try {
    // Calculate magnitudes
    const recipeMagnitude = vectorMagnitude(recipeMacros);
    const targetMagnitude = vectorMagnitude(targetMacros);
    
    // Handle edge cases
    if (recipeMagnitude === 0 || targetMagnitude === 0) {
      return {
        cosineSimilarity: 0,
        normalizedSimilarity: 0
      };
    }
    
    // Calculate dot product
    const dotProd = dotProduct(recipeMacros, targetMacros);
    
    // Calculate cosine similarity
    const cosineSimilarity = dotProd / (recipeMagnitude * targetMagnitude);
    
    // Ensure result is between 0 and 1 (clamp negative values to 0)
    const clampedSimilarity = Math.max(0, Math.min(1, cosineSimilarity));
    
    // Convert to 0-100 scale
    const normalizedSimilarity = clampedSimilarity * 100;
    
    return {
      cosineSimilarity: clampedSimilarity,
      normalizedSimilarity
    };
  } catch (error) {
    console.error('Error calculating cosine similarity:', error);
    return {
      cosineSimilarity: 0,
      normalizedSimilarity: 0
    };
  }
}

/**
 * Calculate similarity between recipe and target with normalized vectors
 * This version normalizes both vectors before calculation for better comparison
 */
export function calculateNormalizedCosineSimilarity(
  recipeMacros: MacroVector,
  targetMacros: MacroVector
): SimilarityResult {
  const normalizedRecipe = normalizeVector(recipeMacros);
  const normalizedTarget = normalizeVector(targetMacros);
  
  return calculateCosineSimilarity(normalizedRecipe, normalizedTarget);
}

/**
 * Convert recipe macros to MacroVector format
 */
export function recipeToMacroVector(recipe: {
  Feherje_g: number;
  Szenhidrat_g: number;
  Zsir_g: number;
  // Calculate calories using 4-4-9 rule
}): MacroVector {
  const protein = recipe.Feherje_g || 0;
  const carbs = recipe.Szenhidrat_g || 0;
  const fat = recipe.Zsir_g || 0;
  const calories = (protein * 4) + (carbs * 4) + (fat * 9);
  
  return {
    protein,
    carbs,
    fat,
    calories
  };
}

/**
 * Convert target macros to MacroVector format
 */
export function targetToMacroVector(target: {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}): MacroVector {
  return {
    protein: target.protein || 0,
    carbs: target.carbs || 0,
    fat: target.fat || 0,
    calories: target.calories || 0
  };
}
 * Similarity Calculator Service
 * Implements cosine similarity for recipe-target macro comparison
 */

export interface MacroVector {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface SimilarityResult {
  cosineSimilarity: number;
  normalizedSimilarity: number; // 0-100 scale
}

/**
 * Normalize a macro vector to unit length
 */
export function normalizeVector(vector: MacroVector): MacroVector {
  const magnitude = Math.sqrt(
    vector.protein ** 2 + 
    vector.carbs ** 2 + 
    vector.fat ** 2 + 
    vector.calories ** 2
  );
  
  if (magnitude === 0) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }
  
  return {
    protein: vector.protein / magnitude,
    carbs: vector.carbs / magnitude,
    fat: vector.fat / magnitude,
    calories: vector.calories / magnitude
  };
}

/**
 * Calculate dot product of two macro vectors
 */
export function dotProduct(vector1: MacroVector, vector2: MacroVector): number {
  return (
    vector1.protein * vector2.protein +
    vector1.carbs * vector2.carbs +
    vector1.fat * vector2.fat +
    vector1.calories * vector2.calories
  );
}

/**
 * Calculate vector magnitude
 */
export function vectorMagnitude(vector: MacroVector): number {
  return Math.sqrt(
    vector.protein ** 2 + 
    vector.carbs ** 2 + 
    vector.fat ** 2 + 
    vector.calories ** 2
  );
}

/**
 * Calculate cosine similarity between recipe and target macros
 * Formula: cosine_similarity = (recipe · target) / (|recipe| * |target|)
 * 
 * @param recipeMacros - Recipe macro profile
 * @param targetMacros - Target macro profile
 * @returns SimilarityResult with cosine similarity (0-1) and normalized score (0-100)
 */
export function calculateCosineSimilarity(
  recipeMacros: MacroVector,
  targetMacros: MacroVector
): SimilarityResult {
  try {
    // Calculate magnitudes
    const recipeMagnitude = vectorMagnitude(recipeMacros);
    const targetMagnitude = vectorMagnitude(targetMacros);
    
    // Handle edge cases
    if (recipeMagnitude === 0 || targetMagnitude === 0) {
      return {
        cosineSimilarity: 0,
        normalizedSimilarity: 0
      };
    }
    
    // Calculate dot product
    const dotProd = dotProduct(recipeMacros, targetMacros);
    
    // Calculate cosine similarity
    const cosineSimilarity = dotProd / (recipeMagnitude * targetMagnitude);
    
    // Ensure result is between 0 and 1 (clamp negative values to 0)
    const clampedSimilarity = Math.max(0, Math.min(1, cosineSimilarity));
    
    // Convert to 0-100 scale
    const normalizedSimilarity = clampedSimilarity * 100;
    
    return {
      cosineSimilarity: clampedSimilarity,
      normalizedSimilarity
    };
  } catch (error) {
    console.error('Error calculating cosine similarity:', error);
    return {
      cosineSimilarity: 0,
      normalizedSimilarity: 0
    };
  }
}

/**
 * Calculate similarity between recipe and target with normalized vectors
 * This version normalizes both vectors before calculation for better comparison
 */
export function calculateNormalizedCosineSimilarity(
  recipeMacros: MacroVector,
  targetMacros: MacroVector
): SimilarityResult {
  const normalizedRecipe = normalizeVector(recipeMacros);
  const normalizedTarget = normalizeVector(targetMacros);
  
  return calculateCosineSimilarity(normalizedRecipe, normalizedTarget);
}

/**
 * Convert recipe macros to MacroVector format
 */
export function recipeToMacroVector(recipe: {
  Feherje_g: number;
  Szenhidrat_g: number;
  Zsir_g: number;
  // Calculate calories using 4-4-9 rule
}): MacroVector {
  const protein = recipe.Feherje_g || 0;
  const carbs = recipe.Szenhidrat_g || 0;
  const fat = recipe.Zsir_g || 0;
  const calories = (protein * 4) + (carbs * 4) + (fat * 9);
  
  return {
    protein,
    carbs,
    fat,
    calories
  };
}

/**
 * Convert target macros to MacroVector format
 */
export function targetToMacroVector(target: {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}): MacroVector {
  return {
    protein: target.protein || 0,
    carbs: target.carbs || 0,
    fat: target.fat || 0,
    calories: target.calories || 0
  };
}