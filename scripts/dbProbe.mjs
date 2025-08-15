import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || 'https://hhjucbkqyamutshfspyf.supabase.co'
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoanVjYmtxeWFtdXRzaGZzcHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3Mzc5OTgsImV4cCI6MjA2NTMxMzk5OH0.ZQmD-ELWa0-M_8qNv5drxm0C7tTp44wzRKWl5RPjzx0'

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
})

const extractNumber = (val) => {
  if (val == null) return 0
  const s = String(val)
  if (s.includes('/')) return Number((s.split('/')[0] || '').replace(/[^0-9.]/g, '')) || 0
  return Number(s.replace(',', '.').replace(/[^0-9.]/g, '')) || 0
}

function calcScalability({ ingredients }) {
  // sums
  let totP = 0, totC = 0, totF = 0
  let indP = 0, indC = 0, indF = 0
  let bndP = 0, bndC = 0, bndF = 0
  let densP = [], densC = [], densF = []

  for (const it of ingredients) {
    const { qty, n, kotes } = it
    if (!n || qty <= 0) continue
    const P = extractNumber(n['Fehérje/100g']) * qty / 100
    const C = extractNumber(n['Szénhidrát/100g']) * qty / 100
    const F = extractNumber(n['Zsir/100g']) * qty / 100
    totP += P; totC += C; totF += F
    if (kotes) { bndP += P; bndC += C; bndF += F } else { indP += P; indC += C; indF += F }
    densP.push(extractNumber(n['Fehérje/100g']))
    densC.push(extractNumber(n['Szénhidrát/100g']))
    densF.push(extractNumber(n['Zsir/100g']))
  }

  const maxP = densP.length ? Math.max(...densP) : 0
  const maxC = densC.length ? Math.max(...densC) : 0
  const maxF = densF.length ? Math.max(...densF) : 0

  const calc = (ind, bnd, tot, maxD, ref, fat = false) => {
    if (tot === 0) return 0
    const independentRatio = ind / tot
    const boundRatio = bnd / tot
    const original = independentRatio * 0.7 + (1 - boundRatio) * 0.3
    let value = Math.min(1, original * (maxD / ref))
    if (fat && maxD > 80) value *= 0.5
    return Number(value.toFixed(2))
  }

  return {
    totals: { P: totP, C: totC, F: totF },
    independent: { P: indP, C: indC, F: indF },
    bound: { P: bndP, C: bndC, F: bndF },
    densities: { P: maxP, C: maxC, F: maxF },
    skala: {
      protein: calc(indP, bndP, totP, maxP, 20, false),
      carbs: calc(indC, bndC, totC, maxC, 50, false),
      fat: calc(indF, bndF, totF, maxF, 15, true)
    },
    // Recept-szintű mérés: ha van legalább egy független FŐ_MAKRO (Tipus='FŐ_MAKRO'),
    // akkor az egész receptet függetlennek tekintjük az adott makróra.
    // Ehhez az összetevők Tipus mezőjét is beolvassuk (ha elérhető a hívóban)
  }
}

async function fetchRange(startId, endId) {
  const { data: recipes, error } = await supabase
    .from('receptek')
    .select('*')
    .gte('Recept ID', startId)
    .lte('Recept ID', endId)
    .order('Recept ID', { ascending: true })
  if (error) throw error

  if (!recipes || recipes.length === 0) {
    console.log(`Nincs találat a ${startId}-${endId} tartományra.`)
    return
  }
  for (const r of recipes) {
    const id = r['Recept ID']
    const name = r['Receptnév'] || r['Recept neve'] || `Recipe ${id}`
    const tag = r['Recept_Skálázhatóság'] || r['Recept Skálázhatóság'] || null

    const { data: ings, error: ingErr } = await supabase
      .from('recept_alapanyag')
      .select('*')
      .eq('Recept_ID', id)

    if (ingErr) throw ingErr
    if (!ings || ings.length === 0) {
      console.log(`- ${name} (#${id}) — nincs alapanyag adat`)
      continue
    }

    const ids = [...new Set(ings
      .map(row => row['Élelmiszer ID'])
      .map(raw => extractNumber(raw))
      .filter(n => n > 0))]

    const { data: nutri, error: nutErr } = await supabase
      .from('alapanyag')
      .select('ID, "Fehérje/100g", "Szénhidrát/100g", "Zsir/100g", "Kaloria/100g"')
      .in('ID', ids)

    if (nutErr) throw nutErr
    const map = new Map()
    ;(nutri || []).forEach(n => map.set(n.ID, n))

    const expanded = ings.map(ing => ({
      qty: extractNumber(ing['Mennyiség']),
      unit: ing['Mértékegység'] || 'g',
      name: ing['Élelmiszerek'],
      kotes: (ing['Kotes'] || '').trim(),
      tipus: ing['Tipus'] || '',
      n: map.get(extractNumber(ing['Élelmiszer ID']))
    }))

    // Recept-szintű „independent” logika teszt: ha van bármilyen FŐ_MAKRO típusú alapanyag,
    // a teljes makróösszegeket tekintsük függetlennek (csak a mérés kedvéért)
    const hasFoMakro = expanded.some(it => String(it.tipus).toUpperCase() === 'FŐ_MAKRO' || String(it.tipus).toUpperCase() === 'FO_MAKRO')
    const sk = calcScalability({ ingredients: expanded.map(it => ({
      ...it,
      kotes: hasFoMakro ? '' : it.kotes
    })) })

    const K = expanded.reduce((s, it) => s + (it.n ? extractNumber(it.n['Kaloria/100g']) * it.qty / 100 : 0), 0)
    console.log(`\n${name} (#${id})${tag ? ' [' + tag + ']' : ''}`)
    console.log(`  Makrók: P:${sk.totals.P.toFixed(1)}g C:${sk.totals.C.toFixed(1)}g F:${sk.totals.F.toFixed(1)}g Cal:${K.toFixed(0)}kcal`)
    console.log(`  Független vs Kötött (P/C/F): ${sk.independent.P.toFixed(1)}/${sk.bound.P.toFixed(1)} | ${sk.independent.C.toFixed(1)}/${sk.bound.C.toFixed(1)} | ${sk.independent.F.toFixed(1)}/${sk.bound.F.toFixed(1)}`)
    console.log(`  MAX sűrűség (P/C/F): ${sk.densities.P.toFixed(1)}/${sk.densities.C.toFixed(1)}/${sk.densities.F.toFixed(1)}`)
    console.log(`  Skálázhatóság (P/C/F): ${sk.skala.protein} / ${sk.skala.carbs} / ${sk.skala.fat}`)
    console.log('  Alapanyagok:')
    expanded.forEach(it => {
      if (!it.n) return
      const p = extractNumber(it.n['Fehérje/100g']) * it.qty / 100
      const c = extractNumber(it.n['Szénhidrát/100g']) * it.qty / 100
      const f = extractNumber(it.n['Zsir/100g']) * it.qty / 100
      const k = extractNumber(it.n['Kaloria/100g']) * it.qty / 100
      console.log(`    - ${it.name} ${it.qty}${it.unit} ${it.kotes ? `(kötés: ${it.kotes})` : ''} → P:${p.toFixed(1)} C:${c.toFixed(1)} F:${f.toFixed(1)} Cal:${k.toFixed(0)}`)
    })
  }
}

const [,, a, b] = process.argv
if (a && b) {
  fetchRange(Number(a), Number(b)).catch(e => {
    console.error('DB probe error:', e)
    process.exit(1)
  })
} else {
  fetchRange(1, 5).catch(e => {
  console.error('DB probe error:', e)
  process.exit(1)
})
}
