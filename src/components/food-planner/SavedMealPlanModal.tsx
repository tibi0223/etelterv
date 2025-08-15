import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChefHat, Calculator, Scale, Info, Clock, Users, Calendar } from 'lucide-react';
import { SavedMealPlan } from '@/services/savedMealPlansQueries';

interface SavedMealPlanModalProps {
  plan: SavedMealPlan;
  isOpen: boolean;
  onClose: () => void;
}

export function SavedMealPlanModal({ plan, isOpen, onClose }: SavedMealPlanModalProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

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

  const getTotalCalories = () => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.calories || 0);
    }, 0);
  };

  const getTotalProtein = () => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.protein || 0);
    }, 0);
  };

  const getTotalCarbs = () => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.carbs || 0);
    }, 0);
  };

  const getTotalFat = () => {
    return plan.plan_data.scaledMeals.reduce((total, meal) => {
      return total + (meal.scalingResult.scaledMacros?.fat || 0);
    }, 0);
  };

  const handleRecipeClick = (meal: any) => {
    setSelectedRecipe({
      ...meal.recipe,
      scalingResult: meal.scalingResult
    });
    setIsRecipeModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-orange-400" />
                {plan.plan_name}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-white">
            {/* Étrend információk */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-300" />
                  <span className="font-semibold">Létrehozva</span>
                </div>
                <div className="text-sm text-blue-200">
                  {formatDate(plan.created_at)}
                </div>
              </div>
              
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <ChefHat className="h-4 w-4 text-green-300" />
                  <span className="font-semibold">Étkezések</span>
                </div>
                <div className="text-sm text-green-200">
                  {plan.plan_data.scaledMeals.length} db
                </div>
              </div>
              
              <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-purple-300" />
                  <span className="font-semibold">Össz. Kalória</span>
                </div>
                <div className="text-sm text-purple-200">
                  {Math.round(getTotalCalories())} kcal
                </div>
              </div>
              
              <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="h-4 w-4 text-orange-300" />
                  <span className="font-semibold">Skálázás</span>
                </div>
                <div className="text-sm text-orange-200">
                  {plan.plan_data.success ? 'Sikeres' : 'Sikertelen'}
                </div>
              </div>
            </div>

            {/* Makró összehasonlítás */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-green-400" />
                  Összesített Makrók
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Kalória:</span>
                    <span className="text-white font-semibold">{Math.round(getTotalCalories())} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Fehérje:</span>
                    <span className="text-white font-semibold">{Math.round(getTotalProtein())}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Szénhidrát:</span>
                    <span className="text-white font-semibold">{Math.round(getTotalCarbs())}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Zsír:</span>
                    <span className="text-white font-semibold">{Math.round(getTotalFat())}g</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/20 rounded-lg p-6 border border-blue-500/30">
                <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-400" />
                  Cél Makrók
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-300">Kalória:</span>
                    <span className="text-blue-200 font-semibold">{plan.target_macros.calories} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-300">Fehérje:</span>
                    <span className="text-blue-200 font-semibold">{plan.target_macros.protein}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-300">Szénhidrát:</span>
                    <span className="text-blue-200 font-semibold">{plan.target_macros.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-300">Zsír:</span>
                    <span className="text-blue-200 font-semibold">{plan.target_macros.fat}g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Étrendek részletes listája */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-orange-400" />
                Étrendek Részletei
              </h3>
              <div className="space-y-4">
                {plan.plan_data.scaledMeals.map((meal, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">
                          {meal.mealType} - {meal.recipe.név}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Nincs megadva</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>Nincs megadva</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRecipeClick(meal)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Info className="h-4 w-4 mr-2" />
                        Részletek
                      </Button>
                    </div>

                    {/* Recept kép */}
                    {meal.recipe.kép && (
                      <div className="mb-3">
                        <img
                          src={meal.recipe.kép}
                          alt={meal.recipe.név}
                          className="w-24 h-24 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully:', meal.recipe.kép);
                          }}
                        />
                      </div>
                    )}

                    {/* Makró információk */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-green-500/20 rounded p-2 border border-green-500/30">
                        <div className="text-xs text-green-300">Kalória</div>
                        <div className="text-sm font-semibold text-green-200">
                          {Math.round(meal.scalingResult.scaledMacros?.calories || 0)} kcal
                        </div>
                      </div>
                      <div className="bg-blue-500/20 rounded p-2 border border-blue-500/30">
                        <div className="text-xs text-blue-300">Fehérje</div>
                        <div className="text-sm font-semibold text-blue-200">
                          {Math.round(meal.scalingResult.scaledMacros?.protein || 0)}g
                        </div>
                      </div>
                      <div className="bg-yellow-500/20 rounded p-2 border border-yellow-500/30">
                        <div className="text-xs text-yellow-300">Szénhidrát</div>
                        <div className="text-sm font-semibold text-yellow-200">
                          {Math.round(meal.scalingResult.scaledMacros?.carbs || 0)}g
                        </div>
                      </div>
                      <div className="bg-red-500/20 rounded p-2 border border-red-500/30">
                        <div className="text-xs text-red-300">Zsír</div>
                        <div className="text-sm font-semibold text-red-200">
                          {Math.round(meal.scalingResult.scaledMacros?.fat || 0)}g
                        </div>
                      </div>
                    </div>

                    {/* Skálázási információk */}
                    <div className="mt-3 text-xs text-gray-400">
                      <strong>Skálázási mód:</strong> {meal.recipe.Recept_Skálázhatóság} | 
                      <strong> Üzenet:</strong> {meal.scalingResult.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recept Modal */}
      {selectedRecipe && (
        <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-orange-400" />
                  {selectedRecipe.név}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="text-white hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 text-white">
              {/* Recept kép */}
              {selectedRecipe.kép && (
                <div className="w-full max-w-md mx-auto">
                  <img
                    src={selectedRecipe.kép}
                    alt={selectedRecipe.név}
                    className="w-full h-64 object-cover rounded-lg shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('Recipe modal image loaded successfully:', selectedRecipe.kép);
                    }}
                  />
                </div>
              )}

              {/* Recept információk */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-300" />
                    <span className="font-semibold">Elkészítési idő</span>
                  </div>
                  <div className="text-sm text-blue-200">
                    {selectedRecipe.elkészítési_idő || 'Nincs megadva'}
                  </div>
                </div>
                
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-green-300" />
                    <span className="font-semibold">Adagok száma</span>
                  </div>
                  <div className="text-sm text-green-200">
                    {selectedRecipe.adagok_száma || 'Nincs megadva'}
                  </div>
                </div>
                
                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4 text-purple-300" />
                    <span className="font-semibold">Skálázhatóság</span>
                  </div>
                  <div className="text-sm text-purple-200">
                    {selectedRecipe.Recept_Skálázhatóság || 'Nincs megadva'}
                  </div>
                </div>
              </div>

              {/* Eredeti hozzávalók */}
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-400" />
                    Eredeti hozzávalók
                  </h3>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-white/10">
                        <span className="text-white/90">{ingredient['Élelmiszerek']}</span>
                        <span className="text-white/70">
                          {ingredient.Mennyiség} {ingredient['Mértékegység']}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skálázott hozzávalók */}
              {selectedRecipe.scalingResult && selectedRecipe.scalingResult.scaledIngredients && (
                <div className="bg-green-500/20 rounded-lg p-6 border border-green-500/30">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <Scale className="h-5 w-5 text-green-400" />
                    Skálázott hozzávalók
                  </h3>
                  <div className="space-y-2">
                    {selectedRecipe.scalingResult.scaledIngredients.map((ingredient: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-green-500/20">
                        <span className="text-white/90">{ingredient['Élelmiszerek']}</span>
                        <span className="text-green-300 font-semibold">
                          {ingredient.Mennyiség} {ingredient['Mértékegység']}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-green-200">
                    <strong>Skálázási mód:</strong> {selectedRecipe.Recept_Skálázhatóság}<br />
                    <strong>Skálázási üzenet:</strong> {selectedRecipe.scalingResult.message}
                  </div>
                </div>
              )}

              {/* Elkészítés */}
              {selectedRecipe.elkészítés && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-400" />
                    Elkészítés
                  </h3>
                  <div className="text-white/90 whitespace-pre-wrap">
                    {selectedRecipe.elkészítés}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 