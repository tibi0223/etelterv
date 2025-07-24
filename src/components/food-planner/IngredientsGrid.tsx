
import { useState, useEffect } from "react";
import { IngredientCard } from "./IngredientCard";
import { sortIngredientsByPreference } from "@/services/ingredientSorting";
import { supabase } from "@/integrations/supabase/client";

interface IngredientsGridProps {
  ingredients: string[];
  categoryName: string;
  getPreferenceForIngredient: (ingredient: string) => 'like' | 'dislike' | 'neutral';
  getFavoriteForIngredient: (ingredient: string) => boolean;
  onPreferenceChange: (ingredient: string, preference: 'like' | 'dislike' | 'neutral') => void;
  onFavoriteChange: (ingredient: string, isFavorite: boolean) => void;
  hideDisliked?: boolean;
}

export function IngredientsGrid({
  ingredients,
  categoryName,
  getPreferenceForIngredient,
  getFavoriteForIngredient,
  onPreferenceChange,
  onFavoriteChange,
  hideDisliked = true
}: IngredientsGridProps) {
  const [ingredientImages, setIngredientImages] = useState<Record<string, string>>({});

  // Lekérjük az alapanyag képeket az elelmiszer_kep táblából
  useEffect(() => {
    const fetchIngredientImages = async () => {
      try {
        console.log('🔄 Alapanyag képek betöltése elelmiszer_kep táblából...');
        
        // Lekérjük az összes képet az elelmiszer_kep táblából
        const { data: imageData, error } = await supabase
          .from('elelmiszer_kep')
          .select('Elelmiszer_nev, Kep')
          .not('Kep', 'is', null);

        if (error) {
          console.error('❌ Kép adatok betöltési hiba:', error);
          return;
        }

        const imageMap: Record<string, string> = {};

        // Feltöltjük a képek mappáját a Supabase storage client használatával
        imageData?.forEach(item => {
          if (item.Elelmiszer_nev && item.Kep) {
            // Használjuk a Supabase client getPublicUrl metódusát
            const { data } = supabase.storage
              .from('alapanyag')
              .getPublicUrl(item.Kep);
            
            if (data?.publicUrl) {
              imageMap[item.Elelmiszer_nev] = data.publicUrl;
            }
          }
        });

        // Ellenőrizzük, hogy mely alapanyagokhoz találtunk képet
        ingredients.forEach(ingredient => {
          if (imageMap[ingredient]) {
            console.log(`✅ Kép talált: ${ingredient} -> ${imageMap[ingredient]}`);
          } else {
            console.log(`❌ Nincs kép: ${ingredient}`);
          }
        });
        
        setIngredientImages(imageMap);
        console.log('✅ Adatbázis képek betöltve:', Object.keys(imageMap).length, 'db az alapanyagokból:', ingredients.length, 'db');
      } catch (error) {
        console.error('❌ Adatbázis képek betöltési hiba:', error);
      }
    };

    if (ingredients.length > 0) {
      fetchIngredientImages();
    }
  }, [ingredients]);
  const getSortedIngredients = () => {
    if (!hideDisliked) {
      return [...ingredients].sort((a, b) => {
        const aIsFavorite = getFavoriteForIngredient(a);
        const bIsFavorite = getFavoriteForIngredient(b);
        const aPreference = getPreferenceForIngredient(a);
        const bPreference = getPreferenceForIngredient(b);
        
        if (aIsFavorite !== bIsFavorite) {
          return aIsFavorite ? -1 : 1;
        }
        
        if (aPreference === 'like' && bPreference !== 'like') {
          return -1;
        }
        if (bPreference === 'like' && aPreference !== 'like') {
          return 1;
        }
        
        if (aPreference === 'dislike' && bPreference !== 'dislike') {
          return 1;
        }
        if (bPreference === 'dislike' && aPreference !== 'dislike') {
          return -1;
        }
        
        return a.localeCompare(b, 'hu');
      });
    }
    
    return sortIngredientsByPreference(
      ingredients,
      (ingredient) => getFavoriteForIngredient(ingredient),
      (ingredient) => getPreferenceForIngredient(ingredient),
      categoryName
    );
  };

  const displayedIngredients = getSortedIngredients();

  if (displayedIngredients.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nincs megjeleníthető alapanyag ebben a kategóriában.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {displayedIngredients.map((ingredient, index) => {
        const preference = getPreferenceForIngredient(ingredient);
        const favorite = getFavoriteForIngredient(ingredient);
        const imageUrl = ingredientImages[ingredient];
        
        return (
          <IngredientCard
            key={ingredient}
            ingredient={ingredient}
            preference={preference}
            favorite={favorite}
            index={index}
            imageUrl={imageUrl}
            onPreferenceChange={onPreferenceChange}
            onFavoriteChange={onFavoriteChange}
          />
        );
      })}
    </div>
  );
}
