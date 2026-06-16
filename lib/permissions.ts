import { useAuth } from './auth-context';
import { useSettings } from './settings-context';
import { Role, Action, Resource } from '@/types';

// Define default permissions matrix
const DEFAULT_PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  admin: {
    all: ['view', 'create', 'edit', 'delete', 'manage'],
    users: ['view', 'create', 'edit', 'delete', 'manage'],
    students: ['view', 'create', 'edit', 'delete', 'manage'],
    staff: ['view', 'create', 'edit', 'delete', 'manage'],
    academics: ['view', 'create', 'edit', 'delete', 'manage'],
    schedule: ['view', 'create', 'edit', 'delete', 'manage'],
    assessments: ['view', 'create', 'edit', 'delete', 'manage'],
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
    assessments: [],
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
    students: ['view', 'edit'], 
    staff: ['view'],
    academics: ['view', 'edit'],
    schedule: ['view'],
    assessments: ['view', 'create', 'edit', 'delete'],
    visitors: ['view'],
    communication: ['view', 'create'],
    transport: [],
    settings: ['view'],
    analytics: [],
    attendance: ['view', 'create', 'edit'],
    hr: ['view'],
    inventory: ['view'],
    fees: [],
  },
  staff: {
    all: [],
    users: ['view'],
    students: ['view'],
    staff: ['view'],
    academics: [],
    schedule: ['view'],
    assessments: [],
    visitors: ['view', 'create', 'edit', 'delete', 'manage'],
    communication: ['view'],
    transport: ['view', 'create', 'edit', 'delete', 'manage'],
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
    students: ['view'],
    staff: ['view'],
    academics: ['view'],
    schedule: ['view'],
    assessments: ['view'],
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
    students: ['view'],
    staff: ['view'],
    academics: ['view'],
    schedule: ['view'],
    assessments: ['view', 'edit'],
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
  const { settings } = useSettings();

  const can = (action: Action, resource: Resource): boolean => {
    if (!user) return false;
    
    // Check custom permissions first (defined on user object)
    if (user.customPermissions && user.customPermissions[resource]) {
      if (user.customPermissions[resource].includes(action) || user.customPermissions[resource].includes('manage')) {
        return true;
      }
    }

    // Role-based permissions from settings or defaults
    const permissionsFromSettings = (settings as any)?.role_permissions;
    const roleId = user.role as string;

    // If we have custom role permissions in settings for this role
    if (permissionsFromSettings && permissionsFromSettings[roleId]) {
        const allowedModules = permissionsFromSettings[roleId] as string[];
        
        // Special case for 'exams' vs 'assessments'
        const resourceId = resource === 'assessments' ? 'exams' : resource as string;

        if (allowedModules.includes(resourceId) || allowedModules.includes('all')) {
            // If the module is allowed, for non-admins we still respect the DEFAULT actions
            // but we could also make actions dynamic later.
            const defaultActionsForRole = DEFAULT_PERMISSIONS[user.role]?.[resource] || [];
            return defaultActionsForRole.includes(action) || defaultActionsForRole.includes('manage') || user.role === 'admin';
        }
        
        // If not explicitly allowed in settings for this role, then denied (customizable mode)
        return false;
    }

    // Fallback to coded defaults if no settings exist
    const rolePermissions = DEFAULT_PERMISSIONS[user.role];
    if (!rolePermissions) return false;

    // Admin can do everything by default
    if (user.role === 'admin') return true;

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
