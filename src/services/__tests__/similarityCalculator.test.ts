/**
 * Tests for Similarity Calculator
 */

import {
  calculateCosineSimilarity,
  calculateNormalizedCosineSimilarity,
  normalizeVector,
  dotProduct,
  vectorMagnitude,
  recipeToMacroVector,
  targetToMacroVector,
  MacroVector
} from '../similarityCalculator';

describe('Similarity Calculator', () => {
  describe('Vector Operations', () => {
    test('should calculate vector magnitude correctly', () => {
      const vector: MacroVector = { protein: 3, carbs: 4, fat: 0, calories: 0 };
      expect(vectorMagnitude(vector)).toBeCloseTo(5, 2);
    });

    test('should calculate dot product correctly', () => {
      const vector1: MacroVector = { protein: 1, carbs: 2, fat: 3, calories: 4 };
      const vector2: MacroVector = { protein: 5, carbs: 6, fat: 7, calories: 8 };
      // 1*5 + 2*6 + 3*7 + 4*8 = 5 + 12 + 21 + 32 = 70
      expect(dotProduct(vector1, vector2)).toBe(70);
    });

    test('should normalize vector correctly', () => {
      const vector: MacroVector = { protein: 3, carbs: 4, fat: 0, calories: 0 };
      const normalized = normalizeVector(vector);
      expect(vectorMagnitude(normalized)).toBeCloseTo(1, 2);
      expect(normalized.protein).toBeCloseTo(0.6, 2);
      expect(normalized.carbs).toBeCloseTo(0.8, 2);
    });

    test('should handle zero vector normalization', () => {
      const vector: MacroVector = { protein: 0, carbs: 0, fat: 0, calories: 0 };
      const normalized = normalizeVector(vector);
      expect(normalized).toEqual({ protein: 0, carbs: 0, fat: 0, calories: 0 });
    });
  });

  describe('Cosine Similarity', () => {
    test('should return 1 for identical vectors', () => {
      const vector: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
      const result = calculateCosineSimilarity(vector, vector);
      expect(result.cosineSimilarity).toBeCloseTo(1, 2);
      expect(result.normalizedSimilarity).toBeCloseTo(100, 2);
    });

    test('should return 0 for orthogonal vectors', () => {
      const vector1: MacroVector = { protein: 1, carbs: 0, fat: 0, calories: 0 };
      const vector2: MacroVector = { protein: 0, carbs: 1, fat: 0, calories: 0 };
      const result = calculateCosineSimilarity(vector1, vector2);
      expect(result.cosineSimilarity).toBeCloseTo(0, 2);
      expect(result.normalizedSimilarity).toBeCloseTo(0, 2);
    });

    test('should handle zero vectors', () => {
      const vector1: MacroVector = { protein: 0, carbs: 0, fat: 0, calories: 0 };
      const vector2: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
      const result = calculateCosineSimilarity(vector1, vector2);
      expect(result.cosineSimilarity).toBe(0);
      expect(result.normalizedSimilarity).toBe(0);
    });

    test('should calculate realistic recipe similarity', () => {
      // High protein recipe
      const recipe: MacroVector = { protein: 30, carbs: 10, fat: 5, calories: 185 };
      // High protein target
      const target: MacroVector = { protein: 25, carbs: 15, fat: 8, calories: 200 };
      
      const result = calculateCosineSimilarity(recipe, target);
      expect(result.cosineSimilarity).toBeGreaterThan(0.8); // Should be high similarity
      expect(result.normalizedSimilarity).toBeGreaterThan(80);
    });

    test('should show low similarity for mismatched macros', () => {
      // High protein recipe
      const recipe: MacroVector = { protein: 30, carbs: 5, fat: 2, calories: 150 };
      // High carb target
      const target: MacroVector = { protein: 5, carbs: 50, fat: 3, calories: 240 };
      
      const result = calculateCosineSimilarity(recipe, target);
      expect(result.cosineSimilarity).toBeLessThan(0.5); // Should be low similarity
      expect(result.normalizedSimilarity).toBeLessThan(50);
    });
  });

  describe('Data Conversion', () => {
    test('should convert recipe to macro vector', () => {
      const recipe = {
        Feherje_g: 20,
        Szenhidrat_g: 30,
        Zsir_g: 10
      };
      
      const vector = recipeToMacroVector(recipe);
      expect(vector.protein).toBe(20);
      expect(vector.carbs).toBe(30);
      expect(vector.fat).toBe(10);
      expect(vector.calories).toBe(290); // 20*4 + 30*4 + 10*9 = 80 + 120 + 90 = 290
    });

    test('should convert target to macro vector', () => {
      const target = {
        protein: 25,
        carbs: 35,
        fat: 12,
        calories: 300
      };
      
      const vector = targetToMacroVector(target);
      expect(vector).toEqual(target);
    });

    test('should handle missing values in recipe conversion', () => {
      const recipe = {
        Feherje_g: 20,
        Szenhidrat_g: 0,
        Zsir_g: undefined as any
      };
      
      const vector = recipeToMacroVector(recipe);
      expect(vector.protein).toBe(20);
      expect(vector.carbs).toBe(0);
      expect(vector.fat).toBe(0);
      expect(vector.calories).toBe(80); // 20*4 = 80
    });
  });

  describe('Normalized Cosine Similarity', () => {
    test('should work with different magnitude vectors', () => {
      // Small recipe portions
      const recipe: MacroVector = { protein: 5, carbs: 10, fat: 2, calories: 70 };
      // Large target portions  
      const target: MacroVector = { protein: 25, carbs: 50, fat: 10, calories: 350 };
      
      const result = calculateNormalizedCosineSimilarity(recipe, target);
      expect(result.cosineSimilarity).toBeCloseTo(1, 2); // Should be very similar after normalization
      expect(result.normalizedSimilarity).toBeCloseTo(100, 2);
    });
  });
});
 * Tests for Similarity Calculator
 */

