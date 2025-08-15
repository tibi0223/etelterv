/**
 * New Meal Plan Database Queries
 * Real database integration for the master meal plan algorithm
 */

import { supabase } from './client';
import { RecipeWithHistory } from '../recipeRanker';
import { RecipeScalability } from '../recipeScorer';

export interface DatabaseRecipe {
  recipe_id: number;
  recipe_name: string;
  category: string;
  base_protein: number;
  base_carbs: number;
  base_fat: number;
  base_calories: number;
}

export interface UserMealHistory {
  recipe_id: number;
  date_used: string;
  meal_type: string;
  days_ago: number;
}

/**
 * Fetch recipes with their base macros from database
 */
export async function fetchRecipesWithMacros(): Promise<DatabaseRecipe[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_recipes_with_macros'); // Custom SQL function

    if (error) {
      console.error('Error fetching recipes with macros:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Database error in fetchRecipesWithMacros:', error);
    throw error;
  }
}

/**
 * Fetch user meal history for variety logic
 */
export async function fetchUserMealHistory(userId: string, days: number = 30): Promise<UserMealHistory[]> {
  try {
    const { data, error } = await supabase
      .from('user_meal_history')
      .select(`
        recipe_id,
        date_used,
        meal_type
      `)
      .eq('user_id', userId)
      .gte('date_used', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date_used', { ascending: false });

    if (error) {
      console.error('Error fetching user meal history:', error);
      throw error;
    }

    // Calculate days ago for each record
    const historyWithDays = (data || []).map(record => ({
      ...record,
      days_ago: Math.floor((Date.now() - new Date(record.date_used).getTime()) / (24 * 60 * 60 * 1000))
    }));

    return historyWithDays;
  } catch (error) {
    console.error('Database error in fetchUserMealHistory:', error);
    throw error;
  }
}

/**
 * Fetch recipe scalability data
 */
export async function fetchRecipeScalability(): Promise<RecipeScalability[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_scalability')
      .select('*');

    if (error) {
      console.error('Error fetching recipe scalability:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Database error in fetchRecipeScalability:', error);
    throw error;
  }
}

/**
 * Fetch user favorites
 */
export async function fetchUserFavorites(userId: string): Promise<number[]> {
  try {
    // Assuming there's a user_favorites table or similar
    const { data, error } = await supabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user favorites:', error);
      // Don't throw, just return empty array as fallback
      return [];
    }

    return (data || []).map(fav => fav.recipe_id);
  } catch (error) {
    console.error('Database error in fetchUserFavorites:', error);
    return [];
  }
}

/**
 * Save generated meal plan to history
 */
export async function saveMealPlanToHistory(
  userId: string,
  mealPlan: { recipe_id: number; meal_type: string }[]
): Promise<void> {
  try {
    const historyRecords = mealPlan.map(meal => ({
      user_id: userId,
      recipe_id: meal.recipe_id,
      date_used: new Date().toISOString().split('T')[0],
      meal_type: meal.meal_type,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('user_meal_history')
      .insert(historyRecords);

    if (error) {
      console.error('Error saving meal plan to history:', error);
      throw error;
    }

    console.log(`✅ Saved ${historyRecords.length} meal plan records to history`);
  } catch (error) {
    console.error('Database error in saveMealPlanToHistory:', error);
    throw error;
  }
}

/**
 * Fetch ingredient constraints for LP optimization
 */
export async function fetchIngredientConstraints(recipeIds: number[]): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_ingredient_constraints_for_recipes', {
        p_recipe_ids: recipeIds
      });

    if (error) {
      console.error('Error fetching ingredient constraints:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Database error in fetchIngredientConstraints:', error);
    // Return empty array as fallback - LP optimization will be skipped
    return [];
  }
}

/**
 * Transform database recipes to RecipeWithHistory format
 */
export function transformToRecipeWithHistory(
  recipes: DatabaseRecipe[],
  history: UserMealHistory[],
  favorites: number[]
): RecipeWithHistory[] {
  
  return recipes.map(recipe => {
    // Calculate usage statistics
    const recipeHistory = history.filter(h => h.recipe_id === recipe.recipe_id);
    const last7Days = recipeHistory.filter(h => h.days_ago <= 7);
    const last30Days = recipeHistory.filter(h => h.days_ago <= 30);
    const mostRecent = recipeHistory.length > 0 ? Math.min(...recipeHistory.map(h => h.days_ago)) : 999;

    return {
      recipe_id: recipe.recipe_id,
      recipe_name: recipe.recipe_name,
      category: recipe.category,
      base_macros: {
        protein: recipe.base_protein,
        carbs: recipe.base_carbs,
        fat: recipe.base_fat,
        calories: recipe.base_calories
      },
      is_favorite: favorites.includes(recipe.recipe_id),
      days_since_last_use: mostRecent === 999 ? undefined : mostRecent,
      usage_count_last_7_days: last7Days.length,
      usage_count_last_30_days: last30Days.length,
      base_score: 0 // Will be calculated by the scorer
    };
  });
}
 * New Meal Plan Database Queries
 * Real database integration for the master meal plan algorithm
 */

