import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import { Target, Scale, Calculator, TrendingUp, User } from 'lucide-react';
import { getUserPreferences, UserPreference } from '@/services/preferenceFilters';
import { getUserFavorites, UserFavorite } from '@/services/userFavorites';
import { normalizeText } from '@/utils/textNormalization';
import { getRecipesByMealType } from '@/services/recipeFilters';
import { fetchMealTypes } from '@/services/supabaseQueries';
import { processMealTypes } from '@/utils/dataProcessors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SharedMealTypeSelector } from './shared/SharedMealTypeSelector';
import { SharedIngredientSelector } from './shared/SharedIngredientSelector';
import { useDataCache } from './DataCacheContext';
import { calculateTotalMacros } from '@/services/macroScaler';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { fetchUserProfile } from '@/services/profileQueries';

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
  const id = String(ingredient['Élelmiszer ID']);
  const alapanyag = nutritionData?.find(nd => String(nd['ID']) === id);
  if (!alapanyag) {
    console.warn(`[MAKRO] Nincs tápanyag adat ehhez az ID-hoz:`, id, ingredient['Élelmiszerek']);
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
  const { recipes, setRecipes, alapanyagok, setAlapanyagok, mealTypes, setMealTypes, isLoaded, setIsLoaded } = useDataCache();
  const [targetProtein, setTargetProtein] = useState('120');
  const [targetCarbs, setTargetCarbs] = useState('160');
  const [targetFat, setTargetFat] = useState('50');
  const [targetCalories, setTargetCalories] = useState('1700');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [allNutritionData, setAllNutritionData] = useState<Alapanyag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mealPlanResult, setMealPlanResult] = useState<MealPlanOutput | null>(null);
  const [previousCombinationIds, setPreviousCombinationIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingTime, setLoadingTime] = useState(0);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(['reggeli', 'ebéd', 'vacsora']);
  const [mealIngredients, setMealIngredients] = useState<any>({});
  const [showIngredientSelection, setShowIngredientSelection] = useState(true);
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
  const [userFavorites, setUserFavorites] = useState<UserFavorite[]>([]);
  const [mealTypeRecipes, setMealTypeRecipes] = useState<Record<string, string[]>>({});
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  // Profil betöltése és makró célok beállítása
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
    console.log('[DEBUG] nutritionData első 3 elem:', allNutritionData.slice(0, 3));
    console.log('[DEBUG] nutritionData kulcsok:', Object.keys(allNutritionData[0]));
  } else {
    console.warn('[DEBUG] nutritionData üres vagy nincs betöltve!');
  }

  // Étkezés kiválasztó logika
  const handleMealToggle = (mealKey: string) => {
    setSelectedMealTypes(prev => {
      const newSelected = prev.includes(mealKey)
        ? prev.filter(m => m !== mealKey)
        : [...prev, mealKey];
      setShowIngredientSelection(newSelected.length > 0);
      return newSelected;
    });
  };

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
    console.log('🚀 handleGenerateMealPlan elindítva');
    console.log('📊 Állapot:', { 
      recipes: !!recipes, 
      alapanyagok: !!alapanyagok, 
      selectedMealTypes: selectedMealTypes.length 
    });
    
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
    setIsGenerating(true);
    setMealPlanResult(null);
    setLoadingMessage('Receptek szűrése...');
    setLoadingTime(0);

    // Loading idő követése
    const startTime = Date.now();
    const loadingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingTime(elapsed);
      console.log(`⏱️ Loading idő: ${elapsed}s`);
      
      if (elapsed > 5) {
        setLoadingMessage('Még mindig keresek megfelelő kombinációkat...');
      } else if (elapsed > 3) {
        setLoadingMessage('Receptek skálázása...');
      } else if (elapsed > 1) {
        setLoadingMessage('Makró célok ellenőrzése...');
      }
    }, 1000);

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
        console.log('🎯 generateAndScaleMealPlan hívása...');
        const result = await generateAndScaleMealPlan({
          availableRecipes,
          allNutritionData,
          mealTypes: selectedMealTypes,
          dailyTarget: targetMacros,
          userPreferences,
          userFavorites,
        });

        clearInterval(loadingInterval);
        console.log('✅ generateAndScaleMealPlan sikeres');
        setMealPlanResult(result);
        
        if (result.success) {
          const newId = getCombinationId(result);
          setPreviousCombinationIds(prev => [...prev, newId]);
          toast({
            title: "Sikeres étrend generálva!",
            description: result.message,
          });
        } else {
          toast({
            title: "Étrend generálási hiba",
            description: result.message,
            variant: "destructive",
          });
        }
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
        const result = await generateAndScaleMealPlan({
          availableRecipes,
          allNutritionData,
          mealTypes: selectedMealTypes,
          dailyTarget: targetMacros,
          userPreferences,
          userFavorites,
        });

        clearInterval(loadingInterval);
        setMealPlanResult(result);
        
        if (result.success) {
          const newId = getCombinationId(result);
          setPreviousCombinationIds(prev => [...prev, newId]);
          toast({
            title: "Új étrend generálva!",
            description: result.message,
          });
        } else {
          toast({
            title: "Étrend generálási hiba",
            description: result.message,
            variant: "destructive",
          });
        }
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
        <SharedMealTypeSelector
          selectedMeals={selectedMealTypes}
          onMealToggle={handleMealToggle}
          getRecipeCount={() => 0}
          title="Válaszd ki az étkezéseket"
          subtitle="Kattints az étkezésekre a kiválasztáshoz"
        />
        <SharedIngredientSelector
          selectedMeals={selectedMealTypes}
          getFavoriteForIngredient={() => false}
          getPreferenceForIngredient={() => 'neutral'}
          onMealIngredientsChange={handleMealIngredientsChange}
          initialMealIngredients={mealIngredients}
          showIngredientSelection={showIngredientSelection}
          title="Alapanyag szűrés (opcionális) - ÚJ rendszer"
        />
        {/* Makró célok, generálás gomb, eredmény szekciók egységesen a napi étrendtervezővel */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Napi Makró Célok
              <div className="flex items-center gap-2 ml-auto">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Profilból betöltve</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="protein" className="text-white/70">Fehérje (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={targetProtein}
                  disabled
                  className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="carbs" className="text-white/70">Szénhidrát (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={targetCarbs}
                  disabled
                  className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="fat" className="text-white/70">Zsír (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={targetFat}
                  disabled
                  className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="calories" className="text-white/70">Kalória (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  value={targetCalories}
                  disabled
                  className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="text-xs text-gray-400 text-center">
              A makró célok a profilban módosíthatók
            </div>
            <Button
              onClick={handleGenerateMealPlan}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
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

            {isGenerating && (
              <div className="mt-4 p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
                <div className="text-center">
                  {/* Fő animáció */}
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Cím */}
                  <div className="text-blue-300 font-bold text-lg mb-2">
                    ⏳ Étrend generálása folyamatban...
                  </div>
                  
                  {/* Dinamikus üzenetek */}
                  <div className="text-blue-200 text-sm mb-4">
                    <div className="font-semibold mb-1">{loadingMessage}</div>
                    {loadingTime > 0 && (
                      <div className="text-blue-300 text-xs">
                        Időtartam: {loadingTime} másodperc
                      </div>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-blue-500/30 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full transition-all duration-500 ease-out animate-pulse" 
                      style={{ 
                        width: `${Math.min(loadingTime * 10, 95)}%`,
                        animation: 'pulse 2s infinite'
                      }}
                    ></div>
                  </div>
                  
                  {/* Dinamikus üzenetek */}
                  <div className="text-blue-200 text-xs space-y-1">
                    {loadingTime <= 5 && (
                      <div className="animate-fade-in">🔍 Receptek szűrése és kategorizálása...</div>
                    )}
                    {loadingTime > 5 && loadingTime <= 10 && (
                      <div className="animate-fade-in">⚖️ Makró célok ellenőrzése...</div>
                    )}
                    {loadingTime > 10 && loadingTime <= 15 && (
                      <div className="animate-fade-in">📊 Receptek skálázása és optimalizálása...</div>
                    )}
                    {loadingTime > 15 && (
                      <div className="animate-fade-in">🎯 Még mindig keresek megfelelő kombinációkat...</div>
                    )}
                    {loadingTime > 20 && (
                      <div className="text-yellow-300 animate-pulse">
                        ⏰ Ez hosszabb időt vesz igénybe, kérlek várj...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {mealPlanResult && (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-green-400" />
                  {mealPlanResult.success ? 'Sikeres Étrend' : 'Hiba az Étrend Generálásban'}
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
                      
                      // Csak a fehérje, szénhidrát és zsír számít a toleranciába
                      const isWithinTolerance = proteinDiff <= 0.05 && carbsDiff <= 0.05 && fatDiff <= 0.05;
                      
                      return (
                        <div className={`${isWithinTolerance ? 'bg-green-500/20 border-green-500/30' : 'bg-yellow-500/20 border-yellow-500/30'} border rounded-lg p-4`}>
                          <div className={`${isWithinTolerance ? 'text-green-300' : 'text-yellow-300'} font-semibold mb-2`}>
                            {isWithinTolerance ? '✅ Sikeres étrend - Pontosság' : '⚠️ Étrend - Pontosság'}
                          </div>
                          <div className={`${isWithinTolerance ? 'text-green-200' : 'text-yellow-200'} text-sm space-y-1`}>
                            <div>Fehérje eltérés: {(proteinDiff * 100).toFixed(1)}%</div>
                            <div>Szénhidrát eltérés: {(carbsDiff * 100).toFixed(1)}%</div>
                            <div>Zsír eltérés: {(fatDiff * 100).toFixed(1)}%</div>
                            <div>Kalória eltérés: {(caloriesDiff * 100).toFixed(1)}%</div>
                          </div>
                          <div className={`${isWithinTolerance ? 'text-green-200' : 'text-yellow-200'} text-sm mt-2`}>
                            {isWithinTolerance 
                              ? 'Fehérje, szénhidrát és zsír 5%-on belül van - ez egy sikeres étrend!' 
                              : 'A kalória eltérés nem számít a toleranciába, csak a fehérje, szénhidrát és zsír.'
                            }
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
                                {mealIndex + 1}. étkezés - {meal.recipe.név}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-purple-700/80 text-white text-sm font-semibold">
                                  Eredeti: {origMacros.protein.toFixed(1)}g P, {origMacros.carbs.toFixed(1)}g C, {origMacros.fat.toFixed(1)}g F, {origMacros.calories.toFixed(0)} kcal
                                </Badge>
                                <Badge variant="outline" className="bg-green-700/80 text-white text-sm font-semibold">
                                  Skálázott: {scaledMacros.protein.toFixed(1)}g P, {scaledMacros.carbs.toFixed(1)}g C, {scaledMacros.fat.toFixed(1)}g F, {scaledMacros.calories.toFixed(0)} kcal
                                </Badge>
                              </div>
                            </div>
                            {/* Eredeti hozzávalók táblázata */}
                            <div className="overflow-x-auto mb-4">
                              <table className="min-w-full text-sm border border-zinc-700 rounded-lg">
                                <thead className="bg-zinc-800 text-zinc-200">
                                  <tr>
                                    <th className="p-2">Alapanyag</th>
                                    <th className="p-2">Mennyiség</th>
                                    <th className="p-2">Mértékegység</th>
                                    <th className="p-2">100g Fehérje</th>
                                    <th className="p-2">100g Szénhidrát</th>
                                    <th className="p-2">100g Zsír</th>
                                    <th className="p-2">100g Kalória</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(meal.recipe.ingredients || []).map((ing, i) => (
                                    <tr key={i} className="border-b border-zinc-700">
                                      <td className="p-2">{ing['Élelmiszerek']}</td>
                                      <td className="p-2">{ing.Mennyiség}</td>
                                      <td className="p-2">{ing['Mértékegység']}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'protein', allNutritionData).toFixed(1)}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'carbs', allNutritionData).toFixed(1)}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'fat', allNutritionData).toFixed(1)}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'calories', allNutritionData).toFixed(0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {/* Skálázott hozzávalók táblázata */}
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm border border-zinc-700 rounded-lg">
                                <thead className="bg-zinc-800 text-zinc-200">
                                  <tr>
                                    <th className="p-2">Alapanyag</th>
                                    <th className="p-2">Mennyiség</th>
                                    <th className="p-2">Mértékegység</th>
                                    <th className="p-2">100g Fehérje</th>
                                    <th className="p-2">100g Szénhidrát</th>
                                    <th className="p-2">100g Zsír</th>
                                    <th className="p-2">100g Kalória</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(meal.scalingResult.scaledIngredients || []).map((ing, i) => (
                                    <tr key={i} className="border-b border-zinc-700">
                                      <td className="p-2">{ing['Élelmiszerek']}</td>
                                      <td className="p-2">{ing.Mennyiség}</td>
                                      <td className="p-2">{ing['Mértékegység']}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'protein', allNutritionData).toFixed(1)}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'carbs', allNutritionData).toFixed(1)}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'fat', allNutritionData).toFixed(1)}</td>
                                      <td className="p-2">{getMacroPer100g(ing, 'calories', allNutritionData).toFixed(0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {/* Skálázási mód és üzenet */}
                            <div className="mt-2 text-xs text-purple-200">
                              Skálázási mód: {meal.recipe.Recept_Skálázhatóság}<br />
                              Skálázási üzenet: {meal.scalingResult.message}
                            </div>
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
                  <img src={selectedMeal.recipe.kép} alt="Recept kép" className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-lg border mb-4 md:mb-0" />
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
                        <TableHead className="text-white/90">100g Fehérje</TableHead>
                        <TableHead className="text-white/90">100g Szénhidrát</TableHead>
                        <TableHead className="text-white/90">100g Zsír</TableHead>
                        <TableHead className="text-white/90">100g Kalória</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedMeal.recipe.ingredients || []).map((ingredient, idx) => {
                        const n = allNutritionData.find(n => n.ID.toString().trim() === ingredient['Élelmiszer ID'].toString().trim());
                        const qg = getQuantityInGrams(ingredient);
                        const feh100g = (parseMacroValue(n?.['Fehérje/100g']) || 0) * 100 / 100;
                        const szenh100g = (parseMacroValue(n?.['Szénhidrát/100g']) || 0) * 100 / 100;
                        const zsir100g = (parseMacroValue(n?.['Zsir/100g']) || 0) * 100 / 100;
                        const kcal100g = ((parseMacroValue(n?.['Fehérje/100g']) || 0) * 4 + (parseMacroValue(n?.['Szénhidrát/100g']) || 0) * 4 + (parseMacroValue(n?.['Zsir/100g']) || 0) * 9) * 100 / 100;
                        return (
                          <TableRow key={idx} className="border-white/10">
                            <TableCell className="text-white/90">{ingredient['Élelmiszerek']}</TableCell>
                            <TableCell className="text-white/90">{ingredient.Mennyiség}</TableCell>
                            <TableCell className="text-white/90">{ingredient['Mértékegység']}</TableCell>
                            <TableCell className="text-white/90">{feh100g.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{szenh100g.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{zsir100g.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{kcal100g.toFixed(2)}kcal</TableCell>
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
                        <TableHead className="text-white/90">100g Fehérje</TableHead>
                        <TableHead className="text-white/90">100g Szénhidrát</TableHead>
                        <TableHead className="text-white/90">100g Zsír</TableHead>
                        <TableHead className="text-white/90">100g Kalória</TableHead>
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
                        const feh100g = (parseMacroValue(n?.['Fehérje/100g']) || 0) * 100 / 100;
                        const szenh100g = (parseMacroValue(n?.['Szénhidrát/100g']) || 0) * 100 / 100;
                        const zsir100g = (parseMacroValue(n?.['Zsir/100g']) || 0) * 100 / 100;
                        const kcal100g = ((parseMacroValue(n?.['Fehérje/100g']) || 0) * 4 + (parseMacroValue(n?.['Szénhidrát/100g']) || 0) * 4 + (parseMacroValue(n?.['Zsir/100g']) || 0) * 9) * 100 / 100;
                        return (
                        <TableRow key={idx} className="border-white/10">
                          <TableCell className="text-white/90">{ingredient['Élelmiszerek']}</TableCell>
                            <TableCell className="text-white/90">{displayQuantity}</TableCell>
                            <TableCell className="text-white/90">{displayUnit}</TableCell>
                            <TableCell className="text-white/90">{feh100g.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{szenh100g.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{zsir100g.toFixed(2)}g</TableCell>
                            <TableCell className="text-white/90">{kcal100g.toFixed(2)}kcal</TableCell>
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
    </div>
  );
} 