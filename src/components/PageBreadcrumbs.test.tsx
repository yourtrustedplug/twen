import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageBreadcrumbs } from './PageBreadcrumbs';

describe('PageBreadcrumbs', () => {
  it('renders a trail on public subpages', () => {
    render(
      <MemoryRouter initialEntries={['/pricing']}>
        <PageBreadcrumbs />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Pricing')).toBeInTheDocument();
  });

  it('hides on the home gate', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <PageBreadcrumbs />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('navigation', { name: 'breadcrumb' })).not.toBeInTheDocument();
  });
});
