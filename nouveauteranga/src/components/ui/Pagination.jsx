import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, lastPage, onPageChange, from, to, total, label = 'éléments' }) {
  if (lastPage <= 1) return null;
  return (
    <div className="px-5 py-3.5 border-t border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between">
      <span className="text-xs text-[#64748B] dark:text-white/50">
        {from}–{to} sur {total} {label}
      </span>
      <nav className="flex items-center gap-2" aria-label="Pagination">
        <button
          onClick={() => { if (page > 1) onPageChange(page - 1); }}
          disabled={page === 1}
          aria-label="Page précédente"
          className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="text-xs font-semibold text-[#0F172A] dark:text-white tabular-nums" aria-current="page">
          {page} / {lastPage}
        </span>
        <button
          onClick={() => { if (page < lastPage) onPageChange(page + 1); }}
          disabled={page === lastPage}
          aria-label="Page suivante"
          className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
