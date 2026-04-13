const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'lib/supabase-db.ts');
const content = fs.readFileSync(dbPath, 'utf-8');

const groups = {
  students: ['getStudents', 'getPaginatedStudents', 'getStudentCountForAcademicYear', 'createStudent', 'updateStudent', 'deleteStudent', 'getBehaviorRecords', 'getTimelineRecords', 'getStudentById', 'getStudentByUserId', 'getAtRiskStudents'],
  parents: ['getParents', 'getPaginatedParents', 'getParentByUserId'],
  users: ['getUsers', 'updateUserRole'],
  attendance: ['getAttendance', 'getStudentAttendance', 'getAttendanceByClass', 'getAttendanceHistory', 'saveAttendance', 'getAttendanceStats'],
  staff: ['getPaginatedStaff', 'createStaff', 'getTeachers'],
  finance: ['getPaginatedInvoices', 'createInvoice', 'updateInvoice', 'recordPayment', 'getFeeStats', 'getFeeItems', 'createFeeItem', 'updateFeeItem', 'deleteFeeItem', 'getFinancialStats', 'getFinancials', 'createFinancial'],
  academics: ['getPaginatedAssessments', 'getAssessments', 'createAssessment', 'getSubmissions', 'getStudentSubmissions', 'updateSubmission', 'submitAssessment', 'getSubmissionByAssessmentAndStudent', 'getAcademicStats', 'getClasses', 'getSubjects', 'getAcademicYears', 'getAssessmentWithQuestions', 'getActiveAcademicYear', 'setActiveAcademicYear', 'createAcademicYear', 'createClass', 'createSubject', 'updateAcademicYear', 'updateClass', 'updateSubject', 'deleteAcademicYear', 'deleteClass', 'deleteSubject'],
  transport: ['getPaginatedRoutes'],
  library: ['getPaginatedBooks'],
  visitors: ['getPaginatedVisitors', 'createVisitor'],
  medical: ['getPaginatedMedicalRecords', 'createMedicalRecord'],
  inventory: ['getPaginatedInventory', 'createInventoryItem'],
  hr: ['getLeaveRequests', 'createLeaveRequest', 'updateLeaveRequestStatus', 'getPayslips', 'createPayslip'],
  settings: ['getSystemSettings', 'updateSystemSettings'],
  communication: ['getNotices', 'createNotice', 'getMessages', 'sendMessage', 'getUsersForChat'],
  schedule: ['getSchedules', 'saveSchedule', 'saveScheduleDraft', 'getScheduleDrafts', 'deleteScheduleDraft', 'publishSchedule'],
  database: ['seedDatabase', 'resetDatabase']
};

const parts = content.split('export async function ');
const imports = parts[0];

const functionMap = {};

for (let i = 1; i < parts.length; i++) {
  const part = parts[i];
  const funcName = part.substring(0, part.indexOf('(')).trim();
  functionMap[funcName] = 'export async function ' + part;
}

fs.mkdirSync(path.join(__dirname, 'lib/api'), { recursive: true });

let reexports = '';

for (const [groupName, functions] of Object.entries(groups)) {
  let groupContent = imports;
  let hasFunctions = false;
  for (const funcName of functions) {
    if (functionMap[funcName]) {
      groupContent += functionMap[funcName] + '\n';
      hasFunctions = true;
    } else {
      console.log('Missing function: ' + funcName);
    }
  }
  
  if (hasFunctions) {
    fs.writeFileSync(path.join(__dirname, 'lib/api/' + groupName + '.ts'), groupContent);
    reexports += "export * from './api/" + groupName + "';\n";
  }
}

fs.writeFileSync(dbPath, reexports);
console.log('Done splitting database functions');


