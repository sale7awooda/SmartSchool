import { Notice, User, Driver, BusRoute, Student, TimetablePeriod } from './mock-db';

export const MOCK_NOTICES: Notice[] = [
  { id: 'NOT-001', title: 'End of Term Examinations Schedule', content: 'Please be advised that the end of term examinations will commence on November 15th. The detailed timetable has been emailed to all parents and students. Ensure students arrive 15 minutes early on exam days.', date: '2023-10-24T09:00:00Z', author: 'Principal Skinner', authorRole: 'School Admin', isImportant: true, targetAudience: 'all' },
  { id: 'NOT-002', title: 'Staff Meeting - Friday', content: 'There will be a mandatory staff meeting this Friday at 3:30 PM in the main hall to discuss the upcoming science fair logistics.', date: '2023-10-23T14:30:00Z', author: 'Principal Skinner', authorRole: 'School Admin', isImportant: false, targetAudience: 'staff' },
  { id: 'NOT-003', title: 'Fee Payment Reminder', content: 'A gentle reminder that Term 1 tuition fees are due by November 1st. Please check your dashboard for pending invoices. Late payments may incur a penalty.', date: '2023-10-20T10:15:00Z', author: 'Angela Martin', authorRole: 'Accountant', isImportant: true, targetAudience: 'parents' },
  { id: 'NOT-004', title: 'School Closed for Public Holiday', content: 'The school will remain closed on Monday, October 30th in observance of the national holiday. Classes will resume on Tuesday.', date: '2023-10-18T08:00:00Z', author: 'System Owner', authorRole: 'Super Admin', isImportant: false, targetAudience: 'all' }
];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'System Owner', email: 'super@school.com', role: 'admin' },
  { 
    id: '2', 
    name: 'Principal Skinner', 
    email: 'admin@school.com', 
    role: 'admin',
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
    route_number: 'R-01',
    bus_number: 'BUS-66',
    driver_id: '7',
    attendant_id: '5',
    attendant_name: 'Groundskeeper Willie',
    attendant_phone: '555-0103',
    status: 'In Transit',
    current_location: 'Evergreen Terrace',
    live_status: 'Approaching 742 Evergreen Terrace',
    stops: [
      { id: 's1', name: 'Evergreen Terrace', arrivalTime: '07:30 AM', coordinates: { lat: 39.7817, lng: -89.6501 }, studentId: 'STU001' },
      { id: 's2', name: 'Kwik-E-Mart', arrivalTime: '07:45 AM', coordinates: { lat: 39.7900, lng: -89.6400 }, studentId: 'STU003' },
      { id: 's3', name: 'Springfield Elementary', arrivalTime: '08:00 AM', coordinates: { lat: 39.8000, lng: -89.6300 } },
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
  { id: 'tt1', classId: 'Grade 4', subject: 'Mathematics', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 1, period: 1, startTime: '08:00 AM', endTime: '08:50 AM', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'tt2', classId: 'Grade 4', subject: 'Science', teacherName: 'Professor Frink', room: 'Lab 1', dayOfWeek: 1, period: 2, startTime: '09:00 AM', endTime: '09:50 AM', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'tt3', classId: 'Grade 4', subject: 'History', teacherName: 'Elizabeth Hoover', room: 'Room 102', dayOfWeek: 1, period: 3, startTime: '10:10 AM', endTime: '11:00 AM', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'tt4', classId: 'Grade 4', subject: 'English', teacherName: 'Edna Krabappel', room: 'Room 101', dayOfWeek: 1, period: 4, startTime: '11:10 AM', endTime: '12:00 PM', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'tt5', classId: 'Grade 4', subject: 'Physical Ed', teacherName: 'Coach Krupt', room: 'Gym', dayOfWeek: 1, period: 5, startTime: '12:50 PM', endTime: '01:40 PM', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'tt6', classId: 'Grade 4', subject: 'Art', teacherName: 'Dewey Largo', room: 'Art Room', dayOfWeek: 1, period: 6, startTime: '01:50 PM', endTime: '02:40 PM', color: 'bg-pink-100 text-pink-700 border-pink-200' },
];

export const MOCK_STATS = {
  totalStudents: 1240,
  attendanceToday: 94.5,
  feeCollected: 45000,
  pendingFees: 12000,
};

export const MOCK_ACADEMIC_YEARS = [
  { id: 'ay1', name: '2024-2025', status: 'Inactive' },
  { id: 'ay2', name: '2025-2026', status: 'Active' },
  { id: 'ay3', name: '2026-2027', status: 'Upcoming' },
];

export const MOCK_CLASSES = [
  { id: 'c1', name: 'Grade 4-A', grade: 'Grade 4', section: 'A', room: '101', teacher_id: '4' },
  { id: 'c2', name: 'Grade 4-B', grade: 'Grade 4', section: 'B', room: '102', teacher_id: '2' },
  { id: 'c3', name: 'Grade 5-A', grade: 'Grade 5', section: 'A', room: '201', teacher_id: '4' },
];

export const MOCK_SUBJECTS = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH101' },
  { id: 'sub2', name: 'Science', code: 'SCI101' },
  { id: 'sub3', name: 'English', code: 'ENG101' },
  { id: 'sub4', name: 'History', code: 'HIS101' },
];

