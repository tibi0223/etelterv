/**
 * Simplified Express Backend for Meal Plan API
 * Works without complex service imports
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Fixed Supabase credentials
const supabaseUrl = 'https://lvkxcqmpuklxfuqxprsa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2a3hjcW1wdWtseGZ1cXhwcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkxMjQyMjIsImV4cCI6MjAyNDcwMDIyMn0.HuuJmuTdjr7ZHN72fGhOOVKK8ANBNKv2WZY88Vy0bvA';

console.log('🔑 Supabase URL:', supabaseUrl.substring(0, 30) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Meal Plan API Server Running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    console.log('🔗 Supabase URL:', supabaseUrl);
    console.log('🔑 Supabase Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
    
    // First test: simple table query instead of RPC
    console.log('🔍 Testing simple table query first...');
    const { data: simpleData, error: simpleError } = await supabase
      .from('receptek')
      .select('*')
      .limit(3);

    if (simpleError) {
      console.error('❌ Simple query error:', simpleError);
      throw new Error(`Simple query failed: ${simpleError.message}`);
    }

    console.log('✅ Simple query successful, found', simpleData?.length || 0, 'receptek');

    // If simple query works, try RPC
    console.log('🔍 Testing RPC function...');
    const { data, error } = await supabase
      .rpc('get_recipes_with_macros')
      .limit(5);

    if (error) {
      console.error('❌ RPC error:', error);
      // Return simple data if RPC fails
      res.json({
        success: true,
        message: 'Database connection successful (simple query only)',
        note: 'RPC function failed, but basic connection works',
        recipeCount: simpleData?.length || 0,
        sampleRecipes: simpleData?.slice(0, 3) || [],
        rpcError: error.message
      });
      return;
    }

    console.log('✅ RPC test successful, found', data?.length || 0, 'recipes');

    res.json({
      success: true,
      message: 'Database connection successful (with RPC)',
      recipeCount: data?.length || 0,
      sampleRecipes: data?.slice(0, 3) || []
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Simple meal plan generation (mock response for now)
app.post('/api/meal-plan/generate', async (req, res) => {
  try {
    console.log('🚀 Meal plan generation request:', req.body);

    const {
      targetProtein = 120,
      targetCarbs = 300, 
      targetFat = 80,
      mealCount = 3
    } = req.body;

    // Use static in-memory recipes to avoid DB during quick test
    const sample = [
      { recipe_id: 1, recipe_name: 'Protein Oatmeal Bowl', category: 'reggeli', base_protein: 28, base_carbs: 45, base_fat: 12, base_calories: 372 },
      { recipe_id: 10, recipe_name: 'Grilled Chicken Salad', category: 'ebéd', base_protein: 42, base_carbs: 18, base_fat: 14, base_calories: 346 },
      { recipe_id: 20, recipe_name: 'Salmon with Sweet Potato', category: 'vacsora', base_protein: 36, base_carbs: 32, base_fat: 18, base_calories: 398 },
      { recipe_id: 30, recipe_name: 'Protein Smoothie', category: 'uzsonna', base_protein: 24, base_carbs: 18, base_fat: 6, base_calories: 208 }
    ];
    const recipes = sample.slice(0, Math.max(1, Math.min(mealCount, sample.length)));

    const mealPlan = {
      success: true,
      status: 'completed',
      message: `Generated meal plan with ${recipes.length} recipes (static quick test)`,
      data: {
        meals: recipes.map((recipe, index) => ({
          mealType: ['reggeli', 'ebéd', 'vacsora', 'uzsonna'][index] || 'meal',
          recipe: {
            id: recipe.recipe_id,
            name: recipe.recipe_name,
            category: recipe.category,
            macros: {
              protein: recipe.base_protein,
              carbs: recipe.base_carbs,
              fat: recipe.base_fat,
              calories: recipe.base_calories
            }
          }
        })),
        totalMacros: {
          protein: recipes.reduce((sum, r) => sum + (r.base_protein || 0), 0),
          carbs: recipes.reduce((sum, r) => sum + (r.base_carbs || 0), 0),
          fat: recipes.reduce((sum, r) => sum + (r.base_fat || 0), 0),
          calories: recipes.reduce((sum, r) => sum + (r.base_calories || 0), 0)
        },
        targetMacros: {
          protein: targetProtein,
          carbs: targetCarbs,
          fat: targetFat,
          calories: (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9)
        },
        generation_metadata: {
          generation_time_ms: Math.round(Math.random() * 500 + 200),
          algorithm_version: 'simple-static-v1',
          total_attempts: 1,
          success_rate: 100
        }
      }
    };

    console.log('✅ Meal plan generated successfully');
    res.json(mealPlan);

  } catch (error) {
    console.error('❌ Meal plan generation error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message || 'Internal server error' });
  }
});

// Get all recipes endpoint
app.get('/api/recipes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('get_recipes_with_macros')
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 =================================');
  console.log(`🚀 Meal Plan API Server RUNNING!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log('🚀 =================================');
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test database: http://localhost:${PORT}/api/test-db`);
  console.log(`🎯 Generate endpoint: http://localhost:${PORT}/api/meal-plan/generate`);
  console.log('🚀 =================================');
});

export default app;