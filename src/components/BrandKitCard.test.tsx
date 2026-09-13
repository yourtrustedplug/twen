import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrandKitCard } from './BrandKitCard';
import { emptyBrandKit, type BrandKit } from '@/lib/brand-kit';

vi.mock('@/components/SignedImage', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const kit = (): BrandKit => ({
  ...emptyBrandKit(),
  company: 'Acme',
  bio: 'Natural soda for East Africa.',
  city: 'Nairobi',
  country: 'Kenya',
  website: 'https://acme.com/',
  primary: '#112233',
  socials: { instagram: 'https://www.instagram.com/acme' },
  logo: 'brands/logo.png',
});

describe('BrandKitCard', () => {
  it('shows company, location, about, website, and socials', () => {
    render(<BrandKitCard kit={kit()} title="About the brand" />);

    expect(screen.getByText('About the brand')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Nairobi, Kenya')).toBeInTheDocument();
    expect(screen.getByText('Natural soda for East Africa.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /acme\.com/i })).toHaveAttribute('href', 'https://acme.com/');
    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute(
      'href',
      'https://www.instagram.com/acme',
    );
    expect(screen.getByText('#112233')).toBeInTheDocument();
  });

  it('hides when the kit is empty', () => {
    const { container } = render(<BrandKitCard kit={emptyBrandKit()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
