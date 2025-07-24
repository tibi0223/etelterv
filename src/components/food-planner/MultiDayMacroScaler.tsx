import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChefHat, Clock, RotateCcw, Trash2, Calculator, Target } from "lucide-react";
import { RecipeContent } from "./RecipeContent";
import { LoadingChef } from "@/components/ui/LoadingChef";
import { SharedMealTypeSelector } from "./shared/SharedMealTypeSelector";
import { SharedIngredientSelector } from "./shared/SharedIngredientSelector";
import { SharedGenerationButton } from "./shared/SharedGenerationButton";
import { DayCountSelector } from "./DayCountSelector";
import { useToast } from "@/hooks/use-toast";
import { fetchCombinedRecipes } from '@/services/newDatabaseQueries';
import { fetchAlapanyagok, fetchReceptAlapanyagV2 } from '@/services/database/fetchers';
import { getUserPreferences } from '@/services/preferenceFilters';
import { fetchMealTypes } from '@/services/supabaseQueries';
import { processMealTypes } from '@/utils/dataProcessors';
import { generateAndScaleMealPlan } from '@/services/mealPlanGenerator';
import { Alapanyag } from '@/services/database/types';
import { useDataCache } from './DataCacheContext';
import { fetchUserProfile } from '@/services/profileQueries';

