import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerTableRows } from '../components/Shimmer';
import {
  MapPin, Search, Edit, X, AlertCircle,
  ChevronLeft, ChevronRight, Globe, Map, Building2, Home, Briefcase, User,
} from 'lucide-react';
import userService from '../services/userService';
import geoService from '../services/geoService';
import { usePermissions } from '../hooks/usePermissions';
import { Toast, useToast } from '../components/ui/Toast';
import SearchInput from '../components/ui/SearchInput';

/* ─── Constants ─────────────────────────────────────────────── */

const SCOPES = ['NATIONAL', 'REGION', 'DEPARTEMENT', 'COMMUNE', 'SERVICE'];

const SCOPE_META = {
  NATIONAL:    { label: 'National',    badgeBg: 'bg-[#7C3AED]', icon: Globe },
  REGION:      { label: 'Région',      badgeBg: 'bg-[#1B4332]', icon: Map },
  DEPARTEMENT: { label: 'Département', badgeBg: 'bg-[#16A34A]', icon: Building2 },
  COMMUNE:     { label: 'Commune',     badgeBg: 'bg-[#D97706]', icon: Home },
  SERVICE:     { label: 'Service',     badgeBg: 'bg-[#DC2626]', icon: Briefcase },
};

const ROLE_BADGE = {
  administrateur: 'bg-[#C2410C] text-white',
  gestionnaire:   'bg-[#7C3AED] text-white',
  agent:          'bg-[#16A34A] text-white',
};
const roleBadgeCls = (roles) =>
  ROLE_BADGE[roles?.[0]?.name] || 'bg-[#6B7280] text-white';

const inputCls =
  'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';

const selectCls =
  'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors';

/* ─── Helpers ────────────────────────────────────────────────── */

/** Normalize scope from backend (may be lowercase or object) → UPPERCASE key */
const normalizeScope = (scope) => {
  if (!scope) return null;
  if (typeof scope === 'object') return (scope.value || '').toUpperCase();
  return scope.toUpperCase();
};

/** Derive display zone label for a user row */
function zoneLabel(user, regions, departements, communes, services) {
  const scope = normalizeScope(user.read_scope_type);
  const id = user.read_scope_id;
  if (!scope || scope === 'NATIONAL') return 'Territoire national';
  if (scope === 'REGION') {
    const r = regions.find(x => x.id === id);
    return r ? r.nom : `Région #${id ?? '—'}`;
  }
  if (scope === 'DEPARTEMENT') {
    const d = departements.find(x => x.id === id);
    return d ? d.nom : `Département #${id ?? '—'}`;
  }
  if (scope === 'COMMUNE') {
    const c = communes.find(x => x.id === id);
    return c ? c.nom : `Commune #${id ?? '—'}`;
  }
  if (scope === 'SERVICE') {
    const s = services.find(x => x.id === (user.service_id ?? id));
    return s ? s.nom : `Service #${(user.service_id ?? id) ?? '—'}`;
  }
  return '—';
}

/* ─── Sub-components ─────────────────────────────────────────── */


function ScopeBadge({ scope, scopeType }) {
  const s = normalizeScope(scopeType ?? scope);
  const meta = SCOPE_META[s];
  if (!meta) return <span className="text-[#94A3B8] text-xs">—</span>;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${meta.badgeBg}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {meta.label}
    </span>
  );
}

const SCOPE_COLORS = {
  NATIONAL:    '#7C3AED',
  REGION:      '#1B4332',
  DEPARTEMENT: '#16A34A',
  COMMUNE:     '#D97706',
  SERVICE:     '#DC2626',
};

