import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Scale, Ruler, Activity } from "lucide-react";

interface PersonalInfoSetupProps {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  onComplete: () => void;
}

export function PersonalInfoSetup({ user, onComplete }: PersonalInfoSetupProps) {
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateForm = () => {
    return !(!age || !weight || !height || !activityLevel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          age: parseInt(age),
          weight: parseFloat(weight),
          height: parseFloat(height),
          activity_level: activityLevel,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Személyes adatok mentve! ✅",
        description: "Sikeresen elmentettük a személyes adataidat!"
      });

      // Most az egészségügyi állapotok beállítására navigálunk
      onComplete();
    } catch (error) {
      console.error('Személyes adatok mentési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült menteni a személyes adatokat.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Személyes Adatok
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Add meg az alapvető adataidat a személyre szabott ételtervezéshez
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Életkor (év)
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="pl. 30"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  min="18"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Testsúly (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="pl. 70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  min="30"
                  max="300"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Magasság (cm)
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="pl. 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="h-12 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  min="120"
                  max="250"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Aktivitási szint
                </Label>
                <Select value={activityLevel} onValueChange={setActivityLevel}>
                  <SelectTrigger className="h-12 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200">
                    <SelectValue placeholder="Válassz aktivitási szintet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Ülő életmód (kevés mozgás)</SelectItem>
                    <SelectItem value="lightly_active">Kissé aktív (1-3 nap/hét edzés)</SelectItem>
                    <SelectItem value="moderately_active">Közepesen aktív (3-5 nap/hét edzés)</SelectItem>
                    <SelectItem value="very_active">Nagyon aktív (6-7 nap/hét edzés)</SelectItem>
                    <SelectItem value="extremely_active">Rendkívül aktív (napi 2x edzés)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-6">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !age || !weight || !height || !activityLevel}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {isLoading ? "Mentés..." : "Tovább az ételpreferenciákhoz"}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Ezek az adatok segítenek személyre szabott recepteket ajánlani
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
