import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signedUrl } from '@/lib/storage';
import { campaignImage, immediateCampaignCover, useCampaignCover } from './campaign-image';

vi.mock('@/lib/storage', () => ({
  signedUrl: vi.fn(),
}));

describe('campaign covers', () => {
  beforeEach(() => {
    vi.mocked(signedUrl).mockReset();
  });

  it('picks a stable stock image from the campaign id', () => {
    expect(campaignImage('abc')).toBe(campaignImage('abc'));
    expect(campaignImage('abc')).not.toBe(campaignImage('xyz'));
  });

  it('does not use the stock photo when a real cover is still signing', () => {
    expect(immediateCampaignCover('abc', 'brand/cover.jpg')).toBe('');
    expect(immediateCampaignCover('abc', 'brand/cover.jpg')).not.toBe(campaignImage('abc'));
  });

  it('uses a public URL or stock cover immediately', () => {
    expect(immediateCampaignCover('abc', 'https://cdn.example/cover.jpg')).toBe(
      'https://cdn.example/cover.jpg'
    );
    expect(immediateCampaignCover('abc', null)).toBe(campaignImage('abc'));
  });

  it('does not flash the stock cover while the signed URL is in flight', () => {
    vi.mocked(signedUrl).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCampaignCover('abc', 'brand/pending-cover.jpg'));
    expect(result.current).toBe('');
    expect(result.current).not.toBe(campaignImage('abc'));
  });

  it('swaps in the signed URL once it resolves', async () => {
    vi.mocked(signedUrl).mockResolvedValue('https://signed.example/cover.jpg');
    const { result } = renderHook(() => useCampaignCover('abc', 'brand/unique-cover.jpg'));
    await waitFor(() => expect(result.current).toBe('https://signed.example/cover.jpg'));
  });

  it('drops a stale stock cover when a real cover arrives', async () => {
    vi.mocked(signedUrl).mockResolvedValue('https://signed.example/real.jpg');
    const { result, rerender } = renderHook(
      ({ id, cover }: { id: string; cover: string | null }) => useCampaignCover(id, cover),
      { initialProps: { id: 'x', cover: null } }
    );
    expect(result.current).toBe(campaignImage('x'));
    rerender({ id: 'real-id', cover: 'brand/real.jpg' });
    expect(result.current).toBe('');
    expect(result.current).not.toBe(campaignImage('x'));
    expect(result.current).not.toBe(campaignImage('real-id'));
    await waitFor(() => expect(result.current).toBe('https://signed.example/real.jpg'));
  });
});
