
export interface SortingParams {
  ingredient: string;
  isFavorite: boolean;
  preference: 'like' | 'dislike' | 'neutral';
}

export const sortIngredientsByPreference = (
  ingredients: string[],
  getFavoriteForIngredient: (ingredient: string, category?: string) => boolean,
  getPreferenceForIngredient: (ingredient: string, category?: string) => 'like' | 'dislike' | 'neutral',
  category?: string
): string[] => {
  return [...ingredients]
    .filter(ingredient => {
      const preference = getPreferenceForIngredient(ingredient, category);
      return preference !== 'dislike';
    })
    .sort((a, b) => {
      const aIsFavorite = getFavoriteForIngredient(a, category);
      const bIsFavorite = getFavoriteForIngredient(b, category);
      const aPreference = getPreferenceForIngredient(a, category);
      const bPreference = getPreferenceForIngredient(b, category);
      
      // Kedvencek előre
      if (aIsFavorite !== bIsFavorite) {
        return aIsFavorite ? -1 : 1;
      }
      
      // Like preferencia előre
      if (aPreference !== bPreference) {
        if (aPreference === 'like' && bPreference !== 'like') {
          return -1;
        }
        if (bPreference === 'like' && aPreference !== 'like') {
          return 1;
        }
        
        if (aPreference === 'neutral' && bPreference !== 'neutral') {
          return -1;
        }
        if (bPreference === 'neutral' && aPreference !== 'neutral') {
          return 1;
        }
      }
      
      return a.localeCompare(b, 'hu');
    });
};
