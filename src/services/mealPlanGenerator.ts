import { supabase } from '@/integrations/supabase/client';
import { scaleRecipe, ScalingOutput, Macros, calculateTotalMacros } from './macroScaler';
import { CombinedRecipe, Alapanyag } from './database/types';
import { log, warn } from '@/lib/debug';
import { testRecipeIngredients } from '@/lib/testData/testRecipeIngredients';
import { UserPreference } from './preferenceFilters';
import { UserFavorite } from './userFavorites';
import { strictPreFilterRecipes, PreFilterConfig } from './strictPreFilter';

// Kiegészítés: a valós adatbázisból jövő receptekhez is legyen ingredients mező
export interface MealPlanInput {
  availableRecipes: CombinedRecipe[];
  allNutritionData: Alapanyag[];
  mealTypes: string[];
  dailyTarget: Macros;
  userPreferences?: UserPreference[];
  userFavorites?: UserFavorite[];
  sameLunchDinner?: boolean;
}

export interface MealPlanOutput {
  success: boolean;
  message: string;
  scaledMeals: {
    mealNumber: number;
    mealType: string; // Új mező az étkezési típus tárolásához
    recipe: CombinedRecipe;
    scalingResult: ScalingOutput;
    targetMacrosForMeal: Macros;
  }[];
  finalTotals: Macros;
}

// Korábbi, rugalmas profil szűrőt kiváltjuk a szigorú pre-filterrel

// Recept makró profiljának számítása az adatbázis táblázat alapján (biztos makróértékek)
const calculateRecipeMacros = (recipe: CombinedRecipe, allNutritionData: Alapanyag[]): Macros => {
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }

  const testIngredients = recipe.ingredients.map(convertToTestRecipeIngredient);
  const totals = calculateTotalMacros(testIngredients as any, allNutritionData);

  // Debug log az első néhány recepthez
  log('📊 Recept makrók', { id: recipe.id, P: totals.protein, C: totals.carbs, F: totals.fat, K: Math.round(totals.calories) });

  return totals;
};

// Dinamikus tolerancia számítása
const getMealTolerance = (mealType: string, attempt: number): number => {
  const baseTolerance = 0.12; // 12% alap tolerancia
  const maxTolerance = 0.12; // Maximum 12% tolerancia
  
  // Későbbi próbálkozásoknál növekvő tolerancia, de maximum 12%
  const adaptiveTolerance = baseTolerance + (attempt * 0.005); // Kisebb növekedés
  
  // Étkezés típus szerinti módosítás
  let mealMultiplier = 1.0;
  switch (mealType.toLowerCase()) {
    case 'reggeli':
    case 'ebéd':
      mealMultiplier = 1.0; // Alap tolerancia
      break;
    case 'tízórai':
    case 'uzsonna':
      mealMultiplier = 1.1; // Kisebb étkezéseknél enyhe rugalmasság
      break;
    case 'vacsora':
      mealMultiplier = 1.05; // Vacsoránál minimális rugalmasság
      break;
  }
  
  return Math.min(adaptiveTolerance * mealMultiplier, maxTolerance);
};

// Intelligens étkezési eloszlás makró profil alapján
const smartMealDistribution = (mealTypes: string[], targetMacros: Macros): number[] => {
  const distributions = {
    reggeli: { protein: 0.25, carbs: 0.30, fat: 0.20 },
    ebéd: { protein: 0.35, carbs: 0.35, fat: 0.30 },
    vacsora: { protein: 0.25, carbs: 0.25, fat: 0.30 },
    tízórai: { protein: 0.10, carbs: 0.05, fat: 0.10 },
    uzsonna: { protein: 0.05, carbs: 0.05, fat: 0.10 }
  };
  
  return mealTypes.map(mealType => {
    const distribution = distributions[mealType.toLowerCase() as keyof typeof distributions] || distributions.reggeli;
    return (distribution.protein + distribution.carbs + distribution.fat) / 3;
  });
};

// Rögzített skálázási stratégia
const fixedScaling = (recipe: CombinedRecipe, targetMacros: Macros, allNutritionData: Alapanyag[]) => {
  const ingredients = (recipe.ingredients || []).map(convertToTestRecipeIngredient);
  const scalingInput = {
    recipe: convertToTestRecipe(recipe),
    ingredients,
    targetMacros,
    allNutritionData,
    limits: { upper: 5.0, lower: 0.1 }, // Rögzített, ésszerű korlátok
  };
  
  return scaleRecipe(scalingInput);
};

