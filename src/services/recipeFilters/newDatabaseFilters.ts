import { CombinedRecipe } from '@/types/newDatabase';
import { UserPreference } from '@/services/preferenceFilters';

export const getRecipesByMealTypeNew = (
  recipes: CombinedRecipe[],
  mealTypeRecipes: Record<string, string[]>,
  mealType: string,
  userPreferences: UserPreference[] = []
): CombinedRecipe[] => {
  console.log('🔍 Receptek keresése meal type alapján:', { 
    mealType, 
    totalRecipes: recipes.length,
    recipesWithMealTypes: recipes.filter(r => r.mealTypes.length > 0).length,
    userPreferences: userPreferences.length
  });
  
  // Normalizáljuk az étkezési típust a kereséshez
  const normalizedMealType = mealType.toLowerCase();
  
  // Szűrés az Étkezések tábla alapján meghatározott meal types alapján
  const filteredRecipes = recipes.filter(recipe => {
    if (!recipe.mealTypes || recipe.mealTypes.length === 0) {
      console.log(`⚠️ "${recipe.név}" (${recipe.id}) - nincs meal type`);
      return false;
    }
    
    const hasMatch = recipe.mealTypes.some(recipeMealType => {
      const recipeMealTypeLower = recipeMealType.toLowerCase();
      return recipeMealTypeLower === normalizedMealType ||
             (normalizedMealType === 'tízórai' && recipeMealTypeLower === 'tízórai') ||
             (normalizedMealType === 'tizórai' && recipeMealTypeLower === 'tízórai') ||
             (normalizedMealType === 'reggeli' && recipeMealTypeLower === 'reggeli') ||
             (normalizedMealType === 'ebéd' && recipeMealTypeLower === 'ebéd') ||
             (normalizedMealType === 'ebed' && recipeMealTypeLower === 'ebéd') ||
             (normalizedMealType === 'uzsonna' && recipeMealTypeLower === 'uzsonna') ||
             (normalizedMealType === 'vacsora' && recipeMealTypeLower === 'vacsora');
    });
    
    if (hasMatch) {
      console.log(`✅ Meal type találat: "${recipe.név}" (${recipe.id}) → ${recipe.mealTypes.join(', ')}`);
    }
    
    return hasMatch;
  });
  
  console.log(`🎯 Meal type találatok: ${filteredRecipes.length} recept`);
  
  if (filteredRecipes.length === 0) {
    console.warn(`⚠️ Nincs ${mealType} típusú recept az Étkezések tábla alapján`);
    console.log('📋 Elérhető meal type-ok az összes receptben:', 
      [...new Set(recipes.flatMap(r => r.mealTypes))].sort()
    );
    return [];
  }

  console.log(`✅ Talált receptek ${mealType} típushoz:`, filteredRecipes.length);
  
  const filteredByPreferences = applyUserPreferences(filteredRecipes, userPreferences);
  console.log(`📊 Preferenciák alkalmazása után: ${filteredByPreferences.length} recept`);
  return filteredByPreferences;
};

