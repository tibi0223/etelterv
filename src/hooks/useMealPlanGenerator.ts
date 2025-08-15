/**
 * React Hook for Meal Plan Generation
 * Uses direct Supabase connection (bypasses problematic backend)
 */

import { useState, useCallback } from 'react';
import { generateDirectMealPlan, DirectMealPlanRequest, MealPlan } from '../services/directMealPlanGenerator';
import { supabase } from '@/integrations/supabase/client';

// Simplified interfaces for the test
export interface MealPlanRequest {
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  mealCount?: number;
  maxRecipeDeviation?: number;
  mealDistribution?: Record<string, number>;
}

export function useMealPlanGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveDefaultMealCount = async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata as any;
      const m = Number(meta?.meals_per_day);
      if (Number.isFinite(m) && m >= 1 && m <= 5) return m;
    } catch {}
    return 3; // fallback
  };

  const resolveSameLunchDinner = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return Boolean((user?.user_metadata as any)?.same_lunch_dinner);
    } catch {
      return false;
    }
  };

  const generateMealPlan = useCallback(async (request: MealPlanRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Starting direct meal plan generation...', request);

      const defaultMealCount = await resolveDefaultMealCount();
      const mealCount = request.mealCount && request.mealCount >= 1 && request.mealCount <= 5
        ? request.mealCount
        : defaultMealCount;

      const sameLunchDinner = await resolveSameLunchDinner();

      // Convert to direct generator format
      const directRequest: DirectMealPlanRequest = {
        targetProtein: request.targetProtein,
        targetCarbs: request.targetCarbs,
        targetFat: request.targetFat,
        mealCount,
        sameLunchDinner
      };

      // Call direct generator (no backend needed)
      const data = await generateDirectMealPlan(directRequest);
      setResult(data);
      
      if (data.success) {
        console.log('✅ Direct meal plan generated successfully', data);
      } else {
        setError(data.message || 'Generation failed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Direct meal plan generation error:', errorMessage);
      setError(errorMessage);
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Quick generate with default values
  const generateQuickPlan = useCallback(() => {
    return generateMealPlan({
      targetProtein: 120,
      targetCarbs: 300,
      targetFat: 80
    });
  }, [generateMealPlan]);

  // Advanced generate with custom options
  const generateAdvancedPlan = useCallback((request: MealPlanRequest) => {
    return generateMealPlan(request);
  }, [generateMealPlan]);

  return {
    isLoading,
    result,
    error,
    generateMealPlan,
    generateQuickPlan,
    generateAdvancedPlan
  };
}