interface MultiDayScaledMealPlan {
  day: number;
  date: string;
  meals: {
    [mealType: string]: {
      recipe: any;
      scalingResult: any;
      targetMacros: any;
    } | null;
  };
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface SelectedIngredient {
  category: string;
  ingredient: string;
}

interface MealIngredients {
  [mealType: string]: SelectedIngredient[];
}

interface MultiDayMacroScalerProps {
  user: any;
}

export function MultiDayMacroScaler({ user }: MultiDayMacroScalerProps) {
  const { recipes, setRecipes, alapanyagok, setAlapanyagok, mealTypes, setMealTypes, isLoaded, setIsLoaded } = useDataCache();
  const [selectedDays, setSelectedDays] = useState(3);
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['reggeli', 'ebéd', 'vacsora']);
  const [showIngredientSelection, setShowIngredientSelection] = useState(false);
  const [currentMealIngredients, setCurrentMealIngredients] = useState<any>({});
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [multiDayScaledPlan, setMultiDayScaledPlan] = useState<any[]>([]);
  const [allNutritionData, setAllNutritionData] = useState<any[]>([]);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [userPreferences, setUserPreferences] = useState<any[]>([]);
  const [mealTypeRecipes, setMealTypeRecipes] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [dailyTarget, setDailyTarget] = useState({
    calories: 1700,
    protein: 120,
    carbs: 160,
    fat: 50
  });

  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);

  // Profil betöltése és makró célok beállítása
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchUserProfile(user.id);
        if (profile) {
          // Ha vannak mentett makró célok, használjuk őket
          setDailyTarget({
            calories: profile.target_calories || 1700,
            protein: profile.target_protein || 120,
            carbs: profile.target_carbs || 160,
            fat: profile.target_fat || 50
          });
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
          setMealTypeRecipes(mealTypes);
          setIsLoading(false);
          return;
        }
        // Ha nincs cache-ben, letöltjük
        const [recipesData, ingredients, nutritionData, preferences, mealTypesData] = await Promise.all([
          fetchCombinedRecipes(),
          fetchReceptAlapanyagV2(),
          fetchAlapanyagok(),
          getUserPreferences(user.id),
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

  useEffect(() => {
    if (multiDayScaledPlan.length > 0 && !isGenerating && summaryRef.current) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [multiDayScaledPlan.length, isGenerating]);

  // Mennyiség grammra konvertálása
  const getQuantityInGrams = (ingredient: any) => {
    const { Mennyiség, Mértékegység } = ingredient;
    
    // Ellenőrizzük, hogy a Mértékegység létezik-e
    if (!Mértékegység) {
      console.warn(`[DEBUG] Nincs mértékegység! Hozzávaló:`, ingredient);
      return Mennyiség || 0; // Fallback
    }
    
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

  // Makrók összegzése egy hozzávaló listára
  const sumMacros = (ingredients: any[], allNutritionData: Alapanyag[]) => {
    let protein = 0, carbs = 0, fat = 0, calories = 0;
    for (const ing of ingredients) {
      const n = allNutritionData.find(n => n.ID.toString().trim() === ing['Élelmiszer ID'].toString().trim());
      if (n) {
        const qg = getQuantityInGrams(ing);
        protein += (parseFloat(n['Fehérje/100g'].replace(',', '.')) || 0) * qg / 100;
        carbs += (parseFloat(n['Szénhidrát/100g'].replace(',', '.')) || 0) * qg / 100;
        fat += (parseFloat(n['Zsir/100g'].replace(',', '.')) || 0) * qg / 100;
        calories += ((parseFloat(n['Fehérje/100g'].replace(',', '.')) || 0) * 4 + (parseFloat(n['Szénhidrát/100g'].replace(',', '.')) || 0) * 4 + (parseFloat(n['Zsir/100g'].replace(',', '.')) || 0) * 9) * qg / 100;
      }
    }
    return { protein, carbs, fat, calories };
  };

  // Modal megnyitása
  const handleOpenMealModal = (meal: any) => {
    setSelectedMeal(meal);
    setShowModal(true);
  };

  // Modal bezárása
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMeal(null);
  };

  // Memoized filtered recipes for better performance
  const filteredRecipes = useMemo(() => {
    let filtered = allRecipes;
    
    // Meal type szűrés
    if (selectedMeals.length > 0) {
      filtered = filtered.filter(recipe => {
        if (!recipe.mealTypes) return false;
        return selectedMeals.some(mealType => recipe.mealTypes.includes(mealType));
      });
    }
    
    // Preferencia szűrés (kizárja a dislike-olt alapanyagokat)
    if (userPreferences.length > 0) {
      filtered = filtered.filter(recipe => {
        const dislikedIngredients = userPreferences
          .filter(p => p.preference === 'dislike')
          .map(p => p.ingredient.toLowerCase());
        return !recipe.ingredients.some((ing: any) => 
          dislikedIngredients.includes((ing['Élelmiszerek'] || '').toLowerCase())
        );
      });
    }
    
    // Skálázhatóság szűrés
    filtered = filtered.filter(recipe => recipe.Recept_Skálázhatóság !== 'Nem skálázható');
    
    return filtered;
  }, [allRecipes, selectedMeals, userPreferences]);

  const generateMultiDayScaledPlan = async () => {
    if (selectedMeals.length === 0) {
      toast({
        title: "Hiba",
        description: "Válassz ki legalább egy étkezést!",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    const newPlan: any[] = [];
    
    try {
      // Napi célmakrók a profilból
      const targetMacros = {
        calories: dailyTarget.calories,
        protein: dailyTarget.protein,
        carbs: dailyTarget.carbs,
        fat: dailyTarget.fat
      };
      
      // Párhuzamos generálás a napokra
      const dayPromises = Array.from({ length: selectedDays }, async (_, dayIndex) => {
        const day = dayIndex + 1;
        const date = new Date();
        date.setDate(date.getDate() + day - 1);
        const formattedDate = date.toLocaleDateString('hu-HU');
        
        try {
          const scalingResult = await generateAndScaleMealPlan({
            mealCount: selectedMeals.length,
            dailyTarget: targetMacros,
            allNutritionData,
            availableRecipes: filteredRecipes,
            mealTypes: selectedMeals,
            userPreferences: userPreferences || [],
            userFavorites: [] // TODO: implementálni
          });
          
          if (scalingResult.success) {
            // Ellenőrizzük, hogy a makrók 5%-os tolerancián belül vannak-e
            const proteinDiff = Math.abs(scalingResult.finalTotals.protein - targetMacros.protein) / targetMacros.protein;
            const carbsDiff = Math.abs(scalingResult.finalTotals.carbs - targetMacros.carbs) / targetMacros.carbs;
            const fatDiff = Math.abs(scalingResult.finalTotals.fat - targetMacros.fat) / targetMacros.fat;
            
            // Csak a fehérje, szénhidrát és zsír számít a toleranciába
            const isWithinTolerance = proteinDiff <= 0.05 && carbsDiff <= 0.05 && fatDiff <= 0.05;
            
            if (!isWithinTolerance) {
              return null; // Nem fogadjuk el ezt az eredményt
            }
            
            return {
              day,
              success: true,
              message: `${day}. nap étrendje sikeresen generálva`,
              scaledMeals: scalingResult.scaledMeals,
              finalTotals: scalingResult.finalTotals,
            };
          } else {
            return null;
          }
        } catch (error) {
          return null;
        }
      });
      
      // Várunk az összes nap generálására
      const results = await Promise.all(dayPromises);
      const validResults = results.filter(result => result !== null);
      
      setMultiDayScaledPlan(validResults);
      
      if (validResults.length > 0) {
        toast({
          title: "Siker",
          description: `${validResults.length} napos makróskálázott étrend sikeresen generálva!`,
        });
      } else {
        toast({
          title: "Hiba",
          description: "Nem sikerült étrendet generálni egyetlen napra sem.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Hiba a többnapos makróskálázás során:', error);
      toast({
        title: "Hiba",
        description: "Hiba történt a makróskálázott étrend generálása során.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Étrend törlése
  const clearPlan = () => {
    setMultiDayScaledPlan([]);
    toast({
      title: "Törölve",
      description: "Többnapos makróskálázott étrend törölve.",
    });
  };

  // Étkezés típus kiválasztása
  const handleMealToggle = (mealKey: string) => {
    setSelectedMeals(prev => {
      const newSelectedMeals = prev.includes(mealKey)
        ? prev.filter(m => m !== mealKey)
        : [...prev, mealKey];
      setShowIngredientSelection(newSelectedMeals.length > 0);
      return newSelectedMeals;
    });
  };

  const getRecipeCount = (mealType: string) => {
    return 0; // Egyelőre egyszerűsített
  };

  const handleMealIngredientsChange = (mealIngredients: any) => {
    setCurrentMealIngredients(mealIngredients);
  };

  const getPreferenceForIngredient = (ingredient: string, category: string): 'like' | 'dislike' | 'neutral' => {
    const preference = userPreferences.find(pref => 
      pref.ingredient.toLowerCase() === ingredient.toLowerCase() &&
      pref.category.toLowerCase() === category.toLowerCase()
    );
    return preference ? preference.preference : 'neutral';
  };

  const getMealTypeDisplayName = (mealType: string) => {
    const names: { [key: string]: string } = {
      'reggeli': 'Reggeli',
      'tízórai': 'Tízórai',
      'ebéd': 'Ebéd',
      'uzsonna': 'Uzsonna',
      'vacsora': 'Vacsora'
    };
    return names[mealType] || mealType;
  };

  if (isGenerating) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900/90 border border-white/20 rounded-2xl p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {selectedDays} napos étrend generálása...
          </h3>
          <p className="text-white/70 text-sm mb-4">
            Intelligens algoritmus dolgozik a legjobb receptek kiválasztásán és skálázásán
          </p>
          <div className="flex justify-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <div className="text-xs text-white/50">
            Ez eltarthat néhány másodpercig...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Napok száma kiválasztó */}
      <DayCountSelector
        selectedDays={selectedDays}
        onDaysChange={setSelectedDays}
      />

      {/* Étkezés típus kiválasztó */}
      <SharedMealTypeSelector
        selectedMeals={selectedMeals}
        onMealToggle={handleMealToggle}
        getRecipeCount={getRecipeCount}
        title="Válaszd ki az étkezéseket"
        subtitle="Kattints az étkezésekre a kiválasztáshoz"
      />

      {/* Alapanyag szűrő */}
      <SharedIngredientSelector
        selectedMeals={selectedMeals}
        getFavoriteForIngredient={() => ({ preference: 'neutral', ingredient: '', category: '' })} // Placeholder, as getFavoriteForIngredient is not directly available here
        getPreferenceForIngredient={getPreferenceForIngredient}
        onMealIngredientsChange={handleMealIngredientsChange}
        initialMealIngredients={currentMealIngredients}
        showIngredientSelection={showIngredientSelection}
        title="Alapanyag szűrés (opcionális)"
      />

      {/* Generálás gomb */}
      <SharedGenerationButton
        selectedMeals={selectedMeals}
        selectedIngredients={Object.values(currentMealIngredients).flat()}
        isGenerating={isGenerating}
        onGenerate={generateMultiDayScaledPlan}
        buttonText={`${selectedDays} napos makróskálázott étrend generálása`}
        icon="chef"
      />

      {/* Akció gombok */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          onClick={clearPlan}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Étrend törlése
        </Button>
      </div>

      {/* Generált étrend megjelenítése */}
      {multiDayScaledPlan.length > 0 && (
        <div className="space-y-6" ref={summaryRef}>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              🍽️ {multiDayScaledPlan.length} napos makróskálázott étrendterv
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Makrók alapján skálázott receptek
            </p>
          </div>
          
          {multiDayScaledPlan.map((dayPlan) => (
            <Card key={dayPlan.day} className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-400" />
                  {dayPlan.day}. nap
                  <Badge variant="secondary" className="bg-white/20 text-white/90 ml-2">
                    {dayPlan.date}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">
                    <Target className="w-3 h-3 mr-1" />
                    Makróskálázott
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Napi makró összesítés */}
                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Napi makró összesítés
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-white/70">Kalória</div>
                      <div className="text-white font-bold">{dayPlan.dailyTotals.calories.toFixed(0)} kcal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/70">Fehérje</div>
                      <div className="text-white font-bold">{dayPlan.dailyTotals.protein.toFixed(1)}g</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/70">Szénhidrát</div>
                      <div className="text-white font-bold">{dayPlan.dailyTotals.carbs.toFixed(1)}g</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/70">Zsír</div>
                      <div className="text-white font-bold">{dayPlan.dailyTotals.fat.toFixed(1)}g</div>
                    </div>
                  </div>
                </div>

                {/* Skálázott ételek */}
                <div className="grid grid-cols-1 gap-6">
                  {Object.entries(dayPlan.meals).map(([mealType, mealData]) => {
                    if (!mealData) return null;
                    
                    return (
                      <div key={mealType} className="space-y-3">
                        <h3 className="text-lg font-semibold text-white capitalize border-b border-white/20 pb-2">
                          {getMealTypeDisplayName(mealType)}
                        </h3>
                        
                        <div 
                          className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                          onClick={() => handleOpenMealModal(mealData)}
                        >
                          <RecipeContent recipe={mealData.recipe} compact />
                          
                          {/* Skálázási információk */}
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="text-white/70">Célmakrók:</div>
                                <div className="text-white">
                                  {mealData.targetMacros.calories.toFixed(0)} kcal
                                </div>
                              </div>
                              <div>
                                <div className="text-white/70">Eredeti makrók:</div>
                                <div className="text-white">
                                  {mealData.scalingResult.originalMacros.calories.toFixed(0)} kcal
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recept modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedMeal?.recipe?.név || 'Recept részletek'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMeal && (
            <div className="space-y-6">
              {/* Recept kép és leírás */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {selectedMeal.recipe?.kép && (
                    <img 
                      src={selectedMeal.recipe.kép} 
                      alt={selectedMeal.recipe.név}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Elkészítés</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedMeal.recipe?.elkészítés || 'Nincs leírás'}
                  </p>
                </div>
              </div>

              {/* Makró összehasonlítás */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Makró összehasonlítás</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Eredeti makrók */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-3 text-gray-800">Eredeti makrók</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Kalória:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.originalMacros.calories.toFixed(0)} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fehérje:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.originalMacros.protein.toFixed(1)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Szénhidrát:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.originalMacros.carbs.toFixed(1)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Zsír:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.originalMacros.fat.toFixed(1)}g</span>
                      </div>
                    </div>
                  </div>

                  {/* Skálázott makrók */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-3 text-blue-800">Skálázott makrók</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Kalória:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.scaledMacros.calories.toFixed(0)} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fehérje:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.scaledMacros.protein.toFixed(1)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Szénhidrát:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.scaledMacros.carbs.toFixed(1)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Zsír:</span>
                        <span className="font-semibold">{selectedMeal.scalingResult.scaledMacros.fat.toFixed(1)}g</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hozzávalók összehasonlítás */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hozzávalók összehasonlítás</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Eredeti hozzávalók */}
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-800">Eredeti hozzávalók</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hozzávaló</TableHead>
                          <TableHead>Mennyiség</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMeal.recipe?.ingredients?.map((ing: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{ing['Élelmiszerek']}</TableCell>
                            <TableCell>{ing.Mennyiség} {ing['Mértékegység']}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Skálázott hozzávalók */}
                  <div>
                    <h4 className="font-semibold mb-3 text-blue-800">Skálázott hozzávalók</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hozzávaló</TableHead>
                          <TableHead>Mennyiség</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMeal.scalingResult.scaledIngredients?.map((ing: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{ing['Élelmiszerek']}</TableCell>
                            <TableCell>{ing.Mennyiség.toFixed(1)} {ing['Mértékegység']}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 