import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions, ROLE_PERMISSIONS } from '../hooks/usePermissions';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';

const renderWithRole = (role) => {
  useAuth.mockReturnValue({ user: { role } });
  return renderHook(() => usePermissions()).result.current;
};

describe('usePermissions', () => {
  it('admin has all permissions true', () => {
    const perms = renderWithRole('admin');
    expect(perms.canAdminSystem).toBe(true);
    expect(perms.canDeleteUsers).toBe(true);
    expect(perms.canExportData).toBe(true);
    expect(perms.canViewPermissions).toBe(true);
  });

  it('agent cannot delete anything or export', () => {
    const perms = renderWithRole('agent');
    expect(perms.canDeleteInfractions).toBe(false);
    expect(perms.canDeleteAccidents).toBe(false);
    expect(perms.canExportData).toBe(false);
    expect(perms.canAdminSystem).toBe(false);
    expect(perms.canViewRapports).toBe(false);
  });

  it('agent can create infractions and accidents', () => {
    const perms = renderWithRole('agent');
    expect(perms.canCreateInfractions).toBe(true);
    expect(perms.canCreateAccidents).toBe(true);
  });

  it('gestionnaire can manage users in his region', () => {
    const perms = renderWithRole('gestionnaire');
    expect(perms.canCreateUsers).toBe(true);
    expect(perms.canEditUsers).toBe(true);
    expect(perms.canDeleteUsers).toBe(false);
  });

  it('gestionnaire has no admin system access', () => {
    const perms = renderWithRole('gestionnaire');
    expect(perms.canAdminSystem).toBe(false);
    expect(perms.canViewPermissions).toBe(false);
  });

  it('gestionnaire can export and view audit logs', () => {
    const perms = renderWithRole('gestionnaire');
    expect(perms.canExportData).toBe(true);
    expect(perms.canViewAuditLogs).toBe(true);
  });

  it('admin can delete personnel and users', () => {
    const perms = renderWithRole('admin');
    expect(perms.canDeletePersonnel).toBe(true);
    expect(perms.canDeleteUsers).toBe(true);
  });

  it('returns all-false defaults for unknown role', () => {
    const perms = renderWithRole('unknown_role');
    expect(Object.values(perms).every(v => v === false)).toBe(true);
  });

  it('returns all-false defaults when user is null', () => {
    useAuth.mockReturnValue({ user: null });
    const perms = renderHook(() => usePermissions()).result.current;
    expect(Object.values(perms).every(v => v === false)).toBe(true);
  });

  it('resolves role from user.roles[0].name (Spatie format)', () => {
    useAuth.mockReturnValue({ user: { roles: [{ name: 'agent' }] } });
    const perms = renderHook(() => usePermissions()).result.current;
    expect(perms.canViewInfractions).toBe(true);
    expect(perms.canDeleteInfractions).toBe(false);
  });

  it('resolves administrateur alias to admin', () => {
    useAuth.mockReturnValue({ user: { roles: [{ name: 'administrateur' }] } });
    const perms = renderHook(() => usePermissions()).result.current;
    expect(perms.canAdminSystem).toBe(true);
    expect(perms.canDeleteUsers).toBe(true);
  });

  it('ROLE_PERMISSIONS export contains all 3 roles', () => {
    expect(Object.keys(ROLE_PERMISSIONS)).toEqual(
      expect.arrayContaining(['admin', 'gestionnaire', 'agent'])
    );
  });
});
