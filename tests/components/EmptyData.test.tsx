import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyData } from '@/components/ui/empty-data';
import { Users } from 'lucide-react';

describe('EmptyData', () => {
  it('renders default title and description', () => {
    render(<EmptyData />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
    expect(screen.getByText('Not enough data has been collected yet.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(<EmptyData title="No students" description="No students have been enrolled yet." />);
    expect(screen.getByText('No students')).toBeInTheDocument();
    expect(screen.getByText('No students have been enrolled yet.')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    const { container } = render(<EmptyData icon={Users} title="No users" />);
    expect(screen.getByText('No users')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom height', () => {
    const { container } = render(<EmptyData height="200px" />);
    const div = container.firstElementChild;
    expect(div).toHaveStyle('height: 200px');
  });
});
