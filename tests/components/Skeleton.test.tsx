import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders a div with animation classes', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
    expect(container.firstElementChild!.className).toContain('animate-pulse');
    expect(container.firstElementChild!.className).toContain('rounded-md');
    expect(container.firstElementChild!.className).toContain('bg-muted');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="w-10 h-10" />);
    expect(container.firstElementChild!.className).toContain('w-10');
    expect(container.firstElementChild!.className).toContain('h-10');
  });

  it('passes additional props', () => {
    const { container } = render(<Skeleton data-testid="skeleton-loader" />);
    expect(container.querySelector('[data-testid="skeleton-loader"]')).toBeInTheDocument();
  });
});
