import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayNav } from '@/components/food-planner/ui/DayNav';
import { supabase } from '@/integrations/supabase/client';
import { generateDirectMealPlan, DirectMealPlanRequest, MealPlan as DirectMealPlan } from '@/services/directMealPlanGenerator';
import { useMealPlanGenerator } from '../hooks/useMealPlanGenerator';
import { MealPlanDisplay } from '../components/MealPlanDisplay';

const MealPlanTest: React.FC = () => {
  const navigate = useNavigate();
  const [targets, setTargets] = useState({
    targetProtein: 120,
    targetCarbs: 300,
    targetFat: 80,
    mealCount: 3
  });

  const { 
    generateMealPlan, 
    generateQuickPlan, 
    generateAdvancedPlan,
    isLoading, 
    result, 
    error 
  } = useMealPlanGenerator();

  // 7 napos eredmény (ugyanaz a generátor, csak 7x)
  const [sevenDayPlans, setSevenDayPlans] = useState<Array<{ date: string; dayName: string; plan: DirectMealPlan }>>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isGenerating7, setIsGenerating7] = useState(false);

  const getMaxDeviationPercent = (plan: DirectMealPlan): number | null => {
    try {
      const dp = (plan as any)?.data?.deviation_percentages;
      const dev = (plan as any)?.data?.deviations;
      const tgt = (plan as any)?.data?.targetMacros || (plan as any)?.data?.targets;
      if (dp) {
        const vals = [dp.protein, dp.carbs, dp.fat].map((v:number)=>Math.abs(Number(v)||0));
        return Math.max(...vals);
      }
      if (dev && tgt) {
        const vals = [
          Math.abs(dev.protein)/(tgt.protein||1)*100,
          Math.abs(dev.carbs)/(tgt.carbs||1)*100,
          Math.abs(dev.fat)/(tgt.fat||1)*100,
        ];
        return Math.max(...vals);
      }
      return null;
    } catch {
      return null;
    }
  };

  const formatDateHu = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const date = d.toLocaleDateString('hu-HU');
    const dayNames = ['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'];
    const dayName = dayNames[d.getDay()];
    return { date, dayName };
  };

  const handleGenerate7Days = async () => {
    setIsGenerating7(true);
    setSevenDayPlans([]);
    setCurrentDayIndex(0);

    // felhasználói meta: same_lunch_dinner
    let sameLunchDinner = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      sameLunchDinner = Boolean((user?.user_metadata as any)?.same_lunch_dinner);
    } catch {}

    const req: DirectMealPlanRequest = {
      targetProtein: targets.targetProtein,
      targetCarbs: targets.targetCarbs,
      targetFat: targets.targetFat,
      mealCount: targets.mealCount,
      sameLunchDinner
    };

    const plans: Array<{ date: string; dayName: string; plan: DirectMealPlan }> = [];
    for (let i = 0; i < 7; i++) {
      const { date, dayName } = formatDateHu(i);
      const plan = await generateDirectMealPlan(req);
      plans.push({ date, dayName, plan });
    }
    setSevenDayPlans(plans);
    setIsGenerating7(false);
  };

  const handleQuickGenerate = () => {
    generateQuickPlan();
  };

  const handleStandardGenerate = () => {
    generateMealPlan(targets);
  };

  const handleAdvancedGenerate = () => {
    generateAdvancedPlan({
      ...targets,
      maxRecipeDeviation: 20,
      mealDistribution: { breakfast: 25, lunch: 40, dinner: 25, snack: 10 }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-black">
          🎯 Meal Plan Generator Test
        </h1>

        {/* Makró beállítások */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">⚙️ Makró Célok</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={targets.targetProtein}
                onChange={(e) => setTargets({...targets, targetProtein: +e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                value={targets.targetCarbs}
                onChange={(e) => setTargets({...targets, targetCarbs: +e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                value={targets.targetFat}
                onChange={(e) => setTargets({...targets, targetFat: +e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Étkezések
              </label>
              <select
                value={targets.mealCount}
                onChange={(e) => setTargets({...targets, mealCount: +e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={3}>3 étkezés</option>
                <option value={4}>4 étkezés</option>
                <option value={5}>5 étkezés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Generálás gombok */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">🚀 Generálás</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={handleQuickGenerate}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              {isLoading ? '⏳ Generálás...' : '⚡ Quick Generate'}
            </button>
            <button
              onClick={handleStandardGenerate}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              {isLoading ? '⏳ Generálás...' : '🎯 Standard Generate'}
            </button>
            <button
              onClick={handleAdvancedGenerate}
              disabled={isLoading}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              {isLoading ? '⏳ Generálás...' : '🔬 Advanced Generate'}
            </button>
            <button
              onClick={handleGenerate7Days}
              disabled={isGenerating7}
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              {isGenerating7 ? '⏳ 7 nap generálása...' : '📅 Generálj 7 napot'}
            </button>
          </div>
        </div>

        {/* Eredmény megjelenítés */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>❌ Hiba:</strong> {error}
          </div>
        )}

        {/* 7 napos eredmény (ugyanaz a generátor 7x) */}
        {sevenDayPlans.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4">📆 7 napos eredmény</h2>
            {(() => {
              const cur = sevenDayPlans[currentDayIndex];
              const maxDev = cur ? getMaxDeviationPercent(cur.plan) : null;
              const statusText = maxDev == null ? '' : (maxDev <= 5.1 ? ' – Sikeres' : ` – Nem sikeres (${maxDev.toFixed(1)}%)`);
              return (
                <DayNav
                  date={`${cur?.date || ''} – ${cur?.dayName || ''}${statusText}`}
              canPrev={currentDayIndex > 0}
              canNext={currentDayIndex < sevenDayPlans.length - 1}
              onPrev={() => setCurrentDayIndex(i => Math.max(0, i - 1))}
              onNext={() => setCurrentDayIndex(i => Math.min(sevenDayPlans.length - 1, i + 1))}
              light
                />
              );
            })()}
            {sevenDayPlans[currentDayIndex]?.plan?.success && sevenDayPlans[currentDayIndex]?.plan?.data && (
              <div className="mt-6">
                <MealPlanDisplay data={{
                  meals: sevenDayPlans[currentDayIndex].plan.data!.meals || [],
                  totalMacros: sevenDayPlans[currentDayIndex].plan.data!.totalMacros || { protein: 0, carbs: 0, fat: 0, calories: 0 },
                  targetMacros: sevenDayPlans[currentDayIndex].plan.data!.targetMacros || { protein: 0, carbs: 0, fat: 0, calories: 0 },
                  deviations: sevenDayPlans[currentDayIndex].plan.data!.deviations || { protein: 0, carbs: 0, fat: 0, calories: 0 }
                }} />
              </div>
            )}
          </div>
        )}

        {result && result.success && result.data && (
          <div className="mt-8">
            <MealPlanDisplay data={{
              meals: result.data.meals || [],
              totalMacros: result.data.totalMacros || { protein: 0, carbs: 0, fat: 0, calories: 0 },
              targetMacros: result.data.targetMacros || { protein: 0, carbs: 0, fat: 0, calories: 0 },
              deviations: result.data.deviations || { protein: 0, carbs: 0, fat: 0, calories: 0 }
            }} />
          </div>
        )}

        {result && !result.success && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>❌ Generálás sikertelen:</strong> {result.message}
          </div>
        )}

        {/* Debug JSON (összecsukható) */}
        {result && (
          <details className="bg-white rounded-lg shadow p-6 mt-6">
            <summary className="cursor-pointer text-lg font-bold text-gray-600 mb-4">
              🔍 Debug JSON (kattints a megjelenítéshez)
            </summary>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}

        {/* Útmutató */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-2">📖 Használat:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Quick:</strong> Gyors generálás alapbeállításokkal</li>
            <li>• <strong>Standard:</strong> Testreszabott makró célokkal</li>
            <li>• <strong>Advanced:</strong> Teljes kontroll az összes paraméterrel</li>
            <li>• Az eredmény JSON formátumban jelenik meg alul</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MealPlanTest;