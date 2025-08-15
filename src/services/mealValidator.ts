/**
 * Meal Plan Validator Service
 * Validates final meal plans against deviation and distribution criteria
 */

import { MealCombination } from './mealCombiner';
import { LPOptimizationResult } from './lpOptimizer';

export interface ValidationCriteria {
  // Deviation limits
  max_total_deviation_percent: number;      // e.g., 20% - total average deviation
  max_individual_deviation_percent: number; // e.g., 25% - any single macro
  
  // Distribution criteria (meal distribution flexibility)
  meal_distribution: {
    reggeli: { target_percent: number; tolerance_percent: number }; // e.g., 28% ±5%
    ebéd: { target_percent: number; tolerance_percent: number };    // e.g., 39% ±5%
    vacsora: { target_percent: number; tolerance_percent: number }; // e.g., 22% ±5%
    uzsonna?: { target_percent: number; tolerance_percent: number }; // e.g., 11% ±5%
  };
  
  // Quality criteria
  min_recipe_score: number;                 // e.g., 70 - minimum acceptable recipe score
  min_average_score: number;                // e.g., 80 - minimum average score across meals
  
  // Nutritional balance
  min_protein_density: number;              // e.g., 0.15 - minimum protein/calorie ratio
  max_fat_percent: number;                  // e.g., 35% - maximum fat percentage of calories
  min_carb_percent: number;                 // e.g., 20% - minimum carb percentage of calories
}

export interface ValidationResult {
  is_valid: boolean;
  overall_score: number;                    // 0-100 validation score
  
  // Detailed validation results
  deviation_validation: {
    passes: boolean;
    total_deviation_percent: number;
    individual_deviations: {
      protein_percent: number;
      carbs_percent: number;
      fat_percent: number;
      calories_percent: number;
    };
    violations: string[];
  };
  
  distribution_validation: {
    passes: boolean;
    meal_distributions: {
      [meal_type: string]: {
        actual_percent: number;
        target_percent: number;
        tolerance_percent: number;
        is_within_range: boolean;
        deviation: number;
      };
    };
    violations: string[];
  };
  
  quality_validation: {
    passes: boolean;
    recipe_scores: Array<{
      recipe_id: number;
      recipe_name: string;
      meal_type: string;
      score: number;
      meets_minimum: boolean;
    }>;
    average_score: number;
    violations: string[];
  };
  
  nutritional_validation: {
    passes: boolean;
    protein_density: number;                // protein_g / calories
    fat_percent: number;                    // (fat_g * 9) / calories * 100
    carb_percent: number;                   // (carb_g * 4) / calories * 100
    violations: string[];
  };
  
  // Summary
  validation_summary: {
    passed_checks: number;
    total_checks: number;
    critical_failures: string[];
    warnings: string[];
    recommendations: string[];
  };
}

/**
 * Create default validation criteria based on the original algorithm prompt
 */
export function createDefaultValidationCriteria(mealCount: number = 3): ValidationCriteria {
  // Dynamic meal distribution based on meal count
  let mealDistribution: ValidationCriteria['meal_distribution'];
  
  if (mealCount === 3) {
    // Reggeli 28%, Ebéd 39%, Vacsora 33% (adjusted to 100%)
    mealDistribution = {
      reggeli: { target_percent: 28, tolerance_percent: 5 },
      ebéd: { target_percent: 39, tolerance_percent: 5 },
      vacsora: { target_percent: 33, tolerance_percent: 5 }
    };
  } else if (mealCount === 4) {
    // Reggeli 25%, Ebéd 35%, Uzsonna 15%, Vacsora 25%
    mealDistribution = {
      reggeli: { target_percent: 25, tolerance_percent: 5 },
      ebéd: { target_percent: 35, tolerance_percent: 5 },
      uzsonna: { target_percent: 15, tolerance_percent: 5 },
      vacsora: { target_percent: 25, tolerance_percent: 5 }
    };
  } else {
    // Flexible distribution for other meal counts
    const equalPercent = Math.round(100 / mealCount);
    mealDistribution = {
      reggeli: { target_percent: equalPercent, tolerance_percent: 8 },
      ebéd: { target_percent: equalPercent, tolerance_percent: 8 },
      vacsora: { target_percent: equalPercent, tolerance_percent: 8 }
    };
  }
  
  return {
    max_total_deviation_percent: 20,        // Original prompt: <20% nyers deviáció
    max_individual_deviation_percent: 25,   // Reasonable individual macro limit
    meal_distribution: mealDistribution,
    min_recipe_score: 70,                   // Reasonable minimum quality
    min_average_score: 80,                  // Original prompt: >80 pontszám
    min_protein_density: 0.12,              // 12% minimum protein (reasonable)
    max_fat_percent: 40,                    // 40% maximum fat calories
    min_carb_percent: 15                    // 15% minimum carb calories
  };
}

