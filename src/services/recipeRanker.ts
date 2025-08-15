/**
 * Recipe Ranker Service
 * Implements ranking with variety logic (short-term penalty, long-term rewards)
 */

import { RecipeScore } from './recipeScorer';

export interface UserMealHistory {
  id: number;
  user_id: string;
  recipe_id: number;
  date_used: Date;
  meal_type: string;
  created_at: Date;
}

export interface UserFavorite {
  user_id: string;
  recipe_id: number;
  created_at: Date;
  is_favorite: boolean;
}

export interface VarietyAdjustment {
  recipe_id: number;
  recipe_name: string;
  base_score: number;
  penalty: number;          // Negative adjustment for recent use
  reward: number;           // Positive adjustment for favorites
  final_score: number;      // base_score + penalty + reward
  days_since_last_use?: number;
  is_favorite: boolean;
  usage_count_last_7_days: number;
  usage_count_last_30_days: number;
}

export interface RankingCriteria {
  shortTermPenalty: {
    enabled: boolean;
    dayThreshold: number;    // Days to apply penalty (default: 3)
    penaltyPoints: number;   // Points to subtract (default: -10)
    scalingFactor: number;   // How penalty scales with recency (default: 1.0)
  };
  longTermReward: {
    enabled: boolean;
    dayThreshold: number;    // Days since last use for reward (default: 7)
    rewardPoints: number;    // Points to add for favorites (default: +10)
    favoriteMultiplier: number; // Extra boost for favorites (default: 1.5)
  };
  diversityBonus: {
    enabled: boolean;
    bonusPoints: number;     // Points for trying new recipes (default: +5)
    rarityThreshold: number; // Usage count threshold for "rare" recipes (default: 2)
  };
}

export const DEFAULT_RANKING_CRITERIA: RankingCriteria = {
  shortTermPenalty: {
    enabled: true,
    dayThreshold: 3,
    penaltyPoints: -10,
    scalingFactor: 1.0
  },
  longTermReward: {
    enabled: true,
    dayThreshold: 7,
    rewardPoints: 10,
    favoriteMultiplier: 1.5
  },
  diversityBonus: {
    enabled: true,
    bonusPoints: 5,
    rarityThreshold: 2
  }
};

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get recipe usage statistics from history
 */
export function getRecipeUsageStats(
  recipeId: number,
  history: UserMealHistory[],
  currentDate: Date = new Date()
): {
  lastUsed?: Date;
  daysSinceLastUse?: number;
  usageLast7Days: number;
  usageLast30Days: number;
  totalUsage: number;
} {
  const recipeHistory = history.filter(h => h.recipe_id === recipeId);
  
  if (recipeHistory.length === 0) {
    return {
      usageLast7Days: 0,
      usageLast30Days: 0,
      totalUsage: 0
    };
  }

  // Sort by date (most recent first)
  recipeHistory.sort((a, b) => b.date_used.getTime() - a.date_used.getTime());
  
  const lastUsed = recipeHistory[0].date_used;
  const daysSinceLastUse = daysBetween(lastUsed, currentDate);
  
  // Count usage in different time periods
  const usageLast7Days = recipeHistory.filter(h => 
    daysBetween(h.date_used, currentDate) <= 7
  ).length;
  
  const usageLast30Days = recipeHistory.filter(h => 
    daysBetween(h.date_used, currentDate) <= 30
  ).length;

  return {
    lastUsed,
    daysSinceLastUse,
    usageLast7Days,
    usageLast30Days,
    totalUsage: recipeHistory.length
  };
}

/**
 * Check if recipe is user's favorite
 */
export function isRecipeFavorite(
  recipeId: number,
  favorites: UserFavorite[]
): boolean {
  const favorite = favorites.find(f => f.recipe_id === recipeId);
  return favorite ? favorite.is_favorite : false;
}

/**
 * Calculate short-term penalty for recent usage
 */
