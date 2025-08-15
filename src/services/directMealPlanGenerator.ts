/**
 * Direct Meal Plan Generator - Frontend calls Supabase directly
 * Bypasses the problematic Node.js backend
 */

import { createClient } from '@supabase/supabase-js';
import { scaleRecipe as macroScaleRecipe, calculateTotalMacros } from './macroScaler';
import * as solver from 'javascript-lp-solver';

// Feature flags
const ENABLE_BOOSTERS = false; // disable LP macro boosters (P/C/F)
const ENABLE_POST_ROUND_BOOSTER = false; // disable post-round booster correction and display

// Simple seeded RNG (mulberry32) for reproducible variety
function createSeededRng(seed: number) {
  let t = Math.imul(seed ^ 0x6D2B79F5, 1);
  return function rng() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Normalize unit string
function normalizeUnit(unit: string): string {
  return (unit || '').toLowerCase().trim();
}

// Normalize text (remove diacritics, lower-case)
function normalizeText(text: string): string {
  try {
    return (text || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  } catch {
    return (text || '').toString().toLowerCase().trim();
  }
}

// Round scaled quantity to realistic steps based on unit
function roundQuantityByUnit(unit: string, quantity: number): number {
  const u = normalizeUnit(unit);
  if (!Number.isFinite(quantity)) return quantity;
  if (u.includes('g') || u.includes('gram')) {
    return Math.max(0, Math.round(quantity / 5) * 5); // 5g lépések
  }
  if (u.includes('ml')) {
    return Math.max(0, Math.round(quantity / 5) * 5); // 5ml lépések
  }
  if (u.includes('lap') || u.includes('sheet') || u.includes('nori')) {
    return Math.max(0, Math.round(quantity)); // egész lapok
  }
  if (u.includes('tk') || u.includes('teáskanál')) {
    return Math.max(0, Math.round(quantity * 2) / 2); // 0.5 tk
  }
  if (u.includes('ek') || u.includes('evőkanál')) {
    return Math.max(0, Math.round(quantity * 2) / 2); // 0.5 ek
  }
  if (u.includes('db') || u.includes('darab')) {
    return Math.max(0, Math.round(quantity)); // egész darab
  }
  if (u.includes('szelet')) {
    return Math.max(0, Math.round(quantity)); // egész szeletek
  }
  return quantity;
}

// Minimum megjelenítési lépés egységenként (hogy a kerekítés ne vigyen 0-ra)
function minDisplayByUnit(unit: string): number {
  const u = normalizeUnit(unit);
  if (u.includes('g') || u.includes('gram')) return 5;
  if (u.includes('ml')) return 5;
  if (u.includes('tk') || u.includes('teáskanál')) return 0.5;
  if (u.includes('ek') || u.includes('evőkanál')) return 0.5;
  if (u.includes('db') || u.includes('darab') || u.includes('lap') || u.includes('sheet') || u.includes('nori')) return 1;
  if (u.includes('szelet')) return 1;
  return 1;
}

// Csoportos kerekítéshez: egységfüggő lépés meghatározása
function groupStepByUnit(unit: string, desired: number): number {
  const u = normalizeUnit(unit);
  if (u.includes('g') || u.includes('gram')) return desired < 50 ? 1 : 5;
  if (u.includes('ml')) return desired < 50 ? 1 : 5;
  if (u.includes('lap') || u.includes('sheet') || u.includes('nori')) return 1;
  if (u.includes('tk') || u.includes('teáskanál')) return 0.5;
  if (u.includes('ek') || u.includes('evőkanál')) return 0.5;
  if (u.includes('db') || u.includes('darab')) return 1;
  if (u.includes('szelet')) return 1;
  return 1;
}

function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  return Math.max(0, Math.round(value / step) * step);
}

// Ha darab-alapú termék (pl. konzerv, nori): számolj darab-gramm lépést
function getPieceSizeGFromIngredient(ingredient: any): number | null {
  try {
    const nameNorm = normalizeText(ingredient.name);
    const unitNorm = normalizeUnit(ingredient.original_unit);
    const baseQty: number = ingredient.original_quantity || ingredient.base_quantity || 0;
    const baseQtyG: number = (ingredient as any).original_quantity_g || 0;
    const looksPieceUnit = unitNorm.includes('db') || unitNorm.includes('darab') || unitNorm.includes('szelet') || unitNorm.includes('lap') || unitNorm.includes('sheet');
    const looksPieceByName = /nori|konzerv|szard[iní]a|szardinia|tonhal/.test(nameNorm);
    if ((looksPieceUnit || looksPieceByName) && baseQty > 0 && baseQtyG > 0) {
      const step = baseQtyG / baseQty;
      return step > 0.5 ? step : null; // életszerű minimum
    }
  } catch {}
  return null;
}

function roundQuantitySmart(ingredient: any, quantity: number): number {
  const pieceStep = getPieceSizeGFromIngredient(ingredient);
  if (pieceStep && (normalizeUnit(ingredient.original_unit).includes('g') || normalizeUnit(ingredient.original_unit).includes('gram'))) {
    return roundToStep(quantity, pieceStep);
  }
  return roundQuantityByUnit(ingredient.original_unit, quantity);
}

// Heurisztika: kiegészítő/ízesítő az alapanyag?
function isLikelyCondiment(name: string, unit: string, tipusNorm?: string, _calories?: number, _quantity?: number): boolean {
  // KIZÁRÓLAG a DB-ből jövő Tipus mező alapján döntünk
  // tipusNorm már normalizált (ékezet nélkül, UPPERCASE)
  const t = (tipusNorm || '').toUpperCase();
  const CONDIMENT_TYPES = new Set(['IZESITO','VIZ','ALAPLE','AROMA']);
  if (CONDIMENT_TYPES.has(t)) return true;

  // Név‑alapú heurisztika fűszerek/gyógynövények azonosítására
  const n = normalizeText(name);
  const herbSpicePatterns: RegExp[] = [
    /(koriander|cilantro|petrezselyem|kapor|bazsalikom|oregano|oregano|kakukkfu|rozmaring|menta|majoranna)/,
    /(chili|csili|csilipaprika|erospaprika|fusz(er|er)|fuszer|fuszere(s)?|fuszerpaprika|paprika\s*(orolt|fusz(er)?))/,
    /(kömény|kemeny|kummin|kurkuma|gyomber|gy\u00f6mber|szerecsendio|szegf\u0171szeg|szezammag|szezammag)/,
    /(so|s\u00f3|bors|fokhagyma\s*por|hagyma\s*por)/
  ];
  if (herbSpicePatterns.some(rx => rx.test(n))) return true;
  return false;
}

// Speciális max skála korlát jelöltek (aromatics stb.)
function getSpecificMaxScale(name: string, unit: string, tipusNorm?: string): number | null {
  const n = normalizeText(name);
  // Lilahagyma/hagyma, fokhagyma, chili: max ~3x szorzás
  if (/lilahagyma|hagyma(?!\s*por)/.test(n)) return 3.0;
  if (/fokhagyma(?!\s*por)/.test(n)) return 3.0;
  if (/chili|csili|csilipaprika|erospaprika/.test(n)) return 3.0;
  return null;
}

function weightedRandomIndex(weights: number[], rng: () => number): number {
  const sum = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (sum <= 0) return 0;
  let pick = rng() * sum;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if ((pick -= w) <= 0) return i;
  }
  return weights.length - 1;
}

// Simple recency memory in localStorage to avoid immediate repeats between runs
function getRecentRecipeIds(maxKeep: number = 30): number[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('RECENT_RECIPES') : null;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(-maxKeep).map((x) => Number(x)).filter((x) => Number.isFinite(x));
  } catch {
    return [];
  }
}

