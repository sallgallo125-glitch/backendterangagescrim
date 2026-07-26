import { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Rechercher…', className = '', debounceMs = 0 }) {
  const [local, setLocal] = useState(value ?? '');
  const timerRef = useRef(null);

  const controlled = debounceMs === 0;
  const displayValue = controlled ? value : local;

  const handleChange = (val) => {
    if (controlled) {
      onChange(val);
    } else {
      setLocal(val);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(val), debounceMs);
    }
  };

  const handleClear = () => {
    if (!controlled) setLocal('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        value={displayValue}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 pl-3 pr-16 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-colors"
      />
      {displayValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Effacer la recherche"
          className="absolute right-9 w-5 h-5 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#DC2626]/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onChange(displayValue)}
        aria-label="Rechercher"
        className="absolute right-2 w-6 h-6 flex items-center justify-center rounded-md bg-[#1B4332] text-white hover:bg-[#143728] transition-colors cursor-pointer"
      >
        <Search className="w-3 h-3" />
      </button>
    </div>
  );
}