export function calculateShortTermPenalty(
  stats: ReturnType<typeof getRecipeUsageStats>,
  criteria: RankingCriteria['shortTermPenalty']
): number {
  if (!criteria.enabled || !stats.daysSinceLastUse) {
    return 0;
  }

  // No penalty if not used recently
  if (stats.daysSinceLastUse > criteria.dayThreshold) {
    return 0;
  }

  // Scale penalty based on how recent the usage was
  const recencyFactor = 1 - (stats.daysSinceLastUse / criteria.dayThreshold);
  const scaledPenalty = criteria.penaltyPoints * recencyFactor * criteria.scalingFactor;
  
  // Additional penalty for multiple uses in the period
  const usagePenalty = Math.max(0, stats.usageLast7Days - 1) * (criteria.penaltyPoints * 0.5);
  
  return scaledPenalty - usagePenalty;
}

/**
 * Calculate long-term reward for favorites
 */
export function calculateLongTermReward(
  stats: ReturnType<typeof getRecipeUsageStats>,
  isFavorite: boolean,
  criteria: RankingCriteria['longTermReward']
): number {
  if (!criteria.enabled || !isFavorite) {
    return 0;
  }

  // No reward if used too recently
  if (stats.daysSinceLastUse && stats.daysSinceLastUse < criteria.dayThreshold) {
    return 0;
  }

  // Base reward for favorites not used recently
  let reward = criteria.rewardPoints;
  
  // Extra reward based on how long it's been
  if (stats.daysSinceLastUse) {
    const longTermFactor = Math.min(2.0, stats.daysSinceLastUse / criteria.dayThreshold);
    reward *= longTermFactor * criteria.favoriteMultiplier;
  }

  return reward;
}

/**
 * Calculate diversity bonus for rarely used recipes
 */
export function calculateDiversityBonus(
  stats: ReturnType<typeof getRecipeUsageStats>,
  criteria: RankingCriteria['diversityBonus']
): number {
  if (!criteria.enabled) {
    return 0;
  }

  // Bonus for recipes used rarely or never
  if (stats.totalUsage <= criteria.rarityThreshold) {
    // Extra bonus for completely new recipes
    const noveltyMultiplier = stats.totalUsage === 0 ? 2.0 : 1.0;
    return criteria.bonusPoints * noveltyMultiplier;
  }

  return 0;
}

/**
 * Apply variety adjustments to recipe scores
 */
export function applyVarietyAdjustments(
  scores: RecipeScore[],
  history: UserMealHistory[],
  favorites: UserFavorite[],
  criteria: RankingCriteria = DEFAULT_RANKING_CRITERIA,
  currentDate: Date = new Date()
): VarietyAdjustment[] {
  return scores.map(score => {
    const stats = getRecipeUsageStats(score.recipe_id, history, currentDate);
    const isFavorite = isRecipeFavorite(score.recipe_id, favorites);
    
    // Calculate adjustments
    const penalty = calculateShortTermPenalty(stats, criteria.shortTermPenalty);
    const reward = calculateLongTermReward(stats, isFavorite, criteria.longTermReward);
    const diversityBonus = calculateDiversityBonus(stats, criteria.diversityBonus);
    
    const totalAdjustment = penalty + reward + diversityBonus;
    const finalScore = Math.max(0, score.total_score + totalAdjustment);
    
    return {
      recipe_id: score.recipe_id,
      recipe_name: score.recipe_name,
      base_score: score.total_score,
      penalty: penalty,
      reward: reward + diversityBonus,
      final_score: Math.round(finalScore * 100) / 100,
      days_since_last_use: stats.daysSinceLastUse,
      is_favorite: isFavorite,
      usage_count_last_7_days: stats.usageLast7Days,
      usage_count_last_30_days: stats.usageLast30Days
    };
  });
}

/**
 * Rank recipes with variety adjustments
 */
export function rankRecipesWithVariety(
  scores: RecipeScore[],
  history: UserMealHistory[],
  favorites: UserFavorite[],
  criteria: RankingCriteria = DEFAULT_RANKING_CRITERIA,
  currentDate: Date = new Date()
): VarietyAdjustment[] {
  const adjustments = applyVarietyAdjustments(scores, history, favorites, criteria, currentDate);
  
  // Sort by final score (descending)
  return adjustments.sort((a, b) => b.final_score - a.final_score);
}

/**
 * Get balanced recipe selection ensuring variety
 */
