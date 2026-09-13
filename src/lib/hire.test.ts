import { describe, expect, it } from 'vitest';
import { defaultHireMessage, hireMessage } from './hire';

describe('hire messages', () => {
  it('prefers the drafted Book me note', () => {
    expect(
      hireMessage({
        body: '  Need a 20s video Friday  ',
        hire: true,
        creatorName: 'Amina',
        ratePerVideo: 40,
      }),
    ).toBe('Need a 20s video Friday');
  });

  it('falls back to a hire line when there is no note', () => {
    expect(hireMessage({ hire: true, creatorName: 'Amina', ratePerVideo: 40 })).toBe(
      defaultHireMessage('Amina', 40),
    );
    expect(defaultHireMessage('Amina', 40)).toMatch(/\$40\.00/);
  });

  it('sends nothing unless a note or hire flag is set', () => {
    expect(hireMessage({ creatorName: 'Amina' })).toBe('');
  });
});