/**
 * Validate meal plan against criteria
 */
export function validateMealPlan(
  combination: MealCombination,
  criteria: ValidationCriteria,
  lpResult?: LPOptimizationResult
): ValidationResult {
  
  // Use LP result if available, otherwise use combination totals
  const finalMacros = lpResult?.success ? lpResult.optimized_macros : combination.total_macros;
  const finalDeviations = lpResult?.success ? lpResult.deviations : combination.deviation;
  
  // Initialize result structure
  const result: ValidationResult = {
    is_valid: false,
    overall_score: 0,
    deviation_validation: {
      passes: false,
      total_deviation_percent: 0,
      individual_deviations: {
        protein_percent: 0,
        carbs_percent: 0,
        fat_percent: 0,
        calories_percent: 0
      },
      violations: []
    },
    distribution_validation: {
      passes: false,
      meal_distributions: {},
      violations: []
    },
    quality_validation: {
      passes: false,
      recipe_scores: [],
      average_score: 0,
      violations: []
    },
    nutritional_validation: {
      passes: false,
      protein_density: 0,
      fat_percent: 0,
      carb_percent: 0,
      violations: []
    },
    validation_summary: {
      passed_checks: 0,
      total_checks: 4, // deviation, distribution, quality, nutritional
      critical_failures: [],
      warnings: [],
      recommendations: []
    }
  };
  
  // 1. DEVIATION VALIDATION
  result.deviation_validation = validateDeviations(finalDeviations, criteria);
  if (result.deviation_validation.passes) result.validation_summary.passed_checks++;
  
  // 2. DISTRIBUTION VALIDATION  
  result.distribution_validation = validateDistribution(combination, criteria);
  if (result.distribution_validation.passes) result.validation_summary.passed_checks++;
  
  // 3. QUALITY VALIDATION
  result.quality_validation = validateQuality(combination, criteria);
  if (result.quality_validation.passes) result.validation_summary.passed_checks++;
  
  // 4. NUTRITIONAL VALIDATION
  result.nutritional_validation = validateNutrition(finalMacros, criteria);
  if (result.nutritional_validation.passes) result.validation_summary.passed_checks++;
  
  // Calculate overall score and validity
  const scoreWeights = {
    deviation: 40,      // Most important
    distribution: 20,   // Distribution flexibility
    quality: 25,        // Recipe quality
    nutritional: 15     // Basic nutrition checks
  };
  
  result.overall_score = 
    (result.deviation_validation.passes ? scoreWeights.deviation : 0) +
    (result.distribution_validation.passes ? scoreWeights.distribution : 0) +
    (result.quality_validation.passes ? scoreWeights.quality : 0) +
    (result.nutritional_validation.passes ? scoreWeights.nutritional : 0);
  
  // Determine validity (at least deviation + quality must pass)
  result.is_valid = result.deviation_validation.passes && result.quality_validation.passes;
  
  // Collect critical failures and recommendations
  collectSummary(result);
  
  return result;
}

/**
 * Validate macro deviations
 */
