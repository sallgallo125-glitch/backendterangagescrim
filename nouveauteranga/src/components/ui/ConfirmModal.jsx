import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmer la suppression',
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  loading = false,
  variant = 'danger',
}) {
  const panelRef = useRef(null);

  // Escape key — don't close while an action is in progress
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape' && !loading) onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel, loading]);

  // Focus trap + initial focus on the first focusable element
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const sel = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(panel.querySelectorAll(sel));
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    const id = setTimeout(() => first?.focus(), 50);

    const trap = (e) => {
      if (e.key !== 'Tab' || !first || !last) return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', trap);
    return () => { clearTimeout(id); document.removeEventListener('keydown', trap); };
  }, [isOpen]);

  const Icon    = variant === 'danger' ? Trash2 : AlertTriangle;
  const iconBg  = variant === 'danger' ? 'bg-[#FEF2F2]'        : 'bg-[#FFFBEB]';
  const iconClr = variant === 'danger' ? 'text-[#DC2626]'       : 'text-[#D97706]';
  const btnCls  = variant === 'danger'
    ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
    : 'bg-[#D97706] hover:bg-[#B45309]';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-sm shadow-lg p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${iconClr}`} aria-hidden="true" />
              </div>
              <div>
                <p id="confirm-modal-title" className="font-semibold text-[#0F172A] dark:text-white text-sm">
                  {title}
                </p>
                <p className="text-xs text-[#64748B] dark:text-white/50 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>

            {message && (
              <p className="text-sm text-[#475569] dark:text-white/60">{message}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 ${btnCls} text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors`}
              >
                {loading ? 'Traitement…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
