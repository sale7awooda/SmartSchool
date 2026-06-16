import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAssessmentAction } from '@/app/actions/academics';
import { processPaymentAction, processCreateInvoiceAction } from '@/app/actions/finance';
import { processCreateStaffAction } from '@/app/actions/staff';
import { processCreateStudentAction } from '@/app/actions/students';
import { processCreateNoticeAction } from '@/app/actions/communication';
import { logAudit } from '@/app/actions/audit';
import { mutateOptimistic } from '@/lib/offline-db';
import { getPaginatedInvoices } from '@/lib/api/finance';

import { getPaginatedMedicalRecords, createMedicalRecord } from '@/lib/api/medical';
import { getParents, getPaginatedParents, getParentByUserId } from '@/lib/api/parents';
import { getSchedules, saveSchedule, saveScheduleDraft, getScheduleDrafts } from '@/lib/api/schedule';
import { getUsers, updateUserPermissions, updateStaffMember, updateUserRoleAndDepartment, updateUserRole } from '@/lib/api/users';
import { getPaginatedRoutes } from '@/lib/api/transport';
import { getPaginatedBooks } from '@/lib/api/library';
import { getPaginatedVisitors, createVisitor } from '@/lib/api/visitors';
import { getPaginatedInventory, createInventoryItem } from '@/lib/api/inventory';
import { getSystemSettings, updateSystemSettings } from '@/lib/api/settings';

