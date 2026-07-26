import { useState, useEffect } from 'react';
import { Shield, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { ROLE_PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const ROLE_META = {
  administrateur: { label: 'Administrateur', color: 'text-[#9A3412] dark:text-[#FFEDD5]', bg: 'bg-[#F97316] dark:bg-[#C2410C]/40', border: 'border-[#C2410C] dark:border-[#C2410C]/60' },
  gestionnaire:   { label: 'Gestionnaire',   color: 'text-[#4C1D95] dark:text-[#EDE9FE]', bg: 'bg-[#8B5CF6] dark:bg-[#7C3AED]/40', border: 'border-[#6D28D9] dark:border-[#7C3AED]/60' },
  agent:          { label: 'Agent terrain',  color: 'text-[#064E3B] dark:text-[#D1FAE5]', bg: 'bg-[#10B981] dark:bg-[#16A34A]/40', border: 'border-[#047857] dark:border-[#16A34A]/60' },
};

const PERMISSION_GROUPS = [
  {
    label: 'Tableau de bord',
    perms: [{ key: 'canViewDashboard', label: 'Consulter' }],
  },
  {
    label: 'Infractions',
    perms: [
      { key: 'canViewInfractions', label: 'Consulter' },
      { key: 'canCreateInfractions', label: 'Créer' },
      { key: 'canEditInfractions', label: 'Modifier' },
      { key: 'canDeleteInfractions', label: 'Supprimer' },
    ],
  },
  {
    label: 'Accidents',
    perms: [
      { key: 'canViewAccidents', label: 'Consulter' },
      { key: 'canCreateAccidents', label: 'Créer' },
      { key: 'canEditAccidents', label: 'Modifier' },
      { key: 'canDeleteAccidents', label: 'Supprimer' },
    ],
  },
  {
    label: 'Personnel',
    perms: [
      { key: 'canViewPersonnel', label: 'Consulter' },
      { key: 'canCreatePersonnel', label: 'Créer' },
      { key: 'canEditPersonnel', label: 'Modifier' },
      { key: 'canDeletePersonnel', label: 'Supprimer' },
    ],
  },
  {
    label: 'Victimes',
    perms: [
      { key: 'canViewVictimes', label: 'Consulter' },
      { key: 'canCreateVictimes', label: 'Créer' },
      { key: 'canEditVictimes', label: 'Modifier' },
      { key: 'canDeleteVictimes', label: 'Supprimer' },
    ],
  },
  {
    label: 'Amendes & Pièces',
    perms: [
      { key: 'canViewAmendes', label: 'Consulter' },
      { key: 'canCreateAmendes', label: 'Créer' },
      { key: 'canEditAmendes', label: 'Modifier' },
      { key: 'canDeleteAmendes', label: 'Supprimer' },
    ],
  },
  {
    label: 'Immigration',
    perms: [
      { key: 'canViewImmigration', label: 'Consulter' },
      { key: 'canCreateImmigration', label: 'Créer' },
      { key: 'canEditImmigration', label: 'Modifier' },
      { key: 'canDeleteImmigration', label: 'Supprimer' },
    ],
  },
  {
    label: 'Services & Commissariats',
    perms: [
      { key: 'canViewServices', label: 'Consulter' },
      { key: 'canCreateServices', label: 'Créer' },
      { key: 'canEditServices', label: 'Modifier' },
      { key: 'canDeleteServices', label: 'Supprimer' },
    ],
  },
  {
    label: 'Utilisateurs',
    perms: [
      { key: 'canViewUsers', label: 'Consulter' },
      { key: 'canCreateUsers', label: 'Créer' },
      { key: 'canEditUsers', label: 'Modifier' },
      { key: 'canDeleteUsers', label: 'Supprimer' },
    ],
  },
  {
    label: 'Audit & Sécurité',
    perms: [{ key: 'canViewAuditLogs', label: 'Consulter les logs' }],
  },
  {
    label: 'Rapports & Exports',
    perms: [
      { key: 'canViewRapports', label: 'Consulter' },
      { key: 'canExportData', label: 'Exporter' },
    ],
  },
  {
    label: 'Carte Nationale',
    perms: [{ key: 'canViewCarte', label: 'Consulter' }],
  },
  {
    label: 'Notifications',
    perms: [
      { key: 'canViewNotifications', label: 'Consulter' },
      { key: 'canSendNotifications', label: 'Envoyer' },
    ],
  },
  {
    label: 'Permissions',
    perms: [{ key: 'canViewPermissions', label: 'Voir cette page' }],
  },
];

const ROLES = ['administrateur', 'gestionnaire', 'agent'];

export default function Permissions() {
  const { user } = useAuth();
  const myPermissions = usePermissions();
  const [serverRoles, setServerRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set(PERMISSION_GROUPS.map(g => g.label)));

  useEffect(() => {
    api.get('/roles')
      .then(r => {
        const raw = r.data?.data || r.data || [];
        setServerRoles(Array.isArray(raw) ? raw : []);
      })
      .catch(() => {});
  }, []);

  const toggleGroup = (label) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const myRole = user?.role || user?.roles?.[0]?.name;
  const myRoleMeta = ROLE_META[myRole] || ROLE_META.agent;

  const grantedCount = (role) => Object.values(ROLE_PERMISSIONS[role] || {}).filter(Boolean).length;
  const totalCount = Object.keys(ROLE_PERMISSIONS.admin).length;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#2563EB]" />
          Rôles & Permissions
        </h1>
        <p className="text-sm text-[#64748B] dark:text-white/50 mt-1">
          Matrice des droits d'accès par rôle — votre rôle actuel :
          <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${myRoleMeta.bg} ${myRoleMeta.border} ${myRoleMeta.color}`}>
            {myRoleMeta.label}
          </span>
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROLES.map(role => {
          const meta = ROLE_META[role];
          const granted = grantedCount(role);
          const serverRole = serverRoles.find(r => r.name === role);
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(selectedRole === role ? null : role)}
              className={`p-4 rounded-xl border transition-all duration-200 text-left ${meta.bg} ${meta.border} ${
                selectedRole === role ? 'ring-2 ring-offset-1 ring-current scale-[0.97]' : 'hover:shadow-md hover:-translate-y-1 active:scale-95'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Shield className={`w-5 h-5 ${meta.color}`} />
                {selectedRole === role
                  ? <ChevronDown className={`w-4 h-4 ${meta.color}`} />
                  : <ChevronRight className={`w-4 h-4 ${meta.color}`} />
                }
              </div>
              <p className={`font-extrabold text-sm ${meta.color}`}>{meta.label}</p>
              {serverRole && <p className="text-[11px] font-bold text-[#0F172A] dark:text-white mt-1 opacity-90">{serverRole.name}</p>}
              <div className="mt-2.5">
                <div className="flex justify-between text-[11px] font-bold text-[#343a40] dark:text-white/90 mb-1.5">
                  <span>{granted} permissions</span>
                  <span>{Math.round((granted / totalCount) * 100)}%</span>
                </div>
                <div className="h-2 bg-black/15 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-current`}
                    style={{ width: `${(granted / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Permission matrix */}
      <div className="bg-white dark:bg-[#343a40] border border-[#CBD5E1] dark:border-white/15 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#CBD5E1] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/3">
          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">Matrice complète des permissions</p>
          <p className="text-xs text-[#64748B] dark:text-white/40 mt-0.5">
            {selectedRole ? `Détail du rôle : ${ROLE_META[selectedRole]?.label}` : 'Cliquez sur un rôle pour le mettre en évidence'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#CBD5E1] dark:border-white/15">
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748B] dark:text-white/40 w-48">Module / Action</th>
                {ROLES.map(role => {
                  const meta = ROLE_META[role];
                  return (
                    <th key={role} className={`px-4 py-3 text-center text-xs font-semibold ${
                      selectedRole === role ? meta.color : 'text-[#64748B] dark:text-white/40'
                    }`}>
                      {meta.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(group => {
                const isExpanded = expandedGroups.has(group.label);
                return [
                  <tr
                    key={`group-${group.label}`}
                    onClick={() => toggleGroup(group.label)}
                    className="bg-[#F8FAFC] dark:bg-white/3 border-y border-[#CBD5E1] dark:border-white/15 cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-2.5 text-xs font-bold text-[#475569] dark:text-white/60 flex items-center gap-1.5">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {group.label}
                    </td>
                    {ROLES.map(role => {
                      const groupGranted = group.perms.filter(p => ROLE_PERMISSIONS[role]?.[p.key]).length;
                      const meta = ROLE_META[role];
                      return (
                        <td key={role} className={`px-4 py-2.5 text-center text-xs ${selectedRole === role ? meta.bg : ''}`}>
                          <span className={`font-semibold ${groupGranted > 0 ? (meta.color) : 'text-[#94A3B8] dark:text-white/20'}`}>
                            {groupGranted}/{group.perms.length}
                          </span>
                        </td>
                      );
                    })}
                  </tr>,
                  ...(isExpanded ? group.perms.map(perm => (
                    <tr
                      key={`perm-${group.label}-${perm.key}`}
                      className="border-b border-[#F1F5F9] dark:border-white/5 hover:bg-[#F8FAFC] dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="px-5 py-2.5 pl-10 text-xs text-[#64748B] dark:text-white/50">{perm.label}</td>
                      {ROLES.map(role => {
                        const granted = ROLE_PERMISSIONS[role]?.[perm.key];
                        const meta = ROLE_META[role];
                        const isMe = myRole === role;
                        return (
                          <td key={role} className={`px-4 py-2.5 text-center ${selectedRole === role ? meta.bg : ''}`}>
                            {granted ? (
                              <Check className={`w-4 h-4 mx-auto ${isMe ? meta.color : 'text-[#16A34A]'}`} />
                            ) : (
                              <X className="w-3.5 h-3.5 mx-auto text-[#CBD5E1] dark:text-white/10" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )) : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* My permissions summary */}
      <div className={`${myRoleMeta.bg} ${myRoleMeta.border} border rounded-xl p-5`}>
        <h3 className={`text-sm font-semibold ${myRoleMeta.color} mb-3`}>
          Vos permissions ({myRoleMeta.label})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(myPermissions).filter(([, v]) => v).map(([key]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-white/60">
              <Check className={`w-3.5 h-3.5 shrink-0 ${myRoleMeta.color}`} />
              <span className="truncate">{key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
