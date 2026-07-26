import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, subtitle, icon, maxWidth = 'max-w-2xl', children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(panel.querySelectorAll(sel));
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    const id = setTimeout(() => first?.focus(), 50);

    const trap = (e) => {
      if (e.key !== 'Tab' || !first || !last) return;
      if (first === last) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', trap);
    return () => { clearTimeout(id); document.removeEventListener('keydown', trap); };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className={`bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full ${maxWidth} shadow-xl overflow-hidden flex flex-col my-auto`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-[#DBEAFE] flex items-center justify-center">
                {icon}
              </div>
            )}
            <div>
              <p id="modal-title" className="font-semibold text-sm text-[#0F172A] dark:text-white">{title}</p>
              {subtitle && <p className="text-xs text-[#64748B] dark:text-white/50 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/3 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
