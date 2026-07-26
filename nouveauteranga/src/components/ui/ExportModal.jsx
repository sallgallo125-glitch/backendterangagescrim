import { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, FileDown, Download, Loader2, Calendar, ChevronDown } from 'lucide-react';
import Modal from './Modal';
import api from '../../api/axios';

const FORMATS = [
  { value: 'pdf',   label: 'PDF',   icon: FileText,        color: 'text-red-600',   bg: 'bg-red-50 border-red-200',   activeBg: 'bg-red-100 border-red-500' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-700', bg: 'bg-green-50 border-green-200', activeBg: 'bg-green-100 border-green-600' },
  { value: 'word',  label: 'Word',  icon: FileDown,        color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200',  activeBg: 'bg-blue-100 border-blue-500' },
];

const PERIODS = [
  { value: 'last_24h',       label: 'Dernières 24h' },
  { value: 'last_7d',        label: '7 derniers jours' },
  { value: 'last_30d',       label: '30 derniers jours' },
  { value: 'last_3m',        label: '3 derniers mois' },
  { value: 'last_6m',        label: '6 derniers mois' },
  { value: 'current_month',  label: 'Mois en cours' },
  { value: 'current_year',   label: 'Année en cours' },
  { value: 'specific_month', label: 'Mois spécifique' },
  { value: 'custom',         label: 'Période personnalisée' },
];

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

const EXT = { pdf: 'pdf', excel: 'xlsx', word: 'docx' };

/**
 * @param {string}   module        — 'accidents' | 'infractions' | ...
 * @param {string}   moduleLabel   — Libellé affiché dans le titre
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {object}   initialFilters — { periodType?, startDate?, endDate?, month?, year? } pré-remplis depuis la page
 * @param {object}   geoFilters     — { region_id?, departement_id?, commune_id? } transmis au backend
 */
export default function ExportModal({ module, moduleLabel, isOpen, onClose, initialFilters = {}, geoFilters = {} }) {
  const currentYear = new Date().getFullYear();

  const [format,     setFormat]     = useState('pdf');
  const [periodType, setPeriodType] = useState('last_30d');
  const [month,      setMonth]      = useState(new Date().getMonth() + 1);
  const [year,       setYear]       = useState(currentYear);
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormat('pdf');
      setPeriodType(initialFilters.periodType || 'last_30d');
      setMonth(initialFilters.month ?? new Date().getMonth() + 1);
      setYear(initialFilters.year ?? currentYear);
      setStartDate(initialFilters.startDate || '');
      setEndDate(initialFilters.endDate || '');
      setError('');
    }
  }, [isOpen, currentYear, initialFilters.periodType, initialFilters.month, initialFilters.year, initialFilters.startDate, initialFilters.endDate]);

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleGenerate = async () => {
    setError('');

    if (periodType === 'custom' && (!startDate || !endDate)) {
      setError('Veuillez renseigner les deux dates.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        format,
        periodType,
        ...(periodType === 'specific_month' && { month, year }),
        ...(periodType === 'custom' && { start_date: startDate, end_date: endDate }),
        // Filtres géographiques transmis depuis la page parente
        ...(geoFilters.region_id      && { region_id:      geoFilters.region_id }),
        ...(geoFilters.departement_id && { departement_id: geoFilters.departement_id }),
        ...(geoFilters.commune_id     && { commune_id:     geoFilters.commune_id }),
      };

      const res = await api.post(`/${module}/export`, payload, { responseType: 'blob' });

      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        setError(json.message || "Erreur lors de la génération.");
        return;
      }

      const mimeMap = {
        pdf:   'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        word:  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const blob = new Blob([res.data], { type: contentType || mimeMap[format] });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${module}_export_${new Date().toISOString().slice(0, 10)}.${EXT[format]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      let msg = "Erreur lors de la génération. Veuillez réessayer.";
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch {}
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      setError(msg);
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Badge résumant les filtres actifs
  const geoLabel = geoFilters.commune_id
    ? 'Commune filtrée'
    : geoFilters.departement_id
    ? 'Département filtré'
    : geoFilters.region_id
    ? 'Région filtrée'
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Exporter — ${moduleLabel}`}
      subtitle="Choisissez le format et la période"
      icon={<Download className="w-5 h-5 text-[#1B4332]" aria-hidden="true" />}
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Génération…</>
            ) : (
              <><Download className="w-4 h-4" aria-hidden="true" /> Générer</>
            )}
          </button>
        </>
      }
    >
      {/* Badge filtre géo actif */}
      {geoLabel && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-[#ECFDF5] border border-[#1B4332]/30 rounded-lg text-xs text-[#1B4332] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#1B4332] shrink-0" />
          Filtre territorial actif : {geoLabel}
        </div>
      )}

      {/* Choix du format */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Format</p>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map(({ value, label, icon: Icon, color, bg, activeBg }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium
                ${format === value ? activeBg + ' ' + color : bg + ' text-[#64748B] hover:border-[#94A3B8]'}`}
            >
              <Icon className={`w-6 h-6 ${format === value ? color : 'text-[#94A3B8]'}`} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Choix de la période */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Période</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriodType(value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left
                ${periodType === value
                  ? 'bg-[#ECFDF5] border-[#1B4332] text-[#1B4332]'
                  : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#94A3B8]'}`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sélecteurs mois/année */}
      {periodType === 'specific_month' && (
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <label className="text-xs text-[#64748B] mb-1 block">Mois</label>
            <div className="relative">
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="w-full appearance-none border border-[#CBD5E1] dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" aria-hidden="true" />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-[#64748B] mb-1 block">Année</label>
            <div className="relative">
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full appearance-none border border-[#CBD5E1] dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {/* Dates personnalisées */}
      {periodType === 'custom' && (
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <label className="text-xs text-[#64748B] dark:text-white/50 mb-1 block">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-[#CBD5E1] dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-[#64748B] dark:text-white/50 mb-1 block">Date de fin</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-[#CBD5E1] dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[#0F172A] dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30"
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </Modal>
  );
}
