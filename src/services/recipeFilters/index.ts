
// Új moduláris filter rendszer exportjai - MINDEN az új adatbázis struktúrán keresztül
export {
  getRecipesByMealTypeNew as getRecipesByMealType,
  filterRecipesByMultipleIngredientsNew as filterRecipesByMultipleIngredients,
  getRecipesByCategoryNew as getRecipesByCategory
} from './newDatabaseFilters';

// Legacy funkciók átirányítása az új rendszerre
export {
  filterRecipesByIngredient,
  getAllRecipeIngredients,
  hasIngredientMatch
} from './ingredientFilters';

export {
  filterRecipesByCategory
} from './categoryFilters';

// Régi exportok kompatibilitásért (deprecated)
export {
  getRecipesByMealType as oldGetRecipesByMealType
} from './mealTypeFilters';

export {
  filterRecipesByMultipleIngredients as oldFilterRecipesByMultipleIngredients
} from './ingredientFilters';

console.log('🔄 Recipe filters betöltve - ID alapú szűrés aktív minden alapanyag szűrésnél');
