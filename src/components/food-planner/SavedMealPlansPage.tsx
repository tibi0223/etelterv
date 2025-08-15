import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, Trash2, Save, Eye, ChefHat, Calculator, Scale } from 'lucide-react';
import { fetchSavedMealPlans, deleteSavedMealPlan, SavedMealPlan } from '@/services/savedMealPlansQueries';
import { SavedMealPlanModal } from './SavedMealPlanModal';

interface SavedMealPlansPageProps {
  user: any;
  onBack: () => void;
}

export function SavedMealPlansPage({ user, onBack }: SavedMealPlansPageProps) {
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    try {
      setLoading(true);
      const plans = await fetchSavedMealPlans(user.id);
      setSavedPlans(plans);
    } catch (error) {
      console.error('Mentett étrendek betöltési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült betölteni a mentett étrendeket.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const success = await deleteSavedMealPlan(planId);
      if (success) {
        setSavedPlans(prev => prev.filter(plan => plan.id !== planId));
        toast({
          title: "Étrend törölve",
          description: "A mentett étrend sikeresen törölve lett."
        });
      } else {
        toast({
          title: "Hiba történt",
          description: "Nem sikerült törölni az étrendet.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Étrend törlési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült törölni az étrendet.",
        variant: "destructive"
      });
    }
  };

  const handleViewPlan = (plan: SavedMealPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalCalories = (plan: SavedMealPlan) => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.calories || 0);
    }, 0);
  };

  const getTotalProtein = (plan: SavedMealPlan) => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.protein || 0);
    }, 0);
  };

  const getTotalCarbs = (plan: SavedMealPlan) => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.carbs || 0);
    }, 0);
  };

  const getTotalFat = (plan: SavedMealPlan) => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.fat || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={onBack} className="text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza
            </Button>
            <h1 className="text-2xl font-bold">Mentett Étrendek</h1>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Betöltés...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vissza
          </Button>
          <h1 className="text-2xl font-bold">Mentett Étrendek</h1>
        </div>

        {savedPlans.length === 0 ? (
          <div className="text-center py-12">
            <Save className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nincsenek mentett étrendek</h2>
            <p className="text-gray-400">
              Még nem mentettél el étrendet. Generálj egy étrendet a makró skálázóban és mentsd el!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedPlans.map((plan) => (
              <Card key={plan.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white mb-2">{plan.plan_name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(plan.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <ChefHat className="h-4 w-4" />
                        <span>{plan.plan_data.scaledMeals.length} étkezés</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* Makró összefoglaló */}
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-semibold">Összesített makrók</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Kalória:</span>
                          <span className="text-white">{Math.round(getTotalCalories(plan))} kcal</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fehérje:</span>
                          <span className="text-white">{Math.round(getTotalProtein(plan))}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Szénhidrát:</span>
                          <span className="text-white">{Math.round(getTotalCarbs(plan))}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Zsír:</span>
                          <span className="text-white">{Math.round(getTotalFat(plan))}g</span>
                        </div>
                      </div>
                    </div>

                    {/* Cél makrók */}
                    <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-semibold">Cél makrók</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-300">Kalória:</span>
                          <span className="text-blue-200">{plan.target_macros.calories} kcal</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">Fehérje:</span>
                          <span className="text-blue-200">{plan.target_macros.protein}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">Szénhidrát:</span>
                          <span className="text-blue-200">{plan.target_macros.carbs}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">Zsír:</span>
                          <span className="text-blue-200">{plan.target_macros.fat}g</span>
                        </div>
                      </div>
                    </div>

                    {/* Étrendek listája */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <ChefHat className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-semibold">Étrendek</span>
                      </div>
                      {plan.plan_data.scaledMeals.map((meal, index) => (
                        <div key={index} className="text-xs text-gray-300 flex justify-between items-center">
                          <span>{meal.mealType} - {meal.recipe.név}</span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(meal.scalingResult.scaledMacros?.calories || 0)} kcal
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Műveletek */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleViewPlan(plan)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Megtekintés
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recept Modal */}
      {selectedPlan && (
        <SavedMealPlanModal
          plan={selectedPlan}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
} 