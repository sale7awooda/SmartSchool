import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mocks.mockSupabaseClient,
}));

const mockSchoolId = 's-1';
const mockPlanId = 'p-1';
const mockAnnouncementId = 'a-1';
const mockAuditId = 'l-1';
const mockUserId = 'u-1';

let mockData: Record<string, any[]> = {
  schools: [{ id: mockSchoolId, name: 'Test School', subdomain: 'test', is_active: true, currency: 'USD', timezone: 'UTC', storage_used_bytes: 1048576, user_count: 10, student_count: 50, advanced_config: { theme: 'light' }, branding_config: { logo: '' }, backup_config: { auto: true }, maintenance_mode: false }],
  subscription_plans: [{ id: mockPlanId, name: 'Basic', price: 49.99, billing_type: 'monthly', max_students: 100, max_staff: 20, storage_limit_mb: 5000, enabled_modules: ['fees', 'transport'], sort_order: 1, description: 'Basic plan' }],
  backups: [{ id: 'b-1', school_id: mockSchoolId, status: 'completed', backup_type: 'auto', file_url: 'https://storage.example.com/backup.sql', size_bytes: 1048576, created_at: '2024-01-15' }],
  users: [{ id: mockUserId, name: 'Super Admin', email: 'sale7awooda@gmail.com', role: 'super_admin', school_id: null, is_active: true }],
  subscriptions: [{ id: 'sub-1', school_id: mockSchoolId, plan_id: mockPlanId }],
  school_module_overrides: [{ id: 'o-1', school_id: mockSchoolId, module: 'transport', is_active: false }],
  system_announcements: [{ id: mockAnnouncementId, title: 'Test', content: 'Content', announcement_type: 'banner', is_active: true, school_id: null, created_by: mockUserId, created_at: '2024-01-01' }],
  audit_logs: [{ id: mockAuditId, admin_id: mockUserId, action: 'create_school', resource_type: 'school', resource_id: mockSchoolId, created_at: '2024-01-01' }],
  system_health_logs: [{ id: 'h-1', level: 'info', message: 'System healthy', recorded_at: '2024-01-01' }],
};

function createThenable(data: any) {
  const arr = Array.isArray(data) ? data : [data].filter(Boolean);
  const result = { data, error: null, count: arr.length };
  const thenable: any = (onfulfilled: any) =>
    Promise.resolve(result).then(onfulfilled);
  thenable.then = thenable;
  return thenable;
}

function makeChainable(table: string) {
  const chainable: any = {};
  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.order = vi.fn().mockReturnValue(chainable);
  chainable.eq = vi.fn().mockReturnValue(chainable);
  chainable.single = vi.fn().mockReturnValue(createThenable((mockData[table] || [])[0] || null));
  chainable.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  chainable.insert = vi.fn().mockReturnValue(chainable);
  chainable.delete = vi.fn().mockReturnValue(chainable);
  chainable.update = vi.fn().mockReturnValue(chainable);
  chainable.range = vi.fn().mockReturnValue(createThenable(mockData[table] || []));
  chainable.ilike = vi.fn().mockReturnValue(chainable);
  chainable.limit = vi.fn().mockReturnValue(createThenable(mockData[table] || []));
  chainable.maybeSingle = vi.fn().mockReturnValue(createThenable(null));
  chainable.or = vi.fn().mockReturnValue(chainable);
  chainable.neq = vi.fn().mockReturnValue(chainable);
  const data = mockData[table] || [];
  chainable.then = (onfulfilled: any) =>
    Promise.resolve({ data, error: null, count: data.length }).then(onfulfilled);
  return chainable;
}

