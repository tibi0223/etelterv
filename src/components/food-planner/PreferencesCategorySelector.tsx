
import { useState } from "react";
import { IngredientsGrid } from "./IngredientsGrid";
import { PreferencesCategoryGrid } from "./PreferencesCategoryGrid";

interface PreferencesCategorySelectorProps {
  categories: { [key: string]: string[] };
  getFilteredIngredients: (category: string) => string[];
  getPreferenceForIngredient: (ingredient: string, category: string) => 'like' | 'dislike' | 'neutral';
  getFavoriteForIngredient: (ingredient: string, category: string) => boolean;
  onPreferenceChange: (ingredient: string, category: string, preference: 'like' | 'dislike' | 'neutral') => void;
  onFavoriteChange: (ingredient: string, category: string, isFavorite: boolean) => void;
  hideDisliked?: boolean;
}

export function PreferencesCategorySelector({
  categories,
  getFilteredIngredients,
  getPreferenceForIngredient,
  getFavoriteForIngredient,
  onPreferenceChange,
  onFavoriteChange,
  hideDisliked = true
}: PreferencesCategorySelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  return (
    <div className="space-y-6">
      <PreferencesCategoryGrid
        categories={Object.keys(categories)}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {selectedCategory && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white text-center">
            {selectedCategory} alapanyagai
          </h2>
          
          <IngredientsGrid
            ingredients={getFilteredIngredients(selectedCategory)}
            categoryName={selectedCategory}
            getPreferenceForIngredient={(ingredient) => getPreferenceForIngredient(ingredient, selectedCategory)}
            getFavoriteForIngredient={(ingredient) => getFavoriteForIngredient(ingredient, selectedCategory)}
            onPreferenceChange={(ingredient, preference) => onPreferenceChange(ingredient, selectedCategory, preference)}
            onFavoriteChange={(ingredient, isFavorite) => onFavoriteChange(ingredient, selectedCategory, isFavorite)}
            hideDisliked={hideDisliked}
          />
        </div>
      )}
    </div>
  );
}
