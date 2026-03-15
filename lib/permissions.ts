import { useAuth } from './auth-context';
import { Role } from './mock-db';

type Action = 'view' | 'create' | 'edit' | 'delete' | 'manage';
type Resource = 
  | 'all'
  | 'users' 
  | 'students' 
  | 'staff' 
  | 'academics' 
  | 'schedule' 
  | 'exams' 
  | 'library' 
  | 'communication' 
  | 'transport' 
  | 'settings'
  | 'analytics'
  | 'attendance'
  | 'hr'
  | 'operations'
  | 'fees';

// Define permissions matrix
const PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  superadmin: {
    all: ['view', 'create', 'edit', 'delete', 'manage'],
    users: ['view', 'create', 'edit', 'delete', 'manage'],
    students: ['view', 'create', 'edit', 'delete', 'manage'],
    staff: ['view', 'create', 'edit', 'delete', 'manage'],
    academics: ['view', 'create', 'edit', 'delete', 'manage'],
    schedule: ['view', 'create', 'edit', 'delete', 'manage'],
    exams: ['view', 'create', 'edit', 'delete', 'manage'],
    library: ['view', 'create', 'edit', 'delete', 'manage'],
    communication: ['view', 'create', 'edit', 'delete', 'manage'],
    transport: ['view', 'create', 'edit', 'delete', 'manage'],
    settings: ['view', 'create', 'edit', 'delete', 'manage'],
    analytics: ['view', 'create', 'edit', 'delete', 'manage'],
    attendance: ['view', 'create', 'edit', 'delete', 'manage'],
    hr: ['view', 'create', 'edit', 'delete', 'manage'],
    operations: ['view', 'create', 'edit', 'delete', 'manage'],
    fees: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  schoolAdmin: {
    all: ['view', 'create', 'edit', 'delete', 'manage'],
    users: ['view', 'create', 'edit', 'delete', 'manage'],
    students: ['view', 'create', 'edit', 'delete', 'manage'],
    staff: ['view', 'create', 'edit', 'delete', 'manage'],
    academics: ['view', 'create', 'edit', 'delete', 'manage'],
    schedule: ['view', 'create', 'edit', 'delete', 'manage'],
    exams: ['view', 'create', 'edit', 'delete', 'manage'],
    library: ['view', 'create', 'edit', 'delete', 'manage'],
    communication: ['view', 'create', 'edit', 'delete', 'manage'],
    transport: ['view', 'create', 'edit', 'delete', 'manage'],
    settings: ['view', 'create', 'edit', 'delete', 'manage'],
    analytics: ['view', 'create', 'edit', 'delete', 'manage'],
    attendance: ['view', 'create', 'edit', 'delete', 'manage'],
    hr: ['view', 'create', 'edit', 'delete', 'manage'],
    operations: ['view', 'create', 'edit', 'delete', 'manage'],
    fees: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  accountant: {
    all: [],
    users: ['view'],
    students: ['view'],
    staff: ['view'],
    academics: ['view'],
    schedule: ['view'],
    exams: [],
    library: [],
    communication: ['view', 'create'],
    transport: ['view'],
    settings: ['view'],
    analytics: ['view'],
    attendance: ['view'],
    hr: ['view'],
    operations: ['view'],
    fees: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  teacher: {
    all: [],
    users: ['view'],
    students: ['view', 'edit'], // Edit own students
    staff: ['view'],
    academics: ['view', 'edit'], // Edit grades
    schedule: ['view'],
    exams: ['view', 'create', 'edit', 'delete'], // Manage own exams
    library: ['view'],
    communication: ['view', 'create'],
    transport: [],
    settings: ['view'], // Personal settings
    analytics: [],
    attendance: ['view', 'create', 'edit'], // Teachers take attendance
    hr: ['view'],
    operations: ['view'],
    fees: [],
  },
  staff: { // Generic staff (e.g. librarian, driver)
    all: [],
    users: ['view'],
    students: ['view'],
    staff: ['view'],
    academics: [],
    schedule: ['view'],
    exams: [],
    library: ['view', 'create', 'edit', 'delete', 'manage'], // Assuming librarian role falls here for now, or we restrict by department
    communication: ['view'],
    transport: ['view', 'create', 'edit', 'delete', 'manage'], // Assuming driver role falls here
    settings: ['view'],
    analytics: [],
    attendance: ['view'],
    hr: ['view'],
    operations: ['view', 'create', 'edit', 'delete', 'manage'],
    fees: [],
  },
  parent: {
    all: [],
    users: [],
    students: ['view'], // View own children
    staff: ['view'],
    academics: ['view'], // View own children's grades
    schedule: ['view'], // View own children's schedule
    exams: ['view'], // View own children's exams
    library: ['view'], // View own children's library books
    communication: ['view', 'create'],
    transport: ['view'],
    settings: ['view'],
    analytics: [],
    attendance: ['view'],
    hr: [],
    operations: [],
    fees: ['view'],
  },
  student: {
    all: [],
    users: [],
    students: ['view'], // View self
    staff: ['view'], // View teachers
    academics: ['view'], // View own grades
    schedule: ['view'], // View own schedule
    exams: ['view', 'edit'], // View exams, take exams (edit)
    library: ['view'], // View own library books
    communication: ['view', 'create'],
    transport: ['view'],
    settings: ['view'],
    analytics: [],
    attendance: ['view'],
    hr: [],
    operations: [],
    fees: [],
  }
};

export function usePermissions() {
  const { user } = useAuth();

  const can = (action: Action, resource: Resource): boolean => {
    if (!user) return false;
    
    const rolePermissions = PERMISSIONS[user.role];
    if (!rolePermissions) return false;

    // Superadmin and schoolAdmin can do everything
    if (rolePermissions.all?.includes('manage')) return true;

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action) || resourcePermissions.includes('manage');
  };

  const isRole = (roles: Role | Role[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const isAdmin = (): boolean => {
    return isRole(['superadmin', 'schoolAdmin']);
  };

  return { can, isRole, isAdmin, user };
}