// Debug: hozzávalók makróinak kiírása (meal-plan-test stílus)
function debugLogIngredients(meal: any, allNutritionData: Alapanyag[], phase: 'initial' | 'final', mealIndex: number) {
  try {
    const toNum = (v: any) => Number(String(v).replace(',', '.')) || 0;
    const normalizeName = (s: string) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    const normalizeId = (raw: any): number | null => {
      if (raw == null) return null;
      const str = String(raw).split('/')[0].trim();
      const m = str.match(/\d+/);
      return m ? Number(m[0]) : null;
    };
    const findRow = (ing: any) => {
      const id = normalizeId(ing['Élelmiszer ID'] ?? ing.ID);
      if (id != null) {
        const byId = allNutritionData.find((n: any) => Number(n.ID) === id);
        if (byId) return byId;
      }
      const name = ing['Élelmiszerek'] || ing.Elelmiszer || '';
      const nn = normalizeName(name);
      if (nn) {
        const byName = allNutritionData.find((n: any) => normalizeName((n as any).Elelmiszer) === nn);
        if (byName) return byName;
      }
      return null as any;
    };
    const original = meal.scalingResult?.originalIngredients || meal.recipe?.ingredients || [];
    const scaled = meal.scalingResult?.scaledIngredients || [];

    console.group(`🧪 Ingredients (${phase}) • meal #${mealIndex + 1} ${meal.mealType}`);
    console.group('Original');
    original.forEach((ing: any) => {
      const row: any = findRow(ing);
      const q = Number(ing.Mennyiség) || 0;
      const p = toNum(row?.['Fehérje/100g']) * q / 100;
      const c = toNum(row?.['Szénhidrát/100g']) * q / 100;
      const f = toNum(row?.['Zsir/100g']) * q / 100;
      const k = (toNum(row?.['Fehérje/100g']) * 4 + toNum(row?.['Szénhidrát/100g']) * 4 + toNum(row?.['Zsir/100g']) * 9) * q / 100;
      const name = ing['Élelmiszerek'] || ing.Elelmiszer || 'ismeretlen';
      console.log(`${name} | ${q}${ing['Mértékegység'] || ''} → P:${p.toFixed(1)}g, C:${c.toFixed(1)}g, F:${f.toFixed(1)}g, Cal:${k.toFixed(0)}kcal`);
    });
    console.groupEnd();

    console.group('Scaled');
    scaled.forEach((ing: any) => {
      const row: any = findRow(ing);
      const q = Number(ing.Mennyiség) || 0;
      const p = toNum(row?.['Fehérje/100g']) * q / 100;
      const c = toNum(row?.['Szénhidrát/100g']) * q / 100;
      const f = toNum(row?.['Zsir/100g']) * q / 100;
      const k = (toNum(row?.['Fehérje/100g']) * 4 + toNum(row?.['Szénhidrát/100g']) * 4 + toNum(row?.['Zsir/100g']) * 9) * q / 100;
      const name = ing['Élelmiszerek'] || ing.Elelmiszer || 'ismeretlen';
      console.log(`${name} | ${q}${ing['Mértékegység'] || ''} → P:${p.toFixed(1)}g, C:${c.toFixed(1)}g, F:${f.toFixed(1)}g, Cal:${k.toFixed(0)}kcal`);
    });
    console.groupEnd();
    console.groupEnd();
  } catch {}
}

