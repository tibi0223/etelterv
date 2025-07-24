
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PreferenceNavigationProps {
  currentCategoryIndex: number;
  totalCategories: number;
  isLastCategory: boolean;
  saving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export function PreferenceNavigation({
  currentCategoryIndex,
  totalCategories,
  isLastCategory,
  saving,
  onPrev,
  onNext,
  onFinish
}: PreferenceNavigationProps) {
  return (
    <>
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          onClick={onPrev}
          disabled={currentCategoryIndex === 0}
          variant="outline"
          className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Előző
        </Button>

        {isLastCategory ? (
          <Button
            onClick={onFinish}
            disabled={saving}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Mentés...
              </>
            ) : (
              <>
                Befejezés ✅
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Következő
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="mt-6 flex justify-center">
        <div className="flex gap-2">
          {Array.from({ length: totalCategories }, (_, index) => (
            <div
              key={index}
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${index === currentCategoryIndex 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 scale-125' 
                  : index < currentCategoryIndex 
                    ? 'bg-green-400' 
                    : 'bg-gray-300'
                }
              `}
            />
          ))}
        </div>
      </div>
    </>
  );
}
