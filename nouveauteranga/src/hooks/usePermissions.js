import { useAuth } from '../contexts/AuthContext';

const ROLE_PERMISSIONS = {
  // Administrateur : portée nationale, toutes les permissions
  admin: {
    canViewUsers: true, canCreateUsers: true, canEditUsers: true, canDeleteUsers: true,
    canViewPersonnel: true, canCreatePersonnel: true, canEditPersonnel: true, canDeletePersonnel: true,
    canViewInfractions: true, canCreateInfractions: true, canEditInfractions: true, canDeleteInfractions: true,
    canViewAccidents: true, canCreateAccidents: true, canEditAccidents: true, canDeleteAccidents: true,
    canViewVictimes: true, canCreateVictimes: true, canEditVictimes: true, canDeleteVictimes: true,
    canViewServicesRemuneres: true, canCreateServicesRemuneres: true, canEditServicesRemuneres: true, canDeleteServicesRemuneres: true,
    canViewAmendes: true, canCreateAmendes: true, canEditAmendes: true, canDeleteAmendes: true,
    canViewImmigration: true, canCreateImmigration: true, canEditImmigration: true, canDeleteImmigration: true,
    canViewDashboard: true, canViewCarte: true,
    canExportData: true, canImportData: true,
    canViewAuditLogs: true,
    canSendNotifications: true, canViewNotifications: true,
    canAdminSystem: true,
    canViewServices: true, canCreateServices: true, canEditServices: true, canDeleteServices: true,
    canViewRapports: true,
    canViewPermissions: true,
  },

  // Gestionnaire : portée régionale — gère les agents de sa région
  gestionnaire: {
    canViewUsers: true, canCreateUsers: true, canEditUsers: true, canDeleteUsers: false,
    canViewPersonnel: true, canCreatePersonnel: true, canEditPersonnel: true, canDeletePersonnel: true,
    canViewInfractions: true, canCreateInfractions: true, canEditInfractions: true, canDeleteInfractions: true,
    canViewAccidents: true, canCreateAccidents: true, canEditAccidents: true, canDeleteAccidents: true,
    canViewVictimes: true, canCreateVictimes: true, canEditVictimes: true, canDeleteVictimes: true,
    canViewServicesRemuneres: true, canCreateServicesRemuneres: true, canEditServicesRemuneres: true, canDeleteServicesRemuneres: true,
    canViewAmendes: true, canCreateAmendes: true, canEditAmendes: true, canDeleteAmendes: true,
    canViewImmigration: true, canCreateImmigration: true, canEditImmigration: true, canDeleteImmigration: true,
    canViewDashboard: true, canViewCarte: true,
    canExportData: true, canImportData: true,
    canViewAuditLogs: true,
    canSendNotifications: true, canViewNotifications: true,
    canAdminSystem: false,
    canViewServices: true, canCreateServices: false, canEditServices: false, canDeleteServices: false,
    canViewRapports: true,
    canViewPermissions: false,
  },

  // Agent terrain : saisie dans son service uniquement (connexion mobile uniquement)
  agent: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewPersonnel: true, canCreatePersonnel: false, canEditPersonnel: false, canDeletePersonnel: false,
    canViewInfractions: true, canCreateInfractions: true, canEditInfractions: true, canDeleteInfractions: false,
    canViewAccidents: true, canCreateAccidents: true, canEditAccidents: true, canDeleteAccidents: false,
    canViewVictimes: true, canCreateVictimes: true, canEditVictimes: true, canDeleteVictimes: false,
    canViewServicesRemuneres: true, canCreateServicesRemuneres: true, canEditServicesRemuneres: false, canDeleteServicesRemuneres: false,
    canViewAmendes: true, canCreateAmendes: true, canEditAmendes: false, canDeleteAmendes: false,
    canViewImmigration: true, canCreateImmigration: true, canEditImmigration: false, canDeleteImmigration: false,
    canViewDashboard: true, canViewCarte: false,
    canExportData: false, canImportData: false,
    canViewAuditLogs: false,
    canSendNotifications: false, canViewNotifications: true,
    canAdminSystem: false,
    canViewServices: false, canCreateServices: false, canEditServices: false, canDeleteServices: false,
    canViewRapports: false,
    canViewPermissions: false,
  },
};

const DEFAULT_PERMISSIONS = Object.fromEntries(
  Array.from(new Set(Object.values(ROLE_PERMISSIONS).flatMap(Object.keys))).map(k => [k, false])
);

// 'administrateur' est le nom en base, 'admin' est la clé frontend — alias bidirectionnel
const ROLE_ALIAS = { administrateur: 'admin' };

export function usePermissions() {
  const { user } = useAuth();
  const rawRole = user?.roles?.[0];
  const raw = user?.role
    || (typeof rawRole === 'string' ? rawRole : rawRole?.name)
    || null;
  const role = (raw && ROLE_ALIAS[raw]) ? ROLE_ALIAS[raw] : raw;
  return ROLE_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS;
}

export { ROLE_PERMISSIONS };
