import { CombinedRecipe, Alapanyag } from './database/types';

export interface PreFilterConfig {
  densityThreshold?: number;
  ratioToleranceFactor?: number;
  enforceAxes?: boolean; // require P/C/F axis definable from any ingredient
  enforceRatio?: boolean; // enforce target-derived minimum slope ratios
}

export interface Rejection {
  recipeId: number;
  recipeName: string;
  reasons: Array<'missing_axis' | 'fails_density' | 'fails_ratio'>;
  details?: any;
}

// Parse numeric values, accept comma decimals
const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function buildNutritionIndex(all: Alapanyag[]): Map<number, Alapanyag> {
  const index = new Map<number, Alapanyag>();
  for (const item of all) {
    index.set(Number(item.ID), item);
  }
  return index;
}

function getPer100g(ingredient: any, index: Map<number, Alapanyag>) {
  const id = Number(ingredient['Élelmiszer ID'] ?? ingredient.ID);
  const row = index.get(id);
  if (!row) return { p100: 0, c100: 0, f100: 0, k100: 0 };
  return {
    p100: parseNumber(row['Fehérje/100g']),
    c100: parseNumber(row['Szénhidrát/100g']),
    f100: parseNumber(row['Zsir/100g']),
    k100: parseNumber(row['Kaloria/100g'])
  };
}

// Recipe-level density in [0,1] combining independence and unbound share
function computeRecipeDensity(recipe: CombinedRecipe, index: Map<number, Alapanyag>): number {
  const ingredients = (recipe as any).ingredients || (recipe as any).hozzávalók || [];
  let totalCal = 0;
  let boundCal = 0;
  let independentCal = 0;

  for (const it of ingredients) {
    const { k100 } = getPer100g(it, index);
    const grams = parseNumber(it.Mennyiség);
    const calories = (k100 * grams) / 100;
    totalCal += calories;

    const raw = (it.Kotes ?? it['Arány_Csoport'] ?? '').toString().trim().toLowerCase();
    const isBound = raw !== '' && raw !== 'null' && raw !== 'n/a' && raw !== 'none' && raw !== 'unbound';
    if (isBound) boundCal += calories; else independentCal += calories;
  }

  if (totalCal <= 0) return 0;
  const independentRatio = independentCal / totalCal;
  const boundRatio = boundCal / totalCal;
  const original = independentRatio * 0.7 + (1 - boundRatio) * 0.3;
  return Math.max(0, Math.min(1, original));
}

function enrichIngredients(recipe: CombinedRecipe, index: Map<number, Alapanyag>) {
  const ingredients = (recipe as any).ingredients || (recipe as any).hozzávalók || [];
  const eps = 1e-9;
  return ingredients.map((it: any) => {
    const { p100, c100, f100 } = getPer100g(it, index);
    return {
      ref: it,
      p100,
      c100,
      f100,
      c_over_p: c100 / Math.max(p100, eps),
      f_over_p: f100 / Math.max(p100, eps),
      f_over_c: f100 / Math.max(c100, eps)
    };
  });
}

// Domináns‑választás elhagyva – tengely‑max logikát használunk

