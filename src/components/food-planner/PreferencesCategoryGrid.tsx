
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface PreferencesCategoryGridProps {
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export function PreferencesCategoryGrid({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: PreferencesCategoryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {categories.map((category) => (
        <Card
          key={category}
          className={`
            p-4 cursor-pointer transition-all duration-300 border-2
            ${selectedCategory === category
              ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-400/50 shadow-lg transform scale-105'
              : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 hover:shadow-md'
            }
          `}
          onClick={() => onCategorySelect(category)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {category}
            </h3>
            <ChevronRight 
              className={`
                h-5 w-5 transition-transform duration-200
                ${selectedCategory === category ? 'rotate-90 text-purple-400' : 'text-white/60'}
              `} 
            />
          </div>
          <p className="text-white/70 text-sm mt-2">
            Kattints a kategória alapanyagainak megtekintéséhez
          </p>
        </Card>
      ))}
    </div>
  );
}
