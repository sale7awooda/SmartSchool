export type Role = 'superadmin' | 'schoolAdmin' | 'accountant' | 'teacher' | 'staff' | 'parent' | 'student';

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

export interface Student {
  id: string;
  name: string;
  grade: string;
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

export const MOCK_NOTICES: Notice[] = [
  { id: 'NOT-001', title: 'End of Term Examinations Schedule', content: 'Please be advised that the end of term examinations will commence on November 15th. The detailed timetable has been emailed to all parents and students. Ensure students arrive 15 minutes early on exam days.', date: '2023-10-24T09:00:00Z', author: 'Principal Skinner', authorRole: 'School Admin', isImportant: true, targetAudience: 'all' },
  { id: 'NOT-002', title: 'Staff Meeting - Friday', content: 'There will be a mandatory staff meeting this Friday at 3:30 PM in the main hall to discuss the upcoming science fair logistics.', date: '2023-10-23T14:30:00Z', author: 'Principal Skinner', authorRole: 'School Admin', isImportant: false, targetAudience: 'staff' },
  { id: 'NOT-003', title: 'Fee Payment Reminder', content: 'A gentle reminder that Term 1 tuition fees are due by November 1st. Please check your dashboard for pending invoices. Late payments may incur a penalty.', date: '2023-10-20T10:15:00Z', author: 'Angela Martin', authorRole: 'Accountant', isImportant: true, targetAudience: 'parents' },
  { id: 'NOT-004', title: 'School Closed for Public Holiday', content: 'The school will remain closed on Monday, October 30th in observance of the national holiday. Classes will resume on Tuesday.', date: '2023-10-18T08:00:00Z', author: 'System Owner', authorRole: 'Super Admin', isImportant: false, targetAudience: 'all' }
];

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
  routeNumber: string; // e.g., "R-101"
  busNumber: string; // e.g., "BUS-42"
  driverId: string;
  attendantId?: string; // ID of the staff member assigned
  attendantName?: string;
  attendantPhone?: string;
  stops: BusStop[];
  status: 'Not Started' | 'In Transit' | 'Arrived at School' | 'Completed';
  currentLocation?: string; // Description or coordinates
  liveStatus?: string; // e.g., "Approaching Main St."
}

// Mock Database for the MVP
export const MOCK_USERS: User[] = [
  { id: '1', name: 'System Owner', email: 'super@school.com', role: 'superadmin' },
  { 
    id: '2', 
    name: 'Principal Skinner', 
    email: 'admin@school.com', 
    role: 'schoolAdmin',
    staffProfile: {
      department: 'Administration',
      designation: 'Principal',
      joinDate: '1990-09-01',
      qualifications: ['M.Ed. Educational Leadership', 'B.A. History'],
      email: 'admin@school.com',
      phone: '555-0100'
    }
  },
  { 
    id: '3', 
    name: 'Angela Martin', 
    email: 'accountant@school.com', 
    role: 'accountant',
    staffProfile: {
      department: 'Finance',
      designation: 'Senior Accountant',
      joinDate: '2015-03-15',
      qualifications: ['CPA', 'B.S. Accounting'],
      email: 'accountant@school.com',
      phone: '555-0101'
    }
  },
  { 
    id: '4', 
    name: 'Edna Krabappel', 
    email: 'teacher@school.com', 
    role: 'teacher',
    staffProfile: {
      department: 'Elementary Education',
      designation: 'Grade 4 Teacher',
      joinDate: '1998-08-20',
      qualifications: ['B.Ed. Elementary Education', 'M.A. Curriculum Development'],
      subjects: ['Mathematics', 'English', 'Social Studies'],
      email: 'teacher@school.com',
      phone: '555-0102'
    }
  },
  { 
    id: '5', 
    name: 'Willie MacDougal', 
    email: 'staff@school.com', 
    role: 'staff',
    staffProfile: {
      department: 'Facilities',
      designation: 'Head Groundskeeper',
      joinDate: '1995-05-01',
      qualifications: ['Certified Landscaper', 'Boiler Maintenance Specialist'],
      email: 'staff@school.com',
      phone: '555-0103'
    }
  },
  { id: '6', name: 'Bart Simpson', email: 'student@school.com', role: 'student', studentId: 'STU001' },
  { id: '7', name: 'Otto Mann', email: 'driver@school.com', role: 'staff', phone: '555-0999', staffProfile: { department: 'Transport', designation: 'Bus Driver', joinDate: '2000-01-01', qualifications: ['CDL'], email: 'driver@school.com', phone: '555-0999' } },
];

