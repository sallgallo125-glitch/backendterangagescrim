/* Composants shimmer réutilisables pour tous les états de chargement */

/** Bloc shimmer générique */
export function ShimmerBlock({ className = '' }) {
  return <div className={`shimmer rounded ${className}`} />;
}

/** Ligne de tableau shimmer — génère `cols` cellules */
export function ShimmerTableRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-4 py-4">
          <div className="shimmer rounded h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** Plusieurs lignes de tableau shimmer */
export function ShimmerTableRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <ShimmerTableRow key={i} cols={cols} />
  ));
}

/** Carte shimmer pour grilles de cards */
export function ShimmerCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-5 space-y-3 h-44 ${className}`}>
      <div className="flex justify-between items-start">
        <div className="shimmer rounded-lg w-10 h-10" />
        <div className="shimmer rounded-full w-12 h-5" />
      </div>
      <div className="shimmer rounded w-3/4 h-4" />
      <div className="shimmer rounded w-1/2 h-3" />
    </div>
  );
}

/** KPI card shimmer (utilisé dans Dashboard) */
export function ShimmerStatCard() {
  return (
    <div className="card-premium p-6 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="shimmer rounded w-24 h-3.5" />
          <div className="shimmer rounded w-16 h-7" />
        </div>
        <div className="shimmer rounded-2xl w-11 h-11 shrink-0" />
      </div>
      <div className="shimmer rounded-lg w-28 h-5" />
    </div>
  );
}

/** Ligne de liste (notifications, etc.) */
export function ShimmerListRow() {
  return (
    <div className="px-5 py-4 flex gap-3">
      <div className="shimmer rounded-lg w-9 h-9 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="shimmer rounded w-48 h-4" />
        <div className="shimmer rounded w-72 h-3" />
      </div>
    </div>
  );
}

/** Plein-écran centré (remplacement du spinner circulaire global) */
export function ShimmerPage({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-4">
      {/* Barre de titre */}
      <div className="shimmer rounded-xl w-48 h-6" />
      {/* Fausses lignes */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
            <ShimmerTableRows rows={rows} cols={cols} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
