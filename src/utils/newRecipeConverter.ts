
import { CombinedRecipe } from '@/types/newDatabase';
import { Recipe } from '@/types/recipe';

export const convertNewRecipeToStandard = (newRecipe: CombinedRecipe): Recipe => {
  return {
    név: newRecipe.név,
    elkészítés: newRecipe.elkészítés,
    képUrl: newRecipe.kép,
    szénhidrát: newRecipe.szénhidrát.toString(),
    fehérje: newRecipe.fehérje.toString(),
    zsír: newRecipe.zsír.toString(),
    kalória: newRecipe.kalória.toString(),
    hozzávalók: newRecipe.hozzávalók
  };
};
