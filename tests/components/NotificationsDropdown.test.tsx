import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { NotificationsDropdown } from '@/components/dashboard-header/NotificationsDropdown';

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
    notifications: 'Notifications',
    mark_all_read: 'Mark All as Read',
    no_notifications: 'No new notifications',
    view_all: 'View All',
    push_denied: 'Push notifications are disabled',
  };
  return map[key] || key;
};

const makeNotification = (overrides = {}) => ({
  id: 'notif-1',
  title: 'Test Notification',
  message: 'This is a test',
  time: '6/17/2025 10:00 AM',
  type: 'info',
  icon: Bell,
  color: 'text-primary bg-primary/10',
  authorName: 'System',
  authorRole: 'admin',
  targetAudience: 'all',
  isPersonal: false,
  status: undefined,
  ...overrides,
});

describe('NotificationsDropdown', () => {
  it('renders bell button with notification count', () => {
    const notifs = [makeNotification(), makeNotification({ id: 'notif-2' })];
    render(
      <NotificationsDropdown
        show={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        notifications={notifs}
        combinedList={notifs}
        mutateUserNotifications={vi.fn()}
        t={t}
        isRTL={false}
        pushSupported={false}
        isPushSubscribed={false}
        isMounted={true}
      />
    );
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows 9+ for counts over 9', () => {
    const many = Array.from({ length: 12 }, (_, i) => makeNotification({ id: `n-${i}` }));
    render(
      <NotificationsDropdown
        show={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        notifications={many}
        combinedList={many}
        mutateUserNotifications={vi.fn()}
        t={t}
        isRTL={false}
        pushSupported={false}
        isPushSubscribed={false}
        isMounted={true}
      />
    );
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('does not show badge when unread count is 0', () => {
    render(
      <NotificationsDropdown
        show={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        notifications={[]}
        combinedList={[]}
        mutateUserNotifications={vi.fn()}
        t={t}
        isRTL={false}
        pushSupported={false}
        isPushSubscribed={false}
        isMounted={true}
      />
    );
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows dropdown content when show is true', () => {
    const notifs = [makeNotification()];
    render(
      <NotificationsDropdown
        show={true}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        notifications={notifs}
        combinedList={notifs}
        mutateUserNotifications={vi.fn()}
        t={t}
        isRTL={false}
        pushSupported={false}
        isPushSubscribed={false}
        isMounted={true}
      />
    );
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('calls onToggle when bell button clicked', () => {
    const onToggle = vi.fn();
    render(
      <NotificationsDropdown
        show={false}
        onToggle={onToggle}
        onSelect={vi.fn()}
        notifications={[]}
        combinedList={[]}
        mutateUserNotifications={vi.fn()}
        t={t}
        isRTL={false}
        pushSupported={false}
        isPushSubscribed={false}
        isMounted={true}
      />
    );
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('counts personal unread notifications correctly', () => {
    const notifs = [
      makeNotification({ id: 'n1', isPersonal: true, status: 'unread' }),
      makeNotification({ id: 'n2', isPersonal: true, status: 'read' }),
      makeNotification({ id: 'n3', isPersonal: false }),
    ];
    render(
      <NotificationsDropdown
        show={false}
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        notifications={notifs}
        combinedList={notifs}
        mutateUserNotifications={vi.fn()}
        t={t}
        isRTL={false}
        pushSupported={false}
        isPushSubscribed={false}
        isMounted={true}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
