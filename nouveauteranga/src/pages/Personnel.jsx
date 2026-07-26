import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getCached, setCached } from '../lib/pageCache';
import { ShimmerTableRows } from '../components/Shimmer';
import ConfirmModal from '../components/ui/ConfirmModal';
import { Toast, useToast } from '../components/ui/Toast';
import FormField from '../components/ui/FormField';
import {
  Plus, Trash2, Edit, Eye, X, AlertCircle,
  ChevronLeft, ChevronRight, Users as UsersIcon, Award, Landmark, Calendar, ShieldAlert, Paperclip
} from 'lucide-react';
import SearchInput from '../components/ui/SearchInput';
import personnelService from '../services/personnelService';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import MediaUpload from '../components/MediaUpload';
import { inputCls } from '../lib/formStyles';

function SectionHeader({ children }) {
  return <p className="text-[10px] font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-widest mb-3">{children}</p>;
}

const STATUT_BADGE = {
  Actif: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
  Mission: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
  Inactif: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]',
};

const EMPTY_FORM = {
  ccap: '', prenom: '', nom: '', grade: '', telephone: '',
  anciennete: '', date_entree_corps: '', sexe: 'M',
  situation_matrimoniale: 'Célibataire', date_naissance: '',
  lieu_naissance: '', service_id: '', statut: 'Actif', sanction: '',
};

