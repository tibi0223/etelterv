import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DayNav } from './ui/DayNav';
import { MacroBadge } from './ui/MacroBadge';
import { ScaledIngredientsTable } from './ui/ScaledIngredientsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alapanyag } from '@/services/database/types';
import { generateAndScaleMealPlan, MealPlanOutput } from '@/services/mealPlanGenerator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import cloneDeep from 'lodash/cloneDeep';
import { fetchCombinedRecipes } from '@/services/newDatabaseQueries';
import { fetchAlapanyagok, fetchReceptAlapanyagV2 } from '@/services/database/fetchers';
import { Target, Scale, Calculator, TrendingUp, User, ChefHat, X, Clock, Users, Info, Save } from 'lucide-react';
import { getUserPreferences, UserPreference } from '@/services/preferenceFilters';
import { getUserFavorites, UserFavorite } from '@/services/userFavorites';
import { normalizeText } from '@/utils/textNormalization';
import { getRecipesByMealType } from '@/services/recipeFilters';
import { fetchMealTypes } from '@/services/supabaseQueries';
import { processMealTypes } from '@/utils/dataProcessors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SharedIngredientSelector } from './shared/SharedIngredientSelector';
import { useDataCache } from './DataCacheContext';
import { calculateTotalMacros, scaleRecipe } from '@/services/macroScaler';
import { log, warn, group } from '@/lib/debug';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { fetchUserProfile } from '@/services/profileQueries';
import { saveMealPlan } from '@/services/savedMealPlansQueries';
import { supabase } from '@/integrations/supabase/client';

interface MacroScalerAppProps {
  user: any;
  onBack: () => void;
}

// Helper functions
const getCombinationId = (result: MealPlanOutput) => {
  if (!result.success || !result.scaledMeals) return '';
  return result.scaledMeals.map(meal => meal.recipe?.név || 'unknown').join('|');
};

const diffPercent = (actual: number, target: number) => {
  if (target === 0) return 0;
  return Math.abs((actual - target) / target) * 100;
};

const MEAL_TYPES = [
  'reggeli',
  'tízórai',
  'ebéd',
  'uzsonna',
  'vacsora',
];

