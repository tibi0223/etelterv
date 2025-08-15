import { Button } from "@/components/ui/button";

interface DayNavProps {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  light?: boolean; // világos hátterű oldalakra
}

export function DayNav({ date, onPrev, onNext, canPrev = true, canNext = true, light = false }: DayNavProps) {
  const btnClasses = light
    ? "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 hover:border-gray-400 disabled:opacity-40"
    : "bg-white/5 border-white/20 text-white hover:bg-white/15 hover:border-white/40 disabled:opacity-40";
  const dateClasses = light ? "text-gray-800 text-sm" : "text-white/90 text-sm";
  return (
    <div className="flex items-center justify-center gap-3 mb-3">
      <Button
        variant="outline"
        size="sm"
        disabled={!canPrev}
        onClick={onPrev}
        className={btnClasses}
      >
        ◀ Előző nap
      </Button>
      <div className={dateClasses}>{date}</div>
      <Button
        variant="outline"
        size="sm"
        disabled={!canNext}
        onClick={onNext}
        className={btnClasses}
      >
        Következő nap ▶
      </Button>
    </div>
  );
}


