import { parseTenant, apexHostFrom, roleScopedAppUrl, tenantOrigin } from './hosts';

describe('hosts', () => {
  it('parses tenant labels', () => {
    expect(parseTenant('creators.twen.app')).toBe('creators');
    expect(parseTenant('brands.twen.app')).toBe('brands');
    expect(parseTenant('admin.twen.app')).toBe('admin');
    expect(parseTenant('twen.app')).toBe('apex');
    expect(parseTenant('www.twen.app')).toBe('apex');
    expect(parseTenant('creators.localhost')).toBe('creators');
    expect(parseTenant('localhost')).toBe('apex');
  });

  it('strips tenant for apex host', () => {
    expect(apexHostFrom('creators.twen.app')).toBe('twen.app');
    expect(apexHostFrom('twen.app')).toBe('twen.app');
  });

  it('builds tenant origins', () => {
    expect(
      tenantOrigin('brands', { hostname: 'twen.app', protocol: 'https:', port: '' }),
    ).toBe('https://brands.twen.app');
    expect(
      tenantOrigin('creators', { hostname: 'localhost', protocol: 'http:', port: '8080' }),
    ).toBe('http://creators.localhost:8080');
  });

  it('scopes PUBLIC_APP_URL by role', () => {
    expect(roleScopedAppUrl('https://twen.app', 'brand')).toBe('https://brands.twen.app');
    expect(roleScopedAppUrl('https://twen.app', 'creator')).toBe('https://creators.twen.app');
    expect(roleScopedAppUrl('https://twen.app', 'staff')).toBe('https://admin.twen.app');
    expect(roleScopedAppUrl('https://brands.twen.app', 'creator')).toBe('https://brands.twen.app');
    expect(roleScopedAppUrl('http://localhost:8080', 'brand')).toBe('http://localhost:8080');
  });
});
