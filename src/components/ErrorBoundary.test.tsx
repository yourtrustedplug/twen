import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import SomethingWentWrong from '@/pages/SomethingWentWrong';

function Boom() {
  throw new Error('boom');
}

describe('SomethingWentWrong', () => {
  it('offers retry, home, and email', () => {
    const onRetry = vi.fn();
    render(<SomethingWentWrong onRetry={onRetry} />);

    expect(screen.getByRole('heading', { name: /dropped the frame/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hello@twen\.app/i })).toHaveAttribute(
      'href',
      'mailto:hello@twen.app',
    );
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');

    screen.getByRole('button', { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorBoundary', () => {
  it('shows the crash poster when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /dropped the frame/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
