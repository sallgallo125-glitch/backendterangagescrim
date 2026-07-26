import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerTableRows } from '../components/Shimmer';
import { Toast, useToast } from '../components/ui/Toast';
import { Search, Plus, Trash2, Edit, Eye, X, AlertCircle, FileCheck, Calendar, Briefcase, Landmark, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { amendePieceSaisieService } from '../services/otherService';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ConfirmModal from '../components/ui/ConfirmModal';
import ExportModal from '../components/ui/ExportModal';
import SearchInput from '../components/ui/SearchInput';

export default function Amendes() {
  const { user } = useAuth();
  const perms = usePermissions();

  const isAdminOrSuper = perms.canDeleteAmendes;
  // Agents et admins service ne voient que leur propre service
  const userServiceId = user?.service_id ? String(user.service_id) : '';

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 10 });
  const [amendes, setAmendes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);

  const [selectedAmende, setSelectedAmende] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');

  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    type: 'Amende',
    service_id: '',
    date: new Date().toISOString().split('T')[0],
    heure: '',
    montant: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { toast, showToast } = useToast();

  const fetchAmendes = useCallback(async (signal) => {
    setLoading(true);
    try {
      const queryParams = { ...filters, search: search || undefined };
      const response = await amendePieceSaisieService.getAll(queryParams, { signal });
      setAmendes(response.data.data || []);
      setMeta(response.data.meta || null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast("Erreur lors de la récupération des registres", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    fetchAmendes(controller.signal);
    return () => controller.abort();
  }, [fetchAmendes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const resServices = await geoService.getAllServices();
        const all = resServices.data.data || resServices.data || [];
        // Agents et admins service ne voient que leur propre service
        if (!isAdminOrSuper && userServiceId) {
          setServices(all.filter(s => String(s.id) === userServiceId));
        } else {
          setServices(all);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("Erreur chargement des services", e);
      }
    };
    fetchServices();
  }, [isAdminOrSuper, userServiceId]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (meta?.last_page || 1)) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({
      type: 'Amende',
      service_id: user?.service_id || '',
      date: new Date().toISOString().split('T')[0],
      heure: '',
      montant: '',
      description: '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (amende) => {
    setFormMode('edit');
    setSelectedAmende(amende);
    setFormData({
      type: amende.type || 'Amende',
      service_id: amende.service_id || '',
      date: amende.date ? amende.date.split('T')[0] : '',
      heure: amende.heure || '',
      montant: amende.montant || '',
      description: amende.description || '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (amende) => {
    setSelectedAmende(amende);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);

    const montant = parseFloat(formData.montant);
    if (isNaN(montant) || montant < 0) {
      showToast('Le montant doit être un nombre positif.', 'error');
      setActionLoading(false);
      return;
    }
    const formattedData = {
      ...formData,
      montant,
    };

    try {
      if (formMode === 'create') {
        await amendePieceSaisieService.create(formattedData);
        showToast("Enregistrement créé avec succès !");
      } else {
        await amendePieceSaisieService.update(selectedAmende.id, formattedData);
        showToast("Enregistrement mis à jour avec succès !");
      }
      setIsFormOpen(false);
      fetchAmendes();
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setFormErrors(error.response.data.errors || error.response.data.message);
        showToast("Veuillez corriger les erreurs dans le formulaire", "error");
      } else {
        showToast(error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement", "error");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await amendePieceSaisieService.delete(deleteTarget);
      showToast("Enregistrement supprimé avec succès !");
      fetchAmendes();
    } catch (error) {
      showToast(error.response?.data?.message || "Erreur lors de la suppression", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto space-y-6 p-6">
        <AnimatePresence><Toast toast={toast} /></AnimatePresence>

        <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} module="amendes" moduleLabel="Amendes & Pièces Saisies" />

        <ConfirmModal
          isOpen={deleteTarget !== null}
          title="Supprimer l'enregistrement"
          message="Cette action est irréversible. Confirmer la suppression ?"
          confirmLabel="Supprimer"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-[#1B4332] dark:text-[#52B788]" /> Amendes & Pièces Saisies
            </h1>
            <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Registre des amendes forfaitaires recouvrées et des saisies judiciaires</p>
          </div>
          <div className="flex items-center gap-2">
            {perms.canExportData && (
              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] transition-colors"
              >
                <Download className="w-4 h-4" /> Exporter
              </button>
            )}
            {perms.canCreateAmendes && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors"
              >
                <Plus className="w-4 h-4" /> Nouveau Registre
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setFilters(prev => ({ ...prev, page: 1 })); }}
            placeholder="Rechercher..."
            className="w-full md:w-72"
          />
        </div>

        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5">
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Référence</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Service</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Montant / Valeur</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {loading ? (
                  <ShimmerTableRows rows={5} cols={6} />
                ) : amendes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-[#94A3B8] dark:text-white/30 text-sm">
                      Aucun registre d'amende ou de pièce saisie.
                    </td>
                  </tr>
                ) : (
                  amendes.map(a => (
                    <tr key={a.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1B4332] dark:text-[#52B788]">
                        #{a.id}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] dark:text-white/50">
                        {new Date(a.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${
                          a.type === 'Amende' ? 'bg-[#16A34A]' : 'bg-[#1B4332]'
                        }`}>
                          {a.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0F172A] dark:text-white">
                        {a.service?.nom || '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#0F172A] dark:text-white">
                        {new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF' }).format(a.montant || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(a)}
                            aria-label="Voir les détails"
                            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#1B4332] hover:bg-[#F0FDF4] dark:hover:text-[#52B788] dark:hover:bg-[#1B4332]/20 transition-colors"
                            title="Détails"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </button>
                          {perms.canEditAmendes && (
                            <button
                              onClick={() => handleOpenEdit(a)}
                              aria-label="Modifier"
                              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB] dark:hover:bg-[#D97706]/20 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                          {perms.canDeleteAmendes && (
                            <button
                              onClick={() => setDeleteTarget(a.id)}
                              aria-label="Supprimer"
                              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#DC2626]/20 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="px-4 py-3 border-t border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5 flex justify-between items-center">
              <span className="text-xs text-[#64748B] dark:text-white/50">
                Affichage {meta.from} à {meta.to} sur {meta.total} enregistrements
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  aria-label="Page précédente"
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-[#CBD5E1] dark:hover:border-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="text-xs text-[#64748B] dark:text-white/50 px-2">
                  {filters.page} / {meta.last_page}
                </span>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === meta.last_page}
                  aria-label="Page suivante"
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-[#CBD5E1] dark:hover:border-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15"
              >
                <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                  <h2 className="text-base font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#1B4332] dark:text-[#52B788]" />
                    {formMode === 'create' ? 'Nouveau Registre' : 'Modifier le Registre'}
                  </h2>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    aria-label="Fermer"
                    className="p-1.5 rounded-md text-[#94A3B8] dark:text-white/30 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Type de registre *</label>
                      <select
                        required
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                        className="w-full h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all"
                      >
                        <option value="Amende">Amende Forfaitaire</option>
                        <option value="Pièce saisie">Pièce Saisie</option>
                      </select>
                      {formErrors?.type && <p className="text-[#DC2626] text-xs mt-1">{formErrors.type[0]}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={e => setFormData({ ...formData, date: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all"
                        />
                        {formErrors?.date && <p className="text-[#DC2626] text-xs mt-1">{formErrors.date[0]}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Heure</label>
                        <input
                          type="time"
                          value={formData.heure}
                          onChange={e => setFormData({ ...formData, heure: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Montant / Valeur (FCFA) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Ex: 6000"
                          value={formData.montant}
                          onChange={e => setFormData({ ...formData, montant: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        />
                        {formErrors?.montant && <p className="text-[#DC2626] text-xs mt-1">{formErrors.montant[0]}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Service émetteur *</label>
                      {!isAdminOrSuper && userServiceId ? (
                        <div className="w-full h-9 px-3 text-sm bg-[#F1F5F9] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white flex items-center">
                          {services[0]?.nom || `Service #${userServiceId}`}
                        </div>
                      ) : (
                        <select
                          required
                          value={formData.service_id}
                          onChange={e => setFormData({ ...formData, service_id: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all"
                        >
                          <option value="">Sélectionner le service...</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.nom}</option>
                          ))}
                        </select>
                      )}
                      {formErrors?.service_id && <p className="text-[#DC2626] text-xs mt-1">{formErrors.service_id[0]}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Description / Contenu de la saisie</label>
                      <textarea
                        rows="3"
                        placeholder="Précisez la nature de la pièce saisie ou les détails de l'amende."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                      />
                      {formErrors?.description && <p className="text-[#DC2626] text-xs mt-1">{formErrors.description[0]}</p>}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9] dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/60 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/10 rounded-lg transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Enregistrement...' : formMode === 'create' ? 'Valider' : 'Enregistrer'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDetailOpen && selectedAmende && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15"
              >
                <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                  <h2 className="text-base font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#1B4332] dark:text-[#52B788]" />
                    Détails du Registre #{selectedAmende.id}
                  </h2>
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    aria-label="Fermer"
                    className="p-1.5 rounded-md text-[#94A3B8] dark:text-white/30 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-3">
                  <div className="flex justify-between items-center bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-3.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#94A3B8] dark:text-white/30" />
                      <span className="text-xs font-medium text-[#64748B] dark:text-white/50 uppercase">Date</span>
                    </div>
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                      {new Date(selectedAmende.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-3.5">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-[#94A3B8] dark:text-white/30" />
                      <span className="text-xs font-medium text-[#64748B] dark:text-white/50 uppercase">Type</span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${
                      selectedAmende.type === 'Amende' ? 'bg-[#16A34A]' : 'bg-[#1B4332]'
                    }`}>
                      {selectedAmende.type}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-3.5">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#94A3B8] dark:text-white/30" />
                      <span className="text-xs font-medium text-[#64748B] dark:text-white/50 uppercase">Service Émetteur</span>
                    </div>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-white">
                      {selectedAmende.service?.nom || '-'}
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-3.5 space-y-1">
                    <span className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase block">Montant associé</span>
                    <span className="text-lg font-bold text-[#0F172A] dark:text-white">
                      {new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF' }).format(selectedAmende.montant || 0)}
                    </span>
                  </div>

                  {selectedAmende.description && (
                    <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-3.5 space-y-1">
                      <span className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase block">Description / Notes</span>
                      <p className="text-sm text-[#64748B] dark:text-white/50 whitespace-pre-wrap">{selectedAmende.description}</p>
                    </div>
                  )}

                  <div className="text-xs text-[#94A3B8] dark:text-white/30 text-right pt-2 border-t border-[#F1F5F9] dark:border-white/5">
                    Enregistré par : {selectedAmende.user?.name || 'Agent Terrain'}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
