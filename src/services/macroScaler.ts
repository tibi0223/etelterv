import { TestRecipe } from '@/lib/testData/testRecipes';
import { TestRecipeIngredient, ScalingCategory } from '@/lib/testData/testRecipeIngredients';
import { Alapanyag } from './database/types';
import { log, warn } from '@/lib/debug';

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface ScalingInput {
  recipe: TestRecipe;
  ingredients: TestRecipeIngredient[];
  allNutritionData: Alapanyag[];
  targetMacros: Macros;
  limits: {
    upper: number;
    lower: number;
  };
}

export interface ScalingOutput {
  success: boolean;
  message: string;
  scaledIngredients: TestRecipeIngredient[];
  originalIngredients: TestRecipeIngredient[];
  originalMacros: Macros;
  scaledMacros: Macros;
}

// Élelmiszer-specifikus átváltás 'db' egységhez (gramm)
const DB_UNIT_GRAMS: Record<string, number> = {
  'Tojás': 55,
  'Tojás (keményre főtt)': 55,
  'Vöröshagyma': 80,
  'Lilahagyma': 80,
  'Nori lap': 3,
  'Paradicsom': 120,
  'Paprika': 100,
  'Kaliforniai paprika': 130,
  'Sárgarépa': 60,
  'Lime': 70,
  'Citrom': 100,
  'Alma': 150,
  'Kígyóuborka': 300,
  'Avokádó': 200,
  'Fehérrépa': 80,
  'Cukkini': 200,
  'Brokkoli': 250,
  'Teljes kiőrlésű tortilla lap': 40,
  'Teljes kiőrlésű tortilla': 40,
  'Tortilla lap (teljes kiőrlésű)': 40,
  'Tojásfehérje': 33,
  'Babérlevél': 1,
  'Koktélparadicsom': 20,
  'Chili paprika': 15,
  'Teljes kiőrlésű wrap': 40,
  'Csiperkegombafej': 30,
  'Portobello gombafej': 60,
  'Csemegeuborka': 30,
  'Citromlé': 10,
  'Karfiol': 400,
  'Leveskocka': 10,
  'Karalábé': 150,
  'Citromhéj': 5,
  'Gullon keksz': 12,
  'Fekete olívabogyó': 4,
  'Padlizsán': 250,
  'Póréhagyma': 100,
  // ... bővíthető ...
};

// Kiegészítő mértékegységek kezelése (gyakori rövidítések)
const EXTRA_UNIT_MULTIPLIERS: Record<string, number> = {
  dkg: 10,
  dl: 100,
  cl: 10,
  l: 1000,
};

export const getQuantityInGrams = (ingredient: TestRecipeIngredient): number => {
  const { Mennyiség, Mértékegység } = ingredient;
  const unit = Mértékegység?.toLowerCase().trim() || '';
  const name = (ingredient.Élelmiszerek || '').toLowerCase();
  const isOil = /olaj|olíva|oliva|kókuszzsír|kokuszszsir|kókusz zsír|kokusz zsir/.test(name);
  const quantity = parseFloat(Mennyiség?.toString().replace(',', '.') || '0');

  // DB_UNIT_GRAMS lookup table használata
  const gramsPerUnit = DB_UNIT_GRAMS[unit];
  if (gramsPerUnit !== undefined) {
    return quantity * gramsPerUnit;
  }

  // Fallback: ha nincs a lookup table-ban, próbáljuk parse-olni
  if (unit.includes('g') || unit.includes('gramm')) {
    return quantity;
  }
  if (unit.includes('kg')) {
    return quantity * 1000;
  }
  if (EXTRA_UNIT_MULTIPLIERS[unit] !== undefined) {
    return quantity * EXTRA_UNIT_MULTIPLIERS[unit];
  }
  if (unit.includes('ml') || unit.includes('liter')) {
    return quantity; // 1ml ≈ 1g vízhez
  }
  if (unit.includes('tk') || unit.includes('teáskanál')) {
    // Olajoknál pontosabb konverzió
    return quantity * (isOil ? 4.5 : 5);
  }
  if (unit.includes('ek') || unit.includes('evőkanál')) {
    return quantity * (isOil ? 14 : 15);
  }
  if (unit.includes('csomag') || unit.includes('cs')) {
    return quantity * 100; // 1 csomag ≈ 100g
  }
  if (unit.includes('db') || unit.includes('darab')) {
    return quantity * 55; // 1 db ≈ 55g (átlagos)
  }
  if (unit.includes('marék') || unit.includes('maréknyi')) {
    return quantity * 30; // 1 marék ≈ 30g
  }

  warn('[UNIT] unknown unit, using raw quantity', { unit, quantity });
  return quantity; // Fallback: ha nem ismerjük, akkor quantity
};

