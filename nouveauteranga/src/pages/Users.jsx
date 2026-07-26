import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerTableRows } from '../components/Shimmer';
import { Plus, Trash2, Edit, Eye, X, AlertCircle, CheckCircle, ShieldCheck, Mail, Phone, EyeOff, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import SearchInput from '../components/ui/SearchInput';
import { Toast, useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import userService from '../services/userService';
import geoService from '../services/geoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const ROLE_BADGE = {
  administrateur: 'bg-[#C2410C] text-white',
  gestionnaire:   'bg-[#7C3AED] text-white',
  agent:          'bg-[#16A34A] text-white',
};
const roleBadgeCls = (rolesArr) => {
  const first = rolesArr?.[0];
  const name = typeof first === 'string' ? first : first?.name;
  return ROLE_BADGE[name] || 'bg-[#6B7280] text-white';
};

const inputCls = 'w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';
const selectCls = 'w-full px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';

function FormField({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#64748B] dark:text-white/50 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-[#DC2626] text-xs mt-1">{error[0]}</p>}
    </div>
  );
}

// Rôles qu'un utilisateur connecté peut attribuer (miroir backend)
const ASSIGNABLE_ROLES = {
  administrateur: ['administrateur', 'gestionnaire', 'agent'],
  admin:          ['administrateur', 'gestionnaire', 'agent'],
  gestionnaire:   ['agent'],
  agent:          [],
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const perms = usePermissions();
  const firstRole = currentUser?.roles?.[0];
  const currentRole = (typeof firstRole === 'string' ? firstRole : firstRole?.name) || currentUser?.role || '';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ page: 1, per_page: 10 });
  const [meta, setMeta] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');

  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);
  const [regions, setRegions] = useState([]);
  const [scopeDepts, setScopeDepts] = useState([]);
  const [scopeCommunes, setScopeCommunes] = useState([]);
  const [scopeServices, setScopeServices] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', telephone: '', service_id: '',
    role: '', is_active: true,
    read_scope_type: 'service', read_scope_id: '',
    scope_region: '', scope_dept: '', scope_commune: '',
  });
  const setField = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const [formErrors, setFormErrors] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast, showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await userService.getAll({ ...filters, search: search || undefined });
      setUsers(r.data.data || []);
      setMeta(r.data.meta || null);
    } catch {
      showToast('Erreur lors de la récupération des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const [resRoles, resRegions, resSvc] = await Promise.all([
          userService.getRoles(),
          geoService.getAllRegions(),
          geoService.getAllServices(),
        ]);
        setRoles(resRoles.data.data || resRoles.data || []);
        setRegions(resRegions.data.data || resRegions.data || []);
        setServices(resSvc.data.data || resSvc.data || []);
      } catch (e) { if (import.meta.env.DEV) console.error(e); }
    };
    fetchAux();
  }, []);


  const handlePageChange = (p) => {
    if (p >= 1 && p <= (meta?.last_page || 1)) setFilters(prev => ({ ...prev, page: p }));
  };

  const openCreate = () => {
    setFormMode('create');
    setFormData({
      name: '', email: '', password: '', telephone: '', service_id: '',
      role: roles[0]?.name || 'agent', is_active: true,
      read_scope_type: 'service', read_scope_id: '',
      scope_region: '', scope_dept: '', scope_commune: '',
    });
    setScopeDepts([]); setScopeCommunes([]); setScopeServices([]);
    setFormErrors(null); setShowPassword(false); setIsFormOpen(true);
  };

  const openEdit = (u) => {
    setFormMode('edit'); setSelectedUser(u);
    setFormData({
      name: u.name || '', email: u.email || '', password: '',
      telephone: u.telephone || '', service_id: u.service_id || '',
      role: u.roles?.[0]?.name || 'agent', is_active: u.is_active ?? true,
      read_scope_type: u.read_scope_type || 'service', read_scope_id: u.read_scope_id || '',
      scope_region: '', scope_dept: '', scope_commune: '',
    });
    setScopeDepts([]); setScopeCommunes([]); setScopeServices([]);
    setFormErrors(null); setShowPassword(false); setIsFormOpen(true);
  };

  const openDetail = async (u) => {
    try {
      const r = await userService.getOne(u.id);
      setSelectedUser(r.data.data || r.data || u);
    } catch { setSelectedUser(u); }
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setActionLoading(true); setFormErrors(null);

    const role = formData.role;

    // Un agent doit obligatoirement avoir un service
    if (role === 'agent' && !formData.service_id) {
      setFormErrors({ service_id: [`Un agent doit être rattaché à un service.`] });
      setActionLoading(false);
      return;
    }

    // Calcul automatique du scope selon le rôle
    let scopeType, scopeId;
    if (role === 'administrateur' || role === 'admin') {
      scopeType = 'national';
      scopeId = null;
    } else if (role === 'agent') {
      // L'agent hérite le scope du service auquel il est rattaché
      scopeType = 'service';
      scopeId = formData.service_id ? parseInt(formData.service_id) : null;
    } else {
      // gestionnaire : portée choisie dans le formulaire
      scopeType = formData.read_scope_type;
      scopeId = formData.read_scope_id ? parseInt(formData.read_scope_id) : null;
    }

    const payload = {
      name: formData.name, email: formData.email, telephone: formData.telephone,
      service_id: role === 'agent' ? (formData.service_id || null) : null,
      role: formData.role, is_active: formData.is_active ? 1 : 0,
      read_scope_type:  scopeType, read_scope_id:  scopeId,
      write_scope_type: scopeType, write_scope_id: scopeId,
    };
    if (formData.password) payload.password = formData.password;
    if (formMode === 'edit' && !formData.password) delete payload.password;
    try {
      if (formMode === 'create') {
        await userService.create(payload);
        showToast('Utilisateur créé. Les identifiants ont été envoyés par email.');
      } else {
        await userService.update(selectedUser.id, payload);
        showToast('Utilisateur mis à jour avec succès !');
      }
      setIsFormOpen(false); fetchUsers();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || err.response.data.message);
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
      await userService.delete(deleteTarget);
      showToast('Utilisateur supprimé avec succès !'); fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de suppression', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const SCOPE_TYPES = ['service', 'commune', 'departement', 'region', 'national'];

  const SCOPE_LABELS = {
    national: 'National (tout le pays)',
    region: 'Région',
    departement: 'Département',
    commune: 'Commune',
    service: 'Service / Commissariat',
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white">Utilisateurs & Habilitations</h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">Gestion des comptes, rôles et portées territoriales</p>
        </div>
        {perms.canCreateUsers && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Ajouter un utilisateur
          </button>
        )}
      </div>

      {/* Bandeau portée territoriale — visible pour le gestionnaire */}
      {currentRole === 'gestionnaire' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#EFF6FF] dark:bg-[#1E3A5F] border border-[#BFDBFE] dark:border-[#2563EB]/40 rounded-xl text-sm text-[#1D4ED8] dark:text-[#93C5FD]">
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Vous visualisez uniquement les utilisateurs rattachés à votre{' '}
            {currentUser?.read_scope_type === 'service' ? 'service' : 'région'}
            {currentUser?.read_scope_id ? ` (ID : ${currentUser.read_scope_id})` : ''}.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4">
        <SearchInput
          value={search}
          onChange={(val) => { setSearch(val); setFilters(p => ({ ...p, page: 1 })); }}
          placeholder="Rechercher par nom ou email…"
          className="flex-1 min-w-[200px]"
          debounceMs={300}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5">
                {['Identité', 'Email', 'Rôle', 'Scope lecture', 'État', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
              {loading ? (
                <ShimmerTableRows rows={5} cols={6} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-16 text-center text-sm text-[#94A3B8] dark:text-white/30">Aucun utilisateur trouvé.</td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-[#0F172A] dark:text-white text-sm">{u.name}</td>
                  <td className="px-5 py-3.5 text-[#475569] dark:text-white/60 text-sm">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadgeCls(u.roles)}`}>
                      {(typeof u.roles?.[0] === 'string' ? u.roles[0] : u.roles?.[0]?.name) || 'agent'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#475569] text-white">
                      {u.read_scope_type || 'service'} ({u.read_scope_id || '—'})
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${u.is_active ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'}`}>
                      {u.is_active ? 'Actif' : 'Bloqué'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button onClick={() => openDetail(u)} aria-label="Voir les détails" className="p-1.5 text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors" title="Détails">
                      <Eye aria-hidden="true" className="w-4 h-4" />
                    </button>
                    {perms.canEditUsers && (
                      <button onClick={() => openEdit(u)} aria-label="Modifier" className="p-1.5 text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFF7ED] rounded-lg transition-colors" title="Modifier">
                        <Edit aria-hidden="true" className="w-4 h-4" />
                      </button>
                    )}
                    {perms.canDeleteUsers && (
                      <button
                        onClick={() => u.id === currentUser?.id ? showToast('Vous ne pouvez pas supprimer votre propre compte !', 'error') : setDeleteTarget(u.id)}
                        disabled={u.id === currentUser?.id}
                        aria-label="Supprimer"
                        className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors disabled:opacity-30"
                        title="Supprimer"
                      >
                        <Trash2 aria-hidden="true" className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div className="px-5 py-3.5 border-t border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between">
            <span className="text-xs text-[#64748B] dark:text-white/50">
              {meta.from}–{meta.to} sur {meta.total} utilisateurs
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
                className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-[#0F172A] dark:text-white tabular-nums">
                {filters.page} / {meta.last_page}
              </span>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === meta.last_page}
                className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto flex items-start justify-center p-4" onClick={() => setIsFormOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-3xl shadow-lg my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 flex items-center justify-between bg-[#F8FAFC] dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#DBEAFE] rounded-xl flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="font-semibold text-[#0F172A] dark:text-white text-sm">
                    {formMode === 'create' ? 'Nouvel utilisateur' : 'Modifier le compte'}
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Section 1: Identité */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-wider">Informations d'identité</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Nom complet *" error={formErrors?.name}>
                      <input type="text" required placeholder="Ex: Babacar Seck" value={formData.name} onChange={e => setField('name', e.target.value)} className={inputCls} />
                    </FormField>
                    <FormField label="Email unique *" error={formErrors?.email}>
                      <input type="email" required placeholder="b.seck@policesn.org" value={formData.email} onChange={e => setField('email', e.target.value)} className={inputCls} disabled={formMode === 'edit'} />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {formMode === 'edit' && (
                      <FormField label="Nouveau mot de passe" error={formErrors?.password}>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Laisser vide si inchangé"
                            value={formData.password}
                            onChange={e => setField('password', e.target.value)}
                            className={`${inputCls} pr-10 font-mono`}
                          />
                          <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] dark:text-white/30 hover:text-[#475569] dark:hover:text-white/60">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormField>
                    )}
                    {formMode === 'create' && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs text-[#16A34A]">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Un mot de passe sécurisé sera généré automatiquement et envoyé par email à l'utilisateur.
                      </div>
                    )}
                    <FormField label="Téléphone">
                      <input type="text" placeholder="+221 77 000 00 00" value={formData.telephone} onChange={e => setField('telephone', e.target.value)} className={`${inputCls} font-mono`} />
                    </FormField>
                    {formData.role === 'agent' && (
                      <FormField label="Unité d'affectation *" error={formErrors?.service_id}>
                        <select value={formData.service_id} onChange={e => setField('service_id', e.target.value)} className={selectCls}>
                          <option value="">— Sélectionner un service —</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                        </select>
                      </FormField>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#CBD5E1] dark:border-white/15" />

                {/* Section 2: Rôles & Scopes */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-wider">Rôles & Permissions territoriales</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Rôle système *" error={formErrors?.role}>
                      <select
                        required
                        value={formData.role}
                        onChange={e => {
                          const selectedRole = e.target.value;
                          setField('role', selectedRole);
                          if (selectedRole === 'agent') {
                            setField('read_scope_type', 'service');
                            setField('write_scope_type', 'service');
                          } else if (selectedRole === 'gestionnaire') {
                            setField('read_scope_type', 'region');
                            setField('write_scope_type', 'region');
                          } else if (selectedRole === 'administrateur' || selectedRole === 'admin') {
                            setField('read_scope_type', 'national');
                            setField('write_scope_type', 'national');
                          }
                        }}
                        className={selectCls}
                      >
                        <option value="">Sélectionner un rôle…</option>
                        {roles
                          .filter(r => (ASSIGNABLE_ROLES[currentRole] || []).includes(r.name))
                          .map(r => <option key={r.id} value={r.name}>{r.name}</option>)
                        }
                      </select>
                    </FormField>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2.5 text-sm text-[#475569] dark:text-white/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={e => setField('is_active', e.target.checked)}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]/20"
                        />
                        <span className="font-medium">Compte actif</span>
                      </label>
                    </div>
                  </div>

                  {/* Bandeau scope automatique pour admin et agent */}
                  {(formData.role === 'administrateur' || formData.role === 'admin') && (
                    <div className="flex items-start gap-2.5 p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg text-xs text-[#C2410C]">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Portée <strong>nationale</strong> — l'administrateur accède à toutes les données du système sans restriction territoriale.</span>
                    </div>
                  )}
                  {formData.role === 'agent' && formData.service_id && (
                    <div className="flex items-start gap-2.5 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs text-[#16A34A]">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span>Portée <strong>service</strong> — l'agent accède uniquement aux données de son unité d'affectation.</span>
                    </div>
                  )}

                  {/* Portée territoriale — uniquement pour le gestionnaire */}
                  {(formData.role === 'gestionnaire') && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-2.5 p-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg text-xs text-[#7C3AED]">
                        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                        <span>Portée <strong>territoriale limitée</strong> — définissez ci-dessous la zone géographique du gestionnaire (région, département, commune ou service).</span>
                      </div>
                      <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide">Portée territoriale</p>

                      {/* Niveau */}
                      <FormField label="Niveau d'accès" error={formErrors?.read_scope_type}>
                        <select
                          value={formData.read_scope_type}
                          onChange={e => {
                            const val = e.target.value;
                            setField('read_scope_type', val);
                            setField('read_scope_id', '');
                            setField('scope_region', '');
                            setField('scope_dept', '');
                            setField('scope_commune', '');
                            setScopeDepts([]); setScopeCommunes([]); setScopeServices([]);
                            if (val === 'departement' || val === 'commune' || val === 'service') {
                              geoService.getAllDepartements().then(r => setScopeDepts(r.data.data || r.data || [])).catch(() => {});
                            }
                          }}
                          className={selectCls}
                        >
                          {SCOPE_TYPES.filter(t => {
                            if (formData.role === 'gestionnaire') return ['region', 'departement', 'commune', 'service'].includes(t);
                            return t !== 'national';
                          }).map(t => <option key={t} value={t}>{SCOPE_LABELS[t]}</option>)}
                        </select>
                      </FormField>

                      {/* Région */}
                      {formData.read_scope_type !== 'national' && (
                        <FormField label="Région">
                          <select
                            value={formData.read_scope_type === 'region' ? formData.read_scope_id : formData.scope_region}
                            onChange={e => {
                              const regionId = e.target.value;
                              if (formData.read_scope_type === 'region') {
                                setField('read_scope_id', regionId);
                              } else {
                                setField('scope_region', regionId);
                                setField('read_scope_id', '');
                                setField('scope_dept', '');
                                setField('scope_commune', '');
                                setScopeCommunes([]); setScopeServices([]);
                                if (regionId) {
                                  geoService.getAllDepartements({ region_id: regionId })
                                    .then(r => setScopeDepts(r.data.data || r.data || [])).catch(() => {});
                                }
                              }
                            }}
                            className={selectCls}
                          >
                            <option value="">— Sélectionner une région —</option>
                            {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                          </select>
                        </FormField>
                      )}

                      {/* Département */}
                      {['departement', 'commune', 'service'].includes(formData.read_scope_type) && formData.scope_region && (
                        <FormField label="Département">
                          <select
                            value={formData.read_scope_type === 'departement' ? formData.read_scope_id : formData.scope_dept}
                            onChange={e => {
                              const deptId = e.target.value;
                              if (formData.read_scope_type === 'departement') {
                                setField('read_scope_id', deptId);
                              } else {
                                setField('scope_dept', deptId);
                                setField('read_scope_id', '');
                                setField('scope_commune', '');
                                setScopeServices([]);
                                if (deptId) {
                                  geoService.getAllCommunes({ departement_id: deptId })
                                    .then(r => setScopeCommunes(r.data.data || r.data || [])).catch(() => {});
                                }
                              }
                            }}
                            className={selectCls}
                          >
                            <option value="">— Sélectionner un département —</option>
                            {scopeDepts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                          </select>
                        </FormField>
                      )}

                      {/* Commune */}
                      {['commune', 'service'].includes(formData.read_scope_type) && formData.scope_dept && (
                        <FormField label="Commune">
                          <select
                            value={formData.read_scope_type === 'commune' ? formData.read_scope_id : formData.scope_commune}
                            onChange={e => {
                              const communeId = e.target.value;
                              if (formData.read_scope_type === 'commune') {
                                setField('read_scope_id', communeId);
                              } else {
                                setField('scope_commune', communeId);
                                setField('read_scope_id', '');
                                setScopeServices([]);
                                if (communeId) {
                                  geoService.getAllServices({ commune_id: communeId })
                                    .then(r => setScopeServices(r.data.data || r.data || [])).catch(() => {});
                                }
                              }
                            }}
                            className={selectCls}
                          >
                            <option value="">— Sélectionner une commune —</option>
                            {scopeCommunes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                          </select>
                        </FormField>
                      )}

                      {/* Service */}
                      {formData.read_scope_type === 'service' && formData.scope_commune && (
                        <FormField label="Service / Commissariat" error={formErrors?.read_scope_id}>
                          <select
                            value={formData.read_scope_id}
                            onChange={e => setField('read_scope_id', e.target.value)}
                            className={selectCls}
                          >
                            <option value="">— Sélectionner un service —</option>
                            {scopeServices.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                          </select>
                        </FormField>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-[#CBD5E1] dark:border-white/15">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                    {actionLoading ? 'Enregistrement…' : formMode === 'create' ? 'Créer le compte' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {isDetailOpen && selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setIsDetailOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-md shadow-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 flex items-center justify-between bg-[#F8FAFC] dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#DBEAFE] rounded-xl flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A] dark:text-white text-sm">{selectedUser.name}</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadgeCls(selectedUser.roles)}`}>
                      {selectedUser.roles?.[0]?.name || 'agent'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-[#475569] dark:text-white/60">
                    <Mail className="w-4 h-4 text-[#94A3B8] dark:text-white/30" />
                    <span className="font-medium">{selectedUser.email}</span>
                  </div>
                  {selectedUser.telephone && (
                    <div className="flex items-center gap-2 text-[#475569] dark:text-white/60 font-mono">
                      <Phone className="w-4 h-4 text-[#94A3B8] dark:text-white/30" />
                      <span>{selectedUser.telephone}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg space-y-2">
                  <p className="text-[10px] text-[#94A3B8] dark:text-white/30 font-semibold uppercase tracking-wider">Portée territoriale</p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-lg text-xs font-bold uppercase">
                      {{ national: 'National', region: 'Région', departement: 'Département', commune: 'Commune', service: 'Service' }[selectedUser.read_scope_type] || selectedUser.read_scope_type || 'Service'}
                    </span>
                    {selectedUser.read_scope_id && selectedUser.read_scope_type !== 'national' && (
                      <span className="text-xs text-[#64748B] dark:text-white/50 font-mono">ID {selectedUser.read_scope_id}</span>
                    )}
                  </div>
                </div>

                {selectedUser.service && (
                  <div className="p-4 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/15 rounded-lg">
                    <p className="text-[10px] text-[#94A3B8] dark:text-white/30 font-semibold uppercase tracking-wider mb-1">Unité d'affectation</p>
                    <p className="font-semibold text-[#0F172A] dark:text-white">{selectedUser.service.nom}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex justify-end">
                <button onClick={() => setIsDetailOpen(false)} className="px-5 py-2 bg-[#0F172A] dark:bg-white/10 hover:bg-[#343a40] dark:hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors">
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer l'utilisateur"
        message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        confirmLabel="Supprimer"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
