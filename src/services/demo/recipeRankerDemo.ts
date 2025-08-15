/**
 * Demo for Recipe Ranker
 * Shows how variety logic works with penalties and rewards
 */

import {
  rankRecipesWithVariety,
  getBalancedRecipeSelection,
  createVarietyReport,
  DEFAULT_RANKING_CRITERIA,
  UserMealHistory,
  UserFavorite,
  RankingCriteria
} from '../recipeRanker';
import { RecipeScore } from '../recipeScorer';

// Sample recipe scores (base scores without variety adjustments)
const sampleScores: RecipeScore[] = [
  {
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    total_score: 85.5,
    cosine_component: 40.2,
    scalability_component: 45.3,
    cosine_similarity: 0.804,
    weighted_scalability: 0.906,
    breakdown: { protein_ratio: 0.6, carbs_ratio: 0.3, fat_ratio: 0.1, calories_ratio: 1.0 }
  },
  {
    recipe_id: 2,
    recipe_name: 'Pasta Bolognese',
    total_score: 78.3,
    cosine_component: 35.8,
    scalability_component: 42.5,
    cosine_similarity: 0.716,
    weighted_scalability: 0.850,
    breakdown: { protein_ratio: 0.2, carbs_ratio: 0.7, fat_ratio: 0.1, calories_ratio: 1.0 }
  },
  {
    recipe_id: 3,
    recipe_name: 'Avocado Toast',
    total_score: 72.1,
    cosine_component: 32.4,
    scalability_component: 39.7,
    cosine_similarity: 0.648,
    weighted_scalability: 0.794,
    breakdown: { protein_ratio: 0.15, carbs_ratio: 0.5, fat_ratio: 0.35, calories_ratio: 1.0 }
  },
  {
    recipe_id: 4,
    recipe_name: 'Chicken Breast',
    total_score: 90.2,
    cosine_component: 45.1,
    scalability_component: 45.1,
    cosine_similarity: 0.902,
    weighted_scalability: 0.902,
    breakdown: { protein_ratio: 0.9, carbs_ratio: 0.05, fat_ratio: 0.05, calories_ratio: 1.0 }
  },
  {
    recipe_id: 5,
    recipe_name: 'Rice Bowl',
    total_score: 65.8,
    cosine_component: 28.3,
    scalability_component: 37.5,
    cosine_similarity: 0.566,
    weighted_scalability: 0.750,
    breakdown: { protein_ratio: 0.1, carbs_ratio: 0.85, fat_ratio: 0.05, calories_ratio: 1.0 }
  },
  {
    recipe_id: 6,
    recipe_name: 'Greek Salad',
    total_score: 55.4,
    cosine_component: 25.2,
    scalability_component: 30.2,
    cosine_similarity: 0.504,
    weighted_scalability: 0.604,
    breakdown: { protein_ratio: 0.2, carbs_ratio: 0.3, fat_ratio: 0.5, calories_ratio: 1.0 }
  }
];

// Sample user history (recent usage)
const currentDate = new Date('2024-01-15');
const sampleHistory: UserMealHistory[] = [
  {
    id: 1,
    user_id: 'user123',
    recipe_id: 1, // Protein Smoothie - used yesterday
    date_used: new Date('2024-01-14'),
    meal_type: 'reggeli',
    created_at: new Date('2024-01-14')
  },
  {
    id: 2,
    user_id: 'user123',
    recipe_id: 1, // Protein Smoothie - used 2 days ago too
    date_used: new Date('2024-01-13'),
    meal_type: 'reggeli',
    created_at: new Date('2024-01-13')
  },
  {
    id: 3,
    user_id: 'user123',
    recipe_id: 2, // Pasta Bolognese - used 2 days ago
    date_used: new Date('2024-01-13'),
    meal_type: 'ebéd',
    created_at: new Date('2024-01-13')
  },
  {
    id: 4,
    user_id: 'user123',
    recipe_id: 4, // Chicken Breast - used 10 days ago (long time)
    date_used: new Date('2024-01-05'),
    meal_type: 'vacsora',
    created_at: new Date('2024-01-05')
  },
  {
    id: 5,
    user_id: 'user123',
    recipe_id: 6, // Greek Salad - used 15 days ago
    date_used: new Date('2023-12-31'),
    meal_type: 'ebéd',
    created_at: new Date('2023-12-31')
  }
];