function KpiCard({ label, value, scope, loading }) {
  const barColor = SCOPE_COLORS[scope] ?? '#64748B';
  return (
    <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-lg overflow-hidden">
      <div className="h-1" style={{ background: barColor }} />
      <div className="px-4 py-3">
        {loading
          ? <div className="h-7 w-10 bg-[#F1F5F9] dark:bg-white/5 rounded animate-pulse" />
          : <p className="text-2xl font-bold text-[#0F172A] dark:text-white">{value}</p>
        }
        <p className="text-xs text-[#64748B] dark:text-white/50 font-medium mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ─── User Detail Modal ──────────────────────────────────────── */

function UserDetailModal({ user, onClose, onEdit, regions, departements, communes, services, geoLoading, perms }) {
  const zone = zoneLabel(user, regions, departements, communes, services);
  const roleLabel = user.roles?.[0]?.name || 'agent';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-md shadow-xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F0FDF4] dark:bg-[#1B4332]/20 border border-[#BBF7D0] dark:border-[#1B4332]/30 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#1B4332] dark:text-[#52B788]" />
            </div>
            <p className="font-semibold text-sm text-[#0F172A] dark:text-white">Détails utilisateur</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors">
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-1">Nom</p>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-white break-words">{user.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm text-[#0F172A] dark:text-white break-all">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-1">Rôle</p>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadgeCls(user.roles)}`}>
              {roleLabel}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-1">Scope territorial</p>
            <ScopeBadge scopeType={user.read_scope_type} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide mb-1">Zone assignée</p>
            {geoLoading
              ? <span className="inline-block w-32 h-4 bg-[#F1F5F9] dark:bg-white/5 rounded animate-pulse" />
              : <p className="text-sm text-[#0F172A] dark:text-white break-words">{zone}</p>
            }
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
            Fermer
          </button>
          {perms.canEditUsers && roleLabel !== 'administrateur' && roleLabel !== 'admin' && (
            <button
              onClick={() => { onClose(); onEdit(user); }}
              className="px-5 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Edit className="w-3.5 h-3.5" aria-hidden="true" />
              Modifier le scope
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Scope Edit Modal ───────────────────────────────────────── */

function ScopeModal({ user, onClose, onSaved, regions, departements, communes, services }) {
  const userRole = user.roles?.[0]?.name || user.role || 'agent';
  const currentScope = normalizeScope(user.read_scope_type) || 'SERVICE';
  const currentId = user.read_scope_id ?? '';

  // Niveaux autorisés selon le rôle
  const allowedScopes = userRole === 'agent'
    ? ['SERVICE']
    : userRole === 'gestionnaire'
      ? ['REGION', 'DEPARTEMENT', 'COMMUNE', 'SERVICE']
      : ['NATIONAL']; // admin : national uniquement

  const [scope, setScope] = useState(currentScope);
  const [regionId, setRegionId] = useState(currentScope === 'REGION' ? currentId : '');
  const [departementId, setDepartementId] = useState(currentScope === 'DEPARTEMENT' ? currentId : '');
  const [communeId, setCommuneId] = useState(currentScope === 'COMMUNE' ? currentId : '');
  const [serviceId, setServiceId] = useState(
    currentScope === 'SERVICE' ? (user.service_id ?? currentId) : ''
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  /* When scope changes, reset lower-level selections */
  const handleScopeChange = (val) => {
    setScope(val);
    setErrors({});
    if (val === 'NATIONAL') {
      setRegionId(''); setDepartementId(''); setCommuneId(''); setServiceId('');
    }
    if (val === 'REGION') {
      setDepartementId(''); setCommuneId(''); setServiceId('');
    }
    if (val === 'DEPARTEMENT') {
      setCommuneId(''); setServiceId('');
    }
    if (val === 'COMMUNE') {
      setServiceId('');
    }
  };

  /* Cascading filter helpers */
  const filteredDepts = departements.filter(d => !regionId || d.region_id === Number(regionId));
  const filteredCommunes = communes.filter(c => !departementId || c.departement_id === Number(departementId));
  const filteredServices = services.filter(s => !communeId || s.commune_id === Number(communeId));

  const validate = () => {
    const e = {};
    if (!scope) { e.scope = 'Le scope est requis.'; }
    const userRole = user.roles?.[0]?.name || user.role;
    if (userRole === 'agent' && scope !== 'SERVICE') {
      e.scope = 'Un agent ne peut avoir qu\'un scope de type Service.';
    }
    if (scope === 'REGION' && !regionId) e.region = 'Veuillez sélectionner une région.';
    if (scope === 'DEPARTEMENT' && !departementId) e.departement = 'Veuillez sélectionner un département.';
    if (scope === 'COMMUNE' && !communeId) e.commune = 'Veuillez sélectionner une commune.';
    if (scope === 'SERVICE' && !serviceId) e.service = 'Veuillez sélectionner un service.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const scopeLower = scope.toLowerCase();
      let readScopeId = null;
      if (scope === 'REGION') readScopeId = regionId || null;
      else if (scope === 'DEPARTEMENT') readScopeId = departementId || null;
      else if (scope === 'COMMUNE') readScopeId = communeId || null;
      else if (scope === 'SERVICE') readScopeId = serviceId || null;

      const payload = {
        read_scope_type:  scope === 'NATIONAL' ? 'national' : scopeLower,
        read_scope_id:    readScopeId ? Number(readScopeId) : null,
        write_scope_type: scope === 'NATIONAL' ? 'national' : scopeLower,
        write_scope_id:   readScopeId ? Number(readScopeId) : null,
        service_id:       scope === 'SERVICE' ? (serviceId || null) : null,
      };
      await userService.update(user.id, payload);
      onSaved();
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Erreur lors de la sauvegarde.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl w-full max-w-lg shadow-xl"
      >
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F0FDF4] dark:bg-[#1B4332]/20 border border-[#BBF7D0] dark:border-[#1B4332]/30 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#1B4332] dark:text-[#52B788]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#0F172A] dark:text-white">Modifier le scope territorial</p>
              <p className="text-xs text-[#64748B] dark:text-white/50">{user.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] dark:text-white/50 hover:bg-[#CBD5E1] dark:hover:bg-white/10 transition-colors"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Scope selector */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] dark:text-white/50 mb-2 uppercase tracking-wide">
              Niveau d'accès territorial *
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {SCOPES.filter(s => allowedScopes.includes(s)).map(s => {
                const meta = SCOPE_META[s];
                const Icon = meta.icon;
                const active = scope === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleScopeChange(s)}
                    className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border text-center transition-all ${
                      active
                        ? `${meta.badgeBg} text-white border-transparent ring-2 ring-offset-1 ring-current`
                        : 'bg-[#F8FAFC] dark:bg-white/3 border-[#CBD5E1] dark:border-white/15 text-[#94A3B8] dark:text-white/30 hover:bg-[#F1F5F9] dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[9px] font-bold uppercase leading-tight">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.scope && <p className="text-[#DC2626] text-xs mt-1">{errors.scope}</p>}
          </div>

          {/* Region selector */}
          {['REGION', 'DEPARTEMENT', 'COMMUNE', 'SERVICE'].includes(scope) && (
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-white/50 mb-1.5 uppercase tracking-wide">
                Région {scope === 'REGION' ? '*' : ''}
              </label>
              <select
                value={regionId}
                onChange={e => { setRegionId(e.target.value); setDepartementId(''); setCommuneId(''); setServiceId(''); }}
                className={selectCls}
              >
                <option value="">Sélectionner une région…</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.nom}</option>
                ))}
              </select>
              {errors.region && <p className="text-[#DC2626] text-xs mt-1">{errors.region}</p>}
            </div>
          )}

          {/* Département selector */}
          {['DEPARTEMENT', 'COMMUNE', 'SERVICE'].includes(scope) && (
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-white/50 mb-1.5 uppercase tracking-wide">
                Département {scope === 'DEPARTEMENT' ? '*' : ''}
              </label>
              <select
                value={departementId}
                onChange={e => { setDepartementId(e.target.value); setCommuneId(''); setServiceId(''); }}
                className={selectCls}
                disabled={!regionId && filteredDepts.length === 0}
              >
                <option value="">Sélectionner un département…</option>
                {filteredDepts.map(d => (
                  <option key={d.id} value={d.id}>{d.nom}</option>
                ))}
              </select>
              {errors.departement && <p className="text-[#DC2626] text-xs mt-1">{errors.departement}</p>}
            </div>
          )}

          {/* Commune selector */}
          {['COMMUNE', 'SERVICE'].includes(scope) && (
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-white/50 mb-1.5 uppercase tracking-wide">
                Commune {scope === 'COMMUNE' ? '*' : ''}
              </label>
              <select
                value={communeId}
                onChange={e => { setCommuneId(e.target.value); setServiceId(''); }}
                className={selectCls}
                disabled={!departementId && filteredCommunes.length === 0}
              >
                <option value="">Sélectionner une commune…</option>
                {filteredCommunes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
              {errors.commune && <p className="text-[#DC2626] text-xs mt-1">{errors.commune}</p>}
            </div>
          )}

          {/* Service selector */}
          {scope === 'SERVICE' && (
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-white/50 mb-1.5 uppercase tracking-wide">
                Service *
              </label>
              <select
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className={selectCls}
              >
                <option value="">Sélectionner un service…</option>
                {filteredServices.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              {errors.service && <p className="text-[#DC2626] text-xs mt-1">{errors.service}</p>}
            </div>
          )}

          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[#DC2626] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#CBD5E1] dark:border-white/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#CBD5E1] dark:border-white/15 rounded-lg text-sm font-medium text-[#475569] dark:text-white/60 hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function ScopesUtilisateurs() {
  const perms = usePermissions();
  /* Data */
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [services, setServices] = useState([]);
  const [geoLoading, setGeoLoading] = useState(true);

  /* Filters */
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [page, setPage] = useState(1);

  /* UI */
  const [editUser, setEditUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const { toast, showToast } = useToast();

  /* Fetch geo data once */
  useEffect(() => {
    const fetchGeo = async () => {
      setGeoLoading(true);
      try {
        const [rR, rD, rC, rS] = await Promise.all([
          geoService.getAllRegions(),
          geoService.getAllDepartements(),
          geoService.getAllCommunes(),
          geoService.getAllServices(),
        ]);
        setRegions(rR.data.data || rR.data || []);
        setDepartements(rD.data.data || rD.data || []);
        setCommunes(rC.data.data || rC.data || []);
        setServices(rS.data.data || rS.data || []);
      } catch {
        showToast('Impossible de charger les données géographiques', 'error');
      } finally {
        setGeoLoading(false);
      }
    };
    fetchGeo();
  }, []);

  /* Fetch ALL users visible to current user (backend already filters by RBAC) */
  const [allUsers, setAllUsers] = useState([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (search) params.search = search;
      const r = await userService.getAll(params);
      setAllUsers(r.data.data || []);
    } catch {
      showToast('Erreur lors de la récupération des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* Client-side filtering */
  const filteredUsers = scopeFilter
    ? allUsers.filter(u => normalizeScope(u.read_scope_type) === scopeFilter)
    : allUsers;

  /* Client-side pagination */
  const PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const paginatedUsers = filteredUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* Reset page when filters change */
  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleScopeFilter = (v) => { setScopeFilter(v); setPage(1); };

  /* KPI counts (based on all users, not just current page) */
  const kpiScopes = ['NATIONAL', 'REGION', 'DEPARTEMENT', 'SERVICE'];

  const handleSaved = () => {
    setEditUser(null);
    showToast('Scope territorial mis à jour avec succès !');
    fetchUsers();
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <AnimatePresence>{toast && <Toast toast={toast} />}</AnimatePresence>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
          <MapPin className="w-6 h-6 text-[#1B4332] dark:text-[#52B788]" />
          Scopes Territoriaux
        </h1>
        <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">
          Contrôle d'accès géographique des utilisateurs — définit quelles données chaque agent peut consulter
        </p>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiScopes.map(s => {
          const count = loading ? null : allUsers.filter(u => normalizeScope(u.read_scope_type) === s).length;
          return (
            <KpiCard
              key={s}
              scope={s}
              label={SCOPE_META[s].label}
              value={count ?? 0}
              loading={loading}
            />
          );
        })}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Rechercher par nom ou email…"
          className="flex-1 min-w-0"
        />
        {/* Scope filter */}
        <div className="sm:w-52">
          <select
            value={scopeFilter}
            onChange={e => handleScopeFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">Tous les scopes</option>
            {SCOPES.map(s => (
              <option key={s} value={s}>{SCOPE_META[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5">
                {['Utilisateur', 'Rôle', 'Scope actuel', 'Zone assignée', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-white/50 uppercase tracking-wide whitespace-nowrap ${
                      i === 4 ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD5E1] dark:divide-white/15">
              {loading ? (
                <ShimmerTableRows rows={8} cols={5} />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-[#F1F5F9] dark:bg-white/5 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-[#94A3B8] dark:text-white/30" />
                      </div>
                      <p className="text-sm text-[#94A3B8] dark:text-white/30 font-medium">Aucun utilisateur trouvé</p>
                      {(search || scopeFilter) && (
                        <p className="text-xs text-[#CBD5E1] dark:text-white/20">
                          Essayez de modifier vos filtres de recherche
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => setViewUser(u)}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 min-w-[200px]">
                      <p className="font-semibold text-[#0F172A] dark:text-white text-sm">{u.name}</p>
                      <p className="text-[#64748B] dark:text-white/60 text-xs mt-0.5 truncate max-w-[220px]">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadgeCls(u.roles)}`}>
                        {u.roles?.[0]?.name || 'agent'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <ScopeBadge scopeType={u.read_scope_type} />
                    </td>
                    <td className="px-5 py-3.5 text-[#475569] dark:text-white/60 text-sm min-w-[160px]">
                      {geoLoading
                        ? <span className="inline-block w-28 h-4 bg-[#F1F5F9] dark:bg-white/5 rounded animate-pulse" />
                        : zoneLabel(u, regions, departements, communes, services)
                      }
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {perms.canEditUsers && !['administrateur', 'admin'].includes(u.roles?.[0]?.name) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditUser(u); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143728] border border-[#1B4332] rounded-lg transition-colors"
                          title="Modifier le scope"
                          aria-label="Modifier"
                        >
                          <Edit aria-hidden="true" className="w-3.5 h-3.5" />
                          Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/5 flex items-center justify-between">
            <span className="text-xs text-[#64748B] dark:text-white/50">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredUsers.length)} sur {filteredUsers.length} utilisateurs
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-[#0F172A] dark:text-white tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-[#CBD5E1] dark:border-white/15 bg-white dark:bg-white/5 text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {viewUser && (
          <UserDetailModal
            key={`view-${viewUser.id}`}
            user={viewUser}
            regions={regions}
            departements={departements}
            communes={communes}
            services={services}
            geoLoading={geoLoading}
            perms={perms}
            onClose={() => setViewUser(null)}
            onEdit={(u) => setEditUser(u)}
          />
        )}
      </AnimatePresence>

      {/* ── Edit modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editUser && (
          <ScopeModal
            key={editUser.id}
            user={editUser}
            regions={regions}
            departements={departements}
            communes={communes}
            services={services}
            onClose={() => setEditUser(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