export function getBalancedRecipeSelection(
  rankedRecipes: VarietyAdjustment[],
  count: number,
  maxRecentlyUsed: number = 1 // Max recipes used in last 3 days
): VarietyAdjustment[] {
  const selected: VarietyAdjustment[] = [];
  const recentlyUsedCount = new Map<number, number>();
  
  for (const recipe of rankedRecipes) {
    if (selected.length >= count) break;
    
    // Check if recipe was used recently
    const isRecentlyUsed = recipe.days_since_last_use !== undefined && 
                          recipe.days_since_last_use <= 3;
    
    if (isRecentlyUsed) {
      const currentCount = recentlyUsedCount.get(recipe.recipe_id) || 0;
      if (currentCount >= maxRecentlyUsed) {
        continue; // Skip this recipe
      }
      recentlyUsedCount.set(recipe.recipe_id, currentCount + 1);
    }
    
    selected.push(recipe);
  }
  
  return selected;
}

/**
 * Create variety report for debugging/analysis
 */
export function createVarietyReport(
  adjustments: VarietyAdjustment[],
  criteria: RankingCriteria
): {
  summary: {
    totalRecipes: number;
    penalizedRecipes: number;
    rewardedRecipes: number;
    averageAdjustment: number;
  };
  topPenalized: VarietyAdjustment[];
  topRewarded: VarietyAdjustment[];
  criteria: RankingCriteria;
} {
  const penalizedRecipes = adjustments.filter(adj => adj.penalty < 0);
  const rewardedRecipes = adjustments.filter(adj => adj.reward > 0);
  const totalAdjustment = adjustments.reduce((sum, adj) => sum + (adj.penalty + adj.reward), 0);
  
  return {
    summary: {
      totalRecipes: adjustments.length,
      penalizedRecipes: penalizedRecipes.length,
      rewardedRecipes: rewardedRecipes.length,
      averageAdjustment: adjustments.length > 0 ? totalAdjustment / adjustments.length : 0
    },
    topPenalized: penalizedRecipes
      .sort((a, b) => a.penalty - b.penalty)
      .slice(0, 5),
    topRewarded: rewardedRecipes
      .sort((a, b) => b.reward - a.reward)
      .slice(0, 5),
    criteria
  };
}
 * Recipe Ranker Service
 * Implements ranking with variety logic (short-term penalty, long-term rewards)
 */

import { RecipeScore } from './recipeScorer';

export interface UserMealHistory {
  id: number;
  user_id: string;
  recipe_id: number;
  date_used: Date;
  meal_type: string;
  created_at: Date;
}

export interface UserFavorite {
  user_id: string;
  recipe_id: number;
  created_at: Date;
  is_favorite: boolean;
}

export interface VarietyAdjustment {
  recipe_id: number;
  recipe_name: string;
  base_score: number;
  penalty: number;          // Negative adjustment for recent use
  reward: number;           // Positive adjustment for favorites
  final_score: number;      // base_score + penalty + reward
  days_since_last_use?: number;
  is_favorite: boolean;
  usage_count_last_7_days: number;
  usage_count_last_30_days: number;
}

export interface RankingCriteria {
  shortTermPenalty: {
    enabled: boolean;
    dayThreshold: number;    // Days to apply penalty (default: 3)
    penaltyPoints: number;   // Points to subtract (default: -10)
    scalingFactor: number;   // How penalty scales with recency (default: 1.0)
  };
  longTermReward: {
    enabled: boolean;
    dayThreshold: number;    // Days since last use for reward (default: 7)
    rewardPoints: number;    // Points to add for favorites (default: +10)
    favoriteMultiplier: number; // Extra boost for favorites (default: 1.5)
  };
  diversityBonus: {
    enabled: boolean;
    bonusPoints: number;     // Points for trying new recipes (default: +5)
    rarityThreshold: number; // Usage count threshold for "rare" recipes (default: 2)
  };
}

export const DEFAULT_RANKING_CRITERIA: RankingCriteria = {
  shortTermPenalty: {
    enabled: true,
    dayThreshold: 3,
    penaltyPoints: -10,
    scalingFactor: 1.0
  },
  longTermReward: {
    enabled: true,
    dayThreshold: 7,
    rewardPoints: 10,
    favoriteMultiplier: 1.5
  },
  diversityBonus: {
    enabled: true,
    bonusPoints: 5,
    rarityThreshold: 2
  }
};

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get recipe usage statistics from history
 */