// Intelligens kombináció algoritmus
const findBalancedMealCombination = (
  recipes: CombinedRecipe[],
  mealTypes: string[],
  targetMacros: Macros,
  allNutritionData: Alapanyag[],
  opts?: { sameLunchDinner?: boolean }
): CombinedRecipe[] => {
  // Kategorizálás makró profil szerint
  const highProtein = recipes.filter(r => {
    const macros = calculateRecipeMacros(r, allNutritionData);
    return macros.protein > (targetMacros.protein / 5) * 0.4;
  });
  
  const highCarbs = recipes.filter(r => {
    const macros = calculateRecipeMacros(r, allNutritionData);
    return macros.carbs > (targetMacros.carbs / 5) * 0.4;
  });
  
  const highFat = recipes.filter(r => {
    const macros = calculateRecipeMacros(r, allNutritionData);
    return macros.fat > (targetMacros.fat / 5) * 0.4;
  });
  
  const balanced = recipes.filter(r => {
    const macros = calculateRecipeMacros(r, allNutritionData);
    return macros.protein <= (targetMacros.protein / 5) * 0.4 &&
           macros.carbs <= (targetMacros.carbs / 5) * 0.4 &&
           macros.fat <= (targetMacros.fat / 5) * 0.4;
  });
  
  // Minden étkezéshez megfelelő kategóriából választás
  const selectedRecipes: CombinedRecipe[] = [];
  const usedIds = new Set<number | string>();
  
  mealTypes.forEach((mealType, index) => {
    const availableRecipes = recipes.filter(r => 
      r.mealTypes?.some(mt => mt.toLowerCase() === mealType.toLowerCase())
    );
    
    if (availableRecipes.length === 0) {
      // Ha nincs megfelelő étkezés típus, válassz bármelyikből
      const allRecipes = [...highProtein, ...highCarbs, ...highFat, ...balanced];
      selectedRecipes.push(allRecipes[Math.floor(Math.random() * allRecipes.length)]);
      return;
    }
    
    // Kategória kiválasztása az étkezés típusa alapján
    let category: CombinedRecipe[];
    switch (mealType.toLowerCase()) {
      case 'reggeli':
        category = highCarbs.length > 0 ? highCarbs : balanced;
        break;
      case 'ebéd':
        category = highProtein.length > 0 ? highProtein : balanced;
        break;
      case 'vacsora':
        category = highFat.length > 0 ? highFat : balanced;
        break;
      case 'tízórai':
      case 'uzsonna':
        category = balanced.length > 0 ? balanced : highCarbs;
        break;
      default:
        category = balanced.length > 0 ? balanced : availableRecipes;
    }
    
    // Válassz a kategóriából, ami elérhető az adott étkezés típushoz
    const availableInCategory = category.filter(r => 
      availableRecipes.some(ar => ar.id === r.id)
    );
    
    const pickFrom = availableInCategory.length > 0 ? availableInCategory : availableRecipes;
    // Prevent duplicates across meals (we'll explicitly set vacsora=ebéd later if needed)
    const pool = pickFrom.filter(r => !usedIds.has(r.id));
    const chosen = (pool.length > 0 ? pool : pickFrom)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : pickFrom.length))];
    console.log(`✅ [ACCEPT] ${mealType} → ${chosen?.név || 'ismeretlen'} (id=${chosen?.id})`);
    selectedRecipes.push(chosen);
    usedIds.add(chosen.id);
  });
  
  return selectedRecipes;
};

const calculateDynamicMealDistribution = (mealTypes: string[]): number[] => {
  // Meal-plan-test presetek
  if (mealTypes.length === 1) return [1.0];
  if (mealTypes.length === 2) return [0.6364, 0.3636]; // ebéd, vacsora ~ [35/55, 20/55]
  if (mealTypes.length === 3) return [0.3125, 0.4375, 0.25]; // reggeli, ebéd, vacsora
  if (mealTypes.length === 4) return [0.25, 0.10, 0.40, 0.25]; // reggeli, tízórai, ebéd, vacsora
  // 5 étkezés
  return [0.25, 0.10, 0.35, 0.10, 0.20];
};

const calculateMacroDistance = (macros1: Macros, macros2: Macros): number => {
  const proteinDiff = Math.abs(macros1.protein - macros2.protein) / (macros2.protein || 1);
  const carbsDiff = Math.abs(macros1.carbs - macros2.carbs) / (macros2.carbs || 1);
  const fatDiff = Math.abs(macros1.fat - macros2.fat) / (macros2.fat || 1);
  const caloriesDiff = Math.abs(macros1.calories - macros2.calories) / (macros2.calories || 1);
  
  return (proteinDiff + carbsDiff + fatDiff + caloriesDiff) / 4;
};

