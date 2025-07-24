
import { ChefHat } from "lucide-react";

interface PreferenceHeaderProps {
  currentCategoryIndex: number;
  totalCategories: number;
  onShowInfo: () => void;
}

export function PreferenceHeader({ 
  currentCategoryIndex, 
  totalCategories, 
  onShowInfo 
}: PreferenceHeaderProps) {
  const progress = ((currentCategoryIndex + 1) / totalCategories) * 100;

  return (
    <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Ételpreferenciák Beállítása</h1>
          </div>
          <p className="text-sm sm:text-base text-white/80">
            Állítsd be az ételpreferenciáidat a személyre szabott receptajánlásokhoz!
          </p>
          <p className="text-xs text-white/60 mt-1">
            <strong>Fontos:</strong> Legalább egy preferenciát be kell jelölnöd a folytatáshoz.
          </p>
          <button
            onClick={onShowInfo}
            className="mt-2 text-xs text-blue-300 hover:text-blue-200 underline"
          >
            Segítség a beállításokhoz
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6 bg-white/10 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center text-white/80 text-sm mt-2 font-medium">
          {currentCategoryIndex + 1} / {totalCategories} kategória
        </div>
      </div>
    </div>
  );
}
