import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronRight, AlertCircle, Activity, Users, MapPin, Calendar, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { usePermissions } from '../hooks/usePermissions';

const ENTITY_CONFIG = {
  infractions: {
    label: 'Infractions',
    icon: AlertCircle,
    color: 'text-[#D97706]',
    route: '/infractions',
    permKey: 'canViewInfractions',
    getLabel: (item) => item.label || `Infraction #${item.id}`,
    getSub: (item) => item.sub || '',
    getPreview: (item) => ({
      title: item.label || `Infraction #${item.id}`,
      status: item.badge,
      location: item.sub || '—',
      date: item.date,
    }),
  },
  accidents: {
    label: 'Accidents',
    icon: Activity,
    color: 'text-[#DC2626]',
    route: '/accidents',
    permKey: 'canViewAccidents',
    getLabel: (item) => item.label || `Accident #${item.id}`,
    getSub: (item) => item.sub || '',
    getPreview: (item) => ({
      title: item.label || `Accident #${item.id}`,
      status: item.badge,
      location: item.sub || '—',
      date: item.date,
    }),
  },
  personnel: {
    label: 'Personnel',
    icon: Users,
    color: 'text-[#2563EB]',
    route: '/personnel',
    permKey: 'canViewPersonnel',
    getLabel: (item) => item.label || `Agent #${item.id}`,
    getSub: (item) => item.sub || '',
    getPreview: (item) => ({
      title: item.label || `Agent #${item.id}`,
      status: item.badge,
      location: item.sub || '—',
      date: item.date,
    }),
  },
  victimes: {
    label: 'Victimes',
    icon: Users,
    color: 'text-[#64748B]',
    route: '/victimes',
    permKey: 'canViewVictimes',
    getLabel: (item) => item.label || `Victime #${item.id}`,
    getSub: (item) => item.sub || '',
    getPreview: (item) => ({
      title: item.label || `Victime #${item.id}`,
      status: item.badge,
      location: item.sub || '—',
      date: item.date,
    }),
  },
};

function QuickPreview({ preview }) {
  if (!preview) return null;
  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  return (
    <div className="absolute left-full top-0 ml-2 w-52 bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/10 rounded-xl shadow-xl p-3 z-10 pointer-events-none">
      <p className="text-xs font-bold text-[#0F172A] dark:text-white truncate mb-2">{preview.title}</p>
      <div className="space-y-1">
        {preview.status && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] dark:text-white/40">
            <Hash className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="truncate capitalize">{preview.status}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] dark:text-white/40">
          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{preview.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] dark:text-white/40">
          <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{fmt(preview.date)}</span>
        </div>
        {preview.extra && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] dark:text-white/30">
            <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{preview.extra}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GlobalSearchBar() {
  const perms = usePermissions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (!q || q.length < 2) { setResults({}); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get('/search', {
        params: { q, limit: 5 },
        signal: abortRef.current.signal,
      });
      const raw = res.data?.data?.results || res.data?.results || {};
      setResults(raw);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') setResults({});
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      if (abortRef.current) abortRef.current.abort();
      setResults({});
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cleanup abort controller on unmount
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  const handleNavigate = (route) => {
    navigate(route);
    setQuery('');
    setResults({});
    setIsOpen(false);
    setHoveredItem(null);
  };

  const hasResults = Object.keys(results).length > 0;
  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="relative flex-1 max-w-md" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen && query.length >= 2}
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-label="Recherche dans l'application"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Recherche intelligente…"
          className="w-full h-8 pl-3 pr-16 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-md text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults({}); setHoveredItem(null); if (abortRef.current) abortRef.current.abort(); }}
            aria-label="Effacer la recherche"
            className="absolute right-9 w-5 h-5 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#DC2626]/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Rechercher"
          className="absolute right-2 w-6 h-6 flex items-center justify-center rounded-md bg-[#1B4332] text-white hover:bg-[#143728] transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3" />
        </button>
      </div>

      {isOpen && query.length >= 2 && (
        <div
          id="search-results"
          role="listbox"
          aria-label="Résultats de recherche"
          className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/10 rounded-xl shadow-xl shadow-black/10 z-50 overflow-hidden"
        >
          {loading && (
            <div className="px-4 py-3 flex items-center gap-2 text-xs text-[#94A3B8] dark:text-white/40" role="status" aria-live="polite">
              <div className="w-3 h-3 border border-[#2563EB] border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
              Recherche en cours…
            </div>
          )}
          {!loading && !hasResults && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[#94A3B8] dark:text-white/30">Aucun résultat pour « {query} »</p>
              <p className="text-xs text-[#CBD5E1] dark:text-white/20 mt-1">Essayez un autre terme ou vérifiez l'orthographe</p>
            </div>
          )}
          {!loading && hasResults && (
            <div className="max-h-96 overflow-y-auto">
              {Object.entries(results).map(([key, items]) => {
                const cfg = ENTITY_CONFIG[key];
                if (!cfg || !items?.length) return null;
                if (cfg.permKey && !perms[cfg.permKey]) return null;
                const Icon = cfg.icon;
                return (
                  <div key={key} role="group" aria-label={cfg.label}>
                    <div className="px-3 py-1.5 bg-[#F8FAFC] dark:bg-white/3 border-b border-[#F1F5F9] dark:border-white/5 flex items-center gap-1.5">
                      <Icon className={`w-3 h-3 ${cfg.color}`} aria-hidden="true" />
                      <p className="text-[10px] font-bold text-[#94A3B8] dark:text-white/30 uppercase tracking-wider">
                        {cfg.label}
                      </p>
                    </div>
                    {items.map(item => {
                      const isHovered = hoveredItem?.cfg.key === key && hoveredItem?.item.id === item.id;
                      return (
                        <div
                          key={item.id}
                          className="relative"
                          role="option"
                          aria-selected="false"
                          onMouseEnter={() => setHoveredItem({ cfg: { ...cfg, key }, item })}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <button
                            onClick={() => handleNavigate(cfg.route)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">{cfg.getLabel(item)}</p>
                              {cfg.getSub(item) && (
                                <p className="text-[10px] text-[#94A3B8] dark:text-white/40 truncate mt-0.5">{cfg.getSub(item)}</p>
                              )}
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] dark:text-white/20 shrink-0 ml-2 group-hover:text-[#94A3B8] dark:group-hover:text-white/40 transition-colors" aria-hidden="true" />
                          </button>
                          {isHovered && cfg.getPreview && (
                            <QuickPreview preview={cfg.getPreview(item)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="px-4 py-2 border-t border-[#F1F5F9] dark:border-white/5 text-[10px] text-[#94A3B8] dark:text-white/30 text-right">
                {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
