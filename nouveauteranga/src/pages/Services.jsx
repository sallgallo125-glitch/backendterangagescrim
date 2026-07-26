import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShimmerCard } from '../components/Shimmer';
import {
  Search, Plus, Trash2, Edit, Eye, X,
  Shield, MapPin, Phone, Mail, Users, FileText, Activity, ChevronLeft, ChevronRight, Landmark, Ship
} from 'lucide-react';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Toast, useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import { inputCls } from '../lib/formStyles';
import SearchInput from '../components/ui/SearchInput';

const TYPE_BADGE = {
  CC: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
  CA: 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]',
  PP: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
  CU: 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]',
  CS: 'bg-[#FDF4FF] text-[#9333EA] border-[#F5D0FE]',
};

const typeLabel = (t) => ({
  CC: 'Commissariat Central',
  CA: "Commissariat d'Arrondissement",
  PP: 'Poste de Police',
  CU: 'Commissariat Urbain',
  CS: 'Commissariat Spécial',
}[t] || t);

export default function Services() {
  const { user } = useAuth();
  const perms = usePermissions();
  const rawRole = user?.roles?.[0];
  const role = (typeof rawRole === 'string' ? rawRole : rawRole?.name) || 'agent';
  const isAdminOrSuper = role === 'administrateur' || role === 'gestionnaire';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 9, type: '', commune_id: '' });
  const [meta, setMeta] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [communes, setCommunes] = useState([]);
  const [formData, setFormData] = useState({ nom: '', type: 'CC', commune_id: '', adresse: '', telephone: '', email: '', gere_immigration: false });
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast, showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchServices = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await geoService.getServices({ ...filters, search: search || undefined, type: filters.type || undefined, commune_id: filters.commune_id || undefined }, signal);
      setServices(res.data.data || []);
      setMeta(res.data.meta || null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast('Erreur lors du chargement des services', 'error');
    } finally { setLoading(false); }
  }, [filters, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    fetchServices(controller.signal);
    return () => controller.abort();
  }, [fetchServices]);
  useEffect(() => {
    const loadCommunes = async () => {
      try {
        const scopeType = user?.read_scope_type;
        const scopeId = user?.read_scope_id;
        let params = {};
        if (scopeType === 'region' && scopeId) {
          params = { region_id: scopeId };
        } else if (scopeType === 'departement' && scopeId) {
          params = { departement_id: scopeId };
        } else if (scopeType === 'commune' && scopeId) {
          params = { commune_id: scopeId };
        }
        const r = await geoService.getAllCommunes(params);
        let all = r.data.data || r.data || [];
        // Pour scope service ou commune : restreindre à la commune du service
        if ((scopeType === 'service' || scopeType === 'commune') && scopeId) {
          all = all.filter(c => String(c.id) === String(scopeId));
        }
        setCommunes(all);
      } catch (e) { if (import.meta.env.DEV) console.error(e); }
    };
    loadCommunes();
  }, [user]);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= (meta?.last_page || 1)) setFilters(prev => ({ ...prev, page: p }));
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({ nom: '', type: 'CC', commune_id: '', adresse: '', telephone: '', email: '', gere_immigration: false });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (service) => {
    setFormMode('edit');
    setSelectedService(service);
    setFormData({ nom: service.nom || '', type: service.type || 'CC', commune_id: service.commune_id || '', adresse: service.adresse || '', telephone: service.telephone || '', email: service.email || '', gere_immigration: !!service.gere_immigration });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (service) => {
    try {
      const res = await geoService.getService(service.id);
      setSelectedService(res.data.data || res.data || service);
    } catch { setSelectedService(service); }
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);
    try {
      if (formMode === 'create') { await geoService.createService(formData); showToast('Service créé avec succès !'); }
      else { await geoService.updateService(selectedService.id, formData); showToast('Service mis à jour !'); }
      setIsFormOpen(false);
      fetchServices();
    } catch (err) {
      if (err.response?.status === 422) { setFormErrors(err.response.data.errors || {}); showToast('Veuillez corriger les erreurs', 'error'); }
      else showToast(err.response?.data?.message || 'Une erreur est survenue', 'error');
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await geoService.deleteService(deleteTarget);
      showToast('Service supprimé avec succès !');
      fetchServices();
    } catch (err) { showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'error'); }
    finally { setDeleteLoading(false); setDeleteTarget(null); }
  };

  const setField = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Services & Commissariats</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Gestion administrative des unités de police de la Sécurité Publique</p>
        </div>
        {perms.canCreateServices && (
          <button onClick={handleOpenCreate} className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors">
            <Plus className="w-4 h-4" /> Nouveau Service
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setFilters(p => ({ ...p, page: 1 })); }}
          placeholder="Rechercher par nom..."
          className="flex-1 min-w-[200px]"
        />
        <select value={filters.type} onChange={(e) => setFilters(p => ({ ...p, page: 1, type: e.target.value }))}
          className="h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
          <option value="">Tous les types</option>
          <option value="CC">Commissariat Central (CC)</option>
          <option value="CA">Commissariat d'Arrondissement (CA)</option>
          <option value="PP">Poste de Police (PP)</option>
          <option value="CU">Commissariat Urbain (CU)</option>
          <option value="CS">Commissariat Spécial (CS)</option>
        </select>
      </div>

      {/* Grid view */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <ShimmerCard key={i} />)}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-16 text-center text-[#94A3B8] dark:text-white/30">
          Aucun service ou commissariat répertorié.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => {
            const badgeCls = TYPE_BADGE[s.type] || 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]';
            return (
              <div key={s.id} className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-5 shadow-[0_2px_6px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1B4332] flex items-center justify-center shrink-0 shadow-sm">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeCls}`}>{s.type}</span>
                </div>
                <h3 className="font-semibold text-[#0F172A] dark:text-white text-sm mb-0.5 leading-snug">{s.nom}</h3>
                <p className="text-xs text-[#64748B] dark:text-white/50 mb-3">{typeLabel(s.type)}</p>
                <div className="space-y-1.5 text-xs text-[#64748B] dark:text-white/50 border-t border-[#F1F5F9] dark:border-white/5 pt-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#94A3B8] dark:text-white/30 shrink-0" />
                    <span>{s.commune?.nom || 'Commune non renseignée'}</span>
                  </div>
                  {s.telephone && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#94A3B8] dark:text-white/30 shrink-0" />
                      <span>{s.telephone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#64748B] dark:text-white/50 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {s.personnels_count ?? 0} personnels
                    </span>
                    {s.gere_immigration && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                        <Ship className="w-2.5 h-2.5" aria-hidden="true" /> Immigration
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenDetail(s)} className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"><Eye className="w-4 h-4" /></button>
                    {perms.canEditServices && (
                      <button onClick={() => handleOpenEdit(s)} className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB] transition-colors"><Edit className="w-4 h-4" /></button>
                    )}
                    {perms.canDeleteServices && (
                      <button onClick={() => setDeleteTarget(s.id)} aria-label="Supprimer" className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"><Trash2 aria-hidden="true" className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center items-center gap-2 text-xs">
          <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1}
            className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-md font-medium text-[#64748B] dark:text-white/50">
            {filters.page} / {meta.last_page}
          </span>
          <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === meta.last_page}
            className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL FORM */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15 my-auto">
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">{formMode === 'create' ? 'Nouveau Service' : 'Modifier le Service'}</h3>
                <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#0F172A] dark:text-white mb-1.5">Nom du service<span className="text-[#DC2626] ml-0.5">*</span></label>
                  <input type="text" required value={formData.nom} onChange={e => setField('nom', e.target.value)}
                    placeholder="Ex: Commissariat Central de Dakar" className={inputCls} />
                  {formErrors?.nom && <p className="text-[#DC2626] text-xs mt-1">{formErrors.nom[0]}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] dark:text-white mb-1.5">Type d'unité<span className="text-[#DC2626] ml-0.5">*</span></label>
                    <select required value={formData.type} onChange={e => setField('type', e.target.value)} className={inputCls}>
                      <option value="CC">Commissariat Central (CC)</option>
                      <option value="CA">Commissariat d'Arrondissement (CA)</option>
                      <option value="PP">Poste de Police (PP)</option>
                      <option value="CU">Commissariat Urbain (CU)</option>
                      <option value="CS">Commissariat Spécial (CS)</option>
                    </select>
                    {formErrors?.type && <p className="text-[#DC2626] text-xs mt-1">{formErrors.type[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] dark:text-white mb-1.5">Commune<span className="text-[#DC2626] ml-0.5">*</span></label>
                    <select required value={formData.commune_id} onChange={e => setField('commune_id', e.target.value)} className={inputCls}>
                      <option value="">Sélectionner...</option>
                      {communes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                    {formErrors?.commune_id && <p className="text-[#DC2626] text-xs mt-1">{formErrors.commune_id[0]}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] dark:text-white mb-1.5">Téléphone</label>
                    <input type="text" value={formData.telephone} onChange={e => setField('telephone', e.target.value)}
                      placeholder="Ex: 33 800 00 00" className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] dark:text-white mb-1.5">Email</label>
                    <input type="email" value={formData.email} onChange={e => setField('email', e.target.value)}
                      placeholder="Ex: central.dakar@policesn.org" className={inputCls} />
                    {formErrors?.email && <p className="text-[#DC2626] text-xs mt-1">{formErrors.email[0]}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0F172A] dark:text-white mb-1.5">Adresse Physique</label>
                  <textarea rows={2} value={formData.adresse} onChange={e => setField('adresse', e.target.value)}
                    placeholder="Adresse complète..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none" />
                </div>

                {/* Toggle immigration */}
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.gere_immigration
                      ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                      : 'bg-[#F8FAFC] dark:bg-white/5 border-[#CBD5E1] dark:border-white/10'
                  }`}
                  onClick={() => setField('gere_immigration', !formData.gere_immigration)}
                >
                  <div className="flex items-center gap-2.5">
                    <Ship className={`w-4 h-4 ${formData.gere_immigration ? 'text-[#2563EB]' : 'text-[#94A3B8]'}`} aria-hidden="true" />
                    <div>
                      <p className={`text-xs font-semibold ${formData.gere_immigration ? 'text-[#2563EB]' : 'text-[#0F172A] dark:text-white'}`}>
                        Gestion de l'immigration clandestine
                      </p>
                      <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-0.5">
                        Ce service peut saisir des rapports d'interception de migrants
                      </p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${formData.gere_immigration ? 'bg-[#1B4332]' : 'bg-[#CBD5E1] dark:bg-white/20'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.gere_immigration ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[#F1F5F9] dark:border-white/5">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/60 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/10 rounded-lg transition-colors">Annuler</button>
                  <button type="submit" disabled={actionLoading} className="h-9 px-5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143728] rounded-lg transition-colors disabled:opacity-60">
                    {actionLoading ? 'Enregistrement...' : formMode === 'create' ? 'Créer le Service' : 'Sauvegarder'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETAIL */}
      <AnimatePresence>
        {isDetailOpen && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15">
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1B4332] flex items-center justify-center shrink-0 shadow-sm">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">{selectedService.nom}</h3>
                    <p className="text-xs text-[#64748B] dark:text-white/50">{typeLabel(selectedService.type)}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Users,    value: selectedService.personnels_count ?? 0, label: 'Effectif',   iconBg: 'bg-[#DBEAFE]', iconColor: 'text-[#2563EB]', color: 'text-[#2563EB]' },
                    { icon: FileText, value: selectedService.infractions_count ?? 0, label: 'Infractions', iconBg: 'bg-[#FEF3C7]', iconColor: 'text-[#D97706]', color: 'text-[#D97706]' },
                    { icon: Activity, value: selectedService.accidents_count ?? 0, label: 'Accidents',   iconBg: 'bg-[#FEE2E2]', iconColor: 'text-[#DC2626]', color: 'text-[#DC2626]' },
                  ].map(({ icon: Icon, value, label, iconBg, iconColor, color }) => (
                    <div key={label} className="p-3 bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-xl text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <p className="text-[10px] text-[#94A3B8] uppercase font-semibold mb-0.5">{label}</p>
                      <p className={`text-lg font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#94A3B8] dark:text-white/30 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold mb-0.5">Périmètre Communal</p>
                      <p className="font-medium text-[#0F172A] dark:text-white">
                        {selectedService.commune?.nom}
                        {selectedService.commune?.departement?.nom && ` — Dept. ${selectedService.commune.departement.nom}`}
                        {selectedService.commune?.departement?.region?.nom && `, Région ${selectedService.commune.departement.region.nom}`}
                      </p>
                    </div>
                  </div>
                  {selectedService.adresse && (
                    <div className="flex items-start gap-2.5 pt-3 border-t border-[#CBD5E1] dark:border-white/15">
                      <Landmark className="w-4 h-4 text-[#94A3B8] dark:text-white/30 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold mb-0.5">Adresse Physique</p>
                        <p className="text-[#64748B] dark:text-white/50">{selectedService.adresse}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${selectedService.gere_immigration ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-[#F8FAFC] dark:bg-white/5 border-[#CBD5E1] dark:border-white/10'}`}>
                  <Ship className={`w-4 h-4 shrink-0 ${selectedService.gere_immigration ? 'text-[#2563EB]' : 'text-[#94A3B8]'}`} />
                  <div>
                    <p className={`text-xs font-semibold ${selectedService.gere_immigration ? 'text-[#2563EB]' : 'text-[#64748B] dark:text-white/50'}`}>
                      {selectedService.gere_immigration ? 'Habilité immigration clandestine' : 'Non habilité immigration clandestine'}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] dark:text-white/30 mt-0.5">
                      {selectedService.gere_immigration
                        ? 'Ce service peut enregistrer des rapports d\'interception de migrants'
                        : 'Ce service ne traite pas les dossiers d\'immigration clandestine'}
                    </p>
                  </div>
                </div>

                {(selectedService.telephone || selectedService.email) && (
                  <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg space-y-2 text-xs">
                    <p className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold">Contacts</p>
                    {selectedService.telephone && (
                      <div className="flex items-center gap-2 font-mono text-[#0F172A] dark:text-white">
                        <Phone className="w-4 h-4 text-[#94A3B8] dark:text-white/30" /> {selectedService.telephone}
                      </div>
                    )}
                    {selectedService.email && (
                      <div className="flex items-center gap-2 text-[#0F172A] dark:text-white">
                        <Mail className="w-4 h-4 text-[#94A3B8] dark:text-white/30" /> {selectedService.email}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-3 border-t border-[#F1F5F9] dark:border-white/5 flex justify-end">
                <button onClick={() => setIsDetailOpen(false)} className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/60 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/10 rounded-lg transition-colors">Fermer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer le service"
        message="Êtes-vous sûr de vouloir supprimer ce service ? Cette action supprimera également les liaisons de personnel."
        confirmLabel="Supprimer"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
