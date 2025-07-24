
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MealTypeData } from '@/types/supabase';
import { CombinedRecipe } from '@/types/newDatabase';
import { fetchCategories, fetchMealTypes, saveRecipeRating } from '@/services/supabaseQueries';
import { fetchCombinedRecipes } from '@/services/newDatabaseQueries';
import { processCategories, processMealTypes, createMealTypesDisplay } from '@/utils/dataProcessors';
import { convertNewRecipeToStandard } from '@/utils/newRecipeConverter';
import { getRecipesByMealType, getRecipesByCategory } from '@/services/recipeFilters';
import { getUserPreferences, filterIngredientsByPreferences, UserPreference } from '@/services/preferenceFilters';
import { getUserFavorites, isFavoriteIngredient, UserFavorite, addUserFavorite, removeUserFavorite } from '@/services/userFavorites';
import { filterRecipesByPreferencesAdapter } from '@/services/preferenceAdapter';
import { fetchIngredientCategories, fetchNewIngredients } from '@/services/newIngredientQueries';

export function useSupabaseData(userId?: string) {
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [mealTypes, setMealTypes] = useState<MealTypeData>({});
  const [recipes, setRecipes] = useState<CombinedRecipe[]>([]);
  const [mealTypeRecipes, setMealTypeRecipes] = useState<Record<string, string[]>>({});
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [userFavorites, setUserFavorites] = useState<UserFavorite[]>([]);

  const loadUserFavorites = useCallback(async () => {
    if (!userId) return;
    
    try {
      console.log('🔄 Felhasználói kedvencek betöltése...', userId);
      const favorites = await getUserFavorites(userId);
      setUserFavorites(favorites);
      console.log('✅ Kedvencek betöltve:', favorites.length, 'db');
    } catch (error) {
      console.error('❌ Kedvencek betöltési hiba:', error);
    }
  }, [userId]);

  const loadUserPreferences = useCallback(async () => {
    if (!userId) return;
    
    try {
      console.log('🔄 Felhasználói preferenciák betöltése...', userId);
      const preferences = await getUserPreferences(userId);
      setUserPreferences(preferences);
      console.log('✅ Preferenciák betöltve:', preferences.length, 'db');
    } catch (error) {
      console.error('❌ Preferenciák betöltési hiba:', error);
    }
  }, [userId]);

  // User specifikus adatok betöltése - csak akkor, ha változik a userId
  useEffect(() => {
    if (userId) {
      loadUserPreferences();
      loadUserFavorites();
    }
  }, [userId, loadUserPreferences, loadUserFavorites]);

  // Alapvető adatok betöltése - CSAK EGYSZER! (most receptekkel együtt)
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        console.log('🔄 Alapadatok és receptek betöltése kezdődik...');
        
        const [categoriesData, mealTypesData, recipesData] = await Promise.all([
          fetchCategories(),
          fetchMealTypes(),
          fetchCombinedRecipes() // Receptek is betöltődnek egyből
        ]);

        if (!isMounted) return;

        const processedCategories = processCategories(categoriesData || []);
        const processedMealTypeRecipes = processMealTypes(mealTypesData || []);
        const processedMealTypes = createMealTypesDisplay(processedMealTypeRecipes);

        setCategories(processedCategories);
        setMealTypes(processedMealTypes);
        setMealTypeRecipes(processedMealTypeRecipes);
        setRecipes(recipesData || []); // Receptek betöltése
        
        console.log('✅ Összes adat betöltve:', {
          kategoriak: Object.keys(processedCategories).length,
          mealTypes: Object.keys(processedMealTypes).length,
          receptek: recipesData?.length || 0
        });
        
      } catch (error) {
        console.error('❌ Alapadatok betöltési hiba:', error);
        if (isMounted) {
          toast({
            title: "Hiba",
            description: "Nem sikerült betölteni az alapadatokat.",
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Receptek betöltése funkcióként - csak amikor szükséges
  const loadRecipes = useCallback(async (): Promise<CombinedRecipe[]> => {
    try {
      console.log('🔄 ÚJ adatbázis receptek betöltése kezdődik... (useSupabaseData hook)');
      const recipesData = await fetchCombinedRecipes();
      console.log('✅ ÚJ adatbázis receptek betöltve:', recipesData.length, 'db (useSupabaseData hook)');
      
      // Debug: nézzük meg hogy milyen adatokkal rendelkezik az első néhány recept
      if (recipesData && recipesData.length > 0) {
        console.log('🔍 Első 3 recept példa (hozzávalókkal):', recipesData.slice(0, 3).map(r => ({
          id: r.id,
          név: r.név,
          hozzávalók_db: r.hozzávalók?.length || 0,
          hozzávalók: r.hozzávalók?.slice(0, 3) // Csak az első 3 hozzávaló
        })));
        
        // Keressük meg a Spenótos quesadilla-t specifikusan
        const spentosRecipe = recipesData.find(r => r.név.toLowerCase().includes('spenótos') && r.név.toLowerCase().includes('quesadilla'));
        if (spentosRecipe) {
          console.log('🎯 Spenótos quesadilla recept megtalálva:', {
            id: spentosRecipe.id,
            név: spentosRecipe.név,
            hozzávalók_db: spentosRecipe.hozzávalók?.length || 0,
            hozzávalók: spentosRecipe.hozzávalók
          });
        }
      }
      
      setRecipes(recipesData || []);
      return recipesData || [];
    } catch (error) {
      console.error('❌ Receptek betöltési hiba:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a recepteket.",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  // Receptek lekérése meal type alapján - dynamic loading
  const getRecipesByMealTypeHandler = useCallback(async (mealType: string): Promise<CombinedRecipe[]> => {
    if (!Object.keys(mealTypeRecipes).length) {
      console.log('⚠️ Nincsenek meal type adatok');
      return [];
    }
    
    console.log('🔄 Meal type szűrés:', mealType);
    console.log('📊 Elérhető meal type adatok:', Object.keys(mealTypeRecipes));
    
    // Ha nincsenek betöltött receptek, betöltjük őket
    let currentRecipes = recipes;
    if (currentRecipes.length === 0) {
      currentRecipes = await loadRecipes();
    }
    
    // Meal type mapping
    const mealTypeMapping: Record<string, string> = {
      'reggeli': 'Reggeli',
      'tízórai': 'Tízórai', 
      'ebéd': 'Ebéd',
      'leves': 'Leves',
      'uzsonna': 'Uzsonna',
      'vacsora': 'Vacsora'
    };
    
    const mealTypeKey = mealTypeMapping[mealType.toLowerCase()] || mealType;
    const allowedRecipeNames = mealTypeRecipes[mealTypeKey] || [];
    
    console.log('🔍 Keresett meal type kulcs:', mealTypeKey);
    console.log('📝 Engedélyezett recept nevek:', allowedRecipeNames.length, 'db');
    
    // Szűrjük a recepteket meal type alapján
    const filteredRecipes = currentRecipes.filter(recipe => {
      if (!recipe.név || !allowedRecipeNames.length) return false;
      
      return allowedRecipeNames.some(allowedName => {
        const recipeName = recipe.név.toLowerCase().trim();
        const allowedNameLower = allowedName.toLowerCase().trim();
        
        return recipeName === allowedNameLower ||
               recipeName.includes(allowedNameLower) ||
               allowedNameLower.includes(recipeName);
      });
    });
    
    console.log('✅ Szűrt receptek:', filteredRecipes.length, 'db');
    return filteredRecipes;
  }, [recipes, mealTypeRecipes, loadRecipes]);

  const getRecipesByCategoryHandler = useCallback(async (category: string, ingredient?: string, mealType?: string): Promise<CombinedRecipe[]> => {
    if (!Object.keys(categories).length) {
      console.log('⚠️ Nincsenek kategória adatok');
      return [];
    }
    
    // Ha nincsenek betöltött receptek, betöltjük őket
    let currentRecipes = recipes;
    if (currentRecipes.length === 0) {
      currentRecipes = await loadRecipes();
    }
    
    return getRecipesByCategory(currentRecipes, mealTypeRecipes, categories, category, ingredient, mealType, userPreferences);
  }, [recipes, categories, mealTypeRecipes, userPreferences, loadRecipes]);

  const getFilteredIngredients = useCallback((category: string): string[] => {
    if (!Object.keys(categories).length) {
      return [];
    }
    const allIngredients = categories[category] || [];
    if (userPreferences.length === 0) return allIngredients;
    
    return filterIngredientsByPreferences(allIngredients, category, userPreferences);
  }, [categories, userPreferences]);

  const getRandomRecipe = useCallback((): CombinedRecipe | null => {
    if (recipes.length === 0) return null;
    return recipes[Math.floor(Math.random() * recipes.length)];
  }, [recipes]);

  const saveRating = async (recipeName: string, rating: number) => {
    if (!userId) {
      console.error('User ID szükséges az értékelés mentéséhez');
      return false;
    }

    try {
      await saveRecipeRating(recipeName, rating, userId);
      console.log('✅ Értékelés sikeresen mentve:', { recipeName, rating, userId });
      return true;
    } catch (error) {
      console.error('❌ Értékelés mentési hiba:', error);
      return false;
    }
  };

  const getFavoriteForIngredient = useCallback((ingredient: string, category?: string): boolean => {
    if (!userFavorites.length) return false;
    if (!category) {
      return userFavorites.some(fav => fav.ingredient === ingredient);
    }
    return isFavoriteIngredient(ingredient, category, userFavorites);
  }, [userFavorites]);

  const getPreferenceForIngredient = useCallback((ingredient: string, category?: string): 'like' | 'dislike' | 'neutral' => {
    if (!userPreferences.length || !category) return 'neutral';
    
    const preference = userPreferences.find(
      pref => pref.ingredient === ingredient && pref.category === category
    );
    
    return preference ? preference.preference as 'like' | 'dislike' | 'neutral' : 'neutral';
  }, [userPreferences]);

  const handleFavoriteToggle = async (ingredient: string, category: string, isFavorite: boolean) => {
    if (!userId) return false;

    try {
      if (isFavorite) {
        const success = await addUserFavorite(userId, category, ingredient);
        if (success) {
          await loadUserFavorites();
        }
        return success;
      } else {
        const success = await removeUserFavorite(userId, category, ingredient);
        if (success) {
          await loadUserFavorites();
        }
        return success;
      }
    } catch (error) {
      console.error('❌ Kedvenc kezelési hiba:', error);
      return false;
    }
  };

  return {
    categories,
    mealTypes,
    recipes,
    mealTypeRecipes,
    userPreferences,
    loading,
    getRecipesByMealType: getRecipesByMealTypeHandler,
    getRecipesByCategory: getRecipesByCategoryHandler,
    getFilteredIngredients,
    getRandomRecipe,
    convertToStandardRecipe: convertNewRecipeToStandard,
    saveRating,
    loadRecipes,
    refreshPreferences: loadUserPreferences,
    userFavorites,
    getFavoriteForIngredient,
    getPreferenceForIngredient,
    handleFavoriteToggle,
    refreshFavorites: loadUserFavorites
  };
}
