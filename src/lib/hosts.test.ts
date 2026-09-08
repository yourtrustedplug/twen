import {
  parseTenant,
  apexHostFrom,
  roleScopedAppUrl,
  tenantOrigin,
  tenantForRole,
  isAppPath,
} from './hosts';

describe('hosts', () => {
  it('parses tenant labels', () => {
    expect(parseTenant('creator.twen.app')).toBe('creator');
    expect(parseTenant('brand.twen.app')).toBe('brand');
    expect(parseTenant('admin.twen.app')).toBe('admin');
    expect(parseTenant('twen.app')).toBe('apex');
    expect(parseTenant('www.twen.app')).toBe('apex');
    expect(parseTenant('creator.localhost')).toBe('creator');
    expect(parseTenant('localhost')).toBe('apex');
    // plural hostnames are not tenants (marketing paths only)
    expect(parseTenant('creators.twen.app')).toBe('apex');
    expect(parseTenant('brands.twen.app')).toBe('apex');
  });

  it('strips tenant for apex host', () => {
    expect(apexHostFrom('creator.twen.app')).toBe('twen.app');
    expect(apexHostFrom('twen.app')).toBe('twen.app');
  });

  it('builds tenant origins', () => {
    expect(
      tenantOrigin('brand', { hostname: 'twen.app', protocol: 'https:', port: '' }),
    ).toBe('https://brand.twen.app');
    expect(
      tenantOrigin('creator', { hostname: 'localhost', protocol: 'http:', port: '8080' }),
    ).toBe('http://creator.localhost:8080');
  });

  it('scopes PUBLIC_APP_URL by role', () => {
    expect(roleScopedAppUrl('https://twen.app', 'brand')).toBe('https://brand.twen.app');
    expect(roleScopedAppUrl('https://twen.app', 'creator')).toBe('https://creator.twen.app');
    expect(roleScopedAppUrl('https://twen.app', 'staff')).toBe('https://admin.twen.app');
    expect(roleScopedAppUrl('https://brand.twen.app', 'creator')).toBe('https://brand.twen.app');
    expect(roleScopedAppUrl('http://localhost:8080', 'brand')).toBe('http://localhost:8080');
  });

  it('maps roles to tenants and app paths', () => {
    expect(tenantForRole('creator')).toBe('creator');
    expect(tenantForRole('brand')).toBe('brand');
    expect(tenantForRole('admin')).toBe('admin');
    expect(isAppPath('/creator/profile')).toBe(true);
    expect(isAppPath('/creators')).toBe(false);
  });
});