import { supabase } from './client';
import { RecipeWithHistory } from '../recipeRanker';
import { RecipeScalability } from '../recipeScorer';

export interface DatabaseRecipe {
  recipe_id: number;
  recipe_name: string;
  category: string;
  base_protein: number;
  base_carbs: number;
  base_fat: number;
  base_calories: number;
}

export interface UserMealHistory {
  recipe_id: number;
  date_used: string;
  meal_type: string;
  days_ago: number;
}

/**
 * Fetch recipes with their base macros from database
 */
export async function fetchRecipesWithMacros(): Promise<DatabaseRecipe[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_recipes_with_macros'); // Custom SQL function

    if (error) {
      console.error('Error fetching recipes with macros:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Database error in fetchRecipesWithMacros:', error);
    throw error;
  }
}

/**
 * Fetch user meal history for variety logic
 */
export async function fetchUserMealHistory(userId: string, days: number = 30): Promise<UserMealHistory[]> {
  try {
    const { data, error } = await supabase
      .from('user_meal_history')
      .select(`
        recipe_id,
        date_used,
        meal_type
      `)
      .eq('user_id', userId)
      .gte('date_used', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date_used', { ascending: false });

    if (error) {
      console.error('Error fetching user meal history:', error);
      throw error;
    }

    // Calculate days ago for each record
    const historyWithDays = (data || []).map(record => ({
      ...record,
      days_ago: Math.floor((Date.now() - new Date(record.date_used).getTime()) / (24 * 60 * 60 * 1000))
    }));

    return historyWithDays;
  } catch (error) {
    console.error('Database error in fetchUserMealHistory:', error);
    throw error;
  }
}

/**
 * Fetch recipe scalability data
 */
export async function fetchRecipeScalability(): Promise<RecipeScalability[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_scalability')
      .select('*');

    if (error) {
      console.error('Error fetching recipe scalability:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Database error in fetchRecipeScalability:', error);
    throw error;
  }
}

/**
 * Fetch user favorites
 */
export async function fetchUserFavorites(userId: string): Promise<number[]> {
  try {
    // Assuming there's a user_favorites table or similar
    const { data, error } = await supabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user favorites:', error);
      // Don't throw, just return empty array as fallback
      return [];
    }

    return (data || []).map(fav => fav.recipe_id);
  } catch (error) {
    console.error('Database error in fetchUserFavorites:', error);
    return [];
  }
}

/**
 * Save generated meal plan to history
 */
export async function saveMealPlanToHistory(
  userId: string,
  mealPlan: { recipe_id: number; meal_type: string }[]
): Promise<void> {
  try {
    const historyRecords = mealPlan.map(meal => ({
      user_id: userId,
      recipe_id: meal.recipe_id,
      date_used: new Date().toISOString().split('T')[0],
      meal_type: meal.meal_type,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('user_meal_history')
      .insert(historyRecords);

    if (error) {
      console.error('Error saving meal plan to history:', error);
      throw error;
    }

    console.log(`✅ Saved ${historyRecords.length} meal plan records to history`);
  } catch (error) {
    console.error('Database error in saveMealPlanToHistory:', error);
    throw error;
  }
}

/**
 * Fetch ingredient constraints for LP optimization
 */
export async function fetchIngredientConstraints(recipeIds: number[]): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_ingredient_constraints_for_recipes', {
        p_recipe_ids: recipeIds
      });

    if (error) {
      console.error('Error fetching ingredient constraints:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Database error in fetchIngredientConstraints:', error);
    // Return empty array as fallback - LP optimization will be skipped
    return [];
  }
}

/**
 * Transform database recipes to RecipeWithHistory format
 */
export function transformToRecipeWithHistory(
  recipes: DatabaseRecipe[],
  history: UserMealHistory[],
  favorites: number[]
): RecipeWithHistory[] {
  
  return recipes.map(recipe => {
    // Calculate usage statistics
    const recipeHistory = history.filter(h => h.recipe_id === recipe.recipe_id);
    const last7Days = recipeHistory.filter(h => h.days_ago <= 7);
    const last30Days = recipeHistory.filter(h => h.days_ago <= 30);
    const mostRecent = recipeHistory.length > 0 ? Math.min(...recipeHistory.map(h => h.days_ago)) : 999;

    return {
      recipe_id: recipe.recipe_id,
      recipe_name: recipe.recipe_name,
      category: recipe.category,
      base_macros: {
        protein: recipe.base_protein,
        carbs: recipe.base_carbs,
        fat: recipe.base_fat,
        calories: recipe.base_calories
      },
      is_favorite: favorites.includes(recipe.recipe_id),
      days_since_last_use: mostRecent === 999 ? undefined : mostRecent,
      usage_count_last_7_days: last7Days.length,
      usage_count_last_30_days: last30Days.length,
      base_score: 0 // Will be calculated by the scorer
    };
  });
}
 