function validateDeviations(
  deviations: { 
    protein_percent: number; 
    carbs_percent: number; 
    fat_percent: number; 
    calories_percent: number;
    total_percent?: number;
  },
  criteria: ValidationCriteria
): ValidationResult['deviation_validation'] {
  
  const totalDeviation = deviations.total_percent || 
    (deviations.protein_percent + deviations.carbs_percent + deviations.fat_percent + deviations.calories_percent) / 4;
  
  const violations: string[] = [];
  
  // Check total deviation
  if (totalDeviation > criteria.max_total_deviation_percent) {
    violations.push(`Total deviation ${totalDeviation.toFixed(1)}% exceeds limit ${criteria.max_total_deviation_percent}%`);
  }
  
  // Check individual deviations
  const individualChecks = [
    { name: 'Protein', value: deviations.protein_percent },
    { name: 'Carbs', value: deviations.carbs_percent },
    { name: 'Fat', value: deviations.fat_percent },
    { name: 'Calories', value: deviations.calories_percent }
  ];
  
  individualChecks.forEach(check => {
    if (check.value > criteria.max_individual_deviation_percent) {
      violations.push(`${check.name} deviation ${check.value.toFixed(1)}% exceeds limit ${criteria.max_individual_deviation_percent}%`);
    }
  });
  
  return {
    passes: violations.length === 0,
    total_deviation_percent: totalDeviation,
    individual_deviations: {
      protein_percent: deviations.protein_percent,
      carbs_percent: deviations.carbs_percent,
      fat_percent: deviations.fat_percent,
      calories_percent: deviations.calories_percent
    },
    violations
  };
}

/**
 * Validate meal distribution
 */
function validateDistribution(
  combination: MealCombination,
  criteria: ValidationCriteria
): ValidationResult['distribution_validation'] {
  
  const mealDistributions: ValidationResult['distribution_validation']['meal_distributions'] = {};
  const violations: string[] = [];
  
  // Calculate actual distributions
  const totalCalories = combination.total_macros.calories;
  
  Object.entries(combination.meals).forEach(([mealType, meal]) => {
    const mealCalories = meal.assigned_macros.calories;
    const actualPercent = totalCalories > 0 ? (mealCalories / totalCalories) * 100 : 0;
    
    const distributionCriteria = criteria.meal_distribution[mealType as keyof typeof criteria.meal_distribution];
    
    if (distributionCriteria) {
      const targetPercent = distributionCriteria.target_percent;
      const tolerance = distributionCriteria.tolerance_percent;
      const minAcceptable = targetPercent - tolerance;
      const maxAcceptable = targetPercent + tolerance;
      const isWithinRange = actualPercent >= minAcceptable && actualPercent <= maxAcceptable;
      const deviation = Math.abs(actualPercent - targetPercent);
      
      mealDistributions[mealType] = {
        actual_percent: Math.round(actualPercent * 10) / 10,
        target_percent: targetPercent,
        tolerance_percent: tolerance,
        is_within_range: isWithinRange,
        deviation: Math.round(deviation * 10) / 10
      };
      
      if (!isWithinRange) {
        violations.push(`${mealType} distribution ${actualPercent.toFixed(1)}% outside range ${minAcceptable}%-${maxAcceptable}%`);
      }
    }
  });
  
  return {
    passes: violations.length === 0,
    meal_distributions: mealDistributions,
    violations
  };
}

/**
 * Validate recipe quality
 */
function validateQuality(
  combination: MealCombination,
  criteria: ValidationCriteria
): ValidationResult['quality_validation'] {
  
  const recipeScores: ValidationResult['quality_validation']['recipe_scores'] = [];
  const violations: string[] = [];
  
  // Check individual recipe scores
  Object.entries(combination.meals).forEach(([mealType, meal]) => {
    const score = meal.recipe.final_score;
    const meetsMinimum = score >= criteria.min_recipe_score;
    
    recipeScores.push({
      recipe_id: meal.recipe.recipe_id,
      recipe_name: meal.recipe.recipe_name,
      meal_type: mealType,
      score: score,
      meets_minimum: meetsMinimum
    });
    
    if (!meetsMinimum) {
      violations.push(`${meal.recipe.recipe_name} (${mealType}) score ${score.toFixed(1)} below minimum ${criteria.min_recipe_score}`);
    }
  });
  
  // Check average score
  const averageScore = combination.average_score;
  if (averageScore < criteria.min_average_score) {
    violations.push(`Average score ${averageScore.toFixed(1)} below minimum ${criteria.min_average_score}`);
  }
  
  return {
    passes: violations.length === 0,
    recipe_scores: recipeScores,
    average_score: averageScore,
    violations
  };
}

