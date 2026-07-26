import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getCached, setCached } from '../lib/pageCache';
import { ShimmerTableRows } from '../components/Shimmer';
import {
  Search, Plus, Download, Edit, Trash2, Eye, X,
  AlertCircle, ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import { Toast, useToast } from '../components/ui/Toast';
import FormField from '../components/ui/FormField';
import GeoFilterComponent from '../components/GeoFilterComponent';
import WorkflowBadge, { WorkflowSelect, WorkflowInlineSelect } from '../components/WorkflowBadge';
import MediaUpload from '../components/MediaUpload';
import mediaService from '../services/mediaService';
import accidentService from '../services/accidentService';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ExportModal from '../components/ui/ExportModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import SearchInput from '../components/ui/SearchInput';
import { isValidSenegalCoord } from '../lib/geoUtils';
import { inputCls } from '../lib/formStyles';


const sanitizePayload = (data) => {
  const s = { ...data };
  Object.keys(s).forEach(k => { if (s[k] === '') s[k] = null; });
  return s;
};

const TYPE_BADGE = {
  mortel: 'bg-[#DC2626] text-white',
  corporel: 'bg-[#C2410C] text-white',
  'matériel': 'bg-[#1B4332] text-white',
};

const EMPTY_FORM = {
  type: 'matériel', date: new Date().toISOString().split('T')[0], heure: '',
  lieu: '', commune_id: '', service_id: '', moyen: '',
  cause_probable: '', latitude: '', longitude: '', description: '',
  workflow_status: 'En cours',
};


const MOIS_LABELS_ACC = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const currentYearACC = new Date().getFullYear();
const currentMonthACC = new Date().getMonth() + 1;
const anneeOptionsACC = Array.from({ length: 6 }, (_, i) => currentYearACC - i);
const QUICK_CHIPS_ACC = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'month', label: 'Ce mois' },
  { key: 'year',  label: 'Cette année' },
];