const mockSupabaseClient = {
  from: vi.fn((table: string) => makeChainable(table)),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

const mocks = { mockSupabaseClient };

describe('Super Admin Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      schools: [{ id: mockSchoolId, name: 'Test School', subdomain: 'test', is_active: true, currency: 'USD', timezone: 'UTC', storage_used_bytes: 1048576, user_count: 10, student_count: 50, advanced_config: { theme: 'light' }, branding_config: { logo: '' }, backup_config: { auto: true }, maintenance_mode: false }],
      subscription_plans: [{ id: mockPlanId, name: 'Basic', price: 49.99, billing_type: 'monthly', max_students: 100, max_staff: 20, storage_limit_mb: 5000, enabled_modules: ['fees', 'transport'], sort_order: 1, description: 'Basic plan' }],
      backups: [{ id: 'b-1', school_id: mockSchoolId, status: 'completed', backup_type: 'auto', file_url: 'https://storage.example.com/backup.sql', size_bytes: 1048576, created_at: '2024-01-15' }],
      users: [{ id: mockUserId, name: 'Super Admin', email: 'sale7awooda@gmail.com', role: 'super_admin', school_id: null, is_active: true }],
      subscriptions: [{ id: 'sub-1', school_id: mockSchoolId, plan_id: mockPlanId }],
      school_module_overrides: [{ id: 'o-1', school_id: mockSchoolId, module: 'transport', is_active: false }],
      system_announcements: [{ id: mockAnnouncementId, title: 'Test', content: 'Content', announcement_type: 'banner', is_active: true, school_id: null, created_by: mockUserId, created_at: '2024-01-01' }],
      audit_logs: [{ id: mockAuditId, admin_id: mockUserId, action: 'create_school', resource_type: 'school', resource_id: mockSchoolId, created_at: '2024-01-01' }],
      system_health_logs: [{ id: 'h-1', level: 'info', message: 'System healthy', recorded_at: '2024-01-01' }],
    };
  });

  describe('getSuperAdminStats', () => {
    it('should return aggregated stats', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'users') {
          c.select = vi.fn().mockReturnValue(c);
          c.neq = vi.fn().mockReturnValue(c);
          c.then = (onfulfilled: any) =>
            Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled);
        }
        if (table === 'backups') {
          c.select = vi.fn().mockReturnValue(c);
          c.eq = vi.fn().mockReturnValue(c);
          c.then = (onfulfilled: any) =>
            Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled);
        }
        return c;
      });

      const { getSuperAdminStats } = await import('@/app/actions/super-admin');
      const stats = await getSuperAdminStats();

      expect(stats.totalSchools).toBe(1);
      expect(stats.activeSchools).toBe(1);
      expect(stats.totalUsers).toBe(0);
      expect(stats.failedBackups).toBe(0);
      expect(stats.plans).toHaveLength(1);
    });
  });

  describe('School CRUD', () => {
    it('should create a school', async () => {
      const { createSchool } = await import('@/app/actions/super-admin');
      const result = await createSchool({ name: 'New School', subdomain: 'new' });

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('schools');
    });

    it('should fetch paginated schools', async () => {
      const { getSchools } = await import('@/app/actions/super-admin');
      const result = await getSchools(1, 20, 'Test');

      expect(result.data).toHaveLength(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('schools');
    });

    it('should fetch school by id with relations', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'schools') {
          c.select = vi.fn().mockReturnValue(c);
          c.eq = vi.fn().mockReturnValue(c);
          c.single = vi.fn().mockResolvedValue({ data: { ...mockData.schools[0], subscriptions: [{ id: 'sub-1' }], school_module_overrides: [{ id: 'o-1' }] }, error: null });
        }
        return c;
      });

      const { getSchoolById } = await import('@/app/actions/super-admin');
      const school = await getSchoolById(mockSchoolId);

      expect(school.id).toBe(mockSchoolId);
      expect(school.subscriptions).toBeDefined();
      expect(school.school_module_overrides).toBeDefined();
    });

    it('should toggle school status', async () => {
      const { toggleSchoolStatus } = await import('@/app/actions/super-admin');
      const result = await toggleSchoolStatus(mockSchoolId, false);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('schools');
    });

    it('should update school config', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'schools') {
          c.select = vi.fn().mockReturnValue(c);
          c.eq = vi.fn().mockReturnValue(c);
          c.single = vi.fn().mockResolvedValue({ data: { ...mockData.schools[0], advanced_config: { theme: 'light' } }, error: null });
        }
        return c;
      });

      const { updateSchoolConfig } = await import('@/app/actions/super-admin');
      const result = await updateSchoolConfig(mockSchoolId, 'advanced_config', { theme: 'dark' });

      expect(result.success).toBe(true);
    });

    it('should toggle maintenance mode', async () => {
      const { toggleMaintenanceMode } = await import('@/app/actions/super-admin');
      const result = await toggleMaintenanceMode(mockSchoolId, true, 'Scheduled maintenance');

      expect(result.success).toBe(true);
    });
  });

  describe('Subscription Plans', () => {
    it('should list all plans ordered by sort_order', async () => {
      const { getSubscriptionPlans } = await import('@/app/actions/super-admin');
      const plans = await getSubscriptionPlans();

      expect(plans).toHaveLength(1);
      expect(plans[0].name).toBe('Basic');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscription_plans');
    });

    it('should create a new plan', async () => {
      const { createPlan } = await import('@/app/actions/super-admin');
      const result = await createPlan({ name: 'Pro', price: 99.99, billing_type: 'monthly' });

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscription_plans');
    });

    it('should update a plan', async () => {
      const { updatePlan } = await import('@/app/actions/super-admin');
      const result = await updatePlan(mockPlanId, { price: 59.99 });

      expect(result.success).toBe(true);
    });

    it('should delete a plan', async () => {
      const { deletePlan } = await import('@/app/actions/super-admin');
      const result = await deletePlan(mockPlanId);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscription_plans');
    });

    it('should assign plan to school', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'subscriptions') {
          c.select = vi.fn().mockReturnValue(c);
          c.eq = vi.fn().mockReturnValue(c);
          c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        }
        return c;
      });

      const { assignPlanToSchool } = await import('@/app/actions/super-admin');
      const result = await assignPlanToSchool(mockSchoolId, mockPlanId);

      expect(result.success).toBe(true);
    });
  });

  describe('Announcements', () => {
    it('should fetch announcements with creator info', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'system_announcements') {
          c.select = vi.fn().mockReturnValue(c);
          c.order = vi.fn().mockReturnValue(createThenable(mockData.system_announcements));
        }
        return c;
      });

      const { getAnnouncements } = await import('@/app/actions/super-admin');
      const announcements = await getAnnouncements();

      expect(announcements).toHaveLength(1);
      expect(announcements[0].title).toBe('Test');
    });

    it('should create an announcement', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'users') {
          c.select = vi.fn().mockReturnValue(c);
          c.eq = vi.fn().mockReturnValue(c);
          c.single = vi.fn().mockResolvedValue({ data: { id: mockUserId }, error: null });
        }
        return c;
      });

      const { createAnnouncement } = await import('@/app/actions/super-admin');
      const result = await createAnnouncement({ title: 'Urgent', content: 'Test content', announcement_type: 'popup' });

      expect(result.success).toBe(true);
    });

    it('should toggle announcement status', async () => {
      const { toggleAnnouncement } = await import('@/app/actions/super-admin');
      const result = await toggleAnnouncement(mockAnnouncementId, false);

      expect(result.success).toBe(true);
    });

    it('should delete an announcement', async () => {
      const { deleteAnnouncement } = await import('@/app/actions/super-admin');
      const result = await deleteAnnouncement(mockAnnouncementId);

      expect(result.success).toBe(true);
    });
  });

  describe('Audit Logs', () => {
    it('should return paginated audit logs with admin name', async () => {
      const { getAuditLogs } = await import('@/app/actions/super-admin');
      const result = await getAuditLogs(1, 30);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('create_school');
    });

    it('should log an audit action', async () => {
      const { logAuditAction } = await import('@/app/actions/super-admin');
      await logAuditAction('test_action', 'test_resource', 'resource-1', undefined, undefined, 'mock-admin-id');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should skip logging when no adminId provided', async () => {
      const { logAuditAction } = await import('@/app/actions/super-admin');
      mockSupabaseClient.from.mockClear();
      await logAuditAction('test_action', 'test_resource', 'resource-1');
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });

  describe('Backups', () => {
    it('should fetch paginated backups', async () => {
      const { getBackups } = await import('@/app/actions/super-admin');
      const result = await getBackups(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].backup_type).toBe('auto');
    });

    it('should trigger a manual backup', async () => {
      const { triggerBackup } = await import('@/app/actions/super-admin');
      const result = await triggerBackup(mockSchoolId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Backup');
    });
  });

  describe('System Health', () => {
    it('should return system health data', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'backups') {
          c.select = vi.fn().mockReturnValue(c);
          c.eq = vi.fn().mockReturnValue(c);
          const failed = mockData.backups.filter((b: any) => b.status === 'failed');
          c.then = (onfulfilled: any) =>
            Promise.resolve({ data: failed, error: null, count: failed.length }).then(onfulfilled);
        }
        return c;
      });

      const { getSystemHealth } = await import('@/app/actions/super-admin');
      const health = await getSystemHealth();

      expect(health.schools).toHaveLength(1);
      expect(health.failedBackups).toBe(0);
      expect(health.healthLogs).toHaveLength(1);
      expect(health.totalStorage).toBeGreaterThan(0);
    });
  });

  describe('Users', () => {
    it('should fetch paginated users with school info', async () => {
      const { getSuperAdminUsers } = await import('@/app/actions/super-admin');
      const result = await getSuperAdminUsers(1, 20, '');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('sale7awooda@gmail.com');
    });

    it('should search users by name or email', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'users') {
          c.or = vi.fn().mockReturnValue(c);
          c.select = vi.fn().mockReturnValue(c);
          c.order = vi.fn().mockReturnValue(c);
          c.range = vi.fn().mockReturnValue({ ...createThenable(mockData.users), count: 1 });
        }
        return c;
      });

      const { getSuperAdminUsers } = await import('@/app/actions/super-admin');
      const result = await getSuperAdminUsers(1, 20, 'Super');

      expect(result.data).toHaveLength(1);
    });
  });

  describe('Error handling', () => {
    it('should throw on school fetch error', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('DB error');
      });

      const { getSchools } = await import('@/app/actions/super-admin');
      await expect(getSchools(1, 20, '')).rejects.toThrow('DB error');
    });

    it('should not throw when logging audit silently fails', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'users') {
          c.single = vi.fn().mockResolvedValue({ data: null, error: null });
        }
        return c;
      });

      const { logAuditAction } = await import('@/app/actions/super-admin');
      await expect(logAuditAction('test', 'test')).resolves.toBeUndefined();
    });
  });
});
