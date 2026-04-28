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
  studentId?: string;
  studentIds?: string[];
  phone?: string;
  staffProfile?: StaffProfile;
  customPermissions?: Record<string, string[]>;
}

export interface MedicalProfile {
  bloodGroup?: string;
  allergies: string[];
  conditions: string[];
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

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  author: string;
  authorName: string;
  authorRole: string;
  targetAudience: 'all' | 'parents' | 'staff' | 'students';
  isImportant: boolean;
}

export interface TimetablePeriod {
  id: string;
  dayOfWeek: number;
  period: number;
  classId: string;
  subject: string;
  teacherName: string;
  room: string;
  startTime: string;
  endTime: string;
  color?: string;
}

export interface FeeItem {
  id: string;
  description: string;
  amount: number;
  grade_levels?: string[];
  is_mandatory: boolean;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  items: { description: string; amount: number }[];
  term: string;
}

export interface AcademicEnrollment {
  id: string;
  studentId: string;
  academicYear: string;
  grade: string;
  status: 'Promoted' | 'Retained' | 'Graduated' | 'active' | 'completed';
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  academicYear?: string;
  rollNumber: string;
  roll_number?: string; // Supabase uses underscore
  email?: string;
  phone?: string;
  address?: string;
  dob?: string;
  medical?: MedicalProfile;
  gender?: string;
  fee_structure?: string;
  additional_info?: string;
  is_deleted?: boolean;
  deleted_reason?: string;
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

export interface Parent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  studentId?: string;
  studentIds?: string[];
  role: 'parent';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber?: string;
}

export interface BusStop {
  id: string;
  name: string;
  arrivalTime: string;
  coordinates?: { lat: number; lng: number };
  studentId?: string;
}

export interface BusRoute {
  id: string;
  route_number: string;
  bus_number: string;
  driver_id: string;
  driver_name?: string;
  driver_phone?: string;
  attendant_id?: string;
  attendant_name?: string;
  attendant_phone?: string;
  stops: BusStop[];
  status: 'Not Started' | 'In Transit' | 'Arrived at School' | 'Completed';
  current_location?: string;
  live_status?: string;
}