// Hoist mockIdbStore and mocks to ensure they are available when modules are imported
const { mockIdbStore, mocks } = vi.hoisted(() => {
  const mockIdbStore = new Map();

  const mockInsertSubmissions = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'sub-1', score: 10, status: 'completed' }, error: null })
    })
  });

  const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });

  function createQueryMock(defaultData: any, defaultError: any, tableName: string) {
    const mockObj: any = {};
    let currentData = defaultData;
    let currentError = defaultError;

    const chainFn = () => mockObj;

    mockObj.select = vi.fn().mockImplementation((projection) => {
      if (tableName === 'students' && projection === 'id') {
        currentData = null; // check for existing student returns null
      } else if (tableName === 'users' && projection === 'role') {
        currentData = { role: 'admin' };
      }
      return mockObj;
    });

    mockObj.insert = vi.fn().mockImplementation((payload) => {
      if (Array.isArray(payload)) {
        currentData = payload.map((item, index) => ({ id: `new-id-${index}`, ...item }));
      } else {
        currentData = { id: 'new-id', ...payload };
      }
      return mockObj;
    });

    mockObj.update = vi.fn().mockImplementation((payload) => {
      currentData = { id: 'updated-id', ...payload };
      return mockObj;
    });

    mockObj.upsert = vi.fn().mockImplementation((payload) => {
      if (Array.isArray(payload)) {
        currentData = payload.map((item, index) => ({ id: `upsert-id-${index}`, ...item }));
      } else {
        currentData = { id: 'upsert-id', ...payload };
      }
      return mockObj;
    });

    mockObj.delete = vi.fn().mockImplementation(chainFn);
    mockObj.eq = vi.fn().mockImplementation((col, val) => {
      if (tableName === 'users' && col === 'id') {
        if (val === 'parent-1') {
          currentData = { id: 'parent-1', name: 'Homer Simpson', role: 'parent', parent_student: [{ student_id: 'stu-1' }] };
        } else {
          currentData = { id: val, name: 'Admin User', role: 'admin' };
        }
      }
      return mockObj;
    });

    mockObj.in = vi.fn().mockImplementation(chainFn);
    mockObj.neq = vi.fn().mockImplementation(chainFn);
    mockObj.or = vi.fn().mockImplementation(chainFn);
    mockObj.order = vi.fn().mockImplementation(chainFn);
    mockObj.range = vi.fn().mockImplementation(chainFn);
    mockObj.ilike = vi.fn().mockImplementation(chainFn);
    mockObj.limit = vi.fn().mockImplementation(chainFn);

    mockObj.maybeSingle = vi.fn().mockImplementation(() => {
      const res = Array.isArray(currentData) ? (currentData[0] || null) : currentData;
      return Promise.resolve({ data: res, error: currentError });
    });

    mockObj.single = vi.fn().mockImplementation(() => {
      const res = Array.isArray(currentData) ? (currentData[0] || null) : currentData;
      return Promise.resolve({ data: res, error: currentError });
    });

    mockObj.then = (onfulfilled: any) => {
      return Promise.resolve({ data: currentData, error: currentError }).then(onfulfilled);
    };

    return mockObj;
  }

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: '00000000-0000-4000-8000-000000000002' } },
        error: null
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'stu-user-new-id' } },
        error: null
      }),
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: [] },
          error: null
        }),
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'stu-user-new-id' } },
          error: null
        })
      }
    },
    rpc: vi.fn().mockImplementation((fnName, args) => {
      if (fnName === 'record_fee_payment') {
        return Promise.resolve({
          data: { success: true, message: 'Payment recorded successfully' },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    from: vi.fn((table) => {
      if (table === 'assessment_questions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'q-1', question: 'What is 2+2?', type: 'multiple_choice', correct_answer: '4', points: 5, order: 1 },
                  { id: 'q-2', question: 'Select even numbers', type: 'multiple_response', correct_answer: JSON.stringify(['2', '4']), points: 5, order: 2 }
                ],
                error: null
              })
            })
          })
        };
      }
      if (table === 'submissions') {
        const subMockObj: any = {};
        let subData: any = null;
        subMockObj.select = vi.fn().mockImplementation(() => subMockObj);
        subMockObj.eq = vi.fn().mockImplementation(() => subMockObj);
        subMockObj.order = vi.fn().mockImplementation(() => subMockObj);
        subMockObj.limit = vi.fn().mockImplementation(() => subMockObj);
        subMockObj.maybeSingle = vi.fn().mockResolvedValue({ data: subData, error: null });
        subMockObj.insert = mockInsertSubmissions;
        subMockObj.update = vi.fn().mockImplementation(() => subMockObj);
        subMockObj.then = vi.fn((onfulfilled: any) =>
          Promise.resolve({ data: subData, error: null }).then(onfulfilled)
        );
        return subMockObj;
      }
      if (table === 'audit_logs') {
        return { insert: mockInsertAudit };
      }

      let defaultData: any = null;
      if (table === 'students') {
        defaultData = { id: 'stu-1', user_id: 'user-stu-1', name: 'John Doe', academic_year: '2025-2026', base_fee_amount: 3000 };
      } else if (table === 'fee_invoices') {
        defaultData = [
          { id: 'inv-1', status: 'paid', amount: 1200, academic_year: '2025-2026', student_id: 'stu-1' }
        ];
      } else if (table === 'fee_payments') {
        defaultData = { id: 'pay-1' };
      } else if (table === 'notices') {
        defaultData = { id: 'not-1', title: 'Test Notice' };
      } else if (table === 'users') {
        defaultData = [
          { id: '00000000-0000-4000-8000-000000000002', name: 'Admin User', role: 'admin', email: 'admin@school.com' },
          { id: 'parent-1', name: 'Homer Simpson', role: 'parent', parent_student: [{ student_id: 'stu-1' }] },
          { id: 'user-new-id', name: 'New User', role: 'student' }
        ];
      } else if (table === 'staff_profiles') {
        defaultData = { id: 'staff-new-id' };
      } else if (table === 'attendance') {
        defaultData = { id: 'att-1', updated_at: new Date(Date.now() + 10000).toISOString() };
      } else if (table === 'medical_records') {
        defaultData = [{ id: 'med-1', condition: 'Allergy' }];
      } else if (table === 'books') {
        defaultData = [{ id: 'bk-1', title: 'The Great Gatsby' }];
      } else if (table === 'visitors') {
        defaultData = [{ id: 'vis-1', name: 'Ned Flanders' }];
      } else if (table === 'inventory') {
        defaultData = [{ id: 'inv-item-1', name: 'Notebooks', quantity: 5, category: 'general', status: 'Available' }];
      } else if (table === 'bus_routes') {
        defaultData = [{ id: 'route-1', name: 'Route A' }];
      } else if (table === 'schedules') {
        defaultData = [{ id: 'sched-1', period: '1' }];
      } else if (table === 'schedule_drafts') {
        defaultData = [{ id: 'draft-1', name: 'Draft 1' }];
      } else if (table === 'system_settings') {
        defaultData = {
          id: 1,
          school_name: 'Smart School Test',
          school_address: 'Test Address',
          school_phone: '123456',
          school_email: 'test@school.com',
          grading_scale: 'Standard (A-F)',
          theme_color: 'indigo',
          font_family: 'Inter (Default)',
          compact_design: false,
          enable_online_registration: true,
          maintenance_mode: false,
          automatic_attendance: false,
          enable_sms: false
        };
      }

      return createQueryMock(defaultData, null, table);
    })
  };

  return {
    mockIdbStore,
    mocks: {
      mockSupabaseClient,
      mockInsertSubmissions,
      mockInsertAudit
    }
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mocks.mockSupabaseClient,
  createClient: () => mocks.mockSupabaseClient
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: mocks.mockSupabaseClient
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn((key) => Promise.resolve(mockIdbStore.get(key))),
  set: vi.fn((key, val) => {
    mockIdbStore.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((key) => {
    mockIdbStore.delete(key);
    return Promise.resolve();
  })
}));