import {
  calculateCosineSimilarity,
  calculateNormalizedCosineSimilarity,
  normalizeVector,
  dotProduct,
  vectorMagnitude,
  recipeToMacroVector,
  targetToMacroVector,
  MacroVector
} from '../similarityCalculator';

describe('Similarity Calculator', () => {
  describe('Vector Operations', () => {
    test('should calculate vector magnitude correctly', () => {
      const vector: MacroVector = { protein: 3, carbs: 4, fat: 0, calories: 0 };
      expect(vectorMagnitude(vector)).toBeCloseTo(5, 2);
    });

    test('should calculate dot product correctly', () => {
      const vector1: MacroVector = { protein: 1, carbs: 2, fat: 3, calories: 4 };
      const vector2: MacroVector = { protein: 5, carbs: 6, fat: 7, calories: 8 };
      // 1*5 + 2*6 + 3*7 + 4*8 = 5 + 12 + 21 + 32 = 70
      expect(dotProduct(vector1, vector2)).toBe(70);
    });

    test('should normalize vector correctly', () => {
      const vector: MacroVector = { protein: 3, carbs: 4, fat: 0, calories: 0 };
      const normalized = normalizeVector(vector);
      expect(vectorMagnitude(normalized)).toBeCloseTo(1, 2);
      expect(normalized.protein).toBeCloseTo(0.6, 2);
      expect(normalized.carbs).toBeCloseTo(0.8, 2);
    });

    test('should handle zero vector normalization', () => {
      const vector: MacroVector = { protein: 0, carbs: 0, fat: 0, calories: 0 };
      const normalized = normalizeVector(vector);
      expect(normalized).toEqual({ protein: 0, carbs: 0, fat: 0, calories: 0 });
    });
  });

  describe('Cosine Similarity', () => {
    test('should return 1 for identical vectors', () => {
      const vector: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
      const result = calculateCosineSimilarity(vector, vector);
      expect(result.cosineSimilarity).toBeCloseTo(1, 2);
      expect(result.normalizedSimilarity).toBeCloseTo(100, 2);
    });

    test('should return 0 for orthogonal vectors', () => {
      const vector1: MacroVector = { protein: 1, carbs: 0, fat: 0, calories: 0 };
      const vector2: MacroVector = { protein: 0, carbs: 1, fat: 0, calories: 0 };
      const result = calculateCosineSimilarity(vector1, vector2);
      expect(result.cosineSimilarity).toBeCloseTo(0, 2);
      expect(result.normalizedSimilarity).toBeCloseTo(0, 2);
    });

    test('should handle zero vectors', () => {
      const vector1: MacroVector = { protein: 0, carbs: 0, fat: 0, calories: 0 };
      const vector2: MacroVector = { protein: 20, carbs: 30, fat: 10, calories: 280 };
      const result = calculateCosineSimilarity(vector1, vector2);
      expect(result.cosineSimilarity).toBe(0);
      expect(result.normalizedSimilarity).toBe(0);
    });

    test('should calculate realistic recipe similarity', () => {
      // High protein recipe
      const recipe: MacroVector = { protein: 30, carbs: 10, fat: 5, calories: 185 };
      // High protein target
      const target: MacroVector = { protein: 25, carbs: 15, fat: 8, calories: 200 };
      
      const result = calculateCosineSimilarity(recipe, target);
      expect(result.cosineSimilarity).toBeGreaterThan(0.8); // Should be high similarity
      expect(result.normalizedSimilarity).toBeGreaterThan(80);
    });

    test('should show low similarity for mismatched macros', () => {
      // High protein recipe
      const recipe: MacroVector = { protein: 30, carbs: 5, fat: 2, calories: 150 };
      // High carb target
      const target: MacroVector = { protein: 5, carbs: 50, fat: 3, calories: 240 };
      
      const result = calculateCosineSimilarity(recipe, target);
      expect(result.cosineSimilarity).toBeLessThan(0.5); // Should be low similarity
      expect(result.normalizedSimilarity).toBeLessThan(50);
    });
  });

  describe('Data Conversion', () => {
    test('should convert recipe to macro vector', () => {
      const recipe = {
        Feherje_g: 20,
        Szenhidrat_g: 30,
        Zsir_g: 10
      };
      
      const vector = recipeToMacroVector(recipe);
      expect(vector.protein).toBe(20);
      expect(vector.carbs).toBe(30);
      expect(vector.fat).toBe(10);
      expect(vector.calories).toBe(290); // 20*4 + 30*4 + 10*9 = 80 + 120 + 90 = 290
    });

    test('should convert target to macro vector', () => {
      const target = {
        protein: 25,
        carbs: 35,
        fat: 12,
        calories: 300
      };
      
      const vector = targetToMacroVector(target);
      expect(vector).toEqual(target);
    });

    test('should handle missing values in recipe conversion', () => {
      const recipe = {
        Feherje_g: 20,
        Szenhidrat_g: 0,
        Zsir_g: undefined as any
      };
      
      const vector = recipeToMacroVector(recipe);
      expect(vector.protein).toBe(20);
      expect(vector.carbs).toBe(0);
      expect(vector.fat).toBe(0);
      expect(vector.calories).toBe(80); // 20*4 = 80
    });
  });

  describe('Normalized Cosine Similarity', () => {
    test('should work with different magnitude vectors', () => {
      // Small recipe portions
      const recipe: MacroVector = { protein: 5, carbs: 10, fat: 2, calories: 70 };
      // Large target portions  
      const target: MacroVector = { protein: 25, carbs: 50, fat: 10, calories: 350 };
      
      const result = calculateNormalizedCosineSimilarity(recipe, target);
      expect(result.cosineSimilarity).toBeCloseTo(1, 2); // Should be very similar after normalization
      expect(result.normalizedSimilarity).toBeCloseTo(100, 2);
    });
  });
});