export const areMacrosWithinMacroTolerance = (
  actual: Macros,
  target: Macros,
  tolerance: number
): boolean => {
  const proteinTolerance = Math.abs(actual.protein - target.protein) / (target.protein || 1);
  const carbsTolerance = Math.abs(actual.carbs - target.carbs) / (target.carbs || 1);
  const fatTolerance = Math.abs(actual.fat - target.fat) / (target.fat || 1);
  const caloriesTolerance = Math.abs(actual.calories - target.calories) / (target.calories || 1);
  
  // Növelt tolerancia a jobb találási arányhoz
  return proteinTolerance <= tolerance && 
         carbsTolerance <= tolerance && 
         fatTolerance <= tolerance && 
         caloriesTolerance <= tolerance;
};

function convertToTestRecipeIngredient(ingredient) {
  return {
    ID: ingredient.ID,
    Recept_ID: ingredient.Recept_ID || 0,
    // Prefer the already-present accented field; fallback to non-accented if needed
    Élelmiszerek: ingredient['Élelmiszerek'] || ingredient.Elelmiszer || ingredient.Elelmiszerek || '',
    'Élelmiszer ID': ingredient['Élelmiszer ID'] || ingredient.ID,
    Elelmiszer: ingredient.Elelmiszer,
    Mennyiség: parseFloat(ingredient.Mennyiség?.toString() || '0') || 0,
    Mértékegység: ingredient.Mértékegység,
    Skálázhatóság_Típus: ingredient.Skálázhatóság_Típus || ingredient.Tipus || '',
    Arány_Csoport: (() => {
      const raw = (ingredient.Kotes ?? ingredient.Arány_Csoport ?? '')
        .toString()
        .trim()
        .toLowerCase();
      // Normalizálás: üres, 'null', 'n/a' → UNBOUND
      if (raw === '' || raw === 'null' || raw === 'n/a' || raw === 'none') {
        return 'UNBOUND';
      }
      return (ingredient.Kotes || ingredient.Arány_Csoport) as string;
    })(),
    nutrition: (ingredient as any).nutrition
  };
}

function convertToTestRecipe(recipe: any): any {
  return {
    id: recipe.id,
    name: recipe.name,
    ingredients: recipe.ingredients || []
  };
}

