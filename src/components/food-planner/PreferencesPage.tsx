import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { 
  fetchUserPreferences, 
  updateUserPreference,
  FoodPreference 
} from "@/services/foodPreferencesQueries";
import { 
  getUserFavorites, 
  addUserFavorite, 
  removeUserFavorite, 
  UserFavorite 
} from "@/services/userFavorites";
import { IngredientsGrid } from "./IngredientsGrid";
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

interface PreferencesPageProps {
  user: User;
  onClose: () => void;
}

export function PreferencesPage({ user, onClose }: PreferencesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | null>(null);
  const [userPreferences, setUserPreferences] = useState<FoodPreference[]>([]);
  const [userFavorites, setUserFavorites] = useState<UserFavorite[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [categoryIngredients, setCategoryIngredients] = useState<Record<number, NewIngredient[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Habits from registration/profile
  const [mealsPerDay, setMealsPerDay] = useState<number>(3);
  const [sameLunchDinner, setSameLunchDinner] = useState<boolean>(false);
  const [repeatTol, setRepeatTol] = useState({
    breakfast: [2, 5] as [number, number],
    tizorai: [2, 5] as [number, number],
    lunch: [1, 2] as [number, number],
    uzsonna: [2, 5] as [number, number],
    dinner: [1, 2] as [number, number],
  });

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 ÚJ PreferencesPage - adatok betöltése...');
      
      // Minden adat egyidejű betöltése
      const [preferences, favorites, categoriesData] = await Promise.all([
        fetchUserPreferences(user.id),
        getUserFavorites(user.id),
        fetchIngredientCategories()
      ]);
      // Load habits from user metadata
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const meta: any = authUser?.user_metadata || {};
        const mpd = Number(meta.meals_per_day);
        if (Number.isFinite(mpd) && mpd >= 1 && mpd <= 5) setMealsPerDay(mpd);
        setSameLunchDinner(Boolean(meta.same_lunch_dinner));
        if (meta.repeat_tolerance) {
          const rt = meta.repeat_tolerance;
          setRepeatTol({
            breakfast: [rt.breakfast?.min ?? 2, rt.breakfast?.max ?? 5],
            tizorai: [rt.tizorai?.min ?? 2, rt.tizorai?.max ?? 5],
            lunch: [rt.lunch?.min ?? 1, rt.lunch?.max ?? 2],
            uzsonna: [rt.uzsonna?.min ?? 2, rt.uzsonna?.max ?? 5],
            dinner: [rt.dinner?.min ?? 1, rt.dinner?.max ?? 2],
          });
        }
      } catch {}

      setUserPreferences(preferences);
      setUserFavorites(favorites);
      setCategories(categoriesData);
      
      // Kategóriánként betöltjük az alapanyagokat
      const categoryIngredientsMap: Record<number, NewIngredient[]> = {};
      for (const category of categoriesData) {
        const ingredients = await fetchIngredientsByCategory(category.Kategoria_ID);
        categoryIngredientsMap[category.Kategoria_ID] = ingredients;
      }
      setCategoryIngredients(categoryIngredientsMap);
      
      console.log('✅ ÚJ PreferencesPage adatok betöltve:', {
        preferences: preferences.length,
        favorites: favorites.length,
        categories: categoriesData.length,
        totalIngredients: Object.values(categoryIngredientsMap).reduce((sum, ings) => sum + ings.length, 0)
      });
      
    } catch (error) {
      console.error('❌ ÚJ PreferencesPage betöltési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült betölteni a preferenciákat.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: IngredientCategory) => {
    setSelectedCategory(category);
    
    // Görgessünk le az alapanyagokhoz
    setTimeout(() => {
      const ingredientsSection = document.querySelector('[data-scroll-target="category-ingredients"]');
      if (ingredientsSection) {
        ingredientsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handlePreferenceUpdate = async (ingredient: string, preference: 'like' | 'dislike' | 'neutral') => {
    if (!selectedCategory) return;
    
    try {
      console.log('🔄 ÚJ preferencia frissítése:', { ingredient, category: selectedCategory.Kategoriak, preference });
      
      // Update in database
      await updateUserPreference(user.id, ingredient, selectedCategory.Kategoriak, preference);
      
      // Update local state
      setUserPreferences(prev => {
        const existingIndex = prev.findIndex(p => 
          p.ingredient === ingredient && p.category === selectedCategory.Kategoriak
        );
        
        if (preference === 'neutral') {
          // Remove the preference if it exists
          return prev.filter(p => !(p.ingredient === ingredient && p.category === selectedCategory.Kategoriak));
        } else {
          // Add or update the preference
          const newPreference: FoodPreference = {
            id: existingIndex >= 0 ? prev[existingIndex].id : crypto.randomUUID(),
            user_id: user.id,
            ingredient,
            category: selectedCategory.Kategoriak,
            preference,
            created_at: existingIndex >= 0 ? prev[existingIndex].created_at : new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          if (existingIndex >= 0) {
            // Update existing
            const updated = [...prev];
            updated[existingIndex] = newPreference;
            return updated;
          } else {
            // Add new
            return [...prev, newPreference];
          }
        }
      });
      
      console.log('✅ ÚJ preferencia sikeresen frissítve');
    } catch (error) {
      console.error('❌ ÚJ preferencia frissítési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült frissíteni a preferenciát.",
        variant: "destructive"
      });
    }
  };

  const handleFavoriteChange = async (ingredient: string, isFavorite: boolean) => {
    if (!selectedCategory) return;
    
    try {
      console.log('🔄 ÚJ kedvenc frissítése:', { ingredient, category: selectedCategory.Kategoriak, isFavorite });
      
      if (isFavorite) {
        // Add to favorites
        const success = await addUserFavorite(user.id, selectedCategory.Kategoriak, ingredient);
        if (success) {
          // Update local state
          const newFavorite: UserFavorite = {
            id: crypto.randomUUID(),
            user_id: user.id,
            category: selectedCategory.Kategoriak,
            ingredient,
            created_at: new Date().toISOString()
          };
          setUserFavorites(prev => [...prev, newFavorite]);
          
          // If favorite, also set preference to like
          if (getPreferenceForIngredient(ingredient) !== 'like') {
            await handlePreferenceUpdate(ingredient, 'like');
          }
          
          console.log('✅ ÚJ kedvenc hozzáadva');
        }
      } else {
        // Remove from favorites
        const success = await removeUserFavorite(user.id, selectedCategory.Kategoriak, ingredient);
        if (success) {
          // Update local state
          setUserFavorites(prev => 
            prev.filter(fav => !(fav.ingredient === ingredient && fav.category === selectedCategory.Kategoriak))
          );
          console.log('✅ ÚJ kedvenc eltávolítva');
        }
      }
    } catch (error) {
      console.error('❌ ÚJ kedvenc kezelési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült frissíteni a kedvencet.",
        variant: "destructive"
      });
    }
  };

  const getStatsForCategory = (category: IngredientCategory) => {
    const availableIngredients = categoryIngredients[category.Kategoria_ID] || [];
    const ingredientNames = availableIngredients.map(ing => ing.Elelmiszer_nev);
    
    const categoryPrefs = userPreferences.filter(p => 
      p.category === category.Kategoriak && ingredientNames.includes(p.ingredient)
    );
    const categoryFavs = userFavorites.filter(f => 
      f.category === category.Kategoriak && ingredientNames.includes(f.ingredient)
    );
    
    return {
      liked: categoryPrefs.filter(p => p.preference === 'like').length,
      disliked: categoryPrefs.filter(p => p.preference === 'dislike').length,
      favorites: categoryFavs.length
    };
  };

  const getTotalStats = () => {
    let totalLiked = 0;
    let totalDisliked = 0;
    let totalFavorites = 0;
    
    categories.forEach(category => {
      const stats = getStatsForCategory(category);
      totalLiked += stats.liked;
      totalDisliked += stats.disliked;
      totalFavorites += stats.favorites;
    });
    
    return {
      liked: totalLiked,
      disliked: totalDisliked,
      favorites: totalFavorites,
      total: totalLiked + totalDisliked
    };
  };

  const getPreferenceForIngredient = (ingredient: string): 'like' | 'dislike' | 'neutral' => {
    if (!selectedCategory) return 'neutral';
    
    const preference = userPreferences.find(p => 
      p.ingredient === ingredient && p.category === selectedCategory.Kategoriak
    );
    return preference?.preference || 'neutral';
  };

  const getFavoriteForIngredient = (ingredient: string): boolean => {
    if (!selectedCategory) return false;
    
    return userFavorites.some(f => 
      f.ingredient === ingredient && f.category === selectedCategory.Kategoriak
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">ÚJ preferenciák betöltése...</p>
        </div>
      </div>
    );
  }

  const totalStats = getTotalStats();
  const selectedCategoryIngredients = selectedCategory 
    ? categoryIngredients[selectedCategory.Kategoria_ID]?.map(ing => ing.Elelmiszer_nev) || []
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Settings className="w-8 h-8 text-green-400" />
            Ételpreferenciáim (ÚJ rendszer)
          </h1>
        </div>

        {/* Habit settings mirrored from registration/profile */}
        <Card className="bg-white/10 border-white/20 mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-white">Szokások és alapbeállítások</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-white space-y-6">
            <div className="space-y-2">
              <div className="text-sm text-white/80">Napi étkezések száma</div>
              <select
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(Math.max(1, Math.min(5, Number(e.target.value))))}
                className="w-full max-w-xs px-3 py-2 border border-white/20 bg-white/10 text-white rounded-md text-sm"
              >
                <option value={1}>1 étkezés/nap</option>
                <option value={2}>2 étkezés/nap</option>
                <option value={3}>3 étkezés/nap</option>
                <option value={4}>4 étkezés/nap</option>
                <option value={5}>5 étkezés/nap</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-white/80">Szeretnéd, hogy az ebéded és a vacsorád ugyanaz legyen?</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setSameLunchDinner(true)}
                  className={`px-3 py-2 rounded-md border border-white/20 ${sameLunchDinner ? 'bg-emerald-600 text-white' : 'text-white/80 bg-white/10'}`}
                >
                  Igen
                </Button>
                <Button
                  type="button"
                  onClick={() => setSameLunchDinner(false)}
                  className={`px-3 py-2 rounded-md border border-white/20 ${!sameLunchDinner ? 'bg-emerald-600 text-white' : 'text-white/80 bg-white/10'}`}
                >
                  Nem
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-white/80">Hány napig szeretnéd/tudnád ugyanazt enni étkezésenként?</div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/70 mb-1">Reggeli (1–7)</div>
                  <Slider value={repeatTol.breakfast} min={1} max={7} step={1} showValue formatRange={(a,b)=>`${a}–${b}`}
                    onValueChange={(v:any)=>setRepeatTol({ ...repeatTol, breakfast: [v[0], v[1]] as [number,number] })} />
                </div>
                <div>
                  <div className="text-xs text-white/70 mb-1">Tízórai (1–7)</div>
                  <Slider value={repeatTol.tizorai} min={1} max={7} step={1} showValue formatRange={(a,b)=>`${a}–${b}`}
                    onValueChange={(v:any)=>setRepeatTol({ ...repeatTol, tizorai: [v[0], v[1]] as [number,number] })} />
                </div>
                <div>
                  <div className="text-xs text-white/70 mb-1">Ebéd (1–3)</div>
                  <Slider value={repeatTol.lunch} min={1} max={3} step={1} showValue formatRange={(a,b)=>`${a}–${b}`}
                    onValueChange={(v:any)=>setRepeatTol({ ...repeatTol, lunch: [v[0], v[1]] as [number,number] })} />
                </div>
                <div>
                  <div className="text-xs text-white/70 mb-1">Uzsonna (1–7)</div>
                  <Slider value={repeatTol.uzsonna} min={1} max={7} step={1} showValue formatRange={(a,b)=>`${a}–${b}`}
                    onValueChange={(v:any)=>setRepeatTol({ ...repeatTol, uzsonna: [v[0], v[1]] as [number,number] })} />
                </div>
                <div>
                  <div className="text-xs text-white/70 mb-1">Vacsora (1–3)</div>
                  <Slider value={repeatTol.dinner} min={1} max={3} step={1} showValue formatRange={(a,b)=>`${a}–${b}`}
                    onValueChange={(v:any)=>setRepeatTol({ ...repeatTol, dinner: [v[0], v[1]] as [number,number] })} />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={async()=>{
                  setSaving(true);
                  try {
                    await supabase.auth.updateUser({ data: {
                      meals_per_day: mealsPerDay,
                      same_lunch_dinner: sameLunchDinner,
                      repeat_tolerance: {
                        breakfast: { min: repeatTol.breakfast[0], max: repeatTol.breakfast[1] },
                        tizorai: { min: repeatTol.tizorai[0], max: repeatTol.tizorai[1] },
                        lunch: { min: repeatTol.lunch[0], max: repeatTol.lunch[1] },
                        uzsonna: { min: repeatTol.uzsonna[0], max: repeatTol.uzsonna[1] },
                        dinner: { min: repeatTol.dinner[0], max: repeatTol.dinner[1] },
                      }
                    }});
                    toast({ title: 'Szokások elmentve' });
                  } finally { setSaving(false); }
                }}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? 'Mentés...' : 'Beállítások mentése'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-green-600/20 border-green-400/50 text-white">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{totalStats.liked}</div>
              <div className="text-white/80">Kedvelt alapanyag</div>
            </CardContent>
          </Card>
          <Card className="bg-red-600/20 border-red-400/50 text-white">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">{totalStats.disliked}</div>
              <div className="text-white/80">Nem kedvelt alapanyag</div>
            </CardContent>
          </Card>
          <Card className="bg-pink-600/20 border-pink-400/50 text-white">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-pink-400 mb-2">{totalStats.favorites}</div>
              <div className="text-white/80">Kedvenc alapanyag</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-600/20 border-purple-400/50 text-white">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{totalStats.total}</div>
              <div className="text-white/80">Összes beállítás</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Selection */}
        <Card className="bg-white/10 border-white/20 mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Utensils className="w-6 h-6 text-green-400" />
              Ételkategóriák (ÚJ rendszer)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {categories.map((category) => {
                const stats = getStatsForCategory(category);
                const isSelected = selectedCategory?.Kategoria_ID === category.Kategoria_ID;
                
                return (
                  <Button
                    key={category.Kategoria_ID}
                    onClick={() => handleCategorySelect(category)}
                    variant="outline"
                    className={`h-auto p-3 sm:p-4 flex-col gap-2 transition-all duration-200 text-sm sm:text-base ${
                      isSelected
                        ? 'bg-purple-600/30 border-purple-400/50 text-white shadow-lg ring-2 ring-purple-400/50'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="font-medium text-center leading-tight whitespace-normal break-words w-full">
                      {category.Kategoriak}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge className="bg-green-600/30 text-green-400 border-green-400/50 text-xs px-2 py-1">
                        ❤️ {stats.liked}
                      </Badge>
                      <Badge className="bg-red-600/30 text-red-400 border-red-400/50 text-xs px-2 py-1">
                        👎 {stats.disliked}
                      </Badge>
                      <Badge className="bg-pink-600/30 text-pink-400 border-pink-400/50 text-xs px-2 py-1">
                        💖 {stats.favorites}
                      </Badge>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ingredients for Selected Category */}
        {selectedCategory && (
          <div data-scroll-target="category-ingredients">
            <Card className="bg-white/10 border-white/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl text-center">
                  {selectedCategory.Kategoriak} alapanyagai (ÚJ rendszer)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <IngredientsGrid
                  ingredients={selectedCategoryIngredients}
                  categoryName={selectedCategory.Kategoriak}
                  getPreferenceForIngredient={getPreferenceForIngredient}
                  getFavoriteForIngredient={getFavoriteForIngredient}
                  onPreferenceChange={handlePreferenceUpdate}
                  onFavoriteChange={handleFavoriteChange}
                  hideDisliked={false}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}