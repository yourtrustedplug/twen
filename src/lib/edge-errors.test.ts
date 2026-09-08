import { describe, expect, it } from 'vitest';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';

describe('edgeFunctionErrorMessage', () => {
  it('prefers data.error', () => {
    expect(edgeFunctionErrorMessage(new Error('x'), { error: 'nope' })).toBe('nope');
  });

  it('maps undeployed function failures', () => {
    const err = Object.assign(new Error('Failed to send a request to the Edge Function'), {
      context: { status: 404 },
    });
    expect(edgeFunctionErrorMessage(err)).toMatch(/not deployed/i);
  });

  it('maps failed-to-send without 404 as a reachability error', () => {
    expect(edgeFunctionErrorMessage(new Error('Failed to send a request to the Edge Function'))).toMatch(
      /Could not reach/i,
    );
  });

  it('falls back to message', () => {
    expect(edgeFunctionErrorMessage(new Error('boom'), null, 'fallback')).toBe('boom');
  });
});