export function getRecipeUsageStats(
  recipeId: number,
  history: UserMealHistory[],
  currentDate: Date = new Date()
): {
  lastUsed?: Date;
  daysSinceLastUse?: number;
  usageLast7Days: number;
  usageLast30Days: number;
  totalUsage: number;
} {
  const recipeHistory = history.filter(h => h.recipe_id === recipeId);
  
  if (recipeHistory.length === 0) {
    return {
      usageLast7Days: 0,
      usageLast30Days: 0,
      totalUsage: 0
    };
  }

  // Sort by date (most recent first)
  recipeHistory.sort((a, b) => b.date_used.getTime() - a.date_used.getTime());
  
  const lastUsed = recipeHistory[0].date_used;
  const daysSinceLastUse = daysBetween(lastUsed, currentDate);
  
  // Count usage in different time periods
  const usageLast7Days = recipeHistory.filter(h => 
    daysBetween(h.date_used, currentDate) <= 7
  ).length;
  
  const usageLast30Days = recipeHistory.filter(h => 
    daysBetween(h.date_used, currentDate) <= 30
  ).length;

  return {
    lastUsed,
    daysSinceLastUse,
    usageLast7Days,
    usageLast30Days,
    totalUsage: recipeHistory.length
  };
}

/**
 * Check if recipe is user's favorite
 */
export function isRecipeFavorite(
  recipeId: number,
  favorites: UserFavorite[]
): boolean {
  const favorite = favorites.find(f => f.recipe_id === recipeId);
  return favorite ? favorite.is_favorite : false;
}

/**
 * Calculate short-term penalty for recent usage
 */
export function calculateShortTermPenalty(
  stats: ReturnType<typeof getRecipeUsageStats>,
  criteria: RankingCriteria['shortTermPenalty']
): number {
  if (!criteria.enabled || !stats.daysSinceLastUse) {
    return 0;
  }

  // No penalty if not used recently
  if (stats.daysSinceLastUse > criteria.dayThreshold) {
    return 0;
  }

  // Scale penalty based on how recent the usage was
  const recencyFactor = 1 - (stats.daysSinceLastUse / criteria.dayThreshold);
  const scaledPenalty = criteria.penaltyPoints * recencyFactor * criteria.scalingFactor;
  
  // Additional penalty for multiple uses in the period
  const usagePenalty = Math.max(0, stats.usageLast7Days - 1) * (criteria.penaltyPoints * 0.5);
  
  return scaledPenalty - usagePenalty;
}

/**
 * Calculate long-term reward for favorites
 */
export function calculateLongTermReward(
  stats: ReturnType<typeof getRecipeUsageStats>,
  isFavorite: boolean,
  criteria: RankingCriteria['longTermReward']
): number {
  if (!criteria.enabled || !isFavorite) {
    return 0;
  }

  // No reward if used too recently
  if (stats.daysSinceLastUse && stats.daysSinceLastUse < criteria.dayThreshold) {
    return 0;
  }

  // Base reward for favorites not used recently
  let reward = criteria.rewardPoints;
  
  // Extra reward based on how long it's been
  if (stats.daysSinceLastUse) {
    const longTermFactor = Math.min(2.0, stats.daysSinceLastUse / criteria.dayThreshold);
    reward *= longTermFactor * criteria.favoriteMultiplier;
  }

  return reward;
}

/**
 * Calculate diversity bonus for rarely used recipes
 */
export function calculateDiversityBonus(
  stats: ReturnType<typeof getRecipeUsageStats>,
  criteria: RankingCriteria['diversityBonus']
): number {
  if (!criteria.enabled) {
    return 0;
  }

  // Bonus for recipes used rarely or never
  if (stats.totalUsage <= criteria.rarityThreshold) {
    // Extra bonus for completely new recipes
    const noveltyMultiplier = stats.totalUsage === 0 ? 2.0 : 1.0;
    return criteria.bonusPoints * noveltyMultiplier;
  }

  return 0;
}

/**
 * Apply variety adjustments to recipe scores
 */
