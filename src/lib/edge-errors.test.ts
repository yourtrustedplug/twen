import { describe, expect, it } from 'vitest';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';

describe('edgeFunctionErrorMessage', () => {
  it('prefers data.error', async () => {
    expect(await edgeFunctionErrorMessage(new Error('x'), { error: 'nope' })).toBe('nope');
  });

  it('reads JSON from a FunctionsHttpError Response', async () => {
    const err = Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      context: new Response(JSON.stringify({ error: 'That TikTok link is not on your connected account.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
    expect(await edgeFunctionErrorMessage(err, null, 'fallback')).toBe(
      'That TikTok link is not on your connected account.',
    );
  });

  it('maps undeployed function failures', async () => {
    const err = Object.assign(new Error('Failed to send a request to the Edge Function'), {
      context: { status: 404 },
    });
    expect(await edgeFunctionErrorMessage(err)).toMatch(/not deployed/i);
  });

  it('maps failed-to-send without 404 as a reachability error', async () => {
    expect(
      await edgeFunctionErrorMessage(new Error('Failed to send a request to the Edge Function')),
    ).toMatch(/Could not reach/i);
  });

  it('hides the generic non-2xx wrapper behind the fallback', async () => {
    expect(
      await edgeFunctionErrorMessage(
        new Error('Edge Function returned a non-2xx status code'),
        null,
        'TikTok could not confirm that post.',
      ),
    ).toBe('TikTok could not confirm that post.');
  });

  it('falls back to message', async () => {
    expect(await edgeFunctionErrorMessage(new Error('boom'), null, 'fallback')).toBe('boom');
  });
});
