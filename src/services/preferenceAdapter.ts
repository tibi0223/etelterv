import { CombinedRecipe } from './database/types';
import { findIngredientByName } from './newIngredientQueries';
import { supabase } from '../integrations/supabase/client';

export const filterRecipesByPreferencesAdapter = async (
  recipes: CombinedRecipe[],
  selectedIngredientNames: string[],
  userId?: string
): Promise<CombinedRecipe[]> => {
  console.log('🔄 ÚJ preferencia adapter szűrés ID alapján');
  console.log('📊 Receptek száma:', recipes.length);
  console.log('🥕 Kiválasztott alapanyagok:', selectedIngredientNames);

  if (selectedIngredientNames.length === 0) {
    console.log('✅ Nincs szűrés - minden receptet visszaadok');
    return recipes;
  }

  const assignedIds: string[] = [];

  // Név -> Hozzarendelt_ID konverzió
  for (const name of selectedIngredientNames) {
    const ingredient = await findIngredientByName(name);
    
    if (ingredient?.Hozzarendelt_ID) {
      // A Hozzarendelt_ID lehet több ID is vesszővel elválasztva
      const ids = ingredient.Hozzarendelt_ID.split(',').map(id => id.trim());
      assignedIds.push(...ids);
      console.log(`✅ ${name} -> ID(k): ${ingredient.Hozzarendelt_ID}`);
    } else {
      console.warn(`❌ Nincs ID találat: ${name}`);
    }
  }

  console.log('🔗 Összegyűjtött ID-k:', assignedIds);

  if (assignedIds.length === 0) {
    console.warn('⚠️ Nincs egyetlen ID sem - üres eredmény');
    return [];
  }

  // Most a recept_alapanyag táblából keressük meg, mely receptek tartalmazzák ezeket az ID-kat
  try {
    const response = await supabase
      .from('recept_alapanyag')
      .select('Recept_ID, "Élelmiszer ID"');

    if (response.error) {
      console.error('❌ Hiba a recept_alapanyag lekérdezésekor:', response.error);
      return [];
    }

    if (!response.data) {
      console.warn('⚠️ Nincs adat a recept_alapanyag táblában');
      return [];
    }

    // Minden egyes assignedId-hoz keressük meg a recepteket
    const recipeIdsByIngredient: Record<string, number[]> = {};
    
    for (const assignedId of assignedIds) {
      const matchingRows = response.data.filter(row => {
        const elelmiszerId = (row as any)['Élelmiszer ID'];
        return elelmiszerId && elelmiszerId.toString() === assignedId;
      });
      
      recipeIdsByIngredient[assignedId] = matchingRows.map(row => row.Recept_ID);
      console.log(`🔍 Alapanyag ID ${assignedId} receptjei:`, recipeIdsByIngredient[assignedId]);
    }

    // Csak azokat a recepteket tartjuk meg, amelyek MINDEN kiválasztott alapanyagot tartalmazzák
    let filteredRecipeIds: number[] = [];
    
    if (assignedIds.length === 1) {
      // Ha csak egy alapanyag van kiválasztva
      filteredRecipeIds = recipeIdsByIngredient[assignedIds[0]] || [];
    } else {
      // Ha több alapanyag van kiválasztva, csak azokat a recepteket tartjuk meg, 
      // amelyek minden alapanyagot tartalmazzák (metszet)
      const recipeIdArrays = Object.values(recipeIdsByIngredient);
      
      if (recipeIdArrays.length > 0) {
        filteredRecipeIds = recipeIdArrays[0];
        
        for (let i = 1; i < recipeIdArrays.length; i++) {
          filteredRecipeIds = filteredRecipeIds.filter(id => 
            recipeIdArrays[i].includes(id)
          );
        }
      }
    }

    console.log('🎯 Minden alapanyagot tartalmazó Recept_ID-k:', filteredRecipeIds);

    if (filteredRecipeIds.length === 0) {
      console.warn('⚠️ Nincs olyan recept, amely minden kiválasztott alapanyagot tartalmaz');
      return [];
    }

    // Receptek szűrése a matching Recept_ID-k alapján (debug info hozzáadva)
    console.log('🔍 Debug - recipes tömb első 5 elem ID-ja és típusa:');
    recipes.slice(0, 5).forEach(recipe => {
      console.log(`Recipe: ${recipe.név}, ID: ${recipe.id}, típus: ${typeof recipe.id}`);
    });
    
    console.log('🔍 Debug - keresett filteredRecipeIds:', filteredRecipeIds);
    
    const filtered = recipes.filter(recipe => {
      // A recipe.id lehet string vagy number, a filteredRecipeIds number array
      const recipeIdAsNumber = typeof recipe.id === 'string' ? parseInt(recipe.id) : recipe.id;
      const recipeIdAsString = recipe.id.toString();
      
      const isMatchNumber = filteredRecipeIds.includes(recipeIdAsNumber);
      const isMatchString = filteredRecipeIds.map(id => id.toString()).includes(recipeIdAsString);
      
      const isMatch = isMatchNumber || isMatchString;
      
      if (isMatch) {
        console.log(`✅ Recept találat: ${recipe.név} (ID: ${recipe.id}, típus: ${typeof recipe.id})`);
      }
      
      return isMatch;
    });

    console.log(`📊 Végső szűrés eredménye: ${filtered.length}/${recipes.length} recept`);
    
    if (filtered.length > 0) {
      console.log('🍽️ Szűrt receptek:', filtered.map(r => r.név));
    } else {
      console.warn('❌ Nincs találat a kiválasztott alapanyag(ok)kal');
    }

    return filtered;

  } catch (error) {
    console.error('❌ Hiba az ID alapú szűrés során:', error);
    return [];
  }
};

export const filterRecipesByIngredientIds = async (
  recipes: CombinedRecipe[],
  assignedIds: string[]
): Promise<CombinedRecipe[]> => {
  console.log('🔄 Receptek szűrése ID lista alapján:', assignedIds);

  const filtered = recipes.filter(recipe => {
    if (!recipe.Hozzarendelt_ID) return false;
    
    const recipeIds = recipe.Hozzarendelt_ID.split(',').map(id => id.trim());
    return assignedIds.some(id => recipeIds.includes(id));
  });

  console.log(`📊 ID szűrés eredménye: ${filtered.length}/${recipes.length} recept`);
  return filtered;
};