export const MOCK_PARENTS: User[] = [
  { id: 'p1', name: 'Homer Simpson', studentId: 'STU001', studentIds: ['STU001', 'STU002'], phone: '555-0123', role: 'parent', email: 'homer@simpson.com' },
  { id: 'p2', name: 'Marge Simpson', studentId: 'STU002', studentIds: ['STU002'], phone: '555-0124', role: 'parent', email: 'marge@simpson.com' },
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Otto Mann', phone: '555-0999', licenseNumber: 'DL-SPRING-001' },
];

export const MOCK_BUS_ROUTES: BusRoute[] = [
  {
    id: 'route1',
    routeNumber: 'R-01',
    busNumber: 'BUS-66',
    driverId: 'd1',
    attendantId: '5', // Willie MacDougal
    attendantName: 'Groundskeeper Willie',
    attendantPhone: '555-0103',
    status: 'In Transit',
    currentLocation: 'Evergreen Terrace',
    liveStatus: 'Approaching 742 Evergreen Terrace',
    stops: [
      { id: 's1', name: 'Evergreen Terrace', arrivalTime: '07:30 AM' },
      { id: 's2', name: 'Kwik-E-Mart', arrivalTime: '07:45 AM' },
      { id: 's3', name: 'Springfield Elementary', arrivalTime: '08:00 AM' },
    ]
  }
];

export const MOCK_STUDENTS: Student[] = [
  { 
    id: 'STU001', 
    name: 'Bart Simpson', 
    grade: 'Grade 4', 
    rollNumber: '01',
    email: 'bart@student.school.com',
    dob: '2014-04-01',
    address: '742 Evergreen Terrace, Springfield',
    busRouteId: 'route1',
    stopId: 's1',
    medical: {
      allergies: ['Shrimp', 'Butterscotch'],
      conditions: ['ADHD'],
      bloodGroup: 'O-',
      emergencyContact: {
        name: 'Homer Simpson',
        relation: 'Father',
        phone: '555-0123'
      }
    },
    behavior: {
      merits: 5,
      demerits: 12,
      records: [
        { id: 'b1', date: '2023-10-25', type: 'demerit', title: 'Disruption', description: 'Skateboarding in the hallway.', points: 2 },
        { id: 'b2', date: '2023-10-20', type: 'merit', title: 'Helping Hand', description: 'Helped clean up the art room.', points: 5 },
        { id: 'b3', date: '2023-10-15', type: 'demerit', title: 'Prank', description: 'Put a frog in Mrs. Krabappel\'s desk.', points: 5 },
        { id: 'b4', date: '2023-10-05', type: 'demerit', title: 'Homework', description: 'Forgot homework for the 3rd time.', points: 1 },
      ]
    },
    timeline: [
      { id: 't1', date: '2023-09-01', title: 'Enrolled in Grade 4', description: 'Started the new academic year.', icon: 'calendar' },
      { id: 't2', date: '2023-09-15', title: 'Joined Skateboard Club', description: 'Registered for extracurricular activities.', icon: 'file' },
      { id: 't3', date: '2023-10-10', title: 'Science Fair Project', description: 'Submitted "The Effect of Cola on Teeth".', icon: 'award' },
    ]
  },
  { 
    id: 'STU002', 
    name: 'Lisa Simpson', 
    grade: 'Grade 4', 
    rollNumber: '02',
    email: 'lisa@student.school.com',
    dob: '2016-05-09',
    address: '742 Evergreen Terrace, Springfield',
    busRouteId: 'route1',
    stopId: 's1',
    medical: {
      allergies: [],
      conditions: ['Vegetarian (Dietary)'],
      bloodGroup: 'A+',
      emergencyContact: {
        name: 'Marge Simpson',
        relation: 'Mother',
        phone: '555-0124'
      }
    },
    behavior: {
      merits: 45,
      demerits: 0,
      records: [
        { id: 'b1', date: '2023-10-24', type: 'merit', title: 'Academic Excellence', description: 'Perfect score on Math test.', points: 10 },
        { id: 'b2', date: '2023-10-18', type: 'merit', title: 'Band Practice', description: 'Led the saxophone section.', points: 5 },
      ]
    },
    timeline: [
      { id: 't1', date: '2023-09-01', title: 'Enrolled in Grade 4', description: 'Started the new academic year.', icon: 'calendar' },
      { id: 't2', date: '2023-09-10', title: 'Class Representative', description: 'Elected as class president.', icon: 'award' },
      { id: 't3', date: '2023-10-05', title: 'Spelling Bee Winner', description: 'Won the regional spelling bee.', icon: 'award' },
    ]
  },
  { id: 'STU003', name: 'Milhouse Van Houten', grade: 'Grade 4', rollNumber: '03', busRouteId: 'route1', stopId: 's2', medical: { allergies: ['Dairy', 'Soy', 'Wheat'], conditions: ['Asthma', 'Myopia'], bloodGroup: 'B+', emergencyContact: { name: 'Kirk Van Houten', relation: 'Father', phone: '555-0200' } } },
  { id: 'STU004', name: 'Nelson Muntz', grade: 'Grade 4', rollNumber: '04' },
  { id: 'STU005', name: 'Ralph Wiggum', grade: 'Grade 4', rollNumber: '05' },
  { id: 'STU006', name: 'Martin Prince', grade: 'Grade 4', rollNumber: '06' },
];