// Sample user favorites
const sampleFavorites: UserFavorite[] = [
  {
    user_id: 'user123',
    recipe_id: 4, // Chicken Breast is favorite
    created_at: new Date('2024-01-01'),
    is_favorite: true
  },
  {
    user_id: 'user123',
    recipe_id: 6, // Greek Salad is favorite
    created_at: new Date('2024-01-01'),
    is_favorite: true
  }
];

export function runRecipeRankerDemo() {
  console.log('🏆 Recipe Ranker with Variety Logic Demo\n');

  // Show original scores (without variety adjustments)
  console.log('Original Recipe Scores (Base):');
  sampleScores
    .sort((a, b) => b.total_score - a.total_score)
    .forEach((score, index) => {
      console.log(`${index + 1}. ${score.recipe_name}: ${score.total_score.toFixed(1)} points`);
    });

  console.log('\n' + '='.repeat(60));

  // Apply variety adjustments with default criteria
  console.log('\nApplying Variety Adjustments (Default Criteria):');
  console.log('- Short-term penalty: -10 points for recipes used in last 3 days');
  console.log('- Long-term reward: +10 points for favorites not used in 7+ days');
  console.log('- Diversity bonus: +5 points for rarely used recipes\n');

  const rankedRecipes = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    DEFAULT_RANKING_CRITERIA,
    currentDate
  );

  console.log('Adjusted Rankings:');
  rankedRecipes.forEach((recipe, index) => {
    const adjustmentText = [];
    if (recipe.penalty < 0) adjustmentText.push(`${recipe.penalty.toFixed(1)} penalty`);
    if (recipe.reward > 0) adjustmentText.push(`+${recipe.reward.toFixed(1)} reward`);
    const adjustmentStr = adjustmentText.length > 0 ? ` (${adjustmentText.join(', ')})` : '';
    
    console.log(`${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} points${adjustmentStr}`);
    
    // Show additional info
    const statusText = [];
    if (recipe.is_favorite) statusText.push('★ Favorite');
    if (recipe.days_since_last_use !== undefined) {
      statusText.push(`Last used: ${recipe.days_since_last_use} days ago`);
    } else {
      statusText.push('Never used');
    }
    if (recipe.usage_count_last_7_days > 0) {
      statusText.push(`Used ${recipe.usage_count_last_7_days}x in last 7 days`);
    }
    
    console.log(`   ${statusText.join(' • ')}`);
    console.log('');
  });

  console.log('='.repeat(60));

  // Test different criteria scenarios
  console.log('\n=== Testing Different Criteria ===\n');

  // Scenario 1: Strict variety (higher penalties)
  console.log('1. Strict Variety (Higher Penalties):');
  const strictCriteria: RankingCriteria = {
    shortTermPenalty: {
      enabled: true,
      dayThreshold: 5,     // Longer penalty period
      penaltyPoints: -20,  // Bigger penalty
      scalingFactor: 1.5   // More scaling
    },
    longTermReward: {
      enabled: true,
      dayThreshold: 10,    // Need longer gap for reward
      rewardPoints: 15,    // Bigger reward
      favoriteMultiplier: 2.0
    },
    diversityBonus: {
      enabled: true,
      bonusPoints: 10,     // Bigger diversity bonus
      rarityThreshold: 1
    }
  };

  const strictRanked = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    strictCriteria,
    currentDate
  );

  strictRanked.slice(0, 3).forEach((recipe, index) => {
    console.log(`  ${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} (was ${recipe.base_score.toFixed(1)})`);
  });

  // Scenario 2: Favorites focused
  console.log('\n2. Favorites Focused (Lower Penalties, Higher Rewards):');
  const favoritesCriteria: RankingCriteria = {
    shortTermPenalty: {
      enabled: true,
      dayThreshold: 2,     // Very short penalty
      penaltyPoints: -5,   // Small penalty
      scalingFactor: 0.5
    },
    longTermReward: {
      enabled: true,
      dayThreshold: 5,     // Shorter gap needed
      rewardPoints: 25,    // Very big reward
      favoriteMultiplier: 3.0
    },
    diversityBonus: {
      enabled: false,      // No diversity bonus
      bonusPoints: 0,
      rarityThreshold: 0
    }
  };

  const favoritesRanked = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    favoritesCriteria,
    currentDate
  );

  favoritesRanked.slice(0, 3).forEach((recipe, index) => {
    console.log(`  ${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} (was ${recipe.base_score.toFixed(1)})`);
  });

  // Scenario 3: No variety (pure scores)
  console.log('\n3. No Variety Logic (Pure Base Scores):');
  const noVarietyCriteria: RankingCriteria = {
    shortTermPenalty: { enabled: false, dayThreshold: 0, penaltyPoints: 0, scalingFactor: 0 },
    longTermReward: { enabled: false, dayThreshold: 0, rewardPoints: 0, favoriteMultiplier: 0 },
    diversityBonus: { enabled: false, bonusPoints: 0, rarityThreshold: 0 }
  };

  const noVarietyRanked = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    noVarietyCriteria,
    currentDate
  );

  noVarietyRanked.slice(0, 3).forEach((recipe, index) => {
    console.log(`  ${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} (unchanged)`);
  });

  console.log('\n' + '='.repeat(60));

  // Test balanced selection
  console.log('\n=== Balanced Recipe Selection ===');
  console.log('Selecting 4 recipes with max 1 recently used:\n');

  const balancedSelection = getBalancedRecipeSelection(rankedRecipes, 4, 1);
  
  balancedSelection.forEach((recipe, index) => {
    const recentText = recipe.days_since_last_use !== undefined && recipe.days_since_last_use <= 3 
      ? ' (Recently used)' : '';
    console.log(`${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} points${recentText}`);
  });

  console.log('\n' + '='.repeat(60));

  // Generate variety report
  console.log('\n=== Variety Analysis Report ===\n');
  
  const report = createVarietyReport(rankedRecipes, DEFAULT_RANKING_CRITERIA);
  
  console.log('Summary:');
  console.log(`  Total recipes analyzed: ${report.summary.totalRecipes}`);
  console.log(`  Recipes penalized: ${report.summary.penalizedRecipes}`);
  console.log(`  Recipes rewarded: ${report.summary.rewardedRecipes}`);
  console.log(`  Average adjustment: ${report.summary.averageAdjustment.toFixed(1)} points`);
  
  if (report.topPenalized.length > 0) {
    console.log('\nMost Penalized:');
    report.topPenalized.forEach(recipe => {
      console.log(`  - ${recipe.recipe_name}: ${recipe.penalty.toFixed(1)} points (used ${recipe.days_since_last_use} days ago)`);
    });
  }
  
  if (report.topRewarded.length > 0) {
    console.log('\nMost Rewarded:');
    report.topRewarded.forEach(recipe => {
      console.log(`  - ${recipe.recipe_name}: +${recipe.reward.toFixed(1)} points${recipe.is_favorite ? ' (favorite)' : ''}`);
    });
  }

  console.log('\n✅ Recipe Ranker Demo Complete!');
}

