
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, Heart } from "lucide-react";

interface IngredientCardProps {
  ingredient: string;
  preference: 'like' | 'dislike' | 'neutral';
  favorite: boolean;
  index: number;
  imageUrl?: string;
  onPreferenceChange: (ingredient: string, preference: 'like' | 'dislike' | 'neutral') => void;
  onFavoriteChange: (ingredient: string, isFavorite: boolean) => void;
}

export function IngredientCard({ 
  ingredient, 
  preference, 
  favorite,
  index,
  imageUrl,
  onPreferenceChange,
  onFavoriteChange 
}: IngredientCardProps) {
  const handlePreferenceClick = (newPreference: 'like' | 'dislike') => {
    const currentPreference = preference || 'neutral';
    const finalPreference = currentPreference === newPreference ? 'neutral' : newPreference;
    onPreferenceChange(ingredient, finalPreference);
  };

  const handleFavoriteClick = () => {
    const newFavoriteState = !favorite;
    onFavoriteChange(ingredient, newFavoriteState);
    
    // Ha kedvencnek jelöljük, automatikusan "like" preferencet állítunk
    if (newFavoriteState && preference !== 'like') {
      onPreferenceChange(ingredient, 'like');
    }
  };

  // Használjuk az adatbázisból származó kép URL-t
  const defaultImageUrl = '/placeholder.svg'; // Fallback kép

  // EGYSÉGES vizuális megjelenítés prioritások szerint
  let cardClasses = "relative overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 animate-fadeInUp border-2 ";
  
  if (favorite) {
    // KEDVENC = rózsaszín keret és háttér (LEGMAGASABB PRIORITÁS)
    cardClasses += "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-400 shadow-lg ring-2 ring-pink-300 scale-110";
  } else if (preference === 'like') {
    // SZERETEM = zöld keret és háttér (MÁSODIK PRIORITÁS)
    cardClasses += "bg-gradient-to-br from-green-50 to-emerald-50 border-green-400 shadow-md ring-2 ring-green-200 scale-105";
  } else if (preference === 'dislike') {
    // NEM SZERETEM = piros keret és háttér (de ezek el vannak rejtve)
    cardClasses += "bg-red-50 border-red-300 scale-90 opacity-70 ring-2 ring-red-200";
  } else {
    // SEMLEGES = alapértelmezett megjelenés
    cardClasses += "bg-white border-gray-200 hover:shadow-md hover:border-purple-300";
  }

  return (
    <Card
      className={cardClasses}
      style={{
        animationDelay: `${index * 0.1}s`
      }}
    >
      <div className="p-2 sm:p-3">
        {/* EGYSÉGES kedvenc jelölés - RÓZSASZÍN SZÍV a jobb felső sarokban */}
        {favorite && (
          <div className="absolute top-1 right-1 z-10">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500 fill-pink-500 drop-shadow-sm" />
          </div>
        )}
        
        {/* Ingredient Image */}
        <div className="w-full aspect-square mb-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          <img
            src={imageUrl || defaultImageUrl}
            alt={ingredient}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              console.log('❌ Kép betöltési hiba:', ingredient);
              (e.target as HTMLImageElement).src = defaultImageUrl;
            }}
          />
        </div>
        
        {/* Ingredient Name */}
        <h3 className="text-xs sm:text-sm font-semibold text-gray-800 text-center mb-3 leading-tight break-words hyphens-auto px-1 min-h-[2rem] sm:min-h-[2.5rem] flex items-center justify-center">
          {ingredient}
        </h3>
        
        {/* Preference and Favorite Buttons - MOBIL OPTIMALIZÁLT */}
        <div className="flex justify-center gap-2 sm:gap-1">
          <Button
            onClick={() => handlePreferenceClick('like')}
            variant={preference === 'like' ? 'default' : 'outline'}
            size="sm"
            className={`
              w-8 h-8 sm:w-6 sm:h-6 p-0 transition-all duration-200 rounded-md sm:rounded-sm
              ${preference === 'like' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg' 
                : 'hover:bg-green-50 hover:border-green-300 hover:text-green-600'
              }
            `}
          >
            <ThumbsUp className="w-4 h-4 sm:w-3 sm:h-3" />
          </Button>
          
          <Button
            onClick={() => handlePreferenceClick('dislike')}
            variant={preference === 'dislike' ? 'default' : 'outline'}
            size="sm"
            className={`
              w-8 h-8 sm:w-6 sm:h-6 p-0 transition-all duration-200 rounded-md sm:rounded-sm
              ${preference === 'dislike' 
                ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg' 
                : 'hover:bg-red-50 hover:border-red-300 hover:text-red-600'
              }
            `}
          >
            <ThumbsDown className="w-4 h-4 sm:w-3 sm:h-3" />
          </Button>
          
          <Button
            onClick={handleFavoriteClick}
            variant={favorite ? 'default' : 'outline'}
            size="sm"
            className={`
              w-8 h-8 sm:w-6 sm:h-6 p-0 transition-all duration-200 rounded-md sm:rounded-sm border-2
              ${favorite 
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg border-pink-400' 
                : 'hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600 border-pink-200'
              }
            `}
          >
            <Heart className={`w-4 h-4 sm:w-3 sm:h-3 ${favorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
