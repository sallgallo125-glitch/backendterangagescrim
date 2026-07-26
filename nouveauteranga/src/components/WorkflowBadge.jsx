import { useState } from 'react';

const WORKFLOW_CONFIG = {
  'Brouillon':  { bg: 'bg-[#6B7280]' },
  'En cours':   { bg: 'bg-[#1B4332]' },
  'Validé':     { bg: 'bg-[#16A34A]' },
  'Clôturé':    { bg: 'bg-[#D97706]' },
  'Archivé':    { bg: 'bg-[#94A3B8]' },
};

// eslint-disable-next-line react-refresh/only-export-components
export const WORKFLOW_STATUTS = Object.keys(WORKFLOW_CONFIG);

/**
 * Badge affichant le statut workflow d'un dossier.
 * Props: status (string), size ('sm'|'md')
 */
export default function WorkflowBadge({ status, size = 'sm' }) {
  const cfg = WORKFLOW_CONFIG[status] || WORKFLOW_CONFIG['En cours'];
  const pad = size === 'md' ? 'px-3 py-1.5' : 'px-2.5 py-1';
  const txt = size === 'md' ? 'text-xs' : 'text-[10px]';

  return (
    <span className={`inline-flex items-center rounded-full font-bold uppercase text-white ${pad} ${txt} ${cfg.bg}`}>
      {status || 'En cours'}
    </span>
  );
}

/**
 * Sélecteur de statut workflow (formulaire).
 * Props: value, onChange, className
 */
export function WorkflowSelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value || 'En cours'}
      onChange={e => onChange(e.target.value)}
      className={`px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${className}`}
    >
      {WORKFLOW_STATUTS.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

/**
 * Badge inline cliquable dans un tableau — affiche le badge, ouvre un <select> au clic.
 * Props: status, onStatusChange(newStatus), loading
 */
export function WorkflowInlineSelect({ status, onStatusChange, loading = false }) {
  const [open, setOpen] = useState(false);
  const cfg = WORKFLOW_CONFIG[status] || WORKFLOW_CONFIG['En cours'];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        title="Cliquer pour changer le statut"
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase text-white cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${cfg.bg}`}
      >
        {status || 'En cours'}
        <span className="ml-0.5 opacity-70">▾</span>
      </button>
    );
  }

  return (
    <select
      autoFocus
      value={status || 'En cours'}
      onBlur={() => setOpen(false)}
      onChange={e => { onStatusChange(e.target.value); setOpen(false); }}
      className="h-7 px-2 text-xs rounded-lg border border-[#2563EB] bg-white dark:bg-[#343a40] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
    >
      {WORKFLOW_STATUTS.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
