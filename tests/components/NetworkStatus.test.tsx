import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetworkStatus } from '@/components/dashboard-header/NetworkStatus';

const t = (key: string) => {
  const map: Record<string, string> = {
    system_online_msg: 'System is online',
    offline_mode_msg: 'You are offline',
    online_sync: 'Online',
    offline_local: 'Offline',
  };
  return map[key] || key;
};

describe('NetworkStatus', () => {
  it('renders online state correctly', () => {
    render(<NetworkStatus isOnline={true} pendingSyncs={0} t={t} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByTitle('System is online')).toBeInTheDocument();
  });

  it('renders offline state correctly', () => {
    render(<NetworkStatus isOnline={false} pendingSyncs={0} t={t} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByTitle('You are offline')).toBeInTheDocument();
  });

  it('shows pending sync count when > 0', () => {
    render(<NetworkStatus isOnline={true} pendingSyncs={3} t={t} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show pending sync count when 0', () => {
    const { container } = render(<NetworkStatus isOnline={true} pendingSyncs={0} t={t} />);
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('shows pending sync count in offline mode too', () => {
    render(<NetworkStatus isOnline={false} pendingSyncs={5} t={t} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