export default function Personnel() {
  const { user } = useAuth();
  const perms = usePermissions();
  const PERS_CACHE = 'personnel_list';
  const [agents, setAgents] = useState(() => getCached(PERS_CACHE) ?? []);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(!getCached(PERS_CACHE));
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 10, statut: '', grade: '' });
  const searchDebounceRef = useRef(null);
  const [meta, setMeta] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast, showToast } = useToast();

  const fetchAgents = useCallback(async (signal) => {
    if (!getCached(PERS_CACHE)) setLoading(true);
    try {
      const res = await personnelService.getAll({
        ...filters,
        search: search || undefined,
        statut: filters.statut || undefined,
        grade: filters.grade || undefined,
      }, { signal });
      const data = res.data.data || [];
      setAgents(data);
      setFetchError(false);
      setCached(PERS_CACHE, data);
      setMeta(res.data.meta || null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      setFetchError(true);
    } finally { setLoading(false); }
  }, [filters, search]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    fetchAgents(controller.signal);
    return () => controller.abort();
  }, [fetchAgents]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    geoService.getAllServices()
      .then(r => setServices(r.data.data || r.data || []))
      .catch(e => { if (import.meta.env.DEV) console.error(e); });
  }, []);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= (meta?.last_page || 1)) setFilters(prev => ({ ...prev, page: p }));
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({ ...EMPTY_FORM, service_id: user?.service_id || '' });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (agent) => {
    setFormMode('edit');
    setSelectedAgent(agent);
    setFormData({
      ccap: agent.ccap || '', prenom: agent.prenom || '', nom: agent.nom || '',
      grade: agent.grade || '', telephone: agent.telephone || '',
      anciennete: agent.anciennete ?? '', date_entree_corps: agent.date_entree_corps ? agent.date_entree_corps.split('T')[0] : '',
      sexe: agent.sexe || 'M', situation_matrimoniale: agent.situation_matrimoniale || 'Célibataire',
      date_naissance: agent.date_naissance ? agent.date_naissance.split('T')[0] : '',
      lieu_naissance: agent.lieu_naissance || '', service_id: agent.service_id || '',
      statut: agent.statut || 'Actif', sanction: agent.sanction || '',
    });
    setFormErrors(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (agent) => {
    try {
      const res = await personnelService.getOne(agent.id);
      setSelectedAgent(res.data.data || res.data || agent);
    } catch { setSelectedAgent(agent); }
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormErrors(null);
    const sanitized = {};
    Object.keys(formData).forEach(k => { sanitized[k] = formData[k] === '' ? null : formData[k]; });
    const payload = { ...sanitized, anciennete: sanitized.anciennete !== null ? parseInt(sanitized.anciennete) : null };
    try {
      if (formMode === 'create') { await personnelService.create(payload); showToast('Agent créé avec succès !'); }
      else { await personnelService.update(selectedAgent.id, payload); showToast('Fiche agent mise à jour !'); }
      setIsFormOpen(false);
      fetchAgents();
    } catch (err) {
      if (err.response?.status === 422) { setFormErrors(err.response.data.errors || {}); showToast('Veuillez corriger les erreurs', 'error'); }
      else showToast(err.response?.data?.message || "Erreur lors de l'enregistrement", 'error');
    } finally { setActionLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await personnelService.delete(deleteTarget.id);
      showToast('Agent supprimé avec succès !');
      setDeleteTarget(null);
      fetchAgents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const setField = (key, value) => setFormData(p => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <AnimatePresence>{toast && <Toast toast={toast} />}</AnimatePresence>

      {fetchError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-lg text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Impossible de charger les données. Vérifiez votre connexion et réessayez.
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Gestion des Effectifs</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Registre national DSP : officiers, gradés et agents de terrain</p>
        </div>
        {perms.canCreatePersonnel && (
          <button onClick={handleOpenCreate} className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1B4332] rounded-lg hover:bg-[#143728] transition-colors">
            <Plus className="w-4 h-4" /> Ajouter un Agent
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-3 flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setFilters(prev => ({ ...prev, page: 1 })); }}
          placeholder="Rechercher par nom, CCAP, grade..."
          className="flex-1 min-w-[200px]"
          debounceMs={300}
        />
        <select value={filters.statut} onChange={(e) => setFilters(p => ({ ...p, page: 1, statut: e.target.value }))}
          className="h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
          <option value="">Tous les statuts</option>
          <option value="Actif">Actif</option>
          <option value="Inactif">Inactif</option>
          <option value="Mission">Mission</option>
        </select>
      </div>

      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5">
                {['CCAP', 'Agent', 'Grade', 'Affectation', 'Téléphone', 'Statut', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <ShimmerTableRows rows={5} cols={7} />
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <UsersIcon className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-sm text-[#94A3B8] dark:text-white/30">Aucun agent répertorié.</p>
                  </td>
                </tr>
              ) : (
                agents.map(p => {
                  const badgeCls = STATUT_BADGE[p.statut] || STATUT_BADGE.Inactif;
                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#2563EB]">{p.ccap}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#0F172A] dark:text-white text-sm">{p.prenom} {p.nom}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748B] dark:text-white/50 font-medium">{p.grade || '-'}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B] dark:text-white/50">{p.service?.nom || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#64748B] dark:text-white/50">{p.telephone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeCls}`}>
                          {p.statut || 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenDetail(p)} aria-label={`Voir le détail de ${p.prenom} ${p.nom}`} className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"><Eye className="w-4 h-4" aria-hidden="true" /></button>
                          {perms.canEditPersonnel && (
                            <button onClick={() => handleOpenEdit(p)} aria-label={`Modifier ${p.prenom} ${p.nom}`} className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB] transition-colors"><Edit className="w-4 h-4" aria-hidden="true" /></button>
                          )}
                          {perms.canDeletePersonnel && (
                            <button onClick={() => setDeleteTarget(p)} aria-label={`Supprimer l'agent ${p.prenom} ${p.nom}`} className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
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
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-[#F1F5F9] dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[#64748B] dark:text-white/50">
            <span>{meta.from}–{meta.to} sur {meta.total} agents</span>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1}
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-md font-medium">{filters.page} / {meta.last_page}</span>
              <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === meta.last_page}
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        loading={deleteLoading}
        title="Supprimer l'agent"
        message={deleteTarget ? `Voulez-vous vraiment supprimer ${deleteTarget.prenom} ${deleteTarget.nom} (CCAP: ${deleteTarget.ccap}) ?` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* MODAL FORM */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15 my-auto">
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
                  {formMode === 'create' ? 'Ajouter un Agent' : "Modifier la fiche de l'agent"}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[80vh]">
                {/* Section 1: État Civil */}
                <div>
                  <SectionHeader>État Civil & Identification</SectionHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="CCAP" error={formErrors?.ccap} required>
                      <input type="text" value={formData.ccap} onChange={e => setField('ccap', e.target.value)}
                        placeholder="Ex: 504/A" className={`${inputCls} font-mono`} required disabled={formMode === 'edit'} />
                    </FormField>
                    <FormField label="Prénom" error={formErrors?.prenom} required>
                      <input type="text" value={formData.prenom} onChange={e => setField('prenom', e.target.value)}
                        placeholder="Ex: Ousmane" className={inputCls} required />
                    </FormField>
                    <FormField label="Nom" error={formErrors?.nom} required>
                      <input type="text" value={formData.nom} onChange={e => setField('nom', e.target.value)}
                        placeholder="Ex: Diallo" className={inputCls} required />
                    </FormField>
                    <FormField label="Sexe" error={formErrors?.sexe} required>
                      <select value={formData.sexe} onChange={e => setField('sexe', e.target.value)} className={inputCls} required>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </FormField>
                    <FormField label="Date de naissance" error={formErrors?.date_naissance}>
                      <input type="date" value={formData.date_naissance} onChange={e => setField('date_naissance', e.target.value)} max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]} className={inputCls} />
                    </FormField>
                    <FormField label="Lieu de naissance" error={formErrors?.lieu_naissance}>
                      <input type="text" value={formData.lieu_naissance} onChange={e => setField('lieu_naissance', e.target.value)} placeholder="Ex: Dakar" className={inputCls} />
                    </FormField>
                    <FormField label="Situation matrimoniale" error={formErrors?.situation_matrimoniale}>
                      <select value={formData.situation_matrimoniale} onChange={e => setField('situation_matrimoniale', e.target.value)} className={inputCls}>
                        <option value="Célibataire">Célibataire</option>
                        <option value="Marié(e)">Marié(e)</option>
                        <option value="Divorcé(e)">Divorcé(e)</option>
                        <option value="Veuf(ve)">Veuf(ve)</option>
                      </select>
                    </FormField>
                  </div>
                </div>

                {/* Section 2: Données Professionnelles */}
                <div>
                  <SectionHeader>Données Professionnelles</SectionHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Grade" error={formErrors?.grade}>
                      <input type="text" value={formData.grade} onChange={e => setField('grade', e.target.value)}
                        placeholder="Ex: Adjudant, Capitaine..." className={inputCls} />
                    </FormField>
                    <FormField label="Date entrée corps" error={formErrors?.date_entree_corps}>
                      <input type="date" value={formData.date_entree_corps} onChange={e => setField('date_entree_corps', e.target.value)} className={inputCls} />
                    </FormField>
                    <FormField label="Ancienneté (années)" error={formErrors?.anciennete}>
                      <input type="number" min="0" value={formData.anciennete} onChange={e => setField('anciennete', e.target.value)} placeholder="Ex: 5" className={inputCls} />
                    </FormField>
                    <FormField label="Affectation Service" error={formErrors?.service_id} required>
                      <select value={formData.service_id} onChange={e => setField('service_id', e.target.value)} className={inputCls} required>
                        <option value="">Sélectionner...</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Téléphone professionnel" error={formErrors?.telephone}>
                      <input type="text" value={formData.telephone} onChange={e => setField('telephone', e.target.value)}
                        placeholder="Ex: +221 77..." className={`${inputCls} font-mono`} />
                    </FormField>
                    <FormField label="Statut" error={formErrors?.statut} required>
                      <select value={formData.statut} onChange={e => setField('statut', e.target.value)} className={inputCls} required>
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif</option>
                        <option value="Mission">Mission</option>
                      </select>
                    </FormField>
                  </div>
                </div>

                {/* Section 3: Disciplinaire */}
                <div>
                  <SectionHeader>Notes disciplinaires</SectionHeader>
                  <textarea rows={3} value={formData.sanction} onChange={e => setField('sanction', e.target.value)}
                    placeholder="Aucune sanction"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none" />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[#F1F5F9] dark:border-white/5">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/50 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/5 rounded-lg transition-colors">Annuler</button>
                  <button type="submit" disabled={actionLoading} className="h-9 px-5 text-sm font-medium text-white bg-[#1B4332] hover:bg-[#143728] rounded-lg transition-colors disabled:opacity-60">
                    {actionLoading ? 'Enregistrement...' : formMode === 'create' ? 'Valider la Fiche' : 'Sauvegarder'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETAIL */}
      <AnimatePresence>
        {isDetailOpen && selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#343a40] rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden border border-[#CBD5E1] dark:border-white/15 my-auto">
              <div className="px-6 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] flex items-center justify-center shadow-sm">
                    <UsersIcon className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">{selectedAgent.prenom} {selectedAgent.nom}</h3>
                    <p className="text-xs font-mono text-[#64748B] dark:text-white/50">CCAP: {selectedAgent.ccap}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="p-1.5 rounded-md text-[#64748B] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[75vh] text-sm">
                {/* Info générale */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Sexe', value: selectedAgent.sexe === 'M' ? 'Masculin' : 'Féminin' },
                    { label: 'Situation Matrimoniale', value: selectedAgent.situation_matrimoniale || 'Célibataire' },
                    { label: 'Téléphone', value: selectedAgent.telephone || 'Non renseigné', mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg">
                      <p className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold mb-1">{label}</p>
                      <p className={`text-sm font-semibold text-[#0F172A] dark:text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {selectedAgent.date_naissance && (
                  <div className="p-3 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg">
                    <p className="text-[10px] text-[#94A3B8] dark:text-white/30 uppercase font-semibold mb-1">Date & Lieu de Naissance</p>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                      {new Date(selectedAgent.date_naissance).toLocaleDateString('fr-FR')}
                      {selectedAgent.lieu_naissance && ` à ${selectedAgent.lieu_naissance}`}
                    </p>
                  </div>
                )}

                {/* Carrière */}
                <div className="p-4 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wide flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Grade & Affectation
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase mb-0.5">Grade</p>
                      <p className="font-semibold text-[#0F172A]">{selectedAgent.grade || 'Agent simple'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase mb-0.5">Affectation</p>
                      <p className="font-semibold text-[#0F172A] flex items-center gap-1">
                        <Landmark className="w-3.5 h-3.5 text-[#2563EB]" /> {selectedAgent.service?.nom || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase mb-0.5">Ancienneté</p>
                      <p className="font-semibold text-[#0F172A]">{selectedAgent.anciennete ? `${selectedAgent.anciennete} ans` : '-'}</p>
                    </div>
                  </div>
                  {selectedAgent.date_entree_corps && (
                    <div className="pt-2 border-t border-[#BFDBFE] flex items-center gap-2 text-xs text-[#64748B]">
                      <Calendar className="w-4 h-4" />
                      Entrée dans le corps : {new Date(selectedAgent.date_entree_corps).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>

                {/* Statut */}
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-[#94A3B8] dark:text-white/30 uppercase">Statut :</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUT_BADGE[selectedAgent.statut] || STATUT_BADGE.Inactif}`}>
                    {selectedAgent.statut || 'Actif'}
                  </span>
                </div>

                {/* Disciplinaire */}
                <div className="p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg">
                  <p className="text-xs font-semibold text-[#9A3412] uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <ShieldAlert className="w-4 h-4" /> Mesures disciplinaires
                  </p>
                  <p className="text-sm text-[#64748B] whitespace-pre-wrap">
                    {selectedAgent.sanction || 'Aucun dossier disciplinaire ou sanction active.'}
                  </p>
                </div>

                {/* Médias */}
                <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg">
                  <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <Paperclip className="w-4 h-4" /> Documents & Photos
                  </p>
                  <MediaUpload entityType="personnels" entityId={selectedAgent.id} />
                </div>
              </div>

              <div className="px-6 py-3 border-t border-[#F1F5F9] dark:border-white/5 flex justify-end shrink-0">
                <button onClick={() => setIsDetailOpen(false)} className="h-9 px-4 text-sm font-medium text-[#64748B] dark:text-white/50 bg-[#F1F5F9] dark:bg-white/5 hover:bg-[#CBD5E1] dark:hover:bg-white/5 rounded-lg transition-colors">Fermer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
