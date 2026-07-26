import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight,
  X, Layers,
} from 'lucide-react';
import infractionService from '../services/infractionService';
import { Toast, useToast } from '../components/ui/Toast';
import FormField from '../components/ui/FormField';
import SearchInput from '../components/ui/SearchInput';

const inputCls = 'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors placeholder-[#94A3B8] dark:placeholder-white/30';
const selectCls = 'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';
const textareaCls = 'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors resize-none placeholder-[#94A3B8] dark:placeholder-white/30';

const PAGE_SIZE = 10;

function SkeletonRows({ cols }) {
  return [...Array(3)].map((_, i) => (
    <tr key={i}>
      {[...Array(cols)].map((__, j) => (
        <td key={j} className="px-5 py-4">
          <div className="shimmer rounded h-4 w-full max-w-[140px]" />
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

/* ─────────────────────────── CATEGORIES TAB ─────────────────────────── */
function CategoriesTab({ showToast, onCategoriesChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ nom: '', description: '' });
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = useCallback(async (signal) => {
    setLoading(true);
    try {
      const r = await infractionService.getCategories({ signal });
      const data = r.data.data || r.data || [];
      setCategories(data);
      if (onCategoriesChange) onCategoriesChange(data);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast('Erreur lors du chargement des catégories', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, onCategoriesChange]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal);
    return () => controller.abort();
  }, [fetchCategories]);

  const lastPage = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const paged = categories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setFormMode('create'); setSelected(null);
    setFormData({ nom: '', description: '' });
    setFormErrors(null); setIsFormOpen(true);
  };
  const openEdit = (item) => {
    setFormMode('edit'); setSelected(item);
    setFormData({ nom: item.nom || '', description: item.description || '' });
    setFormErrors(null); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setActionLoading(true); setFormErrors(null);
    try {
      if (formMode === 'create') {
        await infractionService.createCategorie(formData);
        showToast('Catégorie créée avec succès !');
      } else {
        await infractionService.updateCategorie(selected.id, formData);
        showToast('Catégorie mise à jour !');
      }
      setIsFormOpen(false); fetchCategories();
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
      await infractionService.deleteCategorie(deleteTarget.id);
      showToast('Catégorie supprimée !');
      setDeleteTarget(null); fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression', 'error');
    } finally { setDeleteLoading(false); }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <p className="text-sm text-[#64748B] dark:text-white/50">
          {categories.length} catégorie{categories.length !== 1 ? 's' : ''} enregistrée{categories.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter une catégorie
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5">
                {['Nom', 'Description', 'Nb Types', 'Actions'].map((h, i) => (
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
                    Aucune catégorie trouvée.
                  </td>
                </tr>
              ) : paged.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-[#0F172A] dark:text-white">{item.nom}</td>
                  <td className="px-5 py-3.5 text-[#64748B] dark:text-white/50 max-w-[320px]">
                    <span className="line-clamp-2">{item.description || <span className="italic text-[#CBD5E1] dark:text-white/20">Aucune description</span>}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] dark:bg-blue-900/20 text-[#2563EB] border border-[#BFDBFE] dark:border-blue-500/20">
                      {item.types_count ?? item.types?.length ?? 0}
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
          to={Math.min(page * PAGE_SIZE, categories.length)}
          total={categories.length}
          label="catégories"
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
                    <Tag className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">
                    {formMode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <FormField label="Nom *" error={formErrors?.nom}>
                  <input
                    type="text" required placeholder="Ex: Infractions routières"
                    value={formData.nom}
                    onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Description" error={formErrors?.description}>
                  <textarea
                    rows={3}
                    placeholder="Description optionnelle de la catégorie…"
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className={textareaCls}
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
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Supprimer la catégorie</p>
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

/* ─────────────────────────── TYPES TAB ─────────────────────────── */
function TypesTab({ showToast, externalCategories }) {
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState(externalCategories || []);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ nom: '', categorie_id: '', description: '' });
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAll = useCallback(async (signal) => {
    setLoading(true);
    try {
      const promises = [infractionService.getTypes({ signal })];
      if (!externalCategories || externalCategories.length === 0) {
        promises.push(infractionService.getCategories({ signal }));
      }
      const results = await Promise.all(promises);
      setTypes(results[0].data.data || results[0].data || []);
      if (results[1]) {
        setCategories(results[1].data.data || results[1].data || []);
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast('Erreur lors du chargement des types', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, externalCategories]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, [fetchAll]);

  // Sync categories from parent when they change
  useEffect(() => {
    if (externalCategories && externalCategories.length > 0) {
      setCategories(externalCategories);
    }
  }, [externalCategories]);

  const filtered = types.filter(t => {
    const matchSearch = t.nom?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategorie
      ? String(t.categorie_id || t.categorie?.id) === String(filterCategorie)
      : true;
    return matchSearch && matchCat;
  });

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getCategorieName = (t) =>
    t.categorie?.nom || categories.find(c => c.id === (t.categorie_id || t.categorie?.id))?.nom || '—';

  const openCreate = () => {
    setFormMode('create'); setSelected(null);
    setFormData({ nom: '', categorie_id: '', description: '' });
    setFormErrors(null); setIsFormOpen(true);
  };
  const openEdit = (item) => {
    setFormMode('edit'); setSelected(item);
    setFormData({
      nom: item.nom || '',
      categorie_id: item.categorie_id || item.categorie?.id || '',
      description: item.description || '',
    });
    setFormErrors(null); setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setActionLoading(true); setFormErrors(null);
    try {
      if (formMode === 'create') {
        await infractionService.createType(formData);
        showToast('Type créé avec succès !');
      } else {
        await infractionService.updateType(selected.id, formData);
        showToast('Type mis à jour !');
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
      await infractionService.deleteType(deleteTarget.id);
      showToast('Type supprimé !');
      setDeleteTarget(null); fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression', 'error');
    } finally { setDeleteLoading(false); }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Rechercher un type…"
            className="w-full sm:w-56"
          />
          {/* Filter by category */}
          <select
            value={filterCategorie}
            onChange={e => { setFilterCategorie(e.target.value); setPage(1); }}
            className={`${selectCls} w-full sm:w-52`}
          >
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter un type
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5">
                {['Nom', 'Catégorie', 'Description', 'Nb Infractions', 'Actions'].map((h, i) => (
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
                    Aucun type d'infraction trouvé.
                  </td>
                </tr>
              ) : paged.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-[#0F172A] dark:text-white">{item.nom}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#EFF6FF] dark:bg-blue-900/20 text-[#2563EB] border border-[#BFDBFE] dark:border-blue-500/20 px-2 py-1 rounded-lg font-medium">
                      {getCategorieName(item)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#64748B] dark:text-white/50 max-w-[260px]">
                    <span className="line-clamp-2">
                      {item.description || <span className="italic text-[#CBD5E1] dark:text-white/20">—</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] dark:bg-green-900/20 text-[#16A34A] border border-[#BBF7D0] dark:border-green-500/20">
                      {item.infractions_count ?? item.infractions?.length ?? 0}
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
          label="types"
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
                    <Layers className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">
                    {formMode === 'create' ? "Nouveau type d'infraction" : "Modifier le type"}
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <FormField label="Nom *" error={formErrors?.nom}>
                  <input
                    type="text" required placeholder="Ex: Excès de vitesse"
                    value={formData.nom}
                    onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Catégorie *" error={formErrors?.categorie_id}>
                  <select
                    required value={formData.categorie_id}
                    onChange={e => setFormData(p => ({ ...p, categorie_id: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Sélectionner une catégorie…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </FormField>
                <FormField label="Description" error={formErrors?.description}>
                  <textarea
                    rows={3}
                    placeholder="Description optionnelle du type d'infraction…"
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className={textareaCls}
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
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">Supprimer le type</p>
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
  { key: 'categories', label: 'Catégories' },
  { key: 'types', label: "Types d'infractions" },
];

export default function CategoriesInfractions() {
  const [activeTab, setActiveTab] = useState('categories');
  const [sharedCategories, setSharedCategories] = useState([]);
  const { toast, showToast } = useToast();

  return (
    <div className="space-y-6 max-w-[1400px]">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#DBEAFE] rounded-xl flex items-center justify-center shadow-sm">
            <Tag className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">
              Catégories &amp; Types d'Infractions
            </h1>
            <p className="text-sm text-[#64748B] dark:text-white/50 mt-0.5">
              Classification et taxonomie des infractions enregistrées
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
        {activeTab === 'categories' && (
          <CategoriesTab
            showToast={showToast}
            onCategoriesChange={setSharedCategories}
          />
        )}
        {activeTab === 'types' && (
          <TypesTab
            showToast={showToast}
            externalCategories={sharedCategories}
          />
        )}
      </div>
    </div>
  );
}