// Segédfüggvény: ékezetek eltávolítása
function removeAccents(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function parseMacroValue(val) {
  if (typeof val === 'string') {
    return Number(val.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  }
  return Number(val) || 0;
}

// Segédfüggvény: 100g makrók kiszámítása normalizált névvel
function getMacroPer100g(ingredient, macroType, nutritionData) {
  const id = String(ingredient['Élelmiszer ID'] ?? '').trim();
  let alapanyag = nutritionData?.find(nd => String(nd['ID']).trim() === id);
  if (!alapanyag) {
    // Fallback: név szerinti egyezés ékezetek nélkül
    const norm = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    const ingName = norm(ingredient['Élelmiszerek'] || ingredient.Elelmiszer);
    alapanyag = nutritionData?.find(nd => norm(nd.Elelmiszer) === ingName);
  }
  if (!alapanyag) {
    console.warn(`[MAKRO] Nincs tápanyag adat ehhez az összetevőhöz`, { id, name: ingredient['Élelmiszerek'] });
    return 0;
  }
  if (macroType === 'fat') {
    console.log(`[DEBUG makroScaler] Zsir/100g mező:`, alapanyag['Zsir/100g'], '| parse:', parseMacroValue(alapanyag['Zsir/100g']));
  }
  if (macroType === 'calories') {
    console.log(`[DEBUG makroScaler] Kaloria/100g mező:`, alapanyag['Kaloria/100g'], '| parse:', parseMacroValue(alapanyag['Kaloria/100g']));
  }
  switch (macroType) {
    case 'protein': return parseMacroValue(alapanyag['Fehérje/100g']);
    case 'carbs': return parseMacroValue(alapanyag['Szénhidrát/100g']);
    case 'fat': return parseMacroValue(alapanyag['Zsir/100g']);
    case 'calories': return parseMacroValue(alapanyag['Kaloria/100g']);
    default: return 0;
  }
}

// Helper function to convert ReceptAlapanyagV2 to TestRecipeIngredient
function convertToTestRecipeIngredient(ingredient: any) {
  return {
    ...ingredient,
    Skálázhatóság_Típus: ingredient.Tipus || ingredient.Skálázhatóság_Típus || '',
    Arány_Csoport: ingredient.Kotes || ingredient.Arány_Csoport || '',
    // plusz minden egyéb property, ami kellhet
  };
}

export function MacroScalerApp({ user, onBack }: MacroScalerAppProps) {
  // Dinamikus étkezési eloszlás számítása
  const getMealDistribution = (selectedMeals: string[]) => {
    // Alapértelmezett eloszlás (100% = 5 étkezés)
    const baseDistribution = {
      reggeli: 25,
      tízórai: 10, 
      ebéd: 35,
      uzsonna: 10,
      vacsora: 20
    };
    
    // Ha nincs kiválasztott étkezés, alapértelmezett
    if (selectedMeals.length === 0) {
      return baseDistribution;
    }
    
    // Csak a kiválasztott étkezések újraelosztása
    const selectedMealsTotal = selectedMeals.reduce((sum, meal) => {
      return sum + (baseDistribution[meal as keyof typeof baseDistribution] || 0);
    }, 0);
    
    const distribution: Record<string, number> = {};
    
    selectedMeals.forEach(meal => {
      const basePercentage = baseDistribution[meal as keyof typeof baseDistribution] || 0;
      distribution[meal] = Math.round((basePercentage / selectedMealsTotal) * 100);
    });
    
    console.log('📊 Dinamikus étkezési eloszlás:', {
      selectedMeals,
      distribution,
      total: Object.values(distribution).reduce((sum, val) => sum + val, 0)
    });
    
    return distribution;
  };

  // Google Drive URL konverter és Supabase storage URL kezelő
  const convertImageUrl = (url: string, recipeId?: number): string => {
    console.log('🖼️ convertImageUrl hívva:', { url, recipeId });
    
    if (!url) return '';
    
    // Ha már közvetlen URL, visszaadjuk
    if (url.startsWith('http') && !url.includes('drive.google.com/thumbnail')) {
      console.log('✅ Közvetlen URL használata:', url);
      return url;
    }
    
    // Ha van recipeId, generáljuk a Supabase storage URL-t a recept ID alapján
    if (recipeId) {
      const imageFileName = `${recipeId}.jpg`;
      console.log('🔍 Supabase storage URL generálása:', { recipeId, imageFileName });
      
      const { data } = supabase.storage
        .from('receptek')
        .getPublicUrl(imageFileName);
      
      if (data?.publicUrl) {
        console.log(`✅ Kép URL generálva: Recept ID ${recipeId} -> ${imageFileName} -> ${data.publicUrl}`);
        return data.publicUrl;
      } else {
        console.warn(`⚠️ Nem sikerült generálni a kép URL-t: Recept ID ${recipeId} -> ${imageFileName}`);
      }
    }
    
    // Ha a recept ID alapján van megadva (pl. "1.jpg"), akkor Supabase storage URL-t generálunk
    if (url.match(/^\d+\.(jpg|jpeg|png|gif|webp)$/i)) {
      console.log('🔍 Fájlnév alapú URL generálás:', url);
      const { data } = supabase.storage
        .from('receptek')
        .getPublicUrl(url);
      
      if (data?.publicUrl) {
        console.log('✅ Fájlnév alapú URL generálva:', url, '->', data.publicUrl);
        return data.publicUrl;
      }
    }
    
    // Google Drive thumbnail URL konvertálása közvetlen URL-re
    const thumbnailMatch = url.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/);
    if (thumbnailMatch) {
      const fileId = thumbnailMatch[1];
      const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      console.log('✅ Google Drive URL konvertálva:', url, '->', driveUrl);
      return driveUrl;
    }
    
    // Ha nem thumbnail URL, de Google Drive URL
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      console.log('✅ Google Drive URL konvertálva:', url, '->', driveUrl);
      return driveUrl;
    }
    
    console.log('⚠️ Nem sikerült konvertálni az URL-t:', url);
    return url;
  };

  const { recipes, setRecipes, alapanyagok, setAlapanyagok, mealTypes, setMealTypes, isLoaded, setIsLoaded } = useDataCache();
  const [targetProtein, setTargetProtein] = useState('120');
  const [targetCarbs, setTargetCarbs] = useState('160');
  const [targetFat, setTargetFat] = useState('50');
  const [targetCalories, setTargetCalories] = useState('1700');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [allNutritionData, setAllNutritionData] = useState<Alapanyag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mealPlanResult, setMealPlanResult] = useState<MealPlanOutput | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<Array<{ day: number; date: string; result: MealPlanOutput }>>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [previousCombinationIds, setPreviousCombinationIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingTime, setLoadingTime] = useState(0);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [mealIngredients, setMealIngredients] = useState<any>({});
  // Alapból rejtve: ne jelenjen meg rögtön az alapanyag szűrés
  const [showIngredientSelection, setShowIngredientSelection] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
  const [userFavorites, setUserFavorites] = useState<UserFavorite[]>([]);
  const [mealTypeRecipes, setMealTypeRecipes] = useState<Record<string, string[]>>({});
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Profil betöltése és makró célok/étkezésszám beállítása
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchUserProfile(user.id);
        if (profile) {
          // Ha vannak mentett makró célok, használjuk őket
          if (profile.target_protein) setTargetProtein(profile.target_protein.toString());
          if (profile.target_carbs) setTargetCarbs(profile.target_carbs.toString());
          if (profile.target_fat) setTargetFat(profile.target_fat.toString());
          if (profile.target_calories) setTargetCalories(profile.target_calories.toString());
        }
        // Étkezésszám a user metaadatból → automatikus meal list
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const m = Number(authUser?.user_metadata?.meals_per_day);
          const count = Number.isFinite(m) && m >= 1 && m <= 5 ? m : 3;
          // Étkezés listák életszerű kombinációi
          // Igazítás a meal-plan-test logikához
          const mapping: Record<number, string[]> = {
            1: ['ebéd'],
            2: ['ebéd', 'vacsora'],
            3: ['reggeli', 'ebéd', 'vacsora'],
            4: ['reggeli', 'tízórai', 'ebéd', 'vacsora'],
            5: ['reggeli', 'tízórai', 'ebéd', 'uzsonna', 'vacsora']
          };
          setSelectedMealTypes(mapping[count] || mapping[3]);
        } catch {}
        setProfileLoaded(true);
      } catch (error) {
        console.error('Profil betöltési hiba:', error);
        setProfileLoaded(true); // Folytatjuk a betöltést
      }
    };
    loadProfile();
  }, [user.id]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Ha már van cache-ben, onnan olvasunk
        if (isLoaded && recipes.length > 0 && alapanyagok.length > 0 && mealTypes.length > 0) {
          setAllRecipes(recipes);
          setAllNutritionData(alapanyagok);
          // mealTypes is an array, but setMealTypeRecipes expects Record<string, string[]>
          // We'll skip this for now since it's not critical for functionality
          setIsLoading(false);
          return;
        }
        // Ha nincs cache-ben, letöltjük
        const [recipesData, ingredients, nutritionData, preferences, favorites, mealTypesData] = await Promise.all([
          fetchCombinedRecipes(),
          fetchReceptAlapanyagV2(),
          fetchAlapanyagok(),
          getUserPreferences(user.id),
          getUserFavorites(user.id),
          fetchMealTypes(),
        ]);
        const recipesWithIngredients = recipesData.map(recipe => ({
          ...recipe,
          ingredients: ingredients
            .filter(i => i.Recept_ID === recipe.id || i.Recept_ID === recipe['Recept ID'])
            .map(ing => ({
              ...ing,
              Skálázhatóság_Típus: ing.Tipus || '',
            })),
          Receptnév: recipe.név,
          Recept_Skálázhatóság: recipe['Recept_Skálázhatóság'] || '',
        }));
        setAllRecipes(recipesWithIngredients);
        setAllNutritionData(nutritionData);
        setUserPreferences(preferences);
        setUserFavorites(favorites);
        const processedMealTypes = processMealTypes(mealTypesData || []);
        setMealTypeRecipes(processedMealTypes);
        // Frissítjük a cache-t is
        setRecipes(recipesWithIngredients);
        setAlapanyagok(nutritionData);
        setMealTypes(Object.keys(processedMealTypes));
        setIsLoaded(true);
      } catch (error) {
        console.error('Hiba az adatok betöltése közben:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user.id]);

  // Debug: nutritionData ellenőrzése
  if (allNutritionData && allNutritionData.length > 0) {
    log('[LOAD] nutrition items:', allNutritionData.length);
    log('[LOAD] nutrition keys:', Object.keys(allNutritionData[0] || {}));
  } else {
    warn('[LOAD] nutritionData empty or not loaded');
  }

  // Étkezés kiválasztó logika (UI nélkül, csak belső használat)
  const handleMealToggle = (_mealKey: string) => {};

  // Alapanyag szűrés logika
  const handleMealIngredientsChange = (ingredients: any) => {
    setMealIngredients(ingredients);
  };

  // Memoized filtered recipes for better performance
  const filteredRecipes = useMemo(() => {
    if (!allRecipes.length || !selectedMealTypes.length) return [];
    
    // Minden kiválasztott mealType-ra lekérjük a recepteket
    const recipeSet = new Map();
    
    for (const mealType of selectedMealTypes) {
      let recipesForType = getRecipesByMealType(
        allRecipes,
        {}, // mealTypeRecipes nem használjuk
        mealType,
        userPreferences
      );
      
      // Alapanyag szűrés alkalmazása, ha van megadva
      const selectedIngredients = mealIngredients[mealType] || [];
      if (selectedIngredients.length > 0) {
        const ingredientNames = selectedIngredients.map((ing: any) => ing.ingredient.toLowerCase());
        recipesForType = recipesForType.filter(recipe =>
          ingredientNames.every(ingName =>
            (recipe.ingredients || []).some((ri: any) =>
              ri['Élelmiszerek'] && ri['Élelmiszerek'].toLowerCase().includes(ingName)
            )
          )
        );
      }
      
      for (const recipe of recipesForType) {
        recipeSet.set(recipe.id, recipe);
      }
    }
    
    return Array.from(recipeSet.values());
  }, [allRecipes, selectedMealTypes, userPreferences, mealIngredients]);

  const getFilteredRecipes = useCallback(() => {
    return filteredRecipes;
  }, [filteredRecipes]);

  const handleGenerateMealPlan = useCallback(() => {
    console.log('handleGenerateMealPlan elindítva');
    console.log('Állapot:', { recipes: !!recipes, alapanyagok: !!alapanyagok, selectedMealTypes: selectedMealTypes.length });

    if (!recipes || !alapanyagok || selectedMealTypes.length === 0) {
      console.log('❌ Hiányzó adatok, kilépés');
      toast({
        title: "Hiányzó adatok",
        description: "Kérlek válassz ki étkezési típusokat és ellenőrizd, hogy minden adat betöltve van.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Adatok rendben, generálás indítása');
    
    // Azonnal beállítjuk a loading állapotot
    setIsGenerating(true);
    setMealPlanResult(null);
    setWeeklyPlan([]);
    setCurrentDayIndex(0);
    setLoadingMessage('🔍 Receptek szűrése és kategorizálása...');
    setLoadingTime(0);
    console.log('✅ Loading állapot beállítva');

    // Loading idő követése
    const startTime = Date.now();
    const loadingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingTime(elapsed);
      console.log(`⏱️ Loading idő: ${elapsed}s`);
      
      // Dinamikus üzenetek az időtartam alapján
      if (elapsed <= 3) {
        setLoadingMessage('🔍 Receptek szűrése és kategorizálása...');
      } else if (elapsed <= 6) {
        setLoadingMessage('⚖️ Makró célok ellenőrzése...');
      } else if (elapsed <= 10) {
        setLoadingMessage('📊 Receptek skálázása és optimalizálása...');
      } else if (elapsed <= 15) {
        setLoadingMessage('🎯 Megfelelő kombinációk keresése...');
      } else if (elapsed <= 20) {
        setLoadingMessage('🔄 Még mindig keresek új kombinációkat...');
      } else {
        setLoadingMessage('⏰ Ez hosszabb időt vesz igénybe, kérlek várj...');
      }
    }, 1000);

    // A nehéz számításokat a következő tick-ben indítjuk
    setTimeout(() => {
      const generatePlan = async () => {
        console.log('🔄 generatePlan async függvény elindítva');
        const targetMacros = {
          protein: parseFloat(targetProtein) || 0,
          carbs: parseFloat(targetCarbs) || 0,
          fat: parseFloat(targetFat) || 0,
          calories: parseFloat(targetCalories) || 0,
        };
        
        const availableRecipes = getFilteredRecipes();
        console.log(`📋 Elérhető receptek: ${availableRecipes.length}`);
        
        try {
          console.log('🎯 Heti étrend generálása (7 nap)');
          // Read same_lunch_dinner and repeat_tolerance from user metadata
          let sameLunchDinner = false;
          let repeatTolerance: any = null;
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            sameLunchDinner = Boolean(authUser?.user_metadata?.same_lunch_dinner);
            repeatTolerance = (authUser?.user_metadata as any)?.repeat_tolerance || null;
          } catch {}

          const results: Array<{ day: number; date: string; result: MealPlanOutput }> = [];
          const mealKeyMap: Record<string, string> = {
            'reggeli': 'breakfast',
            'tízórai': 'tizorai',
            'ebéd': 'lunch',
            'uzsonna': 'uzsonna',
            'vacsora': 'dinner',
          };
          const blockRemaining: Record<string, number> = {};
          const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
          const getTol = (mealType: string) => {
            const key = mealKeyMap[mealType] || mealType;
            const rec = repeatTolerance?.[key] || {};
            let min = Number(rec.min ?? 1) || 1;
            let max = Number(rec.max ?? 1) || 1;
            min = Math.max(1, Math.min(7, min));
            max = Math.max(min, Math.min(7, max));
            return { min, max };
          };

          let previousDayResult: MealPlanOutput | null = null;
          for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toLocaleDateString('hu-HU');

            const baseResult = await generateAndScaleMealPlan({
              availableRecipes,
              allNutritionData,
              mealTypes: selectedMealTypes,
              dailyTarget: targetMacros,
              userPreferences,
              userFavorites,
              sameLunchDinner,
            });

            // Per-meal repeat blocks
            let finalResult: MealPlanOutput = baseResult;
            try {
              if (i === 0) {
                // Initialize remaining counters after day 1 based on tolerance
                for (const mealType of selectedMealTypes) {
                  const { min, max } = getTol(mealType);
                  blockRemaining[mealType] = Math.max(0, randInt(min, max) - 1);
                }
              } else if (previousDayResult && selectedMealTypes.length > 0) {
                const chosenMeals: any[] = [];
                for (const mealType of selectedMealTypes) {
                  const prevMeal = previousDayResult.scaledMeals.find(m => m.mealType === mealType);
                  const todaysMeal = baseResult.scaledMeals.find(m => m.mealType === mealType);
                  if (!prevMeal || !todaysMeal) {
                    if (todaysMeal) chosenMeals.push(todaysMeal);
                    continue;
                  }
                if ((blockRemaining[mealType] ?? 0) > 0) {
                  // Repeat recipe but rescale to today's target macros (use yesterday's scaledIngredients as baseline)
                  const mealIdx = baseResult.scaledMeals.findIndex(m => m.mealType === mealType);
                  const target = baseResult.scaledMeals[mealIdx]?.targetMacrosForMeal || baseResult.finalTotals; 
                  const prevRecipeClone = JSON.parse(JSON.stringify(prevMeal.recipe));
                  const baseIngs = (prevMeal.scalingResult?.scaledIngredients || []) as any;
                  const scaling = scaleRecipe({
                    recipe: prevRecipeClone as any,
                    ingredients: baseIngs,
                    allNutritionData,
                    targetMacros: target,
                    limits: { upper: 5.0, lower: 0.1 },
                  });
                  chosenMeals.push({ ...prevMeal, recipe: prevRecipeClone, scalingResult: scaling, targetMacrosForMeal: target });
                  blockRemaining[mealType] = (blockRemaining[mealType] ?? 0) - 1;
                } else {
                    // Start a new block with today's meal
                    const { min, max } = getTol(mealType);
                    blockRemaining[mealType] = Math.max(0, randInt(min, max) - 1);
                    chosenMeals.push(todaysMeal);
                  }
                }
                // Enforce ebéd=vacsora if requested
                if (sameLunchDinner) {
                  const lunchIdx = chosenMeals.findIndex((m:any) => m.mealType === 'ebéd');
                  const dinnerIdx = chosenMeals.findIndex((m:any) => m.mealType === 'vacsora');
                  if (lunchIdx >= 0 && dinnerIdx >= 0) {
                    const dinnerTarget = chosenMeals[dinnerIdx]?.targetMacrosForMeal
                      || baseResult.scaledMeals.find(m => m.mealType === 'vacsora')?.targetMacrosForMeal
                      || baseResult.finalTotals;
                    const lunchRecipe = chosenMeals[lunchIdx].recipe;
                    const lunchRecipeClone = JSON.parse(JSON.stringify(lunchRecipe));
                    // Use the original (non-scaled) lunch ingredients as the starting point for dinner scaling
                    const baseIngredients = (chosenMeals[lunchIdx].scalingResult?.originalIngredients
                      || chosenMeals[lunchIdx].scalingResult?.scaledIngredients
                      || []) as any;
                    const scaling = scaleRecipe({
                      recipe: lunchRecipeClone as any,
                      ingredients: baseIngredients,
                      allNutritionData,
                      targetMacros: dinnerTarget,
                      limits: { upper: 5.0, lower: 0.1 },
                    });
                    chosenMeals[dinnerIdx] = {
                      ...chosenMeals[dinnerIdx],
                      recipe: lunchRecipeClone,
                      scalingResult: scaling,
                      targetMacrosForMeal: dinnerTarget,
                    } as any;
                  }
                }
                // recompute totals
                const totals = chosenMeals.reduce((acc, m) => {
                  const t = calculateTotalMacros(m.scalingResult?.scaledIngredients || [], allNutritionData);
                  acc.protein += t.protein; acc.carbs += t.carbs; acc.fat += t.fat; acc.calories += t.calories; return acc;
                }, { protein: 0, carbs: 0, fat: 0, calories: 0 } as any);
                finalResult = { ...baseResult, scaledMeals: chosenMeals as any, finalTotals: totals };
              }
            } catch {}

            results.push({ day: i + 1, date: dateStr, result: finalResult });
            previousDayResult = finalResult;

            if (finalResult.success) {
              const newId = getCombinationId(finalResult);
              setPreviousCombinationIds(prev => [...prev, newId]);
            }
          }

          clearInterval(loadingInterval);
          console.log('✅ Heti eredmények elkészültek');
          setWeeklyPlan(results);
          setCurrentDayIndex(0);
          setMealPlanResult(results[0]?.result || null);
          toast({
            title: "Heti étrend elkészült!",
            description: "7 nap megjeleníthető, napok közt gombokkal lépkedhetsz.",
          });
        } catch (error) {
          clearInterval(loadingInterval);
          console.error("❌ Étrend generálási hiba:", error);
          toast({
            title: "Hiba történt",
            description: "Váratlan hiba történt az étrend generálása során.",
            variant: "destructive",
          });
        } finally {
          console.log('🏁 generatePlan befejezve');
          setIsGenerating(false);
          setLoadingMessage('');
          setLoadingTime(0);
        }
      };
      
      generatePlan();
    }, 0);
  }, [
    targetProtein,
    targetCarbs,
    targetFat,
    targetCalories,
    allNutritionData,
    allRecipes,
    selectedMealTypes,
    userPreferences,
    userFavorites,
    mealTypeRecipes,
    mealIngredients,
    getFilteredRecipes,
    recipes,
    alapanyagok,
  ]);

  const handleNewCombination = useCallback(() => {
    setMealPlanResult(null);
    setWeeklyPlan([]);
    setCurrentDayIndex(0);
    setIsGenerating(true);
    setLoadingMessage('🔄 Új kombináció keresése...');
    setLoadingTime(0);

    // Loading idő követése
    const startTime = Date.now();
    const loadingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingTime(elapsed);
      
      // Dinamikus üzenetek az időtartam alapján
      if (elapsed <= 3) {
        setLoadingMessage('🔍 Receptek szűrése és kategorizálása...');
      } else if (elapsed <= 6) {
        setLoadingMessage('⚖️ Makró célok ellenőrzése...');
      } else if (elapsed <= 10) {
        setLoadingMessage('📊 Receptek skálázása és optimalizálása...');
      } else if (elapsed <= 15) {
        setLoadingMessage('🎯 Megfelelő kombinációk keresése...');
      } else if (elapsed <= 20) {
        setLoadingMessage('🔄 Még mindig keresek új kombinációkat...');
      } else {
        setLoadingMessage('⏰ Ez hosszabb időt vesz igénybe, kérlek várj...');
      }
    }, 1000);
    
    const generatePlan = async () => {
      const targetMacros = {
        protein: parseFloat(targetProtein) || 0,
        carbs: parseFloat(targetCarbs) || 0,
        fat: parseFloat(targetFat) || 0,
        calories: parseFloat(targetCalories) || 0,
      };
      
      const availableRecipes = getFilteredRecipes();
      
      try {
        // Read repeat_tolerance
        let repeatTolerance: any = null;
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          repeatTolerance = (authUser?.user_metadata as any)?.repeat_tolerance || null;
        } catch {}

        const mealKeyMap: Record<string, string> = {
          'reggeli': 'breakfast',
          'tízórai': 'tizorai',
          'ebéd': 'lunch',
          'uzsonna': 'uzsonna',
          'vacsora': 'dinner',
        };
        const blockRemaining: Record<string, number> = {};
        const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        const getTol = (mealType: string) => {
          const key = mealKeyMap[mealType] || mealType;
          const rec = repeatTolerance?.[key] || {};
          let min = Number(rec.min ?? 1) || 1;
          let max = Number(rec.max ?? 1) || 1;
          min = Math.max(1, Math.min(7, min));
          max = Math.max(min, Math.min(7, max));
          return { min, max };
        };

        const results: Array<{ day: number; date: string; result: MealPlanOutput }> = [];
        let previousDayResult: MealPlanOutput | null = null;
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const dateStr = date.toLocaleDateString('hu-HU');
          const baseResult = await generateAndScaleMealPlan({
            availableRecipes,
            allNutritionData,
            mealTypes: selectedMealTypes,
            dailyTarget: targetMacros,
            userPreferences,
            userFavorites,
          });

          let finalResult: MealPlanOutput = baseResult;
          try {
            if (i === 0) {
              for (const mealType of selectedMealTypes) {
                const { min, max } = getTol(mealType);
                blockRemaining[mealType] = Math.max(0, randInt(min, max) - 1);
              }
            } else if (previousDayResult && selectedMealTypes.length > 0) {
              const chosenMeals: any[] = [];
              for (const mealType of selectedMealTypes) {
                const prevMeal = previousDayResult.scaledMeals.find(m => m.mealType === mealType);
                const todaysMeal = baseResult.scaledMeals.find(m => m.mealType === mealType);
                if (!prevMeal || !todaysMeal) {
                  if (todaysMeal) chosenMeals.push(todaysMeal);
                  continue;
                }
                if ((blockRemaining[mealType] ?? 0) > 0) {
                  const mealIdx = baseResult.scaledMeals.findIndex(m => m.mealType === mealType);
                  const target = baseResult.scaledMeals[mealIdx]?.targetMacrosForMeal || baseResult.finalTotals;
                  const prevRecipeClone = JSON.parse(JSON.stringify(prevMeal.recipe));
                  const scaling = scaleRecipe({
                    recipe: prevRecipeClone as any,
                    ingredients: (prevMeal.scalingResult?.scaledIngredients || []) as any,
                    allNutritionData,
                    targetMacros: target,
                    limits: { upper: 5.0, lower: 0.1 },
                  });
                  chosenMeals.push({ ...prevMeal, recipe: prevRecipeClone, scalingResult: scaling, targetMacrosForMeal: target });
                  blockRemaining[mealType] = (blockRemaining[mealType] ?? 0) - 1;
                } else {
                  const { min, max } = getTol(mealType);
                  blockRemaining[mealType] = Math.max(0, randInt(min, max) - 1);
                  chosenMeals.push(todaysMeal);
                }
              }
              // Enforce ebéd=vacsora if requested
              if (sameLunchDinner) {
                const lunchIdx = chosenMeals.findIndex((m:any) => m.mealType === 'ebéd');
                const dinnerIdx = chosenMeals.findIndex((m:any) => m.mealType === 'vacsora');
                if (lunchIdx >= 0 && dinnerIdx >= 0) {
                  const dinnerTarget = chosenMeals[dinnerIdx]?.targetMacrosForMeal
                    || baseResult.scaledMeals.find(m => m.mealType === 'vacsora')?.targetMacrosForMeal
                    || baseResult.finalTotals;
                  const lunchRecipe = chosenMeals[lunchIdx].recipe;
                  const scaling = scaleRecipe({
                    recipe: lunchRecipe as any,
                    ingredients: (lunchRecipe.ingredients || chosenMeals[lunchIdx].scalingResult?.scaledIngredients) as any,
                    allNutritionData,
                    targetMacros: dinnerTarget,
                    limits: { upper: 5.0, lower: 0.1 },
                  });
                  chosenMeals[dinnerIdx] = {
                    ...chosenMeals[dinnerIdx],
                    recipe: lunchRecipe,
                    scalingResult: scaling,
                    targetMacrosForMeal: dinnerTarget,
                  } as any;
                }
              }
              const totals = chosenMeals.reduce((acc, m) => {
                const t = calculateTotalMacros(m.scalingResult?.scaledIngredients || [], allNutritionData);
                acc.protein += t.protein; acc.carbs += t.carbs; acc.fat += t.fat; acc.calories += t.calories; return acc;
              }, { protein: 0, carbs: 0, fat: 0, calories: 0 } as any);
              finalResult = { ...baseResult, scaledMeals: chosenMeals as any, finalTotals: totals };
            }
          } catch {}

          results.push({ day: i + 1, date: dateStr, result: finalResult });
          previousDayResult = finalResult;
          if (finalResult.success) {
            const newId = getCombinationId(finalResult);
            setPreviousCombinationIds(prev => [...prev, newId]);
          }
        }

        clearInterval(loadingInterval);
        setWeeklyPlan(results);
        setCurrentDayIndex(0);
        setMealPlanResult(results[0]?.result || null);
        toast({
          title: "Új heti étrend generálva!",
          description: "7 nap frissítve.",
        });
      } catch (error) {
        clearInterval(loadingInterval);
        console.error("Étrend generálási hiba:", error);
        toast({
          title: "Hiba történt",
          description: "Váratlan hiba történt az étrend generálása során.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
        setLoadingMessage('');
        setLoadingTime(0);
      }
    };
    
    generatePlan();
  }, [
    targetProtein,
    targetCarbs,
    targetFat,
    targetCalories,
    allNutritionData,
    allRecipes,
    selectedMealTypes,
    userPreferences,
    userFavorites,
    mealTypeRecipes,
    mealIngredients,
    getFilteredRecipes,
  ]);

  // Makrók összegzése egy hozzávaló listára
  const getQuantityInGrams = (ingredient: any) => {
    const { Mennyiség, Mértékegység } = ingredient;
    switch ((Mértékegység || '').toLowerCase()) {
      case 'g': case 'ml': return Mennyiség;
      case 'kg': return Mennyiség * 1000;
      case 'db': return Mennyiség * 50;
      case 'evőkanál': return Mennyiség * 15;
      case 'teáskanál': return Mennyiség * 5;
      case 'csomag': return Mennyiség * 10;
      default: return Mennyiség;
    }
  };

  // Debug: hozzávalók makró összegzés
  function sumMacros(ingredients: any[], allNutritionData: Alapanyag[]) {
    let total = { protein: 0, carbs: 0, fat: 0, calories: 0 };
    for (const ing of ingredients) {
      const q = Number(ing.Mennyiség) || 0;
      total.protein += q * getMacroPer100g(ing, 'protein', allNutritionData) / 100;
      total.carbs += q * getMacroPer100g(ing, 'carbs', allNutritionData) / 100;
      total.fat += q * getMacroPer100g(ing, 'fat', allNutritionData) / 100;
      total.calories += q * getMacroPer100g(ing, 'calories', allNutritionData) / 100;
    }
    console.log('[DEBUG makroScaler] Hozzávalók összmakrói:', total);
    return total;
  }

  const handleOpenMealModal = (meal: any) => {
    setSelectedMeal(meal);
    setShowModal(true);
    // Debug log minden hozzávalóra
    if (meal && meal.recipe && meal.recipe.ingredients) {
      console.log('--- Eredeti hozzávalók makrói ---');
      meal.recipe.ingredients.forEach((ing: any) => {
        if ((ing['Élelmiszerek'] || '').toLowerCase().includes('tojás')) {
          console.log('[TOJÁS DEBUG]', ing);
        }
        const n = allNutritionData.find(n => n.ID.toString().trim() === ing['Élelmiszer ID'].toString().trim());
        if (!n) {
          console.log(`[NINCS makróadat]`, ing['Élelmiszerek'], ing['Élelmiszer ID']);
          return;
        }
        // Mennyiség grammban
        let q = ing.Mennyiség;
        let qg = q;
        switch ((ing['Mértékegység'] || '').toLowerCase()) {
          case 'g': case 'ml': break;
          case 'kg': qg = q * 1000; break;
          case 'db': qg = q * 50; break;
          case 'evőkanál': qg = q * 15; break;
          case 'teáskanál': qg = q * 5; break;
          case 'csomag': qg = q * 10; break;
          default: break;
        }
        const feh = (parseFloat(n['Fehérje/100g'].replace(',', '.')) || 0) * qg / 100;
        const szenh = (parseFloat(n['Szénhidrát/100g'].replace(',', '.')) || 0) * qg / 100;
        const zsir = (parseFloat(n['Zsir/100g'].replace(',', '.')) || 0) * qg / 100;
        const kcal = ((parseFloat(n['Fehérje/100g'].replace(',', '.')) || 0) * 4 + (parseFloat(n['Szénhidrát/100g'].replace(',', '.')) || 0) * 4 + (parseFloat(n['Zsir/100g'].replace(',', '.')) || 0) * 9) * qg / 100;
        console.log(`${ing['Élelmiszerek']} | ${ing.Mennyiség} ${ing['Mértékegység']} | ${qg}g | Fehérje: ${feh.toFixed(2)}g, Szénhidrát: ${szenh.toFixed(2)}g, Zsír: ${zsir.toFixed(2)}g, Kcal: ${kcal.toFixed(2)}`);
      });
    }
    if (meal && meal.scalingResult && meal.scalingResult.scaledIngredients) {
      console.log('--- Skálázott hozzávalók makrói ---');
      meal.scalingResult.scaledIngredients.forEach((ing: any) => {
        const n = allNutritionData.find(n => n.ID.toString().trim() === ing['Élelmiszer ID'].toString().trim());
        if (!n) {
          console.log(`[NINCS makróadat]`, ing['Élelmiszerek'], ing['Élelmiszer ID']);
          return;
        }
        let q = ing.Mennyiség;
        let qg = q;
        switch ((ing['Mértékegység'] || '').toLowerCase()) {
          case 'g': case 'ml': break;
          case 'kg': qg = q * 1000; break;
          case 'db': qg = q * 50; break;
          case 'evőkanál': qg = q * 15; break;
          case 'teáskanál': qg = q * 5; break;
          case 'csomag': qg = q * 10; break;
          default: break;
        }
        const feh = (parseFloat(n['Fehérje/100g'].replace(',', '.')) || 0) * qg / 100;
        const szenh = (parseFloat(n['Szénhidrát/100g'].replace(',', '.')) || 0) * qg / 100;
        const zsir = (parseFloat(n['Zsir/100g'].replace(',', '.')) || 0) * qg / 100;
        const kcal = ((parseFloat(n['Fehérje/100g'].replace(',', '.')) || 0) * 4 + (parseFloat(n['Szénhidrát/100g'].replace(',', '.')) || 0) * 4 + (parseFloat(n['Zsir/100g'].replace(',', '.')) || 0) * 9) * qg / 100;
        console.log(`${ing['Élelmiszerek']} | ${ing.Mennyiség} ${ing['Mértékegység']} | ${qg}g | Fehérje: ${feh.toFixed(2)}g, Szénhidrát: ${szenh.toFixed(2)}g, Zsír: ${zsir.toFixed(2)}g, Kcal: ${kcal.toFixed(2)}`);
      });
    }
  };

  const handleSaveMealPlan = async () => {
    if (!mealPlanResult || !mealPlanResult.success) {
      toast({
        title: "Nincs menthető étrend",
        description: "Először generálj egy étrendet!",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Étrend név generálása
      const planName = `Étrend ${new Date().toLocaleDateString('hu-HU')} ${new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}`;
      
      // Cél makrók összegyűjtése
      const targetMacros = {
        protein: parseInt(targetProtein) || 0,
        carbs: parseInt(targetCarbs) || 0,
        fat: parseInt(targetFat) || 0,
        calories: parseInt(targetCalories) || 0
      };

      const savedPlan = await saveMealPlan(user.id, planName, mealPlanResult, targetMacros);
      
      if (savedPlan) {
        toast({
          title: "Étrend mentve! ✅",
          description: `"${planName}" sikeresen elmentve a profilodban.`
        });
      } else {
        toast({
          title: "Hiba történt",
          description: "Nem sikerült menteni az étrendet.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Étrend mentési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült menteni az étrendet.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Makró adatok betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">Makró Skálázó</h1>
      <div className="space-y-6">
        {/* Kérdés és szűrő blokk átkerült a kezdő kártya alá */}
        {/* Egyszerűsített vezérlők: csak gombok, a makró célok a profilból kerülnek betöltésre */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateMealPlan}
              disabled={isGenerating}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Étrend generálása... (pár másodperc)
                </>
              ) : (
                "Étrend Tervezése és Skálázása"
              )}
            </Button>
            {mealPlanResult && mealPlanResult.success && (
              <Button
                onClick={handleSaveMealPlan}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Mentés...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Mentés
                  </>
                )}
              </Button>
            )}
          </div>

          {isGenerating && (
            <div className="mt-4 p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="text-blue-300 font-bold text-lg mb-2">⏳ Étrend generálása folyamatban...</div>
                <div className="text-blue-200 text-sm mb-4">
                  <div className="font-semibold mb-1">{loadingMessage}</div>
                  {loadingTime > 0 && (
                    <div className="text-blue-300 text-xs">Időtartam: {loadingTime} másodperc</div>
                  )}
                </div>
                <div className="w-full bg-blue-500/30 rounded-full h-3 mb-4">
                  <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full transition-all duration-500 ease-out animate-pulse" style={{ width: `${Math.min(loadingTime * 10, 95)}%`, animation: 'pulse 2s infinite' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      {/* Results Panel */}
      {/* Napi navigáció felül */}
      {weeklyPlan.length > 0 && mealPlanResult && (
        <DayNav
          date={weeklyPlan[currentDayIndex]?.date || ''}
          canPrev={currentDayIndex > 0}
          canNext={currentDayIndex < weeklyPlan.length - 1}
          onPrev={() => { const idx = Math.max(0, currentDayIndex - 1); setCurrentDayIndex(idx); setMealPlanResult(weeklyPlan[idx].result); }}
          onNext={() => { const idx = Math.min(weeklyPlan.length - 1, currentDayIndex + 1); setCurrentDayIndex(idx); setMealPlanResult(weeklyPlan[idx].result); }}
        />
      )}

      <div className="lg:col-span-2 space-y-6">
          {mealPlanResult && (
            <Card className="rounded-2xl bg-white/8 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-[0_10px_40px_-10px_rgba(56,189,248,0.35)] hover:ring-white/15 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between gap-2">
                  <Calculator className="h-5 w-5 text-green-400" />
                  <span className="text-lg md:text-xl tracking-wide">
                    {mealPlanResult.success ? 'Sikeres Étrend' : 'Hiba az Étrend Generálásban'}
                  </span>
                  {mealPlanResult.success && (
                    <div className="ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Sikeres étrend megjelenítése */}
                {mealPlanResult.success ? (
                  <div className="space-y-6">
                    {/* Eltérés megjelenítése sikeres étrendeknél */}
                    {(() => {
                      const targetMacros = {
                        protein: parseFloat(targetProtein),
                        carbs: parseFloat(targetCarbs),
                        fat: parseFloat(targetFat),
                        calories: parseFloat(targetCalories)
                      };
                      
                      const proteinDiff = Math.abs(mealPlanResult.finalTotals.protein - targetMacros.protein) / targetMacros.protein;
                      const carbsDiff = Math.abs(mealPlanResult.finalTotals.carbs - targetMacros.carbs) / targetMacros.carbs;
                      const fatDiff = Math.abs(mealPlanResult.finalTotals.fat - targetMacros.fat) / targetMacros.fat;
                      const caloriesDiff = Math.abs(mealPlanResult.finalTotals.calories - targetMacros.calories) / targetMacros.calories;
                      
                      // Szabály változatlan (5%), de a vizuális jelzés 10%-ig legyen zöld
                      const isWithinStrict = proteinDiff <= 0.05 && carbsDiff <= 0.05 && fatDiff <= 0.05;
                      const isWithinSoft = proteinDiff <= 0.10 && carbsDiff <= 0.10 && fatDiff <= 0.10;
                      
                      return (
                        <div className={`${isWithinSoft ? 'bg-green-500/20 border-green-500/30' : 'bg-yellow-500/20 border-yellow-500/30'} border rounded-lg p-4`}>
                          <div className={`${isWithinSoft ? 'text-green-300' : 'text-yellow-300'} font-semibold mb-2`}>
                            {isWithinSoft ? '✅ Sikeres étrend - Pontosság' : '⚠️ Étrend - Pontosság'}
                          </div>
                          <div className={`${isWithinSoft ? 'text-green-200' : 'text-yellow-200'} text-sm space-y-1`}>
                            <div>Fehérje eltérés: {(proteinDiff * 100).toFixed(1)}%</div>
                            <div>Szénhidrát eltérés: {(carbsDiff * 100).toFixed(1)}%</div>
                            <div>Zsír eltérés: {(fatDiff * 100).toFixed(1)}%</div>
                            <div>Kalória eltérés: {(caloriesDiff * 100).toFixed(1)}%</div>
                          </div>
                          <div className={`${isWithinSoft ? 'text-green-200' : 'text-yellow-200'} text-sm mt-2`}>
                            {isWithinStrict
                              ? 'Fehérje, szénhidrát és zsír 5%-on belül van - ez egy sikeres étrend!'
                              : isWithinSoft
                                ? 'Fehérje, szénhidrát és zsír 10%-on belül van.'
                                : 'A kalória eltérés nem számít a toleranciába, csak a fehérje, szénhidrát és zsír.'}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Összesítő makrók */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-500/30">
                        <div className="text-2xl font-bold text-white">{Math.round(mealPlanResult.finalTotals.calories)}</div>
                        <div className="text-sm text-white/70">Kalória</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-500/30">
                        <div className="text-2xl font-bold text-white">{Math.round(mealPlanResult.finalTotals.protein)}g</div>
                        <div className="text-sm text-white/70">Fehérje</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
                        <div className="text-2xl font-bold text-white">{Math.round(mealPlanResult.finalTotals.carbs)}g</div>
                        <div className="text-sm text-white/70">Szénhidrát</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                        <div className="text-2xl font-bold text-white">{Math.round(mealPlanResult.finalTotals.fat)}g</div>
                        <div className="text-sm text-white/70">Zsír</div>
                      </div>
                    </div>

                    {/* Receptek részletesen */}
                    <div className="space-y-6">
                      {mealPlanResult.scaledMeals.map((meal, mealIndex) => {
                        // Eredeti és skálázott makrók kiszámítása
                        const origIngredients = (meal.recipe.ingredients || []).map(convertToTestRecipeIngredient);
                        const origMacros = calculateTotalMacros(origIngredients, allNutritionData);
                        const scaledMacros = calculateTotalMacros(meal.scalingResult.scaledIngredients || [], allNutritionData);
                        return (
                          <div key={mealIndex} className="bg-white/5 rounded-lg p-6 border border-white/10 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                              <div className="text-lg font-bold text-white">
                                {meal.mealType} - 
                                <button 
                                  onClick={() => {
                                    // Átadjuk a skálázott adatokat is
                                    setSelectedRecipe({
                                      ...meal.recipe,
                                      scalingResult: meal.scalingResult
                                    });
                                    setIsRecipeModalOpen(true);
                                  }}
                                  className="text-blue-300 hover:text-blue-200 underline cursor-pointer ml-1"
                                >
                                  {meal.recipe.név}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <MacroBadge p={scaledMacros.protein} c={scaledMacros.carbs} f={scaledMacros.fat} kcal={scaledMacros.calories} />
                              </div>
                            </div>
                            {/* Eredeti hozzávalók blokk elrejtve – csak skálázott jelenik meg */}
                            {/* Skálázott hozzávalók táblázata */}
                            <ScaledIngredientsTable rows={(meal.scalingResult.scaledIngredients || []).map((ing:any)=>{
                              const qg = getQuantityInGrams(ing);
                              const p100 = getMacroPer100g(ing, 'protein', allNutritionData) || 0;
                              const c100 = getMacroPer100g(ing, 'carbs', allNutritionData) || 0;
                              const f100 = getMacroPer100g(ing, 'fat', allNutritionData) || 0;
                              const k100 = getMacroPer100g(ing, 'calories', allNutritionData) || 0;
                              return {
                                ...ing,
                                p: qg * p100 / 100,
                                c: qg * c100 / 100,
                                f: qg * f100 / 100,
                                kcal: qg * k100 / 100,
                              };
                            })} />
                            {/* Skálázási meta törölve a letisztult UI érdekében */}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Hibaüzenet megjelenítése
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <div className="text-red-300 font-semibold mb-2">❌ Étrend generálási hiba</div>
                    <div className="text-red-200 text-sm">
                      {mealPlanResult.message}
                    </div>
                    <div className="text-red-200 text-sm mt-2">
                      Próbáld meg újra vagy módosítsd a makró célokat.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!mealPlanResult && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-white/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Makró Skálázó Kész</h3>
                <p className="text-white/70">
                  Állítsd be a napi makró célokat és generáld az étrendet!
                </p>
                {/* A kérdés és a szűrő külön szekcióban, a kártya alatt jelenik meg */}
              </CardContent>
            </Card>
          )}
      {/* Alsó navigáció törölve */}
          {/* Külön kártya: napi kívánság kérdés */}
          {!showIngredientSelection && (
            <Card className="mt-6 bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center text-white">
                <div className="font-semibold mb-2">Szeretnél valamit külön a mai napra?</div>
                <div className="text-sm text-white/80 mb-4">Kívánsz valamit, vagy van otthon alapanyag, amit fel szeretnél használni?</div>
                <div className="flex gap-3 justify-center">
                  <Button variant="default" onClick={() => setShowIngredientSelection(true)} className="bg-purple-600 hover:bg-purple-700">igen</Button>
                  <Button variant="default" onClick={() => setShowIngredientSelection(false)} className="bg-purple-600 hover:bg-purple-700">nem</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Külön kártya: alapanyag szűrés, csak ha 'igen' */}
          {showIngredientSelection && (
            <Card className="mt-6 bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-0">
                <SharedIngredientSelector
                  selectedMeals={selectedMealTypes}
                  getFavoriteForIngredient={() => false}
                  getPreferenceForIngredient={() => 'neutral'}
                  onMealIngredientsChange={handleMealIngredientsChange}
                  initialMealIngredients={mealIngredients}
                  showIngredientSelection={showIngredientSelection}
                  title="Alapanyag szűrés (opcionális) - ÚJ rendszer"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900/90 border border-white/20 rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Étrend generálása...</h3>
            <p className="text-white/70 text-sm">
              Intelligens algoritmus dolgozik a legjobb receptek kiválasztásán
            </p>
            <div className="mt-4 flex justify-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal a részletekhez */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white rounded-2xl p-4 md:p-6">
          {selectedMeal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold mb-2">{selectedMeal.recipe?.Receptnév}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col md:flex-row gap-6">
                {selectedMeal.recipe?.kép && (
                  <img 
                    src={convertImageUrl(selectedMeal.recipe.kép, selectedMeal.recipe.id)} 
                    alt="Recept kép" 
                    className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-lg border mb-4 md:mb-0"
                    onError={(e) => {
                      console.error('❌ Kép betöltési hiba:', e.currentTarget.src);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      console.log('✅ Kép sikeresen betöltve:', e.currentTarget.src);
                    }}
                  />
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <span className="font-bold">Elkészítés:</span>
                    <div className="text-sm text-white/80 whitespace-pre-line mt-1">{selectedMeal.recipe?.elkészítés}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="font-bold mb-1 text-purple-300">Eredeti makrók</div>
                      <div className="text-xs text-white/80">
                        {(() => {
                          const m = sumMacros(selectedMeal.recipe.ingredients || [], allNutritionData);
                          return <>
                            <div>Fehérje: <b>{Math.round(m.protein)}g</b></div>
                            <div>Szénhidrát: <b>{Math.round(m.carbs)}g</b></div>
                            <div>Zsír: <b>{Math.round(m.fat)}g</b></div>
                            <div>Kcal: <b>{Math.round(m.calories)}</b></div>
                          </>;
                        })()}
                      </div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="font-bold mb-1 text-green-300">Skálázott makrók</div>
                      <div className="text-xs text-white/80">
                        {(() => {
                          // Calculate macros from the actual scaled ingredients
                          const m = sumMacros(selectedMeal.scalingResult.scaledIngredients || [], allNutritionData);
                          return <>
                            <div>Fehérje: <b>{Math.round(m.protein)}g</b></div>
                            <div>Szénhidrát: <b>{Math.round(m.carbs)}g</b></div>
                            <div>Zsír: <b>{Math.round(m.fat)}g</b></div>
                            <div>Kcal: <b>{Math.round(m.calories)}</b></div>
                          </>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <div className="font-bold mb-2 text-purple-200">Eredeti hozzávalók</div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white/90">Alapanyag</TableHead>
                        <TableHead className="text-white/90">Mennyiség</TableHead>
                        <TableHead className="text-white/90">Mértékegység</TableHead>
                        <TableHead className="text-white/90">Fehérje</TableHead>
                        <TableHead className="text-white/90">Szénhidrát</TableHead>
                        <TableHead className="text-white/90">Zsír</TableHead>
                        <TableHead className="text-white/90">Kalória</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedMeal.recipe.ingredients || []).map((ingredient, idx) => {
                        const n = allNutritionData.find(n => n.ID.toString().trim() === ingredient['Élelmiszer ID'].toString().trim());
                        const qg = getQuantityInGrams(ingredient);
                        const p100 = parseMacroValue(n?.['Fehérje/100g']) || 0;
                        const c100 = parseMacroValue(n?.['Szénhidrát/100g']) || 0;
                        const f100 = parseMacroValue(n?.['Zsir/100g']) || 0;
                        const k100 = p100 * 4 + c100 * 4 + f100 * 9;
                        const pTot = qg * p100 / 100;
                        const cTot = qg * c100 / 100;
                        const fTot = qg * f100 / 100;
                        const kTot = qg * k100 / 100;
                        return (
                          <TableRow key={idx} className="border-white/10">
                            <TableCell className="text-white/90">{ingredient['Élelmiszerek']}</TableCell>
                            <TableCell className="text-white/90">{ingredient.Mennyiség}</TableCell>
                            <TableCell className="text-white/90">{ingredient['Mértékegység']}</TableCell>
                            <TableCell className="text-white/90">{pTot.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{cTot.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{fTot.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{kTot.toFixed(0)}kcal</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="mt-4 text-sm text-white/80">
                    <span className="font-medium">Eredeti összmakrók:</span> {
                      (() => {
                        const m = calculateTotalMacros(selectedMeal.recipe.ingredients || [], allNutritionData);
                        return `${m.protein.toFixed(2)}g P, ${m.carbs.toFixed(2)}g C, ${m.fat.toFixed(2)}g F, ${m.calories.toFixed(2)}kcal`;
                      })()
                    }
                  </div>
                </div>
                <div>
                  <div className="font-bold mb-2 text-green-200">Skálázott hozzávalók</div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white/90">Alapanyag</TableHead>
                        <TableHead className="text-white/90">Mennyiség</TableHead>
                        <TableHead className="text-white/90">Mértékegység</TableHead>
                        <TableHead className="text-white/90">Fehérje</TableHead>
                        <TableHead className="text-white/90">Szénhidrát</TableHead>
                        <TableHead className="text-white/90">Zsír</TableHead>
                        <TableHead className="text-white/90">Kalória</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedMeal.scalingResult.scaledIngredients || []).map((ingredient, idx) => {
                        // Find the original ingredient to calculate the scaling factor
                        const originalIngredient = (selectedMeal.recipe.ingredients || []).find(orig => 
                          orig['Élelmiszer ID'] === ingredient['Élelmiszer ID']
                        );
                        
                        let displayQuantity = ingredient.Mennyiség;
                        let displayUnit = ingredient['Mértékegység'];
                        
                        // For display, show the actual scaled quantity with proper unit
                        if (originalIngredient) {
                          const originalQuantity = originalIngredient.Mennyiség;
                          const originalUnit = originalIngredient['Mértékegység'];
                          const scalingFactor = ingredient.Mennyiség / originalQuantity;
                          
                          // For 'db' units, show the scaled count
                          if (originalUnit === 'db') {
                            displayQuantity = Math.round(originalQuantity * scalingFactor);
                            displayUnit = 'db';
                          }
                          // For other units, show the scaled quantity
                          else {
                            displayQuantity = Math.round(ingredient.Mennyiség * 100) / 100;
                            displayUnit = ingredient['Mértékegység'];
                          }
                        }
                        
                        const n = allNutritionData.find(n => n.ID.toString().trim() === ingredient['Élelmiszer ID'].toString().trim());
                        const qg = getQuantityInGrams(ingredient);
                        const p100 = parseMacroValue(n?.['Fehérje/100g']) || 0;
                        const c100 = parseMacroValue(n?.['Szénhidrát/100g']) || 0;
                        const f100 = parseMacroValue(n?.['Zsir/100g']) || 0;
                        const k100 = p100 * 4 + c100 * 4 + f100 * 9;
                        const pTot = qg * p100 / 100;
                        const cTot = qg * c100 / 100;
                        const fTot = qg * f100 / 100;
                        const kTot = qg * k100 / 100;
                        return (
                        <TableRow key={idx} className="border-white/10">
                          <TableCell className="text-white/90">{ingredient['Élelmiszerek']}</TableCell>
                            <TableCell className="text-white/90">{displayQuantity}</TableCell>
                            <TableCell className="text-white/90">{displayUnit}</TableCell>
                            <TableCell className="text-white/90">{pTot.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{cTot.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{fTot.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{kTot.toFixed(0)}kcal</TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="mt-4 text-sm text-white/80">
                    <span className="font-medium">Skálázott összmakrók:</span> {
                      (() => {
                        const m = calculateTotalMacros(selectedMeal.scalingResult.scaledIngredients || [], allNutritionData);
                        return `${m.protein.toFixed(2)}g P, ${m.carbs.toFixed(2)}g C, ${m.fat.toFixed(2)}g F, ${m.calories.toFixed(2)}kcal`;
                      })()
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Recept Modal */}
      <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-orange-400" />
                {selectedRecipe?.név}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRecipeModalOpen(false)}
                className="text-white hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecipe && (
            <div className="space-y-6 text-white">
              {/* Recept kép */}
              {(selectedRecipe.képUrl || selectedRecipe.kép) && (
                <div className="w-full max-w-md mx-auto">
                  <img
                    src={convertImageUrl(selectedRecipe.képUrl || selectedRecipe.kép || '', selectedRecipe.id)}
                    alt={selectedRecipe.név}
                    className="w-full h-64 object-cover rounded-lg shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Recept információk */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-300" />
                    <span className="font-semibold">Elkészítési idő</span>
                  </div>
                  <div className="text-sm text-blue-200">
                    {selectedRecipe.elkészítési_idő || 'Nincs megadva'}
                  </div>
                </div>
                
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-green-300" />
                    <span className="font-semibold">Adagok száma</span>
                  </div>
                  <div className="text-sm text-green-200">
                    {selectedRecipe.adagok_száma || 'Nincs megadva'}
                  </div>
                </div>
                
                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4 text-purple-300" />
                    <span className="font-semibold">Skálázhatóság</span>
                  </div>
                  <div className="text-sm text-purple-200">
                    {selectedRecipe.Recept_Skálázhatóság || 'Nincs megadva'}
                  </div>
                </div>
              </div>

              {/* Elkészítés */}
              {selectedRecipe.elkészítés && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-400" />
                    Elkészítés
                  </h3>
                  <div className="text-white/90 whitespace-pre-wrap">
                    {selectedRecipe.elkészítés}
                  </div>
                </div>
              )}

              {/* Eredeti hozzávalók */}
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-400" />
                    Eredeti hozzávalók
                  </h3>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-white/10">
                        <span className="text-white/90">{ingredient['Élelmiszerek']}</span>
                        <span className="text-white/70">
                          {ingredient.Mennyiség} {ingredient['Mértékegység']}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skálázott hozzávalók - ha vannak */}
              {selectedRecipe.scalingResult && selectedRecipe.scalingResult.scaledIngredients && (
                <div className="bg-green-500/20 rounded-lg p-6 border border-green-500/30">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <Scale className="h-5 w-5 text-green-400" />
                    Skálázott hozzávalók
                  </h3>
                  <div className="space-y-2">
                    {selectedRecipe.scalingResult.scaledIngredients.map((ingredient, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-green-500/20">
                        <span className="text-white/90">{ingredient['Élelmiszerek']}</span>
                        <span className="text-green-300 font-semibold">
                          {ingredient.Mennyiség} {ingredient['Mértékegység']}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Skálázási meta törölve a letisztult UI érdekében */}
                </div>
              )}

              {/* Makró összehasonlítás */}
              {selectedRecipe.ingredients && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-green-400" />
                    Makró összehasonlítás
                  </h3>
                  
                  {/* Eredeti vs Skálázott makrók */}
                  {selectedRecipe.scalingResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                        <h4 className="font-semibold text-blue-200 mb-2">Eredeti makrók</h4>
                        <div className="space-y-1 text-sm">
                          <div>Kalória: {Math.round(selectedRecipe.scalingResult.originalMacros?.calories || 0)} kcal</div>
                          <div>Fehérje: {Math.round(selectedRecipe.scalingResult.originalMacros?.protein || 0)}g</div>
                          <div>Szénhidrát: {Math.round(selectedRecipe.scalingResult.originalMacros?.carbs || 0)}g</div>
                          <div>Zsír: {Math.round(selectedRecipe.scalingResult.originalMacros?.fat || 0)}g</div>
                        </div>
                      </div>
                      
                      <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                        <h4 className="font-semibold text-green-200 mb-2">Skálázott makrók</h4>
                        <div className="space-y-1 text-sm">
                          <div>Kalória: {Math.round(selectedRecipe.scalingResult.scaledMacros?.calories || 0)} kcal</div>
                          <div>Fehérje: {Math.round(selectedRecipe.scalingResult.scaledMacros?.protein || 0)}g</div>
                          <div>Szénhidrát: {Math.round(selectedRecipe.scalingResult.scaledMacros?.carbs || 0)}g</div>
                          <div>Zsír: {Math.round(selectedRecipe.scalingResult.scaledMacros?.fat || 0)}g</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <h4 className="font-semibold mb-2">100g alapanyagonként</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-800 text-zinc-200">
                        <tr>
                          <th className="p-2 text-left">Alapanyag</th>
                          <th className="p-2 text-center">Fehérje</th>
                          <th className="p-2 text-center">Szénhidrát</th>
                          <th className="p-2 text-center">Zsír</th>
                          <th className="p-2 text-center">Kalória</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecipe.ingredients.map((ingredient, index) => {
                          const nutrition = allNutritionData.find(n => 
                            String(n.ID) === String(ingredient['Élelmiszer ID'])
                          );
                          return (
                            <tr key={index} className="border-b border-white/10">
                              <td className="p-2 text-white/90">{ingredient['Élelmiszerek']}</td>
                              <td className="p-2 text-center text-white/90">
                                {nutrition ? parseMacroValue(nutrition['Fehérje/100g']).toFixed(1) : '0'}g
                              </td>
                              <td className="p-2 text-center text-white/90">
                                {nutrition ? parseMacroValue(nutrition['Szénhidrát/100g']).toFixed(1) : '0'}g
                              </td>
                              <td className="p-2 text-center text-white/90">
                                {nutrition ? parseMacroValue(nutrition['Zsir/100g']).toFixed(1) : '0'}g
                              </td>
                              <td className="p-2 text-center text-white/90">
                                {nutrition ? parseMacroValue(nutrition['Kaloria/100g']).toFixed(0) : '0'} kcal
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 