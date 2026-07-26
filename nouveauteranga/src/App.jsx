import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { usePermissions } from './hooks/usePermissions';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';

// Retry automatique sur les chunks lazy (réseau instable)
function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch(() => new Promise(resolve => setTimeout(() => resolve(factory()), 1500)))
  );
}

const Dashboard              = lazyWithRetry(() => import('./pages/Dashboard'));
const Infractions            = lazyWithRetry(() => import('./pages/Infractions'));
const Accidents              = lazyWithRetry(() => import('./pages/Accidents'));
const Personnel              = lazyWithRetry(() => import('./pages/Personnel'));
const Victimes               = lazyWithRetry(() => import('./pages/Victimes'));
const Services               = lazyWithRetry(() => import('./pages/Services'));
const Users                  = lazyWithRetry(() => import('./pages/Users'));
const AuditLogs              = lazyWithRetry(() => import('./pages/AuditLogs'));
const CarteNationale         = lazyWithRetry(() => import('./pages/CarteNationale'));
const Amendes                = lazyWithRetry(() => import('./pages/Amendes'));
const Immigration            = lazyWithRetry(() => import('./pages/Immigration'));
const Rapports               = lazyWithRetry(() => import('./pages/Rapports'));
const Notifications          = lazyWithRetry(() => import('./pages/Notifications'));
const Permissions            = lazyWithRetry(() => import('./pages/Permissions'));
const ServicesRemuneres      = lazyWithRetry(() => import('./pages/ServicesRemuneres'));
const ScopesUtilisateurs     = lazyWithRetry(() => import('./pages/ScopesUtilisateurs'));
const NotificationCenter     = lazyWithRetry(() => import('./pages/NotificationCenter'));
const SyncOffline            = lazyWithRetry(() => import('./pages/SyncOffline'));
const GeoAdmin               = lazyWithRetry(() => import('./pages/GeoAdmin'));
const CategoriesInfractions  = lazyWithRetry(() => import('./pages/CategoriesInfractions'));
const ImmigrationStats       = lazyWithRetry(() => import('./pages/ImmigrationStats'));
const FinancesStats          = lazyWithRetry(() => import('./pages/FinancesStats'));
const MonProfil              = lazyWithRetry(() => import('./pages/MonProfil'));

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const Unauthorized = () => (
  <div className="flex flex-col items-center justify-center h-full py-24 gap-4">
    <p className="text-lg font-semibold text-[#0F172A] dark:text-white">Accès refusé</p>
    <p className="text-sm text-[#64748B] dark:text-white/50">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
  </div>
);

const RoleRoute = ({ permKey }) => {
  const perms = usePermissions();
  return perms[permKey] ? <Outlet /> : <Unauthorized />;
};

const PageFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[60vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]" />
  </div>
);

const PageShell = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageFallback />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"/></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route element={<RoleRoute permKey="canViewDashboard" />}>
                  <Route path="dashboard"             element={<PageShell><Dashboard /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewInfractions" />}>
                  <Route path="infractions"           element={<PageShell><Infractions /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewAccidents" />}>
                  <Route path="accidents"             element={<PageShell><Accidents /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewPersonnel" />}>
                  <Route path="personnel"             element={<PageShell><Personnel /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewVictimes" />}>
                  <Route path="victimes"              element={<PageShell><Victimes /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewServices" />}>
                  <Route path="services"              element={<PageShell><Services /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewUsers" />}>
                  <Route path="utilisateurs"          element={<PageShell><Users /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewAuditLogs" />}>
                  <Route path="audit-logs"            element={<PageShell><AuditLogs /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewCarte" />}>
                  <Route path="carte"                 element={<PageShell><CarteNationale /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewAmendes" />}>
                  <Route path="amendes"               element={<PageShell><Amendes /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewImmigration" />}>
                  <Route path="immigration"           element={<PageShell><Immigration /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewRapports" />}>
                  <Route path="rapports"              element={<PageShell><Rapports /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewNotifications" />}>
                  <Route path="notifications"         element={<PageShell><Notifications /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewPermissions" />}>
                  <Route path="permissions"           element={<PageShell><Permissions /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewServicesRemuneres" />}>
                  <Route path="services-remuneres"    element={<PageShell><ServicesRemuneres /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewUsers" />}>
                  <Route path="scopes-utilisateurs"   element={<PageShell><ScopesUtilisateurs /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canSendNotifications" />}>
                  <Route path="notification-center"   element={<PageShell><NotificationCenter /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canAdminSystem" />}>
                  <Route path="sync-offline"          element={<PageShell><SyncOffline /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canAdminSystem" />}>
                  <Route path="geo-admin"             element={<PageShell><GeoAdmin /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canAdminSystem" />}>
                  <Route path="categories-infractions" element={<PageShell><CategoriesInfractions /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewRapports" />}>
                  <Route path="immigration-stats"     element={<PageShell><ImmigrationStats /></PageShell>} />
                  <Route path="finances-stats"        element={<PageShell><FinancesStats /></PageShell>} />
                </Route>
                <Route element={<RoleRoute permKey="canViewDashboard" />}>
                  <Route path="mon-profil"            element={<PageShell><MonProfil /></PageShell>} />
                </Route>
              </Route>
            </Route>
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
