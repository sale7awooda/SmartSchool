import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfileDropdown } from '@/components/dashboard-header/UserProfileDropdown';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: ({ children }: any) => children,
}));

const t = (key: string) => {
  const map: Record<string, string> = {
    account: 'Account',
    profile: 'Profile',
    settings: 'Settings',
    sign_out: 'Sign Out',
    built_with_love: 'Built with ❤️ by AwoodaTech™',
  };
  return map[key] || key;
};

const defaultUser = { name: 'Admin User', email: 'admin@school.com', role: 'admin' };

describe('UserProfileDropdown', () => {
  it('renders user avatar initial and name', () => {
    render(
      <UserProfileDropdown
        show={false}
        onToggle={vi.fn()}
        user={defaultUser}
        onLogout={vi.fn()}
        t={t}
        isRTL={false}
      />
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('renders user email when provided', () => {
    render(
      <UserProfileDropdown
        show={false}
        onToggle={vi.fn()}
        user={defaultUser}
        onLogout={vi.fn()}
        t={t}
        isRTL={false}
      />
    );
    expect(screen.getByText('admin@school.com')).toBeInTheDocument();
  });

  it('shows dropdown content when show is true', () => {
    render(
      <UserProfileDropdown
        show={true}
        onToggle={vi.fn()}
        user={defaultUser}
        onLogout={vi.fn()}
        t={t}
        isRTL={false}
      />
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('shows Profile button for admin role', () => {
    render(
      <UserProfileDropdown
        show={true}
        onToggle={vi.fn()}
        user={defaultUser}
        onLogout={vi.fn()}
        t={t}
        isRTL={false}
      />
    );
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('hides Profile button for student role', () => {
    render(
      <UserProfileDropdown
        show={true}
        onToggle={vi.fn()}
        user={{ name: 'Bart Simpson', email: 'bart@school.com', role: 'student' }}
        onLogout={vi.fn()}
        t={t}
        isRTL={false}
      />
    );
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('calls onToggle when trigger button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <UserProfileDropdown
        show={false}
        onToggle={onToggle}
        user={defaultUser}
        onLogout={vi.fn()}
        t={t}
        isRTL={false}
      />
    );
    fireEvent.click(screen.getByText('A').closest('button')!);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('calls router.push on Settings click', () => {
    render(
      <UserProfileDropdown
        show={true}
        onToggle={vi.fn()}
        user={defaultUser}
        onLogout={vi.fn()}
        t={t}
        isRTL={false}
      />
    );
    fireEvent.click(screen.getByText('Settings'));
    expect(pushMock).toHaveBeenCalledWith('/dashboard/settings');
  });

  it('calls onLogout when Sign Out is clicked', () => {
    const onLogout = vi.fn();
    render(
      <UserProfileDropdown
        show={true}
        onToggle={vi.fn()}
        user={defaultUser}
        onLogout={onLogout}
        t={t}
        isRTL={false}
      />
    );
    fireEvent.click(screen.getByText('Sign Out'));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
