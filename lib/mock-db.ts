export type Role = 'admin' | 'accountant' | 'staff' | 'teacher' | 'parent' | 'student';

export interface StaffProfile {
  department: string;
  designation: string;
  joinDate: string;
  qualifications: string[];
  subjects?: string[];
  email: string;
  phone: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  avatar?: string;
  studentId?: string; // Currently active student
  studentIds?: string[]; // All students belonging to this parent
  phone?: string;
  staffProfile?: StaffProfile;
  customPermissions?: Record<string, string[]>; // e.g., { 'transport': ['view', 'manage'] }
}

export interface MedicalProfile {
  allergies: string[];
  conditions: string[];
  bloodGroup: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
}

export interface BehaviorRecord {
  id: string;
  date: string;
  type: 'merit' | 'demerit';
  title: string;
  description: string;
  points: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  icon?: 'award' | 'alert' | 'calendar' | 'file';
}

export interface AcademicEnrollment {
  id: string;
  studentId: string;
  academicYear: string;
  grade: string;
  status: 'Promoted' | 'Retained' | 'Graduated';
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  academicYear?: string;
  rollNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  dob?: string;
  medical?: MedicalProfile;
  behavior?: {
    merits: number;
    demerits: number;
    records: BehaviorRecord[];
  };
  timeline?: TimelineEvent[];
  busRouteId?: string;
  stopId?: string;
  merits?: number;
  demerits?: number;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  authorRole: string;
  isImportant: boolean;
  targetAudience: 'all' | 'parents' | 'staff';
}

export interface Parent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  studentId?: string;
  studentIds?: string[];
  role: 'parent';
}

export interface TimetablePeriod {
  id: string;
  classId: string; // e.g., 'Grade 4'
  subject: string;
  teacherName: string;
  room: string;
  dayOfWeek: number; // 1 = Monday, 5 = Friday
  period: number; // 1 to 6
  startTime: string;
  endTime: string;
  color: string; // Tailwind color class for UI
}

export interface BusStop {
  id: string;
  name: string;
  arrivalTime: string; // e.g., "07:30 AM"
  coordinates?: { lat: number; lng: number }; // For map simulation
  studentId?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  photo?: string;
}

export interface BusRoute {
  id: string;
  route_number: string; // e.g., "R-101"
  bus_number: string; // e.g., "BUS-42"
  driver_id: string;
  attendant_id?: string; // ID of the staff member assigned
  attendant_name?: string;
  attendant_phone?: string;
  stops: BusStop[];
  status: 'Not Started' | 'In Transit' | 'Arrived at School' | 'Completed';
  current_location?: string; // Description or coordinates
  live_status?: string; // e.g., "Approaching Main St."
}

// Mock Database for the MVP - Now empty, use Seeding in Settings to populate
const isClient = typeof window !== 'undefined';

const getLocalData = (key: string, defaultVal: any) => {
  if (!isClient) return defaultVal;
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : defaultVal;
};

export const MOCK_USERS: User[] = getLocalData('MOCK_USERS', []);
export const MOCK_PARENTS: User[] = getLocalData('MOCK_PARENTS', []);
export const MOCK_DRIVERS: Driver[] = getLocalData('MOCK_DRIVERS', []);
export const MOCK_BUS_ROUTES: BusRoute[] = getLocalData('MOCK_BUS_ROUTES', []);
export const MOCK_STUDENTS: Student[] = getLocalData('MOCK_STUDENTS', []);
export const MOCK_SCHEDULE: TimetablePeriod[] = getLocalData('MOCK_SCHEDULE', []);
export const MOCK_NOTICES: Notice[] = getLocalData('MOCK_NOTICES', []);
export const MOCK_CHATS: any[] = getLocalData('MOCK_CHATS', []);
export const MOCK_MESSAGES: any[] = getLocalData('MOCK_MESSAGES', []);

// Mock Stats for Dashboard
export const MOCK_STATS = {
  totalStudents: MOCK_STUDENTS.length,
  attendanceToday: 0,
  feeCollected: 0,
  pendingFees: 0,
};