const removeAccents = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const getMacrosForIngredient = (
  ingredient: TestRecipeIngredient,
  allNutritionData: Alapanyag[]
) => {
  // 1) ID alapú egyezés
  let nutritionData = allNutritionData.find(n => 
    n.ID?.toString().trim() === ingredient['Élelmiszer ID']?.toString().trim()
  );
  // 2) Ha nincs ID egyezés, próbáljuk név alapján (ékezetek nélkül, kisbetűvel)
  if (!nutritionData) {
    const ingName = removeAccents(((ingredient as any).Élelmiszerek || '').toString());
    if (ingName) {
      nutritionData = allNutritionData.find(n => removeAccents(n.Elelmiszer || '') === ingName);
      if (nutritionData) {
        log('[NUTRITION] matched by name', { name: (ingredient as any).Élelmiszerek });
      }
    }
  }
  const quantityInGrams = getQuantityInGrams(ingredient);
  if (!nutritionData) {
    // 3) Végső fallback: ha van beágyazott nutrition mező az összetevőn
    warn('[NUTRITION] NOT FOUND in DB', { id: ingredient['Élelmiszer ID'], name: ingredient['Élelmiszerek'] });
    const fallback = (ingredient as any).nutrition;
    if (fallback) {
      log('[NUTRITION] using embedded fallback');
      const p = parseFloat(String(fallback['Fehérje/100g'] ?? '0').replace(',', '.')) || 0;
      const c = parseFloat(String(fallback['Szénhidrát/100g'] ?? '0').replace(',', '.')) || 0;
      const f = parseFloat(String(fallback['Zsir/100g'] ?? '0').replace(',', '.')) || 0;
      const k = p * 4 + c * 4 + f * 9;
      return {
        protein: (p * quantityInGrams) / 100,
        carbs: (c * quantityInGrams) / 100,
        fat: (f * quantityInGrams) / 100,
        calories: (k * quantityInGrams) / 100,
      };
    }
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }
  const p = parseFloat(String(nutritionData['Fehérje/100g'] ?? '0').replace(',', '.')) || 0;
  const c = parseFloat(String(nutritionData['Szénhidrát/100g'] ?? '0').replace(',', '.')) || 0;
  const f = parseFloat(String(nutritionData['Zsir/100g'] ?? '0').replace(',', '.')) || 0;
  const k = p * 4 + c * 4 + f * 9;
  return {
    protein: (p * quantityInGrams) / 100,
    carbs: (c * quantityInGrams) / 100,
    fat: (f * quantityInGrams) / 100,
    calories: (k * quantityInGrams) / 100,
  };
};

