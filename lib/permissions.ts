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
  | 'visitors' 
  | 'communication' 
  | 'transport' 
  | 'settings'
  | 'analytics'
  | 'attendance'
  | 'hr'
  | 'inventory'
  | 'fees';

// Define permissions matrix
const PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  admin: {
    all: ['view', 'create', 'edit', 'delete', 'manage'],
    users: ['view', 'create', 'edit', 'delete', 'manage'],
    students: ['view', 'create', 'edit', 'delete', 'manage'],
    staff: ['view', 'create', 'edit', 'delete', 'manage'],
    academics: ['view', 'create', 'edit', 'delete', 'manage'],
    schedule: ['view', 'create', 'edit', 'delete', 'manage'],
    exams: ['view', 'create', 'edit', 'delete', 'manage'],
    visitors: ['view', 'create', 'edit', 'delete', 'manage'],
    communication: ['view', 'create', 'edit', 'delete', 'manage'],
    transport: ['view', 'create', 'edit', 'delete', 'manage'],
    settings: ['view', 'create', 'edit', 'delete', 'manage'],
    analytics: ['view', 'create', 'edit', 'delete', 'manage'],
    attendance: ['view', 'create', 'edit', 'delete', 'manage'],
    hr: ['view', 'create', 'edit', 'delete', 'manage'],
    inventory: ['view', 'create', 'edit', 'delete', 'manage'],
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
    visitors: [],
    communication: ['view', 'create'],
    transport: ['view'],
    settings: ['view'],
    analytics: ['view'],
    attendance: ['view'],
    hr: ['view'],
    inventory: ['view'],
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
    visitors: ['view'],
    communication: ['view', 'create'],
    transport: [],
    settings: ['view'], // Personal settings
    analytics: [],
    attendance: ['view', 'create', 'edit'], // Teachers take attendance
    hr: ['view'],
    inventory: ['view'],
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
    visitors: ['view', 'create', 'edit', 'delete', 'manage'],
    communication: ['view'],
    transport: ['view', 'create', 'edit', 'delete', 'manage'], // Assuming driver role falls here
    settings: ['view'],
    analytics: [],
    attendance: ['view'],
    hr: ['view'],
    inventory: ['view', 'create', 'edit', 'delete', 'manage'],
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
    visitors: [],
    communication: ['view', 'create'],
    transport: ['view'],
    settings: ['view'],
    analytics: [],
    attendance: ['view'],
    hr: [],
    inventory: [],
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
    visitors: [],
    communication: ['view', 'create'],
    transport: ['view'],
    settings: ['view'],
    analytics: [],
    attendance: ['view'],
    hr: [],
    inventory: [],
    fees: [],
  }
};

export function usePermissions() {
  const { user } = useAuth();

  const can = (action: Action, resource: Resource): boolean => {
    if (!user) return false;
    
    // Check custom permissions first
    if (user.customPermissions && user.customPermissions[resource]) {
      if (user.customPermissions[resource].includes(action) || user.customPermissions[resource].includes('manage')) {
        return true;
      }
    }

    // Try to get permissions from localStorage (overrides)
    let rolePermissions = PERMISSIONS[user.role];
    
    if (typeof window !== 'undefined') {
      const savedPermissions = localStorage.getItem('ROLE_PERMISSIONS');
      if (savedPermissions) {
        try {
          const parsed = JSON.parse(savedPermissions);
          if (parsed[user.role]) {
            // Map the array of module IDs to the Action[] format
            const allowedModules = parsed[user.role];
            const actions: Action[] = [];
            if (Array.isArray(allowedModules)) {
              if (allowedModules.includes(resource)) {
                actions.push('view', 'create', 'edit', 'delete', 'manage');
              }
            } else {
              // Fallback to default if not in matrix
              return rolePermissions[resource]?.includes(action) || rolePermissions[resource]?.includes('manage') || false;
            }
            
            return actions.includes(action) || actions.includes('manage');
          }
        } catch (e) {
          console.error("Error parsing role permissions", e);
        }
      }
    }

    if (!rolePermissions) return false;

    // Admin can do everything
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
    return isRole(['admin']);
  };

  return { can, isRole, isAdmin, user };
}