// Uncomment to run demo in development
// runRecipeRankerDemo();
 * Demo for Recipe Ranker
 * Shows how variety logic works with penalties and rewards
 */

import {
  rankRecipesWithVariety,
  getBalancedRecipeSelection,
  createVarietyReport,
  DEFAULT_RANKING_CRITERIA,
  UserMealHistory,
  UserFavorite,
  RankingCriteria
} from '../recipeRanker';
import { RecipeScore } from '../recipeScorer';

// Sample recipe scores (base scores without variety adjustments)
const sampleScores: RecipeScore[] = [
  {
    recipe_id: 1,
    recipe_name: 'Protein Smoothie',
    total_score: 85.5,
    cosine_component: 40.2,
    scalability_component: 45.3,
    cosine_similarity: 0.804,
    weighted_scalability: 0.906,
    breakdown: { protein_ratio: 0.6, carbs_ratio: 0.3, fat_ratio: 0.1, calories_ratio: 1.0 }
  },
  {
    recipe_id: 2,
    recipe_name: 'Pasta Bolognese',
    total_score: 78.3,
    cosine_component: 35.8,
    scalability_component: 42.5,
    cosine_similarity: 0.716,
    weighted_scalability: 0.850,
    breakdown: { protein_ratio: 0.2, carbs_ratio: 0.7, fat_ratio: 0.1, calories_ratio: 1.0 }
  },
  {
    recipe_id: 3,
    recipe_name: 'Avocado Toast',
    total_score: 72.1,
    cosine_component: 32.4,
    scalability_component: 39.7,
    cosine_similarity: 0.648,
    weighted_scalability: 0.794,
    breakdown: { protein_ratio: 0.15, carbs_ratio: 0.5, fat_ratio: 0.35, calories_ratio: 1.0 }
  },
  {
    recipe_id: 4,
    recipe_name: 'Chicken Breast',
    total_score: 90.2,
    cosine_component: 45.1,
    scalability_component: 45.1,
    cosine_similarity: 0.902,
    weighted_scalability: 0.902,
    breakdown: { protein_ratio: 0.9, carbs_ratio: 0.05, fat_ratio: 0.05, calories_ratio: 1.0 }
  },
  {
    recipe_id: 5,
    recipe_name: 'Rice Bowl',
    total_score: 65.8,
    cosine_component: 28.3,
    scalability_component: 37.5,
    cosine_similarity: 0.566,
    weighted_scalability: 0.750,
    breakdown: { protein_ratio: 0.1, carbs_ratio: 0.85, fat_ratio: 0.05, calories_ratio: 1.0 }
  },
  {
    recipe_id: 6,
    recipe_name: 'Greek Salad',
    total_score: 55.4,
    cosine_component: 25.2,
    scalability_component: 30.2,
    cosine_similarity: 0.504,
    weighted_scalability: 0.604,
    breakdown: { protein_ratio: 0.2, carbs_ratio: 0.3, fat_ratio: 0.5, calories_ratio: 1.0 }
  }
];

