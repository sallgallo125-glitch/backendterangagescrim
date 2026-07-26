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
import infractionService from '../services/infractionService';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ExportModal from '../components/ui/ExportModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import SearchInput from '../components/ui/SearchInput';
import { isValidSenegalCoord } from '../lib/geoUtils';
import { inputCls, selectCls } from '../lib/formStyles';


const sanitizePayload = (data) => {
  const s = { ...data };
  Object.keys(s).forEach(k => { if (s[k] === '') s[k] = null; });
  return s;
};

const EMPTY_FORM = {
  type_infraction_id: '', service_id: '', annee: new Date().getFullYear(),
  date: new Date().toISOString().split('T')[0], heure: '', lieu: '', commune_id: '',
  issue: 'Constatée', type_drogue: '', unite: '', quantite: '',
  latitude: '', longitude: '', description: '', workflow_status: 'En cours',
};


const MOIS_LABELS_INF = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const currentYearINF = new Date().getFullYear();
const currentMonthINF = new Date().getMonth() + 1;
const anneeOptionsINF = Array.from({ length: 6 }, (_, i) => currentYearINF - i);

const QUICK_CHIPS_INF = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'month', label: 'Ce mois' },
  { key: 'year',  label: 'Cette année' },
];

export default function Infractions() {
  const { user } = useAuth();
  const perms = usePermissions();
  const INF_CACHE = 'infractions_list';
  const [infractions, setInfractions] = useState(() => getCached(INF_CACHE) ?? []);
  const [loading, setLoading] = useState(!getCached(INF_CACHE));
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 10 });
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [activeChip, setActiveChip] = useState('');
  const [meta, setMeta] = useState(null);
  const [selectedInfraction, setSelectedInfraction] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [typesInfractions, setTypesInfractions] = useState([]);
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

  const applyChipINF = (key) => {
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

  const navigateINF = (dir) => {
    const y = filterAnnee ? parseInt(filterAnnee) : currentYearINF;
    const m = filterMois ? parseInt(filterMois) : 0;
    if (m > 0) {
      let nm = m + dir, ny = y;
      if (nm < 1) { nm = 12; ny -= 1; }
      if (nm > 12) { nm = 1; ny += 1; }
      if (ny > currentYearINF || (ny === currentYearINF && nm > currentMonthINF)) return;
      if (ny < currentYearINF - 5) return;
      setFilterAnnee(String(ny));
      setFilterMois(String(nm));
    } else {
      const ny = y + dir;
      if (ny > currentYearINF || ny < currentYearINF - 5) return;
      setFilterAnnee(String(ny));
    }
    setActiveChip('');
    setFilters(p => ({ ...p, page: 1 }));
  };

  const fetchInfractions = useCallback(async (signal) => {
    if (!getCached(INF_CACHE)) setLoading(true);
    try {
      const res = await infractionService.getAll({
        ...filters,
        search: search || undefined,
        ...(filterAnnee ? { annee: filterAnnee } : {}),
        ...(filterMois  ? { mois: filterMois   } : {}),
      }, { signal });
      if (signal?.aborted) return;
      const data = res.data.data || [];
      setInfractions(data);
      setMeta(res.data.meta || null);
      setCached(INF_CACHE, data);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || signal?.aborted) return;
      showToast('Erreur lors de la récupération des infractions', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, search, filterAnnee, filterMois]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    fetchInfractions(controller.signal);
    return () => controller.abort();
  }, [fetchInfractions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const [resTypes, resCommunes, resServices] = await Promise.all([
          infractionService.getTypes(), geoService.getAllCommunes(), geoService.getAllServices(),
        ]);
        setTypesInfractions(resTypes.data.data || resTypes.data || []);
        setCommunes(resCommunes.data.data || resCommunes.data || []);
        setServices(resServices.data.data || resServices.data || []);
      } catch (e) { if (import.meta.env.DEV) console.error(e); }
    };
    fetchAux();
  }, []);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= (meta?.last_page || 1)) setFilters(p => ({ ...p, page }));
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

  const handleOpenEdit = (infraction) => {
    const isAgent = user?.role === 'agent' || user?.roles?.some(r => (r.name || r) === 'agent');
    if (isAgent) {
      const minsElapsed = (new Date() - new Date(infraction.created_at)) / 60000;
      if (minsElapsed > 1) {
        showToast('Modification impossible : le délai réglementaire de 1 minute est dépassé.', 'error');
        return;
      }
    }
    setFormMode('edit');
    setSelectedInfraction(infraction);
    setFormData({
      type_infraction_id: infraction.type_infraction_id || '',
      service_id: infraction.service_id || '',
      date: infraction.date ? infraction.date.split('T')[0] : '',
      annee: infraction.date ? new Date(infraction.date).getFullYear() : (infraction.annee || new Date().getFullYear()),
      lieu: infraction.lieu || '',
      commune_id: infraction.commune_id || '',
      issue: infraction.issue || 'Constatée',
      type_drogue: infraction.type_drogue || '',
      unite: infraction.unite || '',
      quantite: infraction.quantite || '',
      latitude: infraction.latitude || '',
      longitude: infraction.longitude || '',
      description: infraction.description || '',
      workflow_status: infraction.workflow_status || 'En cours',
      heure: infraction.heure || '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (infraction) => {
    try {
      const res = await infractionService.getOne(infraction.id);
      setSelectedInfraction(res.data.data || infraction);
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
      await infractionService.delete(deleteTarget);
      showToast('Infraction supprimée avec succès.');
      setDeleteTarget(null);
      fetchInfractions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleWorkflowChange = async (id, newStatus) => {
    setWorkflowLoadingId(id);
    const prev = infractions.map(i => i);
    setInfractions(list => list.map(i => i.id === id ? { ...i, workflow_status: newStatus } : i));
    try {
      await infractionService.update(id, { workflow_status: newStatus });
      showToast(`Statut mis à jour → ${newStatus}`);
    } catch {
      setInfractions(prev);
      showToast('Erreur lors de la mise à jour du statut', 'error');
    } finally {
      setWorkflowLoadingId(null);
    }
  };

  const isDrugRelated = () => {
    if (!formData.type_infraction_id) return false;
    const t = typesInfractions.find(t => String(t.id) === String(formData.type_infraction_id));
    if (!t) return false;
    const terms = ['drogue', 'stupéfiant', 'narcot', 'cannabis'];
    return terms.some(w =>
      (t.nom || '').toLowerCase().includes(w) ||
      (t.description || '').toLowerCase().includes(w) ||
      (t.categorie_infraction?.nom || '').toLowerCase().includes(w)
    );
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    const hasCoords = formData.latitude !== '' && formData.longitude !== '';
    const coordsValid = hasCoords && isValidSenegalCoord(lat, lng);
    if (hasCoords && !coordsValid) {
      showToast('Coordonnées GPS hors du territoire sénégalais — elles seront ignorées.', 'warning');
    }
    const validCoords = coordsValid
      ? { latitude: lat, longitude: lng }
      : { latitude: null, longitude: null };
    const isDrug = isDrugRelated();
    const payload = sanitizePayload({
      ...formData,
      type_drogue: isDrug ? formData.type_drogue : null,
      unite: isDrug ? formData.unite : null,
      quantite: isDrug && formData.quantite ? parseFloat(formData.quantite) : null,
      ...validCoords,
    });
    try {
      if (formMode === 'create') {
        const res = await infractionService.create(payload);
        const newId = res.data?.data?.id || res.data?.id;
        if (newId && pendingFiles.length > 0) {
          await mediaService.upload('infractions', newId, pendingFiles);
        }
        showToast('Infraction enregistrée avec succès.');
      } else {
        await infractionService.update(selectedInfraction.id, payload);
        showToast('Infraction mise à jour avec succès.');
      }
      setIsFormOpen(false);
      fetchInfractions();
    } catch (err) {
      if (err.response?.status === 422) setFormErrors(err.response.data.errors || {});
      else showToast(err.response?.data?.message || 'Une erreur est survenue.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredServices = formData.commune_id
    ? services.filter(s => String(s.commune_id) === String(formData.commune_id))
    : services;
  const displayedServices = filteredServices.length > 0 ? filteredServices : services;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <AnimatePresence>
        {toast && <Toast toast={toast} />}
      </AnimatePresence>
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        module="infractions"
        moduleLabel="Infractions"
        initialFilters={filterAnnee ? { periodType: filterMois ? 'specific_month' : 'current_year', month: filterMois ? parseInt(filterMois) : undefined, year: parseInt(filterAnnee) } : {}}
        geoFilters={{ region_id: filters.region_id, departement_id: filters.departement_id, commune_id: filters.commune_id }}
      />
      <ConfirmModal
        isOpen={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
        title="Supprimer l'infraction"
        message="Cette infraction et tous ses médias associés seront définitivement supprimés."
      />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Gestion des Infractions</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Consultez et gérez les infractions constatées sur le territoire</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {perms.canExportData && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-[#0F172A] dark:text-white bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" /> Exporter
            </button>
          )}
          {perms.canCreateInfractions && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouvelle Infraction
            </button>
          )}
        </div>
      </div>

      {/* Barre de navigation temporelle */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <Calendar className="w-4 h-4 text-[#94A3B8] dark:text-white/30 shrink-0" />

        {/* Chips accès rapide */}
        <div className="flex items-center gap-1.5">
          {QUICK_CHIPS_INF.map(c => (
            <button
              key={c.key}
              onClick={() => applyChipINF(c.key)}
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

        {/* Navigateur Prev / Période / Next */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigateINF(-1)} title="Période précédente"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 text-[#64748B] dark:text-white/50 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-[110px] text-center px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#0F172A] dark:text-white select-none">
            {filterMois
              ? `${MOIS_LABELS_INF[parseInt(filterMois) - 1]} ${filterAnnee || currentYearINF}`
              : (filterAnnee || currentYearINF)}
          </div>
          <button onClick={() => navigateINF(+1)} title="Période suivante"
            className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 text-[#64748B] dark:text-white/50 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-[#CBD5E1] dark:bg-white/15" />

        {/* Sélecteurs année / mois */}
        <select
          value={filterAnnee}
          onChange={e => { setFilterAnnee(e.target.value); setFilterMois(''); setActiveChip(''); setFilters(p => ({ ...p, page: 1 })); }}
          className="h-8 text-xs border border-[#CBD5E1] dark:border-white/10 rounded-lg px-2 bg-white dark:bg-[#343a40] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <option value="">Toutes années</option>
          {anneeOptionsINF.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={filterMois}
          onChange={e => { setFilterMois(e.target.value); setActiveChip(''); setFilters(p => ({ ...p, page: 1 })); }}
          className="h-8 text-xs border border-[#CBD5E1] dark:border-white/10 rounded-lg px-2 bg-white dark:bg-[#343a40] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <option value="">Tous mois</option>
          {MOIS_LABELS_INF.map((label, i) => {
            const val = String(i + 1);
            const yr = filterAnnee ? parseInt(filterAnnee) : currentYearINF;
            const disabled = yr === currentYearINF && i + 1 > currentMonthINF;
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
              {MOIS_LABELS_INF[parseInt(filterMois) - 1]}
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

      {/* Filters bar */}
      <div className="bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setFilters(p => ({ ...p, page: 1 })); }}
          placeholder="Rechercher par CIN, lieu, description..."
          className="flex-1 min-w-[200px]"
          debounceMs={300}
        />
        <div className="flex items-center gap-2">
          <GeoFilterComponent onChange={(geo) => setFilters(p => ({ ...p, ...geo, page: 1 }))} />
          <select
            value={filters.issue || ''}
            onChange={(e) => setFilters(p => ({ ...p, issue: e.target.value || undefined, page: 1 }))}
            className="h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">Toutes les issues</option>
            <option value="Constatée">Constatée</option>
            <option value="Déférée">Déférée</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Réf.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Lieu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Issue</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <ShimmerTableRows rows={5} cols={7} />
              ) : infractions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <AlertCircle className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-sm text-[#94A3B8] dark:text-white/30">Aucune infraction trouvée.</p>
                  </td>
                </tr>
              ) : (
                infractions.map((infraction) => {
                  const minsElapsed = (new Date() - new Date(infraction.created_at)) / 60000;
                  const canEdit = user?.role !== 'agent' || minsElapsed <= 1;
                  return (
                    <tr key={infraction.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#2563EB]">
                        #{infraction.id}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#0F172A] dark:text-white font-medium text-xs">
                          {infraction.date ? new Date(infraction.date).toLocaleDateString('fr-FR') : (infraction.annee || '—')}
                        </p>
                        <p className="text-[#94A3B8] dark:text-white/30 text-xs">
                          {infraction.heure || ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${
                          (infraction.type_infraction?.categorie_infraction?.nom || '').toLowerCase() === 'crime'
                            ? 'bg-[#DC2626]'
                            : (infraction.type_infraction?.categorie_infraction?.nom || '').toLowerCase() === 'délit'
                              ? 'bg-[#C2410C]'
                              : 'bg-[#D97706]'
                        }`}>
                          {infraction.type_infraction?.categorie_infraction?.nom || 'Infraction'}
                        </span>
                        <p className="text-xs text-[#64748B] dark:text-white/50 mt-0.5">{infraction.type_infraction?.nom || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#0F172A] dark:text-white font-medium text-xs">{infraction.commune?.nom || '-'}</p>
                        <p className="text-[#94A3B8] dark:text-white/30 text-xs truncate max-w-[140px]">{infraction.lieu}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${
                          infraction.issue === 'Constatée'
                            ? 'bg-[#16A34A]'
                            : 'bg-[#DC2626]'
                        }`}>
                          {infraction.issue}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <WorkflowInlineSelect
                          status={infraction.workflow_status}
                          onStatusChange={(s) => handleWorkflowChange(infraction.id, s)}
                          loading={workflowLoadingId === infraction.id}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(infraction)}
                            aria-label="Voir les détails"
                            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                            title="Voir les détails"
                          >
                            <Eye aria-hidden="true" className="w-4 h-4" />
                          </button>
                          {perms.canEditInfractions && (
                            <button
                              onClick={() => handleOpenEdit(infraction)}
                              disabled={!canEdit}
                              aria-label="Modifier"
                              className={`p-1.5 rounded-md transition-colors ${canEdit ? 'text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB]' : 'text-[#CBD5E1] cursor-not-allowed'}`}
                              title={canEdit ? 'Modifier' : 'Délai de modification dépassé (1 min)'}
                            >
                              <Edit aria-hidden="true" className="w-4 h-4" />
                            </button>
                          )}
                          {perms.canDeleteInfractions && (
                            <button
                              onClick={() => handleDelete(infraction.id)}
                              aria-label="Supprimer"
                              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                              title="Supprimer"
                            >
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

        {/* Pagination */}
        {meta && (
          <div className="px-4 py-3 border-t border-[#F1F5F9] dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[#64748B] dark:text-white/50">
            <span>
              {meta.from || 0}–{meta.to || 0} sur {meta.total || 0} infractions
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(meta.current_page - 1)}
                disabled={meta.current_page === 1}
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-md font-medium">
                {meta.current_page} / {meta.last_page}
              </span>
              <button
                onClick={() => handlePageChange(meta.current_page + 1)}
                disabled={meta.current_page === meta.last_page}
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors"
              >
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
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15"
            >
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
                  {formMode === 'create' ? 'Nouvelle Infraction' : `Modifier l'Infraction #${selectedInfraction?.id}`}
                </h3>
                <button
                  onClick={handleCloseForm}
                  aria-label="Fermer"
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Type d'Infraction" error={formErrors?.type_infraction_id} required>
                    <select
                      value={formData.type_infraction_id}
                      onChange={(e) => setFormData(p => ({ ...p, type_infraction_id: e.target.value }))}
                      className={selectCls}
                      required
                    >
                      <option value="">Sélectionnez le type</option>
                      {typesInfractions.map(t => (
                        <option key={t.id} value={t.id}>[{t.categorie_infraction?.nom || 'Sans cat'}] {t.nom}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Service / Commissariat" error={formErrors?.service_id} required>
                    <select
                      value={formData.service_id}
                      onChange={(e) => setFormData(p => ({ ...p, service_id: e.target.value }))}
                      className={selectCls}
                      required
                    >
                      <option value="">Sélectionnez le service</option>
                      {displayedServices.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </FormField>

                  <FormField label="Commune" error={formErrors?.commune_id} required>
                    <select
                      value={formData.commune_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        setFormData(p => {
                          const filtered = id ? services.filter(s => String(s.commune_id) === id) : services;
                          const hasService = filtered.some(s => String(s.id) === String(p.service_id));
                          return { ...p, commune_id: id, service_id: hasService ? p.service_id : '' };
                        });
                      }}
                      className={selectCls}
                      required
                    >
                      <option value="">Sélectionnez la commune</option>
                      {communes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </FormField>

                  <FormField label="Issue" error={formErrors?.issue} required>
                    <select
                      value={formData.issue}
                      onChange={(e) => setFormData(p => ({ ...p, issue: e.target.value }))}
                      className={selectCls}
                      required
                    >
                      <option value="Constatée">Constatée</option>
                      <option value="Déférée">Déférée</option>
                    </select>
                  </FormField>

                  <FormField label="Statut de traitement" error={formErrors?.workflow_status}>
                    <WorkflowSelect
                      value={formData.workflow_status}
                      onChange={(v) => setFormData(p => ({ ...p, workflow_status: v }))}
                      className={selectCls}
                    />
                  </FormField>

                  <FormField label="Date" error={formErrors?.date} required>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        const d = e.target.value;
                        const annee = d ? new Date(d).getFullYear() : new Date().getFullYear();
                        setFormData(p => ({ ...p, date: d, annee }));
                      }}
                      className={inputCls}
                      required
                    />
                  </FormField>

                  <FormField label="Heure (optionnel)">
                    <input
                      type="time"
                      value={formData.heure}
                      onChange={(e) => setFormData(p => ({ ...p, heure: e.target.value }))}
                      className={inputCls}
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="Lieu Exact" error={formErrors?.lieu} required>
                      <input
                        type="text"
                        value={formData.lieu}
                        onChange={(e) => setFormData(p => ({ ...p, lieu: e.target.value }))}
                        placeholder="Ex: Marché Sandaga, Dakar"
                        className={inputCls}
                        required
                      />
                    </FormField>
                  </div>

                  {isDrugRelated() && (
                    <div className="md:col-span-2 p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg">
                      <h4 className="text-xs font-semibold text-[#9A3412] mb-3">Données Stupéfiants (Optionnel)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-[#64748B] dark:text-white/50 mb-1">Type de Drogue</label>
                          <input
                            type="text"
                            value={formData.type_drogue}
                            onChange={(e) => setFormData(p => ({ ...p, type_drogue: e.target.value }))}
                            placeholder="Ex: Cannabis"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#64748B] dark:text-white/50 mb-1">Unité</label>
                          <input
                            type="text"
                            value={formData.unite}
                            onChange={(e) => setFormData(p => ({ ...p, unite: e.target.value }))}
                            placeholder="Ex: kg"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#64748B] dark:text-white/50 mb-1">Quantité</label>
                          <input
                            type="number"
                            step="any"
                            value={formData.quantite}
                            onChange={(e) => setFormData(p => ({ ...p, quantite: e.target.value }))}
                            placeholder="Ex: 12.5"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <FormField label="Description / Observations" error={formErrors?.description}>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                      />
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
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/60 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="h-9 px-5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143728] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
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
        {isDetailOpen && selectedInfraction && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => { if (e.target === e.currentTarget) setIsDetailOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15"
            >
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
                  Infraction #{selectedInfraction.id}
                </h3>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  aria-label="Fermer"
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Catégorie / Type', value: selectedInfraction.type_infraction?.nom || '-' },
                    { label: 'Date', value: new Date(selectedInfraction.date).toLocaleDateString('fr-FR') },
                    { label: 'Heure', value: selectedInfraction.heure || new Date(selectedInfraction.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' (saisie)' },
                    { label: 'Lieu', value: selectedInfraction.lieu },
                    { label: 'Commune', value: selectedInfraction.commune?.nom || '-' },
                    { label: 'Service', value: selectedInfraction.service?.nom || '-' },
                    { label: 'Saisi par', value: selectedInfraction.user?.name || '-' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">{label}</p>
                      <p className="font-medium text-[#0F172A] dark:text-white">{value}</p>
                    </div>
                  ))}

                  <div>
                    <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Issue</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${
                      selectedInfraction.issue === 'Constatée'
                        ? 'bg-[#16A34A]'
                        : 'bg-[#DC2626]'
                    }`}>
                      {selectedInfraction.issue}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Statut de traitement</p>
                    <WorkflowBadge status={selectedInfraction.workflow_status} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Synchro</p>
                    <span className="text-[#64748B] dark:text-white/50 font-medium uppercase text-xs">{selectedInfraction.sync_status || 'synced'}</span>
                  </div>
                </div>

                {selectedInfraction.type_drogue && (
                  <div className="p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg">
                    <p className="text-xs font-semibold text-[#9A3412] uppercase mb-2">Constat de Stupéfiants</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div><p className="text-[#94A3B8] dark:text-white/30 mb-0.5">Produit</p><p className="font-semibold text-[#0F172A] dark:text-white">{selectedInfraction.type_drogue}</p></div>
                      <div><p className="text-[#94A3B8] dark:text-white/30 mb-0.5">Quantité</p><p className="font-semibold text-[#0F172A] dark:text-white">{selectedInfraction.quantite} {selectedInfraction.unite}</p></div>
                    </div>
                  </div>
                )}

                {selectedInfraction.latitude && (
                  <div>
                    <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Géolocalisation</p>
                    <p className="font-mono text-xs text-[#64748B] dark:text-white/50 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 px-3 py-2 rounded-lg inline-block">
                      {selectedInfraction.latitude}, {selectedInfraction.longitude}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase tracking-wide mb-1">Observations</p>
                  <p className="text-[#64748B] dark:text-white/50 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap">
                    {selectedInfraction.description || 'Aucune observation renseignée.'}
                  </p>
                </div>

                {selectedInfraction.victimes?.length > 0 && (
                  <div className="border-t border-[#F1F5F9] dark:border-white/5 pt-4">
                    <p className="text-xs font-semibold text-[#0F172A] dark:text-white uppercase mb-3">
                      Personnes impliquées ({selectedInfraction.victimes.length})
                    </p>
                    <div className="space-y-2">
                      {selectedInfraction.victimes.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-xs">
                          <div>
                            <p className="font-semibold text-[#0F172A] dark:text-white">{v.prenom} {v.nom}</p>
                            <p className="text-[#94A3B8] dark:text-white/30 mt-0.5">Sexe: {v.sexe || '-'} · Âge: {v.age ? `${v.age} ans` : '-'}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded font-medium text-[#64748B] dark:text-white/50">
                            CIN: {v.no_cin_passeport || 'N/C'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-[#F1F5F9] dark:border-white/5 pt-4">
                  <MediaUpload entityType="infractions" entityId={selectedInfraction.id} readOnly={!perms.canEditInfractions} />
                </div>
              </div>

              <div className="px-6 py-3 border-t border-[#F1F5F9] dark:border-white/5 flex justify-end shrink-0">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/60 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/5 rounded-lg transition-colors"
                >
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
