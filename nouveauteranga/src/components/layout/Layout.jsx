import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../ErrorBoundary';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsZoomed(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleZoom = () => {
    if (!isZoomed) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
          .then(() => setIsZoomed(true))
          .catch((err) => { if (import.meta.env.DEV) console.error('Error entering full-screen mode:', err); });
      } else {
        setIsZoomed(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsZoomed(false))
          .catch((err) => { if (import.meta.env.DEV) console.error('Error exiting full-screen mode:', err); });
      } else {
        setIsZoomed(false);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F8FA] dark:bg-[#212529] overflow-hidden transition-colors duration-300 max-w-[100vw]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-green-800 focus:rounded focus:shadow-lg">Aller au contenu principal</a>
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(prev => !prev)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {!isZoomed && (
          <Topbar
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(prev => !prev)}
            onToggleZoom={handleToggleZoom}
          />
        )}
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 relative touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isZoomed && (
            <button
              onClick={handleToggleZoom}
              title="Quitter le plein écran"
              aria-label="Quitter le plein écran"
              className="fixed top-6 right-6 z-50 p-2.5 rounded-xl bg-white/80 dark:bg-[#212529]/80 backdrop-blur-md border border-[#E8ECF1] dark:border-white/[0.08] shadow-lg text-[#374151] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            >
              <Minimize2 className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
