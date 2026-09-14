import { describe, expect, it } from 'vitest';
import {
  accessibleSurfaces,
  activeSurface,
  canAccessTenant,
  hasRole,
  profileRoles,
} from './roles';

describe('profileRoles', () => {
  it('includes the primary role', () => {
    expect([...profileRoles({ role: 'creator' })]).toEqual(['creator']);
  });

  it('unions extra roles onto the primary role', () => {
    const roles = profileRoles({ role: 'creator', roles: ['brand'] });
    expect(roles.has('creator')).toBe(true);
    expect(roles.has('brand')).toBe(true);
    expect(roles.has('admin')).toBe(false);
  });

  it('lets staff use every app surface', () => {
    const roles = profileRoles({ role: 'admin' });
    expect(hasRole({ role: 'admin' }, 'creator')).toBe(true);
    expect(hasRole({ role: 'admin' }, 'brand')).toBe(true);
    expect(hasRole({ role: 'admin' }, 'admin')).toBe(true);
    expect(roles.has('moderator')).toBe(true);
  });

  it('treats admin listed only in roles as staff', () => {
    expect(hasRole({ role: 'creator', roles: ['admin'] }, 'admin')).toBe(true);
    expect(hasRole({ role: 'creator', roles: ['admin'] }, 'brand')).toBe(true);
  });
});

describe('canAccessTenant', () => {
  it('keeps staff on creator and brand hosts', () => {
    expect(canAccessTenant({ role: 'admin' }, 'creator')).toBe(true);
    expect(canAccessTenant({ role: 'admin' }, 'brand')).toBe(true);
    expect(canAccessTenant({ role: 'creator' }, 'admin')).toBe(false);
    expect(canAccessTenant({ role: 'creator', roles: ['brand'] }, 'brand')).toBe(true);
  });
});

describe('accessibleSurfaces', () => {
  it('lists creator and brand for a dual-role account', () => {
    expect(accessibleSurfaces({ role: 'creator', roles: ['brand'] })).toEqual([
      'creator',
      'brand',
    ]);
  });

  it('lists all three for staff', () => {
    expect(accessibleSurfaces({ role: 'moderator' })).toEqual(['creator', 'brand', 'admin']);
  });
});

describe('activeSurface', () => {
  it('prefers the path on localhost-style apex hosts', () => {
    expect(activeSurface('/creator/profile', 'apex')).toBe('creator');
    expect(activeSurface('/brand', 'apex')).toBe('brand');
    expect(activeSurface('/admin', 'apex')).toBe('admin');
  });

  it('prefers the tenant host', () => {
    expect(activeSurface('/', 'creator')).toBe('creator');
    expect(activeSurface('/', 'admin', { role: 'admin' })).toBe('admin');
  });
});
