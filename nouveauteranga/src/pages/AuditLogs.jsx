import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerTableRows } from '../components/Shimmer';
import { Terminal, Search, Eye, X, Globe, Cpu, Info, RefreshCw, ChevronLeft, ChevronRight, Download, Filter, Calendar } from 'lucide-react';
import auditService from '../services/auditService';
import SearchInput from '../components/ui/SearchInput';

const ACTION_BADGE = {
  created:              'bg-[#16A34A] text-white',
  updated:              'bg-[#1B4332] text-white',
  deleted:              'bg-[#DC2626] text-white',
  login:                'bg-[#4338CA] text-white',
  logout:               'bg-[#D97706] text-white',
  login_failed:         'bg-[#E11D48] text-white',
  sync_violation:       'bg-[#C2410C] text-white',
  territorial_violation:'bg-[#7C3AED] text-white',
};

const actionBadgeCls = (a) => ACTION_BADGE[a] || 'bg-[#6B7280] text-white';

const getDiffKeys = (oldVal, newVal) =>
  Array.from(new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})]));

const safeDate = (v, fmt = 'date') => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return fmt === 'time' ? d.toLocaleTimeString('fr-FR') : fmt === 'full' ? d.toLocaleString('fr-FR') : d.toLocaleDateString('fr-FR');
};