export const MOCK_EXAMS = [
  { id: 'ex1', title: 'Mid-Term Examination', type: 'Main', date: '2023-11-15', status: 'Upcoming' },
  { id: 'ex2', title: 'Monthly Quiz - October', type: 'Quiz', date: '2023-10-20', status: 'Completed' },
];

export const MOCK_EXAM_RESULTS = [
  { id: 'er1', exam_id: 'ex2', student_id: 'STU001', subject_id: 'sub1', marks: 85, total_marks: 100, grade: 'A' },
  { id: 'er2', exam_id: 'ex2', student_id: 'STU002', subject_id: 'sub1', marks: 98, total_marks: 100, grade: 'A+' },
];

export const MOCK_ATTENDANCE = [
  { id: 'att1', student_id: 'STU001', date: '2023-10-24', status: 'Present' },
  { id: 'att2', student_id: 'STU002', date: '2023-10-24', status: 'Present' },
  { id: 'att3', student_id: 'STU003', date: '2023-10-24', status: 'Absent', reason: 'Fever' },
];

export const MOCK_BOOKS = [
  { id: 'bk1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', category: 'Fiction', quantity: 5, available: 3 },
  { id: 'bk2', title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', quantity: 2, available: 2 },
];

export const MOCK_INVOICES = [
  { id: 'inv1', student_id: 'STU001', amount: 1200, due_date: '2023-11-01', status: 'pending', description: 'Term 1 Tuition Fee' },
  { id: 'inv2', student_id: 'STU002', amount: 1200, due_date: '2023-11-01', status: 'paid', description: 'Term 1 Tuition Fee' },
];

export const MOCK_INVENTORY = [
  { id: 'item1', name: 'Whiteboard Markers', category: 'Stationery', quantity: 50, unit: 'pcs', status: 'In Stock' },
  { id: 'item2', name: 'Projector - Room 101', category: 'Electronics', quantity: 1, unit: 'unit', status: 'In Use' },
];

export const MOCK_CHATS = [
  { id: 'c1', name: 'Edna Krabappel', role: 'Teacher', lastMessage: 'Bart is doing much better in math this week.', time: '10:30 AM', unread: 2 },
  { id: 'c2', name: 'Principal Skinner', role: 'Admin', lastMessage: 'Please review the updated school policies.', time: 'Yesterday', unread: 0 },
  { id: 'c3', name: 'Elizabeth Hoover', role: 'Teacher', lastMessage: 'Don\'t forget the permission slip for the field trip.', time: 'Monday', unread: 0 },
];

export const MOCK_MESSAGES = [
  { id: 'm1', sender: 'Edna Krabappel', text: 'Hello! I wanted to give you a quick update on Bart.', time: '10:15 AM', isMe: false },
  { id: 'm2', sender: 'Me', text: 'Hi Edna, thanks for reaching out. How is he doing?', time: '10:20 AM', isMe: true },
  { id: 'm3', sender: 'Edna Krabappel', text: 'Bart is doing much better in math this week. He really focused during the fractions lesson.', time: '10:30 AM', isMe: false },
];
