import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    const Throws = () => { throw new Error('Test error'); };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary name="TestComponent">
        <Throws />
      </ErrorBoundary>
    );
    expect(screen.getByText('Failed to load content')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('renders custom fallback when provided', () => {
    const Throws = () => { throw new Error('Test error'); };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <Throws />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load content')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('resets error state on Try Again click', () => {
    let shouldThrow = true;
    const RiskyComponent = () => {
      if (shouldThrow) throw new Error('Risky error');
      return <div>Recovered</div>;
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <RiskyComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Failed to load content')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('shows fallback name in console error', () => {
    const Throws = () => { throw new Error('Named error'); };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary name="MyWidget">
        <Throws />
      </ErrorBoundary>
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('MyWidget'),
      expect.any(Error),
      expect.anything()
    );
    vi.restoreAllMocks();
  });
});
