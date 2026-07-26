import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, RefreshCw, Info, AlertTriangle, ShieldAlert,
  Globe, Users, MapPin, Building2, Home, Briefcase,
  AlertCircle, CheckCircle, X, Eye, EyeOff, Clock,
  ChevronDown, UserCheck,
} from 'lucide-react';
import notificationService from '../services/notificationService';
import userService from '../services/userService';
import { Toast, useToast } from '../components/ui/Toast';

/* ─────────────────────────────────────── helpers ── */

const inputCls =
  'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 ' +
  'bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white ' +
  'focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ' +
  'transition-colors placeholder-[#94A3B8] dark:placeholder-white/30';

/* ── Type config — valeurs alignées avec le backend ── */
const TYPE_CFG = {
  info:    { label: 'Info',          bg: 'bg-[#1B4332]' },
  alert:   { label: 'Alerte',       bg: 'bg-[#D97706]' },
  warning: { label: 'Avertissement', bg: 'bg-[#C2410C]' },
  success: { label: 'Succès',       bg: 'bg-[#16A34A]' },
  error:   { label: 'Urgence',      bg: 'bg-[#DC2626]' },
};

/* ── Diffusion config — valeurs alignées avec le backend ── */
const DIFFUSION_CFG = {
  global:      { label: 'Global (tous les utilisateurs)', icon: Globe,      hasTarget: false },
  role:        { label: 'Par rôle',                       icon: Users,      hasTarget: true  },
  region:      { label: 'Par région',                     icon: MapPin,     hasTarget: true  },
  departement: { label: 'Par département',                icon: Building2,  hasTarget: true  },
  commune:     { label: 'Par commune',                    icon: Home,       hasTarget: true  },
  service:     { label: 'Par service',                    icon: Briefcase,  hasTarget: true  },
  user:        { label: 'Utilisateur ciblé',              icon: UserCheck,  hasTarget: true  },
  users:       { label: 'Plusieurs agents',               icon: Users,      hasTarget: false },
};

const ROLES = [
  { id: 'administrateur', label: 'Administrateur' },
  { id: 'gestionnaire',   label: 'Gestionnaire'   },
  { id: 'agent',          label: 'Agent'          },
];

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

