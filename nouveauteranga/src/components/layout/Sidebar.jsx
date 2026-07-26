import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Car, Users, HeartPulse,
  Receipt, Plane, Building2, Map, FileBarChart2, ClipboardList,
  UserCog, Shield, X, ChevronRight, PanelLeftClose, PanelLeftOpen, Bell, ShieldCheck, DollarSign,
  MapPin, Send, RefreshCw, Globe2, Tag, TrendingUp, Wallet, Menu
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

const ALL_NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permKey: 'canViewDashboard' },
    ],
  },
  {
    label: 'Criminalité',
    items: [
      { name: 'Infractions', path: '/infractions', icon: AlertTriangle, permKey: 'canViewInfractions' },
      { name: 'Accidents', path: '/accidents', icon: Car, permKey: 'canViewAccidents' },
      { name: 'Victimes', path: '/victimes', icon: HeartPulse, permKey: 'canViewVictimes' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { name: 'Personnel', path: '/personnel', icon: Users, permKey: 'canViewPersonnel' },
      { name: 'Amendes & Pièces', path: '/amendes', icon: Receipt, permKey: 'canViewAmendes' },
      { name: 'Services Rémunérés', path: '/services-remuneres', icon: DollarSign, permKey: 'canViewServicesRemuneres' },
      { name: 'Immigration', path: '/immigration', icon: Plane, permKey: 'canViewImmigration' },
      { name: 'Services', path: '/services', icon: Building2, permKey: 'canViewServices' },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { name: 'Carte Nationale', path: '/carte', icon: Map, permKey: 'canViewCarte' },
      { name: 'Rapports & Exports', path: '/rapports', icon: FileBarChart2, permKey: 'canViewRapports' },
      { name: 'Stats Immigration', path: '/immigration-stats', icon: TrendingUp, permKey: 'canViewRapports' },
      { name: 'Finances & Amendes', path: '/finances-stats', icon: Wallet, permKey: 'canViewRapports' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Notifications', path: '/notifications', icon: Bell, permKey: 'canViewNotifications' },
      { name: 'Centre Notif.', path: '/notification-center', icon: Send, permKey: 'canSendNotifications' },
      { name: 'Permissions', path: '/permissions', icon: ShieldCheck, permKey: 'canViewPermissions' },
      { name: 'Scopes Territoriaux', path: '/scopes-utilisateurs', icon: MapPin, permKey: 'canViewUsers' },
      { name: 'Audit Logs', path: '/audit-logs', icon: ClipboardList, permKey: 'canViewAuditLogs' },
      { name: 'Utilisateurs', path: '/utilisateurs', icon: UserCog, permKey: 'canViewUsers' },
      { name: 'Synchro Offline', path: '/sync-offline', icon: RefreshCw, permKey: 'canAdminSystem' },
      { name: 'Adm. Géographique', path: '/geo-admin', icon: Globe2, permKey: 'canAdminSystem' },
      { name: 'Catégories Infract.', path: '/categories-infractions', icon: Tag, permKey: 'canAdminSystem' },
    ],
  },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen, collapsed, onToggleCollapse }) {
  const perms = usePermissions();
  const navGroups = ALL_NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(item => perms[item.permKey]) }))
    .filter(group => group.items.length > 0);

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          sidebar-premium
          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          md:static md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-[64px]' : 'w-[256px]'}
        `}
      >
        {/* Logo + bouton collapse desktop */}
        <div className={`h-16 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-white/[0.06] shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-black/20">
              <img src="/logo-v2.png" alt="GESCRIM" className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <span className="text-white font-semibold text-[14px] tracking-[-0.01em] truncate">
                Teranga GESCRIM
              </span>
            )}
          </div>

          {/* Bouton fermer mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Bouton collapse desktop */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Développer le menu' : 'Réduire le menu'}
            className="hidden md:flex p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-1.5' : 'px-3'}`}>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              {/* Label de groupe — masqué en mode réduit */}
              {!collapsed && (
                <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.08em] px-3 mb-2">
                  {group.label}
                </p>
              )}
              {/* Séparateur en mode réduit */}
              {collapsed && (
                <div className="mx-2 mb-2 border-t border-white/[0.06]" />
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        `sidebar-item ${collapsed ? 'justify-center px-1' : ''
                        } ${isActive
                          ? 'active'
                          : ''
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`${collapsed ? 'w-[24.5px] h-[24.5px]' : 'w-[22px] h-[22px]'
                              } shrink-0 transition-all duration-300 ${isActive ? 'text-[#1B4332] dark:text-white' : 'text-white/60'}`}
                          />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{item.name}</span>
                              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-white/[0.06] shrink-0">
            <p className="text-[10px] text-white/15 text-center font-medium tracking-wide">
              DSP · Gouvernement du Sénégal
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
