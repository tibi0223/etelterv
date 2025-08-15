/**
 * Meal Plan Generator Demo Component
 * Shows how to use the new meal plan generation system
 */

'use client';

import React, { useState } from 'react';
import { useMealPlanGenerator, useMealPlanDisplay } from '@/hooks/useMealPlanGenerator';

export default function MealPlanGeneratorDemo() {
  const [targetMacros, setTargetMacros] = useState({
    protein: 120,
    carbs: 150,
    fat: 50,
    calories: 1460
  });

  const [mealCount, setMealCount] = useState(3);
  const [enableLPOptimization, setEnableLPOptimization] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(5);

  const {
    isGenerating,
    lastResult,
    error,
    generateQuickMealPlan,
    generateStandardMealPlan,
    generateAdvancedMealPlan,
    reset,
    hasResult,
    isSuccess,
    qualityMetrics,
    generationTime
  } = useMealPlanGenerator({
    onSuccess: (result) => {
      console.log('✅ Success callback:', result);
    },
    onError: (error) => {
      console.error('❌ Error callback:', error);
    }
  });

  const { formatMacros, calculateDeviations, getQualityColor, getDeviationColor } = useMealPlanDisplay();

  const handleQuickGenerate = () => {
    generateQuickMealPlan(targetMacros);
  };

  const handleStandardGenerate = () => {
    generateStandardMealPlan(targetMacros, {
      meal_count: mealCount,
      preferred_meal_types: mealCount === 4 ? 
        ['reggeli', 'ebéd', 'uzsonna', 'vacsora'] : 
        ['reggeli', 'ebéd', 'vacsora']
    });
  };

  const handleAdvancedGenerate = () => {
    generateAdvancedMealPlan(targetMacros, {
      preferences: {
        meal_count: mealCount,
        preferred_meal_types: mealCount === 4 ? 
          ['reggeli', 'ebéd', 'uzsonna', 'vacsora'] : 
          ['reggeli', 'ebéd', 'vacsora']
      },
      algorithm_settings: {
        max_attempts: maxAttempts,
        enable_lp_optimization: enableLPOptimization,
        score_threshold: 75,
        deviation_threshold: 15
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          🎯 New Meal Plan Generator Demo
        </h1>
        <p className="text-gray-600 mb-6">
          Test the new intelligent meal plan generation algorithm with real database integration.
        </p>

        {/* Target Macros Input */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              value={targetMacros.protein}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, protein: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="20"
              max="300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              value={targetMacros.carbs}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, carbs: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="20"
              max="500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              value={targetMacros.fat}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, fat: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="10"
              max="200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calories
            </label>
            <input
              type="number"
              value={targetMacros.calories}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, calories: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="800"
              max="4000"
            />
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meal Count
            </label>
            <select
              value={mealCount}
              onChange={(e) => setMealCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 meals</option>
              <option value={4}>4 meals</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Attempts
            </label>
            <select
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 attempts</option>
              <option value={5}>5 attempts</option>
              <option value={10}>10 attempts</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="lpOptimization"
              checked={enableLPOptimization}
              onChange={(e) => setEnableLPOptimization(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="lpOptimization" className="text-sm font-medium text-gray-700">
              Enable LP Optimization
            </label>
          </div>
        </div>

        {/* Generation Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleQuickGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '⏳ Generating...' : '⚡ Quick Generate'}
          </button>
          <button
            onClick={handleStandardGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '⏳ Generating...' : '🎯 Standard Generate'}
          </button>
          <button
            onClick={handleAdvancedGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '⏳ Generating...' : '🧠 Advanced Generate'}
          </button>
          {hasResult && (
            <button
              onClick={reset}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              🗑️ Clear
            </button>
          )}
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Generating meal plan using AI algorithm...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">❌ Generation Failed</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {hasResult && isSuccess && lastResult?.data && (
          <div className="space-y-6">
            {/* Quality Metrics */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-green-800 mb-3">✅ Generation Successful</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold text-${getQualityColor(qualityMetrics?.user_satisfaction_score || 0)}-600`}>
                    {qualityMetrics?.user_satisfaction_score || 0}%
                  </div>
                  <div className="text-sm text-gray-600">User Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold text-${getDeviationColor(qualityMetrics?.final_deviation_percent || 0)}-600`}>
                    {qualityMetrics?.final_deviation_percent || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Total Deviation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {qualityMetrics?.final_average_score || 0}
                  </div>
                  <div className="text-sm text-gray-600">Recipe Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {generationTime || 0}ms
                  </div>
                  <div className="text-sm text-gray-600">Generation Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {lastResult.data.generation_metadata.total_attempts}
                  </div>
                  <div className="text-sm text-gray-600">Attempts Used</div>
                </div>
              </div>
            </div>

            {/* Meal Plan */}
            <div className="bg-white border border-gray-200 rounded-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🍽️ Generated Meal Plan</h3>
              
              <div className="space-y-4">
                {Object.entries(lastResult.data.meal_plan).map(([mealType, meal]) => (
                  <div key={mealType} className="border border-gray-100 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-800 capitalize">
                          {mealType} {meal.is_favorite && '⭐'}
                        </h4>
                        <p className="text-lg text-gray-600">{meal.recipe_name}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium text-${getQualityColor(meal.final_score)}-600`}>
                          Score: {meal.final_score}
                        </div>
                        {meal.penalty > 0 && (
                          <div className="text-xs text-red-600">Penalty: -{meal.penalty}</div>
                        )}
                        {meal.reward > 0 && (
                          <div className="text-xs text-green-600">Reward: +{meal.reward}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>P: {meal.macros.protein}g</div>
                      <div>C: {meal.macros.carbs}g</div>
                      <div>F: {meal.macros.fat}g</div>
                      <div>Cal: {meal.macros.calories}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Comparison */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-800 mb-3">📊 Macro Comparison</h4>
                
                <div className="grid grid-cols-4 gap-4">
                  {['protein', 'carbs', 'fat', 'calories'].map((macro) => {
                    const actual = lastResult.data.totals[macro as keyof typeof lastResult.data.totals];
                    const target = lastResult.data.targets[macro as keyof typeof lastResult.data.targets];
                    const deviation = Math.abs(actual - target) / target * 100;
                    
                    return (
                      <div key={macro} className="text-center">
                        <div className="text-sm text-gray-600 capitalize">{macro}</div>
                        <div className="font-medium">
                          {actual} / {target}
                        </div>
                        <div className={`text-xs text-${getDeviationColor(deviation)}-600`}>
                          {deviation.toFixed(1)}% off
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optimization Info */}
              {lastResult.data.optimization_applied.lp_optimization && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <span className="text-blue-800 text-sm">
                    🧮 LP Optimization was applied to improve macro targets
                  </span>
                </div>
              )}

              {lastResult.data.optimization_applied.recipe_swapping && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <span className="text-green-800 text-sm">
                    🔄 Recipe swapping was used to improve weak macros
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Info */}
        {lastResult?.debug_info && (
          <details className="mt-6">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              🔍 Debug Information
            </summary>
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-4">
              <pre className="text-xs text-gray-700 overflow-x-auto">
                {JSON.stringify(lastResult.debug_info, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
 * Meal Plan Generator Demo Component
 * Shows how to use the new meal plan generation system
 */

'use client';

import React, { useState } from 'react';
import { useMealPlanGenerator, useMealPlanDisplay } from '@/hooks/useMealPlanGenerator';

export default function MealPlanGeneratorDemo() {
  const [targetMacros, setTargetMacros] = useState({
    protein: 120,
    carbs: 150,
    fat: 50,
    calories: 1460
  });

  const [mealCount, setMealCount] = useState(3);
  const [enableLPOptimization, setEnableLPOptimization] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(5);

  const {
    isGenerating,
    lastResult,
    error,
    generateQuickMealPlan,
    generateStandardMealPlan,
    generateAdvancedMealPlan,
    reset,
    hasResult,
    isSuccess,
    qualityMetrics,
    generationTime
  } = useMealPlanGenerator({
    onSuccess: (result) => {
      console.log('✅ Success callback:', result);
    },
    onError: (error) => {
      console.error('❌ Error callback:', error);
    }
  });

  const { formatMacros, calculateDeviations, getQualityColor, getDeviationColor } = useMealPlanDisplay();

  const handleQuickGenerate = () => {
    generateQuickMealPlan(targetMacros);
  };

  const handleStandardGenerate = () => {
    generateStandardMealPlan(targetMacros, {
      meal_count: mealCount,
      preferred_meal_types: mealCount === 4 ? 
        ['reggeli', 'ebéd', 'uzsonna', 'vacsora'] : 
        ['reggeli', 'ebéd', 'vacsora']
    });
  };

  const handleAdvancedGenerate = () => {
    generateAdvancedMealPlan(targetMacros, {
      preferences: {
        meal_count: mealCount,
        preferred_meal_types: mealCount === 4 ? 
          ['reggeli', 'ebéd', 'uzsonna', 'vacsora'] : 
          ['reggeli', 'ebéd', 'vacsora']
      },
      algorithm_settings: {
        max_attempts: maxAttempts,
        enable_lp_optimization: enableLPOptimization,
        score_threshold: 75,
        deviation_threshold: 15
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          🎯 New Meal Plan Generator Demo
        </h1>
        <p className="text-gray-600 mb-6">
          Test the new intelligent meal plan generation algorithm with real database integration.
        </p>

        {/* Target Macros Input */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              value={targetMacros.protein}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, protein: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="20"
              max="300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              value={targetMacros.carbs}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, carbs: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="20"
              max="500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              value={targetMacros.fat}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, fat: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="10"
              max="200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calories
            </label>
            <input
              type="number"
              value={targetMacros.calories}
              onChange={(e) => setTargetMacros(prev => ({ ...prev, calories: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="800"
              max="4000"
            />
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meal Count
            </label>
            <select
              value={mealCount}
              onChange={(e) => setMealCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 meals</option>
              <option value={4}>4 meals</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Attempts
            </label>
            <select
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>3 attempts</option>
              <option value={5}>5 attempts</option>
              <option value={10}>10 attempts</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="lpOptimization"
              checked={enableLPOptimization}
              onChange={(e) => setEnableLPOptimization(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="lpOptimization" className="text-sm font-medium text-gray-700">
              Enable LP Optimization
            </label>
          </div>
        </div>

        {/* Generation Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleQuickGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '⏳ Generating...' : '⚡ Quick Generate'}
          </button>
          <button
            onClick={handleStandardGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '⏳ Generating...' : '🎯 Standard Generate'}
          </button>
          <button
            onClick={handleAdvancedGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '⏳ Generating...' : '🧠 Advanced Generate'}
          </button>
          {hasResult && (
            <button
              onClick={reset}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              🗑️ Clear
            </button>
          )}
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Generating meal plan using AI algorithm...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">❌ Generation Failed</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {hasResult && isSuccess && lastResult?.data && (
          <div className="space-y-6">
            {/* Quality Metrics */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-green-800 mb-3">✅ Generation Successful</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold text-${getQualityColor(qualityMetrics?.user_satisfaction_score || 0)}-600`}>
                    {qualityMetrics?.user_satisfaction_score || 0}%
                  </div>
                  <div className="text-sm text-gray-600">User Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold text-${getDeviationColor(qualityMetrics?.final_deviation_percent || 0)}-600`}>
                    {qualityMetrics?.final_deviation_percent || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Total Deviation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {qualityMetrics?.final_average_score || 0}
                  </div>
                  <div className="text-sm text-gray-600">Recipe Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {generationTime || 0}ms
                  </div>
                  <div className="text-sm text-gray-600">Generation Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {lastResult.data.generation_metadata.total_attempts}
                  </div>
                  <div className="text-sm text-gray-600">Attempts Used</div>
                </div>
              </div>
            </div>

            {/* Meal Plan */}
            <div className="bg-white border border-gray-200 rounded-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🍽️ Generated Meal Plan</h3>
              
              <div className="space-y-4">
                {Object.entries(lastResult.data.meal_plan).map(([mealType, meal]) => (
                  <div key={mealType} className="border border-gray-100 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-800 capitalize">
                          {mealType} {meal.is_favorite && '⭐'}
                        </h4>
                        <p className="text-lg text-gray-600">{meal.recipe_name}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium text-${getQualityColor(meal.final_score)}-600`}>
                          Score: {meal.final_score}
                        </div>
                        {meal.penalty > 0 && (
                          <div className="text-xs text-red-600">Penalty: -{meal.penalty}</div>
                        )}
                        {meal.reward > 0 && (
                          <div className="text-xs text-green-600">Reward: +{meal.reward}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>P: {meal.macros.protein}g</div>
                      <div>C: {meal.macros.carbs}g</div>
                      <div>F: {meal.macros.fat}g</div>
                      <div>Cal: {meal.macros.calories}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Comparison */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-800 mb-3">📊 Macro Comparison</h4>
                
                <div className="grid grid-cols-4 gap-4">
                  {['protein', 'carbs', 'fat', 'calories'].map((macro) => {
                    const actual = lastResult.data.totals[macro as keyof typeof lastResult.data.totals];
                    const target = lastResult.data.targets[macro as keyof typeof lastResult.data.targets];
                    const deviation = Math.abs(actual - target) / target * 100;
                    
                    return (
                      <div key={macro} className="text-center">
                        <div className="text-sm text-gray-600 capitalize">{macro}</div>
                        <div className="font-medium">
                          {actual} / {target}
                        </div>
                        <div className={`text-xs text-${getDeviationColor(deviation)}-600`}>
                          {deviation.toFixed(1)}% off
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optimization Info */}
              {lastResult.data.optimization_applied.lp_optimization && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <span className="text-blue-800 text-sm">
                    🧮 LP Optimization was applied to improve macro targets
                  </span>
                </div>
              )}

              {lastResult.data.optimization_applied.recipe_swapping && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <span className="text-green-800 text-sm">
                    🔄 Recipe swapping was used to improve weak macros
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Info */}
        {lastResult?.debug_info && (
          <details className="mt-6">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              🔍 Debug Information
            </summary>
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-4">
              <pre className="text-xs text-gray-700 overflow-x-auto">
                {JSON.stringify(lastResult.debug_info, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
 