/**
 * Validate nutritional balance
 */
function validateNutrition(
  macros: { protein: number; carbs: number; fat: number; calories: number },
  criteria: ValidationCriteria
): ValidationResult['nutritional_validation'] {
  
  const violations: string[] = [];
  
  // Calculate nutritional ratios
  const proteinDensity = macros.calories > 0 ? macros.protein / macros.calories : 0;
  const fatPercent = macros.calories > 0 ? (macros.fat * 9) / macros.calories * 100 : 0;
  const carbPercent = macros.calories > 0 ? (macros.carbs * 4) / macros.calories * 100 : 0;
  
  // Validate protein density
  if (proteinDensity < criteria.min_protein_density) {
    violations.push(`Protein density ${(proteinDensity * 100).toFixed(1)}% below minimum ${(criteria.min_protein_density * 100).toFixed(1)}%`);
  }
  
  // Validate fat percentage
  if (fatPercent > criteria.max_fat_percent) {
    violations.push(`Fat percentage ${fatPercent.toFixed(1)}% exceeds maximum ${criteria.max_fat_percent}%`);
  }
  
  // Validate carb percentage
  if (carbPercent < criteria.min_carb_percent) {
    violations.push(`Carb percentage ${carbPercent.toFixed(1)}% below minimum ${criteria.min_carb_percent}%`);
  }
  
  return {
    passes: violations.length === 0,
    protein_density: Math.round(proteinDensity * 1000) / 1000,
    fat_percent: Math.round(fatPercent * 10) / 10,
    carb_percent: Math.round(carbPercent * 10) / 10,
    violations
  };
}

/**
 * Collect summary information
 */
function collectSummary(result: ValidationResult): void {
  const summary = result.validation_summary;
  
  // Collect all violations as critical failures or warnings
  [
    result.deviation_validation,
    result.distribution_validation,
    result.quality_validation,
    result.nutritional_validation
  ].forEach(validation => {
    validation.violations.forEach(violation => {
      if (validation === result.deviation_validation || validation === result.quality_validation) {
        summary.critical_failures.push(violation);
      } else {
        summary.warnings.push(violation);
      }
    });
  });
  
  // Generate recommendations
  if (!result.deviation_validation.passes) {
    summary.recommendations.push('Consider using LP optimization to reduce macro deviations');
    
    if (result.deviation_validation.individual_deviations.carbs_percent > 30) {
      summary.recommendations.push('Add more carbohydrate-rich ingredients or increase portions');
    }
    
    if (result.deviation_validation.individual_deviations.protein_percent > 20) {
      summary.recommendations.push('Adjust protein sources or add protein supplements');
    }
  }
  
  if (!result.distribution_validation.passes) {
    summary.recommendations.push('Rebalance calorie distribution between meals');
  }
  
  if (!result.quality_validation.passes) {
    summary.recommendations.push('Consider swapping low-scoring recipes for better alternatives');
  }
  
  if (!result.nutritional_validation.passes) {
    summary.recommendations.push('Review overall nutritional balance and ingredient choices');
  }
  
  if (result.overall_score < 60) {
    summary.recommendations.push('Consider using fallback recipe generation for better results');
  }
}

/**
 * Quick validation check (simplified version)
 */
export function quickValidationCheck(
  combination: MealCombination,
  maxDeviationPercent: number = 20
): { passes: boolean; totalDeviation: number; mainIssues: string[] } {
  
  const totalDeviation = combination.deviation.total_percent;
  const passes = totalDeviation <= maxDeviationPercent && combination.average_score >= 80;
  
  const mainIssues: string[] = [];
  if (totalDeviation > maxDeviationPercent) {
    mainIssues.push(`High deviation: ${totalDeviation.toFixed(1)}%`);
  }
  if (combination.average_score < 80) {
    mainIssues.push(`Low quality: ${combination.average_score.toFixed(1)} score`);
  }
  
  return {
    passes,
    totalDeviation,
    mainIssues
  };
}
 * Meal Plan Validator Service
 * Validates final meal plans against deviation and distribution criteria
 */

