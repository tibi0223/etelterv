/**
 * API Route for Real Meal Plan Generation
 * POST /api/meal-plan/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  generateRealMealPlan,
  generateQuickMealPlan,
  generateAdvancedMealPlan,
  RealMealPlanRequest 
} from '@/services/realMealPlanService';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.target_macros || 
        typeof body.target_macros.protein !== 'number' ||
        typeof body.target_macros.carbs !== 'number' ||
        typeof body.target_macros.fat !== 'number' ||
        typeof body.target_macros.calories !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid target_macros. Required: protein, carbs, fat, calories (all numbers)' 
        },
        { status: 400 }
      );
    }

    // Validate macro values
    const { protein, carbs, fat, calories } = body.target_macros;
    if (protein <= 0 || carbs <= 0 || fat <= 0 || calories <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'All macro values must be positive numbers' 
        },
        { status: 400 }
      );
    }

    // Check if macros are reasonable
    const calculatedCalories = protein * 4 + carbs * 4 + fat * 9;
    if (Math.abs(calculatedCalories - calories) > calories * 0.2) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Macro values do not match calorie target (±20% tolerance)' 
        },
        { status: 400 }
      );
    }

    console.log(`🎯 Meal plan generation requested for user ${userId}`);
    console.log(`Target macros: P:${protein}g C:${carbs}g F:${fat}g Cal:${calories}`);

    // Determine generation mode
    const mode = body.mode || 'standard';
    let result;

    switch (mode) {
      case 'quick':
        result = await generateQuickMealPlan(userId, body.target_macros);
        break;
        
      case 'advanced':
        result = await generateAdvancedMealPlan(
          userId,
          body.target_macros,
          {
            mealCount: body.meal_count,
            excludeRecipes: body.exclude_recipe_ids,
            maxAttempts: body.max_attempts,
            enableLPOptimization: body.enable_lp_optimization
          }
        );
        break;
        
      default: // 'standard'
        const requestData: RealMealPlanRequest = {
          user_id: userId,
          target_macros: body.target_macros,
          preferences: body.preferences,
          algorithm_settings: body.algorithm_settings,
          save_to_history: body.save_to_history
        };
        
        result = await generateRealMealPlan(requestData);
        break;
    }

    // Log result
    if (result.success) {
      console.log(`✅ Meal plan generated successfully for user ${userId}`);
      console.log(`Quality score: ${result.data?.quality_metrics.user_satisfaction_score}/100`);
    } else {
      console.log(`❌ Meal plan generation failed for user ${userId}: ${result.message}`);
    }

    // Return result
    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });

  } catch (error) {
    console.error('❌ API Error in meal-plan/generate:', error);
    
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        message: 'Internal server error during meal plan generation',
        debug_info: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    service: 'Meal Plan Generator API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      'POST /api/meal-plan/generate': 'Generate meal plan',
      'GET /api/meal-plan/generate': 'Health check'
    },
    modes: {
      quick: 'Fast generation with default settings',
      standard: 'Full generation with customizable options',
      advanced: 'Advanced generation with extended options'
    },
    example_request: {
      mode: 'standard',
      target_macros: {
        protein: 120,
        carbs: 150,
        fat: 50,
        calories: 1460
      },
      preferences: {
        meal_count: 3,
        preferred_meal_types: ['reggeli', 'ebéd', 'vacsora']
      }
    }
  });
}
 * API Route for Real Meal Plan Generation
 * POST /api/meal-plan/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  generateRealMealPlan,
  generateQuickMealPlan,
  generateAdvancedMealPlan,
  RealMealPlanRequest 
} from '@/services/realMealPlanService';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.target_macros || 
        typeof body.target_macros.protein !== 'number' ||
        typeof body.target_macros.carbs !== 'number' ||
        typeof body.target_macros.fat !== 'number' ||
        typeof body.target_macros.calories !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid target_macros. Required: protein, carbs, fat, calories (all numbers)' 
        },
        { status: 400 }
      );
    }

    // Validate macro values
    const { protein, carbs, fat, calories } = body.target_macros;
    if (protein <= 0 || carbs <= 0 || fat <= 0 || calories <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'All macro values must be positive numbers' 
        },
        { status: 400 }
      );
    }

    // Check if macros are reasonable
    const calculatedCalories = protein * 4 + carbs * 4 + fat * 9;
    if (Math.abs(calculatedCalories - calories) > calories * 0.2) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Macro values do not match calorie target (±20% tolerance)' 
        },
        { status: 400 }
      );
    }

    console.log(`🎯 Meal plan generation requested for user ${userId}`);
    console.log(`Target macros: P:${protein}g C:${carbs}g F:${fat}g Cal:${calories}`);

    // Determine generation mode
    const mode = body.mode || 'standard';
    let result;

    switch (mode) {
      case 'quick':
        result = await generateQuickMealPlan(userId, body.target_macros);
        break;
        
      case 'advanced':
        result = await generateAdvancedMealPlan(
          userId,
          body.target_macros,
          {
            mealCount: body.meal_count,
            excludeRecipes: body.exclude_recipe_ids,
            maxAttempts: body.max_attempts,
            enableLPOptimization: body.enable_lp_optimization
          }
        );
        break;
        
      default: // 'standard'
        const requestData: RealMealPlanRequest = {
          user_id: userId,
          target_macros: body.target_macros,
          preferences: body.preferences,
          algorithm_settings: body.algorithm_settings,
          save_to_history: body.save_to_history
        };
        
        result = await generateRealMealPlan(requestData);
        break;
    }

    // Log result
    if (result.success) {
      console.log(`✅ Meal plan generated successfully for user ${userId}`);
      console.log(`Quality score: ${result.data?.quality_metrics.user_satisfaction_score}/100`);
    } else {
      console.log(`❌ Meal plan generation failed for user ${userId}: ${result.message}`);
    }

    // Return result
    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });

  } catch (error) {
    console.error('❌ API Error in meal-plan/generate:', error);
    
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        message: 'Internal server error during meal plan generation',
        debug_info: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    service: 'Meal Plan Generator API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      'POST /api/meal-plan/generate': 'Generate meal plan',
      'GET /api/meal-plan/generate': 'Health check'
    },
    modes: {
      quick: 'Fast generation with default settings',
      standard: 'Full generation with customizable options',
      advanced: 'Advanced generation with extended options'
    },
    example_request: {
      mode: 'standard',
      target_macros: {
        protein: 120,
        carbs: 150,
        fat: 50,
        calories: 1460
      },
      preferences: {
        meal_count: 3,
        preferred_meal_types: ['reggeli', 'ebéd', 'vacsora']
      }
    }
  });
}
 