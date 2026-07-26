import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle,
  Clock, Database, AlertTriangle, ArrowDownToLine,
  ShieldCheck, Server, Smartphone, GitMerge,
  ChevronDown, ChevronRight, X,
} from 'lucide-react';
import syncService from '../services/syncService';
import { Toast, useToast } from '../components/ui/Toast';

/* ─────────────────────────────────────── helpers ── */

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const fmtShort = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

/* KPI card */
function KpiCard({ icon: Icon, label, value, sub, colorCls, bgCls, loading }) {
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgCls}`}>
        <Icon className={`w-5 h-5 ${colorCls}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#64748B] dark:text-white/50 font-medium">{label}</p>
        {loading ? (
          <div className="shimmer rounded mt-1.5 h-6 w-20" />
        ) : (
          <p className={`text-2xl font-bold mt-0.5 ${colorCls}`}>{value ?? '—'}</p>
        )}
        {sub && !loading && (
          <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

/* conflict resolution button */
function ConflictBtn({ label, colorCls, borderCls, hoverCls, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${colorCls} ${borderCls} ${hoverCls}`}
    >
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function SyncOffline() {
  /* ── status state ── */
  const [status,       setStatus]       = useState(null);
  const [statusLoading,setStatusLoading]= useState(true);
  const [statusError,  setStatusError]  = useState(null);

  /* ── sync state ── */
  const [syncing,      setSyncing]      = useState(false);
  const [syncInfractions, setSyncInfractions] = useState(true);
  const [syncAccidents,   setSyncAccidents]   = useState(true);

  /* ── journal (local history, max 10) ── */
  const [journal, setJournal] = useState([]);

  /* ── conflicts panel ── */
  const [conflicts,        setConflicts]        = useState([]);
  const [resolvedConflicts,setResolvedConflicts] = useState([]);
  const [expandedConflict, setExpandedConflict] = useState(null);

  /* ── ui ── */
  const { toast, showToast } = useToast();

  /* ─── fetch status ─── */
  const fetchStatus = useCallback(async (signal) => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await syncService.status({ signal });
      const data = res.data ?? res;
      setStatus(data);
      /* hydrate conflicts if any */
      if (Array.isArray(data.conflicts) && data.conflicts.length > 0) {
        setConflicts(data.conflicts.map((c, i) => ({ ...c, _id: c.id ?? i })));
      } else {
        setConflicts([]);
      }
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      setStatusError(e?.response?.data?.message || 'Impossible de récupérer le statut de synchronisation.');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStatus(controller.signal);
    return () => controller.abort();
  }, [fetchStatus]);

  /* ─── sync now ─── */
  const handleSync = async () => {
    if (!syncInfractions && !syncAccidents) {
      showToast('Sélectionnez au moins un type de données.', 'error');
      return;
    }
    setSyncing(true);
    const startedAt = new Date().toISOString();
    try {
      const payload = {
        ...(syncInfractions ? { infractions: [] } : {}),
        ...(syncAccidents   ? { accidents:   [] } : {}),
      };
      const res = await syncService.batch(payload);
      const data = res.data ?? res;

      const entry = {
        id:          Date.now(),
        date:        startedAt,
        infractions: data.infractions?.synced ?? data.synced_infractions ?? 0,
        accidents:   data.accidents?.synced   ?? data.synced_accidents   ?? 0,
        pending:     (data.pending_infractions ?? 0) + (data.pending_accidents ?? 0),
        status:      'success',
      };
      setJournal(prev => [entry, ...prev].slice(0, 10));
      showToast(`Synchronisation réussie — ${entry.infractions + entry.accidents} élément(s) traité(s).`);
      fetchStatus();
    } catch (e) {
      const entry = {
        id: Date.now(), date: startedAt,
        infractions: 0, accidents: 0, pending: 0,
        status: 'error',
      };
      setJournal(prev => [entry, ...prev].slice(0, 10));
      showToast(e?.response?.data?.message || 'Erreur lors de la synchronisation.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  /* ─── resolve conflict ─── */
  const resolveConflict = (conflictId, resolution) => {
    setResolvedConflicts(prev => [...prev, { id: conflictId, resolution }]);
    setConflicts(prev => prev.filter(c => c._id !== conflictId));
    const labels = {
      local:  'Données locales conservées.',
      server: 'Données serveur conservées.',
      ignore: 'Conflit ignoré.',
    };
    showToast(labels[resolution] || 'Conflit résolu.');
  };

  /* ─── computed ─── */
  const syncedTotal   = (status?.synced_infractions ?? 0) + (status?.synced_accidents ?? 0);
  const pendingTotal  = (status?.pending_infractions ?? 0) + (status?.pending_accidents ?? 0);
  const conflictCount = conflicts.length;

  /* ══════════ RENDER ══════════ */
  return (
    <div className="space-y-6 max-w-[1200px]">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <ArrowDownToLine className="w-6 h-6 text-[#2563EB]" />
            Synchronisation Offline
          </h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">
            Gestion de la synchronisation des terminaux mobiles Flutter
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={statusLoading}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#F1F5F9] dark:hover:bg-white/10 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
          Actualiser le statut
        </button>
      </div>

      {/* ── Status error banner ── */}
      <AnimatePresence>
        {statusError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-sm text-[#DC2626]"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{statusError}</span>
            <button onClick={() => setStatusError(null)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Dashboard ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Database}
          label="Données synchronisées"
          value={syncedTotal.toLocaleString('fr-FR')}
          sub={`${status?.synced_infractions ?? 0} infractions · ${status?.synced_accidents ?? 0} accidents`}
          colorCls="text-[#16A34A]"
          bgCls="bg-[#F0FDF4]"
          loading={statusLoading}
        />
        <KpiCard
          icon={WifiOff}
          label="Données en attente"
          value={pendingTotal.toLocaleString('fr-FR')}
          sub={`${status?.pending_infractions ?? 0} infractions · ${status?.pending_accidents ?? 0} accidents`}
          colorCls={pendingTotal > 0 ? 'text-[#D97706]' : 'text-[#64748B]'}
          bgCls={pendingTotal > 0 ? 'bg-[#FFFBEB]' : 'bg-[#F8FAFC]'}
          loading={statusLoading}
        />
        <KpiCard
          icon={Clock}
          label="Dernière synchronisation"
          value={status?.last_sync_at ? fmtShort(status.last_sync_at) : 'Jamais'}
          sub={status?.last_sync_at ? fmtDate(status.last_sync_at) : 'Aucune sync effectuée'}
          colorCls="text-[#2563EB]"
          bgCls="bg-[#EFF6FF]"
          loading={statusLoading}
        />
        <KpiCard
          icon={GitMerge}
          label="Conflits détectés"
          value={conflictCount}
          sub={conflictCount > 0 ? 'Résolution requise' : 'Aucun conflit'}
          colorCls={conflictCount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}
          bgCls={conflictCount > 0 ? 'bg-[#FEF2F2]' : 'bg-[#F0FDF4]'}
          loading={statusLoading}
        />
      </div>

      {/* ── Actions panel ── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-5">
        <p className="text-sm font-semibold text-[#0F172A] dark:text-white mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#2563EB]" />
          Lancer une synchronisation
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Selective checkboxes */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setSyncInfractions(v => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  syncInfractions
                    ? 'bg-[#1B4332] border-[#2563EB]'
                    : 'bg-white dark:bg-white/5 border-[#CBD5E1] dark:border-white/20'
                }`}
              >
                {syncInfractions && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-[#0F172A] dark:text-white font-medium">Infractions</span>
              {status && !statusLoading && (
                <span className="text-[10px] text-[#94A3B8] dark:text-white/30">
                  ({status.pending_infractions ?? 0} en attente)
                </span>
              )}
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setSyncAccidents(v => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  syncAccidents
                    ? 'bg-[#1B4332] border-[#2563EB]'
                    : 'bg-white dark:bg-white/5 border-[#CBD5E1] dark:border-white/20'
                }`}
              >
                {syncAccidents && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-[#0F172A] dark:text-white font-medium">Accidents</span>
              {status && !statusLoading && (
                <span className="text-[10px] text-[#94A3B8] dark:text-white/30">
                  ({status.pending_accidents ?? 0} en attente)
                </span>
              )}
            </label>
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing || (!syncInfractions && !syncAccidents)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {syncing
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Synchronisation…</>
              : <><ArrowDownToLine className="w-4 h-4" /> Synchroniser maintenant</>
            }
          </button>
        </div>

        {/* Sync progress indicator */}
        <AnimatePresence>
          {syncing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="flex items-center gap-3 p-3 bg-[#EFF6FF] dark:bg-[#1B4332]/10 border border-[#BFDBFE] dark:border-[#2563EB]/20 rounded-lg">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }}
                      className="w-2 h-2 bg-[#1B4332] rounded-full"
                    />
                  ))}
                </div>
                <p className="text-xs text-[#2563EB] font-medium">
                  Synchronisation en cours — merci de patienter…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Journal de synchronisation ── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center gap-2">
          <Server className="w-4 h-4 text-[#64748B] dark:text-white/40" />
          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
            Journal de synchronisation
          </p>
          <span className="text-[10px] text-[#94A3B8] dark:text-white/30 font-normal ml-1">
            (10 dernières sessions)
          </span>
        </div>

        {journal.length === 0 ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F1F5F9] dark:bg-white/5 flex items-center justify-center">
              <Database className="w-5 h-5 text-[#94A3B8] dark:text-white/30" />
            </div>
            <p className="text-sm text-[#94A3B8] dark:text-white/30">
              Aucune synchronisation effectuée dans cette session.
            </p>
            <p className="text-xs text-[#CBD5E1] dark:text-white/20">
              Lancez une synchronisation pour voir l'historique.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F1F5F9] dark:border-white/5">
                  {['Date / Heure', 'Infractions sync.', 'Accidents sync.', 'En attente', 'Statut'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {journal.map(entry => (
                  <tr key={entry.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-[#64748B] dark:text-white/40 whitespace-nowrap font-mono">
                      {fmtDate(entry.date)}
                    </td>
                    <td className="px-5 py-3 text-[#0F172A] dark:text-white font-semibold">
                      {entry.infractions.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-5 py-3 text-[#0F172A] dark:text-white font-semibold">
                      {entry.accidents.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-5 py-3 text-[#64748B] dark:text-white/40">
                      {entry.pending.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-5 py-3">
                      {entry.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]">
                          <CheckCircle className="w-3 h-3" /> Succès
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]">
                          <AlertCircle className="w-3 h-3" /> Erreur
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Résolution des conflits ── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#7C3AED]" />
            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Résolution des conflits
            </p>
            {conflictCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                {conflictCount}
              </span>
            )}
          </div>
          {resolvedConflicts.length > 0 && (
            <span className="text-[11px] text-[#16A34A] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {resolvedConflicts.length} résolu{resolvedConflicts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {statusLoading ? (
          <div className="px-5 py-5 space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-[#F1F5F9] dark:bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : conflictCount === 0 ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#16A34A]" />
            </div>
            <p className="text-sm font-semibold text-[#16A34A]">Aucun conflit détecté</p>
            <p className="text-xs text-[#94A3B8] dark:text-white/30">
              Toutes les données sont cohérentes entre les terminaux et le serveur.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
            {conflicts.map(conflict => {
              const isExpanded = expandedConflict === conflict._id;
              return (
                <div key={conflict._id} className="px-5 py-4 space-y-3">
                  {/* Conflict header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {conflict.type ? `Conflit — ${conflict.type}` : `Conflit #${conflict._id + 1}`}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-white/40 mt-0.5">
                          ID: {conflict.id ?? conflict._id}
                          {conflict.detected_at ? ` · Détecté ${fmtShort(conflict.detected_at)}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedConflict(isExpanded ? null : conflict._id)}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors shrink-0"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded diff view */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          {/* Local */}
                          <div className="bg-[#FFFBEB] dark:bg-[#D97706]/10 border border-[#FDE68A] dark:border-[#D97706]/20 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Smartphone className="w-3.5 h-3.5 text-[#D97706]" />
                              <p className="text-[10px] font-bold text-[#D97706] uppercase tracking-wide">
                                Données locales (terminal)
                              </p>
                            </div>
                            <pre className="text-[10px] text-[#92400E] dark:text-[#FDE68A] whitespace-pre-wrap break-all leading-relaxed">
                              {conflict.local_data
                                ? JSON.stringify(conflict.local_data, null, 2)
                                : '{ "info": "Données locales non disponibles" }'}
                            </pre>
                          </div>

                          {/* Server */}
                          <div className="bg-[#EFF6FF] dark:bg-[#1B4332]/10 border border-[#BFDBFE] dark:border-[#2563EB]/20 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Server className="w-3.5 h-3.5 text-[#2563EB]" />
                              <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wide">
                                Données serveur
                              </p>
                            </div>
                            <pre className="text-[10px] text-[#1E40AF] dark:text-[#BFDBFE] whitespace-pre-wrap break-all leading-relaxed">
                              {conflict.server_data
                                ? JSON.stringify(conflict.server_data, null, 2)
                                : '{ "info": "Données serveur non disponibles" }'}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Resolution actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <ConflictBtn
                      label="Conserver local"
                      colorCls="bg-[#FFFBEB] text-[#D97706]"
                      borderCls="border-[#FDE68A]"
                      hoverCls="hover:bg-[#FEF3C7]"
                      onClick={() => resolveConflict(conflict._id, 'local')}
                    />
                    <ConflictBtn
                      label="Conserver serveur"
                      colorCls="bg-[#EFF6FF] text-[#2563EB]"
                      borderCls="border-[#BFDBFE]"
                      hoverCls="hover:bg-[#DBEAFE]"
                      onClick={() => resolveConflict(conflict._id, 'server')}
                    />
                    <ConflictBtn
                      label="Ignorer"
                      colorCls="bg-[#F8FAFC] text-[#64748B]"
                      borderCls="border-[#CBD5E1]"
                      hoverCls="hover:bg-[#F1F5F9] dark:hover:bg-white/5"
                      onClick={() => resolveConflict(conflict._id, 'ignore')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