import { MealCombination } from './mealCombiner';
import { LPOptimizationResult } from './lpOptimizer';

export interface ValidationCriteria {
  // Deviation limits
  max_total_deviation_percent: number;      // e.g., 20% - total average deviation
  max_individual_deviation_percent: number; // e.g., 25% - any single macro
  
  // Distribution criteria (meal distribution flexibility)
  meal_distribution: {
    reggeli: { target_percent: number; tolerance_percent: number }; // e.g., 28% ±5%
    ebéd: { target_percent: number; tolerance_percent: number };    // e.g., 39% ±5%
    vacsora: { target_percent: number; tolerance_percent: number }; // e.g., 22% ±5%
    uzsonna?: { target_percent: number; tolerance_percent: number }; // e.g., 11% ±5%
  };
  
  // Quality criteria
  min_recipe_score: number;                 // e.g., 70 - minimum acceptable recipe score
  min_average_score: number;                // e.g., 80 - minimum average score across meals
  
  // Nutritional balance
  min_protein_density: number;              // e.g., 0.15 - minimum protein/calorie ratio
  max_fat_percent: number;                  // e.g., 35% - maximum fat percentage of calories
  min_carb_percent: number;                 // e.g., 20% - minimum carb percentage of calories
}

export interface ValidationResult {
  is_valid: boolean;
  overall_score: number;                    // 0-100 validation score
  
  // Detailed validation results
  deviation_validation: {
    passes: boolean;
    total_deviation_percent: number;
    individual_deviations: {
      protein_percent: number;
      carbs_percent: number;
      fat_percent: number;
      calories_percent: number;
    };
    violations: string[];
  };
  
  distribution_validation: {
    passes: boolean;
    meal_distributions: {
      [meal_type: string]: {
        actual_percent: number;
        target_percent: number;
        tolerance_percent: number;
        is_within_range: boolean;
        deviation: number;
      };
    };
    violations: string[];
  };
  
  quality_validation: {
    passes: boolean;
    recipe_scores: Array<{
      recipe_id: number;
      recipe_name: string;
      meal_type: string;
      score: number;
      meets_minimum: boolean;
    }>;
    average_score: number;
    violations: string[];
  };
  
  nutritional_validation: {
    passes: boolean;
    protein_density: number;                // protein_g / calories
    fat_percent: number;                    // (fat_g * 9) / calories * 100
    carb_percent: number;                   // (carb_g * 4) / calories * 100
    violations: string[];
  };
  
  // Summary
  validation_summary: {
    passed_checks: number;
    total_checks: number;
    critical_failures: string[];
    warnings: string[];
    recommendations: string[];
  };
}

/**
 * Create default validation criteria based on the original algorithm prompt
 */
export function createDefaultValidationCriteria(mealCount: number = 3): ValidationCriteria {
  // Dynamic meal distribution based on meal count
  let mealDistribution: ValidationCriteria['meal_distribution'];
  
  if (mealCount === 3) {
    // Reggeli 28%, Ebéd 39%, Vacsora 33% (adjusted to 100%)
    mealDistribution = {
      reggeli: { target_percent: 28, tolerance_percent: 5 },
      ebéd: { target_percent: 39, tolerance_percent: 5 },
      vacsora: { target_percent: 33, tolerance_percent: 5 }
    };
  } else if (mealCount === 4) {
    // Reggeli 25%, Ebéd 35%, Uzsonna 15%, Vacsora 25%
    mealDistribution = {
      reggeli: { target_percent: 25, tolerance_percent: 5 },
      ebéd: { target_percent: 35, tolerance_percent: 5 },
      uzsonna: { target_percent: 15, tolerance_percent: 5 },
      vacsora: { target_percent: 25, tolerance_percent: 5 }
    };
  } else {
    // Flexible distribution for other meal counts
    const equalPercent = Math.round(100 / mealCount);
    mealDistribution = {
      reggeli: { target_percent: equalPercent, tolerance_percent: 8 },
      ebéd: { target_percent: equalPercent, tolerance_percent: 8 },
      vacsora: { target_percent: equalPercent, tolerance_percent: 8 }
    };
  }
  
  return {
    max_total_deviation_percent: 20,        // Original prompt: <20% nyers deviáció
    max_individual_deviation_percent: 25,   // Reasonable individual macro limit
    meal_distribution: mealDistribution,
    min_recipe_score: 70,                   // Reasonable minimum quality
    min_average_score: 80,                  // Original prompt: >80 pontszám
    min_protein_density: 0.12,              // 12% minimum protein (reasonable)
    max_fat_percent: 40,                    // 40% maximum fat calories
    min_carb_percent: 15                    // 15% minimum carb calories
  };
}

