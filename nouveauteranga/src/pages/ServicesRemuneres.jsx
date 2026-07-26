import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast, useToast } from '../components/ui/Toast';
import {
  Search, Plus, Trash2, Edit, Eye, X, AlertCircle,
  DollarSign, Building2, ChevronLeft, ChevronRight, Briefcase
} from 'lucide-react';
import { serviceRemunereService } from '../services/otherService';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ConfirmModal from '../components/ui/ConfirmModal';
import SearchInput from '../components/ui/SearchInput';

const EMPTY_FORM = {
  libelle: '',
  service_id: '',
  date: new Date().toISOString().split('T')[0],
  heure: '',
  montant: '',
  description: '',
};

const ICON_BG_MAP = {
  'bg-[#DBEAFE]': { bg: 'bg-[#1B4332]', border: '#1B4332' },
  'bg-[#DCFCE7]': { bg: 'bg-[#16A34A]', border: '#16A34A' },
  'bg-[#FEF3C7]': { bg: 'bg-[#D97706]', border: '#D97706' },
};

function StatCard({ icon: Icon, label, value, iconBg }) {
  const cfg = ICON_BG_MAP[iconBg] || { bg: 'bg-[#1B4332]', border: '#1B4332' };
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4 flex items-center gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" style={{ borderLeftWidth: '4px', borderLeftColor: cfg.border }}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-[#64748B] dark:text-white/50">{label}</p>
        <p className="text-lg font-bold text-[#0F172A] dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function ServicesRemuneres() {
  const { user } = useAuth();
  const perms = usePermissions();

  const isAdminOrSuper = perms.canDeleteServicesRemuneres;
  const userServiceId = user?.service_id ? String(user.service_id) : '';

  const [search, setSearch]         = useState('');
  const [filters, setFilters]       = useState({ page: 1, per_page: 10 });
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [meta, setMeta]             = useState(null);
  const [services, setServices]     = useState([]);

  const [selected, setSelected]     = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode]     = useState('create');
  const [formData, setFormData]     = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast, showToast } = useToast();

  const fetchRecords = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await serviceRemunereService.getAll({ ...filters, search: search || undefined }, { signal });
      setRecords(res.data?.data || []);
      setMeta(res.data?.meta || null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      showToast('Erreur lors du chargement des services rémunérés', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, search, showToast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecords(controller.signal);
    return () => controller.abort();
  }, [fetchRecords]);

  useEffect(() => {
    geoService.getAllServices()
      .then(r => {
        const all = r.data?.data || r.data || [];
        setServices(isAdminOrSuper ? all : all.filter(s => String(s.id) === userServiceId));
      })
      .catch(() => {});
  }, [isAdminOrSuper, userServiceId]);

  const openCreate = () => {
    setFormData({ ...EMPTY_FORM, service_id: !isAdminOrSuper && userServiceId ? userServiceId : '' });
    setFormErrors(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const openEdit = (rec) => {
    setFormData({
      libelle:     rec.libelle || '',
      service_id:  rec.service_id || '',
      date:        rec.date?.split('T')[0] || '',
      heure:       rec.heure || '',
      montant:     rec.montant || '',
      description: rec.description || '',
    });
    setSelected(rec);
    setFormErrors(null);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const openDetail = async (rec) => {
    try {
      const res = await serviceRemunereService.getOne(rec.id);
      setSelected(res.data?.data || res.data);
    } catch {
      setSelected(rec);
    }
    setIsDetailOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await serviceRemunereService.delete(deleteTarget);
      showToast('Service rémunéré supprimé');
      fetchRecords();
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);
    try {
      const montant = parseFloat(formData.montant);
      if (isNaN(montant) || montant < 0) {
        showToast('Le montant doit être un nombre positif.', 'error');
        setActionLoading(false);
        return;
      }
      const serviceId = parseInt(formData.service_id);
      if (isNaN(serviceId)) {
        showToast('Veuillez sélectionner un service.', 'error');
        setActionLoading(false);
        return;
      }
      const payload = {
        ...formData,
        montant,
        service_id: serviceId,
      };
      if (formMode === 'create') {
        await serviceRemunereService.create(payload);
        showToast('Service rémunéré créé avec succès');
      } else {
        await serviceRemunereService.update(selected.id, payload);
        showToast('Service rémunéré mis à jour');
      }
      setIsFormOpen(false);
      fetchRecords();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || err.response.data.message);
      } else {
        showToast('Erreur lors de la sauvegarde', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const totalMontant = records.reduce((s, r) => s + parseFloat(r.montant || 0), 0);
  const fmt = (v) => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Supprimer le service rémunéré"
        message="Cette action est irréversible. Confirmer la suppression ?"
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#2563EB]" />
            Services Rémunérés
          </h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-0.5">Gestion des prestations rémunérées de la DSP</p>
        </div>
        {perms.canCreateServicesRemuneres && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nouveau service
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Briefcase} label="Total enregistrements" value={meta?.total ?? records.length} iconBg="bg-[#DBEAFE]" iconColor="text-[#2563EB]" />
        <StatCard icon={DollarSign} label="Montant total (page)" value={fmt(totalMontant)} iconBg="bg-[#DCFCE7]" iconColor="text-[#16A34A]" />
        <StatCard icon={Building2} label="Services concernés" value={new Set(records.map(r => r.service_id)).size} iconBg="bg-[#FEF3C7]" iconColor="text-[#D97706]" />
      </div>

      {/* Recherche */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4 flex gap-3">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setFilters(f => ({ ...f, page: 1 })); }}
          placeholder="Rechercher par libellé, service…"
          className="flex-1"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-white/3 border-b border-[#CBD5E1] dark:border-white/15">
              <tr>
                {['Libellé', 'Service', 'Date', 'Montant', 'Description', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="shimmer rounded h-4" /></td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#94A3B8] dark:text-white/30 text-sm">
                    Aucun service rémunéré trouvé.
                  </td>
                </tr>
              ) : records.map(rec => (
                <tr key={rec.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0F172A] dark:text-white max-w-[180px] truncate">{rec.libelle || '—'}</td>
                  <td className="px-4 py-3 text-[#475569] dark:text-white/60 max-w-[160px] truncate">{rec.service?.nom || '—'}</td>
                  <td className="px-4 py-3 text-[#475569] dark:text-white/60 whitespace-nowrap">
                    {rec.date ? new Date(rec.date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#16A34A]">{fmt(rec.montant || 0)}</span>
                  </td>
                  <td className="px-4 py-3 text-[#64748B] dark:text-white/50 max-w-[200px] truncate">{rec.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openDetail(rec)} aria-label="Voir les détails"
                        className="p-1.5 rounded-lg hover:bg-[#EFF6FF] dark:hover:bg-[#1B4332]/10 text-[#2563EB] transition-colors" title="Voir">
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      {perms.canEditServicesRemuneres && (
                        <button onClick={() => openEdit(rec)} aria-label="Modifier"
                          className="p-1.5 rounded-lg hover:bg-[#FFF7ED] dark:hover:bg-[#D97706]/10 text-[#D97706] transition-colors" title="Modifier">
                          <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                      {perms.canDeleteServicesRemuneres && (
                        <button onClick={() => setDeleteTarget(rec.id)} aria-label="Supprimer"
                          className="p-1.5 rounded-lg hover:bg-[#FEF2F2] dark:hover:bg-[#DC2626]/10 text-[#DC2626] transition-colors" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-[#CBD5E1] dark:border-white/15 flex items-center justify-between text-xs text-[#64748B] dark:text-white/40">
            <span>{meta.from}–{meta.to} sur {meta.total}</span>
            <div className="flex items-center gap-1">
              <button disabled={meta.current_page === 1} aria-label="Page précédente"
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/5 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="px-2">Page {meta.current_page} / {meta.last_page}</span>
              <button disabled={meta.current_page === meta.last_page} aria-label="Page suivante"
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/5 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Détail */}
      <AnimatePresence>
        {isDetailOpen && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setIsDetailOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#343a40] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#2563EB]" /> Détail #{selected.id}
                </h2>
                <button onClick={() => setIsDetailOpen(false)} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/5 text-[#64748B]">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Libellé', val: selected.libelle },
                  { label: 'Service', val: selected.service?.nom },
                  { label: 'Date', val: selected.date ? new Date(selected.date).toLocaleDateString('fr-FR') : '—' },
                  { label: 'Montant', val: fmt(selected.montant || 0) },
                  { label: 'Description', val: selected.description },
                  { label: 'Saisi par', val: selected.user?.name },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between gap-4 py-2 border-b border-[#F1F5F9] dark:border-white/5 last:border-0">
                    <span className="text-[#64748B] dark:text-white/50 font-medium">{label}</span>
                    <span className="text-[#0F172A] dark:text-white text-right">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Formulaire */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setIsFormOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#343a40] rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  {formMode === 'create' ? 'Nouveau service rémunéré' : 'Modifier le service'}
                </h2>
                <button onClick={() => setIsFormOpen(false)} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/5 text-[#64748B]">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {formErrors && (
                <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626]">
                  {typeof formErrors === 'string' ? formErrors : Object.values(formErrors).flat().join(' · ')}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#374151] dark:text-white/70 mb-1">Libellé *</label>
                  <input type="text" required value={formData.libelle}
                    onChange={e => setFormData(f => ({ ...f, libelle: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    placeholder="Ex: Garde de nuit, Escorte VIP…" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#374151] dark:text-white/70 mb-1">Service *</label>
                    {isAdminOrSuper ? (
                      <select required value={formData.service_id}
                        onChange={e => setFormData(f => ({ ...f, service_id: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                        <option value="">— Sélectionner —</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 bg-[#F1F5F9] dark:bg-white/3 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#475569] dark:text-white/60 cursor-not-allowed">
                        {services.find(s => String(s.id) === String(formData.service_id))?.nom || '—'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] dark:text-white/70 mb-1">Date *</label>
                    <input type="date" required value={formData.date}
                      onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] dark:text-white/70 mb-1">Heure</label>
                    <input type="time" value={formData.heure}
                      onChange={e => setFormData(f => ({ ...f, heure: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#374151] dark:text-white/70 mb-1">Montant (CFA) *</label>
                  <input type="number" required min="0" step="100" value={formData.montant}
                    onChange={e => setFormData(f => ({ ...f, montant: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    placeholder="Ex: 50000" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#374151] dark:text-white/70 mb-1">Description</label>
                  <textarea rows={3} value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                    placeholder="Observations…" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 text-sm font-medium text-[#64748B] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-[#1B4332] hover:bg-[#143728] text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-60">
                    {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {formMode === 'create' ? 'Créer' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