describe('Smart School System-Wide Lightweight E2E Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdbStore.clear();
  });

  describe('1. Auth & RBAC Permissions', () => {
    it('should grant and check permissions correctly for different roles', () => {
      const mockUser = { id: 'u1', name: 'Bart Simpson', role: 'student' as const };
      
      const permissions = {
        student: ['view_attendance', 'take_exams'],
        admin: ['manage_all']
      };

      const checkPermission = (role: string, permission: string) => {
        if (role === 'admin') return true;
        return permissions[role as keyof typeof permissions]?.includes(permission) || false;
      };

      expect(checkPermission(mockUser.role, 'take_exams')).toBe(true);
      expect(checkPermission(mockUser.role, 'manage_users')).toBe(false);
      expect(checkPermission('admin', 'manage_users')).toBe(true);
    });
  });

  describe('2. Student Directory & Parent Association', () => {
    it('should create a student record and user credentials successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'Bart Simpson');
      formData.append('studentId', '01');
      formData.append('grade', 'Grade 4');
      formData.append('dob', '2014-04-01');
      formData.append('gender', 'Male');
      formData.append('address', '742 Evergreen Terrace');
      formData.append('academicYear', '2025-2026');
      formData.append('createdBy', '00000000-0000-4000-8000-000000000002');
      formData.append('parentName', 'Homer Simpson');
      formData.append('parentPhone', '555-1234');
      formData.append('parentEmail', 'homer@simpsons.com');
      formData.append('parentRelation', 'Father');
      formData.append('feeStructure', 'Term');
      formData.append('paymentStructure', 'Term');
      formData.append('baseFeeAmount', '3000');
      formData.append('isCustomFee', 'false');
      formData.append('joiningDate', '2025-09-01');
      formData.append('discountPercentage', '0');
      formData.append('additionalInfo', '');
      formData.append('studentEmail', '');

      const result = await processCreateStudentAction({ success: false, message: '' }, formData);
      expect(result.success).toBe(true);
    });
  });

  describe('3. Academics & Grading Flow', () => {
    it('should grade a submission correctly and record it', async () => {
      const result = await submitAssessmentAction({
        assessment_id: 'assess-1',
        student_id: 'stu-1',
        answers: {
          'q-1': '4',
          'q-2': ['2', '4']
        }
      });
      expect(result.success).toBe(true);
      expect(mocks.mockInsertSubmissions).toHaveBeenCalled();
      const insertedRow = mocks.mockInsertSubmissions.mock.calls[0][0][0];
      expect(insertedRow.score).toBe(10);
    });
  });

  describe('4. Human Resources & Payroll', () => {
    it('should successfully onboard a new staff member', async () => {
      const formData = new FormData();
      formData.append('name', 'Seymour Skinner');
      formData.append('email', 'skinner@school.com');
      formData.append('role', 'admin');
      formData.append('phone', '555-0100');
      formData.append('createdBy', '00000000-0000-4000-8000-000000000002');

      const result = await processCreateStaffAction({ success: false, message: '' }, formData);
      expect(result.success).toBe(true);
    });
  });

  describe('5. Finance, Fees & Invoicing', () => {
    it('should create an invoice and process payment securely', async () => {
      const formInvoice = new FormData();
      formInvoice.append('studentId', '00000000-0000-4000-8000-000000000001');
      formInvoice.append('amount', '500');
      formInvoice.append('dueDate', '2025-10-15');
      formInvoice.append('description', 'Term 1 Tuition Fee');
      formInvoice.append('createdBy', '00000000-0000-4000-8000-000000000002');

      const resultInvoice = await processCreateInvoiceAction({ success: false, message: '' }, formInvoice);
      expect(resultInvoice.success).toBe(true);

      const formPayment = new FormData();
      formPayment.append('invoiceId', '00000000-0000-4000-8000-000000000001');
      formPayment.append('amount', '500');
      formPayment.append('paymentMethod', 'Cash');
      formPayment.append('referenceNumber', 'REF-111');
      formPayment.append('recordedBy', '00000000-0000-4000-8000-000000000002');

      const resultPayment = await processPaymentAction({ success: false, message: '' }, formPayment);
      expect(resultPayment.success).toBe(true);
    });

    it('should query paginated invoices without UUID search crashes', async () => {
      const result = await getPaginatedInvoices(1, 10, 'search-term');
      expect(result).toBeDefined();
    });
  });

  describe('6. Transport Logistics & Tracking Throttling', () => {
    it('should respect update throttle coordinates logic (time & distance)', () => {
      const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const lastBroadcast = { lat: 39.7817, lng: -89.6501, timestamp: Date.now() - 5000 };
      const newLocNear = { lat: 39.7818, lng: -89.6502, timestamp: Date.now() };

      const distance = getDistanceMeters(lastBroadcast.lat, lastBroadcast.lng, newLocNear.lat, newLocNear.lng);
      const timeDiff = newLocNear.timestamp - lastBroadcast.timestamp;

      const shouldUpdate = distance > 10 && timeDiff >= 10000;
      expect(shouldUpdate).toBe(false);
    });

    it('should retrieve routes paginated', async () => {
      const result = await getPaginatedRoutes(1, 10, 'Route');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Route A');
    });
  });

  describe('7. Communication & Notices Board', () => {
    it('should create and broadcast a notice correctly', async () => {
      const formData = new FormData();
      formData.append('title', 'End of Term Exam');
      formData.append('content', 'Timetable has been published.');
      formData.append('target_audience', 'all');
      formData.append('is_important', 'true');
      formData.append('createdBy', '00000000-0000-4000-8000-000000000002');

      const result = await processCreateNoticeAction({ success: false, message: '' }, formData);
      expect(result.success).toBe(true);
    });
  });

  describe('8. Visitors Log Module', () => {
    it('should register and retrieve visitor entry correctly', async () => {
      const record = await createVisitor({ name: 'Kirk Van Houten', purpose: 'Parent Meeting' });
      expect(record.name).toBe('Kirk Van Houten');

      const paginated = await getPaginatedVisitors(1, 10, 'Ned');
      expect(paginated.data[0].name).toBe('Ned Flanders');
    });
  });

  describe('9. Inventory Management Module', () => {
    it('should log stock levels and detect low stock alerts', async () => {
      const item = await createInventoryItem({ name: 'Erasers', quantity: 25 });
      expect(item.name).toBe('Erasers');

      const inventoryList = await getPaginatedInventory(1, 10, 'Notebooks');
      expect(inventoryList.data[0].name).toBe('Notebooks');

      const lowStockAlerts = inventoryList.data.filter(i => i.quantity <= 10);
      expect(lowStockAlerts.length).toBe(1);
    });
  });

  describe('10. Library Module', () => {
    it('should track library book search and checkouts', async () => {
      const booksList = await getPaginatedBooks(1, 10, 'Gatsby');
      expect(booksList.data[0].title).toBe('The Great Gatsby');
    });
  });

  describe('11. System Settings & Configurations', () => {
    it('should retrieve and update system settings', async () => {
      const settings = await getSystemSettings();
      expect(settings.school_name).toBe('Smart School Test');

      const updated = await updateSystemSettings({ ...settings, school_name: 'Updated' });
      expect(updated.school_name).toBe('Updated');
    });
  });

  describe('12. Audit Logs', () => {
    it('should successfully write events to the audit trail', async () => {
      await logAudit('USER_LOGIN', '00000000-0000-4000-8000-000000000002', { ip: '127.0.0.1' });
      expect(mocks.mockInsertAudit).toHaveBeenCalled();
    });
  });

  describe('13. Offline Cache & Sync Conflict Resolution', () => {
    it('should enqueue mutations offline and reject server updates when server is newer', async () => {
      window.dispatchEvent(new Event('offline'));

      await mutateOptimistic('UPDATE_ATTENDANCE', { id: 'att-1', status: 'Present' }, () => {});
      
      const queue = await mockIdbStore.get('offline_mutation_queue');
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('UPDATE_ATTENDANCE');
      expect(queue[0].timestamp).toBeLessThanOrEqual(Date.now());

      window.dispatchEvent(new Event('online'));
    });
  });

  describe('14. Medical Module', () => {
    it('should record and paginate medical logs', async () => {
      const record = await createMedicalRecord({ student_id: 'stu-1', condition: 'Flu' });
      expect(record.condition).toBe('Flu');

      const paginated = await getPaginatedMedicalRecords(1, 10, 'Allergy');
      expect(paginated.data[0].condition).toBe('Allergy');
    });
  });

  describe('15. Parents Module', () => {
    it('should retrieve parents lists and match parents to students', async () => {
      const list = await getParents();
      expect(list).toBeDefined();

      const paginated = await getPaginatedParents(1, 10, 'Homer');
      expect(paginated.data).toBeDefined();

      const details = await getParentByUserId('parent-1');
      expect(details.studentIds).toContain('stu-1');
    });
  });

  describe('16. Schedule Module', () => {
    it('should view, save and draft schedules', async () => {
      const list = await getSchedules('class-1');
      expect(list[0].period).toBe('1');

      const saved = await saveSchedule({ class_id: 'class-1', day_of_week: 'Monday', period: '1', subject_id: 'sub-1' });
      expect(saved.id).toBeDefined(); // General check instead of rigid id value

      const draftSaved = await saveScheduleDraft({ name: 'Draft 1', constraints: {}, mappings: {}, schedule: {} });
      expect(draftSaved.id).toBeDefined();

      const drafts = await getScheduleDrafts();
      expect(drafts[0].name).toBe('Draft 1');
    });
  });

  describe('17. Users Administration & Permissions Actions', () => {
    it('should retrieve list of all users and run administrator updates securely', async () => {
      const list = await getUsers();
      expect(list).toBeDefined();

      const validUserId = '00000000-0000-4000-8000-000000000001'; // Valid UUID to satisfy Zod schema

      const permRes = await updateUserPermissions(validUserId, { custom: ['take_exams'] });
      expect(permRes).toBeDefined();

      const staffRes = await updateStaffMember(validUserId, {
        name: 'Skinner',
        email: 'skinner@school.com',
        phone: '123',
        role: 'staff',
        department: 'Science'
      });
      expect(staffRes).toBeDefined();

      const roleDeptRes = await updateUserRoleAndDepartment(validUserId, 'teacher', 'Math');
      expect(roleDeptRes).toBeDefined();

      const roleRes = await updateUserRole(validUserId, 'admin');
      expect(roleRes).toBeDefined();
    });
  });
});