/**
 * Validate meal plan against criteria
 */
export function validateMealPlan(
  combination: MealCombination,
  criteria: ValidationCriteria,
  lpResult?: LPOptimizationResult
): ValidationResult {
  
  // Use LP result if available, otherwise use combination totals
  const finalMacros = lpResult?.success ? lpResult.optimized_macros : combination.total_macros;
  const finalDeviations = lpResult?.success ? lpResult.deviations : combination.deviation;
  
  // Initialize result structure
  const result: ValidationResult = {
    is_valid: false,
    overall_score: 0,
    deviation_validation: {
      passes: false,
      total_deviation_percent: 0,
      individual_deviations: {
        protein_percent: 0,
        carbs_percent: 0,
        fat_percent: 0,
        calories_percent: 0
      },
      violations: []
    },
    distribution_validation: {
      passes: false,
      meal_distributions: {},
      violations: []
    },
    quality_validation: {
      passes: false,
      recipe_scores: [],
      average_score: 0,
      violations: []
    },
    nutritional_validation: {
      passes: false,
      protein_density: 0,
      fat_percent: 0,
      carb_percent: 0,
      violations: []
    },
    validation_summary: {
      passed_checks: 0,
      total_checks: 4, // deviation, distribution, quality, nutritional
      critical_failures: [],
      warnings: [],
      recommendations: []
    }
  };
  
  // 1. DEVIATION VALIDATION
  result.deviation_validation = validateDeviations(finalDeviations, criteria);
  if (result.deviation_validation.passes) result.validation_summary.passed_checks++;
  
  // 2. DISTRIBUTION VALIDATION  
  result.distribution_validation = validateDistribution(combination, criteria);
  if (result.distribution_validation.passes) result.validation_summary.passed_checks++;
  
  // 3. QUALITY VALIDATION
  result.quality_validation = validateQuality(combination, criteria);
  if (result.quality_validation.passes) result.validation_summary.passed_checks++;
  
  // 4. NUTRITIONAL VALIDATION
  result.nutritional_validation = validateNutrition(finalMacros, criteria);
  if (result.nutritional_validation.passes) result.validation_summary.passed_checks++;
  
  // Calculate overall score and validity
  const scoreWeights = {
    deviation: 40,      // Most important
    distribution: 20,   // Distribution flexibility
    quality: 25,        // Recipe quality
    nutritional: 15     // Basic nutrition checks
  };
  
  result.overall_score = 
    (result.deviation_validation.passes ? scoreWeights.deviation : 0) +
    (result.distribution_validation.passes ? scoreWeights.distribution : 0) +
    (result.quality_validation.passes ? scoreWeights.quality : 0) +
    (result.nutritional_validation.passes ? scoreWeights.nutritional : 0);
  
  // Determine validity (at least deviation + quality must pass)
  result.is_valid = result.deviation_validation.passes && result.quality_validation.passes;
  
  // Collect critical failures and recommendations
  collectSummary(result);
  
  return result;
}

/**
 * Validate macro deviations
 */
