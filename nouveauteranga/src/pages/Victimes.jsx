import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCached, setCached } from '../lib/pageCache';
import { ShimmerTableRows } from '../components/Shimmer';
import { Toast, useToast } from '../components/ui/Toast';
import { Search, Plus, Trash2, Edit, Eye, X, AlertCircle, User, Contact, Shield, Activity, ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import victimeService from '../services/victimeService';
import MediaUpload from '../components/MediaUpload';
import ConfirmModal from '../components/ui/ConfirmModal';
import SearchInput from '../components/ui/SearchInput';

export default function Victimes() {
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 10, nationalite: '', sexe: '', type: '', est_decede: '' });
  const VIC_CACHE = 'victimes_list';
  const [victimes, setVictimes] = useState(() => getCached(VIC_CACHE) ?? []);
  const [loading, setLoading] = useState(!getCached(VIC_CACHE));
  const [meta, setMeta] = useState(null);
  const [fetchError, setFetchError] = useState(false);

  const [selectedVictime, setSelectedVictime] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    no_cin_passeport: '',
    sexe: 'M',
    age: '',
    nationalite: 'Sénégalaise',
    linkType: 'infraction',
    linkId: '',
    adresse: '',
    telephone: '',
    contact_urgence_nom: '',
    contact_urgence_telephone: '',
    gravite_blessures: '',
    etat_medical: '',
    statut_deces: false,
    observations: '',
  });

  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast, showToast } = useToast();

  const fetchVictimes = useCallback(async (signal) => {
    if (!getCached(VIC_CACHE)) setLoading(true);
    try {
      const queryParams = {
        page: filters.page,
        per_page: filters.per_page,
        search: search || undefined,
        nationalite: filters.nationalite || undefined,
        sexe: filters.sexe || undefined,
        type: filters.type || undefined,
        est_decede: filters.est_decede !== '' ? filters.est_decede : undefined,
      };
      const response = await victimeService.getAll(queryParams, { signal });
      const data = response.data.data || [];
      setVictimes(data);
      if (data.length > 0) setCached(VIC_CACHE, data);
      setMeta(response.data.meta || null);
      setFetchError(false);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    fetchVictimes(controller.signal);
    return () => controller.abort();
  }, [fetchVictimes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (meta?.last_page || 1)) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({
      nom: '', prenom: '', no_cin_passeport: '', sexe: 'M', age: '',
      nationalite: 'Sénégalaise', linkType: 'infraction', linkId: '',
      adresse: '', telephone: '', contact_urgence_nom: '',
      contact_urgence_telephone: '', gravite_blessures: '',
      etat_medical: '', statut_deces: false, observations: '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (victime) => {
    setFormMode('edit');
    setSelectedVictime(victime);
    setFormData({
      nom: victime.nom || '', prenom: victime.prenom || '',
      no_cin_passeport: victime.no_cin_passeport || '',
      sexe: victime.sexe || 'M', age: victime.age ?? '',
      nationalite: victime.nationalite || 'Sénégalaise',
      linkType: victime.accident_id ? 'accident' : 'infraction',
      linkId: victime.accident_id || victime.infraction_id || '',
      adresse: victime.adresse || '',
      telephone: victime.telephone || '',
      contact_urgence_nom: victime.contact_urgence_nom || '',
      contact_urgence_telephone: victime.contact_urgence_telephone || '',
      gravite_blessures: victime.gravite_blessures || '',
      etat_medical: victime.etat_medical || '',
      statut_deces: victime.statut_deces || false,
      observations: victime.observations || '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (victime) => {
    try {
      const response = await victimeService.getOne(victime.id);
      setSelectedVictime(response.data.data || response.data || victime);
      setIsDetailOpen(true);
    } catch {
      setSelectedVictime(victime);
      setIsDetailOpen(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);

    const formattedData = {
      nom: formData.nom || null,
      prenom: formData.prenom || null,
      no_cin_passeport: formData.no_cin_passeport || null,
      sexe: formData.sexe || null,
      age: formData.age !== '' ? parseInt(formData.age) : null,
      nationalite: formData.nationalite || null,
      infraction_id: formData.linkType === 'infraction' && formData.linkId ? parseInt(formData.linkId) : null,
      accident_id: formData.linkType === 'accident' && formData.linkId ? parseInt(formData.linkId) : null,
      adresse: formData.adresse || null,
      telephone: formData.telephone || null,
      contact_urgence_nom: formData.contact_urgence_nom || null,
      contact_urgence_telephone: formData.contact_urgence_telephone || null,
      gravite_blessures: formData.gravite_blessures || null,
      etat_medical: formData.etat_medical || null,
      statut_deces: formData.statut_deces || false,
      observations: formData.observations || null,
    };

    if (!formattedData.infraction_id && !formattedData.accident_id) {
      setFormErrors({ linkId: ["Vous devez obligatoirement renseigner une référence d'accident ou d'infraction."] });
      setActionLoading(false);
      showToast("Veuillez renseigner un ID d'association valide", "error");
      return;
    }

    try {
      if (formMode === 'create') {
        await victimeService.create(formattedData);
        showToast("Victime/Impliqué enregistré avec succès !");
      } else {
        await victimeService.update(selectedVictime.id, formattedData);
        showToast("Fiche victime/impliqué mise à jour !");
      }
      setIsFormOpen(false);
      fetchVictimes();
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setFormErrors(error.response.data.errors || error.response.data.message);
        showToast("Erreur de validation. Veuillez vérifier les champs.", "error");
      } else {
        showToast(error.response?.data?.message || "Une erreur est survenue", "error");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await victimeService.delete(deleteTarget);
      showToast("Enregistrement retiré avec succès !");
      setDeleteTarget(null);
      fetchVictimes();
    } catch (error) {
      showToast(error.response?.data?.message || "Erreur de retrait", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto space-y-6 p-6">
        <AnimatePresence><Toast toast={toast} /></AnimatePresence>

        <ConfirmModal
          isOpen={!!deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
          title="Retirer du registre"
          message="Êtes-vous sûr de vouloir retirer cette personne du registre ?"
        />

        {fetchError && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-lg text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Erreur de chargement — impossible de joindre le serveur. Veuillez réessayer.
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <Contact className="w-6 h-6 text-[#2563EB]" /> Registre des Victimes & Impliqués
            </h1>
            <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Identification et association des personnes aux procédures d'infraction et aux accidents</p>
          </div>
          {perms.canCreateVictimes && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors"
            >
              <Plus className="w-4 h-4" /> Enregistrer une Personne
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setFilters(prev => ({ ...prev, page: 1 })); }}
            placeholder="Rechercher par nom..."
            className="w-full md:w-72"
          />
          <select
            value={filters.nationalite}
            onChange={(e) => setFilters(prev => ({ ...prev, page: 1, nationalite: e.target.value }))}
            className="h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">Toutes nationalités</option>
            <option value="Sénégalaise">Sénégalaise</option>
            <option value="Étrangère">Étrangère</option>
          </select>
          <select
            value={filters.sexe}
            onChange={(e) => setFilters(prev => ({ ...prev, page: 1, sexe: e.target.value }))}
            className="h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">Tous sexes</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, page: 1, type: e.target.value }))}
            className="h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">Tous types</option>
            <option value="accident">Victime d'accident</option>
            <option value="infraction">Victime d'infraction</option>
          </select>
          <select
            value={filters.est_decede}
            onChange={(e) => setFilters(prev => ({ ...prev, page: 1, est_decede: e.target.value }))}
            className="h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
          >
            <option value="">Tous statuts</option>
            <option value="1">Décédé(e)</option>
            <option value="0">Vivant(e)</option>
          </select>
        </div>

        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5">
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Identité</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Sexe</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Âge</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Nationalité / CIN</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Affaire liée</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {loading ? (
                  <ShimmerTableRows rows={5} cols={6} />
                ) : victimes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-[#94A3B8] dark:text-white/30 text-sm">
                      Aucune personne enregistrée.
                    </td>
                  </tr>
                ) : (
                  victimes.map(v => (
                    <tr key={v.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#0F172A] dark:text-white">
                        {v.prenom || ''} {v.nom || ''}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] dark:text-white/50">
                        {v.sexe || '-'}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] dark:text-white/50">
                        {v.age ? `${v.age} ans` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#0F172A] dark:text-white">{v.nationalite || 'Sénégalaise'}</span>
                          <span className="text-[10px] text-[#94A3B8] dark:text-white/30 font-mono">{v.no_cin_passeport || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {v.infraction_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                            <Shield className="w-3 h-3" /> Infraction #{v.infraction_id}
                          </span>
                        ) : v.accident_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                            <Activity className="w-3 h-3" /> Accident #{v.accident_id}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8] dark:text-white/30">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(v)}
                            aria-label="Voir les détails"
                            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                            title="Afficher la fiche"
                          >
                            <Eye aria-hidden="true" className="w-4 h-4" />
                          </button>
                          {perms.canEditVictimes && (
                            <button
                              onClick={() => handleOpenEdit(v)}
                              aria-label="Modifier"
                              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB] transition-colors"
                              title="Modifier"
                            >
                              <Edit aria-hidden="true" className="w-4 h-4" />
                            </button>
                          )}
                          {perms.canDeleteVictimes && (
                            <button
                              onClick={() => handleDelete(v.id)}
                              aria-label="Supprimer"
                              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                              title="Retirer"
                            >
                              <Trash2 aria-hidden="true" className="w-4 h-4" />
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
                Affichage {meta.from} à {meta.to} sur {meta.total} personnes
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-[#CBD5E1] dark:hover:border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#64748B] dark:text-white/50 px-2">
                  {filters.page} / {meta.last_page}
                </span>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === meta.last_page}
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-[#CBD5E1] dark:hover:border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
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
                    <User className="w-4 h-4 text-[#2563EB]" />
                    {formMode === 'create' ? 'Enregistrer une Personne' : 'Modifier la fiche individuelle'}
                  </h2>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="p-1.5 rounded-md text-[#94A3B8] dark:text-white/30 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Prénom</label>
                        <input
                          type="text"
                          placeholder="Ex: Amadou"
                          value={formData.prenom}
                          onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        />
                        {formErrors?.prenom && <p className="text-[#DC2626] text-xs mt-1">{formErrors.prenom[0]}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Nom</label>
                        <input
                          type="text"
                          placeholder="Ex: Ndiaye"
                          value={formData.nom}
                          onChange={e => setFormData({ ...formData, nom: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        />
                        {formErrors?.nom && <p className="text-[#DC2626] text-xs mt-1">{formErrors.nom[0]}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Sexe</label>
                        <select
                          value={formData.sexe}
                          onChange={e => setFormData({ ...formData, sexe: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        >
                          <option value="M">Masculin</option>
                          <option value="F">Féminin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Âge</label>
                        <input
                          type="number"
                          min="0"
                          max="150"
                          placeholder="Ex: 34"
                          value={formData.age}
                          onChange={e => setFormData({ ...formData, age: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        />
                        {formErrors?.age && <p className="text-[#DC2626] text-xs mt-1">{formErrors.age[0]}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Nationalité</label>
                        <select
                          value={formData.nationalite}
                          onChange={e => setFormData({ ...formData, nationalite: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        >
                          <option value="Sénégalaise">Sénégalaise</option>
                          <option value="Étrangère">Étrangère</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">N° CIN / Passeport</label>
                        <input
                          type="text"
                          placeholder="CIN ou Passeport..."
                          value={formData.no_cin_passeport}
                          onChange={e => setFormData({ ...formData, no_cin_passeport: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        />
                        {formErrors?.no_cin_passeport && <p className="text-[#DC2626] text-xs mt-1">{formErrors.no_cin_passeport[0]}</p>}
                      </div>
                    </div>

                    {/* Coordonnées */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Adresse</label>
                        <input type="text" placeholder="Adresse de résidence" value={formData.adresse}
                          onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Téléphone</label>
                        <input type="tel" placeholder="+221 7X XXX XX XX" value={formData.telephone}
                          onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all" />
                      </div>
                    </div>

                    {/* Contact d'urgence */}
                    <div className="bg-[#FFF7ED] dark:bg-[#D97706]/5 border border-[#FED7AA] dark:border-[#D97706]/20 rounded-lg p-3 space-y-2">
                      <span className="block text-xs font-semibold text-[#D97706] uppercase tracking-wide">Contact d'urgence</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Nom du contact</label>
                          <input type="text" placeholder="Nom, prénom" value={formData.contact_urgence_nom}
                            onChange={e => setFormData({ ...formData, contact_urgence_nom: e.target.value })}
                            className="w-full h-8 px-2.5 text-xs bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D97706]/20 focus:border-[#D97706]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Téléphone</label>
                          <input type="tel" placeholder="+221 7X XXX XX XX" value={formData.contact_urgence_telephone}
                            onChange={e => setFormData({ ...formData, contact_urgence_telephone: e.target.value })}
                            className="w-full h-8 px-2.5 text-xs bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D97706]/20 focus:border-[#D97706]" />
                        </div>
                      </div>
                    </div>

                    {/* État médical */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Gravité des blessures</label>
                        <select value={formData.gravite_blessures}
                          onChange={e => setFormData({ ...formData, gravite_blessures: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all">
                          <option value="">— Non renseigné —</option>
                          <option value="Indemne">Indemne</option>
                          <option value="Légère">Légère</option>
                          <option value="Grave">Grave</option>
                          <option value="Critique">Critique</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">État médical</label>
                        <input type="text" placeholder="Ex: Hospitalisé, Soigné…" value={formData.etat_medical}
                          onChange={e => setFormData({ ...formData, etat_medical: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all" />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={formData.statut_deces}
                        onChange={e => setFormData({ ...formData, statut_deces: e.target.checked })}
                        className="w-4 h-4 rounded border-[#CBD5E1] text-[#DC2626] focus:ring-[#DC2626]/20" />
                      <span className="text-sm text-[#DC2626] font-medium">Victime décédée</span>
                    </label>

                    <div>
                      <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Observations</label>
                      <textarea rows={2} placeholder="Informations complémentaires…" value={formData.observations}
                        onChange={e => setFormData({ ...formData, observations: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" />
                    </div>

                    <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-4 space-y-3">
                      <span className="block text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Association de Dossier *</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-sm text-[#64748B] dark:text-white/50 cursor-pointer">
                          <input
                            type="radio"
                            name="linkType"
                            value="infraction"
                            checked={formData.linkType === 'infraction'}
                            onChange={() => setFormData({ ...formData, linkType: 'infraction' })}
                            className="accent-[#2563EB]"
                          />
                          Lier à une Infraction
                        </label>
                        <label className="flex items-center gap-1.5 text-sm text-[#64748B] dark:text-white/50 cursor-pointer">
                          <input
                            type="radio"
                            name="linkType"
                            value="accident"
                            checked={formData.linkType === 'accident'}
                            onChange={() => setFormData({ ...formData, linkType: 'accident' })}
                            className="accent-[#2563EB]"
                          />
                          Lier à un Accident
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#94A3B8] dark:text-white/30 mb-1">Saisissez l'ID du dossier lié *</label>
                        <input
                          type="number"
                          required
                          placeholder="Ex: 12"
                          value={formData.linkId}
                          onChange={e => setFormData({ ...formData, linkId: e.target.value })}
                          className="w-full h-9 px-3 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                        />
                        {formErrors?.linkId && <p className="text-[#DC2626] text-xs mt-1">{formErrors.linkId[0]}</p>}
                      </div>
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
          {isDetailOpen && selectedVictime && (
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
                    <User className="w-4 h-4 text-[#2563EB]" />
                    Fiche d'identité
                  </h2>
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="p-1.5 rounded-md text-[#94A3B8] dark:text-white/30 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-4">
                  <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-4 text-center space-y-1">
                    <span className="text-lg font-bold text-[#0F172A] dark:text-white block">
                      {selectedVictime.prenom || ''} {selectedVictime.nom || ''}
                    </span>
                    <span className="text-xs text-[#94A3B8] dark:text-white/30 font-medium block uppercase">
                      {selectedVictime.sexe === 'M' ? 'Masculin' : 'Féminin'} • {selectedVictime.age ? `${selectedVictime.age} ans` : 'Âge inconnu'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-center">
                      <span className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold block mb-0.5">Nationalité</span>
                      <span className="text-sm font-semibold text-[#0F172A] dark:text-white">{selectedVictime.nationalite || 'Sénégalaise'}</span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-center">
                      <span className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold block mb-0.5">N° CIN / Passeport</span>
                      <span className="text-sm font-mono font-semibold text-[#0F172A] dark:text-white">{selectedVictime.no_cin_passeport || '-'}</span>
                    </div>
                  </div>

                  {/* Nouveaux champs */}
                  {(selectedVictime.adresse || selectedVictime.telephone) && (
                    <div className="space-y-1.5 text-sm">
                      {selectedVictime.adresse && (
                        <div className="flex justify-between py-1.5 border-b border-[#F1F5F9] dark:border-white/5">
                          <span className="text-[#64748B] dark:text-white/50">Adresse</span>
                          <span className="text-[#0F172A] dark:text-white">{selectedVictime.adresse}</span>
                        </div>
                      )}
                      {selectedVictime.telephone && (
                        <div className="flex justify-between py-1.5 border-b border-[#F1F5F9] dark:border-white/5">
                          <span className="text-[#64748B] dark:text-white/50">Téléphone</span>
                          <span className="text-[#0F172A] dark:text-white">{selectedVictime.telephone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(selectedVictime.contact_urgence_nom || selectedVictime.contact_urgence_telephone) && (
                    <div className="p-3 bg-[#FFF7ED] dark:bg-[#D97706]/5 border border-[#FED7AA] rounded-lg">
                      <p className="text-[10px] font-bold text-[#D97706] uppercase mb-1.5">Contact d'urgence</p>
                      <p className="text-xs text-[#0F172A] dark:text-white">{selectedVictime.contact_urgence_nom || '—'}</p>
                      <p className="text-xs text-[#64748B]">{selectedVictime.contact_urgence_telephone || '—'}</p>
                    </div>
                  )}

                  {selectedVictime.gravite_blessures && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748B] dark:text-white/50">Gravité :</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        selectedVictime.gravite_blessures === 'Critique' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                        selectedVictime.gravite_blessures === 'Grave' ? 'bg-[#FFF7ED] text-[#D97706]' :
                        selectedVictime.gravite_blessures === 'Légère' ? 'bg-[#FFFBEB] text-[#CA8A04]' :
                        'bg-[#F0FDF4] text-[#16A34A]'
                      }`}>{selectedVictime.gravite_blessures}</span>
                      {selectedVictime.statut_deces && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1E1E1E] text-white">Décédé</span>
                      )}
                    </div>
                  )}

                  {selectedVictime.observations && (
                    <div className="p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">Observations</p>
                      <p className="text-xs text-[#475569] dark:text-white/60">{selectedVictime.observations}</p>
                    </div>
                  )}

                  {/* Médias */}
                  <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg">
                    <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                      <Paperclip className="w-4 h-4" /> Documents & Photos
                    </p>
                    <MediaUpload entityType="victimes" entityId={selectedVictime.id} />
                  </div>

                  <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg space-y-3">
                    <span className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide block">Dossier de rattachement</span>
                    {selectedVictime.infraction ? (
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                          <Shield className="w-3 h-3" /> Infraction #{selectedVictime.infraction_id}
                        </span>
                        <p className="text-xs text-[#64748B] dark:text-white/50">
                          Type: {selectedVictime.infraction.type_infraction?.nom || 'Infraction enregistrée'}
                        </p>
                        <p className="text-xs text-[#94A3B8] dark:text-white/30">
                          Lieu: {selectedVictime.infraction.lieu}
                        </p>
                      </div>
                    ) : selectedVictime.accident ? (
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          <Activity className="w-3 h-3" /> Accident #{selectedVictime.accident_id}
                        </span>
                        <p className="text-xs text-[#64748B] dark:text-white/50">
                          Type: {selectedVictime.accident.type}
                        </p>
                        <p className="text-xs text-[#94A3B8] dark:text-white/30">
                          Lieu: {selectedVictime.accident.lieu}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-[#94A3B8] dark:text-white/30 italic">Aucune information détaillée de dossier chargée.</span>
                    )}
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
