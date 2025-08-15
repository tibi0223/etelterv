export function ScaledIngredientsTable({ rows }: { rows: Array<any> }) {
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-white/5 border border-white/10 bg-white/8 backdrop-blur-xl">
      <table className="min-w-full text-sm text-white/80">
        <thead className="sticky top-0 z-10 bg-white/10 backdrop-blur-md text-white/90">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold [&>th]:text-left [&>th]:border-b [&>th]:border-white/10">
            <th>Alapanyag</th>
            <th className="text-right">Mennyiség</th>
            <th>Mértékegység</th>
            <th className="text-right">Fehérje</th>
            <th className="text-right">Szénhidrát</th>
            <th className="text-right">Zsír</th>
            <th className="text-right">Kalória</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {rows.map((ing, i) => (
            <tr
              key={i}
              className="odd:bg-white/[0.03] even:bg-white/[0.015] hover:bg-white/[0.06] transition-colors"
            >
              <td className="px-3 py-2 font-medium text-white/90">{ing['Élelmiszerek']}</td>
              <td className="px-3 py-2 text-right tabular-nums">{ing.Mennyiség}</td>
              <td className="px-3 py-2">{ing['Mértékegység']}</td>
              <td className="px-3 py-2 text-right tabular-nums">{ing.p?.toFixed ? ing.p.toFixed(1) : ing.p}</td>
              <td className="px-3 py-2 text-right tabular-nums">{ing.c?.toFixed ? ing.c.toFixed(1) : ing.c}</td>
              <td className="px-3 py-2 text-right tabular-nums">{(ing.f?.toFixed ? ing.f.toFixed(1) : ing.f)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{Math.round(ing.kcal || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