const applyUserPreferences = (recipes: CombinedRecipe[], userPreferences: UserPreference[]): CombinedRecipe[] => {
  if (userPreferences.length === 0) {
    console.log('📝 Nincsenek felhasználói preferenciák, minden recept megtartva');
    return recipes;
  }

  console.log('🔍 Preferenciák alkalmazása:', userPreferences.length, 'preferencia');
  
  const preferenceFilteredRecipes = recipes.filter(recipe => {
    // Ellenőrizzük, hogy a recept tartalmaz-e dislike-olt alapanyagot
    const hasDislikedIngredient = recipe.hozzávalók.some(ingredient => {
      // JAVÍTÁS: ingredient most már ReceptAlapanyagV2 objektum, nem string
      const ingredientName = ingredient['Élelmiszerek'] || '';
      const ingredientLower = ingredientName.toLowerCase();
      return userPreferences.some(pref => {
        if (pref.preference === 'dislike') {
          const prefIngredientLower = pref.ingredient.toLowerCase();
          const hasMatch = ingredientLower.includes(prefIngredientLower) ||
                          prefIngredientLower.includes(ingredientLower);
          
          if (hasMatch) {
            console.log(`❌ "${recipe.név}" (${recipe.id}) kiszűrve: tartalmazza a nem kedvelt "${pref.ingredient}" alapanyagot`);
            return true;
          }
        }
        return false;
      });
    });
    
    return !hasDislikedIngredient;
  });
  
  console.log(`🎯 Preferenciák alkalmazása után: ${preferenceFilteredRecipes.length}/${recipes.length} recept maradt`);
  
  // Preferált receptek előre sorolása
  const sortedRecipes = preferenceFilteredRecipes.sort((a, b) => {
    const aLikedIngredients = a.hozzávalók.filter(ingredient => {
      // JAVÍTÁS: ingredient most már ReceptAlapanyagV2 objektum, nem string
      const ingredientName = ingredient['Élelmiszerek'] || '';
      const ingredientLower = ingredientName.toLowerCase();
      return userPreferences.some(pref => 
        pref.preference === 'like' && 
        (ingredientLower.includes(pref.ingredient.toLowerCase()) ||
         pref.ingredient.toLowerCase().includes(ingredientLower))
      );
    }).length;
    
    const bLikedIngredients = b.hozzávalók.filter(ingredient => {
      // JAVÍTÁS: ingredient most már ReceptAlapanyagV2 objektum, nem string
      const ingredientName = ingredient['Élelmiszerek'] || '';
      const ingredientLower = ingredientName.toLowerCase();
      return userPreferences.some(pref => 
        pref.preference === 'like' && 
        (ingredientLower.includes(pref.ingredient.toLowerCase()) ||
         pref.ingredient.toLowerCase().includes(ingredientLower))
      );
    }).length;
    
    return bLikedIngredients - aLikedIngredients; // Több kedvelt alapanyag = előrébb
  });
  
  return sortedRecipes;
};

export const filterRecipesByMultipleIngredientsNew = async (
  recipes: CombinedRecipe[],
  requiredIngredients: string[]
): Promise<CombinedRecipe[]> => {
  console.log('🔍 ID alapú alapanyag szűrés:', requiredIngredients);
  
  if (requiredIngredients.length === 0) {
    console.log('⚠️ Nincs megadva alapanyag, minden recept visszaküldése');
    return recipes;
  }
  
  // Használjuk az ID alapú szűrést
  const { filterRecipesByPreferencesAdapter } = await import('../preferenceAdapter');
  return await filterRecipesByPreferencesAdapter(recipes, requiredIngredients);
};

export const getRecipesByCategoryNew = (
  recipes: CombinedRecipe[],
  mealTypeRecipes: Record<string, string[]>,
  categories: Record<string, string[]>,
  category: string,
  ingredient?: string,
  mealType?: string,
  userPreferences: UserPreference[] = []
): CombinedRecipe[] => {
  console.log('🔍 Receptek keresése kategória alapján:', { 
    category, 
    ingredient, 
    mealType,
    totalRecipes: recipes.length,
    userPreferences: userPreferences.length
  });
  
  let filteredRecipes = [...recipes];
  
  // Szűrés meal type alapján ha meg van adva
  if (mealType) {
    console.log(`🎯 Szűrés meal type alapján: ${mealType}`);
    filteredRecipes = getRecipesByMealTypeNew(filteredRecipes, mealTypeRecipes, mealType, userPreferences);
  }
  
  // Szűrés alapanyag alapján ha meg van adva
  if (ingredient) {
    console.log(`🎯 Szűrés alapanyag alapján: ${ingredient}`);
    filteredRecipes = filteredRecipes.filter(recipe => {
      const hasIngredient = recipe.hozzávalók.some(recipeIngredient => {
        // JAVÍTÁS: recipeIngredient most már ReceptAlapanyagV2 objektum, nem string
        const ingredientName = recipeIngredient['Élelmiszerek'] || '';
        const recipeIngLower = ingredientName.toLowerCase();
        const ingredientLower = ingredient.toLowerCase();
        const hasMatch = recipeIngLower.includes(ingredientLower) ||
                        ingredientLower.includes(ingredientName.split(' ').pop()?.toLowerCase() || '');
        
        if (hasMatch) {
          console.log(`✅ "${recipe.név}" (${recipe.id}) tartalmazza: ${ingredient}`);
        }
        
        return hasMatch;
      });
      
      return hasIngredient;
    });
  }
  
  // Ha nem volt meal type szűrés, alkalmazzuk a preferenciákat itt
  if (!mealType && userPreferences.length > 0) {
    filteredRecipes = applyUserPreferences(filteredRecipes, userPreferences);
  }
  
  console.log(`✅ Kategória szűrés eredménye: ${filteredRecipes.length} recept`);
  return filteredRecipes;
};