function pushRecentRecipeId(id: number, maxKeep: number = 30) {
  try {
    if (typeof window === 'undefined') return;
    const arr = getRecentRecipeIds(maxKeep);
    arr.push(id);
    const trimmed = arr.slice(-maxKeep);
    window.localStorage.setItem('RECENT_RECIPES', JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

// Supabase configuration with CORRECT URL and API KEY
const supabaseUrl = 'https://hhjucbkqyamutshfspyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoanVjYmtxeWFtdXRzaGZzcHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3Mzc5OTgsImV4cCI6MjA2NTMxMzk5OH0.ZQmD-ELWa0-M_8qNv5drxm0C7tTp44wzRKWl5RPjzx0';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'User-Agent': 'meal-plan-generator'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
});

export interface DirectMealPlanRequest {
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  mealCount: number;
  sameLunchDinner?: boolean;
}

export interface Recipe {
  recipe_id: number;
  recipe_name: string;
  category: string;
  base_protein: number;
  base_carbs: number;
  base_fat: number;
  base_calories: number;
  ingredients?: Array<{
    name: string;
    original_quantity: number;
    original_unit: string;
    original_protein: number;
    original_carbs: number;
    original_fat: number;
    original_calories: number;
    scaled_quantity?: number;
    scaled_protein?: number;
    scaled_carbs?: number;
    scaled_fat?: number;
    scaled_calories?: number;
    kotes?: string; // Kötés az alapanyagok között
    ingredient_id?: number; // Egyedi azonosító
  }>;
  ingredient_groups?: Array<{
    group_id: string;
    ingredients: Array<{
      ingredient_id: number;
      name: string;
      original_quantity: number;
      original_unit: string;
      original_protein: number;
      original_carbs: number;
      original_fat: number;
      original_calories: number;
    }>;
    shared_scale_factor?: number; // Közös skálázási faktor a csoportban
  }>;
  independent_ingredients?: Array<{
    ingredient_id: number;
    name: string;
    original_quantity: number;
    original_unit: string;
    original_protein: number;
    original_carbs: number;
    original_fat: number;
    original_calories: number;
    individual_scale_factor?: number; // Egyedi skálázási faktor
  }>;
}

export interface MealPlan {
  success: boolean;
  message?: string;
  data?: {
    meals?: Array<{
      mealType: string;
      recipe: Recipe;
      scaledMacros: {
        protein: number;
        carbs: number;
        fat: number;
        calories: number;
      };
      scaleFactor: number;
      ingredientDetails?: Array<{
        name: string;
        original_quantity: number;
        original_unit: string;
        original_protein: number;
        original_carbs: number;
        original_fat: number;
        original_calories: number;
        scaled_quantity: number;
        scaled_protein: number;
        scaled_carbs: number;
        scaled_fat: number;
        scaled_calories: number;
      }>;
    }>;
    attempted_meals?: Array<{
      mealType: string;
      recipe: Recipe;
      scaledMacros: {
        protein: number;
        carbs: number;
        fat: number;
        calories: number;
      };
      scaleFactor: number;
    }>;
    totalMacros?: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    attempted_totals?: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    targetMacros?: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    deviations?: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    deviation_percentages?: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    max_deviation_percent?: number;
    rejection_reason?: string;
    generation_metadata?: {
      algorithm_version: string;
      generation_time_ms: number;
      total_recipes_available: number;
      selected_recipes: number;
      swap_attempts_made?: number;
      optimization_successful?: boolean;
    };
  };
}

// Calculate cosine similarity between two vectors
function calculateCosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Score recipes according to the proper algorithm: cosine * 40 + weighted_skala * 40 + size_factor * 20
function scoreRecipes(recipes: Recipe[], targetMacros: DirectMealPlanRequest): Array<Recipe & { score: number }> {
  // Calculate normalized target vector and total calories
  const totalTargetMacros = targetMacros.targetProtein + targetMacros.targetCarbs + targetMacros.targetFat;
  const normalizedTarget = {
    protein: targetMacros.targetProtein / totalTargetMacros,
    carbs: targetMacros.targetCarbs / totalTargetMacros,
    fat: targetMacros.targetFat / totalTargetMacros
  };
  
  const targetCalories = (targetMacros.targetProtein * 4) + (targetMacros.targetCarbs * 4) + (targetMacros.targetFat * 9);
  const categoryCalGoal = targetCalories / targetMacros.mealCount; // Calories per meal
  
  return recipes.map(recipe => {
    // Check if recipe has scalability data
    const scalability = (recipe as any).scalability || { protein: 0.5, carbs: 0.5, fat: 0.5 };
    
    // 1. Cosine similarity (40%)
    const totalRecipeMacros = recipe.base_protein + recipe.base_carbs + recipe.base_fat;
    let cosineSimilarity = 0;
    
    if (totalRecipeMacros > 0) {
      const normalizedRecipe = {
        protein: recipe.base_protein / totalRecipeMacros,
        carbs: recipe.base_carbs / totalRecipeMacros,
        fat: recipe.base_fat / totalRecipeMacros
      };
      
      // Dot product
      const dotProduct = (normalizedRecipe.protein * normalizedTarget.protein) + 
                       (normalizedRecipe.carbs * normalizedTarget.carbs) + 
                       (normalizedRecipe.fat * normalizedTarget.fat);
      
      // Norms
      const recipeNorm = Math.sqrt(
        normalizedRecipe.protein * normalizedRecipe.protein +
        normalizedRecipe.carbs * normalizedRecipe.carbs +
        normalizedRecipe.fat * normalizedRecipe.fat
      );
      const targetNorm = Math.sqrt(
        normalizedTarget.protein * normalizedTarget.protein +
        normalizedTarget.carbs * normalizedTarget.carbs +
        normalizedTarget.fat * normalizedTarget.fat
      );
      
      cosineSimilarity = (dotProduct / (recipeNorm * targetNorm)) * 100;
    }
    
    // 2. Weighted scalability (40%)
    const weightedSkala = (scalability.protein * normalizedTarget.protein) +
                         (scalability.carbs * normalizedTarget.carbs) +
                         (scalability.fat * normalizedTarget.fat);
    
    // 3. Size factor (20%) - how well recipe size matches category goal
    const sizeFactor = Math.min(1, recipe.base_calories / categoryCalGoal) * 100;
    
    // Final score: cosine_similarity * 40 + weighted_skala * 40 + size_factor * 20
    const score = (cosineSimilarity * 0.4) + (weightedSkala * 100 * 0.4) + (sizeFactor * 0.2);
    
    console.log(`Recipe ${recipe.recipe_name}: cosine=${cosineSimilarity.toFixed(1)}, weighted_skala=${(weightedSkala*100).toFixed(1)}, size=${sizeFactor.toFixed(1)}, score=${score.toFixed(1)}`);
    
    return { ...recipe, score: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.score - a.score);
}

// Simple scaling algorithm
function scaleRecipe(recipe: Recipe, targetMacros: number, currentMacros: number): number {
  if (currentMacros === 0) return 1;
  const ratio = targetMacros / currentMacros;
  return Math.max(0.5, Math.min(3.0, ratio)); // Limit scaling between 0.5x and 3x
}

// Generate meal combination for a specific attempt (with variation)
function generateMealCombination(
  mealStructure: string[], 
  recipesByCategory: Record<string, any[]>, 
  scoredRecipes: any[], 
  attempt: number
) {
  const mealCategoryMapping = {
    'Reggeli': 'reggeli',
    'Ebéd': 'ebéd', 
    'Vacsora': 'vacsora',
    'Tízórai': 'tízórai',
    'Uzsonna': 'uzsonna'
  };

  return mealStructure.map((categoryName, index) => {
    // Get recipes from this category, sorted by score
    const categoryRecipes = recipesByCategory[categoryName] || [];
    
    // For attempt 1, take the best recipe. For later attempts, try alternatives
    const recipeIndex = Math.min(attempt - 1, categoryRecipes.length - 1);
    let recipe = categoryRecipes[recipeIndex];
    
    // If no recipe in category or we've exhausted category recipes, try other options
    if (!recipe) {
      // Fallback: get from any category with decent score
      const availableRecipes = scoredRecipes.filter(r => r.score > 40);
      const fallbackIndex = (attempt - 1) % availableRecipes.length;
      recipe = availableRecipes[fallbackIndex] || scoredRecipes[0];
    }
    
    return { 
      mealType: mealCategoryMapping[categoryName] || categoryName.toLowerCase(), 
      recipe,
      requestedCategory: categoryName
    };
  });
}

// Scale and calculate macros for a meal combination using JS LP SOLVER
// Helper function to group ingredients by kotes (binding)
function groupIngredientsByKotes(ingredients: any[]): { groups: any[], independent: any[] } {
  const groups: Record<string, any[]> = {};
  const independent: any[] = [];
  
  ingredients.forEach((ingredient, index) => {
    let kotes = ingredient.kotes || ingredient.Kotes || '';
    const norm = String(kotes).trim().toLowerCase();
    if (norm === '' || norm === 'null' || norm === 'n/a' || norm === 'none') {
      kotes = '';
    }
    const ingredientId = ingredient.ingredient_id || index;
    
    if (kotes && kotes.trim() !== '') {
      // This ingredient is bound to others
      if (!groups[kotes]) {
        groups[kotes] = [];
      }
      groups[kotes].push({
        ...ingredient,
        ingredient_id: ingredientId
      });
    } else {
      // This ingredient is independent
      independent.push({
        ...ingredient,
        ingredient_id: ingredientId
      });
    }
  });
  
  return {
    groups: Object.entries(groups).map(([groupId, groupIngredients]) => ({
      group_id: groupId,
      ingredients: groupIngredients,
      shared_scale_factor: 1.0 // Will be calculated by LP solver
    })),
    independent: independent.map(ingredient => ({
      ...ingredient,
      individual_scale_factor: 1.0 // Will be calculated by LP solver
    }))
  };
}

function scaleAndCalculateMacros(
  mealCombination: any[], 
  targetPerMeal: any, 
  targetCalories: number, 
  request: any
) {
  console.log('🚀 INGREDIENT-LEVEL LP SOLVER SKÁLÁZÁS HASZNÁLVA!');
  
  // LP Variables: ingredient-level scale factors
  const variables: Record<string, any> = {};
  const constraints: Record<string, any> = {};
  
  // Process each meal for ingredient-level scaling
  mealCombination.forEach((meal, mealIndex) => {
    const recipe = meal.recipe;
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      // Group ingredients by kotes (binding)
      const { groups, independent } = groupIngredientsByKotes(recipe.ingredients);
      
      console.log(`📊 Recipe ${recipe.recipe_name}: ${groups.length} groups, ${independent.length} independent ingredients`);
      
      // Add variables for independent ingredients
      independent.forEach((ingredient, ingIndex) => {
        const varName = `meal_${mealIndex}_ind_${ingredient.ingredient_id}`;
        
        variables[varName] = {
          protein_target: ingredient.original_protein,
          carbs_target: ingredient.original_carbs,
          fat_target: ingredient.original_fat,
          [`${varName}_lower`]: 1
        };
        
        // Calculate ingredient-specific bounds based on density (gramm-alap)
          const qtyBase = (ingredient as any).original_quantity_g ?? ingredient.original_quantity;
          const proteinDensity = qtyBase > 0 ? (ingredient.original_protein / qtyBase) : 0;
          const carbsDensity = qtyBase > 0 ? (ingredient.original_carbs / qtyBase) : 0;
          const fatDensity = qtyBase > 0 ? (ingredient.original_fat / qtyBase) : 0;
        const isCondiment = isLikelyCondiment(ingredient.name, ingredient.original_unit, (ingredient as any).tipusNorm, ingredient.original_calories, ingredient.original_quantity);
        if (isCondiment) {
          // Teljesen fixáljuk: ne változtassa az LP
          constraints[`${varName}_upper`] = { [varName]: 1, max: 1.0 };
          constraints[`${varName}_lower`] = { [varName]: 1, min: 1.0 };
          return; // nincs további bound-számítás
        }
        // Speciális max skála ésszerű plafon (aromatics)
        const specificMax = getSpecificMaxScale(ingredient.name, ingredient.original_unit, (ingredient as any).tipusNorm);
        if (specificMax && Number.isFinite(specificMax)) {
          constraints[`${varName}_upper`] = { [varName]: 1, max: specificMax };
        }
        
        // Reference densities: P:20, C:50, F:15
        const maxProteinScale = Math.min(3.0, 20 / Math.max(1e-6, proteinDensity));
        const maxCarbsScale = Math.min(3.0, 50 / Math.max(1e-6, carbsDensity));
        const maxFatScale = Math.min(2.0, 15 / Math.max(1e-6, fatDensity));
        
        // no upper bound on ingredients (except condiments fixed at 1.0x)
        // Type-based lower bounds: fő makró hordozó ne mehessen le túl alacsonyra
        const tnorm = ((ingredient as any).tipusNorm || '').toUpperCase();
        const isFoMakro = tnorm.includes('FO_MAKRO');
        const minBound = isFoMakro ? 0.5 : 0.1;
        constraints[`${varName}_lower`] = { [varName]: 1, min: minBound };
      });
      
      // Add variables for bound groups
      groups.forEach((group, groupIndex) => {
        const varName = `meal_${mealIndex}_group_${group.group_id}`;
        
        // Calculate total macros for the group
        const groupProtein = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_protein, 0);
        const groupCarbs = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_carbs, 0);
        const groupFat = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_fat, 0);
        
        variables[varName] = {
          protein_target: groupProtein,
          carbs_target: groupCarbs,
          fat_target: groupFat,
          [`${varName}_lower`]: 1
        };
        
        // Calculate group-specific bounds
        const totalQuantity = group.ingredients.reduce((sum: number, ing: any) => sum + ((ing as any).original_quantity_g ?? ing.original_quantity), 0);
        const avgProteinDensity = groupProtein / totalQuantity;
        const avgCarbsDensity = groupCarbs / totalQuantity;
        const avgFatDensity = groupFat / totalQuantity;
        
        const maxProteinScale = Math.min(3.0, 20 / avgProteinDensity);
        const maxCarbsScale = Math.min(3.0, 50 / avgCarbsDensity);
        let maxFatScale = Math.min(2.0, 15 / avgFatDensity);
        // If group is fat-dominant, cap upper bound more aggressively
        const fatShare = groupFat / Math.max(1e-6, (groupProtein + groupCarbs + groupFat));
        if (fatShare > 0.6 || avgFatDensity > 0.25) {
          maxFatScale = Math.min(maxFatScale, 1.8);
        }
        
        // no upper bound on groups
        constraints[`${varName}_lower`] = { [varName]: 1, min: 0.5 };
      });

      // Add FO_MAKRO-style booster variables per meal (protein/carbs/fat)
      const mealPrefix = `meal_${mealIndex}`;
      // boosters disabled
    } else {
      // Fallback to recipe-level scaling if no ingredients available
      const varName = `scale_${mealIndex}`;
      
      variables[varName] = {
        protein_target: recipe.base_protein,
        carbs_target: recipe.base_carbs,
        fat_target: recipe.base_fat,
        [`scale_${mealIndex}_lower`]: 1,
        deviation_total: 1
      };
      
      const scalability = (recipe as any).scalability || { protein: 0.5, carbs: 0.5, fat: 0.5 };
      // no upper bound on recipe-level fallback scale
      constraints[`scale_${mealIndex}_lower`] = { [varName]: 1, min: 0.1 };
    }
  });
  
  // Add slack variables for deviation minimization
  let slackVars: string[] = ['protein_over', 'protein_under', 'carbs_over', 'carbs_under', 'fat_over', 'fat_under'];
  slackVars.forEach(slackVar => {
    variables[slackVar] = {
      deviation_total: 1, // Contribute to objective
      [slackVar.replace('_over', '_target').replace('_under', '_target')]: 1 // Contribute to target constraint
    };
  });
  
  // Build ingredient-level target constraints
  const proteinContributions: Record<string, number> = {};
  const carbsContributions: Record<string, number> = {};
  const fatContributions: Record<string, number> = {};
  const calorieContributions: Record<string, number> = {};
  
  mealCombination.forEach((meal, mealIndex) => {
    const recipe = meal.recipe;
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const { groups, independent } = groupIngredientsByKotes(recipe.ingredients);
      
      // Add independent ingredient contributions
      independent.forEach((ingredient) => {
        const varName = `meal_${mealIndex}_ind_${ingredient.ingredient_id}`;
        proteinContributions[varName] = ingredient.original_protein;
        carbsContributions[varName] = ingredient.original_carbs;
        fatContributions[varName] = ingredient.original_fat;
        calorieContributions[varName] = ingredient.original_calories;
      });
      
      // Add bound group contributions
      groups.forEach((group) => {
        const varName = `meal_${mealIndex}_group_${group.group_id}`;
        const groupProtein = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_protein, 0);
        const groupCarbs = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_carbs, 0);
        const groupFat = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_fat, 0);
        const groupCalories = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_calories, 0);
        
        proteinContributions[varName] = groupProtein;
        carbsContributions[varName] = groupCarbs;
        fatContributions[varName] = groupFat;
        calorieContributions[varName] = groupCalories;
      });

      // Booster contributions
      // boosters disabled
    } else {
      // Fallback to recipe-level
      const varName = `scale_${mealIndex}`;
      proteinContributions[varName] = recipe.base_protein;
      carbsContributions[varName] = recipe.base_carbs;
      fatContributions[varName] = recipe.base_fat;
      calorieContributions[varName] = recipe.base_calories;
    }
  });
  
  // Target macro constraints with ingredient-level contributions (95–105% band)
  constraints.protein_target = { 
    ...proteinContributions,
    min: request.targetProtein * 0.95,
    max: request.targetProtein * 1.05
  };
  
  constraints.carbs_target = {
    ...carbsContributions,
    min: request.targetCarbs * 0.95,
    max: request.targetCarbs * 1.05
  };
  
  constraints.fat_target = {
    ...fatContributions,
    min: request.targetFat * 0.95,
    max: request.targetFat * 1.05
  };

  // Per‑meal macro distribution constraints (replace calorie distribution)
  if (Array.isArray(mealCombination) && mealCombination.length > 0) {
    const mealCount = mealCombination.length;
    const presets: Record<number, Record<string, { percent: number; tol: number }>> = {
      1: { 'Ebéd': { percent: 100, tol: 0 } },
      2: { 'Ebéd': { percent: 60, tol: 10 }, 'Vacsora': { percent: 40, tol: 10 } },
      3: { 'Reggeli': { percent: 25, tol: 7 }, 'Ebéd': { percent: 45, tol: 10 }, 'Vacsora': { percent: 30, tol: 10 } },
      4: { 'Reggeli': { percent: 25, tol: 7 }, 'Tízórai': { percent: 10, tol: 7 }, 'Ebéd': { percent: 40, tol: 10 }, 'Vacsora': { percent: 25, tol: 10 } },
      5: { 'Reggeli': { percent: 20, tol: 7 }, 'Tízórai': { percent: 10, tol: 7 }, 'Ebéd': { percent: 35, tol: 10 }, 'Uzsonna': { percent: 10, tol: 7 }, 'Vacsora': { percent: 25, tol: 10 } }
    };
    const dist = presets[mealCount] || {};

    mealCombination.forEach((meal, mealIndex) => {
      const requested = meal.requestedCategory as string;
      const spec = dist[requested];
      if (!spec) return;
      const tol = (spec.tol ?? 10) / 100;

      const mealVarsP: Record<string, number> = {};
      const mealVarsC: Record<string, number> = {};
      const mealVarsF: Record<string, number> = {};

      if (meal.recipe.ingredients && meal.recipe.ingredients.length > 0) {
        const { groups, independent } = groupIngredientsByKotes(meal.recipe.ingredients);
        independent.forEach((ingredient) => {
          const varName = `meal_${mealIndex}_ind_${ingredient.ingredient_id}`;
          mealVarsP[varName] = ingredient.original_protein;
          mealVarsC[varName] = ingredient.original_carbs;
          mealVarsF[varName] = ingredient.original_fat;
        });
        groups.forEach((group) => {
          const varName = `meal_${mealIndex}_group_${group.group_id}`;
          const groupProtein = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_protein, 0);
          const groupCarbs = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_carbs, 0);
          const groupFat = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_fat, 0);
          mealVarsP[varName] = groupProtein;
          mealVarsC[varName] = groupCarbs;
          mealVarsF[varName] = groupFat;
        });
      } else {
        const varName = `scale_${mealIndex}`;
        mealVarsP[varName] = meal.recipe.base_protein;
        mealVarsC[varName] = meal.recipe.base_carbs;
        mealVarsF[varName] = meal.recipe.base_fat;
      }

      const pOver = `meal_${mealIndex}_p_over`, pUnder = `meal_${mealIndex}_p_under`;
      const cOver = `meal_${mealIndex}_c_over`, cUnder = `meal_${mealIndex}_c_under`;
      const fOver = `meal_${mealIndex}_f_over`, fUnder = `meal_${mealIndex}_f_under`;
      slackVars.push(pOver, pUnder, cOver, cUnder, fOver, fUnder);

      const pName = `meal_${mealIndex}_p_target`;
      const cName = `meal_${mealIndex}_c_target`;
      const fName = `meal_${mealIndex}_f_target`;

      Object.entries(mealVarsP).forEach(([varName, coeff]) => {
        if (!variables[varName]) variables[varName] = {};
        variables[varName][pName] = coeff;
      });
      Object.entries(mealVarsC).forEach(([varName, coeff]) => {
        if (!variables[varName]) variables[varName] = {};
        variables[varName][cName] = coeff;
      });
      Object.entries(mealVarsF).forEach(([varName, coeff]) => {
        if (!variables[varName]) variables[varName] = {};
        variables[varName][fName] = coeff;
      });

      // Macro-priority slack weights: prioritize fixing any UNDER first (C/P/F), and tolerate small OVER if other macros are still under
      variables[pOver]  = { deviation_total: 0.1, [pName]: 1 };
      variables[pUnder] = { deviation_total: 1.0, [pName]: -1 };
      variables[cOver]  = { deviation_total: 0.1, [cName]: 1 };
      variables[cUnder] = { deviation_total: 1.0, [cName]: -1 };
      variables[fOver]  = { deviation_total: 0.1, [fName]: 1 };
      variables[fUnder] = { deviation_total: 1.0, [fName]: -1 };

      constraints[pName] = {
        min: request.targetProtein * (spec.percent / 100) * (1 - tol),
        max: request.targetProtein * (spec.percent / 100) * (1 + tol),
      };
      constraints[cName] = {
        min: request.targetCarbs   * (spec.percent / 100) * (1 - tol),
        max: request.targetCarbs   * (spec.percent / 100) * (1 + tol),
      };
      constraints[fName] = {
        min: request.targetFat     * (spec.percent / 100) * (1 - tol),
        max: request.targetFat     * (spec.percent / 100) * (1 + tol),
      };
    });
  }
  
  // Slack variable bounds
  slackVars.forEach(slackVar => {
    constraints[slackVar] = { [slackVar]: 1, min: 0, max: request.targetProtein * 0.5 }; // Reasonable upper bound
  });
  
  // Objective: minimize total deviation
  variables.deviation_total = {
    protein_over: 1,
    protein_under: 1,
    carbs_over: 1,
    carbs_under: 1,
    fat_over: 1,
    fat_under: 1
  };
  
  try {
    // Solve LP problem with PROPER format
    const result = solver.Solve({
      optimize: 'deviation_total',
      opType: 'min',
      constraints,
      variables,
      ints: {},
      binaries: {},
      unrestricted: {}
    });
    
    console.log('✅ JS LP Solver result:', result);
    
    // Check if solution is feasible
    if (result.feasible === false) {
      console.warn('⚠️ LP infeasible, trying with relaxed constraints...');
      
      // Retry with relaxed constraints
      const relaxedConstraints = { ...constraints };
      slackVars.forEach(slackVar => {
        relaxedConstraints[slackVar] = { [slackVar]: 1, min: 0, max: request.targetProtein * 1.0 }; // Higher tolerance
      });
      
      const relaxedResult = solver.Solve({
        optimize: 'deviation_total',
        opType: 'min',
        constraints: relaxedConstraints,
        variables,
        ints: {},
        binaries: {},
        unrestricted: {}
      });
      
      if (relaxedResult.feasible === false) {
        throw new Error('LP infeasible even with relaxed constraints');
      }
      
      console.log('✅ JS LP Solver result (relaxed):', relaxedResult);
      
      // Apply relaxed solution
      const scaledMeals = mealCombination.map(({ mealType, recipe }, index) => {
        const varName = `scale_${index}`;
        const scaleFactor = relaxedResult[varName] || 1;
        
        const scaledMacros = {
          protein: recipe.base_protein * scaleFactor,
          carbs: recipe.base_carbs * scaleFactor,
          fat: recipe.base_fat * scaleFactor,
          calories: recipe.base_calories * scaleFactor
        };

        console.log(`✅ JS LP (relaxed): ${recipe.recipe_name}, Scale: ${scaleFactor.toFixed(2)}x`);

        // Calculate scaled ingredient details
        const scaledIngredientDetails = recipe.ingredients?.map(ingredient => ({
          name: ingredient.name,
          original_quantity: ingredient.original_quantity,
          original_unit: ingredient.original_unit,
          original_protein: ingredient.original_protein,
          original_carbs: ingredient.original_carbs,
          original_fat: ingredient.original_fat,
          original_calories: ingredient.original_calories,
          scaled_quantity: ingredient.original_quantity * scaleFactor,
          scaled_protein: ingredient.original_protein * scaleFactor,
          scaled_carbs: ingredient.original_carbs * scaleFactor,
          scaled_fat: ingredient.original_fat * scaleFactor,
          scaled_calories: ingredient.original_calories * scaleFactor
        })) || [];

        return {
          mealType,
          recipe,
          scaledMacros,
          scaleFactor: Math.round(scaleFactor * 100) / 100,
          ingredientDetails: scaledIngredientDetails
        };
      });

      // Calculate totals
      const totalMacros = scaledMeals.reduce((total, meal) => ({
        protein: total.protein + meal.scaledMacros.protein,
        carbs: total.carbs + meal.scaledMacros.carbs,
        fat: total.fat + meal.scaledMacros.fat,
        calories: total.calories + meal.scaledMacros.calories
      }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

      // Per-meal debug: scaled vs target and worst axis per meal
      try {
        const mealCount = mealCombination.length;
        const presets: Record<number, Record<string, { percent: number; tol: number }>> = {
          1: { 'Ebéd': { percent: 100, tol: 0 } },
          2: { 'Ebéd': { percent: 60, tol: 10 }, 'Vacsora': { percent: 40, tol: 10 } },
          3: { 'Reggeli': { percent: 25, tol: 7 }, 'Ebéd': { percent: 45, tol: 10 }, 'Vacsora': { percent: 30, tol: 10 } },
          4: { 'Reggeli': { percent: 25, tol: 7 }, 'Tízórai': { percent: 10, tol: 7 }, 'Ebéd': { percent: 40, tol: 10 }, 'Vacsora': { percent: 25, tol: 10 } },
          5: { 'Reggeli': { percent: 20, tol: 7 }, 'Tízórai': { percent: 10, tol: 7 }, 'Ebéd': { percent: 35, tol: 10 }, 'Uzsonna': { percent: 10, tol: 7 }, 'Vacsora': { percent: 25, tol: 10 } }
        };
        const dist = presets[mealCount] || {};
        scaledMeals.forEach((meal, i) => {
          const requested = (mealCombination[i] as any).requestedCategory as string;
          const percent = (dist[requested]?.percent ?? (100 / Math.max(1, mealCount)));
          const tP = request.targetProtein * (percent / 100);
          const tC = request.targetCarbs * (percent / 100);
          const tF = request.targetFat * (percent / 100);
          const dP = meal.scaledMacros.protein - tP;
          const dC = meal.scaledMacros.carbs - tC;
          const dF = meal.scaledMacros.fat - tF;
          const pP = tP > 0 ? Math.abs(dP) / tP * 100 : 0;
          const pC = tC > 0 ? Math.abs(dC) / tC * 100 : 0;
          const pF = tF > 0 ? Math.abs(dF) / tF * 100 : 0;
          const worst = ([['protein', pP], ['carbs', pC], ['fat', pF]] as Array<[string, number]>).sort((a,b)=>b[1]-a[1])[0];
          console.log(`🍽️ ${requested} — Scaled P/C/F: ${meal.scaledMacros.protein.toFixed(1)}/${meal.scaledMacros.carbs.toFixed(1)}/${meal.scaledMacros.fat.toFixed(1)} | Target: ${tP.toFixed(1)}/${tC.toFixed(1)}/${tF.toFixed(1)} | Dev% P/C/F: ${pP.toFixed(1)}/${pC.toFixed(1)}/${pF.toFixed(1)} | Worst=${worst[0]}(${(worst[1] as number).toFixed(1)}%)`);
        });
      } catch {}

      return { scaledMeals, totalMacros };
    }
    
    // Apply ingredient-level solution to meals
    const scaledMeals = mealCombination.map(({ mealType, recipe }, mealIndex) => {
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalCalories = 0;
      const scaledIngredientDetails: any[] = [];
      
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const { groups, independent } = groupIngredientsByKotes(recipe.ingredients);
        
        // Process independent ingredients
        independent.forEach((ingredient) => {
          const varName = `meal_${mealIndex}_ind_${ingredient.ingredient_id}`;
          const scaleFactor = result[varName] || 1;
          
          const scaledProtein = ingredient.original_protein * scaleFactor;
          const scaledCarbs = ingredient.original_carbs * scaleFactor;
          const scaledFat = ingredient.original_fat * scaleFactor;
          const scaledCalories = ingredient.original_calories * scaleFactor;
          const scaledQuantity = ingredient.original_quantity * scaleFactor;
          const baseQtyG = (ingredient as any).original_quantity_g ?? ingredient.original_quantity;
          
          totalProtein += scaledProtein;
          totalCarbs += scaledCarbs;
          totalFat += scaledFat;
          totalCalories += scaledCalories;
          
          // Rounding scaled quantity for realistic presentation
          // Kiegészítő maradjon változatlan; más esetben kerekítés + minimum lépés clamp
          let roundedQuantity = roundQuantitySmart(ingredient, scaledQuantity);
          const isCond = isLikelyCondiment(ingredient.name, ingredient.original_unit, (ingredient as any).tipusNorm, ingredient.original_calories, ingredient.original_quantity);
          if (isCond) {
            roundedQuantity = ingredient.original_quantity;
          } else if (roundedQuantity === 0 && scaledQuantity > 0) {
            roundedQuantity = minDisplayByUnit(ingredient.original_unit);
          }
          const ratio = scaledQuantity > 0 ? (roundedQuantity / scaledQuantity) : 1;
          
          scaledIngredientDetails.push({
            name: ingredient.name,
            original_quantity: ingredient.original_quantity,
            original_unit: ingredient.original_unit,
            original_quantity_g: baseQtyG,
            original_protein: ingredient.original_protein,
            original_carbs: ingredient.original_carbs,
            original_fat: ingredient.original_fat,
            original_calories: ingredient.original_calories,
            scaled_quantity: roundedQuantity,
            scaled_protein: scaledProtein * ratio,
            scaled_carbs: scaledCarbs * ratio,
            scaled_fat: scaledFat * ratio,
            scaled_calories: scaledCalories * ratio,
            scale_factor: scaleFactor
          });
          
          console.log(`✅ Ingredient ${ingredient.name}: ${scaleFactor.toFixed(2)}x`);
        });
        
        // Process bound groups
        groups.forEach((group) => {
          const varName = `meal_${mealIndex}_group_${group.group_id}`;
          const groupScaleFactor = result[varName] || 1;
          
          // Csoportos, közös kerekítés: pivot→S', majd minden tag kerekítése S' szerint
          if (group.ingredients.length > 0) {
            // 1) nyers skálázott mennyiségek
            const desired = group.ingredients.map(ing => ({
              ing,
              rawQty: ing.original_quantity * groupScaleFactor
            }));
            // 2) pivot: legnagyobb kalóriahatás
            desired.sort((a, b) => (b.ing.original_calories - a.ing.original_calories));
            const pivot = desired[0];
            const pivotStep = groupStepByUnit(pivot.ing.original_unit, pivot.rawQty);
            const pivotRounded = roundToStep(pivot.rawQty, pivotStep);
            const effectiveScale = pivot.ing.original_quantity > 0 ? (pivotRounded / pivot.ing.original_quantity) : groupScaleFactor;

            desired.forEach(({ ing, rawQty }) => {
              const scaledProtein = ing.original_protein * effectiveScale;
              const scaledCarbs = ing.original_carbs * effectiveScale;
              const scaledFat = ing.original_fat * effectiveScale;
              const scaledCalories = ing.original_calories * effectiveScale;
              const scaledQuantity = ing.original_quantity * effectiveScale;
              const baseQtyG = (ing as any).original_quantity_g ?? ing.original_quantity;
            
            totalProtein += scaledProtein;
            totalCarbs += scaledCarbs;
            totalFat += scaledFat;
            totalCalories += scaledCalories;
            
              let roundedQty = roundToStep(scaledQuantity, groupStepByUnit(ing.original_unit, scaledQuantity));
              const isCond = isLikelyCondiment(ing.name, ing.original_unit, (ing as any).tipusNorm, ing.original_calories, ing.original_quantity);
              if (isCond) {
                roundedQty = ing.original_quantity;
              } else if (roundedQty === 0 && scaledQuantity > 0) {
                roundedQty = minDisplayByUnit(ing.original_unit);
              }
              const r = scaledQuantity > 0 ? (roundedQty / scaledQuantity) : 1;
            scaledIngredientDetails.push({
                name: ing.name,
                original_quantity: ing.original_quantity,
                original_unit: ing.original_unit,
                original_quantity_g: baseQtyG,
                original_protein: ing.original_protein,
                original_carbs: ing.original_carbs,
                original_fat: ing.original_fat,
                original_calories: ing.original_calories,
                scaled_quantity: roundedQty,
                scaled_protein: scaledProtein * r,
                scaled_carbs: scaledCarbs * r,
                scaled_fat: scaledFat * r,
                scaled_calories: scaledCalories * r,
                scale_factor: effectiveScale,
              group_id: group.group_id
            });
          });
          }
          
          console.log(`✅ Group ${group.group_id}: ${groupScaleFactor.toFixed(2)}x`);
        });

        // Add booster contributions (from LP result) if enabled
        // boosters disabled
      } else {
        // Fallback to recipe-level scaling
        const varName = `scale_${mealIndex}`;
        const scaleFactor = result[varName] || 1;
        
        totalProtein = recipe.base_protein * scaleFactor;
        totalCarbs = recipe.base_carbs * scaleFactor;
        totalFat = recipe.base_fat * scaleFactor;
        totalCalories = recipe.base_calories * scaleFactor;
        
        console.log(`✅ Recipe-level: ${recipe.recipe_name}, Scale: ${scaleFactor.toFixed(2)}x`);
      }
      
      const scaledMacros = {
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        calories: totalCalories
      };
      
      // Calculate average scale factor for display
      const avgScaleFactor = scaledIngredientDetails.length > 0 
        ? scaledIngredientDetails.reduce((sum, ing) => sum + (ing.scale_factor || 1), 0) / scaledIngredientDetails.length
        : 1;

      return {
        mealType,
        recipe,
        scaledMacros,
        scaleFactor: Math.round(avgScaleFactor * 100) / 100,
        ingredientDetails: scaledIngredientDetails
      };
    });

    // Post-round booster correction disabled

    // Calculate totals (after post-round correction)
    const totalMacros = scaledMeals.reduce((total, meal) => ({
      protein: total.protein + meal.scaledMacros.protein,
      carbs: total.carbs + meal.scaledMacros.carbs,
      fat: total.fat + meal.scaledMacros.fat,
      calories: total.calories + meal.scaledMacros.calories
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

    // Per-meal debug: scaled vs target and worst axis per meal
    try {
      const mealCount = mealCombination.length;
      const presets: Record<number, Record<string, { percent: number; tol: number }>> = {
        1: { 'Ebéd': { percent: 100, tol: 0 } },
        2: { 'Ebéd': { percent: 60, tol: 10 }, 'Vacsora': { percent: 40, tol: 10 } },
        3: { 'Reggeli': { percent: 25, tol: 5 }, 'Ebéd': { percent: 45, tol: 10 }, 'Vacsora': { percent: 30, tol: 10 } },
        4: { 'Reggeli': { percent: 25, tol: 5 }, 'Tízórai': { percent: 10, tol: 5 }, 'Ebéd': { percent: 40, tol: 10 }, 'Vacsora': { percent: 25, tol: 10 } },
        5: { 'Reggeli': { percent: 20, tol: 5 }, 'Tízórai': { percent: 10, tol: 5 }, 'Ebéd': { percent: 35, tol: 10 }, 'Uzsonna': { percent: 10, tol: 5 }, 'Vacsora': { percent: 25, tol: 10 } }
      };
      const dist = presets[mealCount] || {};
      scaledMeals.forEach((meal, i) => {
        const requested = (mealCombination[i] as any).requestedCategory as string;
        const percent = (dist[requested]?.percent ?? (100 / Math.max(1, mealCount)));
        const tP = request.targetProtein * (percent / 100);
        const tC = request.targetCarbs * (percent / 100);
        const tF = request.targetFat * (percent / 100);
        const dP = meal.scaledMacros.protein - tP;
        const dC = meal.scaledMacros.carbs - tC;
        const dF = meal.scaledMacros.fat - tF;
        const pP = tP > 0 ? Math.abs(dP) / tP * 100 : 0;
        const pC = tC > 0 ? Math.abs(dC) / tC * 100 : 0;
        const pF = tF > 0 ? Math.abs(dF) / tF * 100 : 0;
        const worst = ([['protein', pP], ['carbs', pC], ['fat', pF]] as Array<[string, number]>).sort((a,b)=>b[1]-a[1])[0];
        console.log(`🍽️ ${requested} — Scaled P/C/F: ${meal.scaledMacros.protein.toFixed(1)}/${meal.scaledMacros.carbs.toFixed(1)}/${meal.scaledMacros.fat.toFixed(1)} | Target: ${tP.toFixed(1)}/${tC.toFixed(1)}/${tF.toFixed(1)} | Dev% P/C/F: ${pP.toFixed(1)}/${pC.toFixed(1)}/${pF.toFixed(1)} | Worst=${worst[0]}(${(worst[1] as number).toFixed(1)}%)`);
      });
    } catch {}

    return { scaledMeals, totalMacros };
    
  } catch (error) {
    console.warn('⚠️ Ingredient-level LP Solver failed, falling back to primitive scaling:', error);
    
    // Fallback to primitive ingredient-level scaling
    const scaledMeals = mealCombination.map(({ mealType, recipe }, mealIndex) => {
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalCalories = 0;
      const scaledIngredientDetails: any[] = [];
      
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const { groups, independent } = groupIngredientsByKotes(recipe.ingredients);
        
        // Process independent ingredients with density-based scaling
        independent.forEach((ingredient) => {
          const proteinDensity = ingredient.original_quantity > 0 ? (ingredient.original_protein / ingredient.original_quantity) : 0;
          const carbsDensity = ingredient.original_quantity > 0 ? (ingredient.original_carbs / ingredient.original_quantity) : 0;
          const fatDensity = ingredient.original_quantity > 0 ? (ingredient.original_fat / ingredient.original_quantity) : 0;
          
          // Calculate scale factors based on target needs and density
          const proteinScale = proteinDensity > 0 ? (targetPerMeal.protein / mealCombination.length) / proteinDensity : 1;
          const carbsScale = carbsDensity > 0 ? (targetPerMeal.carbs / mealCombination.length) / carbsDensity : 1;
          const fatScale = fatDensity > 0 ? (targetPerMeal.fat / mealCombination.length) / fatDensity : 1;
          
          const scaleFactor = Math.min(3.0, Math.max(0.1, (proteinScale + carbsScale + fatScale) / 3));
          
          const scaledProtein = ingredient.original_protein * scaleFactor;
          const scaledCarbs = ingredient.original_carbs * scaleFactor;
          const scaledFat = ingredient.original_fat * scaleFactor;
          const scaledCalories = ingredient.original_calories * scaleFactor;
          const scaledQuantity = ingredient.original_quantity * scaleFactor;
          
          totalProtein += scaledProtein;
          totalCarbs += scaledCarbs;
          totalFat += scaledFat;
          totalCalories += scaledCalories;
          
          let roundedIndQty = roundQuantitySmart(ingredient, scaledQuantity);
          const isCond = isLikelyCondiment(ingredient.name, ingredient.original_unit, (ingredient as any).tipusNorm, ingredient.original_calories, ingredient.original_quantity);
          if (isCond) {
            roundedIndQty = ingredient.original_quantity;
          } else if (roundedIndQty === 0 && scaledQuantity > 0) {
            roundedIndQty = minDisplayByUnit(ingredient.original_unit);
          }
          const rr = scaledQuantity > 0 ? (roundedIndQty / scaledQuantity) : 1;
          scaledIngredientDetails.push({
            name: ingredient.name,
            original_quantity: ingredient.original_quantity,
            original_unit: ingredient.original_unit,
            original_protein: ingredient.original_protein,
            original_carbs: ingredient.original_carbs,
            original_fat: ingredient.original_fat,
            original_calories: ingredient.original_calories,
            scaled_quantity: roundedIndQty,
            scaled_protein: scaledProtein * rr,
            scaled_carbs: scaledCarbs * rr,
            scaled_fat: scaledFat * rr,
            scaled_calories: scaledCalories * rr,
            scale_factor: scaleFactor
          });
          
          console.log(`⚠️ FALLBACK Ingredient ${ingredient.name}: ${scaleFactor.toFixed(2)}x`);
        });
        
        // Process bound groups with shared scaling
        groups.forEach((group) => {
          const groupProtein = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_protein, 0);
          const groupCarbs = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_carbs, 0);
          const groupFat = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_fat, 0);
          const totalQuantity = group.ingredients.reduce((sum: number, ing: any) => sum + ing.original_quantity, 0);
          
          const avgProteinDensity = groupProtein / totalQuantity;
          const avgCarbsDensity = groupCarbs / totalQuantity;
          const avgFatDensity = groupFat / totalQuantity;
          
          const proteinScale = avgProteinDensity > 0 ? (targetPerMeal.protein / mealCombination.length) / avgProteinDensity : 1;
          const carbsScale = avgCarbsDensity > 0 ? (targetPerMeal.carbs / mealCombination.length) / avgCarbsDensity : 1;
          const fatScale = avgFatDensity > 0 ? (targetPerMeal.fat / mealCombination.length) / avgFatDensity : 1;
          
          const groupScaleFactor = Math.min(3.0, Math.max(0.1, (proteinScale + carbsScale + fatScale) / 3));
          
          group.ingredients.forEach((ingredient) => {
            const scaledProtein = ingredient.original_protein * groupScaleFactor;
            const scaledCarbs = ingredient.original_carbs * groupScaleFactor;
            const scaledFat = ingredient.original_fat * groupScaleFactor;
            const scaledCalories = ingredient.original_calories * groupScaleFactor;
            const scaledQuantity = ingredient.original_quantity * groupScaleFactor;
            
            totalProtein += scaledProtein;
            totalCarbs += scaledCarbs;
            totalFat += scaledFat;
            totalCalories += scaledCalories;
            
            scaledIngredientDetails.push({
              name: ingredient.name,
              original_quantity: ingredient.original_quantity,
              original_unit: ingredient.original_unit,
              original_protein: ingredient.original_protein,
              original_carbs: ingredient.original_carbs,
              original_fat: ingredient.original_fat,
              original_calories: ingredient.original_calories,
            scaled_quantity: roundQuantitySmart(ingredient, scaledQuantity),
              scaled_protein: scaledProtein,
              scaled_carbs: scaledCarbs,
              scaled_fat: scaledFat,
              scaled_calories: scaledCalories,
              scale_factor: groupScaleFactor,
              group_id: group.group_id
            });
          });
          
          console.log(`⚠️ FALLBACK Group ${group.group_id}: ${groupScaleFactor.toFixed(2)}x`);
        });
      } else {
        // Fallback to recipe-level scaling
        const proteinScale = recipe.base_protein > 0 ? targetPerMeal.protein / recipe.base_protein : 1;
        const carbsScale = recipe.base_carbs > 0 ? targetPerMeal.carbs / recipe.base_carbs : 1;
        const fatScale = recipe.base_fat > 0 ? targetPerMeal.fat / recipe.base_fat : 1;
        const calorieScale = recipe.base_calories > 0 ? targetPerMeal.calories / recipe.base_calories : 1;
        
        const maxScale = Math.max(proteinScale, carbsScale, fatScale, calorieScale);
        const scaleFactor = Math.min(10, Math.max(1, maxScale));

        totalProtein = recipe.base_protein * scaleFactor;
        totalCarbs = recipe.base_carbs * scaleFactor;
        totalFat = recipe.base_fat * scaleFactor;
        totalCalories = recipe.base_calories * scaleFactor;
        
        console.log(`⚠️ FALLBACK Recipe-level: ${recipe.recipe_name}, Scale: ${scaleFactor}x`);
      }
      
      const scaledMacros = {
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        calories: totalCalories
      };
      
      // Calculate average scale factor for display
      const avgScaleFactor = scaledIngredientDetails.length > 0 
        ? scaledIngredientDetails.reduce((sum, ing) => sum + (ing.scale_factor || 1), 0) / scaledIngredientDetails.length
        : 1;

      return {
        mealType,
        recipe,
        scaledMacros,
        scaleFactor: Math.round(avgScaleFactor * 100) / 100,
        ingredientDetails: scaledIngredientDetails
      };
    });

    // Calculate totals
    const totalMacros = scaledMeals.reduce((total, meal) => ({
      protein: total.protein + meal.scaledMacros.protein,
      carbs: total.carbs + meal.scaledMacros.carbs,
      fat: total.fat + meal.scaledMacros.fat,
      calories: total.calories + meal.scaledMacros.calories
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

    return { scaledMeals, totalMacros };
  }
}

// Perform intelligent macro-based recipe swap
function performMacroSwap(
  currentSelection: any[], 
  worstMacro: string, 
  validRecipesByCategory: Record<string, any[]>, 
  allValidRecipes: any[],
  opts?: { sameLunchDinner?: boolean }
) {
  const newSelection = [...currentSelection];
  
  // Find meal with lowest contribution to the worst macro
  let worstMealIndex = 0;
  let lowestContribution = Infinity;
  
  currentSelection.forEach((meal, index) => {
    const recipe = meal.recipe;
    let macroContribution = 0;
    
    switch (worstMacro) {
      case 'protein':
        macroContribution = recipe.base_protein;
        break;
      case 'carbs':
        macroContribution = recipe.base_carbs;
        break;
      case 'fat':
        macroContribution = recipe.base_fat;
        break;
      case 'calories':
        macroContribution = recipe.base_calories;
        break;
    }
    
    if (macroContribution < lowestContribution) {
      lowestContribution = macroContribution;
      worstMealIndex = index;
    }
  });
  
  const targetCategory = currentSelection[worstMealIndex].requestedCategory;
  const categoryRecipes = validRecipesByCategory[targetCategory] || [];
  
  // Find alternative recipe with higher contribution to worst macro
  const currentRecipe = currentSelection[worstMealIndex].recipe;
  const alternatives = categoryRecipes.filter(r => r.recipe_id !== currentRecipe.recipe_id);
  
  // If no alternatives in category, try from other categories
  let finalAlternatives = alternatives;
  if (finalAlternatives.length === 0) {
    // Get all valid recipes except currently used ones
    const usedIds = currentSelection.map(m => m.recipe.recipe_id);
    finalAlternatives = allValidRecipes.filter(r => !usedIds.includes(r.recipe_id));
    console.log(`   ⚠️ No alternatives in ${targetCategory}, trying from all categories (${finalAlternatives.length} available)`);
  }
  
  if (finalAlternatives.length > 0) {
    // Sort by contribution to worst macro (descending)
    finalAlternatives.sort((a, b) => {
      let aContrib = 0, bContrib = 0;
      switch (worstMacro) {
        case 'protein':
          aContrib = a.base_protein;
          bContrib = b.base_protein;
          break;
        case 'carbs':
          aContrib = a.base_carbs;
          bContrib = b.base_carbs;
          break;
        case 'fat':
          aContrib = a.base_fat;
          bContrib = b.base_fat;
          break;
        case 'calories':
          aContrib = a.base_calories;
          bContrib = b.base_calories;
          break;
      }
      return bContrib - aContrib;
    });
    
    const newRecipe = finalAlternatives[0];
    newSelection[worstMealIndex] = {
      ...currentSelection[worstMealIndex],
      recipe: newRecipe
    };
    
    // Mirror lunch<->dinner if requested
    if (opts?.sameLunchDinner && (targetCategory === 'Ebéd' || targetCategory === 'Vacsora')) {
      const partnerCategory = targetCategory === 'Ebéd' ? 'Vacsora' : 'Ebéd';
      const partnerIndex = newSelection.findIndex(m => m.requestedCategory === partnerCategory);
      if (partnerIndex >= 0) {
        newSelection[partnerIndex] = {
          ...newSelection[partnerIndex],
          recipe: newRecipe
        };
      }
    }

    console.log(`   🔄 Csere: ${currentRecipe.recipe_name} → ${newRecipe.recipe_name} (${worstMacro} javítás)`);
  }
  
  return newSelection;
}

// Helper function to log detailed ingredient information
function logDetailedIngredientInfo(meals: any[], title: string) {
  console.log(`\n📋 ${title.toUpperCase()} - DETAILED INGREDIENT BREAKDOWN:`);
  
  meals.forEach((meal, mealIndex) => {
    console.log(`\n🍽️ MEAL ${mealIndex + 1}: ${meal.recipe.recipe_name} (${meal.mealType})`);
    console.log(`   Scale Factor: ${meal.scaleFactor}x`);
    console.log(`   Recipe Macros: P=${meal.recipe.base_protein}g, C=${meal.recipe.base_carbs}g, F=${meal.recipe.base_fat}g, Cal=${meal.recipe.base_calories}kcal`);
    console.log(`   Scaled Macros: P=${meal.scaledMacros.protein.toFixed(1)}g, C=${meal.scaledMacros.carbs.toFixed(1)}g, F=${meal.scaledMacros.fat.toFixed(1)}g, Cal=${meal.scaledMacros.calories.toFixed(1)}kcal`);
    
    if (meal.ingredientDetails && meal.ingredientDetails.length > 0) {
      console.log(`   📝 INGREDIENTS:`);
      meal.ingredientDetails.forEach((ingredient: any, ingIndex: number) => {
        console.log(`      ${ingIndex + 1}. ${ingredient.name}:`);
        console.log(`         Original: ${ingredient.original_quantity}${ingredient.original_unit} → P:${ingredient.original_protein.toFixed(1)}g, C:${ingredient.original_carbs.toFixed(1)}g, F:${ingredient.original_fat.toFixed(1)}g, Cal:${ingredient.original_calories.toFixed(1)}kcal`);
        console.log(`         Scaled:   ${ingredient.scaled_quantity.toFixed(1)}${ingredient.original_unit} → P:${ingredient.scaled_protein.toFixed(1)}g, C:${ingredient.scaled_carbs.toFixed(1)}g, F:${ingredient.scaled_fat.toFixed(1)}g, Cal:${ingredient.scaled_calories.toFixed(1)}kcal`);
      });
    } else {
      console.log(`   ⚠️ No detailed ingredient data available`);
    }
  });
}

export async function generateDirectMealPlan(request: DirectMealPlanRequest): Promise<MealPlan> {
  const startTime = Date.now();
  
  // Helper function to extract numbers from string formats like "22,3 g" or "197 / 5"
  const extractNumber = (value: string): number => {
    if (!value) return 0;
    
    // Handle "X / Y" format (take the first number)
    if (value.toString().includes('/')) {
      const parts = value.toString().split('/');
      const firstPart = parts[0].trim();
      const cleaned = firstPart.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Handle normal format
    const cleaned = value.toString().replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  try {
    console.log('🚀 Starting direct meal plan generation...', request);

    // NETWORK CHECK: Skip database entirely if network fails
    console.log('🌐 Checking network connectivity to Supabase...');
    
    let recipes: Recipe[] = [];
    let useRealData = false;
    
    try {
      // Quick connectivity test
      const testResponse = await fetch('https://hhjucbkqyamutshfspyf.supabase.co/rest/v1/receptek?select=count', {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (testResponse.ok) {
        console.log('✅ Network OK, trying database queries...');
        useRealData = true;
      } else {
        throw new Error('Network test failed');
      }
    } catch (networkError) {
      console.warn('🚨 NETWORK ISSUE DETECTED - Using local development mode', networkError);
      useRealData = false;
    }
    
    if (useRealData) {
      try {
        // Skip RPC, go directly to simple table query for now
        console.log('📊 Using direct table query (RPC functions not deployed)...');
        const { data, error } = { data: null, error: { message: 'Skipping RPC' } };

        if (error) {
          console.warn('⚠️ Skipping RPC, trying simple table query...', error);
          
          // Fallback: try simple table query
          console.log('🔄 Trying simple receptek table query...');
          const { data: simpleData, error: simpleError } = await supabase
            .from('receptek')
            .select('*');
          
          console.log('📊 Simple query result:', { 
            dataCount: simpleData?.length || 0, 
            error: simpleError?.message || 'none',
            firstRecipe: simpleData?.[0] ? Object.keys(simpleData[0]) : 'no data'
          });
          
          // DEBUG: Check recipe names
          if (simpleData && simpleData.length > 0) {
            console.log('🔍 First 5 recipe names:', simpleData.slice(0, 5).map(recipe => ({
              id: recipe['Recept ID'],
              name: recipe['Receptnév'] || recipe['Recept neve'] || 'No name'
            })));
          }
          
          // DEBUG: Check if Étkezés field exists
          if (simpleData?.[0]) {
            console.log('🔍 First recipe keys:', Object.keys(simpleData[0]));
            console.log('🔍 Étkezés field value:', simpleData[0]['Étkezés']);
            console.log('🔍 All potential meal fields:', {
              Etkez: simpleData[0]['Etkez'],
              Étkezés: simpleData[0]['Étkezés'],
              etkez: simpleData[0]['etkez'],
              étkezés: simpleData[0]['étkezés'],
              'Étkezés ID': simpleData[0]['Étkezés ID'],
              'Etkez ID': simpleData[0]['Etkez ID']
            });
          }

          if (simpleError) {
            console.error('❌ Simple query also failed:', simpleError);
            throw new Error(`Database connection failed: ${simpleError.message}`);
          }

        // Convert simple data to recipe format with MEAL CATEGORIES
        console.log('🔄 Calculating real macros from recipe ingredients with meal categories...');
        
        // Get meal categories first
        const { data: mealCategories, error: mealError } = await supabase
          .from('Étkezések')
          .select('*');
          
        console.log('🍽️ Meal categories loaded:', mealCategories?.length || 0);
        
        // DEBUG: Check meal categories structure
        if (mealCategories?.[0]) {
          console.log('🔍 Meal category sample:', Object.keys(mealCategories[0]));
          console.log('🔍 First meal category:', mealCategories[0]);
          console.log('🔍 Total meal categories loaded:', mealCategories.length);
          
          // Check what meal types are available
          const mealTypesAvailable = mealCategories.filter(cat => 
            cat['Reggeli'] === 'X' || cat['Tízórai'] === 'X' || cat['Ebéd'] === 'X' || 
            cat['Uzsonna'] === 'X' || cat['Vacsora'] === 'X'
          );
          console.log('🔍 Meal categories with meal types:', mealTypesAvailable.length);
        }
        
        // We'll need to get ingredient data for each recipe to calculate real macros
        // Process ALL available recipes with optimized batching
        const totalAvailableRecipes = simpleData?.length || 0;
        const limitedRecipes = simpleData || [];
        console.log(`📊 Processing ${limitedRecipes.length} recipes (of ${totalAvailableRecipes} available)`);
        
        const recipePromises = limitedRecipes.map(async (recipe: any) => {
          try {
            // Get ingredients for this recipe - using manual JOIN
            const { data: ingredients, error: ingError } = await supabase
              .from('recept_alapanyag')
              .select('*')
              .eq('Recept_ID', recipe['Recept ID']);
              
            if (ingError || !ingredients || ingredients.length === 0) {
              console.warn(`No ingredients found for recipe ${recipe['Recept ID']}`);
              return null;
            }

            // Debug: nézzük meg mit tartalmaznak az ingredient ID-k
            console.log(`🔍 TIMESTAMP ${Date.now()} Recipe ${recipe['Recept ID']} ingredients:`);
            ingredients.forEach((ing, index) => {
              console.log(`  Ingredient ${index}:`);
              console.log(`    All keys:`, Object.keys(ing));
              console.log(`    Élelmiszer ID:`, ing['Élelmiszer ID']);
              console.log(`    Raw values:`, ing);
            });



                         // Get nutrition data for each ingredient (BATCH QUERY OPTIMIZATION)
             const nutritionPromises = [];
             
             // Diagnostics counters per recipe
             let invalidIdCount = 0;
             let zeroQtyCount = 0;
             let missingNutritionCount = 0;
             let scannedCount = 0;
             let boundCountDiag = 0;
             let independentCountDiag = 0;
             
             // Robust ingredient ID extractor supporting multiple possible column names
             const getRawIngredientId = (row: any): string | number | null => {
               if (!row || typeof row !== 'object') return null;
               const candidateKeys = [
                 'Élelmiszer ID', 'Elelmiszer ID', 'Elelmiszer_ID', 'Élelmiszer_ID',
                 'Alapanyag ID', 'Alapanyag_ID', 'AlapanyagID', 'alapanyag_id',
                 'Alapanyag Id', 'Alapanyag azonosító', 'Alapanyag azonosito',
                 'Ingredient ID', 'Ingredient_ID', 'ingredient_id'
               ];
               for (const key of candidateKeys) {
                 if (key in row && row[key] != null && row[key] !== '') {
                   return row[key];
                 }
               }
               return null;
             };

             // Robust quantity extractor
             const getRawQuantity = (row: any): string | number | null => {
               if (!row || typeof row !== 'object') return null;
               const candidateKeys = [
                 'Mennyiség', 'Mennyiseg', 'Menny.', 'Menny', 'Mennyiség (g)', 'Mennyiseg (g)',
                 'Mennyiseg_g', 'Mennyiség_g', 'Mennyiseg_ml', 'Mennyiség_ml'
               ];
               for (const key of candidateKeys) {
                 if (key in row && row[key] != null && row[key] !== '') {
                   return row[key];
                 }
               }
               return row['Mennyiség'];
             };

             // Extract all valid ingredient IDs
             const validIngredients = ingredients.filter(ing => {
               const rawId = getRawIngredientId(ing);
               const ingredientId = extractNumber(String(rawId ?? ''));
               console.log(`🔍 Ingredient lookup: raw_id="${rawId}", extracted_id=${ingredientId}`);
               if (ingredientId === 0) {
                 console.warn(`⚠️ Invalid ingredient ID from row (keys: ${Object.keys(ing).join(', ')}): ${rawId}`);
                 invalidIdCount++;
                 nutritionPromises.push(Promise.resolve({ ...ing, nutrition: null }));
                 return false;
               }
               return true;
             });
             
             if (validIngredients.length > 0) {
               // Get all unique ingredient IDs
               const ingredientIds = [...new Set(validIngredients.map(ing => {
                 const rawId = getRawIngredientId(ing);
                 return extractNumber(String(rawId ?? ''));
               }))];
               console.log(`🔍 Batch nutrition lookup for ${ingredientIds.length} unique ingredients`);
               
                               try {
                  // Single batch query for all ingredients with retry mechanism
                  let allNutrition = null;
                  let error = null;
                  
                                     for (let retry = 0; retry < 2; retry++) { // Reduced from 3 to 2 retries
                     try {
                       const result = await supabase
                         .from('alapanyag')
                         .select('ID, "Fehérje/100g", "Szénhidrát/100g", "Zsir/100g", "Kaloria/100g"')
                         .in('ID', ingredientIds);
                       
                       allNutrition = result.data;
                       error = result.error;
                       
                       if (!error) break; // Success, exit retry loop
                       
                       console.warn(`⚠️ Batch nutrition lookup attempt ${retry + 1} failed:`, error);
                       if (retry < 1) {
                         await new Promise(resolve => setTimeout(resolve, 500 * (retry + 1))); // Reduced exponential backoff
                       }
                     } catch (retryError) {
                       console.warn(`⚠️ Batch nutrition lookup retry ${retry + 1} error:`, retryError);
                       if (retry < 1) {
                         await new Promise(resolve => setTimeout(resolve, 500 * (retry + 1)));
                       }
                     }
                   }
                   
                 if (error) {
                   console.warn(`⚠️ Batch nutrition lookup failed:`, error);
                                       // Fallback to individual queries with optimized frequency
                    const fallbackIngredients = validIngredients.slice(0, 8); // Increased from 5 to 8 ingredients
                    console.log(`⚠️ Using fallback for ${fallbackIngredients.length} ingredients`);
                    
                    fallbackIngredients.forEach((ing, index) => {
              const delay = 0;
                      const promise = new Promise(resolve => {
                        setTimeout(async () => {
                           try {
                            const rawId = getRawIngredientId(ing);
                            const ingredientId = extractNumber(String(rawId ?? ''));
                            const { data: nutrition, error: singleError } = await supabase
                              .from('alapanyag')
                              .select('"Fehérje/100g", "Szénhidrát/100g", "Zsir/100g", "Kaloria/100g"')
                              .eq('ID', ingredientId)
                              .single();
                              
                            if (singleError) {
                              console.warn(`⚠️ Single nutrition lookup failed for ID ${ingredientId}:`, singleError);
                              resolve({ ...ing, nutrition: null });
                            } else {
                              resolve({ ...ing, nutrition });
                            }
                          } catch (err) {
                            console.warn(`⚠️ Single nutrition lookup error for ID ${ing['Élelmiszer ID']}:`, err);
                            resolve({ ...ing, nutrition: null });
                          }
                        }, delay);
                      });
                      nutritionPromises.push(promise);
                    });
                 } else {
                   // Create a map for quick lookup
                   const nutritionMap = new Map();
                   allNutrition?.forEach(nutrition => {
                     nutritionMap.set(nutrition.ID, nutrition);
                   });
                   
                  // Match ingredients with their nutrition data
                  validIngredients.forEach(ing => {
                    const rawId = getRawIngredientId(ing);
                    const ingredientId = extractNumber(String(rawId ?? ''));
                    const nutrition = nutritionMap.get(ingredientId);
                      if (!nutrition) missingNutritionCount++;
                    nutritionPromises.push(Promise.resolve({ ...ing, nutrition }));
                  });
                 }
                                } catch (err) {
                   console.warn(`⚠️ Batch nutrition lookup error:`, err);
                   // Fallback to individual queries with optimized frequency
                   const fallbackIngredients = validIngredients.slice(0, 6); // Increased from 3 to 6 ingredients
                   console.log(`⚠️ Using fallback for ${fallbackIngredients.length} ingredients (error case)`);
                   
                   fallbackIngredients.forEach((ing, index) => {
                      const delay = 0;
                     const promise = new Promise(resolve => {
                       setTimeout(async () => {
                           try {
                            const rawId = getRawIngredientId(ing);
                            const ingredientId = extractNumber(String(rawId ?? ''));
                           const { data: nutrition, error: singleError } = await supabase
                             .from('alapanyag')
                             .select('"Fehérje/100g", "Szénhidrát/100g", "Zsir/100g", "Kaloria/100g"')
                             .eq('ID', ingredientId)
                             .single();
                             
                           if (singleError) {
                             console.warn(`⚠️ Single nutrition lookup failed for ID ${ingredientId}:`, singleError);
                             resolve({ ...ing, nutrition: null });
                           } else {
                             resolve({ ...ing, nutrition });
                           }
                         } catch (err) {
                           console.warn(`⚠️ Single nutrition lookup error for ID ${ing['Élelmiszer ID']}:`, err);
                           resolve({ ...ing, nutrition: null });
                         }
                       }, delay);
                     });
                     nutritionPromises.push(promise);
                   });
                 }
             }
            
            const enrichedIngredients = await Promise.all(nutritionPromises);

            // Calculate real macros and scalability from enriched ingredients
            let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;
            let independentProtein = 0, independentCarbs = 0, independentFat = 0;
            let boundProtein = 0, boundCarbs = 0, boundFat = 0;
            let densityPValues: number[] = [], densityCValues: number[] = [], densityFValues: number[] = [];
            let ingredientCount = 0;
            let detailedIngredients: Array<{
              name: string;
              original_quantity: number;
              original_unit: string;
              original_protein: number;
              original_carbs: number;
              original_fat: number;
              original_calories: number;
              kotes?: string;
              ingredient_id?: number;
            }> = [];
            
            // Recipe-level flags and exclusions
            let hasFoMakroType = false;
            const EXCLUDED_TYPES = new Set(['ÍZESÍTŐ','IZESITO','KIEGÉSZÍTŐ','KIEGESZITO','VÍZ','VIZ','ALAPLÉ','ALAPLE']);

            enrichedIngredients.forEach((ing: any) => {
              scannedCount++;
              const rawQty = getRawQuantity(ing);
              const originalUnit = String(ing['Mértékegység'] || 'g');
              const displayQuantity = extractNumber(String(rawQty ?? ''));
              // Grammban számolt mennyiség a makrókhoz
              let quantityG = displayQuantity;
              const unitRaw = originalUnit.toLowerCase();
              if (/(^|\b)(db|darab)(\b|$)/.test(unitRaw)) {
                const name = String(ing['Élelmiszerek'] || '').toLowerCase();
                // Tojás ~55g, avokádó ~200g, paradicsom ~120g, paprika ~100g, nori ~3g
                const perUnit = name.includes('tojás') || name.includes('tojas') ? 55
                  : name.includes('avok') ? 200
                  : name.includes('paradicsom') ? 120
                  : name.includes('paprika') ? 100
                  : name.includes('nori') ? 3
                  : 55; // default
                quantityG = displayQuantity * perUnit;
              }
              const nutrition = ing.nutrition;
              const tipusRaw = (ing['Tipus'] || '').toString();
              const tipusNorm = tipusRaw.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
              if (tipusNorm.includes('FO_MAKRO') || tipusNorm.includes('FOMAKRO') || tipusNorm.includes('FŐ_MAKRO')) {
                hasFoMakroType = true;
              }
              
              if (nutrition && quantityG > 0) {
                const protein = extractNumber(nutrition['Fehérje/100g']);
                const carbs = extractNumber(nutrition['Szénhidrát/100g']);
                const fat = extractNumber(nutrition['Zsir/100g']);
                const calories = extractNumber(nutrition['Kaloria/100g']);
                
                const proteinContrib = (protein * quantityG) / 100;
                const carbsContrib = (carbs * quantityG) / 100;
                const fatContrib = (fat * quantityG) / 100;
                const caloriesContrib = (calories * quantityG) / 100;
                
                totalProtein += proteinContrib;
                totalCarbs += carbsContrib;
                totalFat += fatContrib;
                totalCalories += caloriesContrib;
                
                // Store detailed ingredient information
                detailedIngredients.push({
                  name: ing['Élelmiszerek'] || `Ingredient ${ingredientCount + 1}`,
                  original_quantity: displayQuantity, // megjelenítési egységben
                  original_unit: originalUnit,
                  original_protein: proteinContrib,
                  original_carbs: carbsContrib,
                  original_fat: fatContrib,
                  original_calories: caloriesContrib,
                  kotes: ing['Kotes'] || '', // Kötés az alapanyagok között
                  ingredient_id: ingredientCount // Egyedi azonosító
                });
                
                // Calculate scalability: independent vs bound ingredients
                const kotesRaw = ing['Kotes'] || ing['Kötés'] || '';
                const isBound = (() => {
                  if (kotesRaw == null) return false;
                  if (typeof kotesRaw === 'string') {
                    const v = kotesRaw.trim().toLowerCase();
                    if (v === '' || v === 'null' || v === 'none' || v === 'n/a') return false;
                    return true;
                  }
                  return Boolean(kotesRaw);
                })();
                const isExcludedType = EXCLUDED_TYPES.has(tipusNorm);
                if (!isExcludedType && isBound) {
                  boundProtein += proteinContrib;
                  boundCarbs += carbsContrib;
                  boundFat += fatContrib;
                  boundCountDiag++;
                } else if (!isExcludedType) {
                  independentProtein += proteinContrib;
                  independentCarbs += carbsContrib;
                  independentFat += fatContrib;
                  independentCountDiag++;
                }
                
                // Calculate density (macro per 100g) - store individual values for MAXIMUM logic
                if (!isExcludedType) {
                  densityPValues.push(protein);
                  densityCValues.push(carbs);
                  densityFValues.push(fat);
                }
                ingredientCount++;
              } else {
                if (quantityG <= 0) zeroQtyCount++;
                if (!nutrition) missingNutritionCount++;
              }
            });

            // Apply recipe-level independence if FŐ_MAKRO present
            if (hasFoMakroType && totalProtein + totalCarbs + totalFat > 0) {
              independentProtein = totalProtein;
              independentCarbs = totalCarbs;
              independentFat = totalFat;
              boundProtein = 0;
              boundCarbs = 0;
              boundFat = 0;
              console.log('🔧 Recipe-level independence applied (FŐ_MAKRO present)');
            }

            // Diagnostics summary for this recipe
            console.log('🧪 Ingredient diagnostics summary:', {
              recipeId: recipe['Recept ID'],
              scanned: scannedCount,
              invalid_id: invalidIdCount,
              zero_quantity: zeroQtyCount,
              missing_nutrition: missingNutritionCount,
              bound_items: boundCountDiag,
              independent_items: independentCountDiag
            });
            
                                     // Calculate scalability per macro (SPECIFICATION VERSION)
            const calculateScalability = (independent: number, bound: number, total: number, maxDensity: number, refDensity: number, isPureFat = false) => {
              if (total === 0) return 0;
              
              // Calculate ratios
              const independentRatio = independent / total;
              const boundRatio = bound / total;
              
              // original_skala_M = independent_ratio_M * 0.7 + (1 - bound_ratio_M) * 0.3
              const originalSkala = independentRatio * 0.7 + (1 - boundRatio) * 0.3;
              
              // new_skala_M = original_skala_M * (density_M / reference_density)
              let newSkala = originalSkala * (maxDensity / refDensity);
              
              // cap at 1.0
              newSkala = Math.min(1.0, newSkala);
              
              // For F: If density_F >80 (pure fat like oil), new_skala_F *=0.5
              if (isPureFat && maxDensity > 80) {
                newSkala *= 0.5;
              }
              
              return newSkala;
            };
            
            // MAXIMUM LOGIKA: A legmagasabb sűrűségű alapanyag határozza meg a skálázhatóságot
            const maxDensityP = Math.max(...densityPValues);
            const maxDensityC = Math.max(...densityCValues);
            const maxDensityF = Math.max(...densityFValues);
            
            const skalaP = calculateScalability(independentProtein, boundProtein, totalProtein, maxDensityP, 20);
            const skalaC = calculateScalability(independentCarbs, boundCarbs, totalCarbs, maxDensityC, 50);
            const skalaF = calculateScalability(independentFat, boundFat, totalFat, maxDensityF, 15, true);
            
            console.log(`Recipe ${recipe['Recept ID']} scalability: P=${skalaP.toFixed(2)}, C=${skalaC.toFixed(2)}, F=${skalaF.toFixed(2)}`);

            // Find meal category for this recipe
            // Prefer matching by Recept ID if present in categories, otherwise fallback to name
            const recipeName = recipe['Receptnév'] || recipe['Recept neve'] || `Recipe ${recipe['Recept ID']}`;
            
            // DEBUG: Log recipe name and available meal category names
            console.log(`🔍 Recipe name: "${recipeName}"`);
            if (mealCategories && mealCategories.length > 0) {
              console.log(`🔍 Available meal category names (first 5):`, mealCategories.slice(0, 5).map(cat => cat['Recept Neve']));
            }
            
            let matchingMealCategory = null as any;
            if (mealCategories) {
              // Try ID-based matching if category table contains Recept ID column
              const idKeyOptions = ['Recept ID', 'Recept_ID', 'Recipe ID', 'Recipe_ID'];
              const categoryHasId = Object.keys(mealCategories[0] || {}).some(k => idKeyOptions.includes(k));
              if (categoryHasId) {
                const catIdKey = Object.keys(mealCategories[0]).find(k => idKeyOptions.includes(k)) as string | undefined;
                if (catIdKey) {
                  const wantedId = recipe['Recept ID'];
                  matchingMealCategory = mealCategories.find(cat => cat[catIdKey] === wantedId) || null;
                }
              }
              // Fallback to exact name match
              if (!matchingMealCategory) {
                matchingMealCategory = mealCategories.find(cat => cat['Recept Neve'] === recipeName) || null;
              }
              // Fallback to partial name match (case-insensitive)
              if (!matchingMealCategory) {
                matchingMealCategory = mealCategories.find(cat => 
                  cat['Recept Neve'] && recipeName && 
                  (String(cat['Recept Neve']).toLowerCase().includes(String(recipeName).toLowerCase()) ||
                   String(recipeName).toLowerCase().includes(String(cat['Recept Neve']).toLowerCase()))
                ) || null;
              }
            }
            
            // Determine which meal types this recipe belongs to
            const mealTypes = [];
            if (matchingMealCategory) {
              if (matchingMealCategory['Reggeli'] === 'X') mealTypes.push('Reggeli');
              if (matchingMealCategory['Tízórai'] === 'X') mealTypes.push('Tízórai');
              if (matchingMealCategory['Ebéd'] === 'X') mealTypes.push('Ebéd');
              if (matchingMealCategory['Uzsonna'] === 'X') mealTypes.push('Uzsonna');
              if (matchingMealCategory['Vacsora'] === 'X') mealTypes.push('Vacsora');
            }

            // If DB marks recipe as Snack, ensure it is at least a Tízórai/Uzsonna candidate
            const scalabilityTag = recipe['Recept_Skálázhatóság'] || recipe['Recept Skálázhatóság'] || recipe['Recept_Skalazhatósag'] || recipe['Recept_Skalazhatoseg'];
            if ((!matchingMealCategory || mealTypes.length === 0) && typeof scalabilityTag === 'string') {
              const tagLower = scalabilityTag.toLowerCase();
              if (tagLower.includes('snack')) {
                if (!mealTypes.includes('Tízórai')) mealTypes.push('Tízórai');
                if (!mealTypes.includes('Uzsonna')) mealTypes.push('Uzsonna');
              }
            }
            
            // Primary category is the first one, or 'egyéb' if none
            const categoryName = mealTypes.length > 0 ? mealTypes[0] : 'egyéb';
            
            console.log(`Recipe ${recipeName} - Meal types: [${mealTypes.join(', ')}], Primary: ${categoryName}`);
            if (matchingMealCategory) {
              console.log(`✅ Found matching meal category: "${matchingMealCategory['Recept Neve']}"`);
            } else {
              console.log(`❌ No matching meal category found for: "${recipeName}"`);
            }

            return {
              recipe_id: recipe['Recept ID'],
              recipe_name: recipeName,
              category: categoryName,
              meal_types: mealTypes,
              base_protein: Math.round(totalProtein * 10) / 10,
              base_carbs: Math.round(totalCarbs * 10) / 10,
              base_fat: Math.round(totalFat * 10) / 10,
              base_calories: Math.round(totalCalories * 10) / 10,
              ingredients: detailedIngredients,
              scalability: {
                protein: Math.round(skalaP * 100) / 100,
                carbs: Math.round(skalaC * 100) / 100,
                fat: Math.round(skalaF * 100) / 100
              },
              scalability_tag: scalabilityTag || null
            };
          } catch (error) {
            console.warn(`Error calculating macros for recipe ${recipe['Recept ID']}:`, error);
            return null;
          }
        }) || [];

        // Process recipes in optimized batches
        // Dynamically size batches to target ~12 batches total
        const targetBatches = 6;
        const batchSize = Math.max(1, Math.ceil(recipePromises.length / targetBatches));
        const calculatedRecipes: any[] = [];
        
        for (let i = 0; i < recipePromises.length; i += batchSize) {
          const batch = recipePromises.slice(i, i + batchSize);
          console.log(`📦 Processing recipe batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recipePromises.length / batchSize)}`);
          
          const batchResults = await Promise.all(batch);
          calculatedRecipes.push(...batchResults);
          
          // No artificial delay between batches
        }
        
        recipes = calculatedRecipes.filter(r => r !== null && r.base_calories > 0) as Recipe[];

        console.log(`✅ Using ${recipes.length} recipes with REAL calculated macros (${Math.round(recipes.length / 50 * 100)}% of available recipes)`);
        } else {
          recipes = data || [];
          console.log(`✅ Found ${recipes.length} recipes from RPC`);
        }
      } catch (fetchError) {
        console.error('❌ Database queries failed, falling back to local mode:', fetchError);
        useRealData = false;
      }
    }
    
    // LOCAL DEVELOPMENT MODE - Simulate real recipes without network
    if (!useRealData) {
      console.log('🔧 DEVELOPMENT MODE: Creating realistic recipe simulation...');
      
      // Instead of generic mock data, create realistic Hungarian recipes
      recipes = [
        { recipe_id: 246, recipe_name: 'Csirkemell rizzsel', category: 'főétel', base_protein: 35.2, base_carbs: 45.8, base_fat: 8.1, base_calories: 380 },
        { recipe_id: 54, recipe_name: 'Túrós palacsinta', category: 'desszert', base_protein: 18.4, base_carbs: 32.6, base_fat: 12.3, base_calories: 295 },
        { recipe_id: 170, recipe_name: 'Zöldséges omlett', category: 'reggeli', base_protein: 22.1, base_carbs: 8.4, base_fat: 15.7, base_calories: 250 },
        { recipe_id: 89, recipe_name: 'Brokkolis csirkemell', category: 'főétel', base_protein: 28.9, base_carbs: 12.3, base_fat: 6.8, base_calories: 215 },
        { recipe_id: 123, recipe_name: 'Zabkása gyümölccsel', category: 'reggeli', base_protein: 12.5, base_carbs: 58.2, base_fat: 4.2, base_calories: 310 },
        { recipe_id: 67, recipe_name: 'Tonhalsaláta', category: 'saláta', base_protein: 25.3, base_carbs: 6.8, base_fat: 14.2, base_calories: 245 },
        { recipe_id: 145, recipe_name: 'Sült lazac spárgával', category: 'főétel', base_protein: 32.1, base_carbs: 8.9, base_fat: 18.4, base_calories: 325 },
        { recipe_id: 198, recipe_name: 'Joghurt müzlivel', category: 'snack', base_protein: 15.6, base_carbs: 28.7, base_fat: 6.1, base_calories: 225 }
      ];
      
      console.log(`🔄 Using ${recipes.length} REALISTIC Hungarian recipes (dev mode)`);
    }

    if (recipes.length === 0) {
      throw new Error('No recipes available (database and fallback failed)');
    }

    // 2. Score and rank recipes
    console.log('🎯 Scoring recipes...');
    const scoredRecipes = scoreRecipes(recipes, request);
    
    // 3. Select best recipes for each meal BY CATEGORY
    const mealCategoryMapping = {
      'Reggeli': 'reggeli',
      'Ebéd': 'ebéd', 
      'Vacsora': 'vacsora',
      'Tízórai': 'tízórai',
      'Uzsonna': 'uzsonna'
    };
    
    // Group recipes by meal category
    const recipesByCategory: Record<string, any[]> = {};
    scoredRecipes.forEach(recipe => {
      const category = recipe.category || 'egyéb';
      if (!recipesByCategory[category]) {
        recipesByCategory[category] = [];
      }
      recipesByCategory[category].push(recipe);
    });
    
    console.log('📂 Recipes by category:', Object.keys(recipesByCategory).map(cat => 
      `${cat}: ${recipesByCategory[cat].length} recipes`
    ));
    
    // Define meal plan structure for the requested number of meals
    const mealStructure = request.mealCount === 1
      ? ['Ebéd']
      : request.mealCount === 2
      ? ['Ebéd', 'Vacsora']
      : request.mealCount === 3 
      ? ['Reggeli', 'Ebéd', 'Vacsora']
      : request.mealCount === 4 
      ? ['Reggeli', 'Tízórai', 'Ebéd', 'Vacsora']
      : request.mealCount === 5
      ? ['Reggeli', 'Tízórai', 'Ebéd', 'Uzsonna', 'Vacsora']
      : ['Reggeli', 'Ebéd', 'Vacsora']; // fallback
    


    // 4. Calculate target macros per meal
    const targetCalories = (request.targetProtein * 4) + (request.targetCarbs * 4) + (request.targetFat * 9);
    const targetPerMeal = {
      protein: request.targetProtein / request.mealCount,
      carbs: request.targetCarbs / request.mealCount,
      fat: request.targetFat / request.mealCount,
      calories: targetCalories / request.mealCount
    };

    // Meal calorie distribution presets with tolerances (percent, tolerance)
    const distributionPresets: Record<number, Record<string, { percent: number; tol: number }>> = {
      1: { 'Ebéd': { percent: 100, tol: 0 } },
      2: { 'Ebéd': { percent: 60, tol: 10 }, 'Vacsora': { percent: 40, tol: 10 } },
      3: { 'Reggeli': { percent: 20, tol: 5 }, 'Ebéd': { percent: 45, tol: 10 }, 'Vacsora': { percent: 35, tol: 10 } },
      4: { 'Reggeli': { percent: 20, tol: 5 }, 'Tízórai': { percent: 10, tol: 5 }, 'Ebéd': { percent: 40, tol: 10 }, 'Vacsora': { percent: 30, tol: 10 } },
      5: { 'Reggeli': { percent: 20, tol: 5 }, 'Tízórai': { percent: 10, tol: 5 }, 'Ebéd': { percent: 35, tol: 10 }, 'Uzsonna': { percent: 10, tol: 5 }, 'Vacsora': { percent: 25, tol: 10 } }
    };
    const mealDistribution = distributionPresets[request.mealCount] || {};

    // === SZAKMAI MEAL PLAN ALGORITMUS ===
    
    // 1. MEGHATÁROZÁS: Receptek előzetes szűrése skálázhatóság alapján
    console.log('📋 1. MEGHATÁROZÁS: Receptek szűrése skálázhatóság alapján...');
    const validRecipes = scoredRecipes.filter(recipe => {
      const scalability = (recipe as any).scalability || { protein: 0.5, carbs: 0.5, fat: 0.5 };
      const avgScalability = (scalability.protein + scalability.carbs + scalability.fat) / 3;
      const isValid = avgScalability >= 0.01;
      if (!isValid) {
        console.log(`   ❌ Kizárva (gyenge skála): ${recipe.recipe_name} (${avgScalability.toFixed(2)})`);
      }
      return isValid;
    });

    // Macro-dominance quick prefilter (minimum slopes from targets)
    const slopeP = request.targetProtein / Math.max(1, Math.max(request.targetCarbs, request.targetFat));
    const slopeC = request.targetCarbs   / Math.max(1, Math.max(request.targetProtein, request.targetFat));
    const slopeF = request.targetFat     / Math.max(1, Math.max(request.targetProtein, request.targetCarbs));
    const ratioTol = 0.95;

    const dominanceFiltered = validRecipes.filter(r => {
      const eps = 1e-9;
      let Pstar = 0, Cstar = 0, Fstar = 0;
      const hasIngredients = Array.isArray((r as any).ingredients) && (r as any).ingredients.length > 0;

      if (hasIngredients) {
        for (const ing of (r as any).ingredients) {
          const p = Math.max(0, ing.original_protein || 0);
          const c = Math.max(0, ing.original_carbs || 0);
          const f = Math.max(0, ing.original_fat || 0);
          // Skip condiments in dominance calc
          const tnorm = (ing.tipusNorm || '').toUpperCase();
          const isCond = tnorm.includes('IZESITO') || tnorm.includes('KIEGESZITO') || tnorm.includes('VIZ') || tnorm.includes('ALAPLE') || tnorm.includes('AROMA');
          if (isCond) continue;
          const pVs = p / Math.max(eps, Math.max(c, f));
          const cVs = c / Math.max(eps, Math.max(p, f));
          const fVs = f / Math.max(eps, Math.max(p, c));
          if (pVs > Pstar) Pstar = pVs;
          if (cVs > Cstar) Cstar = cVs;
          if (fVs > Fstar) Fstar = fVs;
        }
      } else {
        // Fallback: use base macros (recept-szint), de lazább elfogadás (legalább 2/3 tengely)
        const p = Math.max(0, (r as any).base_protein || 0);
        const c = Math.max(0, (r as any).base_carbs || 0);
        const f = Math.max(0, (r as any).base_fat || 0);
        Pstar = p / Math.max(eps, Math.max(c, f));
        Cstar = c / Math.max(eps, Math.max(p, f));
        Fstar = f / Math.max(eps, Math.max(p, c));
      }

      const passP = Pstar >= slopeP * ratioTol;
      const passC = Cstar >= slopeC * ratioTol;
      const passF = Fstar >= slopeF * ratioTol;
      const ok = passP && passC && passF;
      if (!ok) {
        console.log(`   ❌ Kizárva (dominancia): ${r.recipe_name} P*=${Pstar.toFixed(2)} C*=${Cstar.toFixed(2)} F*=${Fstar.toFixed(2)} (slopes P=${(slopeP*ratioTol).toFixed(2)} C=${(slopeC*ratioTol).toFixed(2)} F=${(slopeF*ratioTol).toFixed(2)})`);
      }
      return ok;
    });

    console.log(`   ✅ ${dominanceFiltered.length}/${validRecipes.length} recept megfelelt a dominancia minimumnak`);

    // Exclude recipes that contain bound ingredients (kötött összetevők)
    const withoutBound = dominanceFiltered.filter(r => {
      const ing = (r as any).ingredients;
      if (!Array.isArray(ing) || ing.length === 0) return true; // nincs adat, nem zárjuk ki emiatt
      const hasBound = ing.some((x: any) => {
        const raw = (x.kotes || x.Kotes || x['Kötés'] || '').toString().trim().toLowerCase();
        return raw !== '' && raw !== 'null' && raw !== 'n/a' && raw !== 'none';
      });
      if (hasBound) console.log(`   ❌ Kizárva (kötött összetevő): ${(r as any).recipe_name}`);
      return !hasBound;
    });
    console.log(`   ✅ ${withoutBound.length}/${dominanceFiltered.length} recept maradt a kötött összetevők kizárása után`);

    // Strict macro ratio prefilter (C/P and F/P within 5.1% of targets). Calories ignored.
    const targetCP = (request.targetCarbs || 0) / Math.max(request.targetProtein || 1, 1);
    const targetFP = (request.targetFat || 0) / Math.max(request.targetProtein || 1, 1);
    const ratioToleranceAbs = 0.051; // 5.1%

    // NEW RULE: axis-wise maxima by ingredient (per-100g), compared to target ratios.
    // For each recipe, compute:
    //   cp_max = max_i (C100_i / P100_i)
    //   pf_max = max_i (P100_i / F100_i)
    //   fp_max = max_i (F100_i / P100_i)
    // and require: cp_max >= C/P_target * (1 - tol), pf_max >= P/F_target * (1 - tol), fp_max >= F/P_target * (1 - tol)
    const ratioFiltered = withoutBound.filter(r => {
      const eps = 1e-9;
      const hasIngredients = Array.isArray((r as any).ingredients) && (r as any).ingredients.length > 0;

      let cpMax = 0, pfMax = 0, fpMax = 0;

      if (hasIngredients) {
        for (const ing of (r as any).ingredients) {
          const tnorm = (ing.tipusNorm || '').toUpperCase();
          const isCond = tnorm.includes('IZESITO') || tnorm.includes('KIEGESZITO') || tnorm.includes('VIZ') || tnorm.includes('ALAPLE') || tnorm.includes('AROMA');
          if (isCond) continue;
          const nutr = ing.nutrition || {};
          const p100 = extractNumber(nutr['Fehérje/100g'] ?? nutr['Feherje/100g'] ?? nutr['protein_per_100'] ?? 0);
          const c100 = extractNumber(nutr['Szénhidrát/100g'] ?? nutr['Szenhidrat/100g'] ?? nutr['carbs_per_100'] ?? 0);
          const f100 = extractNumber(nutr['Zsir/100g'] ?? nutr['Zsír/100g'] ?? nutr['fat_per_100'] ?? 0);
          const cp = c100 / Math.max(p100, eps);
          const pf = p100 / Math.max(f100, eps);
          const fp = f100 / Math.max(p100, eps);
          if (Number.isFinite(cp) && cp > cpMax) cpMax = cp;
          if (Number.isFinite(pf) && pf > pfMax) pfMax = pf;
          if (Number.isFinite(fp) && fp > fpMax) fpMax = fp;
        }
      } else {
        // Fallback if no ingredient data: approximate from base macros (weaker)
        const P = Math.max(0, (r as any).base_protein || 0);
        const C = Math.max(0, (r as any).base_carbs || 0);
        const F = Math.max(0, (r as any).base_fat || 0);
        if (P <= eps) return false;
        cpMax = C / Math.max(P, eps);
        pfMax = P / Math.max(F, eps);
        fpMax = F / Math.max(P, eps);
      }

      // Target axis ratios from daily targets
      const cpTarget = targetCP; // C/P_target
      const pfTarget = (request.targetProtein || 0) / Math.max(request.targetFat || 1, 1); // P/F_target
      const fpTarget = targetFP; // F/P_target
      const lower = 1 - ratioToleranceAbs; // e.g., 0.949 for 5.1%

      const passCP = cpMax >= cpTarget * lower;
      const passPF = pfMax >= pfTarget * lower;
      const passFP = fpMax >= fpTarget * lower;
      const ok = passCP && passPF && passFP;
      if (!ok) {
        console.log(`   ❌ Kizárva (arány‑max): ${r.recipe_name} cp_max=${cpMax.toFixed(2)} (>=${(cpTarget*lower).toFixed(2)}) | pf_max=${pfMax.toFixed(2)} (>=${(pfTarget*lower).toFixed(2)}) | fp_max=${fpMax.toFixed(2)} (>=${(fpTarget*lower).toFixed(2)})`);
      }
      return ok;
    });
    console.log(`   ✅ ${ratioFiltered.length}/${withoutBound.length} recept átment a TENGELY‑MAX arány előszűrésen (tűrés ${(ratioToleranceAbs*100).toFixed(1)}% lefelé)`);

    // 2. KOMBINÁLÁS: Kezdeti kiválasztás kategóriánként pontszám alapján (átlag >80)
    console.log('🔗 2. KOMBINÁLÁS: Kezdeti kiválasztás kategóriánként...');

    // Update recipesByCategory with bound-free + dominanceFiltered recipes only
    const validRecipesByCategory: Record<string, any[]> = {};
    ratioFiltered.forEach(recipe => {
      const category = recipe.category || 'egyéb';
      if (!validRecipesByCategory[category]) {
        validRecipesByCategory[category] = [];
      }
      validRecipesByCategory[category].push(recipe);
    });
    
    // Initial selection with score > 80 requirement AND variáció biztosítása
    const usedRecipeIds = new Set<number>();
    // Per-click random seed (millis + random) – így nem ismétli ugyanazt egy percen belül
    const rng = createSeededRng(((Date.now() ^ (Math.random() * 1e9) | 0) >>> 0));
    let selectedRecipes: any[] = [];
    for (const categoryName of mealStructure) {
      // If user wants lunch and dinner to be the same RECIPE, reuse the lunch recipe for dinner,
      // but keep scaling independent (LP is per-meal).
      if (request.sameLunchDinner && categoryName === 'Vacsora') {
        const lunchIdx = selectedRecipes.findIndex(m => m.requestedCategory === 'Ebéd');
        if (lunchIdx >= 0) {
          const lunchSel = selectedRecipes[lunchIdx];
          // Deep‑clone the lunch recipe to avoid shared references between lunch and dinner
          const recipe = JSON.parse(JSON.stringify(lunchSel.recipe));
          console.log(`   🍽️ Vacsora = Ebéd recept (független skálázás) → ${recipe.recipe_name}`);
          selectedRecipes.push({
            mealType: mealCategoryMapping[categoryName] || categoryName.toLowerCase(),
            recipe,
            requestedCategory: categoryName
          });
          continue;
        }
      }

      let categoryRecipes = validRecipesByCategory[categoryName] || [];

      const highScoreRecipes = categoryRecipes.filter(r => r.score > 10 && !usedRecipeIds.has(r.recipe_id));

      // If no high-score recipes, take best available (excluding already used)
      const availableRecipes = highScoreRecipes.length > 0
        ? highScoreRecipes
        : categoryRecipes.filter(r => !usedRecipeIds.has(r.recipe_id));

      // If all recipes used, take from all validRecipes
      const finalRecipes = availableRecipes.length > 0
        ? availableRecipes
        : ratioFiltered.filter(r => !usedRecipeIds.has(r.recipe_id));

      // Sort by score desc, then pick from top-K with softmax weighting to add variety
      const recent = new Set(getRecentRecipeIds());
      const pool = finalRecipes.filter(r => !recent.has(r.recipe_id));
      const baseList = pool.length >= 3 ? pool : finalRecipes;
      const sorted = [...baseList]
        .map(r => ({ ...r, _jitter: rng() * 0.5 }))
        .sort((a, b) => (b.score + b._jitter) - (a.score + a._jitter));
      const globalMaxScore = sorted.length > 0 ? (sorted[0].score || 0) : 0;
      const K = Math.max(15, Math.ceil(sorted.length * 0.25));
      if (K < sorted.length) {
        const tailPickChance = 0.25;
        if (rng() < tailPickChance) {
          const tail = sorted.slice(K);
          const tailWeights = tail.map(r => 1 / (1 + Math.max(0, globalMaxScore - r.score)));
          const tIdx = weightedRandomIndex(tailWeights, rng);
          const pick = tail[tIdx];
          if (pick) {
            pushRecentRecipeId(pick.recipe_id);
            usedRecipeIds.add(pick.recipe_id);
            console.log(`   ${categoryName}: ${pick.recipe_name} (score: ${pick.score.toFixed(1)}, used: ${usedRecipeIds.size})`);
            selectedRecipes.push({
              mealType: mealCategoryMapping[categoryName] || categoryName.toLowerCase(),
              recipe: pick,
              requestedCategory: categoryName
            });
            continue;
          }
        }
      }
      const topK = sorted.slice(0, K);
      const temperature = 0.35;
      const maxTopScore = topK[0]?.score || 0;
      const weights = topK.map(r => Math.exp(((r.score + r._jitter) - maxTopScore) / Math.max(1e-6, temperature)));
      const idx = weightedRandomIndex(weights, rng);
      const recipe = topK[idx] || sorted[0] || ratioFiltered[0];
      if (recipe) {
        pushRecentRecipeId(recipe.recipe_id);
        // For dinner when sharing with lunch, don't mark as used to allow reuse
        if (!(request.sameLunchDinner && categoryName === 'Vacsora')) {
          usedRecipeIds.add(recipe.recipe_id);
        }
      }
      console.log(`   ${categoryName}: ${recipe?.recipe_name} (score: ${recipe?.score.toFixed(1)}, used: ${usedRecipeIds.size})`);
      selectedRecipes.push({
        mealType: mealCategoryMapping[categoryName] || categoryName.toLowerCase(),
        recipe,
        requestedCategory: categoryName
      });
    }
    
    // 3. CSERE: Iteratív javítás gyenge makrók cseréjével
    console.log('🔄 3. CSERE: Iteratív javítás gyenge makrók alapján...');
    
    const MAX_SWAP_ATTEMPTS = 3;
    let bestCombination = null;
    let bestDeviationPercent = 100;
    let stagnantCount = 0;
    
    for (let swapAttempt = 0; swapAttempt < MAX_SWAP_ATTEMPTS; swapAttempt++) {
      // Calculate current combination performance
      const { scaledMeals: currentScaledMeals, totalMacros: currentTotalMacros } = 
        scaleAndCalculateMacros(selectedRecipes, targetPerMeal, targetCalories, request);
      
      const currentDeviations = {
        protein: Math.abs(currentTotalMacros.protein - request.targetProtein),
        carbs: Math.abs(currentTotalMacros.carbs - request.targetCarbs),
        fat: Math.abs(currentTotalMacros.fat - request.targetFat),
        calories: Math.abs(currentTotalMacros.calories - targetCalories)
      };

      const currentDeviationPercentages = {
        protein: (currentDeviations.protein / request.targetProtein) * 100,
        carbs: (currentDeviations.carbs / request.targetCarbs) * 100,
        fat: (currentDeviations.fat / request.targetFat) * 100,
        calories: (currentDeviations.calories / targetCalories) * 100
      };

      const currentMaxDeviation = Math.max(
        currentDeviationPercentages.protein,
        currentDeviationPercentages.carbs,
        currentDeviationPercentages.fat,
        currentDeviationPercentages.calories
      );

      console.log(`   Csere ${swapAttempt + 1}: Max deviáció ${currentMaxDeviation.toFixed(1)}%`);

      // Log current combination details every few attempts
      if (swapAttempt % 3 === 0 || currentMaxDeviation <= 15) {
        logDetailedIngredientInfo(currentScaledMeals, `SWAP ATTEMPT ${swapAttempt + 1}`);
      }

      // Track best combination
      if (currentMaxDeviation < bestDeviationPercent) {
        bestDeviationPercent = currentMaxDeviation;
        bestCombination = {
          scaledMeals: currentScaledMeals,
          totalMacros: currentTotalMacros,
          deviations: currentDeviations,
          deviationPercentages: currentDeviationPercentages,
          maxDeviationPercent: currentMaxDeviation,
          selectedRecipes: [...selectedRecipes]
        };
        stagnantCount = 0; // Reset stagnation counter
        console.log(`   ✨ ÚJ LEGJOBB! Deviáció: ${currentMaxDeviation.toFixed(1)}%`);
      } else {
        stagnantCount++;
        if (stagnantCount >= 3) {
          console.log(`   ⏹️ Stopping swaps: No improvement for 3 attempts (best: ${bestDeviationPercent.toFixed(1)}%)`);
          break;
        }
      }
      
      // If good enough, stop
      if (currentMaxDeviation <= 10) {
        console.log(`   🎯 KIVÁLÓ! <10% deviáció elérve a ${swapAttempt + 1}. cserénél`);
        break;
      }
      
      // Find worst macro and try to swap a recipe
      const worstMacro = Object.entries(currentDeviationPercentages)
        .reduce((worst, [macro, deviation]) => 
          deviation > worst.deviation ? { macro, deviation } : worst,
          { macro: '', deviation: 0 }
        );
      
      console.log(`   🔍 Legrosszabb makró: ${worstMacro.macro} (${worstMacro.deviation.toFixed(1)}%)`);
      
      // Try to swap a recipe to improve the worst macro
      selectedRecipes = performMacroSwap(
        selectedRecipes,
        worstMacro.macro,
        validRecipesByCategory,
        ratioFiltered,
        { sameLunchDinner: request.sameLunchDinner }
      );
    }

    if (!bestCombination) {
      throw new Error('Failed to generate any valid meal combination');
    }

    // Greedy post‑solve macro refinement within the selected combination
    function refineMacrosGreedy(meals: any[], totals: any) {
      const MAX_ITERS = 35;
      const TOTAL_CAL_UPPER = targetCalories * 1.05;
      const STEP = 0.02; // 2% step on chosen carrier
      let iterations = 0;
      let currentMeals = meals.map(m => ({ ...m, ingredientDetails: (m.ingredientDetails || []).map((d: any) => ({ ...d })) }));
      let currentTotals = { ...totals };

      const coverage = (t: any) => ({
        protein: t.protein / Math.max(1e-6, request.targetProtein),
        carbs: t.carbs / Math.max(1e-6, request.targetCarbs),
        fat: t.fat / Math.max(1e-6, request.targetFat),
        calories: t.calories / Math.max(1e-6, targetCalories)
      });

      // L-infinity (max abs percent deviation) csak P/C/F-re
      const macroLinf = (t: any) => {
        const p = Math.abs(t.protein - request.targetProtein) / Math.max(1e-6, request.targetProtein);
        const c = Math.abs(t.carbs   - request.targetCarbs)   / Math.max(1e-6, request.targetCarbs);
        const f = Math.abs(t.fat     - request.targetFat)     / Math.max(1e-6, request.targetFat);
        return Math.max(p, c, f);
      };

      function getMacroOrder(def: any): Array<'protein'|'carbs'|'fat'> {
        const items: Array<{k: 'protein'|'carbs'|'fat'; v: number}> = [
          { k: 'protein', v: def.protein },
          { k: 'carbs', v: def.carbs },
          { k: 'fat', v: def.fat }
        ];
        return items
          .sort((a,b) => a.v - b.v)
          // 95–105% sáv: csak a 0.95 alattiak maradjanak célpontok
          .filter(e => e.v < 0.95)
          .map(e => e.k);
      }

      // Last‑mile: preferált hiánykitöltés kizárólag a vacsorán
      function boostDinnerForDeficit(): void {
        // Keressük a vacsora indexét
        const dinnerIdx = currentMeals.findIndex(m => (m.mealType || '').toString().toLowerCase().includes('vacsora'));
        if (dinnerIdx < 0) return;

        const MAX_DINNER_ITERS = 50;
        let tries = 0;
        while (tries < MAX_DINNER_ITERS) {
          tries++;
          const cov = coverage(currentTotals);
          const order = getMacroOrder(cov);
          if (order.length === 0) break; // nincs hiány
          const targetMacro = order[0];

          const meal = currentMeals[dinnerIdx];
          const details = meal.ingredientDetails || [];

          let best: null | { detailIdx: number; newQty: number; dP: number; dC: number; dF: number; dK: number } = null;
          details.forEach((it: any, detailIdx: number) => {
            if (isLikelyCondiment(it.name, it.original_unit, it.tipusNorm, it.original_calories, it.original_quantity)) return;
            const baseQty = it.original_quantity || 0;
            const curQty = it.scaled_quantity || baseQty;
            if (baseQty <= 0) return;

            // Specifikus max és egység lépés
            const specMax = getSpecificMaxScale(it.name, it.original_unit, it.tipusNorm);
            const cap = Number.isFinite(specMax as number) ? (specMax as number) : 3.0;
            const maxQty = baseQty * cap;
            const stepQty = groupStepByUnit(it.original_unit, curQty);
            if (!Number.isFinite(stepQty) || stepQty <= 0) return;
            const proposedQty = Math.min(maxQty, curQty + stepQty);
            if (proposedQty <= curQty + 1e-9) return;

            const perP = (it.original_protein  || 0) / baseQty;
            const perC = (it.original_carbs    || 0) / baseQty;
            const perF = (it.original_fat      || 0) / baseQty;
            const perK = (it.original_calories || 0) / baseQty;
            const dQty = proposedQty - curQty;
            const dP = perP * dQty;
            const dC = perC * dQty;
            const dF = perF * dQty;
            const dK = perK * dQty;

            if (currentTotals.calories + dK > TOTAL_CAL_UPPER) return;

            // Cél: a hiányzó tengelyt növeljük a leghatékonyabban
            const gain = targetMacro === 'protein' ? dP : targetMacro === 'carbs' ? dC : dF;
            if (gain <= 0) return;
            if (!best || gain > (targetMacro === 'protein' ? best.dP : targetMacro === 'carbs' ? best.dC : best.dF)) {
              best = { detailIdx, newQty: proposedQty, dP, dC, dF, dK };
            }
          });

          if (!best) break;

          // Alkalmazás
          const it = details[best.detailIdx];
          const ratio = (it.original_quantity || 0) > 0 ? (best.newQty / it.original_quantity) : ((it.scale_factor || 1) + 0);
          it.scaled_quantity = best.newQty;
          it.scale_factor = ratio;
          it.scaled_protein  = (it.original_protein  || 0) * ratio;
          it.scaled_carbs    = (it.original_carbs    || 0) * ratio;
          it.scaled_fat      = (it.original_fat      || 0) * ratio;
          it.scaled_calories = (it.original_calories || 0) * ratio;

          meal.scaledMacros = details.reduce((acc: any, x: any) => ({
            protein: acc.protein + (x.scaled_protein || 0),
            carbs:   acc.carbs   + (x.scaled_carbs   || 0),
            fat:     acc.fat     + (x.scaled_fat     || 0),
            calories: acc.calories + (x.scaled_calories || 0)
          }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

          currentTotals = {
            protein: currentTotals.protein + best.dP,
            carbs:   currentTotals.carbs   + best.dC,
            fat:     currentTotals.fat     + best.dF,
            calories: currentTotals.calories + best.dK
          };

          // Ha a cél tengely már elérte a 95%-ot, kiléphetünk a dinner‑boostból
          const cov2 = coverage(currentTotals);
          if ((targetMacro === 'protein' && cov2.protein >= 0.95) ||
              (targetMacro === 'carbs'   && cov2.carbs   >= 0.95) ||
              (targetMacro === 'fat'     && cov2.fat     >= 0.95)) {
            break;
          }
        }
      }

      // Első körben próbáljuk a vacsorát felhozni a 95% aljára
      boostDinnerForDeficit();

      while (iterations < MAX_ITERS) {
        iterations++;
        const cov = coverage(currentTotals);
        const order = getMacroOrder(cov);
        // Stop, ha minden makró a 95–105% sávban van
        const withinBand = cov.protein >= 0.95 && cov.protein <= 1.05 &&
                           cov.carbs   >= 0.95 && cov.carbs   <= 1.05 &&
                           cov.fat     >= 0.95 && cov.fat     <= 1.05;
        if (withinBand || order.length === 0) break;

        // Cél makró: a legrosszabb (legkisebb coverage) sávon kívüli tengely
        const targetMacro = order[0];
        const beforeLinf = macroLinf(currentTotals);

        // Egyetlen hozzávalót léptetünk kicsit, majd csak ha javul az L∞, akkor tartjuk meg
        let best: null | { mealIdx: number; detailIdx: number; newQty: number; newTotals: any; newLinf: number } = null;
        currentMeals.forEach((meal, mealIdx) => {
          const details = meal.ingredientDetails || [];
          details.forEach((it: any, detailIdx: number) => {
            if (isLikelyCondiment(it.name, it.original_unit, it.tipusNorm, it.original_calories, it.original_quantity)) return;
            const baseQty = it.original_quantity || 0;
            const curQty = it.scaled_quantity || baseQty;
            if (baseQty <= 0) return;

            // Max scale korlátok
            const specMax = getSpecificMaxScale(it.name, it.original_unit, it.tipusNorm);
            const cap = Number.isFinite(specMax as number) ? (specMax as number) : 3.0;
            const maxQty = baseQty * cap;

            // Egységhez illesztett kis lépés
            const stepQty = groupStepByUnit(it.original_unit, curQty);
            if (!Number.isFinite(stepQty) || stepQty <= 0) return;
            const proposedQty = Math.min(maxQty, curQty + stepQty);
            if (proposedQty <= curQty + 1e-9) return;

            const perP = (it.original_protein  || 0) / baseQty;
            const perC = (it.original_carbs    || 0) / baseQty;
            const perF = (it.original_fat      || 0) / baseQty;
            const perK = (it.original_calories || 0) / baseQty;

            const dQty = proposedQty - curQty;
            const dP = perP * dQty;
            const dC = perC * dQty;
            const dF = perF * dQty;
            const dK = perK * dQty;

            // Kalória plafon
            if (currentTotals.calories + dK > TOTAL_CAL_UPPER) return;

            const simTotals = {
              protein: currentTotals.protein + dP,
              carbs:   currentTotals.carbs   + dC,
              fat:     currentTotals.fat     + dF,
              calories: currentTotals.calories + dK
            };
            const afterLinf = macroLinf(simTotals);
            if (afterLinf + 1e-6 < beforeLinf) {
              if (!best || afterLinf < best.newLinf) {
                best = { mealIdx, detailIdx, newQty: proposedQty, newTotals: simTotals, newLinf: afterLinf };
              }
            }
          });
        });

        if (!best) break; // nincs javító lépés → vége

        // Alkalmazzuk az egyetlen legjobb atomikus lépést
        const meal = currentMeals[best.mealIdx];
        const details = meal.ingredientDetails || [];
        const it = details[best.detailIdx];
        const ratio = (it.original_quantity || 0) > 0 ? (best.newQty / it.original_quantity) : ((it.scale_factor || 1) + 0);
        it.scaled_quantity = best.newQty;
        it.scale_factor = ratio;
        it.scaled_protein  = (it.original_protein  || 0) * ratio;
        it.scaled_carbs    = (it.original_carbs    || 0) * ratio;
        it.scaled_fat      = (it.original_fat      || 0) * ratio;
        it.scaled_calories = (it.original_calories || 0) * ratio;

        meal.scaledMacros = details.reduce((acc: any, x: any) => ({
          protein: acc.protein + (x.scaled_protein || 0),
          carbs:   acc.carbs   + (x.scaled_carbs   || 0),
          fat:     acc.fat     + (x.scaled_fat     || 0),
          calories: acc.calories + (x.scaled_calories || 0)
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

        currentTotals = { ...best.newTotals };
      }
      return { meals: currentMeals, totals: currentTotals };
    }

    let { scaledMeals, totalMacros, deviations, deviationPercentages, maxDeviationPercent } = bestCombination;

    // After picking the best combo, run greedy refinement to push towards targets
    const refined = refineMacrosGreedy(scaledMeals, totalMacros);
    scaledMeals = refined.meals;
    totalMacros = refined.totals;
    deviations = {
      protein: Math.abs(totalMacros.protein - request.targetProtein),
      carbs: Math.abs(totalMacros.carbs - request.targetCarbs),
      fat: Math.abs(totalMacros.fat - request.targetFat),
      calories: Math.abs(totalMacros.calories - targetCalories)
    };
    deviationPercentages = {
      protein: (deviations.protein / Math.max(1e-6, request.targetProtein)) * 100,
      carbs: (deviations.carbs / Math.max(1e-6, request.targetCarbs)) * 100,
      fat: (deviations.fat / Math.max(1e-6, request.targetFat)) * 100,
      calories: (deviations.calories / Math.max(1e-6, targetCalories)) * 100
    };
    maxDeviationPercent = Math.max(
      deviationPercentages.protein,
      deviationPercentages.carbs,
      deviationPercentages.fat,
      deviationPercentages.calories
    );

    console.log('🎯 BEST COMBINATION FOUND:');
    console.log('   📊 Final recipes:', scaledMeals.map(m => `${m.recipe.recipe_name} (${m.scaleFactor}x)`));
    console.log('   📈 Final deviation:', `${maxDeviationPercent.toFixed(1)}%`);
    console.log('📊 Total macros:', totalMacros);
    console.log('🎯 Target macros:', { ...request, calories: targetCalories });
    console.log('📈 Deviations:', deviations);
    console.log('📈 Deviation percentages:', deviationPercentages);
    
    // Log detailed ingredient information for verification
    logDetailedIngredientInfo(scaledMeals, 'FINAL MEAL PLAN');

    // FINAL VALIDATION: Reject if best attempt still exceeds 10%
    if (maxDeviationPercent > 10) {
      console.log('❌ MEAL PLAN REJECTED: Even best combination exceeds 10%');
      // Identify which macro(s) caused rejection
      try {
        const huMap: Record<string, string> = {
          protein: 'fehérje',
          carbs: 'szénhidrát',
          fat: 'zsír',
          calories: 'kalória',
        };
        const offenders = Object.entries(deviationPercentages)
          .filter(([_, v]) => (v as number) > 10)
          .map(([k, v]) => `${huMap[k] || k} (${(v as number).toFixed(1)}%)`);
        if (offenders.length) {
          console.log(`   ❗ Bukás oka (>10%): ${offenders.join(', ')}`);
        }
      } catch (e) {
        console.warn('   ⚠️ Nem sikerült kiértékelni a bukó makrókat:', e);
      }
      
      // Log detailed ingredient information for rejected meal plan
      logDetailedIngredientInfo(scaledMeals, 'REJECTED MEAL PLAN');
      
      const generationTime = Date.now() - startTime;
      
      return {
        success: false,
        message: `Meal plan rejected after ${MAX_SWAP_ATTEMPTS} attempts: Best deviation ${maxDeviationPercent.toFixed(1)}% still exceeds 10% limit. Try different macro targets or add more varied recipes to database.`,
        data: {
          attempted_meals: scaledMeals,
          attempted_totals: totalMacros,
          targetMacros: { 
            protein: request.targetProtein, 
            carbs: request.targetCarbs, 
            fat: request.targetFat, 
            calories: targetCalories 
          },
          deviations,
          deviation_percentages: deviationPercentages,
          max_deviation_percent: maxDeviationPercent,
          rejection_reason: `Best of ${MAX_SWAP_ATTEMPTS} attempts > 10%`,
          generation_metadata: {
            algorithm_version: 'direct-frontend-v3-professional',
            generation_time_ms: generationTime,
            total_recipes_available: recipes.length,
            selected_recipes: scaledMeals.length,
            swap_attempts_made: MAX_SWAP_ATTEMPTS
          }
        }
      };
    }

    const generationTime = Date.now() - startTime;

    console.log('✅ Direct meal plan generated successfully');
    console.log(`✅ All deviations under 10% (max: ${maxDeviationPercent.toFixed(1)}%)`);
    
    // Final summary with ingredient verification
    console.log('\n🎯 FINAL SUMMARY:');
    console.log(`   Total recipes processed: ${recipes.length}`);
    console.log(`   Selected recipes: ${scaledMeals.length}`);
    console.log(`   Max deviation: ${maxDeviationPercent.toFixed(1)}%`);
    console.log(`   Generation time: ${generationTime}ms`);
    console.log('   Detailed ingredient breakdown logged above for verification');

    return {
      success: true,
      message: `Generated optimized meal plan with ${scaledMeals.length} meals (${maxDeviationPercent.toFixed(1)}% max deviation)`,
      data: {
        meals: scaledMeals,
        totalMacros,
        targetMacros: { 
          protein: request.targetProtein, 
          carbs: request.targetCarbs, 
          fat: request.targetFat, 
          calories: targetCalories 
        },
        deviations,
        deviation_percentages: deviationPercentages,
        max_deviation_percent: maxDeviationPercent,
        generation_metadata: {
          algorithm_version: 'direct-frontend-v3-professional',
          generation_time_ms: generationTime,
          total_recipes_available: recipes.length,
          selected_recipes: scaledMeals.length,
          swap_attempts_made: MAX_SWAP_ATTEMPTS,
          optimization_successful: maxDeviationPercent <= 10
        }
      }
    };

  } catch (error) {
    console.error('❌ Direct meal plan generation error:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}