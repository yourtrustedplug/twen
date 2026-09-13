import { describe, expect, it } from 'vitest';
import {
  HTTP_ERROR_CODES,
  SUPPORT_EMAIL,
  httpErrorCopy,
  httpErrorPath,
  isHttpErrorCode,
} from './http-errors';

describe('httpErrorPath', () => {
  it('reads catalog codes from a pathname', () => {
    expect(httpErrorPath('/400')).toBe(400);
    expect(httpErrorPath('/401/')).toBe(401);
    expect(httpErrorPath('/504')).toBe(504);
  });

  it('rejects unknown status paths', () => {
    expect(httpErrorPath('/405')).toBeNull();
    expect(httpErrorPath('/418')).toBeNull();
    expect(httpErrorPath('/4040')).toBeNull();
    expect(httpErrorPath('/errors/500')).toBeNull();
    expect(httpErrorPath('/')).toBeNull();
  });
});

describe('isHttpErrorCode', () => {
  it('accepts the catalog and nothing else', () => {
    expect(HTTP_ERROR_CODES).toEqual([400, 401, 403, 404, 408, 429, 500, 502, 503, 504]);
    expect(isHttpErrorCode(404)).toBe(true);
    expect(isHttpErrorCode(418)).toBe(false);
  });
});

describe('httpErrorCopy', () => {
  it('gives every code a watermark-ready title and a kind', () => {
    const titles = new Set<string>();
    for (const code of HTTP_ERROR_CODES) {
      const copy = httpErrorCopy(code);
      expect(copy.code).toBe(code);
      expect(copy.eyebrow.length).toBeGreaterThan(0);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.description.length).toBeGreaterThan(20);
      expect(copy.documentTitle).toMatch(/Twen/);
      expect(['home-contact', 'sign-in', 'retry']).toContain(copy.kind);
      titles.add(copy.title);
    }
    expect(titles.size).toBe(HTTP_ERROR_CODES.length);
  });

  it('matches the 404 and 500 posters already in the product', () => {
    expect(httpErrorCopy(404).title).toBe('This brief never made it to the feed.');
    expect(httpErrorCopy(500).title).toBe('We dropped the frame.');
    expect(httpErrorCopy(500).support).toBe(true);
    expect(httpErrorCopy(500).description).toContain(SUPPORT_EMAIL);
  });

  it('sends 401 to sign-in and 4xx/5xx stalls to retry', () => {
    expect(httpErrorCopy(401).kind).toBe('sign-in');
    expect(httpErrorCopy(400).kind).toBe('home-contact');
    expect(httpErrorCopy(403).kind).toBe('home-contact');
    expect(httpErrorCopy(408).kind).toBe('retry');
    expect(httpErrorCopy(429).kind).toBe('retry');
    expect(httpErrorCopy(503).kind).toBe('retry');
  });
});
