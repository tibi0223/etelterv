
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Heart } from "lucide-react";
import { getFavorites, removeFromFavorites } from "@/services/favoritesQueries";
import { Recipe } from "@/types/recipe";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface FavoritesPageProps {
  user: any;
  onClose: () => void;
}

export function FavoritesPage({ user, onClose }: FavoritesPageProps) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFavorites();
  }, [user.id]);

  const loadFavorites = async () => {
    try {
      const data = await getFavorites(user.id);
      setFavorites(data || []);
    } catch (error) {
      console.error('Kedvencek betöltési hiba:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a kedvenceket.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFavorites = async (recipeName: string) => {
    try {
      await removeFromFavorites(user.id, recipeName);
      setFavorites(favorites.filter(fav => fav.recipe_name !== recipeName));
      toast({
        title: "Eltávolítva!",
        description: "A recept eltávolítva a kedvencekből.",
      });
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült eltávolítani a receptet.",
        variant: "destructive"
      });
    }
  };

  const openRecipeModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeRecipeModal = () => {
    setSelectedRecipe(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Kedvencek betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Content */}
      <div>
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 sm:p-12 border border-white/20 shadow-2xl max-w-md mx-auto">
              <Star className="w-20 h-20 text-yellow-400/60 mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Még nincsenek kedvenceid
              </h2>
              <p className="text-white/70 text-lg leading-relaxed">
                Adj hozzá recepteket a kedvenceidhez a szívecske gombbal!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header with count */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2">
                ⭐ Kedvenc Receptek
              </h2>
              <p className="text-white/70 text-lg">
                {favorites.length} kedvenc recept
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group border border-white/20"
                >
                  {/* Kép */}
                  <div 
                    className="relative h-48 overflow-hidden"
                    onClick={() => openRecipeModal(favorite.recipe_data)}
                  >
                    {favorite.recipe_data.képUrl ? (
                      <img
                        src={favorite.recipe_data.képUrl}
                        alt={favorite.recipe_data.név}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}
                    
                    {/* Kedvenc törlés gomb */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromFavorites(favorite.recipe_name);
                      }}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Tartalom */}
                  <div className="p-4">
                    <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">
                      {favorite.recipe_data.név}
                    </h3>
                    
                    {/* Infók */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {favorite.recipe_data.elkészítésiIdő && (
                        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                          ⏱️ {favorite.recipe_data.elkészítésiIdő}
                        </span>
                      )}
                      <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                        📝 {favorite.recipe_data.hozzávalók?.length || 0} hozzávaló
                      </span>
                    </div>

                    {/* Tápértékek */}
                    {(favorite.recipe_data.fehérje || favorite.recipe_data.szénhidrát || favorite.recipe_data.zsír) && (
                      <div className="grid grid-cols-3 gap-1 text-center">
                        {favorite.recipe_data.fehérje && (
                          <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-xs text-white/80">🥩</div>
                            <div className="text-xs text-white font-semibold">{favorite.recipe_data.fehérje}g</div>
                          </div>
                        )}
                        {favorite.recipe_data.szénhidrát && (
                          <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-xs text-white/80">🍞</div>
                            <div className="text-xs text-white font-semibold">{favorite.recipe_data.szénhidrát}g</div>
                          </div>
                        )}
                        {favorite.recipe_data.zsír && (
                          <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-xs text-white/80">🥑</div>
                            <div className="text-xs text-white font-semibold">{favorite.recipe_data.zsír}g</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Teljes képernyős recept modal */}
      {selectedRecipe && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={closeRecipeModal}
        >
          <div className="relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-scale-in">
            <button
              onClick={closeRecipeModal}
              className="absolute -top-8 sm:-top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            
            <div className="bg-gradient-to-br from-indigo-600/90 to-purple-700/90 backdrop-blur-sm rounded-2xl p-4 sm:p-8 text-white shadow-2xl border border-white/20">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6 px-2">🍽️ {selectedRecipe.név}</h2>
                
                {selectedRecipe.képUrl && (
                  <div className="mb-6 sm:mb-8">
                    <img 
                      src={selectedRecipe.képUrl} 
                      alt={selectedRecipe.név}
                      className="max-w-full max-h-60 sm:max-h-80 mx-auto rounded-2xl shadow-2xl border-4 border-white/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                    📝 Hozzávalók ({selectedRecipe.hozzávalók?.length || 0} db)
                  </h3>
                  <ul className="text-white/90 space-y-2 sm:space-y-3">
                    {selectedRecipe.hozzávalók?.map((ingredient, index) => (
                      <li key={index} className="flex items-start bg-white/5 p-2 sm:p-3 rounded-lg">
                        <span className="text-green-400 mr-2 sm:mr-3 font-bold text-base sm:text-lg">•</span>
                        <span className="text-sm sm:text-lg">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                    👨‍🍳 Elkészítés
                  </h3>
                  <div 
                    className="text-white/90 leading-relaxed text-sm sm:text-lg"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedRecipe.elkészítés?.replace(/(\d+\.\s)/g, '<br><strong class="text-yellow-300">$1</strong>') || '' 
                    }}
                  />
                </div>
              </div>

              {(selectedRecipe.elkészítésiIdő || selectedRecipe.fehérje || selectedRecipe.szénhidrát || selectedRecipe.zsír) && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">📊 Tápértékek</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                    {selectedRecipe.elkészítésiIdő && (
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-blue-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">⏱️</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.elkészítésiIdő}</div>
                      </div>
                    )}
                    {selectedRecipe.fehérje && (
                      <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-red-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🥩</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.fehérje}g fehérje</div>
                      </div>
                    )}
                    {selectedRecipe.szénhidrát && (
                      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-yellow-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🍞</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.szénhidrát}g szénhidrát</div>
                      </div>
                    )}
                    {selectedRecipe.zsír && (
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-green-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🥑</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.zsír}g zsír</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="text-center mt-6 sm:mt-8">
                <p className="text-white/70 text-sm sm:text-lg">Kattints bárhova a bezáráshoz</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