export const MOCK_SCHEDULE: TimetablePeriod[] = [
  // Monday
  { id: 'tt1', classId: 'Grade 4', subject: 'Mathematics', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 1, period: 1, startTime: '08:00 AM', endTime: '08:50 AM', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'tt2', classId: 'Grade 4', subject: 'Science', teacherName: 'Professor Frink', room: 'Lab 1', dayOfWeek: 1, period: 2, startTime: '09:00 AM', endTime: '09:50 AM', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'tt3', classId: 'Grade 4', subject: 'History', teacherName: 'Elizabeth Hoover', room: 'Room 102', dayOfWeek: 1, period: 3, startTime: '10:10 AM', endTime: '11:00 AM', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'tt4', classId: 'Grade 4', subject: 'English', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 1, period: 4, startTime: '11:10 AM', endTime: '12:00 PM', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'tt5', classId: 'Grade 4', subject: 'Physical Ed', teacherName: 'Coach Krupt', room: 'Gym', dayOfWeek: 1, period: 5, startTime: '12:50 PM', endTime: '01:40 PM', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'tt6', classId: 'Grade 4', subject: 'Art', teacherName: 'Dewey Largo', room: 'Art Room', dayOfWeek: 1, period: 6, startTime: '01:50 PM', endTime: '02:40 PM', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  
  // Tuesday
  { id: 'tt7', classId: 'Grade 4', subject: 'Science', teacherName: 'Professor Frink', room: 'Lab 1', dayOfWeek: 2, period: 1, startTime: '08:00 AM', endTime: '08:50 AM', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'tt8', classId: 'Grade 4', subject: 'Mathematics', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 2, period: 2, startTime: '09:00 AM', endTime: '09:50 AM', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'tt9', classId: 'Grade 4', subject: 'English', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 2, period: 3, startTime: '10:10 AM', endTime: '11:00 AM', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'tt10', classId: 'Grade 4', subject: 'Geography', teacherName: 'Elizabeth Hoover', room: 'Room 102', dayOfWeek: 2, period: 4, startTime: '11:10 AM', endTime: '12:00 PM', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'tt11', classId: 'Grade 4', subject: 'Music', teacherName: 'Dewey Largo', room: 'Music Room', dayOfWeek: 2, period: 5, startTime: '12:50 PM', endTime: '01:40 PM', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'tt12', classId: 'Grade 4', subject: 'Computer Sci', teacherName: 'Database Admin', room: 'Computer Lab', dayOfWeek: 2, period: 6, startTime: '01:50 PM', endTime: '02:40 PM', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  
  // Wednesday
  { id: 'tt13', classId: 'Grade 4', subject: 'English', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 3, period: 1, startTime: '08:00 AM', endTime: '08:50 AM', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'tt14', classId: 'Grade 4', subject: 'History', teacherName: 'Elizabeth Hoover', room: 'Room 102', dayOfWeek: 3, period: 2, startTime: '09:00 AM', endTime: '09:50 AM', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'tt15', classId: 'Grade 4', subject: 'Mathematics', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 3, period: 3, startTime: '10:10 AM', endTime: '11:00 AM', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'tt16', classId: 'Grade 4', subject: 'Science', teacherName: 'Professor Frink', room: 'Lab 1', dayOfWeek: 3, period: 4, startTime: '11:10 AM', endTime: '12:00 PM', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'tt17', classId: 'Grade 4', subject: 'Physical Ed', teacherName: 'Coach Krupt', room: 'Gym', dayOfWeek: 3, period: 5, startTime: '12:50 PM', endTime: '01:40 PM', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'tt18', classId: 'Grade 4', subject: 'Library', teacherName: 'Librarian', room: 'Library', dayOfWeek: 3, period: 6, startTime: '01:50 PM', endTime: '02:40 PM', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  
  // Thursday
  { id: 'tt19', classId: 'Grade 4', subject: 'Mathematics', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 4, period: 1, startTime: '08:00 AM', endTime: '08:50 AM', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'tt20', classId: 'Grade 4', subject: 'English', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 4, period: 2, startTime: '09:00 AM', endTime: '09:50 AM', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'tt21', classId: 'Grade 4', subject: 'Science', teacherName: 'Professor Frink', room: 'Lab 1', dayOfWeek: 4, period: 3, startTime: '10:10 AM', endTime: '11:00 AM', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'tt22', classId: 'Grade 4', subject: 'Geography', teacherName: 'Elizabeth Hoover', room: 'Room 102', dayOfWeek: 4, period: 4, startTime: '11:10 AM', endTime: '12:00 PM', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'tt23', classId: 'Grade 4', subject: 'Computer Sci', teacherName: 'Database Admin', room: 'Computer Lab', dayOfWeek: 4, period: 5, startTime: '12:50 PM', endTime: '01:40 PM', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'tt24', classId: 'Grade 4', subject: 'Art', teacherName: 'Dewey Largo', room: 'Art Room', dayOfWeek: 4, period: 6, startTime: '01:50 PM', endTime: '02:40 PM', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  
  // Friday
  { id: 'tt25', classId: 'Grade 4', subject: 'History', teacherName: 'Elizabeth Hoover', room: 'Room 102', dayOfWeek: 5, period: 1, startTime: '08:00 AM', endTime: '08:50 AM', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'tt26', classId: 'Grade 4', subject: 'Mathematics', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 5, period: 2, startTime: '09:00 AM', endTime: '09:50 AM', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'tt27', classId: 'Grade 4', subject: 'English', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 5, period: 3, startTime: '10:10 AM', endTime: '11:00 AM', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'tt28', classId: 'Grade 4', subject: 'Science', teacherName: 'Professor Frink', room: 'Lab 1', dayOfWeek: 5, period: 4, startTime: '11:10 AM', endTime: '12:00 PM', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'tt29', classId: 'Grade 4', subject: 'Music', teacherName: 'Dewey Largo', room: 'Music Room', dayOfWeek: 5, period: 5, startTime: '12:50 PM', endTime: '01:40 PM', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'tt30', classId: 'Grade 4', subject: 'Physical Ed', teacherName: 'Coach Krupt', room: 'Gym', dayOfWeek: 5, period: 6, startTime: '01:50 PM', endTime: '02:40 PM', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

// Mock Stats for Dashboard
export const MOCK_STATS = {
  totalStudents: 1240,
  attendanceToday: 94.5,
  feeCollected: 45000,
  pendingFees: 12000,
};
