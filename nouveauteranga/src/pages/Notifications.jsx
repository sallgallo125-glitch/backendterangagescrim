import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerListRow } from '../components/Shimmer';
import {
  Bell, Send, Search, RefreshCw, CheckCheck, Check,
  X, Globe, User, ChevronLeft, ChevronRight, Archive,
  AlertCircle, CheckCircle, Info,
} from 'lucide-react';
import notificationService from '../services/notificationService';
import api from '../api/axios';
import { usePermissions } from '../hooks/usePermissions';
import { Toast, useToast } from '../components/ui/Toast';
import SearchInput from '../components/ui/SearchInput';

const inputCls = 'w-full text-sm border border-[#CBD5E1] dark:border-white/10 rounded-lg py-2 px-3 bg-[#F8FAFC] dark:bg-white/5 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors placeholder-[#94A3B8] dark:placeholder-white/30';

export default function Notifications() {
  const perms = usePermissions();
  const canSend = perms.canSendNotifications;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRead, setFilterRead] = useState('');
  const [archived, setArchived] = useState([]);
  const { toast, showToast } = useToast();

  // Send form state
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ title: '', message: '', type: 'info', target_id: '' });
  const [sendMode, setSendMode] = useState(''); // sera initialisé après chargement zone
  const [zoneData, setZoneData] = useState(null); // données de zone retournées par l'API
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);

  const fetchNotifications = useCallback(async (p = 1, signal) => {
    setLoading(true);
    try {
      const r = await notificationService.getAll({ page: p, per_page: 15 }, { signal });
      const raw = r.data;
      const items = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setNotifications(items);
      setMeta(raw?.meta || null);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchNotifications(page, controller.signal);
    return () => controller.abort();
  }, [fetchNotifications, page]);

  useEffect(() => {
    if (!canSend) return;
    notificationService.getZoneData().then(zoneRes => {
      const zone = zoneRes.data?.data ?? zoneRes.data;
      setZoneData(zone);
      const defaultMode = zone?.scope === 'national' ? 'global'
        : zone?.scope === 'region'      ? 'region'
        : zone?.scope === 'departement' ? 'departement'
        : zone?.scope === 'commune'     ? 'commune'
        : 'service';
      setSendMode(defaultMode);
    }).catch(() => { showToast('Impossible de charger les informations de zone.', 'error'); });
  }, [canSend]);

  // Charger la liste des utilisateurs uniquement quand le mode "user" est activé
  useEffect(() => {
    if (!canSend || sendMode !== 'user' || users.length > 0) return;
    api.get('/users', { params: { per_page: 500, is_active: 1 } })
      .then(r => {
        const raw = r.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setUsers(list);
      })
      .catch(() => { showToast('Erreur lors du chargement des utilisateurs.', 'error'); });
  }, [canSend, sendMode, users.length]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch {
      showToast("Erreur lors du marquage.", 'error');
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      showToast("Toutes les notifications marquées comme lues.");
    } catch {
      showToast("Erreur lors du marquage.", 'error');
    }
  };

  const handleArchive = (id) => {
    setArchived(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  // Modes disponibles selon le scope retourné par l'API
  const availableModes = (() => {
    if (!zoneData) return [];
    const scope = zoneData.scope;
    const base = [
      { key: 'user', label: 'Utilisateur ciblé' },
      { key: 'service', label: 'Service' },
      { key: 'commune', label: 'Commune' },
      { key: 'departement', label: 'Département' },
      { key: 'region', label: 'Région' },
    ];
    if (scope === 'national') return [{ key: 'global', label: 'Tous (national)' }, ...base];
    if (scope === 'region')   return base.filter(m => ['user','service','commune','departement','region'].includes(m.key));
    if (scope === 'departement') return base.filter(m => ['user','service','commune','departement'].includes(m.key));
    if (scope === 'commune')  return base.filter(m => ['user','service','commune'].includes(m.key));
    return base.filter(m => ['user','service'].includes(m.key));
  })();

  // Options de la liste déroulante selon le mode choisi
  const targetOptions = (() => {
    if (!zoneData || !sendMode) return [];
    const scope = zoneData.scope;

    if (sendMode === 'user') {
      return users.map(u => {
        const serviceName = u.service?.nom ?? (u.service_id ? `Service #${u.service_id}` : null);
        const scopeLabel = !serviceName && u.read_scope_type && u.read_scope_type !== 'national'
          ? `Portée ${u.read_scope_type}`
          : null;
        const roleName = u.roles?.[0]?.name ?? u.role ?? '';
        const suffix = [roleName, serviceName ?? scopeLabel].filter(Boolean).join(' — ');
        return { id: u.id, label: suffix ? `${u.name} (${suffix})` : u.name };
      });
    }

    if (sendMode === 'region') {
      if (scope === 'national') return (zoneData.regions || []).map(r => ({ id: r.id, label: r.nom }));
      if (scope === 'region')   return [{ id: zoneData.region?.id, label: zoneData.region?.nom }];
      return [];
    }

    if (sendMode === 'departement') {
      const depts = scope === 'national'
        ? [] // national : on demandera de choisir la région d'abord — simplifié : liste plate
        : scope === 'region'
          ? (zoneData.region?.departements || [])
          : [zoneData.departement];
      return depts.filter(Boolean).map(d => ({ id: d.id, label: d.nom }));
    }

    if (sendMode === 'commune') {
      if (scope === 'region') {
        return (zoneData.region?.departements || []).flatMap(d =>
          (d.communes || []).map(c => ({ id: c.id, label: `${c.nom} (${d.nom})` }))
        );
      }
      if (scope === 'departement') return (zoneData.departement?.communes || []).map(c => ({ id: c.id, label: c.nom }));
      if (scope === 'commune')     return [{ id: zoneData.commune?.id, label: zoneData.commune?.nom }];
      return [];
    }

    if (sendMode === 'service') {
      if (scope === 'region') {
        return (zoneData.region?.departements || []).flatMap(d =>
          (d.communes || []).flatMap(c =>
            (c.services || []).map(s => ({ id: s.id, label: `${s.nom} (${c.nom})` }))
          )
        );
      }
      if (scope === 'departement') {
        return (zoneData.departement?.communes || []).flatMap(c =>
          (c.services || []).map(s => ({ id: s.id, label: `${s.nom} (${c.nom})` }))
        );
      }
      if (scope === 'commune') return (zoneData.commune?.services || []).map(s => ({ id: s.id, label: s.nom }));
      if (scope === 'service') return [{ id: zoneData.service?.id, label: zoneData.service?.nom }];
      return [];
    }

    return [];
  })();

  const needsTarget = sendMode && sendMode !== 'global';

  const handleSend = async () => {
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      showToast("Le titre et le message sont requis.", 'error');
      return;
    }
    if (needsTarget && !sendForm.target_id) {
      showToast("Veuillez sélectionner une cible.", 'error');
      return;
    }
    setSending(true);
    try {
      const payload = {
        title:     sendForm.title,
        message:   sendForm.message,
        type:      sendForm.type,
        diffusion: sendMode,
        ...(needsTarget ? { target_id: sendMode === 'user' ? Number(sendForm.target_id) : sendForm.target_id } : {}),
      };
      await notificationService.send(payload);
      const modeLabel = availableModes.find(m => m.key === sendMode)?.label ?? sendMode;
      showToast(`Notification envoyée (${modeLabel}).`);
      setSendForm({ title: '', message: '', type: 'info', target_id: '' });
      setSendOpen(false);
      setPreview(false);
      fetchNotifications();
    } catch (e) {
      showToast(e.response?.data?.message || "Erreur lors de l'envoi.", 'error');
    } finally {
      setSending(false);
    }
  };

  const displayed = notifications.filter(n => {
    if (archived.includes(n.id)) return false;
    const titleText = (n.title || n.titre || '').toLowerCase();
    const msgText = (n.message || '').toLowerCase();
    if (search && !titleText.includes(search.toLowerCase()) && !msgText.includes(search.toLowerCase())) return false;
    if (filterRead === 'unread' && n.read_at) return false;
    if (filterRead === 'read' && !n.read_at) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at && !archived.includes(n.id)).length;
  const archivedCount = archived.length;

  const TYPE_ICON = {
    info:    <Info className="w-4 h-4 text-white" />,
    success: <CheckCircle className="w-4 h-4 text-white" />,
    warning: <AlertCircle className="w-4 h-4 text-white" />,
    error:   <AlertCircle className="w-4 h-4 text-white" />,
  };

  const TYPE_BG = {
    info:    'bg-[#1B4332]',
    success: 'bg-[#16A34A]',
    warning: 'bg-[#D97706]',
    error:   'bg-[#DC2626]',
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <AnimatePresence>{toast && <Toast toast={toast} />}</AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#1B4332] dark:text-[#52B788]" />
            Notifications
          </h1>
          <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">
            Centre de notifications — {unreadCount} non lue{unreadCount !== 1 ? 's' : ''}
            {archivedCount > 0 && ` · ${archivedCount} archivée${archivedCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#F1F5F9] dark:hover:bg-white/10 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tout marquer lu
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-white/5 hover:bg-[#F1F5F9] dark:hover:bg-white/10 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rafraîchir
          </button>
          {canSend && (
            <button
              onClick={() => { setSendOpen(true); setPreview(false); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Envoyer
            </button>
          )}
        </div>
      </div>

      {/* Send panel (admin only) */}
      <AnimatePresence>
        {sendOpen && canSend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#1B4332] dark:text-[#52B788]" />
                  Envoyer une notification
                </p>
                <button onClick={() => { setSendOpen(false); setPreview(false); }} aria-label="Fermer" className="text-[#94A3B8] hover:text-[#475569] dark:hover:text-white/60">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Sélecteur de mode (adapté au scope de l'expéditeur) */}
              <div className="flex flex-wrap gap-2">
                {availableModes.map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setSendMode(m.key); setSendForm(p => ({ ...p, target_id: '' })); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      sendMode === m.key
                        ? 'bg-[#1B4332] text-white border-[#2563EB]'
                        : 'bg-[#F8FAFC] dark:bg-white/5 text-[#475569] dark:text-white/60 border-[#CBD5E1] dark:border-white/10 hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {m.key === 'global' ? <Globe className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    {m.label}
                  </button>
                ))}
              </div>

              {preview ? (
                /* Aperçu avant envoi */
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl ${TYPE_BG[sendForm.type] || TYPE_BG.info}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{TYPE_ICON[sendForm.type] || TYPE_ICON.info}</div>
                      <div>
                        <p className="font-semibold text-white text-sm">{sendForm.title || '(sans titre)'}</p>
                        <p className="text-xs text-white/80 mt-1 whitespace-pre-wrap">{sendForm.message || '(aucun message)'}</p>
                        <p className="text-[10px] text-white/60 mt-1.5">
                          → {sendMode === 'global'
                            ? 'Tous les utilisateurs (national)'
                            : sendMode === 'user'
                              ? (users.find(u => String(u.id) === String(sendForm.target_id))?.name || 'Utilisateur sélectionné')
                              : (targetOptions.find(o => String(o.id) === String(sendForm.target_id))?.label || 'Cible sélectionnée')
                            } ({availableModes.find(m => m.key === sendMode)?.label})
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreview(false)} className="px-4 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] transition-colors">
                      Modifier
                    </button>
                    <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                      {sending ? 'Envoi…' : "Confirmer l'envoi"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulaire */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Titre *</label>
                    <input
                      type="text"
                      value={sendForm.title}
                      onChange={e => setSendForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Titre de la notification"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Type</label>
                    <select value={sendForm.type} onChange={e => setSendForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                      <option value="info">Info</option>
                      <option value="success">Succès</option>
                      <option value="warning">Avertissement</option>
                      <option value="error">Erreur</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">Message *</label>
                    <textarea
                      value={sendForm.message}
                      onChange={e => setSendForm(p => ({ ...p, message: e.target.value }))}
                      rows={3}
                      placeholder="Contenu de la notification…"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  {needsTarget && (
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-[#64748B] dark:text-white/50">
                        {availableModes.find(m => m.key === sendMode)?.label ?? 'Cible'} *
                      </label>
                      <select
                        value={sendForm.target_id}
                        onChange={e => setSendForm(p => ({ ...p, target_id: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="">— Sélectionner —</option>
                        {targetOptions.map(o => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="md:col-span-2 flex gap-2">
                    <button
                      onClick={() => setPreview(true)}
                      disabled={!sendForm.title.trim() || !sendForm.message.trim() || (needsTarget && !sendForm.target_id)}
                      className="px-4 py-2 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-xs font-semibold text-[#475569] dark:text-white/60 hover:bg-[#F1F5F9] disabled:opacity-40 transition-colors"
                    >
                      Aperçu
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sending || !sendForm.title.trim() || !sendForm.message.trim() || (needsTarget && !sendForm.target_id)}
                      className="px-4 py-2 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      {sending ? 'Envoi…' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher une notification…"
          className="flex-1 w-full sm:max-w-sm"
        />
        <select
          value={filterRead}
          onChange={e => setFilterRead(e.target.value)}
          className="h-9 px-3 text-sm bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-lg text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors"
        >
          <option value="">Toutes</option>
          <option value="unread">Non lues</option>
          <option value="read">Lues</option>
        </select>
      </div>

      {/* Notification list */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
            {[...Array(5)].map((_, i) => <ShimmerListRow key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-[#94A3B8] dark:text-white/30">
            Aucune notification{search ? ` pour « ${search} »` : ''}.
          </div>
        ) : (
          <div className="divide-y divide-[#CBD5E1] dark:divide-white/15">
            {displayed.map(n => {
              const title = n.title || n.titre || 'Notification';
              const message = n.message || '';
              const isRead = !!n.read_at;
              return (
                <div
                  key={n.id}
                  className={`px-5 py-3.5 flex items-center gap-3 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-white/3 ${isRead ? '' : 'bg-[#F8FAFC]/50 dark:bg-white/[0.02]'}`}
                >
                  {!isRead && <span className="w-2 h-2 rounded-full bg-[#1B4332] shrink-0" />}
                  {isRead && <span className="w-2 h-2 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isRead ? 'text-[#64748B] dark:text-white/50 font-medium' : 'text-[#0F172A] dark:text-white font-semibold'}`}>
                      {title}
                    </p>
                    {message && <p className="text-xs text-[#94A3B8] dark:text-white/30 mt-0.5 truncate">{message}</p>}
                  </div>
                  <p className="text-[11px] text-[#94A3B8] dark:text-white/30 shrink-0 tabular-nums">
                    {n.created_at ? new Date(n.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        aria-label="Marquer comme lu"
                        title="Marquer comme lu"
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#1B4332] hover:bg-[#F0FDF4] dark:hover:bg-[#1B4332]/20 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      onClick={() => handleArchive(n.id)}
                      aria-label="Archiver"
                      title="Archiver"
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#D97706] hover:bg-[#FFFBEB] dark:hover:bg-[#D97706]/20 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="px-5 py-3 border-t border-[#CBD5E1] dark:border-white/15 flex items-center justify-between text-xs text-[#64748B] dark:text-white/40">
            <span>{meta.from}–{meta.to} sur {meta.total} entrées</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Page précédente"
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/10 disabled:opacity-40 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="px-3 py-1 bg-[#F8FAFC] dark:bg-white/5 border border-[#CBD5E1] dark:border-white/10 rounded-md font-medium">
                {meta.current_page || page} / {meta.last_page}
              </span>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} aria-label="Page suivante"
                className="p-1.5 rounded-md border border-[#CBD5E1] dark:border-white/10 disabled:opacity-40 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-colors">
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