// Sample user history (recent usage)
const currentDate = new Date('2024-01-15');
const sampleHistory: UserMealHistory[] = [
  {
    id: 1,
    user_id: 'user123',
    recipe_id: 1, // Protein Smoothie - used yesterday
    date_used: new Date('2024-01-14'),
    meal_type: 'reggeli',
    created_at: new Date('2024-01-14')
  },
  {
    id: 2,
    user_id: 'user123',
    recipe_id: 1, // Protein Smoothie - used 2 days ago too
    date_used: new Date('2024-01-13'),
    meal_type: 'reggeli',
    created_at: new Date('2024-01-13')
  },
  {
    id: 3,
    user_id: 'user123',
    recipe_id: 2, // Pasta Bolognese - used 2 days ago
    date_used: new Date('2024-01-13'),
    meal_type: 'ebéd',
    created_at: new Date('2024-01-13')
  },
  {
    id: 4,
    user_id: 'user123',
    recipe_id: 4, // Chicken Breast - used 10 days ago (long time)
    date_used: new Date('2024-01-05'),
    meal_type: 'vacsora',
    created_at: new Date('2024-01-05')
  },
  {
    id: 5,
    user_id: 'user123',
    recipe_id: 6, // Greek Salad - used 15 days ago
    date_used: new Date('2023-12-31'),
    meal_type: 'ebéd',
    created_at: new Date('2023-12-31')
  }
];

