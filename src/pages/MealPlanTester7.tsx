import { useEffect, useState } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useMultiDayPlanGeneration } from '@/hooks/useMultiDayPlanGeneration';
import { DayNav } from '@/components/food-planner/ui/DayNav';
import { MacroBadge } from '@/components/food-planner/ui/MacroBadge';
import { ScaledIngredientsTable } from '@/components/food-planner/ui/ScaledIngredientsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function MealPlanTester7() {
  const navigate = useNavigate();
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['reggeli', 'ebéd', 'vacsora']);
  const [mealPlan, setMealPlan] = useState<any[]>([]);
  const { getRecipesByMealType, convertToStandardRecipe } = useSupabaseData('tester');
  const { multiDayPlan, generateMultiDayPlan, setMultiDayPlan, isGenerating } = useMultiDayPlanGeneration({ getRecipesByMealType, convertToStandardRecipe });

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const mpd = Number(user?.user_metadata?.meals_per_day);
        const map: Record<number, string[]> = { 1: ['ebéd'], 2: ['ebéd','vacsora'], 3: ['reggeli','ebéd','vacsora'], 4: ['reggeli','tízórai','ebéd','vacsora'], 5: ['reggeli','tízórai','ebéd','uzsonna','vacsora'] };
        setSelectedMeals(map[mpd] || map[3]);
      } catch {}
    })();
  }, []);

  const handleGenerate = async () => {
    setCurrentDayIndex(0);
    await generateMultiDayPlan(7, selectedMeals, {});
  };

  useEffect(() => { setMealPlan(multiDayPlan); }, [multiDayPlan]);

  const day = mealPlan[currentDayIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-xl">7 napos Meal Plan Tester</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 items-center">
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              {isGenerating ? 'Generálás...' : 'Generálj 7 napot'}
            </Button>
            <Button onClick={() => navigate('/meal-plan-test')} variant="outline" className="border-white/30 text-white/90">
              Megnyitás: Klasszikus Meal Plan Tester
            </Button>
          </CardContent>
        </Card>

        {mealPlan.length > 0 && (
          <DayNav
            date={day?.date || ''}
            canPrev={currentDayIndex > 0}
            canNext={currentDayIndex < mealPlan.length - 1}
            onPrev={() => setCurrentDayIndex(i => Math.max(0, i - 1))}
            onNext={() => setCurrentDayIndex(i => Math.min(mealPlan.length - 1, i + 1))}
          />
        )}

        {day && (
          <div className="space-y-6">
            {Object.entries(day.meals).map(([mealType, recipe]: any) => (
              <Card key={mealType} className="bg-white/10 border-white/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white capitalize">{mealType}</CardTitle>
                  {recipe && (
                    <MacroBadge p={recipe?.scalingResult?.scaledMacros?.protein || 0} c={recipe?.scalingResult?.scaledMacros?.carbs || 0} f={recipe?.scalingResult?.scaledMacros?.fat || 0} kcal={recipe?.scalingResult?.scaledMacros?.calories || 0} />
                  )}
                </CardHeader>
                <CardContent>
                  {recipe ? (
                    <ScaledIngredientsTable rows={(recipe.scalingResult?.scaledIngredients || []).map((ing:any)=>{
                      const p100 = ing.p100 ?? 0;
                      const c100 = ing.c100 ?? 0;
                      const f100 = ing.f100 ?? 0;
                      const k100 = ing.k100 ?? 0;
                      const qty = Number(ing.Mennyiség) || 0;
                      return {
                        ...ing,
                        p: qty * p100 / 100,
                        c: qty * c100 / 100,
                        f: qty * f100 / 100,
                        kcal: qty * k100 / 100,
                      };
                    })} />
                  ) : (
                    <div className="text-white/60 text-sm">Nincs recept</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {mealPlan.length > 0 && (
          <details className="bg-white/10 border border-white/20 rounded-lg p-4 text-white/80">
            <summary className="cursor-pointer">Debug JSON</summary>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(mealPlan, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}


