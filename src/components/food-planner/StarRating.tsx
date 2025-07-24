
import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  recipeName: string;
  onRate?: (rating: number) => void;
  className?: string;
}

export function StarRating({ recipeName, onRate, className }: StarRatingProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
    onRate?.(starRating);
  };

  const handleStarHover = (starRating: number) => {
    setHoverRating(starRating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  return (
    <div className={cn("flex justify-center gap-1", className)} onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={cn(
            "text-2xl transition-all duration-200 cursor-pointer hover:scale-110",
            (hoverRating >= star || (hoverRating === 0 && rating >= star))
              ? "text-yellow-400 filter-none opacity-100"
              : "text-gray-400 filter grayscale opacity-60"
          )}
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => handleStarHover(star)}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}