export async function generateAndScaleMealPlan(input: MealPlanInput): Promise<MealPlanOutput> {
  const { availableRecipes, allNutritionData, mealTypes, dailyTarget } = input;
  const totalRecipes = availableRecipes.length;
  
  // Szigorú pre-filter: denzitás + tengely dominancia + cél arányok
  const baseCfg: PreFilterConfig = {
    densityThreshold: 0.6,
    pDominantMinP100: 20,
    cDominantMinC100: 25,
    fDominantMinF100: 12,
    dominanceFactor: 2,
    ratioToleranceFactor: 0.95,
    // Lazítás: a MealPlanTest-hez igazodva itt nem kötelező a 3/3 tengely,
    // a dominancia arányt az optimalizáló elviszi; denzitás marad.
    enforceAxes: false,
    enforceRatio: true,
  };
  let cfg = { ...baseCfg };
  let filteredRecipes: CombinedRecipe[] = [];
  let lastRejections: any[] = [];
  let pfAttempt = 0;
  while (pfAttempt < 4) {
    const { accepted, rejections } = strictPreFilterRecipes(
      availableRecipes,
      allNutritionData,
      { protein: dailyTarget.protein, carbs: dailyTarget.carbs, fat: dailyTarget.fat },
      cfg
    );
    lastRejections = rejections;
    // Log elutasítási okok
    for (const rej of rejections) {
      for (const reason of rej.reasons) {
        if (reason === 'fails_density') {
          const d = rej.details?.density;
          console.log(`🚫 [PreFilter] ${rej.recipeName} (${rej.recipeId}) elutasítva: Denzitás nem éri el a küszöböt (kapott=${typeof d === 'number' ? d.toFixed(2) : d}, min=${cfg.densityThreshold})`);
        } else if (reason === 'missing_axis') {
          console.log(`🚫 [PreFilter] ${rej.recipeName} (${rej.recipeId}) elutasítva: Hiányzó makró tengely (P=${rej.details?.hasAxes?.p}, C=${rej.details?.hasAxes?.c}, F=${rej.details?.hasAxes?.f})`);
        } else if (reason === 'fails_ratio') {
          console.log(`🚫 [PreFilter] ${rej.recipeName} (${rej.recipeId}) elutasítva: Arány küszöb bukás`);
        }
      }
    }
    filteredRecipes = accepted;
    log('🔍 Szigorú pre-filter eredmény', { from: availableRecipes.length, to: filteredRecipes.length, cfg });
    if (filteredRecipes.length >= Math.max(3, mealTypes.length)) break;
    // Ha kevés recept maradt, óvatos lazítás
    cfg = {
      ...cfg,
      densityThreshold: Math.max(0.55, (cfg.densityThreshold ?? 0.6) - 0.05),
      ratioToleranceFactor: Math.max(0.85, (cfg.ratioToleranceFactor ?? 0.95) - 0.03),
    };
    pfAttempt++;
  }

  // Prefilter summary for debug (accepted vs total, and rejection reasons)
  try {
    const acceptedCount = filteredRecipes.length;
    const reasonCounts: Record<string, number> = { fails_density: 0, fails_ratio: 0, missing_axis: 0 };
    for (const rej of lastRejections || []) {
      for (const r of rej.reasons || []) {
        if (reasonCounts[r] == null) reasonCounts[r] = 0;
        reasonCounts[r]++;
      }
    }
    const parts: string[] = [];
    if (reasonCounts.fails_density) parts.push(`denzitás: ${reasonCounts.fails_density}`);
    if (reasonCounts.fails_ratio) parts.push(`arány: ${reasonCounts.fails_ratio}`);
    if (cfg.enforceAxes && reasonCounts.missing_axis) parts.push(`hiányzó tengely: ${reasonCounts.missing_axis}`);
    const reasonsStr = parts.length ? ` | Elutasítások – ${parts.join(', ')}` : '';
    console.log(`✅ Előszűrés összegzés: ${acceptedCount}/${totalRecipes} recept elfogadva (makrósűrűség ≥ ${Number(cfg.densityThreshold).toFixed(2)} + arányok OK).${reasonsStr}`);
  } catch {}
  
  // Ha nincs megfelelő recept, használjuk az összes receptet
  if (filteredRecipes.length === 0) {
    console.log(`⚠️ Nincs megfelelő recept a szűrés után. Az összes recept használata.`);
    filteredRecipes = availableRecipes.filter(recipe => 
      recipe.ingredients && recipe.ingredients.length > 0
    );
  }
  
  // Ha még mindig nincs recept, adjunk vissza hibaüzenetet
  if (filteredRecipes.length === 0) {
    return {
      success: false,
      message: 'Nincs megfelelő recept a makró célokhoz.',
      scaledMeals: [],
      finalTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }
  
  log('✅ Végleges recept pool', filteredRecipes.length);
  
  const distribution = calculateDynamicMealDistribution(mealTypes);
  let attempt = 0;
  const MAX_ATTEMPTS = 50; // Csökkentett próbálkozások száma a gyorsabb futtatáshoz
  let bestResult: MealPlanOutput | null = null;
  let bestTotalAbsError = Infinity;
  
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    
    // Intelligens kombináció algoritmus használata
    let selectedRecipes = findBalancedMealCombination(filteredRecipes, mealTypes, dailyTarget, allNutritionData, { sameLunchDinner: input.sameLunchDinner });

    // Enforce ebéd=vacsora same recipe if requested, while allowing independent scaling
    if (input.sameLunchDinner) {
      const lunchIndex = mealTypes.findIndex(mt => mt.toLowerCase() === 'ebéd');
      const dinnerIndex = mealTypes.findIndex(mt => mt.toLowerCase() === 'vacsora');
      if (lunchIndex >= 0 && dinnerIndex >= 0 && selectedRecipes[lunchIndex]) {
        // Use a deep clone so dinner has an independent recipe instance for scaling
        selectedRecipes[dinnerIndex] = JSON.parse(JSON.stringify(selectedRecipes[lunchIndex]));
      }
    }
    
    let scaledMeals = selectedRecipes.map((recipe, index) => {
      const mealPercentage = distribution[index];
      const targetMacrosForMeal: Macros = {
        calories: dailyTarget.calories * mealPercentage,
        protein: dailyTarget.protein * mealPercentage,
        carbs: dailyTarget.carbs * mealPercentage,
        fat: dailyTarget.fat * mealPercentage,
      };
      
      // Dinamikus tolerancia számítása
      const tolerance = getMealTolerance(mealTypes[index], attempt);
      log('[MEAL TARGET]', { index, mealType: mealTypes[index], target: targetMacrosForMeal, tolerance });
      
      // Rögzített skálázás
      const scalingResult = fixedScaling(recipe, targetMacrosForMeal, allNutritionData);
      
      const res = { 
        mealNumber: index + 1, 
        mealType: mealTypes[index], 
        recipe, 
        scalingResult, 
        targetMacrosForMeal 
      };
      log('[MEAL SCALED]', { index, scaled: scalingResult.scaledMacros });
      // Debug: hozzávalók makrói (initial)
      debugLogIngredients({ recipe, scalingResult, mealType: mealTypes[index] }, allNutritionData, 'initial', index);
      return res;
    });

    // Kezdeti per‑étkezés eltérések naplózása
    try {
      console.group('🔎 Per‑meal target vs scaled (initial)');
      scaledMeals.forEach((m: any, i: number) => {
        const t = m.targetMacrosForMeal;
        const s = calculateTotalMacros(m.scalingResult.scaledIngredients || [], allNutritionData);
        const dev = {
          p: ((s.protein - t.protein) / Math.max(1, t.protein)) * 100,
          c: ((s.carbs   - t.carbs)   / Math.max(1, t.carbs))   * 100,
          f: ((s.fat     - t.fat)     / Math.max(1, t.fat))     * 100
        };
        console.log(`🍽️ ${i+1}. ${m.mealType}`, { target: t, scaled: s, deviations_pct: dev });
      });
      console.groupEnd();
    } catch {}

    // === Atomikus greedy finomhangolás a teljes napra (MealPlanTest logika) ===
    // Cél: csak a 95% alatt lévő tengelyeket húzzuk fel, 35 iter, kis lépésekkel, L∞ javulás feltétellel
    const nutritionIndex = new Map<number, Alapanyag>(
      allNutritionData.map((n: any) => [Number(n.ID), n as unknown as Alapanyag])
    );

    const getPer100 = (ing: any) => {
      const id = Number(ing['Élelmiszer ID'] ?? ing.ID);
      const row: any = nutritionIndex.get(id);
      if (!row) return { p100: 0, c100: 0, f100: 0, k100: 0 };
      const toNum = (v: any) => Number(String(v).replace(',', '.')) || 0;
      return {
        p100: toNum(row['Fehérje/100g']),
        c100: toNum(row['Szénhidrát/100g']),
        f100: toNum(row['Zsir/100g']),
        k100: toNum(row['Kaloria/100g'])
      };
    };

    const unitStepG = (ing: any, current: number) => {
      const u = String(ing['Mértékegység'] || '').toLowerCase();
      if (u === 'db') return 1;
      if (u === 'evőkanál') return 15;
      if (u === 'teáskanál') return 5;
      // alap: 2% vagy min 5g
      return Math.max(5, Math.round(current * 0.02));
    };

    const isLikelyCondiment = (name: string) => {
      const n = (name || '').toLowerCase();
      return /(só|bors|koriander|petrezselyem|kapor|bazsalikom|oregano|fűszer|fűszerkeverék|füszer|chili pehely|szerecsendió)/.test(n);
    };

    const isAromatic = (name: string) => {
      const n = (name || '').toLowerCase();
      return /(hagyma|lilahagyma|vöröshagyma|fokhagyma|chili|csili|gyömbér)/.test(n);
    };

    const computeTotals = (meals: any[]) => {
      return meals.reduce(
        (tot, m) => {
          const mm = calculateTotalMacros(m.scalingResult.scaledIngredients || [], allNutritionData);
          tot.calories += mm.calories; tot.protein += mm.protein; tot.carbs += mm.carbs; tot.fat += mm.fat; return tot;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
    };

    const linf = (t: any) => Math.max(
      Math.abs(t.protein - dailyTarget.protein) / Math.max(1, dailyTarget.protein),
      Math.abs(t.carbs   - dailyTarget.carbs)   / Math.max(1, dailyTarget.carbs),
      Math.abs(t.fat     - dailyTarget.fat)     / Math.max(1, dailyTarget.fat)
    );

    let greedyIters = 0;
    const MAX_GREEDY = mealTypes.length >= 4 ? 50 : 35;
    while (greedyIters < MAX_GREEDY) {
      greedyIters++;
      const totalsNow = computeTotals(scaledMeals);
      const cov = {
        p: totalsNow.protein / Math.max(1, dailyTarget.protein),
        c: totalsNow.carbs   / Math.max(1, dailyTarget.carbs),
        f: totalsNow.fat     / Math.max(1, dailyTarget.fat)
      };
      const withinBand = cov.p >= 0.95 && cov.p <= 1.05 && cov.c >= 0.95 && cov.c <= 1.05 && cov.f >= 0.95 && cov.f <= 1.05;
      if (withinBand) { console.log(`✅ Greedy stop: within 95–105% band at iter ${greedyIters}`); break; }

      const under = [
        { key: 'protein' as const, v: cov.p },
        { key: 'carbs' as const,   v: cov.c },
        { key: 'fat' as const,     v: cov.f }
      ].filter(x => x.v < 0.95).sort((a,b) => a.v - b.v);
      if (under.length === 0) { console.log(`⏹️ Greedy stop: no macro under 95% at iter ${greedyIters}`); break; }
      const targetKey = under[0].key;

      let best: null | { mi: number; ii: number; newQ: number; newL: number } = null;
      const beforeL = linf(totalsNow);
      scaledMeals.forEach((meal: any, mi: number) => {
        const arr = meal.scalingResult.scaledIngredients || [];
        const origArr = meal.scalingResult.originalIngredients || [];
        arr.forEach((ing: any, ii: number) => {
          const q = Number(ing.Mennyiség) || 0;
          if (!(q > 0)) return;
          const name = String(ing['Élelmiszerek'] || '');
          if (isLikelyCondiment(name)) return; // condiments: ne skálázzuk
          const { p100, c100, f100, k100 } = getPer100(ing);
          // Szűrés: nagyon alacsony makró/100g ne legyen hordozó
          if (p100 + c100 + f100 < 1) return;
          // Makrónyereség/kcal küszöb: legalább 0.02 g/kcal
          const macroPerKcal = (p100 + c100 + f100) / Math.max(1, k100);
          if (macroPerKcal < 0.02) return;
          let step = unitStepG(ing, q);
          // adaptív lépés, ha kevés iteráción belül nincs javulás
          if (greedyIters > 20 && mealTypes.length >= 4) step = Math.max(step, Math.round(q * 0.03));
          // Aromatics: max ~3x az eredetihez képest
          let cappedQty = q + step;
          if (isAromatic(name)) {
            const id = ing['Élelmiszer ID'];
            const orig = (origArr || []).find((o: any) => o['Élelmiszer ID'] === id);
            const baseQ = Number(orig?.Mennyiség) || q;
            const maxQ = baseQ * 3;
            if (cappedQty > maxQ) return;
          }
          const simMeals = scaledMeals.map((m: any, j: number) => ({
            ...m,
            scalingResult: {
              ...m.scalingResult,
              scaledIngredients: (m.scalingResult.scaledIngredients || []).map((x: any, k: number) =>
                (j === mi && k === ii) ? { ...x, Mennyiség: cappedQty } : x
              )
            }
          }));
          const tot = computeTotals(simMeals);
          const newL = linf(tot);
          if (newL < beforeL - 1e-6) {
            if (!best || newL < best.newL) best = { mi, ii, newQ: q + step, newL };
          }
        });
      });

      if (!best) { console.log(`⛔ Greedy no improving step (iter ${greedyIters}) for`, targetKey); break; }
      // Alkalmazzuk a legjobb lépést
      try {
        const chosen = scaledMeals[best.mi].scalingResult.scaledIngredients[best.ii];
        console.log(`🔧 Greedy iter ${greedyIters}: target=${targetKey} meal=${best.mi+1} ingredient="${chosen?.['Élelmiszerek']}" step→ ${best.newQ}`);
      } catch {}
      scaledMeals = scaledMeals.map((m: any, j: number) => ({
        ...m,
        scalingResult: {
          ...m.scalingResult,
          scaledIngredients: (m.scalingResult.scaledIngredients || []).map((x: any, k: number) =>
            (j === best!.mi && k === best!.ii) ? { ...x, Mennyiség: best!.newQ } : x
          )
        }
      }));
    }

    const finalTotals = scaledMeals.reduce(
      (totals, meal) => {
        totals.calories += meal.scalingResult.scaledMacros.calories;
        totals.protein += meal.scalingResult.scaledMacros.protein;
        totals.carbs += meal.scalingResult.scaledMacros.carbs;
        totals.fat += meal.scalingResult.scaledMacros.fat;
        return totals;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    // Végső per‑étkezés eltérések + hozzávaló makrók naplózása
    try {
      console.group('📊 Per‑meal target vs scaled (final)');
      scaledMeals.forEach((m: any, i: number) => {
        const t = m.targetMacrosForMeal;
        const s = calculateTotalMacros(m.scalingResult.scaledIngredients || [], allNutritionData);
        const dev = {
          p: ((s.protein - t.protein) / Math.max(1, t.protein)) * 100,
          c: ((s.carbs   - t.carbs)   / Math.max(1, t.carbs))   * 100,
          f: ((s.fat     - t.fat)     / Math.max(1, t.fat))     * 100
        };
        console.log(`🍽️ ${i+1}. ${m.mealType}`, { target: t, scaled: s, deviations_pct: dev });
        debugLogIngredients(m, allNutritionData, 'final', i);
      });
      console.groupEnd();
      console.log('🏁 Final totals vs daily target', { finalTotals, dailyTarget });
    } catch {}
    
    const proteinAccuracy = ((1 - Math.abs(finalTotals.protein - dailyTarget.protein) / dailyTarget.protein) * 100).toFixed(1);
    const carbsAccuracy = ((1 - Math.abs(finalTotals.carbs - dailyTarget.carbs) / dailyTarget.carbs) * 100).toFixed(1);
    const fatAccuracy = ((1 - Math.abs(finalTotals.fat - dailyTarget.fat) / dailyTarget.fat) * 100).toFixed(1);
    log('[TOTALS]', { finalTotals, dailyTarget, proteinAccuracy, carbsAccuracy, fatAccuracy });
    
    // Sávos ellenőrzés (95–105%) – csak P/C/F számít, kalóriát nem vesszük figyelembe
    const withinBand =
      Math.abs(finalTotals.protein - dailyTarget.protein) / Math.max(1, dailyTarget.protein) <= 0.05 &&
      Math.abs(finalTotals.carbs   - dailyTarget.carbs)   / Math.max(1, dailyTarget.carbs)   <= 0.05 &&
      Math.abs(finalTotals.fat     - dailyTarget.fat)     / Math.max(1, dailyTarget.fat)     <= 0.05;
    if (withinBand) {
      return {
        success: true,
        message: `Sikeres étrend generálva ${attempt} próbálkozásból. Pontosság: P:${proteinAccuracy}%, C:${carbsAccuracy}%, F:${fatAccuracy}%`,
        scaledMeals,
        finalTotals,
      };
    }
    
    const totalAbsError =
      Math.abs(finalTotals.calories - dailyTarget.calories) +
      Math.abs(finalTotals.protein - dailyTarget.protein) +
      Math.abs(finalTotals.carbs - dailyTarget.carbs) +
      Math.abs(finalTotals.fat - dailyTarget.fat);
    if (totalAbsError < bestTotalAbsError) {
      bestTotalAbsError = totalAbsError;
      
      const bestProteinAccuracy = ((1 - Math.abs(finalTotals.protein - dailyTarget.protein) / dailyTarget.protein) * 100).toFixed(1);
      const bestCarbsAccuracy = ((1 - Math.abs(finalTotals.carbs - dailyTarget.carbs) / dailyTarget.carbs) * 100).toFixed(1);
      const bestFatAccuracy = ((1 - Math.abs(finalTotals.fat - dailyTarget.fat) / dailyTarget.fat) * 100).toFixed(1);
      
      bestResult = {
        success: false,
        message: `Nem sikerült 12%-os hibahatáron belüli étrendet generálni, de ez a legjobb közelítés (${attempt} próbálkozásból). Pontosság: P:${bestProteinAccuracy}%, C:${bestCarbsAccuracy}%, F:${bestFatAccuracy}%`,
        scaledMeals,
        finalTotals,
      };
    }
  }
  
  if (bestResult) {
    return bestResult;
  }
  return {
    success: false,
    message: `Nem sikerült 12%-os hibahatáron belüli étrendet generálni ${MAX_ATTEMPTS} próbálkozás alatt. Próbáld meg más makró célokkal vagy étkezés típusokkal.`,
    scaledMeals: [],
    finalTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
} 