import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe2, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight,
  X, MapPin,
} from 'lucide-react';
import geoService from '../services/geoService';
import { Toast, useToast } from '../components/ui/Toast';
import FormField from '../components/ui/FormField';
import SearchInput from '../components/ui/SearchInput';

const inputCls = 'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors placeholder-[#94A3B8] dark:placeholder-white/30';
const selectCls = 'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';

const PAGE_SIZE = 10;

function SkeletonRows({ cols }) {
  return [...Array(3)].map((_, i) => (
    <tr key={i}>
      {[...Array(cols)].map((__, j) => (
        <td key={j} className="px-5 py-4">
          <div className="shimmer rounded h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  ));
}

function Pagination({ page, lastPage, onPageChange, from, to, total, label }) {
  if (lastPage <= 1) return null;
  return (
    <div className="px-5 py-3.5 border-t border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between">
      <span className="text-xs text-[#64748B] dark:text-white/50">
        {from}–{to} sur {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-[#0F172A] dark:text-white tabular-nums">
          {page} / {lastPage}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === lastPage}
          className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── REGIONS TAB ─────────────────────────── */
function RegionsTab({ showToast }) {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ nom: '', code: '' });
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRegions = useCallback(async (signal) => {
    setLoading(true);
    try {
      const r = await geoService.getAllRegions({ signal });
      setRegions(r.data.data || r.data || []);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast('Erreur lors du chargement des régions', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRegions(controller.signal);
    return () => controller.abort();
  }, [fetchRegions]);

  const filtered = regions.filter(r =>
    !search ||
    r.nom?.toLowerCase().includes(search.toLowerCase()) ||
    r.code?.toLowerCase().includes(search.toLowerCase())
  );
  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setFormMode('create'); setSelected(null);
    setFormData({ nom: '', code: '' });
    setFormErrors(null); setIsFormOpen(true);
  };
  const openEdit = (item) => {
    setFormMode('edit'); setSelected(item);
    setFormData({ nom: item.nom || '', code: item.code || '' });
    setFormErrors(null); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setActionLoading(true); setFormErrors(null);
    try {
      if (formMode === 'create') {
        await geoService.createRegion(formData);
        showToast('Région créée avec succès !');
      } else {
        await geoService.updateRegion(selected.id, formData);
        showToast('Région mise à jour !');
      }
      setIsFormOpen(false); fetchRegions();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
        showToast('Veuillez corriger les erreurs', 'error');
      } else {
        showToast(err.response?.data?.message || "Erreur d'enregistrement", 'error');
      }
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await geoService.deleteRegion(deleteTarget.id);
      showToast('Région supprimée !');
      setDeleteTarget(null); fetchRegions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression', 'error');
    } finally { setDeleteLoading(false); }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Rechercher une région…"
          className="w-full sm:max-w-xs"
        />
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter une région
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5">
                {['Code', 'Nom', 'Nb Départements', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide ${i === 3 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <SkeletonRows cols={4} />
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-16 text-center text-sm text-[#94A3B8] dark:text-white/30">
                    Aucune région trouvée.
                  </td>
                </tr>
              ) : paged.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-[#EFF6FF] dark:bg-blue-900/20 text-[#2563EB] border border-[#BFDBFE] dark:border-blue-500/20 px-2 py-1 rounded-lg">
                      {item.code || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#0F172A] dark:text-white">{item.nom}</td>
                  <td className="px-5 py-3.5 text-[#64748B] dark:text-white/50">
                    {item.departements_count ?? item.departements?.length ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button onClick={() => openEdit(item)} aria-label="Modifier" className="p-1.5 text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFF7ED] rounded-lg transition-colors" title="Modifier">
                      <Edit aria-hidden="true" className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(item)} aria-label="Supprimer" className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors" title="Supprimer">
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page} lastPage={lastPage}
          onPageChange={setPage}
          from={(page - 1) * PAGE_SIZE + 1}
          to={Math.min(page * PAGE_SIZE, filtered.length)}
          total={filtered.length}
          label="régions"
        />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-md shadow-lg"
            >
              <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#DBEAFE] rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">
                    {formMode === 'create' ? 'Nouvelle région' : 'Modifier la région'}
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <FormField label="Nom *" error={formErrors?.nom}>
                  <input
                    type="text" required placeholder="Ex: Dakar"
                    value={formData.nom}
                    onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Code *" error={formErrors?.code}>
                  <input
                    type="text" required placeholder="Ex: DKR"
                    value={formData.code}
                    onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                    className={`${inputCls} font-mono uppercase`}
                  />
                </FormField>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                    {actionLoading ? 'Enregistrement…' : formMode === 'create' ? 'Créer' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-sm shadow-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-lg flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-[#DC2626]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Supprimer la région</p>
                  <p className="text-xs text-[#64748B] dark:text-white/50 mt-0.5">Cette action est irréversible.</p>
                </div>
              </div>
              <p className="text-sm text-[#475569] dark:text-white/60">
                Voulez-vous vraiment supprimer <span className="font-semibold text-[#0F172A] dark:text-white">{deleteTarget.nom}</span> ?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={deleteLoading} className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                  {deleteLoading ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────── DEPARTEMENTS TAB ─────────────────────────── */
function DepartementsTab({ showToast }) {
  const [departements, setDepartements] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ nom: '', code: '', region_id: '' });
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAll = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [dRes, rRes] = await Promise.all([
        geoService.getDepartements({ per_page: 200 }, { signal }),
        geoService.getAllRegions({ signal }),
      ]);
      setDepartements(dRes.data.data || dRes.data || []);
      setAllRegions(rRes.data.data || rRes.data || []);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast('Erreur lors du chargement des départements', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, [fetchAll]);

  const filtered = departements.filter(d =>
    d.nom?.toLowerCase().includes(search.toLowerCase()) ||
    d.code?.toLowerCase().includes(search.toLowerCase())
  );
  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getRegionName = (d) =>
    d.region?.nom || allRegions.find(r => r.id === d.region_id)?.nom || '—';

  const openCreate = () => {
    setFormMode('create'); setSelected(null);
    setFormData({ nom: '', code: '', region_id: '' });
    setFormErrors(null); setIsFormOpen(true);
  };
  const openEdit = (item) => {
    setFormMode('edit'); setSelected(item);
    setFormData({ nom: item.nom || '', code: item.code || '', region_id: item.region_id || item.region?.id || '' });
    setFormErrors(null); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setActionLoading(true); setFormErrors(null);
    try {
      if (formMode === 'create') {
        await geoService.createDepartement(formData);
        showToast('Département créé avec succès !');
      } else {
        await geoService.updateDepartement(selected.id, formData);
        showToast('Département mis à jour !');
      }
      setIsFormOpen(false); fetchAll();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
        showToast('Veuillez corriger les erreurs', 'error');
      } else {
        showToast(err.response?.data?.message || "Erreur d'enregistrement", 'error');
      }
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await geoService.deleteDepartement(deleteTarget.id);
      showToast('Département supprimé !');
      setDeleteTarget(null); fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression', 'error');
    } finally { setDeleteLoading(false); }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Rechercher un département…"
          className="w-full sm:max-w-xs"
        />
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter un département
        </button>
      </div>

      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5">
                {['Code', 'Nom', 'Région', 'Nb Communes', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide ${i === 4 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <SkeletonRows cols={5} />
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center text-sm text-[#94A3B8] dark:text-white/30">
                    Aucun département trouvé.
                  </td>
                </tr>
              ) : paged.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-[#EFF6FF] dark:bg-blue-900/20 text-[#2563EB] border border-[#BFDBFE] dark:border-blue-500/20 px-2 py-1 rounded-lg">
                      {item.code || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#0F172A] dark:text-white">{item.nom}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#F0FDF4] dark:bg-green-900/20 text-[#16A34A] border border-[#BBF7D0] dark:border-green-500/20 px-2 py-1 rounded-lg font-medium">
                      {getRegionName(item)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#64748B] dark:text-white/50">
                    {item.communes_count ?? item.communes?.length ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button onClick={() => openEdit(item)} aria-label="Modifier" className="p-1.5 text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFF7ED] rounded-lg transition-colors" title="Modifier">
                      <Edit aria-hidden="true" className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(item)} aria-label="Supprimer" className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors" title="Supprimer">
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page} lastPage={lastPage}
          onPageChange={setPage}
          from={(page - 1) * PAGE_SIZE + 1}
          to={Math.min(page * PAGE_SIZE, filtered.length)}
          total={filtered.length}
          label="départements"
        />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-md shadow-lg"
            >
              <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#DBEAFE] rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">
                    {formMode === 'create' ? 'Nouveau département' : 'Modifier le département'}
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <FormField label="Nom *" error={formErrors?.nom}>
                  <input
                    type="text" required placeholder="Ex: Pikine"
                    value={formData.nom}
                    onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Code *" error={formErrors?.code}>
                  <input
                    type="text" required placeholder="Ex: PIK"
                    value={formData.code}
                    onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                    className={`${inputCls} font-mono uppercase`}
                  />
                </FormField>
                <FormField label="Région *" error={formErrors?.region_id}>
                  <select
                    required value={formData.region_id}
                    onChange={e => setFormData(p => ({ ...p, region_id: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Sélectionner une région…</option>
                    {allRegions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </FormField>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                    {actionLoading ? 'Enregistrement…' : formMode === 'create' ? 'Créer' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-sm shadow-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-lg flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-[#DC2626]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Supprimer le département</p>
                  <p className="text-xs text-[#64748B] dark:text-white/50 mt-0.5">Cette action est irréversible.</p>
                </div>
              </div>
              <p className="text-sm text-[#475569] dark:text-white/60">
                Voulez-vous vraiment supprimer <span className="font-semibold text-[#0F172A] dark:text-white">{deleteTarget.nom}</span> ?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={deleteLoading} className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                  {deleteLoading ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────── COMMUNES TAB ─────────────────────────── */
function CommunesTab({ showToast }) {
  const [communes, setCommunes] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [allDepartements, setAllDepartements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ nom: '', code: '', departement_id: '', region_id: '' });
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAll = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [cRes, rRes, dRes] = await Promise.all([
        geoService.getCommunes({ per_page: 500 }, { signal }),
        geoService.getAllRegions({ signal }),
        geoService.getAllDepartements({ signal }),
      ]);
      setCommunes(cRes.data.data || cRes.data || []);
      setAllRegions(rRes.data.data || rRes.data || []);
      setAllDepartements(dRes.data.data || dRes.data || []);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast('Erreur lors du chargement des communes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, [fetchAll]);

  const filtered = communes.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );
  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getDeptName = (c) =>
    c.departement?.nom || allDepartements.find(d => d.id === c.departement_id)?.nom || '—';
  const getRegionName = (c) => {
    const dept = c.departement || allDepartements.find(d => d.id === c.departement_id);
    if (!dept) return '—';
    return dept.region?.nom || allRegions.find(r => r.id === dept.region_id)?.nom || '—';
  };

  // Filtered departements by selected region in form
  const filteredDepts = formData.region_id
    ? allDepartements.filter(d => String(d.region_id) === String(formData.region_id) || String(d.region?.id) === String(formData.region_id))
    : allDepartements;

  const openCreate = () => {
    setFormMode('create'); setSelected(null);
    setFormData({ nom: '', code: '', departement_id: '', region_id: '' });
    setFormErrors(null); setIsFormOpen(true);
  };
  const openEdit = (item) => {
    setFormMode('edit'); setSelected(item);
    const deptId = item.departement_id || item.departement?.id || '';
    const dept = allDepartements.find(d => d.id === deptId);
    const regionId = dept?.region_id || dept?.region?.id || item.region_id || '';
    setFormData({ nom: item.nom || '', code: item.code || '', departement_id: deptId, region_id: regionId });
    setFormErrors(null); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setActionLoading(true); setFormErrors(null);
    const payload = { nom: formData.nom, code: formData.code, departement_id: formData.departement_id };
    try {
      if (formMode === 'create') {
        await geoService.createCommune(payload);
        showToast('Commune créée avec succès !');
      } else {
        await geoService.updateCommune(selected.id, payload);
        showToast('Commune mise à jour !');
      }
      setIsFormOpen(false); fetchAll();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
        showToast('Veuillez corriger les erreurs', 'error');
      } else {
        showToast(err.response?.data?.message || "Erreur d'enregistrement", 'error');
      }
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await geoService.deleteCommune(deleteTarget.id);
      showToast('Commune supprimée !');
      setDeleteTarget(null); fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression', 'error');
    } finally { setDeleteLoading(false); }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Rechercher une commune…"
          className="w-full sm:max-w-xs"
        />
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter une commune
        </button>
      </div>

      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5">
                {['Code', 'Nom', 'Département', 'Région', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide ${i === 4 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <SkeletonRows cols={5} />
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center text-sm text-[#94A3B8] dark:text-white/30">
                    Aucune commune trouvée.
                  </td>
                </tr>
              ) : paged.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-[#EFF6FF] dark:bg-blue-900/20 text-[#2563EB] border border-[#BFDBFE] dark:border-blue-500/20 px-2 py-1 rounded-lg">
                      {item.code || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#0F172A] dark:text-white">{item.nom}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#FFF7ED] dark:bg-orange-900/20 text-[#D97706] border border-[#FED7AA] dark:border-orange-500/20 px-2 py-1 rounded-lg font-medium">
                      {getDeptName(item)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#F0FDF4] dark:bg-green-900/20 text-[#16A34A] border border-[#BBF7D0] dark:border-green-500/20 px-2 py-1 rounded-lg font-medium">
                      {getRegionName(item)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button onClick={() => openEdit(item)} aria-label="Modifier" className="p-1.5 text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFF7ED] rounded-lg transition-colors" title="Modifier">
                      <Edit aria-hidden="true" className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(item)} aria-label="Supprimer" className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors" title="Supprimer">
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page} lastPage={lastPage}
          onPageChange={setPage}
          from={(page - 1) * PAGE_SIZE + 1}
          to={Math.min(page * PAGE_SIZE, filtered.length)}
          total={filtered.length}
          label="communes"
        />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-md shadow-lg"
            >
              <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#DBEAFE] rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">
                    {formMode === 'create' ? 'Nouvelle commune' : 'Modifier la commune'}
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <FormField label="Nom *" error={formErrors?.nom}>
                  <input
                    type="text" required placeholder="Ex: Grand Yoff"
                    value={formData.nom}
                    onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Code *" error={formErrors?.code}>
                  <input
                    type="text" required placeholder="Ex: GY"
                    value={formData.code}
                    onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                    className={`${inputCls} font-mono uppercase`}
                  />
                </FormField>
                <FormField label="Région (filtre)" error={null}>
                  <select
                    value={formData.region_id}
                    onChange={e => setFormData(p => ({ ...p, region_id: e.target.value, departement_id: '' }))}
                    className={selectCls}
                  >
                    <option value="">Toutes les régions</option>
                    {allRegions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </FormField>
                <FormField label="Département *" error={formErrors?.departement_id}>
                  <select
                    required value={formData.departement_id}
                    onChange={e => setFormData(p => ({ ...p, departement_id: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Sélectionner un département…</option>
                    {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </FormField>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                    {actionLoading ? 'Enregistrement…' : formMode === 'create' ? 'Créer' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-sm shadow-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-lg flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-[#DC2626]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Supprimer la commune</p>
                  <p className="text-xs text-[#64748B] dark:text-white/50 mt-0.5">Cette action est irréversible.</p>
                </div>
              </div>
              <p className="text-sm text-[#475569] dark:text-white/60">
                Voulez-vous vraiment supprimer <span className="font-semibold text-[#0F172A] dark:text-white">{deleteTarget.nom}</span> ?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={deleteLoading} className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                  {deleteLoading ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
const TABS = [
  { key: 'regions', label: 'Régions' },
  { key: 'departements', label: 'Départements' },
  { key: 'communes', label: 'Communes' },
];

export default function GeoAdmin() {
  const [activeTab, setActiveTab] = useState('regions');
  const { toast, showToast } = useToast();

  return (
    <div className="space-y-6 max-w-[1400px]">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#DBEAFE] rounded-xl flex items-center justify-center shadow-sm">
            <Globe2 className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Administration Géographique</h1>
            <p className="text-sm text-[#64748B] dark:text-white/50 mt-0.5">
              Gestion de la hiérarchie administrative du Sénégal
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'regions' && <RegionsTab showToast={showToast} />}
        {activeTab === 'departements' && <DepartementsTab showToast={showToast} />}
        {activeTab === 'communes' && <CommunesTab showToast={showToast} />}
      </div>
    </div>
  );
}
