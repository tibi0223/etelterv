import { supabase } from '@/integrations/supabase/client';
import { MealPlanOutput } from './mealPlanGenerator';

export interface SavedMealPlan {
  id: string;
  user_id: string;
  plan_name: string;
  plan_data: MealPlanOutput;
  target_macros: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  created_at: string;
  updated_at: string;
}

export const saveMealPlan = async (
  userId: string,
  planName: string,
  planData: MealPlanOutput,
  targetMacros: { protein: number; carbs: number; fat: number; calories: number }
): Promise<SavedMealPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('saved_meal_plans')
      .insert({
        user_id: userId,
        plan_name: planName,
        plan_data: planData,
        target_macros: targetMacros,
      })
      .select()
      .single();

    if (error) {
      console.error('Étrend mentési hiba:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Étrend mentési hiba:', error);
    return null;
  }
};

export const fetchSavedMealPlans = async (userId: string): Promise<SavedMealPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('saved_meal_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Mentett étrendek betöltési hiba:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Mentett étrendek betöltési hiba:', error);
    return [];
  }
};

export const deleteSavedMealPlan = async (planId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('saved_meal_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('Étrend törlési hiba:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Étrend törlési hiba:', error);
    return false;
  }
};

export const updateSavedMealPlan = async (
  planId: string,
  planName: string,
  planData: MealPlanOutput,
  targetMacros: { protein: number; carbs: number; fat: number; calories: number }
): Promise<SavedMealPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('saved_meal_plans')
      .update({
        plan_name: planName,
        plan_data: planData,
        target_macros: targetMacros,
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Étrend frissítési hiba:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Étrend frissítési hiba:', error);
    return null;
  }
}; 