export function strictPreFilterRecipes(
  recipes: CombinedRecipe[],
  allNutritionData: Alapanyag[],
  target: { protein: number; carbs: number; fat: number },
  config: PreFilterConfig = {}
): { accepted: CombinedRecipe[]; rejections: Rejection[] } {
  const cfg = {
    densityThreshold: config.densityThreshold ?? 0.6,
    // Nincs tűrés: 1.0 → pontos összevetés
    ratioToleranceFactor: config.ratioToleranceFactor ?? 1.0,
    enforceAxes: config.enforceAxes ?? true,
    enforceRatio: config.enforceRatio ?? true
  } as Required<PreFilterConfig>;

  const index = buildNutritionIndex(allNutritionData);
  const targetCP = (target.carbs || 0) / Math.max(target.protein || 1, 1);
  const targetPF = (target.protein || 0) / Math.max(target.fat || 1, 1);
  const targetFP = (target.fat || 0) / Math.max(target.protein || 1, 1);

  const accepted: CombinedRecipe[] = [];
  const rejections: Rejection[] = [];

  for (const r of recipes) {
    const reasons: Rejection['reasons'] = [];
    const density = computeRecipeDensity(r, index);
    if (density < cfg.densityThreshold) {
      reasons.push('fails_density');
    }

    const enriched = enrichIngredients(r, index);

    // Axis-wise maxima (TOP-2 szabály):
    // - C-domináns jelölt: ha C a legnagyobb, arány = C / max(P,F)
    // - P-domináns jelölt: ha P a legnagyobb, arány = P / max(C,F)
    // - F-domináns jelölt: ha F a legnagyobb, arány = F / max(C,P)
    const eps = 1e-9;
    const cpCandidates: number[] = [];
    const pfCandidates: number[] = [];
    const fpCandidates: number[] = [];
    for (const x of enriched) {
      const p = x.p100 || 0;
      const c = x.c100 || 0;
      const f = x.f100 || 0;
      // C-domináns
      if (c >= p && c >= f) {
        const second = Math.max(p, f);
        if (second > eps) cpCandidates.push(c / second);
      }
      // P-domináns
      if (p >= c && p >= f) {
        const second = Math.max(c, f);
        if (second > eps) pfCandidates.push(p / second);
      }
      // F-domináns
      if (f >= p && f >= c) {
        const second = Math.max(p, c);
        if (second > eps) fpCandidates.push(f / second);
      }
    }

    const hasAxes = {
      p: pfCandidates.length > 0,
      c: cpCandidates.length > 0,
      f: fpCandidates.length > 0,
    };

    if (cfg.enforceAxes) {
      if (!hasAxes.p || !hasAxes.c || !hasAxes.f) {
        reasons.push('missing_axis');
      }
    }

    if (cfg.enforceRatio) {
      const cpMax = cpCandidates.length ? Math.max(...cpCandidates) : 0;
      const pfMax = pfCandidates.length ? Math.max(...pfCandidates) : 0;
      const fpMax = fpCandidates.length ? Math.max(...fpCandidates) : 0;
      const passCP = cpMax >= targetCP * cfg.ratioToleranceFactor;
      const passPF = pfMax >= targetPF * cfg.ratioToleranceFactor;
      const passFP = fpMax >= targetFP * cfg.ratioToleranceFactor;
      if (!(passCP && passPF && passFP)) {
        reasons.push('fails_ratio');
        try {
          const id = (r as any).id ?? (r as any).recipe_id;
          const name = (r as any).név ?? (r as any).recipe_name ?? '';
          const tolPct = (1 - cfg.ratioToleranceFactor) * 100;
          const tolText = tolPct > 0 ? ` (tűrés −${tolPct.toFixed(1)}%)` : '';
          console.log(`🚫 [PreFilter] ${name} (${id}) elutasítva: Tengely-max arány bukás | cp_max=${cpMax.toFixed(2)}, pf_max=${pfMax.toFixed(2)}, fp_max=${fpMax.toFixed(2)} vs Cél: CP=${targetCP.toFixed(2)}, PF=${targetPF.toFixed(2)}, FP=${targetFP.toFixed(2)}${tolText}`);
        } catch {}
      } else {
        try {
          const id = (r as any).id ?? (r as any).recipe_id;
          const name = (r as any).név ?? (r as any).recipe_name ?? '';
          const tolPct = (1 - cfg.ratioToleranceFactor) * 100;
          const tolText = tolPct > 0 ? ` (tűrés −${tolPct.toFixed(1)}%)` : '';
          console.log(`✅ [PreFilter] ${name} (${id}) tengely-max OK | cp=${cpMax.toFixed(2)}, pf=${pfMax.toFixed(2)}, fp=${fpMax.toFixed(2)} | Cél: CP=${targetCP.toFixed(2)}, PF=${targetPF.toFixed(2)}, FP=${targetFP.toFixed(2)}${tolText}`);
        } catch {}
      }
    }

    if (reasons.length === 0) {
      accepted.push(r);
    } else {
      rejections.push({
        recipeId: (r as any).id ?? (r as any).recipe_id,
        recipeName: (r as any).név ?? (r as any).recipe_name ?? '',
        reasons,
        details: {
          density,
          hasAxes,
          axisMax: {
            cp: cpCandidates.length ? Math.max(...cpCandidates) : 0,
            pf: pfCandidates.length ? Math.max(...pfCandidates) : 0,
            fp: fpCandidates.length ? Math.max(...fpCandidates) : 0,
          },
          targets: { targetCP, targetPF, targetFP },
          cfg
        }
      });
    }
  }

  return { accepted, rejections };
}


