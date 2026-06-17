import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mocks.mockSupabaseClient,
}));

const mockTableData: Record<string, any[]> = {
  schools: [{ id: 's-1', name: 'Test School' }],
  users: [{ id: 'u-1', name: 'Admin', role: 'admin' }],
  bus_routes: [{ id: 'r-1', name: 'Route A', route_number: 'R-101', bus_number: 'BUS-01', driver_id: 'u-1', status: 'Not Started' }],
  bus_stops: [{ id: 'st-1', route_id: 'r-1', name: 'Stop 1', latitude: 39.78, longitude: -89.65, order_index: 0 }],
};

const mockSupabaseClient = {
  from: vi.fn((table: string) => {
    function createThenable(data: any) {
      const thenable: any = (onfulfilled: any) =>
        Promise.resolve({ data, error: null }).then(onfulfilled);
      thenable.then = thenable;
      return thenable;
    }

    const chainable: any = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.order = vi.fn().mockReturnValue(createThenable(mockTableData[table] || []));
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockReturnValue(createThenable((mockTableData[table] || [])[0] || null));
    chainable.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    chainable.insert = vi.fn().mockResolvedValue({ data: null, error: null });
    chainable.delete = vi.fn().mockReturnValue(chainable);
    chainable.update = vi.fn().mockReturnValue(chainable);
    chainable.range = vi.fn().mockReturnValue(chainable);
    chainable.ilike = vi.fn().mockReturnValue(chainable);
    chainable.limit = vi.fn().mockReturnValue(chainable);
    chainable.maybeSingle = vi.fn().mockReturnValue(createThenable(null));
    chainable.then = createThenable(mockTableData[table] || []);
    return chainable;
  }),
  rpc: vi.fn().mockResolvedValue({ data: ['schools', 'users', 'bus_routes', 'bus_stops'], error: null }),
};

const mocks = { mockSupabaseClient };

describe('Backup & Restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export all tables as a backup object', async () => {
    const { backupDatabaseAction } = await import('@/app/actions/backup');
    const result = await backupDatabaseAction();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.timestamp).toBeDefined();
    expect(result.data!.tables).toBeDefined();
    expect(result.data!.tables.bus_routes).toHaveLength(1);
    expect(result.data!.tables.bus_routes[0].route_number).toBe('R-101');
  });

  it('should restore data from a backup object', async () => {
    const { restoreDatabaseAction } = await import('@/app/actions/backup');
    const backupData = {
      timestamp: new Date().toISOString(),
      tables: {
        bus_routes: [{ id: 'r-2', name: 'Route B', route_number: 'R-202', bus_number: 'BUS-02', status: 'Not Started' }],
        bus_stops: [{ id: 'st-2', route_id: 'r-2', name: 'Stop 1', order_index: 0 }],
      },
    };

    const result = await restoreDatabaseAction(backupData);
    expect(result.success).toBe(true);
    expect(result.restoredTables).toContain('bus_routes');
    expect(result.restoredTables).toContain('bus_stops');
  });

  it('should handle empty backup gracefully', async () => {
    const { restoreDatabaseAction } = await import('@/app/actions/backup');
    const result = await restoreDatabaseAction({ timestamp: '', tables: {} });
    expect(result.success).toBe(true);
    expect(result.restoredTables).toEqual([]);
  });
});

describe('Push Notification Subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect push notification support in browser', async () => {
    const { isPushNotificationSupported } = await import('@/lib/push-notifications');

    // Mock serviceWorker and PushManager in navigator
    Object.assign(navigator, {
      serviceWorker: { ready: Promise.resolve({ pushManager: {} }) },
    });
    (window as any).PushManager = function () {};

    const supported = await isPushNotificationSupported();
    expect(supported).toBe(true);
  });

  it('should return false when push is not supported', async () => {
    const { isPushNotificationSupported } = await import('@/lib/push-notifications');

    const originalNavigator = { ...navigator };
    Object.assign(navigator, { serviceWorker: undefined });

    // @ts-expect-error - cleanup for navigator mock
    delete (window as any).PushManager;

    const supported = await isPushNotificationSupported();
    // Restore
    Object.assign(navigator, originalNavigator);
    expect(supported).toBe(false);
  });

  it('should get existing subscription if one exists', async () => {
    const { getExistingSubscription } = await import('@/lib/push-notifications');

    const mockSubscription = { endpoint: 'https://example.com/push' };
    const mockRegistration = {
      pushManager: { getSubscription: vi.fn().mockResolvedValue(mockSubscription) },
    };

    Object.assign(navigator, {
      serviceWorker: { ready: Promise.resolve(mockRegistration) },
    });
    (window as any).PushManager = function () {};

    const subscription = await getExistingSubscription();
    expect(subscription).toEqual(mockSubscription);
  });

  it('should return null when no existing subscription', async () => {
    const { getExistingSubscription } = await import('@/lib/push-notifications');

    const mockRegistration = {
      pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
    };

    Object.assign(navigator, {
      serviceWorker: { ready: Promise.resolve(mockRegistration) },
    });
    (window as any).PushManager = function () {};

    const subscription = await getExistingSubscription();
    expect(subscription).toBeNull();
  });
});
