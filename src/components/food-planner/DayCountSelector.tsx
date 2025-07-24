
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Minus, Plus } from "lucide-react";

interface DayCountSelectorProps {
  selectedDays: number;
  onDaysChange: (days: number) => void;
}

export function DayCountSelector({ selectedDays, onDaysChange }: DayCountSelectorProps) {
  const [inputValue, setInputValue] = useState(selectedDays.toString());

  const quickOptions = [3, 5, 7];

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 7) {
      onDaysChange(numValue);
    }
  };

  const handleIncrement = () => {
    if (selectedDays < 7) {
      const newValue = selectedDays + 1;
      onDaysChange(newValue);
      setInputValue(newValue.toString());
    }
  };

  const handleDecrement = () => {
    if (selectedDays > 1) {
      const newValue = selectedDays - 1;
      onDaysChange(newValue);
      setInputValue(newValue.toString());
    }
  };

  const handleQuickSelect = (days: number) => {
    onDaysChange(days);
    setInputValue(days.toString());
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-green-400" />
          Többnapos Étrendtervező
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-white/80 mb-4">Válaszd ki, hány napra szeretnél étrendet:</p>
            
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {quickOptions.map((days) => (
                <Button
                  key={days}
                  onClick={() => handleQuickSelect(days)}
                  variant="outline"
                  size="sm"
                  className={`px-3 py-2 text-sm transition-all duration-200 ${
                    selectedDays === days
                      ? 'bg-green-600/30 border-green-400/50 text-white shadow-lg scale-105'
                      : 'bg-white/5 border-white/20 text-white hover:bg-white/15 hover:border-white/40'
                  }`}
                >
                  {days} nap
                </Button>
              ))}
            </div>

            {/* Custom Input with +/- Buttons */}
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={handleDecrement}
                variant="outline"
                size="sm"
                disabled={selectedDays <= 1}
                className="bg-white/5 border-white/20 text-white hover:bg-white/15 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed w-10 h-10 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="w-20 text-center bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-green-400/50 focus:bg-white/15"
                />
                <span className="text-white/80 text-sm">nap</span>
              </div>

              <Button
                onClick={handleIncrement}
                variant="outline"
                size="sm"
                disabled={selectedDays >= 7}
                className="bg-white/5 border-white/20 text-white hover:bg-white/15 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed w-10 h-10 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-white/60 text-xs mt-2">
              1-7 nap között választhatsz (max 1 hét)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
