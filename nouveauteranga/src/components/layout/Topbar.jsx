import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, Menu, ChevronDown, Sun, Moon, CheckCheck, Maximize2, UserCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import GlobalSearchBar from '../GlobalSearchBar';

export default function Topbar({ onToggleSidebar, collapsed, onToggleCollapse, onToggleZoom }) {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    notificationService.getUnreadCount()
      .then(r => {
        const count = r.data?.count ?? r.data?.data?.count ?? 0;
        setUnreadCount(count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    notificationService.getAll()
      .then(r => {
        const data = r.data?.data || r.data || [];
        setNotifications(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, [notifOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch { /* intentional */ }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* intentional */ }
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AG';

  return (
    <header className="h-16 bg-white dark:bg-[#212529] border-b border-[#E8ECF1] dark:border-white/[0.06] flex items-center justify-between px-5 gap-4 shrink-0 sticky top-0 z-20 transition-colors duration-200">

      {/* Mobile menu button */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-xl text-[#6B7280] dark:text-white/50 hover:text-[#212529] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] transition-all md:hidden"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>



      {/* Search */}
      <GlobalSearchBar />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">

        {/* Dark / Light mode */}
        <button
          onClick={toggleTheme}
          title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="relative p-2 rounded-xl text-[#9CA3AF] dark:text-white/40 hover:text-[#374151] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] transition-all"
        >
          {dark
            ? <Sun className="w-[18px] h-[18px]" />
            : <Moon className="w-[18px] h-[18px]" />
          }
        </button>

        {/* Fullscreen Zoom */}
        <button
          onClick={onToggleZoom}
          title="Zoomer le panel (Plein écran)"
          className="relative p-2 rounded-xl text-[#9CA3AF] dark:text-white/40 hover:text-[#374151] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] transition-all"
        >
          <Maximize2 className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(p => !p)}
            className="relative p-2 rounded-xl text-[#9CA3AF] dark:text-white/40 hover:text-[#374151] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] transition-all"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-[#DC2626] text-white rounded-full ring-2 ring-white dark:ring-[#212529]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#343a40] border border-[#E8ECF1] dark:border-white/[0.08] rounded-2xl shadow-xl shadow-black/[0.06] z-50 overflow-hidden animate-fade-in-up">
              <div className="px-5 py-3.5 border-b border-[#F3F4F6] dark:border-white/[0.06] flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[#212529] dark:text-white tracking-[-0.01em]">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-[11px] text-[#1B4332] dark:text-[#52B788] hover:text-[#143728] font-semibold transition-colors">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#F3F4F6] dark:divide-white/[0.04]">
                {notifications.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-[#9CA3AF] dark:text-white/30">Aucune notification</p>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.read_at && handleMarkRead(n.id)}
                    className={`px-5 py-3.5 cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-colors ${!n.read_at ? 'bg-[#F0FDF4]/40 dark:bg-[#1B4332]/10' : ''}`}
                  >
                    <p className={`text-[12px] leading-relaxed ${!n.read_at ? 'font-semibold text-[#212529] dark:text-white' : 'text-[#6B7280] dark:text-white/50'}`}>
                      {n.data?.message || n.message || 'Nouvelle notification'}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] dark:text-white/25 mt-1 font-medium">
                      {new Date(n.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-[#E8ECF1] dark:bg-white/[0.06] mx-1.5" />

        {/* User menu */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 h-9 px-2.5 rounded-xl hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1B4332] to-[#40916C] text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
              {initials}
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-[#374151] dark:text-white max-w-[100px] truncate tracking-[-0.01em]">
              {user?.name || 'Agent'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#9CA3AF] dark:text-white/30 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#343a40] border border-[#E8ECF1] dark:border-white/[0.08] rounded-2xl shadow-xl shadow-black/[0.06] p-1.5 z-50 animate-fade-in-up">
              <div className="px-3.5 py-2.5 mb-1 border-b border-[#F3F4F6] dark:border-white/[0.06]">
                <p className="text-[13px] font-semibold text-[#212529] dark:text-white truncate tracking-[-0.01em]">{user?.name || 'Inspecteur'}</p>
                <p className="text-[11px] text-[#6B7280] dark:text-white/40 capitalize mt-0.5 font-medium">{(typeof user?.roles?.[0] === 'string' ? user?.roles?.[0] : user?.roles?.[0]?.name) || 'Agent'}</p>
              </div>
              <button
                onClick={() => { navigate('/mon-profil'); setDropdownOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[#374151] dark:text-white/70 hover:bg-[#F3F4F6] dark:hover:bg-white/5 rounded-xl transition-colors font-medium"
              >
                <UserCircle className="w-4 h-4" />
                Mon Profil
              </button>
              <button
                onClick={() => { logout(); setDropdownOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-red-500/10 rounded-xl transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