const pickArray = (res) => {
  if (res.status !== 'fulfilled') return [];
  const raw = res.value?.data;
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function NotificationCenter() {
  const INIT_FORM = { titre: '', message: '', type: 'info', diffusion: 'global', target_id: '', target_ids: [] };

  /* ── form state ── */
  const [form, setForm]               = useState(INIT_FORM);
  const [sending, setSending]         = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ── zone data (scope de l'expéditeur) ── */
  const [zoneData,   setZoneData]   = useState(null);
  const [zoneLoading, setZoneLoading] = useState(true);

  /* ── listes géo dérivées du zoneData ── */
  const [regions,      setRegions]      = useState([]);
  const [departements, setDepartements] = useState([]);
  const [communes,     setCommunes]     = useState([]);
  const [services,     setServices]     = useState([]);
  const [users,        setUsers]        = useState([]);
  const [geoLoading,   setGeoLoading]   = useState(false);

  /* ── filtre service pour le mode "user" ── */
  const [serviceFilter, setServiceFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  /* ── history ── */
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  /* ── ui ── */
  const { toast, showToast } = useToast();

  /* ── charger la zone de l'expéditeur, puis dériver les listes géo filtrées ── */
  useEffect(() => {
    setZoneLoading(true);
    notificationService.getZoneData()
      .then(res => {
        const zone = res.data?.data ?? res.data;
        setZoneData(zone);
        const scope = zone?.scope;

        if (scope === 'national') {
          setRegions(zone.regions || []);
          setDepartements([]);
          setCommunes([]);
          setServices([]);
        } else if (scope === 'region') {
          const depts = zone.region?.departements || [];
          const cms   = depts.flatMap(d => d.communes || []);
          const svcs  = cms.flatMap(c => c.services || []);
          setRegions([zone.region]);
          setDepartements(depts);
          setCommunes(cms);
          setServices(svcs);
        } else if (scope === 'departement') {
          const cms  = zone.departement?.communes || [];
          const svcs = cms.flatMap(c => c.services || []);
          setRegions([]);
          setDepartements([zone.departement]);
          setCommunes(cms);
          setServices(svcs);
        } else if (scope === 'commune') {
          setRegions([]);
          setDepartements([]);
          setCommunes([zone.commune]);
          setServices(zone.commune?.services || []);
        } else if (scope === 'service') {
          setRegions([]);
          setDepartements([]);
          setCommunes([]);
          setServices([zone.service]);
        }

        // Forcer le mode de diffusion initial selon le scope
        const defaultMode = scope === 'national' ? 'global'
          : scope === 'region'      ? 'region'
          : scope === 'departement' ? 'departement'
          : scope === 'commune'     ? 'commune'
          : 'service';
        setForm(prev => ({ ...prev, diffusion: defaultMode }));
      })
      .catch(() => {})
      .finally(() => setZoneLoading(false));
  }, []);

  /* ── charger les utilisateurs (filtrés par service si précisé, sinon toute la zone) ── */
  const loadUsersForService = useCallback((serviceId) => {
    setUsersLoading(true);
    const params = { per_page: 500, is_active: 1 };
    if (serviceId) params.service_id = serviceId;
    userService.getAll(params)
      .then(res => {
        const raw = res.data?.data ?? res.data ?? [];
        setUsers(Array.isArray(raw) ? raw : []);
      })
      .catch(() => { showToast('Erreur lors du chargement des utilisateurs.', 'error'); setUsers([]); })
      .finally(() => setUsersLoading(false));
  }, []);

  /* ── load history from dedicated endpoint ── */
  const fetchHistory = useCallback(async (signal) => {
    setHistLoading(true);
    try {
      const res = await notificationService.getHistory({ signal });
      const raw = res.data?.data || res.data || [];
      setHistory(Array.isArray(raw) ? raw : []);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]);

  /* ── modes disponibles selon le scope de l'expéditeur ── */
  const availableDiffusions = (() => {
    if (!zoneData) return Object.entries(DIFFUSION_CFG);
    const scope = zoneData.scope;
    const all = Object.entries(DIFFUSION_CFG);
    if (scope === 'national') return all;
    if (scope === 'region')   return all.filter(([k]) => ['user','users','service','commune','departement','region'].includes(k));
    if (scope === 'departement') return all.filter(([k]) => ['user','users','service','commune','departement'].includes(k));
    if (scope === 'commune')  return all.filter(([k]) => ['user','users','service','commune'].includes(k));
    return all.filter(([k]) => ['user','users','service'].includes(k));
  })();

  /* ── derived ── */
  const isFormValid = form.titre.trim() && form.message.trim() && (
    form.diffusion === 'users'
      ? form.target_ids.length > 0
      : (!DIFFUSION_CFG[form.diffusion]?.hasTarget || form.target_id)
  );

  const targetOptions = () => {
    switch (form.diffusion) {
      case 'role':        return ROLES.map(r => ({ id: r.id, label: r.label }));
      case 'region':      return regions.map(r      => ({ id: r.id, label: r.nom || r.name || `Région ${r.id}` }));
      case 'departement': return departements.map(d => ({ id: d.id, label: d.nom || d.name || `Département ${d.id}` }));
      case 'commune':     return communes.map(c     => ({ id: c.id, label: c.nom || c.name || `Commune ${c.id}` }));
      case 'service':     return services.map(s     => ({ id: s.id, label: s.nom || s.name || `Service ${s.id}` }));
      case 'user':        return users.map(u => ({ id: u.id, label: `${u.name} — ${u.email}` }));
      default:            return [];
    }
  };

  const targetLabel = () => {
    if (form.diffusion === 'users') {
      if (form.target_ids.length === 0) return '—';
      if (form.target_ids.length === 1) {
        const u = users.find(x => x.id === form.target_ids[0]);
        return u ? u.name : '1 agent';
      }
      return `${form.target_ids.length} agents sélectionnés`;
    }
    if (!DIFFUSION_CFG[form.diffusion]?.hasTarget) return 'Tous les utilisateurs';
    const found = targetOptions().find(o => String(o.id) === String(form.target_id));
    return found ? found.label : '—';
  };

  /* ── send — payload aligné avec l'API ── */
  const handleSend = async () => {
    if (!isFormValid) return;
    setSending(true);
    try {
      const payload = {
        title:     form.titre,
        message:   form.message,
        type:      form.type,
        canal:     'ecran',
        diffusion: form.diffusion,
        ...(form.diffusion === 'users'
          ? { target_ids: form.target_ids }
          : DIFFUSION_CFG[form.diffusion]?.hasTarget && form.target_id
            ? { target_id: form.diffusion === 'role' ? form.target_id : Number(form.target_id) }
            : {}),
      };
      const res = await notificationService.send(payload);
      const count = res.data?.data?.recipients_count ?? res.data?.recipients_count;
      showToast(count !== undefined
        ? `Notification envoyée à ${count} destinataire(s).`
        : 'Notification envoyée avec succès.');
      setForm(INIT_FORM);
      setShowPreview(false);
      setShowConfirm(false);
      fetchHistory();
    } catch (e) {
      showToast(e?.response?.data?.message || "Erreur lors de l'envoi.", 'error');
    } finally {
      setSending(false);
    }
  };

  const setField = (key, value) => {
    if (key === 'diffusion') {
      setServiceFilter('');
      setUsers([]);
      // Pré-charger les utilisateurs de la zone dès qu'on sélectionne le mode user/users
      if (value === 'user' || value === 'users') {
        loadUsersForService('');
      }
    }
    setForm(prev => ({ ...prev, [key]: value, ...(key === 'diffusion' ? { target_id: '', target_ids: [] } : {}) }));
  };

  const toggleTargetId = (id) => {
    setForm(prev => {
      const ids = prev.target_ids.includes(id)
        ? prev.target_ids.filter(x => x !== id)
        : [...prev.target_ids, id];
      return { ...prev, target_ids: ids };
    });
  };

  const selectAllFiltered = () => {
    const ids = usersFiltered().map(u => u.id);
    setForm(prev => ({ ...prev, target_ids: ids }));
  };

  const clearSelection = () => setForm(prev => ({ ...prev, target_ids: [] }));

  const usersFiltered = () => users;

  /* ══════════ RENDER ══════════ */
  return (
    <div className="space-y-6 max-w-[1200px]">
      <AnimatePresence><Toast toast={toast} /></AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#1B4332] dark:text-[#52B788]" />
            Centre de notifications
          </h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">
            Envoi et historique des notifications Teranga GESCRIM
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#F1F5F9] dark:hover:bg-white/10 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* ── Formulaire ── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-5 space-y-5">

            {/* Titre */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">
                  Titre <span className="text-[#DC2626]">*</span>
                </label>
                <span className={`text-[10px] font-medium ${form.titre.length > 90 ? 'text-[#DC2626]' : 'text-[#94A3B8] dark:text-white/30'}`}>
                  {form.titre.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={form.titre}
                onChange={e => setField('titre', e.target.value)}
                placeholder="Ex: Alerte sécurité — Zone Nord"
                className={inputCls}
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">
                  Message <span className="text-[#DC2626]">*</span>
                </label>
                <span className={`text-[10px] font-medium ${form.message.length > 460 ? 'text-[#DC2626]' : 'text-[#94A3B8] dark:text-white/30'}`}>
                  {form.message.length}/500
                </span>
              </div>
              <textarea
                maxLength={500}
                rows={4}
                value={form.message}
                onChange={e => setField('message', e.target.value)}
                placeholder="Contenu détaillé de la notification…"
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Type</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_CFG).map(([key, cfg]) => {
                  const active = form.type === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setField('type', key)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                        active
                          ? `${cfg.bg} text-white`
                          : 'bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 text-[#64748B] dark:text-white/50 hover:bg-[#F1F5F9] dark:hover:bg-white/10'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Diffusion */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Mode de diffusion</label>
              <div className="relative">
                <select
                  value={form.diffusion}
                  onChange={e => setField('diffusion', e.target.value)}
                  className={inputCls + ' appearance-none pr-8'}
                >
                  {availableDiffusions.map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Cible */}
            <AnimatePresence>
              {(DIFFUSION_CFG[form.diffusion]?.hasTarget || form.diffusion === 'users') && (
                <motion.div
                  key={form.diffusion}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {/* ── Mode "Plusieurs agents" avec checkboxes ── */}
                  {form.diffusion === 'users' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">
                          Agents destinataires <span className="text-[#DC2626]">*</span>
                        </label>
                        {form.target_ids.length > 0 && (
                          <span className="text-[10px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                            {form.target_ids.length} sélectionné{form.target_ids.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {/* Filtre par service */}
                      <div className="relative">
                        <select
                          value={serviceFilter}
                          onChange={e => {
                            const sid = e.target.value;
                            setServiceFilter(sid);
                            clearSelection();
                            loadUsersForService(sid);
                          }}
                          className={inputCls + ' appearance-none pr-8'}
                        >
                          <option value="">— Filtrer par service (optionnel) —</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.nom || s.name || `Service ${s.id}`}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                      {/* Actions rapides */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          className="text-[10px] font-semibold text-[#2563EB] hover:underline"
                        >
                          Tout sélectionner{serviceFilter ? ' (ce service)' : ''}
                        </button>
                        {form.target_ids.length > 0 && (
                          <>
                            <span className="text-[#CBD5E1]">·</span>
                            <button
                              type="button"
                              onClick={clearSelection}
                              className="text-[10px] font-semibold text-[#94A3B8] hover:text-[#475569] hover:underline"
                            >
                              Tout désélectionner
                            </button>
                          </>
                        )}
                      </div>
                      {/* Liste avec checkboxes */}
                      <div className="border border-[#CBD5E1] dark:border-white/10 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        {usersLoading ? (
                          <div className="px-4 py-6 text-center text-xs text-[#94A3B8] dark:text-white/30 flex items-center justify-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Chargement…
                          </div>
                        ) : usersFiltered().length === 0 ? (
                          <p className="px-4 py-6 text-center text-xs text-[#94A3B8] dark:text-white/30">
                            {usersLoading ? 'Chargement…' : serviceFilter ? 'Aucun utilisateur dans ce service' : 'Aucun utilisateur trouvé'}
                          </p>
                        ) : (
                          usersFiltered().map((u, i) => {
                            const checked = form.target_ids.includes(u.id);
                            return (
                              <label
                                key={u.id}
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                  i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-[#F8FAFC] dark:bg-white/[0.02]'
                                } hover:bg-[#EFF6FF] dark:hover:bg-[#1B4332]/10 ${checked ? 'bg-[#EFF6FF] dark:bg-[#1B4332]/10' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTargetId(u.id)}
                                  className="w-3.5 h-3.5 accent-[#2563EB] shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-[#0F172A] dark:text-white truncate">{u.name}</p>
                                  <p className="text-[10px] text-[#94A3B8] dark:text-white/30 truncate">{u.email}</p>
                                </div>
                                {u.roles?.[0] && (
                                  <span className="text-[9px] font-semibold text-[#64748B] dark:text-white/40 bg-[#F1F5F9] dark:bg-white/10 px-1.5 py-0.5 rounded shrink-0">
                                    {u.roles[0]}
                                  </span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── Mode cible simple (select) ── */
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">
                        Cible — {DIFFUSION_CFG[form.diffusion]?.label.replace('Par ', '').replace('Utilisateur ciblé', 'utilisateur')}
                        {' '}<span className="text-[#DC2626]">*</span>
                      </label>
                      {geoLoading && !['role', 'user'].includes(form.diffusion) ? (
                        <div className="h-9 bg-[#F1F5F9] dark:bg-white/5 rounded-lg animate-pulse" />
                      ) : (
                        <div className="space-y-2">
                          {form.diffusion === 'user' && (
                            <div className="relative">
                              <select
                                value={serviceFilter}
                                onChange={e => {
                                  const sid = e.target.value;
                                  setServiceFilter(sid);
                                  setField('target_id', '');
                                  loadUsersForService(sid);
                                }}
                                className={inputCls + ' appearance-none pr-8'}
                              >
                                <option value="">— Filtrer par service (optionnel) —</option>
                                {services.map(s => (
                                  <option key={s.id} value={s.id}>{s.nom || s.name || `Service ${s.id}`}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                            </div>
                          )}
                          <div className="relative">
                            <select
                              value={form.target_id}
                              onChange={e => setField('target_id', e.target.value)}
                              className={inputCls + ' appearance-none pr-8'}
                            >
                              <option value="">— Sélectionner —</option>
                              {targetOptions().map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                          </div>
                          {form.diffusion === 'user' && serviceFilter && (
                            <p className="text-[10px] text-[#94A3B8] dark:text-white/30">
                              {targetOptions().length} agent{targetOptions().length !== 1 ? 's' : ''} dans ce service
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 hover:bg-[#F1F5F9] dark:hover:bg-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 transition-colors"
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Masquer aperçu' : 'Aperçu'}
              </button>
              <button
                type="button"
                disabled={!isFormValid || sending}
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Envoyer
              </button>
            </div>
      </div>

      {/* ── Preview ── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase text-white ${(TYPE_CFG[form.type] || TYPE_CFG.info).bg}`}>
                {(TYPE_CFG[form.type] || TYPE_CFG.info).label}
              </span>
              <span className="text-[10px] text-[#94A3B8] dark:text-white/30">
                → {DIFFUSION_CFG[form.diffusion]?.hasTarget
                  ? (form.target_id ? targetLabel() : '—')
                  : 'Tous les utilisateurs'}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
              {form.titre || <span className="italic text-[#94A3B8]">(sans titre)</span>}
            </p>
            <p className="text-xs text-[#64748B] dark:text-white/50 whitespace-pre-wrap">
              {form.message || <span className="italic">(aucun message)</span>}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Historique ── */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#64748B] dark:text-white/40" />
            Historique des envois
            <span className="ml-1 text-[10px] text-[#94A3B8] dark:text-white/30 font-normal">(20 derniers)</span>
          </p>
          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#1B4332]/20 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {histLoading ? (
          <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex gap-3 animate-pulse">
                <div className="w-24 h-4 bg-[#F1F5F9] dark:bg-white/5 rounded" />
                <div className="flex-1 h-4 bg-[#F1F5F9] dark:bg-white/5 rounded" />
                <div className="w-16 h-4 bg-[#F1F5F9] dark:bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-[#94A3B8] dark:text-white/30">
            Aucune notification envoyée pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F1F5F9] dark:border-white/5">
                  {['Date', 'Titre', 'Type', 'Diffusion', 'Cible', 'Destinataires'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-[#94A3B8] dark:text-white/30 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {history.map(n => {
                  const cfg = TYPE_CFG[n.type] || TYPE_CFG.info;
                  const diffLabel = DIFFUSION_CFG[n.diffusion_type]?.label?.replace('Par ', '') ?? n.diffusion_type ?? '—';
                  return (
                    <tr key={n.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-[#64748B] dark:text-white/40 whitespace-nowrap">
                        {fmtDate(n.created_at)}
                      </td>
                      <td className="px-5 py-3 text-[#0F172A] dark:text-white font-medium max-w-[200px] truncate">
                        {n.titre || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-white ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#64748B] dark:text-white/40 whitespace-nowrap">
                        {diffLabel}
                      </td>
                      <td className="px-5 py-3 text-[#64748B] dark:text-white/40 max-w-[120px] truncate">
                        {n.target_id ?? 'Tous'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-[#16A34A]">
                          {n.recipients_count ?? '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Confirmation Modal ══ */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#343a40] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] dark:bg-[#1B4332]/20 flex items-center justify-center">
                    <Send className="w-4 h-4 text-[#1B4332] dark:text-[#52B788]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white">Confirmer l'envoi</p>
                    <p className="text-xs text-[#64748B] dark:text-white/50">Vérifiez le récapitulatif avant d'envoyer</p>
                  </div>
                </div>
                <button onClick={() => setShowConfirm(false)} className="text-[#94A3B8] hover:text-[#475569] dark:hover:text-white/60 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#F8FAFC] dark:bg-white/5 rounded-lg p-4 space-y-2.5 text-xs">
                {[
                  { label: 'Titre',         value: form.titre },
                  { label: 'Type',          value: TYPE_CFG[form.type]?.label },
                  { label: 'Diffusion',     value: DIFFUSION_CFG[form.diffusion]?.label },
                  { label: 'Destinataires', value: DIFFUSION_CFG[form.diffusion]?.hasTarget
                      ? (form.target_id ? targetLabel() : '—')
                      : 'Tous les utilisateurs actifs' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between gap-2">
                    <span className="text-[#94A3B8] dark:text-white/30">{row.label}</span>
                    <span className="text-[#0F172A] dark:text-white font-semibold text-right">{row.value}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-[#CBD5E1] dark:border-white/10">
                  <p className="text-[#64748B] dark:text-white/40 italic whitespace-pre-wrap">{form.message}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {sending
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Envoi…</>
                    : <><Send className="w-3.5 h-3.5" /> Confirmer l'envoi</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