export const calculateTotalMacros = (
  ingredients: TestRecipeIngredient[],
  allNutritionData: Alapanyag[]
): Macros => {
  return ingredients.reduce(
    (totals, ingredient) => {
      const macros = getMacrosForIngredient(ingredient, allNutritionData);
      totals.protein += macros.protein;
      totals.carbs += macros.carbs;
      totals.fat += macros.fat;
      totals.calories += macros.calories;
      return totals;
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );
};

const calculateMacroDistance = (macros1: Macros, macros2: Macros): number => {
  const proteinDiff = macros1.protein - macros2.protein;
  const carbsDiff = macros1.carbs - macros2.carbs;
  const fatDiff = macros1.fat - macros2.fat;
  const calorieDiff = (macros1.calories - macros2.calories) / 4;
  return Math.sqrt(proteinDiff**2 + carbsDiff**2 + fatDiff**2 + calorieDiff**2);
};

// Minimum mennyiségek mértékegységenként
const MINIMUMS: Record<string, number> = {
  'db': 0.25,
  'g': 1,
  'ml': 1,
  'evőkanál': 0.25,
  'teáskanál': 0.25,
  'csomag': 0.1,
  'gerezd': 0.25,
  // egyéb mértékegységekhez is adható
};

function applyMinimumsToIngredients(ingredients: TestRecipeIngredient[]): TestRecipeIngredient[] {
  return ingredients.map(ing => {
    const min = MINIMUMS[(ing.Mértékegység || '').toLowerCase()] ?? 0.01;
    return {
      ...ing,
      Mennyiség: Math.max(ing.Mennyiség, min)
    };
  });
}

const scaleRecipeProportionallyInternal = (input: ScalingInput): ScalingOutput => {
  const { ingredients, allNutritionData, targetMacros, limits } = input;
  const originalMacros = calculateTotalMacros(ingredients, allNutritionData);
  log('[SCALE:PROP] original macros', originalMacros);
  
  if (originalMacros.protein === 0 && originalMacros.carbs === 0 && originalMacros.fat === 0) {
    return {
      success: false,
      message: 'Nincs makróadat az alapanyagokhoz.',
      scaledIngredients: ingredients,
      originalIngredients: ingredients,
      originalMacros,
      scaledMacros: originalMacros
    };
  }

  let bestScale = 1;
  let bestError = Infinity;

  for (let scale = limits.lower; scale <= limits.upper; scale += 0.01) {
    const scaledIngredients = ingredients.map(ing => {
      const isBound = !!(ing as any).Arány_Csoport && (ing as any).Arány_Csoport !== 'UNBOUND';
      const freezeSupplement = (ing as any).Skálázhatóság_Típus === 'KIEGÉSZÍTŐ' && !isBound;
      return {
        ...ing,
        Mennyiség: freezeSupplement ? ing.Mennyiség : ing.Mennyiség * scale,
      };
    });

    const scaledMacros = calculateTotalMacros(scaledIngredients, allNutritionData);
    
    const proteinError = Math.abs(scaledMacros.protein - targetMacros.protein) / (targetMacros.protein || 1);
    const carbsError = Math.abs(scaledMacros.carbs - targetMacros.carbs) / (targetMacros.carbs || 1);
    const fatError = Math.abs(scaledMacros.fat - targetMacros.fat) / (targetMacros.fat || 1);
    
    const totalError = proteinError + carbsError + fatError;
    
    if (totalError < bestError) {
      bestError = totalError;
      bestScale = scale;
    }
  }

  const finalScaledIngredients = ingredients.map(ing => {
    const isBound = !!(ing as any).Arány_Csoport && (ing as any).Arány_Csoport !== 'UNBOUND';
    const freezeSupplement = (ing as any).Skálázhatóság_Típus === 'KIEGÉSZÍTŐ' && !isBound;
    return {
      ...ing,
      Mennyiség: freezeSupplement ? ing.Mennyiség : ing.Mennyiség * bestScale,
    };
  });

  const scaledTotals = calculateTotalMacros(finalScaledIngredients, allNutritionData);
  log('[SCALE:PROP] bestScale', bestScale, 'scaled:', scaledTotals);
  return {
    success: true,
    message: 'Proportionally scaled recipe.',
    scaledIngredients: finalScaledIngredients,
    originalIngredients: ingredients,
    originalMacros,
    scaledMacros: scaledTotals
  };
};

const scaleRecipeByIngredients = (input: ScalingInput): ScalingOutput => {
  if (input.recipe['Recept_Skálázhatóság'] === 'Nem skálázható' || input.recipe['Recept_Skálázhatóság'] === 'Arányos') {
    return scaleRecipeProportionallyInternal(input);
  }

  const { ingredients, allNutritionData, targetMacros, limits } = input;
  const originalMacros = calculateTotalMacros(ingredients, allNutritionData);
  log('[SCALE:ING] original macros', originalMacros);
  let currentIngredients = JSON.parse(JSON.stringify(ingredients)) as TestRecipeIngredient[];

  // Kötések alapján csoportosítás
  const bindingGroups: Record<string, TestRecipeIngredient[]> = {};
  ingredients.forEach(ing => {
    const binding = ing.Arány_Csoport || 'UNBOUND';
    if (!bindingGroups[binding]) {
      bindingGroups[binding] = [];
    }
    bindingGroups[binding].push(ing);
  });

  // Csak akkor logoljuk, ha több mint 1 csoport van és van benne kötött alapanyag
  const bindingGroupKeys = Object.keys(bindingGroups);
  const hasBindings = bindingGroupKeys.some(key => key !== 'UNBOUND' && bindingGroups[key].length > 1);
  
  if (hasBindings) {
    console.log('🔗 Kötési csoportok:', bindingGroupKeys.map(key => 
      `${key}: ${bindingGroups[key].length} alapanyag`
    ));
  }

  const categorized = { 'FŐ_MAKRO': [], 'KIEGÉSZÍTŐ': [], 'ÍZESÍTŐ': [], 'KÖTÖTT': [] } as Record<ScalingCategory, TestRecipeIngredient[]>;
  ingredients.forEach(ing => categorized[ing.Skálázhatóság_Típus]?.push(ing));

  // Csak a fő makró összetevőket hangoljuk aktívan. A kiegészítők csak akkor változnak,
  // ha kötési csoport arányosítás érinti őket.
  const scaleableIngredients = [...categorized['FŐ_MAKRO']];

  if (scaleableIngredients.length === 0) {
    return scaleRecipeProportionallyInternal(input);
  }
  
  // Csökkentett iterációk száma a gyorsabb futtatáshoz
  for (let iteration = 0; iteration < 150; iteration++) {
    const currentMacros = calculateTotalMacros(currentIngredients, allNutritionData);
    log('[SCALE:ING] iter', iteration, 'currentMacros', currentMacros);
    
    const proteinError = Math.abs(currentMacros.protein - targetMacros.protein) / (targetMacros.protein || 1);
    const carbsError = Math.abs(currentMacros.carbs - targetMacros.carbs) / (targetMacros.carbs || 1);
    const fatError = Math.abs(currentMacros.fat - targetMacros.fat) / (targetMacros.fat || 1);
    
    const totalError = proteinError + carbsError + fatError;
    
    // Növelt tolerancia a gyorsabb konvergenciához
    if (totalError < 0.08) {
      break;
    }
    
    let bestAction = { ingredientId: -1, newQuantity: -1, bestError: totalError };

    for (const ingredient of scaleableIngredients) {
      const originalIng = ingredients.find(i => i.ID === ingredient.ID)!;
      const currentIng = currentIngredients.find(i => i.ID === ingredient.ID)!;
      
      // Nagyobb lépések a gyorsabb konvergenciához
      const stepSize = Math.max(1, Math.round(originalIng.Mennyiség * 0.12));
      
      const increasedQuantity = Math.min(currentIng.Mennyiség + stepSize, originalIng.Mennyiség * limits.upper);
      const increasedSim = currentIngredients.map(ing => ing.ID === ingredient.ID ? { ...ing, Mennyiség: increasedQuantity } : ing);
      const increasedMacros = calculateTotalMacros(increasedSim, allNutritionData);
      const increasedProteinError = Math.abs(increasedMacros.protein - targetMacros.protein) / (targetMacros.protein || 1);
      const increasedCarbsError = Math.abs(increasedMacros.carbs - targetMacros.carbs) / (targetMacros.carbs || 1);
      const increasedFatError = Math.abs(increasedMacros.fat - targetMacros.fat) / (targetMacros.fat || 1);
      const increasedTotalError = increasedProteinError + increasedCarbsError + increasedFatError;
      
      if (increasedTotalError < bestAction.bestError) {
        bestAction = { ingredientId: ingredient.ID, newQuantity: increasedQuantity, bestError: increasedTotalError };
      }

      const decreasedQuantity = Math.max(currentIng.Mennyiség - stepSize, originalIng.Mennyiség * limits.lower);
      const decreasedSim = currentIngredients.map(ing => ing.ID === ingredient.ID ? { ...ing, Mennyiség: decreasedQuantity } : ing);
      const decreasedMacros = calculateTotalMacros(decreasedSim, allNutritionData);
      const decreasedProteinError = Math.abs(decreasedMacros.protein - targetMacros.protein) / (targetMacros.protein || 1);
      const decreasedCarbsError = Math.abs(decreasedMacros.carbs - targetMacros.carbs) / (targetMacros.carbs || 1);
      const decreasedFatError = Math.abs(decreasedMacros.fat - targetMacros.fat) / (targetMacros.fat || 1);
      const decreasedTotalError = decreasedProteinError + decreasedCarbsError + decreasedFatError;

      if (decreasedTotalError < bestAction.bestError) {
        bestAction = { ingredientId: ingredient.ID, newQuantity: decreasedQuantity, bestError: decreasedTotalError };
      }
    }

    if (bestAction.ingredientId !== -1) {
      const ingredientToUpdate = currentIngredients.find(i => i.ID === bestAction.ingredientId)!;
      ingredientToUpdate.Mennyiség = bestAction.newQuantity;
    } else {
      break;
    }
  }

  // Kötések kezelése - minden csoportot feldolgozunk, de csak jelentős változásnál logolunk
  Object.entries(bindingGroups).forEach(([binding, groupIngredients]) => {
    if (binding === 'UNBOUND' || groupIngredients.length <= 1) return;
    
    // Keressük meg a fő alapanyagot (FŐ_MAKRO vagy KÖTÖTT)
    const mainIngredient = groupIngredients.find(ing => 
      ing.Skálázhatóság_Típus === 'FŐ_MAKRO' || ing.Skálázhatóság_Típus === 'KÖTÖTT'
    ) || groupIngredients[0];
    
    const originalMain = ingredients.find(i => i.ID === mainIngredient.ID)!;
    const scaledMain = currentIngredients.find(i => i.ID === mainIngredient.ID)!;
    
    if (originalMain.Mennyiség > 0) {
      const ratio = scaledMain.Mennyiség / originalMain.Mennyiség;
      
      // Skálázzuk a csoport többi alapanyagát ugyanazzal az aránnyal
      groupIngredients.forEach(ing => {
        if (ing.ID === mainIngredient.ID) return; // A fő alapanyag már skálázva van
        // Kötési csoportban minden tag arányosodik (beleértve a kiegészítőket is)
        const originalIng = ingredients.find(i => i.ID === ing.ID)!;
        const scaledIng = currentIngredients.find(i => i.ID === ing.ID)!;
        scaledIng.Mennyiség = originalIng.Mennyiség * ratio;
      });
      
      // Csak akkor logoljuk, ha jelentős változás történt
      if (Math.abs(ratio - 1.0) > 0.05) {
        console.log(`🔗 Kötési csoport "${binding}" skálázva: ${ratio.toFixed(2)}x arány`);
      }
    }
  });

  currentIngredients.forEach(ing => { 
    ing.Mennyiség = Math.round(ing.Mennyiség * 100) / 100;
  });
  
  currentIngredients = applyMinimumsToIngredients(currentIngredients);

  const finalScaled = calculateTotalMacros(currentIngredients, allNutritionData);
  log('[SCALE:ING] final scaled', finalScaled);
  return {
    success: true,
    message: 'Scaled by ingredients using optimized algorithm with binding groups.',
    scaledIngredients: currentIngredients,
    originalIngredients: ingredients,
    originalMacros,
    scaledMacros: finalScaled
  };
};

export const scaleRecipe = (input: ScalingInput): ScalingOutput => {
  const scalingType = input.recipe['Recept_Skálázhatóság'];

  // === NEM SKÁLÁZHATÓ RECEPT KEZELÉSE ===
  if (scalingType === 'Nem skálázható') {
    const originalMacros = calculateTotalMacros(input.ingredients, input.allNutritionData);
    return {
      success: true,
      message: 'Ez a recept nem skálázható, csak egész adagban használható.',
      scaledIngredients: input.ingredients,
      originalIngredients: input.ingredients,
      originalMacros,
      scaledMacros: originalMacros,
    };
  }

  // === JAVÍTOTT KÉTLÉPCSŐS LOGIKA ===
  // 1. Először próbáljuk arányosan szorozni az egész adagot, amíg a makrók aránya nem lépi túl a cél makrók 1%-os hibahatárát
  let proportionalResult = scaleRecipeProportionallyInternal({
    ...input,
    limits: { upper: 5.0, lower: 0.1 }, // Rögzített, ésszerű korlátok
  });
  const withinTolerance = (macro, target) => Math.abs(macro - target) / (target || 1) <= 0.01; // 1% tolerancia (csökkentve 2%-ról)
  const allMacrosWithin = proportionalResult.scaledMacros && input.targetMacros &&
    withinTolerance(proportionalResult.scaledMacros.protein, input.targetMacros.protein) &&
    withinTolerance(proportionalResult.scaledMacros.carbs, input.targetMacros.carbs) &&
    withinTolerance(proportionalResult.scaledMacros.fat, input.targetMacros.fat);
  if (allMacrosWithin) {
    proportionalResult.message += ' (Kétlépcsős: csak adag szorzás elég volt)';
    return proportionalResult;
  }

  // 2. Ha az arányos nem elég pontos, használjuk az alapanyag-szintű skálázást
  return scaleRecipeByIngredients(input);
};

export const scaleRecipeProportionally = (input: ScalingInput): ScalingOutput => {
  return scaleRecipeProportionallyInternal(input);
}; 