export default function Accidents() {
  const { user } = useAuth();
  const perms = usePermissions();
  const ACC_CACHE = 'accidents_list';
  const [accidents, setAccidents] = useState(() => getCached(ACC_CACHE) ?? []);
  const [loading, setLoading] = useState(!getCached(ACC_CACHE));
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 10 });
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [activeChip, setActiveChip] = useState('');
  const [meta, setMeta] = useState(null);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [communes, setCommunes] = useState([]);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const { toast, showToast } = useToast();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [workflowLoadingId, setWorkflowLoadingId] = useState(null);
  const searchDebounceRef = useRef(null);

  const applyChipACC = (key) => {
    const now = new Date();
    if (key === 'today' || key === 'month') {
      setFilterAnnee(String(now.getFullYear()));
      setFilterMois(String(now.getMonth() + 1));
    } else if (key === 'year') {
      setFilterAnnee(String(now.getFullYear()));
      setFilterMois('');
    }
    setActiveChip(key);
    setFilters(p => ({ ...p, page: 1 }));
  };

  const navigateACC = (dir) => {
    const y = filterAnnee ? parseInt(filterAnnee) : currentYearACC;
    const m = filterMois ? parseInt(filterMois) : 0;
    if (m > 0) {
      let nm = m + dir, ny = y;
      if (nm < 1) { nm = 12; ny -= 1; }
      if (nm > 12) { nm = 1; ny += 1; }
      if (ny > currentYearACC || (ny === currentYearACC && nm > currentMonthACC)) return;
      if (ny < currentYearACC - 5) return;
      setFilterAnnee(String(ny));
      setFilterMois(String(nm));
    } else {
      const ny = y + dir;
      if (ny > currentYearACC || ny < currentYearACC - 5) return;
      setFilterAnnee(String(ny));
    }
    setActiveChip('');
    setFilters(p => ({ ...p, page: 1 }));
  };

  const fetchAccidents = useCallback(async (signal) => {
    if (!getCached(ACC_CACHE)) setLoading(true);
    try {
      const res = await accidentService.getAll({
        ...filters,
        search: search || undefined,
        ...(filterAnnee ? { annee: filterAnnee } : {}),
        ...(filterMois  ? { mois: filterMois   } : {}),
      }, { signal });
      if (signal?.aborted) return;
      const data = res.data.data || [];
      setAccidents(data);
      setMeta(res.data.meta || null);
      setCached(ACC_CACHE, data);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || signal?.aborted) return;
      showToast('Erreur lors de la récupération des accidents', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, search, filterAnnee, filterMois]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    fetchAccidents(controller.signal);
    return () => controller.abort();
  }, [fetchAccidents]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    const fetchAux = async () => {
      try {
        const [r1, r2] = await Promise.all([geoService.getAllCommunes(), geoService.getAllServices()]);
        setCommunes(r1.data.data || r1.data || []);
        setServices(r2.data.data || r2.data || []);
      } catch (e) { if (import.meta.env.DEV) console.error(e); }
    };
    fetchAux();
  }, []);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= (meta?.last_page || 1)) setFilters(prev => ({ ...prev, page: p }));
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormData(EMPTY_FORM);
    setFormErrors(null);
    setPendingFiles([]);
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({ ...EMPTY_FORM, service_id: user?.service_id || '' });
    setFormErrors(null);
    setPendingFiles([]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (accident) => {
    const isAgent = user?.role === 'agent' || user?.roles?.some(r => (r.name || r) === 'agent');
    if (isAgent) {
      const minsElapsed = (new Date() - new Date(accident.created_at)) / 60000;
      if (minsElapsed > 1) {
        showToast('Modification impossible : le délai réglementaire de 1 minute est dépassé.', 'error');
        return;
      }
    }
    setFormMode('edit');
    setSelectedAccident(accident);
    setFormData({
      type: accident.type || 'matériel',
      date: accident.date ? accident.date.split('T')[0] : '',
      lieu: accident.lieu || '',
      commune_id: accident.commune_id || '',
      service_id: accident.service_id || '',
      moyen: accident.moyen || '',
      cause_probable: accident.cause_probable || '',
      latitude: accident.latitude || '',
      longitude: accident.longitude || '',
      description: accident.description || '',
      workflow_status: accident.workflow_status || 'En cours',
      heure: accident.heure || '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (accident) => {
    try {
      const res = await accidentService.getOne(accident.id);
      setSelectedAccident(res.data.data || accident);
      setIsDetailOpen(true);
    } catch { showToast('Erreur lors de la récupération des détails', 'error'); }
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await accidentService.delete(deleteTarget);
      showToast('Accident supprimé avec succès.');
      setDeleteTarget(null);
      fetchAccidents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    const validCoords = isValidSenegalCoord(lat, lng)
      ? { latitude: lat, longitude: lng }
      : { latitude: null, longitude: null };
    const payload = sanitizePayload({ ...formData, ...validCoords });
    try {
      if (formMode === 'create') {
        const res = await accidentService.create(payload);
        const newId = res.data?.data?.id || res.data?.id;
        if (newId && pendingFiles.length > 0) {
          await mediaService.upload('accidents', newId, pendingFiles);
        }
        showToast('Accident enregistré avec succès.');
      } else {
        await accidentService.update(selectedAccident.id, payload);
        showToast('Accident mis à jour avec succès.');
      }
      setIsFormOpen(false);
      fetchAccidents();
    } catch (err) {
      if (err.response?.status === 422) setFormErrors(err.response.data.errors || {});
      else showToast(err.response?.data?.message || 'Une erreur est survenue.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleWorkflowChange = async (id, newStatus) => {
    setWorkflowLoadingId(id);
    const prev = accidents.map(a => a);
    setAccidents(list => list.map(a => a.id === id ? { ...a, workflow_status: newStatus } : a));
    try {
      await accidentService.update(id, { workflow_status: newStatus });
      showToast(`Statut mis à jour → ${newStatus}`);
    } catch {
      setAccidents(prev);
      showToast('Erreur lors de la mise à jour du statut', 'error');
    } finally {
      setWorkflowLoadingId(null);
    }
  };

  const filteredByCommune = formData.commune_id
    ? services.filter(s => String(s.commune_id) === String(formData.commune_id))
    : services;
  const displayedServices = filteredByCommune;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <AnimatePresence>{toast && <Toast toast={toast} />}</AnimatePresence>
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        module="accidents"
        moduleLabel="Accidents de la Circulation"
        initialFilters={filterAnnee ? { periodType: filterMois ? 'specific_month' : 'current_year', month: filterMois ? parseInt(filterMois) : undefined, year: parseInt(filterAnnee) } : {}}
        geoFilters={{ region_id: filters.region_id, departement_id: filters.departement_id, commune_id: filters.commune_id }}
      />
      <ConfirmModal
        isOpen={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
        title="Supprimer l'accident"
        message="Ce dossier d'accident et tous ses médias associés seront définitivement supprimés."
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Accidents de la Circulation</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Gestion et suivi des accidents sur le territoire national</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {perms.canExportData && (
            <button onClick={() => setIsExportOpen(true)} className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-[#0F172A] dark:text-white bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
              <Download className="w-4 h-4" aria-hidden="true" /> Exporter
            </button>
          )}
          {perms.canCreateAccidents && (
            <button onClick={handleOpenCreate} className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors">
              <Plus className="w-4 h-4" /> Nouvel Accident
            </button>
          )}
        </div>
      </div>

      {/* Barre de navigation temporelle */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <Calendar className="w-4 h-4 text-[#94A3B8] dark:text-white/30 shrink-0" />

        <div className="flex items-center gap-1.5">
          {QUICK_CHIPS_ACC.map(c => (
            <button
              key={c.key}
              onClick={() => applyChipACC(c.key)}
              className={`h-7 px-3 text-xs font-medium rounded-full border transition-all ${
                activeChip === c.key
                  ? 'bg-[#1B4332] border-[#2563EB] text-white'
                  : 'bg-[#F8FAFC] dark:bg-white/5 border-[#CBD5E1] dark:border-white/10 text-[#64748B] dark:text-white/50 hover:border-[#2563EB] hover:text-[#2563EB]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-[#CBD5E1] dark:bg-white/15" />

        <div className="flex items-center gap-1">
          <button onClick={() => navigateACC(-1)} title="Période précédente"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 text-[#64748B] dark:text-white/50 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-[110px] text-center px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#0F172A] dark:text-white select-none">
            {filterMois
              ? `${MOIS_LABELS_ACC[parseInt(filterMois) - 1]} ${filterAnnee || currentYearACC}`
              : (filterAnnee || currentYearACC)}
          </div>
          <button onClick={() => navigateACC(+1)} title="Période suivante"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 text-[#64748B] dark:text-white/50 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-[#CBD5E1] dark:bg-white/15" />

        <select
          value={filterAnnee}
          onChange={e => { setFilterAnnee(e.target.value); setFilterMois(''); setActiveChip(''); setFilters(p => ({ ...p, page: 1 })); }}
          className="h-8 text-xs border border-[#CBD5E1] dark:border-white/10 rounded-lg px-2 bg-white dark:bg-[#343a40] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <option value="">Toutes années</option>
          {anneeOptionsACC.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={filterMois}
          onChange={e => { setFilterMois(e.target.value); setActiveChip(''); setFilters(p => ({ ...p, page: 1 })); }}
          className="h-8 text-xs border border-[#CBD5E1] dark:border-white/10 rounded-lg px-2 bg-white dark:bg-[#343a40] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <option value="">Tous mois</option>
          {MOIS_LABELS_ACC.map((label, i) => {
            const val = String(i + 1);
            const yr = filterAnnee ? parseInt(filterAnnee) : currentYearACC;
            const disabled = yr === currentYearACC && i + 1 > currentMonthACC;
            return <option key={val} value={val} disabled={disabled}>{label}{disabled ? ' (à venir)' : ''}</option>;
          })}
        </select>
      </div>

      {/* Filter Context Bar */}
      {(filterAnnee || filterMois) && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-xs text-[#94A3B8] dark:text-white/30 font-medium">Période :</span>
          {filterAnnee && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#1B4332]/10 border border-[#BFDBFE] dark:border-[#2563EB]/20 text-xs font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
              {filterAnnee}
              <button onClick={() => { setFilterAnnee(''); setFilterMois(''); setActiveChip(''); setFilters(p => ({ ...p, page: 1 })); }} className="ml-0.5 hover:text-[#DC2626]"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterMois && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#1B4332]/10 border border-[#BFDBFE] dark:border-[#2563EB]/20 text-xs font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
              {MOIS_LABELS_ACC[parseInt(filterMois) - 1]}
              <button onClick={() => { setFilterMois(''); setActiveChip(''); setFilters(p => ({ ...p, page: 1 })); }} className="ml-0.5 hover:text-[#DC2626]"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button
            onClick={() => { setFilterAnnee(''); setFilterMois(''); setActiveChip(''); setFilters(p => ({ ...p, page: 1 })); }}
            className="text-xs text-[#94A3B8] dark:text-white/30 hover:text-[#DC2626] underline ml-1 transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setFilters(p => ({ ...p, page: 1 })); }}
          placeholder="Rechercher par lieu, cause, véhicules..."
          className="flex-1 min-w-[200px]"
          debounceMs={300}
        />
        <div className="flex items-center gap-2">
          <GeoFilterComponent onChange={(geo) => setFilters(p => ({ ...p, ...geo, page: 1 }))} />
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters(p => ({ ...p, type: e.target.value || undefined, page: 1 }))}
            className="h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">Tous les types</option>
            <option value="matériel">Matériel</option>
            <option value="corporel">Corporel</option>
            <option value="mortel">Mortel</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5">
                {['Réf.', 'Date', 'Type', 'Lieu', 'Moyen / Cause', 'Statut', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <ShimmerTableRows rows={5} cols={7} />
              ) : accidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <AlertCircle className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-sm text-[#94A3B8] dark:text-white/30">Aucun accident trouvé.</p>
                  </td>
                </tr>
              ) : (
                accidents.map((accident) => {
                  const minsElapsed = (new Date() - new Date(accident.created_at)) / 60000;
                  const canEdit = user?.role !== 'agent' || minsElapsed <= 1;
                  const badgeCls = TYPE_BADGE[accident.type] || 'bg-[#6B7280] text-white';
                  return (
                    <tr key={accident.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#2563EB]">#{accident.id}</td>
                      <td className="px-4 py-3 text-xs text-[#0F172A] dark:text-white font-medium">
                        {accident.date ? new Date(accident.date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${badgeCls}`}>
                          {accident.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#0F172A] dark:text-white font-medium text-xs">{accident.commune?.nom || '-'}</p>
                        <p className="text-[#94A3B8] dark:text-white/30 text-xs truncate max-w-[140px]">{accident.lieu}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#0F172A] dark:text-white text-xs font-medium">{accident.moyen || '-'}</p>
                        <p className="text-[#94A3B8] dark:text-white/30 text-xs truncate max-w-[140px]">{accident.cause_probable || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <WorkflowInlineSelect
                          status={accident.workflow_status}
                          onStatusChange={(s) => handleWorkflowChange(accident.id, s)}
                          loading={workflowLoadingId === accident.id}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenDetail(accident)} aria-label="Voir les détails" className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors">
                            <Eye aria-hidden="true" className="w-4 h-4" />
                          </button>
                          {perms.canEditAccidents && (
                            <button onClick={() => handleOpenEdit(accident)} disabled={!canEdit} aria-label="Modifier"
                              className={`p-1.5 rounded-md transition-colors ${canEdit ? 'text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB]' : 'text-[#CBD5E1] cursor-not-allowed'}`}>
                              <Edit aria-hidden="true" className="w-4 h-4" />
                            </button>
                          )}
                          {perms.canDeleteAccidents && (
                            <button onClick={() => handleDelete(accident.id)} aria-label="Supprimer" className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
                              <Trash2 aria-hidden="true" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {meta && (
          <div className="px-4 py-3 border-t border-[#F1F5F9] dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[#64748B] dark:text-white/50">
            <span>{meta.from || 0}–{meta.to || 0} sur {meta.total || 0} accidents</span>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(meta.current_page - 1)} disabled={meta.current_page === 1}
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-md font-medium">
                {meta.current_page} / {meta.last_page}
              </span>
              <button onClick={() => handlePageChange(meta.current_page + 1)} disabled={meta.current_page === meta.last_page}
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      <AnimatePresence>
        {isFormOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm(); }}
          >
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15">
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
                  {formMode === 'create' ? 'Nouvel Accident' : `Modifier l'Accident #${selectedAccident?.id}`}
                </h3>
                <button onClick={handleCloseForm} aria-label="Fermer" className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Type d'Accident" error={formErrors?.type} required>
                    <select value={formData.type} onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))} className={inputCls} required>
                      <option value="matériel">Matériel</option>
                      <option value="corporel">Corporel</option>
                      <option value="mortel">Mortel</option>
                    </select>
                  </FormField>
                  <FormField label="Date" error={formErrors?.date} required>
                    <input type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} className={inputCls} required />
                  </FormField>
                  <FormField label="Heure (optionnel)">
                    <input type="time" value={formData.heure} onChange={(e) => setFormData(p => ({ ...p, heure: e.target.value }))} className={inputCls} />
                  </FormField>
                  <FormField label="Commune" error={formErrors?.commune_id} required>
                    <select value={formData.commune_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        setFormData(p => {
                          const filtered = id ? services.filter(s => String(s.commune_id) === id) : services;
                          const hasS = filtered.some(s => String(s.id) === String(p.service_id));
                          return { ...p, commune_id: id, service_id: hasS ? p.service_id : '' };
                        });
                      }}
                      className={inputCls} required>
                      <option value="">Sélectionnez la commune</option>
                      {communes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Service Enregistreur" error={formErrors?.service_id} required>
                    <select value={formData.service_id} onChange={(e) => setFormData(p => ({ ...p, service_id: e.target.value }))} className={inputCls} required>
                      <option value="">Sélectionnez le service</option>
                      {displayedServices.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Lieu Exact" error={formErrors?.lieu} required>
                      <input type="text" value={formData.lieu} onChange={(e) => setFormData(p => ({ ...p, lieu: e.target.value }))}
                        placeholder="Ex: Route nationale 1, VDN Dakar" className={inputCls} required />
                    </FormField>
                  </div>
                  <FormField label="Moyen de transport impliqué" error={formErrors?.moyen} required>
                    <select value={formData.moyen} onChange={(e) => setFormData(p => ({ ...p, moyen: e.target.value }))} className={inputCls} required>
                      <option value="">Sélectionnez le moyen</option>
                      {['Voiture', 'Moto', 'Moto trois roues', 'Camion', 'Autre'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Cause probable" error={formErrors?.cause_probable}>
                    <input type="text" value={formData.cause_probable} onChange={(e) => setFormData(p => ({ ...p, cause_probable: e.target.value }))}
                      placeholder="Ex: Excès de vitesse, sommeil" className={inputCls} />
                  </FormField>
                  <FormField label="Statut de traitement" error={formErrors?.workflow_status}>
                    <WorkflowSelect
                      value={formData.workflow_status}
                      onChange={(v) => setFormData(p => ({ ...p, workflow_status: v }))}
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Latitude GPS" error={formErrors?.latitude}>
                    <input type="number" step="0.000001" min="12" max="17"
                      value={formData.latitude}
                      onChange={(e) => setFormData(p => ({ ...p, latitude: e.target.value }))}
                      placeholder="Ex: 14.6928"
                      className={inputCls} />
                  </FormField>
                  <FormField label="Longitude GPS" error={formErrors?.longitude}>
                    <input type="number" step="0.000001" min="-18" max="-11"
                      value={formData.longitude}
                      onChange={(e) => setFormData(p => ({ ...p, longitude: e.target.value }))}
                      placeholder="Ex: -17.4467"
                      className={inputCls} />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Description détaillée" error={formErrors?.description}>
                      <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={3}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none" />
                    </FormField>
                  </div>
                </div>
                {formMode === 'create' && (
                  <div className="mt-5 pt-4 border-t border-[#F1F5F9] dark:border-white/5">
                    <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-2">
                      Documents / Photos <span className="text-[#94A3B8] font-normal normal-case">(optionnel)</span>
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => setPendingFiles(Array.from(e.target.files))}
                      />
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-[#CBD5E1] dark:border-white/15 text-xs text-[#64748B] dark:text-white/50 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        Joindre des fichiers
                      </span>
                    </label>
                    {pendingFiles.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {pendingFiles.map((f, i) => (
                          <li key={i} className="flex items-center justify-between text-xs bg-[#F8FAFC] dark:bg-white/5 border border-[#E2E8F0] dark:border-white/10 rounded-lg px-3 py-1.5">
                            <span className="text-[#0F172A] dark:text-white truncate max-w-[240px]">{f.name}</span>
                            <button type="button" onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))} className="ml-2 text-[#94A3B8] hover:text-[#DC2626] shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[#F1F5F9] dark:border-white/5">
                  <button type="button" onClick={handleCloseForm} className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/60 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/5 rounded-lg transition-colors">Annuler</button>
                  <button type="submit" disabled={actionLoading} className="h-9 px-5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143728] rounded-lg transition-colors disabled:opacity-60">
                    {actionLoading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETAIL */}
      <AnimatePresence>
        {isDetailOpen && selectedAccident && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) setIsDetailOpen(false); }}
          >
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15">
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">Accident #{selectedAccident.id}</h3>
                <button onClick={() => setIsDetailOpen(false)} aria-label="Fermer" className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Type de gravité', value: selectedAccident.type, badge: true },
                    { label: 'Date', value: selectedAccident.date ? new Date(selectedAccident.date).toLocaleDateString('fr-FR') : '—' },
                    { label: 'Heure', value: selectedAccident.heure || new Date(selectedAccident.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' (saisie)' },
                    { label: 'Lieu exact', value: selectedAccident.lieu },
                    { label: 'Commune', value: selectedAccident.commune?.nom || '-' },
                    { label: 'Véhicules impliqués', value: selectedAccident.moyen || '-' },
                    { label: 'Cause probable', value: selectedAccident.cause_probable || 'Non déterminée' },
                    { label: 'Saisi par', value: selectedAccident.user?.name || '-' },
                    { label: 'Service instructeur', value: selectedAccident.service?.nom || '-' },
                  ].map(({ label, value, badge }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">{label}</p>
                      {badge ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${TYPE_BADGE[value] || 'bg-[#6B7280] text-white'}`}>{value}</span>
                      ) : (
                        <p className="font-medium text-[#0F172A] dark:text-white">{value}</p>
                      )}
                    </div>
                  ))}
                  {selectedAccident.latitude && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Coordonnées GPS</p>
                      <p className="font-mono text-xs text-[#64748B] dark:text-white/50 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 px-3 py-2 rounded-lg inline-block">
                        {selectedAccident.latitude}, {selectedAccident.longitude}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-[#64748B] dark:text-white/50 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedAccident.description || 'Aucune description disponible.'}
                    </p>
                  </div>
                </div>
                {selectedAccident.victimes?.length > 0 && (
                  <div className="border-t border-[#F1F5F9] dark:border-white/5 pt-4">
                    <p className="text-xs font-semibold text-[#0F172A] dark:text-white uppercase mb-3">Victimes ({selectedAccident.victimes.length})</p>
                    <div className="space-y-2">
                      {selectedAccident.victimes.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-xs">
                          <div>
                            <p className="font-semibold text-[#0F172A] dark:text-white">{v.prenom} {v.nom}</p>
                            <p className="text-[#94A3B8] dark:text-white/30 mt-0.5">Sexe: {v.sexe || '-'} · Âge: {v.age ? `${v.age} ans` : '-'}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded font-medium text-[#64748B] dark:text-white/50">CIN: {v.no_cin_passeport || 'N/C'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-[#F1F5F9] dark:border-white/5 pt-4">
                  <div className="mb-3">
                    <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Statut de traitement</p>
                    <WorkflowBadge status={selectedAccident.workflow_status} />
                  </div>
                  <MediaUpload entityType="accidents" entityId={selectedAccident.id} readOnly={!perms.canEditAccidents} />
                </div>
              </div>
              <div className="px-6 py-3 border-t border-[#F1F5F9] dark:border-white/5 flex justify-end shrink-0">
                <button onClick={() => setIsDetailOpen(false)} className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/60 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/5 rounded-lg transition-colors">Fermer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
