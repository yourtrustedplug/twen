import {
  parseTenant,
  apexHostFrom,
  roleScopedAppUrl,
  tenantOrigin,
  tenantForRole,
  isAppPath,
  socialCallbackLandingPath,
  publicCreatorHref,
  bookMeHref,
  localHttpTenantRewrite,
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
    ).toBe('http://localhost:8080');
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

  it('sends social OAuth back to the creator profile Account tab', () => {
    expect(socialCallbackLandingPath('tiktok')).toBe('/creator/profile?tab=account&connected=tiktok');
    expect(socialCallbackLandingPath('instagram')).toBe('/creator/profile?tab=account&connected=instagram');
  });

  it('builds the public creator URL on the brand host', () => {
    expect(
      publicCreatorHref('abc-123', { hostname: 'creator.twen.app', protocol: 'https:', port: '' }),
    ).toBe('https://brand.twen.app/brand/creators/abc-123');
    expect(
      publicCreatorHref('abc-123', { hostname: 'localhost', protocol: 'http:', port: '8080' }),
    ).toBe('http://localhost:8080/brand/creators/abc-123');
  });

  it('builds a Book me URL on the apex host', () => {
    expect(
      bookMeHref('amina', { hostname: 'creator.twen.app', protocol: 'https:', port: '' }),
    ).toBe('https://twen.app/@amina');
  });

  it('rewrites HTTP *.localhost onto localhost paths so Privy can boot', () => {
    expect(
      localHttpTenantRewrite({
        hostname: 'creator.localhost',
        protocol: 'http:',
        port: '8080',
        pathname: '/',
      }),
    ).toBe('http://localhost:8080/creator');
    expect(
      localHttpTenantRewrite({
        hostname: 'brand.localhost',
        protocol: 'http:',
        port: '8080',
        pathname: '/signin',
        search: '?role=brand',
      }),
    ).toBe('http://localhost:8080/signin?role=brand');
    expect(
      localHttpTenantRewrite({
        hostname: 'creator.twen.app',
        protocol: 'https:',
        port: '',
        pathname: '/',
      }),
    ).toBeNull();
    expect(
      localHttpTenantRewrite({
        hostname: 'localhost',
        protocol: 'http:',
        port: '8080',
        pathname: '/',
      }),
    ).toBeNull();
  });
});
