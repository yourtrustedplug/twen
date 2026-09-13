import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfilePlanPanel from './ProfilePlanPanel';

describe('ProfilePlanPanel', () => {
  it('shows Free as current and advertises Creator Pro on the plan tab', () => {
    render(
      <ProfilePlanPanel audience="creator" isPro={false} onUpgrade={vi.fn()} />,
    );

    expect(screen.getByText('You are on')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Creator Pro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get creator pro/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Billing' })).not.toBeInTheDocument();
    expect(screen.queryByText(/payout/i)).not.toBeInTheDocument();
  });

  it('shows only the next charge on the billing tab', () => {
    render(
      <ProfilePlanPanel audience="creator" isPro={false} focus="billing" onUpgrade={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.getByText('Next payment')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Free' })).not.toBeInTheDocument();
    expect(screen.queryByText(/payout/i)).not.toBeInTheDocument();
  });

  it('shows the next charge date on billing when Pro', () => {
    render(
      <ProfilePlanPanel
        audience="creator"
        isPro
        focus="billing"
        renewsAt="2026-10-13T12:00:00.000Z"
        onUpgrade={vi.fn()}
      />,
    );

    expect(screen.getByText('Oct 13, 2026')).toBeInTheDocument();
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Creator Pro' })).not.toBeInTheDocument();
  });

  it('marks Creator Pro current on the plan tab', () => {
    render(
      <ProfilePlanPanel audience="creator" isPro onUpgrade={vi.fn()} />,
    );

    expect(screen.getByText('You are on')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Creator Pro' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Free' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /get creator pro/i })).not.toBeInTheDocument();
  });

  it('marks Twen Plus current on the brand plan tab', () => {
    render(
      <ProfilePlanPanel audience="brand" isPro onUpgrade={vi.fn()} />,
    );

    expect(screen.getByText('You are on')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Twen Plus' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Free' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /get twen plus/i })).not.toBeInTheDocument();
  });

  it('advertises Twen Plus to a free brand', () => {
    render(
      <ProfilePlanPanel audience="brand" isPro={false} onUpgrade={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Twen Plus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get twen plus/i })).toBeInTheDocument();
  });

  it('shows $49 as the next Twen Plus charge on billing', () => {
    render(
      <ProfilePlanPanel
        audience="brand"
        isPro
        focus="billing"
        renewsAt="2026-10-13T12:00:00.000Z"
        onUpgrade={vi.fn()}
      />,
    );

    expect(screen.getByText('Oct 13, 2026')).toBeInTheDocument();
    expect(screen.getByText('$49')).toBeInTheDocument();
  });
});