export function applyVarietyAdjustments(
  scores: RecipeScore[],
  history: UserMealHistory[],
  favorites: UserFavorite[],
  criteria: RankingCriteria = DEFAULT_RANKING_CRITERIA,
  currentDate: Date = new Date()
): VarietyAdjustment[] {
  return scores.map(score => {
    const stats = getRecipeUsageStats(score.recipe_id, history, currentDate);
    const isFavorite = isRecipeFavorite(score.recipe_id, favorites);
    
    // Calculate adjustments
    const penalty = calculateShortTermPenalty(stats, criteria.shortTermPenalty);
    const reward = calculateLongTermReward(stats, isFavorite, criteria.longTermReward);
    const diversityBonus = calculateDiversityBonus(stats, criteria.diversityBonus);
    
    const totalAdjustment = penalty + reward + diversityBonus;
    const finalScore = Math.max(0, score.total_score + totalAdjustment);
    
    return {
      recipe_id: score.recipe_id,
      recipe_name: score.recipe_name,
      base_score: score.total_score,
      penalty: penalty,
      reward: reward + diversityBonus,
      final_score: Math.round(finalScore * 100) / 100,
      days_since_last_use: stats.daysSinceLastUse,
      is_favorite: isFavorite,
      usage_count_last_7_days: stats.usageLast7Days,
      usage_count_last_30_days: stats.usageLast30Days
    };
  });
}

/**
 * Rank recipes with variety adjustments
 */
export function rankRecipesWithVariety(
  scores: RecipeScore[],
  history: UserMealHistory[],
  favorites: UserFavorite[],
  criteria: RankingCriteria = DEFAULT_RANKING_CRITERIA,
  currentDate: Date = new Date()
): VarietyAdjustment[] {
  const adjustments = applyVarietyAdjustments(scores, history, favorites, criteria, currentDate);
  
  // Sort by final score (descending)
  return adjustments.sort((a, b) => b.final_score - a.final_score);
}

/**
 * Get balanced recipe selection ensuring variety
 */
export function getBalancedRecipeSelection(
  rankedRecipes: VarietyAdjustment[],
  count: number,
  maxRecentlyUsed: number = 1 // Max recipes used in last 3 days
): VarietyAdjustment[] {
  const selected: VarietyAdjustment[] = [];
  const recentlyUsedCount = new Map<number, number>();
  
  for (const recipe of rankedRecipes) {
    if (selected.length >= count) break;
    
    // Check if recipe was used recently
    const isRecentlyUsed = recipe.days_since_last_use !== undefined && 
                          recipe.days_since_last_use <= 3;
    
    if (isRecentlyUsed) {
      const currentCount = recentlyUsedCount.get(recipe.recipe_id) || 0;
      if (currentCount >= maxRecentlyUsed) {
        continue; // Skip this recipe
      }
      recentlyUsedCount.set(recipe.recipe_id, currentCount + 1);
    }
    
    selected.push(recipe);
  }
  
  return selected;
}

/**
 * Create variety report for debugging/analysis
 */
export function createVarietyReport(
  adjustments: VarietyAdjustment[],
  criteria: RankingCriteria
): {
  summary: {
    totalRecipes: number;
    penalizedRecipes: number;
    rewardedRecipes: number;
    averageAdjustment: number;
  };
  topPenalized: VarietyAdjustment[];
  topRewarded: VarietyAdjustment[];
  criteria: RankingCriteria;
} {
  const penalizedRecipes = adjustments.filter(adj => adj.penalty < 0);
  const rewardedRecipes = adjustments.filter(adj => adj.reward > 0);
  const totalAdjustment = adjustments.reduce((sum, adj) => sum + (adj.penalty + adj.reward), 0);
  
  return {
    summary: {
      totalRecipes: adjustments.length,
      penalizedRecipes: penalizedRecipes.length,
      rewardedRecipes: rewardedRecipes.length,
      averageAdjustment: adjustments.length > 0 ? totalAdjustment / adjustments.length : 0
    },
    topPenalized: penalizedRecipes
      .sort((a, b) => a.penalty - b.penalty)
      .slice(0, 5),
    topRewarded: rewardedRecipes
      .sort((a, b) => b.reward - a.reward)
      .slice(0, 5),
    criteria
  };
}
 