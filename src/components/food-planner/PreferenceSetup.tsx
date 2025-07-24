import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { saveUserPreferences } from "@/services/foodPreferencesQueries";
import { addUserFavorite } from "@/services/userFavorites";
import { PreferenceInfoModal } from "./PreferenceInfoModal";
import { PreferenceHeader } from "./PreferenceHeader";
import { IngredientsGrid } from "./IngredientsGrid";
import { PreferenceNavigation } from "./PreferenceNavigation";
import { 
  fetchIngredientCategories, 
  fetchIngredientsByCategory, 
  NewIngredient, 
  IngredientCategory 
} from "@/services/newIngredientQueries";

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface PreferenceSetupProps {
  user: User;
  onComplete: () => void;
}

interface PreferenceState {
  [key: string]: 'like' | 'dislike' | 'neutral';
}

interface FavoriteState {
  [key: string]: boolean;
}

export function PreferenceSetup({ user, onComplete }: PreferenceSetupProps) {
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentIngredients, setCurrentIngredients] = useState<NewIngredient[]>([]);
  const [preferences, setPreferences] = useState<PreferenceState>({});
  const [favorites, setFavorites] = useState<FavoriteState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('🔄 ÚJ preferencia setup - kategóriák betöltése...');
        
        const categoriesData = await fetchIngredientCategories();
        setCategories(categoriesData);
        
        if (categoriesData.length > 0) {
          console.log('🔄 Első kategória alapanyagainak betöltése...');
          const firstCategoryIngredients = await fetchIngredientsByCategory(categoriesData[0].Kategoria_ID);
          setCurrentIngredients(firstCategoryIngredients);
        }
        
        console.log('✅ ÚJ preferencia setup adatok betöltve:', {
          kategoriak: categoriesData.length,
          elso_kategoria_alapanyagok: categoriesData.length > 0 ? (await fetchIngredientsByCategory(categoriesData[0].Kategoria_ID)).length : 0
        });
        
      } catch (error) {
        console.error('❌ ÚJ preferencia setup betöltési hiba:', error);
        toast({
          title: "Hiba történt",
          description: "Nem sikerült betölteni az alapanyagokat.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [toast]);

  const handlePreferenceChange = (ingredient: string, preference: 'like' | 'dislike' | 'neutral') => {
    const currentCategory = categories[currentCategoryIndex];
    const key = `${currentCategory.Kategoriak}-${ingredient}`;
    
    console.log('🔄 Preferencia változás:', { ingredient, preference, category: currentCategory.Kategoriak });
    
    setPreferences(prev => ({
      ...prev,
      [key]: preference
    }));
  };

  const handleFavoriteChange = (ingredient: string, isFavorite: boolean) => {
    const currentCategory = categories[currentCategoryIndex];
    const key = `${currentCategory.Kategoriak}-${ingredient}`;
    
    console.log('🔄 Kedvenc változás:', { ingredient, isFavorite, category: currentCategory.Kategoriak });
    
    setFavorites(prev => ({
      ...prev,
      [key]: isFavorite
    }));
  };

  const getPreferenceForIngredient = (ingredient: string): 'like' | 'dislike' | 'neutral' => {
    const currentCategory = categories[currentCategoryIndex];
    const key = `${currentCategory.Kategoriak}-${ingredient}`;
    return preferences[key] || 'neutral';
  };

  const getFavoriteForIngredient = (ingredient: string): boolean => {
    const currentCategory = categories[currentCategoryIndex];
    const key = `${currentCategory.Kategoriak}-${ingredient}`;
    return favorites[key] || false;
  };

  const handleNext = async () => {
    if (currentCategoryIndex < categories.length - 1) {
      const nextIndex = currentCategoryIndex + 1;
      setCurrentCategoryIndex(nextIndex);
      
      console.log('🔄 Következő kategória betöltése:', categories[nextIndex].Kategoriak);
      const nextCategoryIngredients = await fetchIngredientsByCategory(categories[nextIndex].Kategoria_ID);
      setCurrentIngredients(nextCategoryIngredients);
    }
  };

  const handlePrev = async () => {
    if (currentCategoryIndex > 0) {
      const prevIndex = currentCategoryIndex - 1;
      setCurrentCategoryIndex(prevIndex);
      
      console.log('🔄 Előző kategória betöltése:', categories[prevIndex].Kategoriak);
      const prevCategoryIngredients = await fetchIngredientsByCategory(categories[prevIndex].Kategoria_ID);
      setCurrentIngredients(prevCategoryIngredients);
    }
  };

  const handleFinish = async () => {
    console.log('🎯 ÚJ preferencia setup befejezése...');
    
    // Ellenőrizzük, hogy van-e legalább egy beállított preferencia
    const hasAnyPreference = Object.values(preferences).some(pref => pref !== 'neutral');
    
    if (!hasAnyPreference) {
      toast({
        title: "Preferencia szükséges! ⚠️",
        description: "Kérlek, legalább egy ételpreferenciát jelölj be valamelyik kategóriában a folytatáshoz.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Csak azokat a preferenciákat mentjük el, amelyek nem neutral-ak
      const preferencesToSave = Object.entries(preferences)
        .filter(([key, preference]) => preference !== 'neutral')
        .map(([key, preference]) => {
          const [category, ingredient] = key.split('-', 2);
          const favoriteKey = `${category}-${ingredient}`;
          return {
            category,
            ingredient,
            preference,
            favorite: favorites[favoriteKey] || false
          };
        });

      console.log('💾 ÚJ rendszer - Mentendő preferenciák:', preferencesToSave);

      // Mentjük a preferenciákat
      await saveUserPreferences(user.id, preferencesToSave);
      console.log('✅ ÚJ preferenciák sikeresen elmentve');

      // Külön mentjük a kedvenceket az user_favorites táblába
      const favoritesToSave = Object.entries(favorites)
        .filter(([key, isFavorite]) => isFavorite)
        .map(([key]) => {
          const [category, ingredient] = key.split('-', 2);
          return { category, ingredient };
        });

      console.log('💾 ÚJ rendszer - Mentendő kedvencek:', favoritesToSave);

      // Kedvencek mentése egyenként
      for (const favorite of favoritesToSave) {
        const success = await addUserFavorite(user.id, favorite.category, favorite.ingredient);
        if (success) {
          console.log(`✅ ÚJ kedvenc mentve: ${favorite.ingredient} (${favorite.category})`);
        } else {
          console.log(`❌ ÚJ kedvenc mentése sikertelen: ${favorite.ingredient} (${favorite.category})`);
        }
      }
      
      toast({
        title: "Preferenciák és kedvencek mentve! ✅",
        description: `${preferencesToSave.length} preferencia és ${favoritesToSave.length} kedvenc sikeresen elmentve!`,
      });
      
      console.log('🚀 ÚJ preferencia setup befejezése és átirányítás...');
      onComplete();
      
    } catch (error) {
      console.error('❌ ÚJ preferenciák mentési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült menteni a preferenciákat. Próbáld újra!",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">ÚJ rendszer betöltése...</p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg">Nincs elérhető kategória.</p>
        </div>
      </div>
    );
  }

  const currentCategory = categories[currentCategoryIndex];
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  // Convert NewIngredient array to string array for IngredientsGrid
  const ingredientNames = currentIngredients.map(ing => ing.Elelmiszer_nev);

  console.log('🎯 ÚJ rendszer - Aktuális kategória:', currentCategory.Kategoriak);
  console.log('🍽️ ÚJ rendszer - Aktuális alapanyagok:', ingredientNames);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {/* Info Modal */}
      <PreferenceInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)}
      />

      {/* Header */}
      <PreferenceHeader
        currentCategoryIndex={currentCategoryIndex}
        totalCategories={categories.length}
        onShowInfo={() => setShowInfoModal(true)}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-4 sm:p-6">
          {/* Category Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {currentCategory.Kategoriak}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Jelöld meg, hogy mely alapanyagokat szereted! Használd a szív gombot a kedvencekhez.
            </p>
          </div>

          {/* Ingredients Grid */}
          <IngredientsGrid
            ingredients={ingredientNames}
            categoryName={currentCategory.Kategoriak}
            getPreferenceForIngredient={getPreferenceForIngredient}
            getFavoriteForIngredient={getFavoriteForIngredient}
            onPreferenceChange={handlePreferenceChange}
            onFavoriteChange={handleFavoriteChange}
            hideDisliked={false}
          />

          {/* Navigation */}
          <PreferenceNavigation
            currentCategoryIndex={currentCategoryIndex}
            totalCategories={categories.length}
            isLastCategory={isLastCategory}
            saving={saving}
            onPrev={handlePrev}
            onNext={handleNext}
            onFinish={handleFinish}
          />
        </div>
      </div>
    </div>
  );
}