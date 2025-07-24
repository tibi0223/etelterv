import { TestRecipe } from '@/lib/testData/testRecipes';
import { TestRecipeIngredient, ScalingCategory } from '@/lib/testData/testRecipeIngredients';
import { Alapanyag } from './database/types';

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

const getQuantityInGrams = (ingredient: TestRecipeIngredient): number => {
  const { Mennyiség, Mértékegység } = ingredient;
  const unit = Mértékegység?.toLowerCase().trim() || '';
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
  if (unit.includes('ml') || unit.includes('liter')) {
    return quantity; // 1ml ≈ 1g vízhez
  }
  if (unit.includes('tk') || unit.includes('teáskanál')) {
    return quantity * 5; // 1 tk ≈ 5g
  }
  if (unit.includes('ek') || unit.includes('evőkanál')) {
    return quantity * 15; // 1 ek ≈ 15g
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

  return quantity; // Fallback: ha nem ismerjük, akkor quantity
};

const getMacrosForIngredient = (
  ingredient: TestRecipeIngredient,
  allNutritionData: Alapanyag[]
) => {
  const nutritionData = allNutritionData.find(n => 
    n.ID.toString().trim() === ingredient['Élelmiszer ID'].toString().trim()
  );
  const quantityInGrams = getQuantityInGrams(ingredient);
  if (!nutritionData) {
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }
  return {
    protein: (parseFloat(nutritionData['Fehérje/100g'].replace(',', '.')) || 0) * quantityInGrams / 100,
    carbs: (parseFloat(nutritionData['Szénhidrát/100g'].replace(',', '.')) || 0) * quantityInGrams / 100,
    fat: (parseFloat(nutritionData['Zsir/100g'].replace(',', '.')) || 0) * quantityInGrams / 100,
    calories:
      ((parseFloat(nutritionData['Fehérje/100g'].replace(',', '.')) || 0) * 4 +
       (parseFloat(nutritionData['Szénhidrát/100g'].replace(',', '.')) || 0) * 4 +
       (parseFloat(nutritionData['Zsir/100g'].replace(',', '.')) || 0) * 9) * quantityInGrams / 100,
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
    const scaledIngredients = ingredients.map(ing => ({
      ...ing,
      Mennyiség: ing.Mennyiség * scale
    }));

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

  const finalScaledIngredients = ingredients.map(ing => ({
    ...ing,
    Mennyiség: ing.Mennyiség * bestScale
  }));

  return {
    success: true,
    message: 'Proportionally scaled recipe.',
    scaledIngredients: finalScaledIngredients,
    originalIngredients: ingredients,
    originalMacros,
    scaledMacros: calculateTotalMacros(finalScaledIngredients, allNutritionData)
  };
};

const scaleRecipeByIngredients = (input: ScalingInput): ScalingOutput => {
  if (input.recipe['Recept_Skálázhatóság'] === 'Nem skálázható' || input.recipe['Recept_Skálázhatóság'] === 'Arányos') {
    return scaleRecipeProportionallyInternal(input);
  }

  const { ingredients, allNutritionData, targetMacros, limits } = input;
  const originalMacros = calculateTotalMacros(ingredients, allNutritionData);
  let currentIngredients = JSON.parse(JSON.stringify(ingredients)) as TestRecipeIngredient[];

  const categorized = { 'FŐ_MAKRO': [], 'KIEGÉSZÍTŐ': [], 'ÍZESÍTŐ': [], 'KÖTÖTT': [] } as Record<ScalingCategory, TestRecipeIngredient[]>;
  ingredients.forEach(ing => categorized[ing.Skálázhatóság_Típus]?.push(ing));

  const scaleableIngredients = [...categorized['FŐ_MAKRO'], ...categorized['KIEGÉSZÍTŐ']];

  if (scaleableIngredients.length === 0) {
    return scaleRecipeProportionallyInternal(input);
  }
  
  for (let iteration = 0; iteration < 300; iteration++) {
    const currentMacros = calculateTotalMacros(currentIngredients, allNutritionData);
    
    const proteinError = Math.abs(currentMacros.protein - targetMacros.protein) / (targetMacros.protein || 1);
    const carbsError = Math.abs(currentMacros.carbs - targetMacros.carbs) / (targetMacros.carbs || 1);
    const fatError = Math.abs(currentMacros.fat - targetMacros.fat) / (targetMacros.fat || 1);
    
    const totalError = proteinError + carbsError + fatError;
    
    if (totalError < 0.06) {
      break;
    }
    
    let bestAction = { ingredientId: -1, newQuantity: -1, bestError: totalError };

    for (const ingredient of scaleableIngredients) {
      const originalIng = ingredients.find(i => i.ID === ingredient.ID)!;
      const currentIng = currentIngredients.find(i => i.ID === ingredient.ID)!;
      
      const stepSize = Math.max(1, Math.round(originalIng.Mennyiség * 0.08));
      
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

  categorized['KÖTÖTT'].forEach(kötöttIng => {
    if (!kötöttIng.Arány_Csoport) return;
    const mainIngredient = categorized['FŐ_MAKRO'].find(main => main.Arány_Csoport === kötöttIng.Arány_Csoport);
    if (!mainIngredient) return;

    const originalMain = ingredients.find(i => i.ID === mainIngredient.ID)!;
    const scaledMain = currentIngredients.find(i => i.ID === mainIngredient.ID)!;
    const originalKötött = ingredients.find(i => i.ID === kötöttIng.ID)!;
    
    if(originalMain.Mennyiség > 0) {
      const ratio = scaledMain.Mennyiség / originalMain.Mennyiség;
      const kötöttToUpdate = currentIngredients.find(i => i.ID === kötöttIng.ID)!;
      kötöttToUpdate.Mennyiség = originalKötött.Mennyiség * ratio;
    }
  });

  currentIngredients.forEach(ing => { 
    ing.Mennyiség = Math.round(ing.Mennyiség * 100) / 100;
  });
  
  currentIngredients = applyMinimumsToIngredients(currentIngredients);

  return {
    success: true,
    message: 'Scaled by ingredients using optimized algorithm.',
    scaledIngredients: currentIngredients,
    originalIngredients: ingredients,
    originalMacros,
    scaledMacros: calculateTotalMacros(currentIngredients, allNutritionData)
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
    limits: { upper: 50, lower: 0.01 }, // Növelve 30-ról 50-re
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