export default function AuditLogs() {
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [actionFilter,setActionFilter]= useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page,        setPage]        = useState(1);
  const [meta,        setMeta]        = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [error,       setError]       = useState(null);
  const PER_PAGE = 20;

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    try {
      const r = await auditService.getAll({
        page, per_page: PER_PAGE,
        action: actionFilter || undefined,
        search: searchTerm || undefined,
        model_type: modelFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }, { signal });
      setLogs(r.data.data || r.data || []);
      setMeta(r.data.meta || null);
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      setError('Erreur lors du chargement des journaux d\'audit');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, searchTerm, modelFilter, dateFrom, dateTo]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSearch = (val) => { setSearchTerm(val); setPage(1); };
  const handleAction = (val) => { setActionFilter(val); setPage(1); };
  const handleModelFilter = (val) => { setModelFilter(val); setPage(1); };
  const handleDateFrom = (val) => { setDateFrom(val); setPage(1); };
  const handleDateTo = (val) => { setDateTo(val); setPage(1); };
  const resetFilters = () => { setSearchTerm(''); setActionFilter(''); setModelFilter(''); setDateFrom(''); setDateTo(''); setPage(1); };

  const handleExportCsv = () => {
    if (!logs.length) return;
    const header = ['ID', 'Date', 'Action', 'Utilisateur', 'Email', 'Modèle', 'ID Modèle', 'IP'];
    const rows = logs.map(l => [
      l.id,
      safeDate(l.created_at || l.date, 'full'),
      l.action,
      l.user?.name || 'Système',
      (() => { const e = l.user?.email || ''; if (!e) return ''; const [u, d] = e.split('@'); return u.length <= 1 ? e : `${u[0]}***@${d}`; })(),
      l.model_type?.split('\\').pop() || '',
      l.model_id || '',
      l.ip_address || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_logs_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Statistiques calculées depuis la page courante ── */
  const statsActions = useMemo(() => {
    const counts = {};
    logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
    return Object.entries(counts)
      .map(([action, total]) => ({ action, total }))
      .sort((a, b) => b.total - a.total);
  }, [logs]);

  const topUsers = useMemo(() => {
    const counts = {};
    logs.forEach(l => {
      const name = l.user?.name || 'Système';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [logs]);


  return (
    <div className="space-y-6 max-w-[1400px]">
      {error && (
        <div role="alert" className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-lg text-xs font-medium">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-[#2563EB]" />
            Audit Logs & Traçabilité
          </h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">
            Historique immuable de toutes les actions sur le système
          </p>
        </div>
      </div>

      {/* KPI cards */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Entrées (page courante)', value: logs.length, color: '#1B4332' },
            { label: 'Utilisateurs actifs', value: new Set(logs.map(l => l.user?.id).filter(Boolean)).size, color: '#16A34A' },
            { label: 'Action dominante', value: statsActions[0]?.action || '—', color: '#D97706', isText: true },
            { label: 'Utilisateur le + actif', value: topUsers[0]?.name || '—', color: '#2563EB', isText: true },
          ].map(({ label, value, color, isText }) => (
            <div key={label} className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="h-1" style={{ background: color }} />
              <div className="px-4 py-3">
                <p className={`font-bold text-[#0F172A] dark:text-white truncate ${isText ? 'text-sm' : 'text-2xl'}`}>{value}</p>
                <p className="text-xs text-[#64748B] dark:text-white/50 font-medium mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Toolbar */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <SearchInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Rechercher par utilisateur, modèle, action, IP…"
            className="flex-1 w-full sm:max-w-md"
            debounceMs={300}
          />
          <select
            value={actionFilter}
            onChange={(e) => handleAction(e.target.value)}
            className="h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
          >
            <option value="">Toutes les actions</option>
            {Object.keys(ACTION_BADGE).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-semibold transition-colors shrink-0 ${showFilters ? 'bg-[#1B4332] border-[#2563EB] text-white' : 'bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#F1F5F9] dark:hover:bg-white/10 border-[#CBD5E1] dark:border-white/10 text-[#475569] dark:text-white/60'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtres avancés
          </button>
          <button
            onClick={() => { setPage(1); fetchData(new AbortController().signal); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#F1F5F9] dark:hover:bg-white/10 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rafraîchir
          </button>
          <button
            onClick={handleExportCsv}
            disabled={!logs.length}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 text-white border border-[#16A34A] rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>
        </div>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="pt-3 border-t border-[#CBD5E1] dark:border-white/15 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] dark:text-white/50 block mb-1.5">Modèle ciblé</label>
                  <select value={modelFilter} onChange={(e) => handleModelFilter(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors">
                    <option value="">Tous les modèles</option>
                    {['Infraction','Accident','Personnel','Victime','Service','User','AmendePieceSaisie','ImmigrationClandestine'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] dark:text-white/50 block mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date de début</label>
                  <input type="date" value={dateFrom} onChange={(e) => handleDateFrom(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] dark:text-white/50 block mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date de fin</label>
                  <input type="date" value={dateTo} onChange={(e) => handleDateTo(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors" />
                </div>
                <div className="flex items-end">
                  <button onClick={resetFilters}
                    className="w-full h-9 px-3 text-sm bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg text-white font-semibold transition-colors">
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/3">
                <th className="px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/40 uppercase tracking-wide">Date & Heure</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/40 uppercase tracking-wide">Action</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/40 uppercase tracking-wide">Utilisateur</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/40 uppercase tracking-wide">Modèle Ciblé</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/40 uppercase tracking-wide">Adresse IP</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/40 uppercase tracking-wide text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <ShimmerTableRows rows={6} cols={6} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-16 text-center text-sm text-[#94A3B8] dark:text-white/30">
                    Aucun journal d'audit ne correspond à vos critères.
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-[#0F172A] dark:text-white text-xs">
                      {safeDate(log.created_at || log.date)}
                    </span>
                    <span className="text-[#94A3B8] dark:text-white/30 text-xs font-mono ml-1.5">
                      {safeDate(log.created_at || log.date, 'time')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${actionBadgeCls(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-[#0F172A] dark:text-white text-xs">{log.user?.name || 'Système'}</p>
                    <p className="text-[#94A3B8] dark:text-white/30 text-xs">{log.user?.email || 'Automate'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {log.model_type ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#475569] text-white">
                        {log.model_type.split('\\').pop()} #{log.model_id}
                      </span>
                    ) : (
                      <span className="text-xs text-[#94A3B8] dark:text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-[#64748B] dark:text-white/50">
                      <Globe className="w-3.5 h-3.5 text-[#94A3B8]" />
                      {log.ip_address || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4332] hover:bg-[#143728] text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspecter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-5 py-3 border-t border-[#CBD5E1] dark:border-white/15 flex items-center justify-between text-xs text-[#64748B] dark:text-white/40">
            <span>{meta.from}–{meta.to} sur {meta.total} entrées</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Page précédente"
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-md font-medium">
                {page} / {meta.last_page}
              </span>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} aria-label="Page suivante"
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspection modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/10 rounded-xl w-full max-w-4xl shadow-lg overflow-hidden flex flex-col my-8 max-h-[85vh]"
            >
              <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 flex items-center justify-between bg-[#F8FAFC] dark:bg-white/3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1B4332] rounded-xl flex items-center justify-center shadow-sm">
                    <Terminal className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Inspection Log #{selectedLog.id}</p>
                    <p className="text-xs text-[#64748B] dark:text-white/40">Audit de sécurité GESCRIM</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLog(null)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Date & Heure', value: safeDate(selectedLog.created_at || selectedLog.date, 'full') },
                    { label: 'Opérateur', value: selectedLog.user?.name || 'Système' },
                    { label: 'Action', custom: <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mt-1 ${actionBadgeCls(selectedLog.action)}`}>{selectedLog.action}</span> },
                    { label: 'Adresse IP', value: selectedLog.ip_address || 'Non spécifiée', mono: true },
                  ].map(({ label, value, custom, mono }) => (
                    <div key={label} className="p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg">
                      <p className="text-[10px] uppercase font-semibold text-[#94A3B8] dark:text-white/30 mb-1">{label}</p>
                      {custom || <p className={`text-sm font-semibold text-[#0F172A] dark:text-white truncate ${mono ? 'font-mono' : ''}`}>{value}</p>}
                    </div>
                  ))}
                </div>

                {selectedLog.user_agent && (
                  <div className="p-3.5 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg flex items-start gap-2.5">
                    <Cpu className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[#94A3B8] dark:text-white/30 mb-1">Signature Navigateur</p>
                      <p className="text-xs font-mono text-[#475569] dark:text-white/60 leading-relaxed break-all">{selectedLog.user_agent}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#2563EB]" />
                    Comparatif des modifications
                  </h4>
                  {(!selectedLog.old_values || Object.keys(selectedLog.old_values).length === 0) &&
                   (!selectedLog.new_values || Object.keys(selectedLog.new_values).length === 0) ? (
                    <div className="py-10 text-center border border-dashed border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#94A3B8] dark:text-white/30">
                      Aucune modification de valeur associée à cet événement.
                    </div>
                  ) : (
                    <div className="border border-[#CBD5E1] dark:border-white/10 rounded-xl overflow-hidden overflow-x-auto">
                      <div className="grid grid-cols-3 bg-[#F8FAFC] dark:bg-white/3 border-b border-[#CBD5E1] dark:border-white/15 divide-x divide-[#CBD5E1] dark:divide-white/15">
                        <div className="px-4 py-2.5 text-xs font-semibold text-[#64748B] dark:text-white/40">Champ</div>
                        <div className="px-4 py-2.5 text-xs font-semibold text-[#DC2626]">Valeur Précédente</div>
                        <div className="px-4 py-2.5 text-xs font-semibold text-[#16A34A]">Nouvelle Valeur</div>
                      </div>
                      <div className="divide-y divide-[#F1F5F9] dark:divide-white/5 text-xs font-mono bg-white dark:bg-[#343a40]">
                        {getDiffKeys(selectedLog.old_values, selectedLog.new_values).map((key) => {
                          const oldVal = selectedLog.old_values?.[key];
                          const newVal = selectedLog.new_values?.[key];
                          const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                          return (
                            <div key={key} className={`grid grid-cols-3 divide-x divide-[#F1F5F9] dark:divide-white/5 ${isChanged ? 'bg-[#FFFBEB]/40 dark:bg-yellow-900/10' : ''}`}>
                              <div className="px-4 py-3 font-semibold text-[#475569] dark:text-white/60 break-all self-center">{key}</div>
                              <div className="px-4 py-3 text-[#DC2626] break-all leading-relaxed whitespace-pre-wrap">
                                {oldVal !== undefined && oldVal !== null
                                  ? (typeof oldVal === 'object' ? JSON.stringify(oldVal, null, 2) : String(oldVal))
                                  : <span className="text-[#CBD5E1] dark:text-white/20 italic">N/A</span>}
                              </div>
                              <div className="px-4 py-3 text-[#16A34A] break-all leading-relaxed whitespace-pre-wrap font-semibold">
                                {newVal !== undefined && newVal !== null
                                  ? (typeof newVal === 'object' ? JSON.stringify(newVal, null, 2) : String(newVal))
                                  : <span className="text-[#CBD5E1] dark:text-white/20 italic font-normal">Supprimé / Nul</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/3 flex justify-end">
                <button onClick={() => setSelectedLog(null)} className="px-5 py-2 bg-[#0F172A] dark:bg-white dark:text-[#0F172A] hover:bg-[#343a40] text-white rounded-lg text-xs font-semibold transition-colors">
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
