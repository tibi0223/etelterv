
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft, Heart, Zap, Shield } from "lucide-react";
import { saveUserHealthConditions } from "@/services/healthConditionsQueries";

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface HealthConditionsSetupProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
}

type ConditionType = 'PCOS' | 'IR' | 'HASHIMOTO';

export function HealthConditionsSetup({ user, onComplete, onBack }: HealthConditionsSetupProps) {
  const [selectedConditions, setSelectedConditions] = useState<ConditionType[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const conditions = [
    {
      type: 'PCOS' as ConditionType,
      name: 'PCOS',
      description: 'Policisztás petefészek szindróma',
      icon: Heart,
      color: 'from-pink-500 to-rose-600'
    },
    {
      type: 'IR' as ConditionType,
      name: 'Inzulinrezisztencia',
      description: 'Inzulinrezisztencia',
      icon: Zap,
      color: 'from-yellow-500 to-orange-600'
    },
    {
      type: 'HASHIMOTO' as ConditionType,
      name: 'Hashimoto',
      description: 'Hashimoto pajzsmirigy betegség',
      icon: Shield,
      color: 'from-blue-500 to-indigo-600'
    }
  ];

  const handleConditionToggle = (conditionType: ConditionType) => {
    setSelectedConditions(prev => 
      prev.includes(conditionType)
        ? prev.filter(c => c !== conditionType)
        : [...prev, conditionType]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveUserHealthConditions(user.id, selectedConditions);
      
      toast({
        title: "Egészségügyi állapotok mentve! ✅",
        description: "Sikeresen elmentettük az egészségügyi állapotaidat!",
      });
      
      onComplete();
    } catch (error) {
      console.error('Egészségügyi állapotok mentési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült menteni az egészségügyi állapotokat.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-center text-white">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Egészségügyi Állapotok</h1>
            </div>
            <p className="text-sm sm:text-base text-white/80">
              Jelöld meg, ha van valamilyen hormonális problémád
            </p>
            <p className="text-xs sm:text-sm text-white/60 mt-2">
              Ezt az információt arra használjuk, hogy személyre szabott recepteket ajánljunk
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
          {/* Instructions */}
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
              Válaszd ki a rád vonatkozó állapotokat
            </h2>
            <p className="text-gray-600">
              Ha nincs ilyen problémád, nyugodtan lépj tovább a beállítás kihagyásával
            </p>
          </div>

          {/* Conditions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {conditions.map((condition) => {
              const isSelected = selectedConditions.includes(condition.type);
              const IconComponent = condition.icon;
              
              return (
                <Card
                  key={condition.type}
                  className={`
                    relative overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 border-2 p-6
                    ${isSelected 
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 scale-105 shadow-lg ring-2 ring-blue-200' 
                      : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-300'
                    }
                  `}
                  onClick={() => handleConditionToggle(condition.type)}
                >
                  <div className="text-center">
                    {/* Icon */}
                    <div className={`
                      w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
                      bg-gradient-to-br ${condition.color} shadow-lg
                    `}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {condition.name}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4">
                      {condition.description}
                    </p>
                    
                    {/* Selection Indicator */}
                    <div className={`
                      w-6 h-6 mx-auto rounded-full border-2 transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-gray-300'
                      }
                    `}>
                      {isSelected && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
              Vissza
            </Button>

            <Button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Mentés...
                </>
              ) : (
                <>
                  Tovább
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Selected Count */}
          {selectedConditions.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                {selectedConditions.length} állapot kiválasztva
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
