import { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast, useToast } from '../components/ui/Toast';
import {
  Download, FileText, UploadCloud, RefreshCw, CheckCircle, AlertCircle,
  X, ShieldAlert, FileJson, Filter, Table2, FileSpreadsheet, FileDown,
  Loader2, ChevronDown, BarChart3, Clock, Database, Upload,
} from 'lucide-react';
import exportService from '../services/exportService';
import syncService from '../services/syncService';
import GeoFilterComponent from '../components/GeoFilterComponent';
import ExportModal from '../components/ui/ExportModal';
import api from '../api/axios';

const inputCls = 'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-colors font-medium dark:placeholder-white/30';

export default function Rapports() {
  const perms = usePermissions();
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('');
  const [filters, setFilters] = useState({});
  const { toast, showToast } = useToast();

  const [tempFilterType, setTempFilterType] = useState('all');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('');

  const [syncHistoryOpen, setSyncHistoryOpen] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncCheckedAt, setSyncCheckedAt] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const [fullReportFormat, setFullReportFormat] = useState('pdf');
  const [fullReportLoading, setFullReportLoading] = useState(false);

  const [exportCount, setExportCount] = useState(0);
  const [exportModule, setExportModule] = useState(null);

  if (!perms.canViewRapports) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <ShieldAlert className="w-12 h-12 text-[#DC2626]" />
        <p className="text-lg font-semibold text-[#0F172A] dark:text-white">Accès non autorisé</p>
        <p className="text-sm text-[#64748B] dark:text-white/50">Vous n'avez pas les droits pour accéder aux rapports.</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },     { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre'},{ value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },{ value: '12', label: 'Décembre' },
  ];

  const getCombinedParams = () => {
    const params = { ...filters };
    if (tempFilterType === 'day' && selectedDay) {
      params.date_from = selectedDay;
      params.date_to   = selectedDay;
    } else if (tempFilterType === 'month' && selectedMonth && selectedYear) {
      const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
      params.date_from = `${selectedYear}-${selectedMonth}-01`;
      params.date_to   = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    } else if (tempFilterType === 'year' && selectedYear) {
      params.date_from = `${selectedYear}-01-01`;
      params.date_to   = `${selectedYear}-12-31`;
      params.annee     = selectedYear;
    } else if (tempFilterType === 'period') {
      if (startDate) params.date_from = startDate;
      if (endDate)   params.date_to   = endDate;
    }
    if (selectedHour) params.hour = selectedHour;
    return params;
  };

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (type, format) => {
    setLoading(true);
    setLoadingType(`${type}-${format}`);
    try {
      const p = getCombinedParams();
      const date = new Date().toISOString().slice(0, 10);

      if (type === 'infractions' && format === 'pdf') {
        const res = await exportService.infractionsPdf(p);
        triggerDownload(res.data, `infractions_${date}.pdf`);
      } else if (type === 'infractions' && format === 'csv') {
        const res = await exportService.infractionsCsv(p);
        triggerDownload(res.data, `infractions_${date}.csv`);
      } else if (type === 'accidents' && format === 'pdf') {
        const res = await exportService.accidentsPdf(p);
        triggerDownload(res.data, `accidents_${date}.pdf`);
      } else if (type === 'accidents' && format === 'csv') {
        const res = await exportService.accidentsCsv(p);
        triggerDownload(res.data, `accidents_${date}.csv`);
      } else if (type === 'personnel' && format === 'csv') {
        const res = await exportService.personnelCsv(p);
        triggerDownload(res.data, `personnel_${date}.csv`);
      } else if (type === 'victimes' && format === 'csv') {
        const res = await exportService.victimesCsv(p);
        triggerDownload(res.data, `victimes_${date}.csv`);
      } else if (type === 'immigration' && format === 'csv') {
        const res = await exportService.immigrationCsv(p);
        triggerDownload(res.data, `immigration_${date}.csv`);
      }

      setExportCount(c => c + 1);
      showToast(`Export ${type} (${format.toUpperCase()}) téléchargé.`);
    } catch (e) {
      if (import.meta.env.DEV) console.error(e);
      const msg = e?.code === 'EMPTY_EXPORT' ? e.message : "Erreur lors de l'exportation.";
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setLoadingType('');
    }
  };

  const checkSyncStatus = async () => {
    try {
      const r = await syncService.status();
      const data = r.data?.data || r.data || {};
      setSyncStatus(data);
      const now = new Date();
      setSyncCheckedAt(now);
      setSyncHistory(prev => [
        { date: now.toISOString(), infractions_synced: data.synced_infractions || 0, accidents_synced: data.synced_accidents || 0, pending: (data.pending_infractions || 0) + (data.pending_accidents || 0), status: 'success' },
        ...prev.slice(0, 9),
      ]);
      showToast('Statut de synchronisation récupéré.');
    } catch {
      const now = new Date();
      setSyncHistory(prev => [
        { date: now.toISOString(), infractions_synced: 0, accidents_synced: 0, pending: 0, status: 'error' },
        ...prev.slice(0, 9),
      ]);
      showToast('Erreur lors de la récupération du statut.', 'error');
    }
  };

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.json') || file.type === 'application/json')) { setSelectedFile(file); setUploadError(null); setUploadSuccess(null); }
    else if (file) { setUploadError('Type de fichier invalide. Fichiers JSON uniquement.'); }
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.json') || file.type === 'application/json')) { setSelectedFile(file); setUploadError(null); setUploadSuccess(null); }
    else if (file) { setUploadError('Type de fichier invalide. Fichiers JSON uniquement.'); }
  };
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); setUploadError(null); setUploadSuccess(null);
    try {
      const res = await exportService.importJson(selectedFile);
      setUploadSuccess(res.data?.message || 'Données importées avec succès !');
      setSelectedFile(null);
    } catch (err) {
      setUploadError(err.response?.data?.error || err.response?.data?.message || 'Erreur lors de l\'import.');
    } finally { setUploading(false); }
  };

  const handleFullReport = async () => {
    setFullReportLoading(true);
    try {
      const payload = { format: fullReportFormat, periodType: 'last_all' };
      if (tempFilterType === 'day' && selectedDay) { payload.periodType = 'custom'; payload.start_date = selectedDay; payload.end_date = selectedDay; }
      else if (tempFilterType === 'month' && selectedMonth && selectedYear) { payload.periodType = 'specific_month'; payload.month = parseInt(selectedMonth); payload.year = parseInt(selectedYear); }
      else if (tempFilterType === 'year' && selectedYear) { payload.periodType = 'current_year'; payload.year = parseInt(selectedYear); }
      else if (tempFilterType === 'period' && startDate && endDate) { payload.periodType = 'custom'; payload.start_date = startDate; payload.end_date = endDate; }

      const res = await api.post('/export/full-report', payload, { responseType: 'blob' });
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        showToast(json.message || 'Erreur lors de la génération.', 'error');
        return;
      }
      const ext = { pdf: 'pdf', excel: 'csv', word: 'docx' };
      const blob = new Blob([res.data], { type: contentType });
      triggerDownload(blob, `rapport_complet_gescrim_${new Date().toISOString().slice(0, 10)}.${ext[fullReportFormat]}`);
      setFullReportOpen(false);
      setExportCount(c => c + 1);
      showToast('Rapport complet téléchargé.');
    } catch {
      showToast("Erreur lors de la génération du rapport.", 'error');
    } finally { setFullReportLoading(false); }
  };

  const ExportCard = ({ type, format, label, sub, badge }) => {
    const isLoading = loadingType === `${type}-${format}`;
    return (
      <button
        onClick={() => handleExport(type, format)}
        disabled={loading}
        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-2xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 disabled:opacity-50 group text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${format === 'pdf' ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`}>
          {isLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <FileText className="w-5 h-5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#0F172A] dark:text-white text-sm">{label}</p>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white ${format === 'pdf' ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`}>{badge || format.toUpperCase()}</span>
          </div>
          <p className="text-xs text-[#94A3B8] dark:text-white/30 mt-0.5">{sub}</p>
        </div>
        <Download className="w-4 h-4 text-[#94A3B8] group-hover:text-[#1B4332] transition-colors shrink-0" />
      </button>
    );
  };

  return (
    <div className="space-y-8 max-w-[1400px]">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      {/* ═══ 1. Header ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Rapports & Exports</h1>
            <p className="text-sm text-[#64748B] dark:text-white/50">Générer des documents et synchroniser les terminaux</p>
          </div>
        </div>
        {perms.canExportData && (
          <button
            onClick={() => setFullReportOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] hover:bg-[#143728] text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            Tout exporter
          </button>
        )}
      </div>

      {/* ═══ 2. Statistiques ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Exports aujourd\'hui', value: exportCount, color: '#1B4332', icon: BarChart3 },
          { label: 'Exports CSV', value: '5 modules', color: '#16A34A', icon: Table2 },
          { label: 'Dernière sync', value: syncCheckedAt ? syncCheckedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—', color: '#D97706', icon: Clock },
          { label: 'Imports JSON', value: uploadSuccess ? '1' : '0', color: '#7C3AED', icon: Database },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="h-1" style={{ background: color }} />
            <div className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color }}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#0F172A] dark:text-white">{value}</p>
                <p className="text-[11px] text-[#64748B] dark:text-white/50">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ 3. Filtres (toujours visibles) ═══ */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-[#CBD5E1] dark:border-white/15">
          <div className="w-8 h-8 bg-[#1B4332] rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">Filtres des exports CSV</p>
            <p className="text-xs text-[#64748B] dark:text-white/50">Territoire, période, heure — appliqués aux exports rapides ci-dessous</p>
          </div>
        </div>
        <div className="px-5 pb-5 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] dark:text-white/50">Territoire</span>
              <GeoFilterComponent onChange={(f) => setFilters(f)} />
            </div>
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Période</label>
              <select value={tempFilterType} onChange={(e) => { setTempFilterType(e.target.value); setSelectedDay(''); setSelectedMonth(''); setSelectedYear(''); setStartDate(''); setEndDate(''); }} className={inputCls}>
                <option value="all">Tous</option>
                <option value="day">Par jour</option>
                <option value="month">Par mois</option>
                <option value="year">Par année</option>
                <option value="period">Plage personnalisée</option>
              </select>
            </div>
            <div className="md:col-span-4 flex flex-col gap-1.5">
              {tempFilterType === 'day' && (
                <>
                  <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Date</label>
                  <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className={inputCls} />
                </>
              )}
              {tempFilterType === 'month' && (
                <>
                  <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Mois / Année</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={inputCls}>
                      <option value="">Mois</option>
                      {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={inputCls}>
                      <option value="">Année</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </>
              )}
              {tempFilterType === 'year' && (
                <>
                  <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Année</label>
                  <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={inputCls}>
                    <option value="">Année</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </>
              )}
              {tempFilterType === 'period' && (
                <>
                  <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Du — Au</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} placeholder="Début" />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} placeholder="Fin" />
                  </div>
                </>
              )}
              {tempFilterType === 'all' && <p className="text-xs text-[#94A3B8] dark:text-white/30 italic pt-5">Aucun filtre de date — tous les enregistrements.</p>}
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Heure</label>
              <select value={selectedHour} onChange={e => setSelectedHour(e.target.value)} className={inputCls}>
                <option value="">Toutes</option>
                {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}h</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 4 & 5. Exports (PDF/Excel/Word via ExportModal) ═══ */}
      {perms.canExportData && (
        <div>
          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white mb-4">Exporter par module</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[
              { module: 'infractions',        label: 'Infractions',          sub: 'PDF, Excel ou Word — fiches complètes',          color: '#DC2626' },
              { module: 'accidents',          label: 'Accidents',             sub: 'PDF, Excel ou Word — synthèse ANASER multi-régions', color: '#D97706' },
              { module: 'immigrations',       label: 'Immigration',           sub: 'PDF, Excel ou Word — zones et nationalités',         color: '#1B4332' },
              { module: 'amendes',            label: 'Amendes & Pièces',      sub: 'PDF, Excel ou Word — types et montants',             color: '#7C3AED' },
              { module: 'personnels',         label: 'Personnel DSP',         sub: 'PDF, Excel ou Word — grades et effectifs',           color: '#0369A1' },
              { module: 'victimes',           label: 'Victimes & Impliqués',  sub: 'PDF, Excel ou Word — gravité et nationalités',       color: '#BE123C' },
              { module: 'services-remuneres', label: 'Services Rémunérés',    sub: 'PDF, Excel ou Word — prestations et recettes',       color: '#065F46' },
            ].map(({ module, label, sub, color }) => (
              <button
                key={module}
                onClick={() => setExportModule({ module, label })}
                className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-2xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#0F172A] dark:text-white text-sm">{label}</p>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white bg-[#475569]">PDF/Excel/Word</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] dark:text-white/30 mt-0.5">{sub}</p>
                </div>
                <Download className="w-4 h-4 text-[#94A3B8] group-hover:text-[#1B4332] transition-colors shrink-0" />
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white mb-4 mt-8">Exports CSV rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <ExportCard type="infractions" format="csv" label="Infractions" sub="Données brutes • Délimiteur point-virgule" badge="CSV" />
            <ExportCard type="accidents" format="csv" label="Accidents" sub="Coordonnées GPS incluses" badge="CSV" />
            <ExportCard type="personnel" format="csv" label="Personnel DSP" sub="Grades, services, statuts" badge="CSV" />
            <ExportCard type="victimes" format="csv" label="Victimes & Impliqués" sub="CIN, nationalité, liens" badge="CSV" />
            <ExportCard type="immigration" format="csv" label="Immigration Clandestine" sub="Zones, nationalités, genres" badge="CSV" />
          </div>
        </div>
      )}

      {/* ExportModal — reçoit les filtres de la page (période + territoire) */}
      {exportModule && (
        <ExportModal
          isOpen={!!exportModule}
          onClose={() => { setExportModule(null); setExportCount(c => c + 1); }}
          module={exportModule.module}
          moduleLabel={exportModule.label}
          initialFilters={{
            periodType: tempFilterType === 'day'    ? 'custom'
                      : tempFilterType === 'month'  ? 'specific_month'
                      : tempFilterType === 'year'   ? 'current_year'
                      : tempFilterType === 'period' ? 'custom'
                      : 'last_30d',
            startDate: tempFilterType === 'day' ? selectedDay
                     : tempFilterType === 'period' ? startDate : '',
            endDate:   tempFilterType === 'day' ? selectedDay
                     : tempFilterType === 'period' ? endDate : '',
            month: tempFilterType === 'month' ? parseInt(selectedMonth) : undefined,
            year:  (tempFilterType === 'month' || tempFilterType === 'year') ? parseInt(selectedYear) : undefined,
          }}
          geoFilters={filters}
        />
      )}

      {/* ═══ 6. Import JSON ═══ */}
      {perms.canImportData && (
        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Importation JSON</p>
              <p className="text-xs text-[#64748B] dark:text-white/50">Format standard GESCRIM</p>
            </div>
          </div>

          <form
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center transition-all ${dragActive ? 'border-[#1B4332] bg-[#F0FDF4]/40 dark:bg-[#1B4332]/10' : 'border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/3'}`}
          >
            <input type="file" id="file-json-upload" accept=".json" onChange={handleFileChange} className="hidden" />
            <UploadCloud className="w-8 h-8 text-[#94A3B8] dark:text-white/30 mb-2" />
            <p className="text-sm text-[#475569] dark:text-white/60 text-center">
              Glissez un fichier ici ou{' '}
              <label htmlFor="file-json-upload" className="text-[#1B4332] dark:text-[#52B788] hover:underline cursor-pointer font-semibold">parcourir</label>
            </p>
            <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-1">Fichiers .json uniquement</p>
          </form>

          {selectedFile && (
            <div className="mt-4 p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileJson className="w-4 h-4 text-[#1B4332] dark:text-[#52B788] shrink-0" />
                <span className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">{selectedFile.name}</span>
                <span className="text-[10px] text-[#94A3B8] shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleUpload} disabled={uploading} className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                  {uploading ? 'Import…' : 'Confirmer'}
                </button>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-[#F1F5F9] dark:hover:bg-white/5 rounded text-[#94A3B8]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {uploadSuccess && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 p-3 bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] rounded-lg flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 shrink-0" /> {uploadSuccess}
              </motion.div>
            )}
            {uploadError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-lg flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ 7. Synchronisation mobile ═══ */}
      {(perms.canViewAuditLogs || perms.canViewPermissions) && (
        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D97706] rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Synchronisation Mobile</p>
                <p className="text-xs text-[#64748B] dark:text-white/50">
                  {syncCheckedAt ? `Dernière vérif. : ${syncCheckedAt.toLocaleString('fr-FR')}` : 'Statut des terminaux Flutter'}
                </p>
              </div>
            </div>
            <button onClick={checkSyncStatus} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Vérifier
            </button>
          </div>

          {syncStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Infractions sync.', value: syncStatus.synced_infractions ?? 0, color: '#16A34A' },
                { label: 'Accidents sync.', value: syncStatus.synced_accidents ?? 0, color: '#1B4332' },
                { label: 'Infractions en attente', value: syncStatus.pending_infractions ?? 0, color: '#D97706' },
                { label: 'Accidents en attente', value: syncStatus.pending_accidents ?? 0, color: '#DC2626' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden">
                  <div className="h-1" style={{ background: color }} />
                  <div className="p-3">
                    <p className="text-xl font-bold text-[#0F172A] dark:text-white">{value}</p>
                    <p className="text-[10px] text-[#64748B] dark:text-white/50 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!syncStatus && (
            <p className="text-xs text-[#94A3B8] dark:text-white/30">Cliquez sur « Vérifier » pour obtenir le statut.</p>
          )}

          {/* Historique repliable */}
          {syncHistory.length > 0 && (
            <div>
              <button onClick={() => setSyncHistoryOpen(v => !v)} className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white transition-colors">
                <ChevronDown className={`w-4 h-4 transition-transform ${syncHistoryOpen ? 'rotate-180' : ''}`} />
                Historique ({syncHistory.length})
              </button>
              <AnimatePresence>
                {syncHistoryOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[#F8FAFC] dark:bg-white/3 border-b border-[#CBD5E1] dark:border-white/15">
                            {['Date', 'Infr. sync.', 'Acc. sync.', 'En attente', 'Statut'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-[#64748B] dark:text-white/40 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                          {syncHistory.map((entry, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-[#475569] dark:text-white/60 font-mono">{new Date(entry.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-3 py-2 font-semibold text-[#16A34A]">{entry.infractions_synced}</td>
                              <td className="px-3 py-2 font-semibold text-[#1B4332] dark:text-[#52B788]">{entry.accidents_synced}</td>
                              <td className="px-3 py-2 font-semibold text-[#D97706]">{entry.pending}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase text-white ${entry.status === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
                                  {entry.status === 'success' ? 'OK' : 'Err'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ═══ 8. Modal "Tout exporter" ═══ */}
      <AnimatePresence>
        {fullReportOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setFullReportOpen(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-bold text-[#0F172A] dark:text-white text-lg">Rapport complet</p>
                  <p className="text-xs text-[#64748B] dark:text-white/50 mt-0.5">Les filtres appliqués seront utilisés</p>
                </div>
                <button onClick={() => setFullReportOpen(false)} className="p-2 hover:bg-[#F1F5F9] dark:hover:bg-white/5 rounded-lg" aria-label="Fermer">
                  <X className="w-4 h-4 text-[#64748B] dark:text-white/50" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { value: 'pdf', label: 'PDF', Icon: FileText, color: '#DC2626' },
                  { value: 'excel', label: 'Excel', Icon: FileSpreadsheet, color: '#16A34A' },
                  { value: 'word', label: 'Word', Icon: FileDown, color: '#2563EB' },
                ].map(({ value, label, Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => setFullReportFormat(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${fullReportFormat === value ? 'border-current shadow-sm' : 'border-[#CBD5E1] dark:border-white/15 hover:border-[#94A3B8]'}`}
                    style={fullReportFormat === value ? { borderColor: color, color } : {}}
                  >
                    <Icon className="w-7 h-7" style={fullReportFormat === value ? { color } : { color: '#94A3B8' }} />
                    <span className={`text-sm font-semibold ${fullReportFormat === value ? '' : 'text-[#64748B] dark:text-white/50'}`}>{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setFullReportOpen(false)} disabled={fullReportLoading} className="px-4 py-2.5 text-sm rounded-xl border border-[#CBD5E1] dark:border-white/15 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors">
                  Annuler
                </button>
                <button onClick={handleFullReport} disabled={fullReportLoading} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1B4332] text-white hover:bg-[#143728] transition-colors disabled:opacity-60 flex items-center gap-2">
                  {fullReportLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</> : <><Download className="w-4 h-4" /> Télécharger</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
