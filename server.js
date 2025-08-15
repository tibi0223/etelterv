/**
 * Express Backend for Meal Plan API
 * Handles real database connections and algorithm execution
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { generateMealPlan } from './src/services/masterMealPlanGenerator.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Meal Plan API Server Running',
    timestamp: new Date().toISOString()
  });
});

// Main meal plan generation endpoint
app.post('/api/meal-plan/generate', async (req, res) => {
  try {
    console.log('🚀 Meal plan generation request:', req.body);

    const {
      targetProtein = 120,
      targetCarbs = 300, 
      targetFat = 80,
      mealCount = 3,
      maxRecipeDeviation = 20,
      mealDistribution
    } = req.body;

    // Convert to the expected format
    const generationRequest = {
      targetMacros: {
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat,
        calories: (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9)
      },
      preferences: {
        mealCount,
        maxRecipeDeviation,
        mealDistribution
      },
      userId: 'test-user', // For now, use a test user
      options: {
        enableLPOptimization: true,
        enableRecipeSwapping: true,
        saveToHistory: false
      }
    };

    console.log('🎯 Converted request:', generationRequest);

    // Call the main generation function
    const result = await generateMealPlan(generationRequest, supabase);

    console.log('✅ Generation completed:', {
      success: result.success,
      message: result.message,
      dataExists: !!result.data
    });

    res.json(result);

  } catch (error) {
    console.error('❌ Meal plan generation error:', error);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Recipe endpoints
app.get('/api/recipes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('get_recipes_with_macros')
      .select('*')
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      count: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('get_recipes_with_macros')
      .limit(5);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Database connection successful',
      sampleRecipes: data?.length || 0,
      recipes: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Meal Plan API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test database: http://localhost:${PORT}/api/test-db`);
  console.log(`🎯 Generate endpoint: http://localhost:${PORT}/api/meal-plan/generate`);
});

export default app;