function validateDeviations(
  deviations: { 
    protein_percent: number; 
    carbs_percent: number; 
    fat_percent: number; 
    calories_percent: number;
    total_percent?: number;
  },
  criteria: ValidationCriteria
): ValidationResult['deviation_validation'] {
  
  const totalDeviation = deviations.total_percent || 
    (deviations.protein_percent + deviations.carbs_percent + deviations.fat_percent + deviations.calories_percent) / 4;
  
  const violations: string[] = [];
  
  // Check total deviation
  if (totalDeviation > criteria.max_total_deviation_percent) {
    violations.push(`Total deviation ${totalDeviation.toFixed(1)}% exceeds limit ${criteria.max_total_deviation_percent}%`);
  }
  
  // Check individual deviations
  const individualChecks = [
    { name: 'Protein', value: deviations.protein_percent },
    { name: 'Carbs', value: deviations.carbs_percent },
    { name: 'Fat', value: deviations.fat_percent },
    { name: 'Calories', value: deviations.calories_percent }
  ];
  
  individualChecks.forEach(check => {
    if (check.value > criteria.max_individual_deviation_percent) {
      violations.push(`${check.name} deviation ${check.value.toFixed(1)}% exceeds limit ${criteria.max_individual_deviation_percent}%`);
    }
  });
  
  return {
    passes: violations.length === 0,
    total_deviation_percent: totalDeviation,
    individual_deviations: {
      protein_percent: deviations.protein_percent,
      carbs_percent: deviations.carbs_percent,
      fat_percent: deviations.fat_percent,
      calories_percent: deviations.calories_percent
    },
    violations
  };
}

/**
 * Validate meal distribution
 */
function validateDistribution(
  combination: MealCombination,
  criteria: ValidationCriteria
): ValidationResult['distribution_validation'] {
  
  const mealDistributions: ValidationResult['distribution_validation']['meal_distributions'] = {};
  const violations: string[] = [];
  
  // Calculate actual distributions
  const totalCalories = combination.total_macros.calories;
  
  Object.entries(combination.meals).forEach(([mealType, meal]) => {
    const mealCalories = meal.assigned_macros.calories;
    const actualPercent = totalCalories > 0 ? (mealCalories / totalCalories) * 100 : 0;
    
    const distributionCriteria = criteria.meal_distribution[mealType as keyof typeof criteria.meal_distribution];
    
    if (distributionCriteria) {
      const targetPercent = distributionCriteria.target_percent;
      const tolerance = distributionCriteria.tolerance_percent;
      const minAcceptable = targetPercent - tolerance;
      const maxAcceptable = targetPercent + tolerance;
      const isWithinRange = actualPercent >= minAcceptable && actualPercent <= maxAcceptable;
      const deviation = Math.abs(actualPercent - targetPercent);
      
      mealDistributions[mealType] = {
        actual_percent: Math.round(actualPercent * 10) / 10,
        target_percent: targetPercent,
        tolerance_percent: tolerance,
        is_within_range: isWithinRange,
        deviation: Math.round(deviation * 10) / 10
      };
      
      if (!isWithinRange) {
        violations.push(`${mealType} distribution ${actualPercent.toFixed(1)}% outside range ${minAcceptable}%-${maxAcceptable}%`);
      }
    }
  });
  
  return {
    passes: violations.length === 0,
    meal_distributions: mealDistributions,
    violations
  };
}

/**
 * Validate recipe quality
 */
function validateQuality(
  combination: MealCombination,
  criteria: ValidationCriteria
): ValidationResult['quality_validation'] {
  
  const recipeScores: ValidationResult['quality_validation']['recipe_scores'] = [];
  const violations: string[] = [];
  
  // Check individual recipe scores
  Object.entries(combination.meals).forEach(([mealType, meal]) => {
    const score = meal.recipe.final_score;
    const meetsMinimum = score >= criteria.min_recipe_score;
    
    recipeScores.push({
      recipe_id: meal.recipe.recipe_id,
      recipe_name: meal.recipe.recipe_name,
      meal_type: mealType,
      score: score,
      meets_minimum: meetsMinimum
    });
    
    if (!meetsMinimum) {
      violations.push(`${meal.recipe.recipe_name} (${mealType}) score ${score.toFixed(1)} below minimum ${criteria.min_recipe_score}`);
    }
  });
  
  // Check average score
  const averageScore = combination.average_score;
  if (averageScore < criteria.min_average_score) {
    violations.push(`Average score ${averageScore.toFixed(1)} below minimum ${criteria.min_average_score}`);
  }
  
  return {
    passes: violations.length === 0,
    recipe_scores: recipeScores,
    average_score: averageScore,
    violations
  };
}

