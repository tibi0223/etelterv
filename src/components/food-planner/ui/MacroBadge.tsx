import { Badge } from "@/components/ui/badge";

export function MacroBadge({ p, c, f, kcal }: { p: number; c: number; f: number; kcal: number }) {
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white text-sm font-semibold
      bg-gradient-to-r from-emerald-500/60 to-cyan-500/60 shadow-[0_0_24px_rgba(16,185,129,.35)]
      ring-1 ring-white/20 [box-shadow:inset_0_0_0_1px_rgba(255,255,255,.25)]"
    >
      Skálázott: {p.toFixed(1)}g P, {c.toFixed(1)}g C, {f.toFixed(1)}g F, {Math.round(kcal)} kcal
    </Badge>
  );
}