// Sample user favorites
const sampleFavorites: UserFavorite[] = [
  {
    user_id: 'user123',
    recipe_id: 4, // Chicken Breast is favorite
    created_at: new Date('2024-01-01'),
    is_favorite: true
  },
  {
    user_id: 'user123',
    recipe_id: 6, // Greek Salad is favorite
    created_at: new Date('2024-01-01'),
    is_favorite: true
  }
];

export function runRecipeRankerDemo() {
  console.log('🏆 Recipe Ranker with Variety Logic Demo\n');

  // Show original scores (without variety adjustments)
  console.log('Original Recipe Scores (Base):');
  sampleScores
    .sort((a, b) => b.total_score - a.total_score)
    .forEach((score, index) => {
      console.log(`${index + 1}. ${score.recipe_name}: ${score.total_score.toFixed(1)} points`);
    });

  console.log('\n' + '='.repeat(60));

  // Apply variety adjustments with default criteria
  console.log('\nApplying Variety Adjustments (Default Criteria):');
  console.log('- Short-term penalty: -10 points for recipes used in last 3 days');
  console.log('- Long-term reward: +10 points for favorites not used in 7+ days');
  console.log('- Diversity bonus: +5 points for rarely used recipes\n');

  const rankedRecipes = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    DEFAULT_RANKING_CRITERIA,
    currentDate
  );

  console.log('Adjusted Rankings:');
  rankedRecipes.forEach((recipe, index) => {
    const adjustmentText = [];
    if (recipe.penalty < 0) adjustmentText.push(`${recipe.penalty.toFixed(1)} penalty`);
    if (recipe.reward > 0) adjustmentText.push(`+${recipe.reward.toFixed(1)} reward`);
    const adjustmentStr = adjustmentText.length > 0 ? ` (${adjustmentText.join(', ')})` : '';
    
    console.log(`${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} points${adjustmentStr}`);
    
    // Show additional info
    const statusText = [];
    if (recipe.is_favorite) statusText.push('★ Favorite');
    if (recipe.days_since_last_use !== undefined) {
      statusText.push(`Last used: ${recipe.days_since_last_use} days ago`);
    } else {
      statusText.push('Never used');
    }
    if (recipe.usage_count_last_7_days > 0) {
      statusText.push(`Used ${recipe.usage_count_last_7_days}x in last 7 days`);
    }
    
    console.log(`   ${statusText.join(' • ')}`);
    console.log('');
  });

  console.log('='.repeat(60));

  // Test different criteria scenarios
  console.log('\n=== Testing Different Criteria ===\n');

  // Scenario 1: Strict variety (higher penalties)
  console.log('1. Strict Variety (Higher Penalties):');
  const strictCriteria: RankingCriteria = {
    shortTermPenalty: {
      enabled: true,
      dayThreshold: 5,     // Longer penalty period
      penaltyPoints: -20,  // Bigger penalty
      scalingFactor: 1.5   // More scaling
    },
    longTermReward: {
      enabled: true,
      dayThreshold: 10,    // Need longer gap for reward
      rewardPoints: 15,    // Bigger reward
      favoriteMultiplier: 2.0
    },
    diversityBonus: {
      enabled: true,
      bonusPoints: 10,     // Bigger diversity bonus
      rarityThreshold: 1
    }
  };

  const strictRanked = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    strictCriteria,
    currentDate
  );

  strictRanked.slice(0, 3).forEach((recipe, index) => {
    console.log(`  ${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} (was ${recipe.base_score.toFixed(1)})`);
  });

  // Scenario 2: Favorites focused
  console.log('\n2. Favorites Focused (Lower Penalties, Higher Rewards):');
  const favoritesCriteria: RankingCriteria = {
    shortTermPenalty: {
      enabled: true,
      dayThreshold: 2,     // Very short penalty
      penaltyPoints: -5,   // Small penalty
      scalingFactor: 0.5
    },
    longTermReward: {
      enabled: true,
      dayThreshold: 5,     // Shorter gap needed
      rewardPoints: 25,    // Very big reward
      favoriteMultiplier: 3.0
    },
    diversityBonus: {
      enabled: false,      // No diversity bonus
      bonusPoints: 0,
      rarityThreshold: 0
    }
  };

  const favoritesRanked = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    favoritesCriteria,
    currentDate
  );

  favoritesRanked.slice(0, 3).forEach((recipe, index) => {
    console.log(`  ${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} (was ${recipe.base_score.toFixed(1)})`);
  });

  // Scenario 3: No variety (pure scores)
  console.log('\n3. No Variety Logic (Pure Base Scores):');
  const noVarietyCriteria: RankingCriteria = {
    shortTermPenalty: { enabled: false, dayThreshold: 0, penaltyPoints: 0, scalingFactor: 0 },
    longTermReward: { enabled: false, dayThreshold: 0, rewardPoints: 0, favoriteMultiplier: 0 },
    diversityBonus: { enabled: false, bonusPoints: 0, rarityThreshold: 0 }
  };

  const noVarietyRanked = rankRecipesWithVariety(
    sampleScores,
    sampleHistory,
    sampleFavorites,
    noVarietyCriteria,
    currentDate
  );

  noVarietyRanked.slice(0, 3).forEach((recipe, index) => {
    console.log(`  ${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} (unchanged)`);
  });

  console.log('\n' + '='.repeat(60));

  // Test balanced selection
  console.log('\n=== Balanced Recipe Selection ===');
  console.log('Selecting 4 recipes with max 1 recently used:\n');

  const balancedSelection = getBalancedRecipeSelection(rankedRecipes, 4, 1);
  
  balancedSelection.forEach((recipe, index) => {
    const recentText = recipe.days_since_last_use !== undefined && recipe.days_since_last_use <= 3 
      ? ' (Recently used)' : '';
    console.log(`${index + 1}. ${recipe.recipe_name}: ${recipe.final_score.toFixed(1)} points${recentText}`);
  });

  console.log('\n' + '='.repeat(60));

  // Generate variety report
  console.log('\n=== Variety Analysis Report ===\n');
  
  const report = createVarietyReport(rankedRecipes, DEFAULT_RANKING_CRITERIA);
  
  console.log('Summary:');
  console.log(`  Total recipes analyzed: ${report.summary.totalRecipes}`);
  console.log(`  Recipes penalized: ${report.summary.penalizedRecipes}`);
  console.log(`  Recipes rewarded: ${report.summary.rewardedRecipes}`);
  console.log(`  Average adjustment: ${report.summary.averageAdjustment.toFixed(1)} points`);
  
  if (report.topPenalized.length > 0) {
    console.log('\nMost Penalized:');
    report.topPenalized.forEach(recipe => {
      console.log(`  - ${recipe.recipe_name}: ${recipe.penalty.toFixed(1)} points (used ${recipe.days_since_last_use} days ago)`);
    });
  }
  
  if (report.topRewarded.length > 0) {
    console.log('\nMost Rewarded:');
    report.topRewarded.forEach(recipe => {
      console.log(`  - ${recipe.recipe_name}: +${recipe.reward.toFixed(1)} points${recipe.is_favorite ? ' (favorite)' : ''}`);
    });
  }

  console.log('\n✅ Recipe Ranker Demo Complete!');
}

// Uncomment to run demo in development
// runRecipeRankerDemo();
 