/**
 * Validate nutritional balance
 */
function validateNutrition(
  macros: { protein: number; carbs: number; fat: number; calories: number },
  criteria: ValidationCriteria
): ValidationResult['nutritional_validation'] {
  
  const violations: string[] = [];
  
  // Calculate nutritional ratios
  const proteinDensity = macros.calories > 0 ? macros.protein / macros.calories : 0;
  const fatPercent = macros.calories > 0 ? (macros.fat * 9) / macros.calories * 100 : 0;
  const carbPercent = macros.calories > 0 ? (macros.carbs * 4) / macros.calories * 100 : 0;
  
  // Validate protein density
  if (proteinDensity < criteria.min_protein_density) {
    violations.push(`Protein density ${(proteinDensity * 100).toFixed(1)}% below minimum ${(criteria.min_protein_density * 100).toFixed(1)}%`);
  }
  
  // Validate fat percentage
  if (fatPercent > criteria.max_fat_percent) {
    violations.push(`Fat percentage ${fatPercent.toFixed(1)}% exceeds maximum ${criteria.max_fat_percent}%`);
  }
  
  // Validate carb percentage
  if (carbPercent < criteria.min_carb_percent) {
    violations.push(`Carb percentage ${carbPercent.toFixed(1)}% below minimum ${criteria.min_carb_percent}%`);
  }
  
  return {
    passes: violations.length === 0,
    protein_density: Math.round(proteinDensity * 1000) / 1000,
    fat_percent: Math.round(fatPercent * 10) / 10,
    carb_percent: Math.round(carbPercent * 10) / 10,
    violations
  };
}

/**
 * Collect summary information
 */
function collectSummary(result: ValidationResult): void {
  const summary = result.validation_summary;
  
  // Collect all violations as critical failures or warnings
  [
    result.deviation_validation,
    result.distribution_validation,
    result.quality_validation,
    result.nutritional_validation
  ].forEach(validation => {
    validation.violations.forEach(violation => {
      if (validation === result.deviation_validation || validation === result.quality_validation) {
        summary.critical_failures.push(violation);
      } else {
        summary.warnings.push(violation);
      }
    });
  });
  
  // Generate recommendations
  if (!result.deviation_validation.passes) {
    summary.recommendations.push('Consider using LP optimization to reduce macro deviations');
    
    if (result.deviation_validation.individual_deviations.carbs_percent > 30) {
      summary.recommendations.push('Add more carbohydrate-rich ingredients or increase portions');
    }
    
    if (result.deviation_validation.individual_deviations.protein_percent > 20) {
      summary.recommendations.push('Adjust protein sources or add protein supplements');
    }
  }
  
  if (!result.distribution_validation.passes) {
    summary.recommendations.push('Rebalance calorie distribution between meals');
  }
  
  if (!result.quality_validation.passes) {
    summary.recommendations.push('Consider swapping low-scoring recipes for better alternatives');
  }
  
  if (!result.nutritional_validation.passes) {
    summary.recommendations.push('Review overall nutritional balance and ingredient choices');
  }
  
  if (result.overall_score < 60) {
    summary.recommendations.push('Consider using fallback recipe generation for better results');
  }
}

/**
 * Quick validation check (simplified version)
 */
export function quickValidationCheck(
  combination: MealCombination,
  maxDeviationPercent: number = 20
): { passes: boolean; totalDeviation: number; mainIssues: string[] } {
  
  const totalDeviation = combination.deviation.total_percent;
  const passes = totalDeviation <= maxDeviationPercent && combination.average_score >= 80;
  
  const mainIssues: string[] = [];
  if (totalDeviation > maxDeviationPercent) {
    mainIssues.push(`High deviation: ${totalDeviation.toFixed(1)}%`);
  }
  if (combination.average_score < 80) {
    mainIssues.push(`Low quality: ${combination.average_score.toFixed(1)} score`);
  }
  
  return {
    passes,
    totalDeviation,
    mainIssues
  };
}
 