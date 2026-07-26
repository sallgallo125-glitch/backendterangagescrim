import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerTableRows } from '../components/Shimmer';
import { Search, Plus, Trash2, Edit, Ship, Eye, X, AlertCircle, Calendar, MapPin, Users, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Toast, useToast } from '../components/ui/Toast';
import { immigrationService } from '../services/otherService';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ExportModal from '../components/ui/ExportModal';
import SearchInput from '../components/ui/SearchInput';
import ConfirmModal from '../components/ui/ConfirmModal';
import MediaUpload from '../components/MediaUpload';
import { inputCls, smallInputCls } from '../lib/formStyles';

export default function Immigration() {
  const { user } = useAuth();
  const perms = usePermissions();

  const isAdminOrSuper = perms.canDeleteImmigration;
  const userServiceId = user?.service_id ? String(user.service_id) : '';

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 10 });
  const searchDebounceRef = useRef(null);
  const [dossiers, setDossiers] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);

  const [selectedDossier, setSelectedDossier] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    nombre_interpellation: '',
    date: new Date().toISOString().split('T')[0],
    service_id: '',
    nombre_hommes: '',
    nombre_femmes: '',
    nombre_enfants: '',
    nombre_maries: '',
    nombre_celibataires: '',
    nombre_senegalais: '',
    nombre_etrangers: '',
    zone_depart: '',
    zone_depart_lat: '',
    zone_depart_lng: '',
    zone_arrivee_prevue: '',
    zone_arrivee_lat: '',
    zone_arrivee_lng: '',
  });

  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast, showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDossiers = useCallback(async (signal) => {
    setLoading(true);
    try {
      const queryParams = { ...filters, search: search || undefined };
      const response = await immigrationService.getAll(queryParams, { signal });
      const data = response.data.data || [];
      setDossiers(data);
      setFetchError(false);
      setMeta(response.data.meta || null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDossiers(controller.signal);
    return () => controller.abort();
  }, [fetchDossiers]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const resServices = await geoService.getAllServices();
        const all = (resServices.data.data || resServices.data || []).filter(s => s.gere_immigration);
        setServices(!isAdminOrSuper && userServiceId
          ? all.filter(s => String(s.id) === userServiceId)
          : all
        );
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
      nombre_interpellation: '',
      date: new Date().toISOString().split('T')[0],
      service_id: user?.service_id || '',
      nombre_hommes: '',
      nombre_femmes: '',
      nombre_enfants: '',
      nombre_maries: '',
      nombre_celibataires: '',
      nombre_senegalais: '',
      nombre_etrangers: '',
      zone_depart: '',
      zone_depart_lat: '',
      zone_depart_lng: '',
      zone_arrivee_prevue: '',
      zone_arrivee_lat: '',
      zone_arrivee_lng: '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dossier) => {
    setFormMode('edit');
    setSelectedDossier(dossier);
    setFormData({
      nombre_interpellation: dossier.nombre_interpellation || '',
      date: dossier.date ? dossier.date.split('T')[0] : '',
      service_id: dossier.service_id || '',
      nombre_hommes: dossier.nombre_hommes ?? '',
      nombre_femmes: dossier.nombre_femmes ?? '',
      nombre_enfants: dossier.nombre_enfants ?? '',
      nombre_maries: dossier.nombre_maries ?? '',
      nombre_celibataires: dossier.nombre_celibataires ?? '',
      nombre_senegalais: dossier.nombre_senegalais ?? '',
      nombre_etrangers: dossier.nombre_etrangers ?? '',
      zone_depart: dossier.zone_depart || '',
      zone_depart_lat: dossier.zone_depart_lat ?? '',
      zone_depart_lng: dossier.zone_depart_lng ?? '',
      zone_arrivee_prevue: dossier.zone_arrivee_prevue || '',
      zone_arrivee_lat: dossier.zone_arrivee_lat ?? '',
      zone_arrivee_lng: dossier.zone_arrivee_lng ?? '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (dossier) => {
    setSelectedDossier(dossier);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);

    const formattedData = { ...formData };
    const numericFields = [
      'nombre_interpellation', 'nombre_hommes', 'nombre_femmes', 'nombre_enfants',
      'nombre_maries', 'nombre_celibataires', 'nombre_senegalais', 'nombre_etrangers'
    ];
    numericFields.forEach(field => {
      if (formattedData[field] === '') {
        formattedData[field] = null;
      } else {
        const v = parseInt(formattedData[field]);
        formattedData[field] = isNaN(v) ? null : v;
      }
    });

    const coordsFields = ['zone_depart_lat', 'zone_depart_lng', 'zone_arrivee_lat', 'zone_arrivee_lng'];
    coordsFields.forEach(field => {
      if (formattedData[field] === '') {
        formattedData[field] = null;
      } else {
        formattedData[field] = parseFloat(formattedData[field]);
      }
    });

    try {
      if (formMode === 'create') {
        await immigrationService.create(formattedData);
        showToast("Dossier d'immigration créé avec succès !");
      } else {
        await immigrationService.update(selectedDossier.id, formattedData);
        showToast("Dossier d'immigration mis à jour avec succès !");
      }
      setIsFormOpen(false);
      fetchDossiers();
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await immigrationService.delete(deleteTarget);
      showToast("Dossier supprimé avec succès !");
      fetchDossiers();
    } catch (error) {
      showToast(error.response?.data?.message || "Erreur lors de la suppression", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const inputClass = inputCls;
  const smallInputClass = smallInputCls;

  return (
    <div className="min-h-full">
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} module="immigrations" moduleLabel="Immigration Clandestine" />
      <div className="max-w-[1400px] mx-auto space-y-6 p-6">
        <AnimatePresence><Toast toast={toast} /></AnimatePresence>

        {fetchError && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-lg text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Erreur de chargement — impossible de joindre le serveur. Veuillez réessayer.
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <Ship className="w-6 h-6 text-[#1B4332] dark:text-[#52B788]" /> Lutte contre l'Immigration Clandestine
            </h1>
            <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Recensement, suivi géographique et statistiques des interceptions de pirogues</p>
          </div>
          <div className="flex items-center gap-2">
            {perms.canExportData && (
              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-[#0F172A] dark:text-white bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" /> Exporter
              </button>
            )}
            {perms.canCreateImmigration && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> Nouvelle Saisie
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setFilters(prev => ({ ...prev, page: 1 })); }}
            placeholder="Rechercher par zone ou service..."
            className="w-full md:w-72"
            debounceMs={300}
          />
        </div>

        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5">
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Service Intercepteur</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Zone de Départ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Destination Prévue</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-left">Interpellés</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {loading ? (
                  <ShimmerTableRows rows={5} cols={6} />
                ) : dossiers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-[#94A3B8] dark:text-white/30 text-sm">
                      Aucun dossier d'immigration clandestine enregistré.
                    </td>
                  </tr>
                ) : (
                  dossiers.map(d => (
                    <tr key={d.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-[#64748B] dark:text-white/50">
                        {new Date(d.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0F172A] dark:text-white">
                        {d.service?.nom || '-'}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] dark:text-white/50">
                        {d.zone_depart || '-'}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] dark:text-white/50">
                        {d.zone_arrivee_prevue || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          {d.nombre_interpellation} individus
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(d)}
                            aria-label="Voir les détails"
                            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                            title="Détails"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </button>
                          {perms.canEditImmigration && (
                            <button
                              onClick={() => handleOpenEdit(d)}
                              aria-label="Modifier"
                              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB] transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                          {perms.canDeleteImmigration && (
                            <button
                              onClick={() => setDeleteTarget(d.id)}
                              aria-label="Supprimer"
                              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
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
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-[#CBD5E1] dark:hover:border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-[#CBD5E1] dark:hover:border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15"
              >
                <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                  <h2 className="text-base font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                    <Ship className="w-4 h-4 text-[#2563EB]" />
                    {formMode === 'create' ? 'Enregistrer une Interception' : "Modifier la fiche d'interception"}
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
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-4">
                      <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-3">Informations Générales</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Date d'Interception *</label>
                          <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className={inputClass}
                          />
                          {formErrors?.date && <p className="text-[#DC2626] text-xs mt-1">{formErrors.date[0]}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Nombre Total Interpellés *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="Ex: 45"
                            value={formData.nombre_interpellation}
                            onChange={e => setFormData({ ...formData, nombre_interpellation: e.target.value })}
                            className={inputClass}
                          />
                          {formErrors?.nombre_interpellation && <p className="text-[#DC2626] text-xs mt-1">{formErrors.nombre_interpellation[0]}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1.5">Service Responsable *</label>
                          {!isAdminOrSuper && userServiceId ? (
                            <div className={`${inputClass} bg-[#F1F5F9] dark:bg-white/5 cursor-not-allowed flex items-center`}>
                              {services[0]?.nom || `Service #${userServiceId}`}
                            </div>
                          ) : (
                            <select
                              required
                              value={formData.service_id}
                              onChange={e => setFormData({ ...formData, service_id: e.target.value })}
                              className={inputClass}
                            >
                              <option value="">Sélectionner le service...</option>
                              {services.map(s => (
                                <option key={s.id} value={s.id}>{s.nom}</option>
                              ))}
                            </select>
                          )}
                          {formErrors?.service_id && <p className="text-[#DC2626] text-xs mt-1">{formErrors.service_id[0]}</p>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#2563EB]" /> Répartition Démographique & Profils
                        <span className="text-[#94A3B8] dark:text-white/30 normal-case font-normal">(facultatif)</span>
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                        {[
                          { label: 'Hommes', key: 'nombre_hommes' },
                          { label: 'Femmes', key: 'nombre_femmes' },
                          { label: 'Enfants', key: 'nombre_enfants' },
                          { label: 'Mariés', key: 'nombre_maries' },
                          { label: 'Célibataires', key: 'nombre_celibataires' },
                          { label: 'Sénégalais', key: 'nombre_senegalais' },
                          { label: 'Étrangers', key: 'nombre_etrangers' },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">{label}</label>
                            <input
                              type="number"
                              min="0"
                              value={formData[key]}
                              onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                              className={smallInputClass}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#2563EB]" /> Trajectoire et Coordonnées GPS
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-4 space-y-3">
                          <span className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide block">Zone de Départ</span>
                          <div>
                            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Nom / Port / Plage de départ</label>
                            <input
                              type="text"
                              placeholder="Ex: Mbour, Saint-Louis..."
                              value={formData.zone_depart}
                              onChange={e => setFormData({ ...formData, zone_depart: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-[#94A3B8] dark:text-white/30 mb-1">Lat départ</label>
                              <input
                                type="number"
                                step="0.000001"
                                min="-90"
                                max="90"
                                placeholder="14.26"
                                value={formData.zone_depart_lat}
                                onChange={e => setFormData({ ...formData, zone_depart_lat: e.target.value })}
                                className={smallInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#94A3B8] dark:text-white/30 mb-1">Lng départ</label>
                              <input
                                type="number"
                                step="0.000001"
                                min="-180"
                                max="180"
                                placeholder="-16.99"
                                value={formData.zone_depart_lng}
                                onChange={e => setFormData({ ...formData, zone_depart_lng: e.target.value })}
                                className={smallInputClass}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-4 space-y-3">
                          <span className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide block">Destination Prévue / Cible</span>
                          <div>
                            <label className="block text-xs font-medium text-[#64748B] dark:text-white/50 mb-1">Nom du lieu d'arrivée prévu</label>
                            <input
                              type="text"
                              placeholder="Ex: Îles Canaries, Espagne..."
                              value={formData.zone_arrivee_prevue}
                              onChange={e => setFormData({ ...formData, zone_arrivee_prevue: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-[#94A3B8] dark:text-white/30 mb-1">Lat arrivée</label>
                              <input
                                type="number"
                                step="0.000001"
                                min="-90"
                                max="90"
                                placeholder="28.12"
                                value={formData.zone_arrivee_lat}
                                onChange={e => setFormData({ ...formData, zone_arrivee_lat: e.target.value })}
                                className={smallInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#94A3B8] dark:text-white/30 mb-1">Lng arrivée</label>
                              <input
                                type="number"
                                step="0.000001"
                                min="-180"
                                max="180"
                                placeholder="-15.43"
                                value={formData.zone_arrivee_lng}
                                onChange={e => setFormData({ ...formData, zone_arrivee_lng: e.target.value })}
                                className={smallInputClass}
                              />
                            </div>
                          </div>
                        </div>
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
                        {actionLoading ? 'Enregistrement...' : formMode === 'create' ? 'Valider la Saisie' : 'Mettre à jour'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDetailOpen && selectedDossier && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15"
              >
                <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                  <h2 className="text-base font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                    <Ship className="w-4 h-4 text-[#2563EB]" />
                    Dossier d'Interception N°{selectedDossier.id}
                  </h2>
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    aria-label="Fermer"
                    className="p-1.5 rounded-md text-[#94A3B8] dark:text-white/30 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg p-4">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#94A3B8] dark:text-white/30" />
                      <div>
                        <span className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold block">Date d'Interception</span>
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {new Date(selectedDossier.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-[#94A3B8] dark:text-white/30" />
                      <div>
                        <span className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold block">Nombre d'Interpellés</span>
                        <span className="text-sm font-bold text-[#1B4332] dark:text-[#52B788]">
                          {selectedDossier.nombre_interpellation} individus
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Répartition du profil des migrants</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Hommes', value: selectedDossier.nombre_hommes, barColor: '#1B4332' },
                        { label: 'Femmes', value: selectedDossier.nombre_femmes, barColor: '#7C3AED' },
                        { label: 'Enfants', value: selectedDossier.nombre_enfants, barColor: '#D97706' },
                        { label: 'Mariés', value: selectedDossier.nombre_maries, barColor: '#475569' },
                        { label: 'Célibataires', value: selectedDossier.nombre_celibataires, barColor: '#475569' },
                        { label: 'Sénégalais', value: selectedDossier.nombre_senegalais, barColor: '#16A34A' },
                        { label: 'Étrangers', value: selectedDossier.nombre_etrangers, barColor: '#DC2626' },
                      ].map(({ label, value, barColor }) => (
                        <div key={label} className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden text-center">
                          <div className="h-1" style={{ background: barColor }} />
                          <div className="p-2.5">
                            <span className="text-sm font-bold text-[#0F172A] dark:text-white block">{value ?? '-'}</span>
                            <span className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold block mt-0.5">{label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Parcours géographique</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg">
                        <span className="text-[10px] text-[#C2410C] uppercase font-bold block mb-1">Zone de Départ</span>
                        <span className="text-sm font-semibold text-[#0F172A] block">{selectedDossier.zone_depart || 'Non spécifié'}</span>
                        {selectedDossier.zone_depart_lat != null && selectedDossier.zone_depart_lng != null && (
                          <span className="text-xs text-[#94A3B8] mt-1 block">
                            Coordonnées : {selectedDossier.zone_depart_lat}, {selectedDossier.zone_depart_lng}
                          </span>
                        )}
                      </div>
                      <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                        <span className="text-[10px] text-[#2563EB] uppercase font-bold block mb-1">Destination Prévue</span>
                        <span className="text-sm font-semibold text-[#0F172A] block">{selectedDossier.zone_arrivee_prevue || 'Non spécifié'}</span>
                        {selectedDossier.zone_arrivee_lat != null && selectedDossier.zone_arrivee_lng != null && (
                          <span className="text-xs text-[#94A3B8] mt-1 block">
                            Coordonnées : {selectedDossier.zone_arrivee_lat}, {selectedDossier.zone_arrivee_lng}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#94A3B8] dark:text-white/30 pt-2 border-t border-[#F1F5F9] dark:border-white/5">
                    <span>Enregistré par : {selectedDossier.user?.name || 'Agent GESCRIM'}</span>
                    <span>Service : {selectedDossier.service?.nom || '-'}</span>
                  </div>

                  <div className="border-t border-[#F1F5F9] dark:border-white/5 pt-4">
                    <MediaUpload
                      entityType="immigrations-clandestines"
                      entityId={selectedDossier.id}
                      readOnly={!perms.canEditImmigration}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Supprimer le dossier"
          message="Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action est irréversible."
          confirmLabel="Supprimer"
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </div>
  );
}
