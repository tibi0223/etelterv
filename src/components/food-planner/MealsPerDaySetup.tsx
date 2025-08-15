import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';

interface MealsPerDaySetupProps {
  onBack: () => void;
  onComplete: () => void;
}

export function MealsPerDaySetup({ onBack, onComplete }: MealsPerDaySetupProps) {
  const [mealsPerDay, setMealsPerDay] = useState<number>(3);
  const [saving, setSaving] = useState(false);
  const [sameLunchDinner, setSameLunchDinner] = useState<boolean | null>(null);
  // Ismétlési tartomány (min–max nap) étkezésenként
  const [tolerance, setTolerance] = useState({
    breakfast: [2, 5] as [number, number],
    tizorai: [2, 5] as [number, number],
    lunch: [1, 2] as [number, number],
    uzsonna: [2, 5] as [number, number],
    dinner: [1, 2] as [number, number],
  });
  // Lépések: 0 = ismétlési tolerancia, 1 = étkezések száma, 2 = ebéd = vacsora
  const [step, setStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const meta = user?.user_metadata as any;
        const m = Number(meta?.meals_per_day);
        if (Number.isFinite(m) && m >= 1 && m <= 5) setMealsPerDay(m);
        if (typeof meta?.same_lunch_dinner !== 'undefined') {
          setSameLunchDinner(Boolean(meta?.same_lunch_dinner));
        }
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: {
        meals_per_day: mealsPerDay,
        same_lunch_dinner: sameLunchDinner === true,
        repeat_tolerance: {
          breakfast: { min: tolerance.breakfast[0], max: tolerance.breakfast[1] },
          tizorai: { min: tolerance.tizorai[0], max: tolerance.tizorai[1] },
          lunch: { min: tolerance.lunch[0], max: tolerance.lunch[1] },
          uzsonna: { min: tolerance.uzsonna[0], max: tolerance.uzsonna[1] },
          dinner: { min: tolerance.dinner[0], max: tolerance.dinner[1] },
        }
      } });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-4 sm:p-6 space-y-6">
        {/* Fejléc a lépés szerint */}
        {step === 0 && (
          <>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Hány napig szeretnéd/tudnád ugyanazt enni?</h2>
            <p className="text-gray-600">Lehet frissen készítve vagy előre elkészítve, de ugyanaz a fogás.</p>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Napi étkezések száma</h2>
            <p className="text-gray-600">Add meg, hogy naponta hány étkezést szeretnél alapértelmezésként. Később bármikor módosítható.</p>
          </>
        )}
        {step === 2 && null}

        {/* TARTALOM a lépés szerint */}
        {step === 0 && (
          <div className="mt-2">
            <div className="space-y-4 sm:space-y-5">
            {/* Reggeli */}
            <div>
                <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">Reggeli <span className="text-gray-400">(1–7)</span></span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10 text-right">1</span>
                <Slider value={tolerance.breakfast} min={1} max={7} step={1}
                  onValueChange={(v) => setTolerance({ ...tolerance, breakfast: [v[0], v[1]] as [number, number] })}
                  className="flex-1" />
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10">7</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Ajánlott: 2–5</div>
            </div>

            {/* Tízórai */}
            <div>
                <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">Tízórai <span className="text-gray-400">(1–7)</span></span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10 text-right">1</span>
                <Slider value={tolerance.tizorai} min={1} max={7} step={1}
                  onValueChange={(v) => setTolerance({ ...tolerance, tizorai: [v[0], v[1]] as [number, number] })}
                  className="flex-1" />
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10">7</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Ajánlott: 2–5</div>
            </div>

            {/* Ebéd */}
            <div>
                <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">Ebéd <span className="text-gray-400">(1–3)</span></span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10 text-right">1</span>
                <Slider value={tolerance.lunch} min={1} max={3} step={1}
                  onValueChange={(v) => setTolerance({ ...tolerance, lunch: [v[0], v[1]] as [number, number] })}
                  className="flex-1" />
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10">3</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Ajánlott: 1–2</div>
            </div>

            {/* Uzsonna */}
            <div>
                <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">Uzsonna <span className="text-gray-400">(1–7)</span></span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10 text-right">1</span>
                <Slider value={tolerance.uzsonna} min={1} max={7} step={1}
                  onValueChange={(v) => setTolerance({ ...tolerance, uzsonna: [v[0], v[1]] as [number, number] })}
                  className="flex-1" />
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10">7</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Ajánlott: 2–5</div>
            </div>

            {/* Vacsora */}
            <div>
                <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">Vacsora <span className="text-gray-400">(1–3)</span></span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10 text-right">1</span>
                <Slider value={tolerance.dinner} min={1} max={3} step={1}
                  onValueChange={(v) => setTolerance({ ...tolerance, dinner: [v[0], v[1]] as [number, number] })}
                  className="flex-1" />
                <span className="text-[10px] sm:text-xs text-gray-500 w-6 sm:w-10">3</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Ajánlott: 1–2</div>
            </div>
          </div>
          </div>
        )}

        {step === 1 && (
          <select
            value={mealsPerDay}
            onChange={(e) => setMealsPerDay(Math.max(1, Math.min(5, Number(e.target.value))))}
            className="w-full h-12 border-gray-300 rounded-md px-3"
          >
            <option value={1}>1 étkezés/nap</option>
            <option value={2}>2 étkezés/nap</option>
            <option value={3}>3 étkezés/nap</option>
            <option value={4}>4 étkezés/nap</option>
            <option value={5}>5 étkezés/nap</option>
          </select>
        )}

        {step === 2 && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Szeretnéd, hogy az ebéded és a vacsorád ugyanaz legyen?</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSameLunchDinner(true)}
                className={`px-4 py-2 rounded-md border ${sameLunchDinner === true ? 'bg-emerald-600 text-white' : ''}`}
              >
                Igen
              </button>
              <button
                type="button"
                onClick={() => setSameLunchDinner(false)}
                className={`px-4 py-2 rounded-md border ${sameLunchDinner === false ? 'bg-emerald-600 text-white' : ''}`}
              >
                Nem
              </button>
            </div>
          </div>
        )}

        {/* LÉPTETŐ GOMBOK */}
        <div className="flex gap-3 justify-between mt-6">
          <button onClick={() => (step === 0 ? onBack() : setStep((prev) => (prev - 1) as 0 | 1 | 2))} className="px-4 py-2 rounded-md border">Vissza</button>
          {step < 2 ? (
            <button onClick={() => setStep((prev) => (prev + 1) as 0 | 1 | 2)} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Következő</button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-md bg-emerald-600 text-white">
              {saving ? 'Mentés...' : 'Mentés és folytatás'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


