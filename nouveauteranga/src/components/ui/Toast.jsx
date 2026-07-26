import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const TYPES = {
  success: { cls: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]',  Icon: CheckCircle  },
  error:   { cls: 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',   Icon: AlertCircle  },
  warning: { cls: 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]',   Icon: AlertTriangle },
  info:    { cls: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]',   Icon: Info         },
};

export function Toast({ toast }) {
  if (!toast) return null;
  const { cls, Icon } = TYPES[toast.type] ?? TYPES.success;
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${cls}`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      {toast.message}
    </motion.div>
  );
}

export function useToast(duration = 4000) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, [duration]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toast, showToast };
}
