
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { addToFavorites, removeFromFavorites, isFavorite } from "@/services/favoritesQueries";
import { Recipe } from "@/types/recipe";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  user: any;
  recipe: Recipe;
}

export function FavoriteButton({ user, recipe }: FavoriteButtonProps) {
  const [isInFavorites, setIsInFavorites] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkFavoriteStatus();
  }, [recipe.név, user.id]);

  const checkFavoriteStatus = async () => {
    try {
      const status = await isFavorite(user.id, recipe.név);
      setIsInFavorites(status);
    } catch (error) {
      console.error('Kedvenc státusz ellenőrzési hiba:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      if (isInFavorites) {
        await removeFromFavorites(user.id, recipe.név);
        setIsInFavorites(false);
        toast({
          title: "Eltávolítva!",
          description: "A recept eltávolítva a kedvencekből.",
        });
      } else {
        await addToFavorites(user.id, recipe);
        setIsInFavorites(true);
        toast({
          title: "Hozzáadva!",
          description: "A recept hozzáadva a kedvencekhez.",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: isInFavorites ? "Nem sikerült eltávolítani a receptet." : "Nem sikerült hozzáadni a receptet.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`${
        isInFavorites 
          ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700" 
          : "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700"
      } text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base flex items-center gap-2`}
    >
      <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-current' : ''}`} />
      {isInFavorites ? 'Kedvencekből eltávolítás' : 'Kedvencekhez adom'}
    </Button>
  );
}
