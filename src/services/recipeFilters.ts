
// Ez a fájl már csak backward compatibility-ért marad
// Az új moduláris rendszert használd a ./recipeFilters/ mappából

export {
  getRecipesByMealType,
  filterRecipesByIngredient,
  filterRecipesByMultipleIngredients,
  filterRecipesByCategory,
  getRecipesByCategory,
  getAllRecipeIngredients,
  hasIngredientMatch
} from './recipeFilters/index';
