# API Reference — Smart School Management System

This document describes all server-side APIs. The application uses **Next.js Server Actions** (REST-style form actions) as the primary backend interface, plus **Socket.io** for real-time transport tracking.

---

## Server Actions

All server actions are located in `app/actions/` and use `"use server"`. They accept a `prevState` (form action state) and `formData` (FormData object), returning a standardized state object.

### Authentication (`app/actions/auth.ts`)

| Function | Description |
|----------|-------------|
| `bootstrapUserProfile(sessionUser)` | Creates/repairs user profile on first login; auto-assigns role from email |
| `ensureDefaultUserAndAuth(email, password?)` | Dev-mode only: provisions demo auth users |
| `resolveUserEmailAction(identifier)` | Resolves email/UUID/roll number/phone to user record |
| `autoProvisionUserAuthAction(identifier, password?)` | Ensures Auth user exists; self-heals UUID mismatches |
| `lookupStudentEmailsByParentEmail(parentEmail)` | Finds student emails linked to a parent |

### Students (`app/actions/students.ts`)

| Function | Description |
|----------|-------------|
| `processCreateStudentAction(prevState, formData)` | Creates student + Auth user + generates invoices |
| `processUpdateStudentAction(prevState, formData)` | Updates student, recalcs invoices, handles parent linking |
| `processDeleteStudentAction(prevState, formData)` | Soft-deletes student, voids unpaid invoices |
| `syncStudentAuthAction(studentIds)` | Batch syncs Auth identities for students |

### Staff/HR (`app/actions/staff.ts`)

| Function | Description |
|----------|-------------|
| `processCreateStaffAction(prevState, formData)` | Creates staff + Auth user |
| `processUpdateStaffAction(prevState, formData)` | Updates staff profile |
| `processDeleteStaffAction(prevState, formData)` | Soft-deletes staff member |

### HR - Payroll & Leave (`app/actions/hr.ts`)

| Function | Description |
|----------|-------------|
| `runPayrollAction(monthStr)` | Runs payroll: fetches attendance, calculates deductions, generates payslips |
| `getLeaveRequestsAction()` | Fetches all leave requests |
| `getPayslipsAction()` | Fetches all payslips |
| `applyLeaveAction(leaveData)` | Submits a leave request |
| `updateLeaveStatusAction(id, status)` | Approves/rejects leave |
| `updatePayslipStatusAction(id, status)` | Updates payslip status |
| `payPayslipWithExpenseAction(id, amount, ...)` | Marks payslip paid + creates expense record |

### Academics & Assessments (`app/actions/academics.ts`)

| Function | Description |
|----------|-------------|
| `processCreateAssessmentAction(prevState, formData)` | Creates exam/assignment/quiz/project with Zod validation |
| `processSaveGradesAction(prevState, formData)` | Batch upserts grades, marks assessment "Graded" |
| `createAssessmentAndQuestionsAction(assessmentData, questions?)` | Creates assessment + questions in one transaction |
| `submitAssessmentAction(submissionData)` | Submits student answers, auto-grades MC/TF/MR/SA |
| `updateSubmissionAction(submissionId, updateData)` | Updates safe submission fields |
| `saveManualScoresAction(submissionId, ...)` | Saves manual scores, recomputes total |
| `deleteSubmissionAction(submissionId, deletedBy)` | Deletes submission (allows retake) |
| `extendAssessmentDurationAction(...)` | Extends timed assessment duration |
| `publishReportCard(studentId, className, term, isPublished)` | Publishes/unpublishes student report card |
| `publishClassReportCards(className, term, studentIds, ...)` | Batch publish for entire class |
| `runPublicationsMigration()` | Creates `report_card_publications` table |

### Attendance (`app/actions/attendance.ts`)

| Function | Description |
|----------|-------------|
| `processSaveAttendanceAction(prevState, formData)` | Batch saves/updates attendance for multiple students on a date |

### Finance (`app/actions/finance.ts`)

| Function | Description |
|----------|-------------|
| `processCreateInvoiceAction(prevState, formData)` | Creates fee invoice for a student |
| `processVoidInvoiceAction(prevState, formData)` | Voids an invoice |
| `processPaymentAction(prevState, formData)` | Records payment via `record_fee_payment` RPC |
| `processCreateFeeItemAction(prevState, formData)` | Creates fee structure item |
| `processUpdateFeeItemAction(prevState, formData)` | Updates fee item |
| `processDeleteFeeItemAction(prevState, formData)` | Deletes fee item |
| `createExpenseAction(expenseData)` | Creates expense record |

### Communication (`app/actions/communication.ts`)

| Function | Description |
|----------|-------------|
| `processCreateNoticeAction(prevState, formData)` | Creates notice with target audience |
| `processSendMessageAction(prevState, formData)` | Sends direct message between users |

### Settings & Master Data (`app/actions/settings.ts`)

| Function | Description |
|----------|-------------|
| `processCreateMasterEntityAction(prevState, formData)` | Creates academic year / class / subject |
| `processUpdateMasterEntityAction(prevState, formData)` | Updates master entity (auto-deactivates years) |
| `processDeleteMasterEntityAction(prevState, formData)` | Deletes master entity |
| `seedDatabaseAction(demoData)` | Seeds full demo dataset |
| `resetDatabaseAction(keepUsers?)` | Clears all operational data |
| `updateSystemSettingsServerAction(settings)` | Updates school name, currency, logo, etc. |

### Schedule (`app/actions/schedule.ts`)

| Function | Description |
|----------|-------------|
| `getSchedulesAction(classId?, academicYear?)` | Fetches class schedules with joins |

### Users & Profile (`app/actions/users.ts`)

| Function | Description |
|----------|-------------|
| `updateUserProfileAction(payload)` | Updates own name/email/phone |
| `changePasswordAction(password)` | Changes own password via Supabase Auth |
| `updateUserPermissionsAction(userId, customPermissions)` | Admin: sets custom permissions |
| `updateStaffMemberAction(userId, payload)` | Admin: updates any staff member |
| `updateUserRoleAndDepartmentAction(userId, role, department)` | Admin: updates role + department |
| `updateUserRoleAction(userId, role)` | Admin: validates and updates role |
| `adminResetUserPasswordAction(userId, password)` | Admin: resets any user password |
| `adminBulkResetPasswordsAction(role, password)` | Admin: bulk reset by role |
| `adminSolidifyStudentEmailsAction()` | Admin: migrates student email format |

### Audit (`app/actions/audit.ts`)

| Function | Description |
|----------|-------------|
| `logAudit(actionType, userId, details)` | Writes audit log entry |
| `simulateLogEvent()` | Creates random test audit log |

---

## API Layer (`lib/api/`)

Client-side data helpers in `lib/api/` that interact with Supabase directly:

| File | Functions | Purpose |
|------|-----------|---------|
| `analytics.ts` | `getOverviewStats()`, `getAcademicStats()`, `getAttendanceStats()`, `getFinancialStats()`, `getPredictiveAnalytics()` | Dashboard analytics queries |
| `assessments.ts` | `getAssessments()`, `getAssessment()`, `getSubmissions()`, `getSubmission()` | Assessment data fetching |
| `attendance.ts` | `getAttendance()`, `getAttendanceStats()` | Attendance records |
| `classes.ts` | `getClasses()`, `getClass()`, `getClassSubjects()` | Class data |
| `communication.ts` | `getNotices()`, `getMessages()`, `getConversations()` | Notices & messages |
| `documents.ts` | `getDocuments()`, `uploadDocument()`, `deleteDocument()` | Student documents |
| `expenses.ts` | `getExpenses()`, `createExpense()` | Expense records |
| `feeItems.ts` | `getFeeItems()`, `createFeeItem()` | Fee structure items |
| `fees.ts` | `getInvoices()`, `getInvoice()`, `getStudentInvoices()` | Invoice records |
| `financials.ts` | `getFinancials()`, `getFinancialSummary()` | Financial reports |
| `grades.ts` | `getGrades()`, `getGradeCards()`, `getReportCard()` | Grades & report cards |
| `hr.ts` | `getStaff()`, `getStaffMember()`, `getDepartments()` | Staff records |
| `inventory.ts` | `getInventory()`, `getInventoryItem()`, `createInventoryItem()`, `updateInventoryItem()`, `deleteInventoryItem()` | Inventory CRUD |
| `notifications.ts` | `getNotifications()`, `markAsRead()`, `getUnreadCount()` | Push notification records |
| `schedule.ts` | `getSchedules()`, `getPeriods()` | Class timetables |
| `students.ts` | `getStudents()`, `getStudent()`, `searchStudents()` | Student directory |
| `subjects.ts` | `getSubjects()` | Subject listing |
| `transport.ts` | `getRoutes()`, `getRoute()`, `getStops()` | Transport routes |
| `visitors.ts` | `getVisitors()`, `checkInVisitor()`, `checkOutVisitor()` | Visitor management |

Each function returns typed data using the interfaces in `types/index.ts`.

---

## Real-Time (Socket.io)

Defined in `server.ts` — Socket.io server on port 3000.

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join_route` | Client → Server | `{ routeId }` | Join a transport route room |
| `leave_route` | Client → Server | `{ routeId }` | Leave a transport route room |
| `update_location` | Client → Server | `{ routeId, lat, lng }` | Bus/driver sends GPS position |
| `location_update` | Server → Client (broadcast) | `{ routeId, lat, lng }` | All room members receive location |

The server also supports a Redis adapter for horizontal scaling (`@socket.io/redis-adapter` + `ioredis`).

---

## Types (`types/index.ts`)

Key exported interfaces:

```typescript
// Auth
UserProfile { id, email, name, role, school_id, ... }
Role = 'admin' | 'teacher' | 'staff' | 'accountant' | 'parent' | 'student'

// Students
Student { id, first_name, last_name, class_id, academic_year_id, ... }
StudentWithProfile extends Student, UserProfile

// Academics
Assessment { id, title, type, class_id, subject_id, max_score, ... }
Grade { id, student_id, assessment_id, score, grade, ... }
ReportCard { student_id, class_name, term, grades, ... }

// Finance
Invoice { id, student_id, amount, balance_due, status, due_date, ... }
Payment { id, invoice_id, amount, payment_date, method, ... }
FeeItem { id, name, amount, frequency, category, ... }
Expense { id, description, amount, category, date, ... }

// HR
StaffMember { id, user_id, department, designation, salary, ... }
LeaveRequest { id, staff_id, leave_type, start_date, end_date, status, ... }
Payslip { id, staff_id, month, gross_pay, deductions, net_pay, ... }

// Transport
TransportRoute { id, name, vehicle, driver_name, stops, ... }
RouteStop { id, route_id, name, lat, lng, order_index, ... }

// Settings
SystemSettings { school_name, address, phone, email, logo_url, currency, ... }
School { id, name, slug, currency, timezone, subscription_tier, ... }

// Inventory
InventoryItem { id, name, category, quantity, assigned_to, maintenance_date, ... }
InventoryInput extends Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>

// Visitors
VisitorRecord { id, name, phone, host, check_in, check_out, purpose, ... }

// Pagination
PaginatedResult<T> { data: T[], total: number, page: number, pageSize: number, totalPages: number }
```

---

## Audit Logging

All write operations automatically log to `audit_logs` table via the `logAudit()` action. The log includes:
- `action_type` — e.g., `create_student`, `record_payment`, `void_invoice`
- `user_id` — who performed the action
- `details` — JSON payload with record IDs and changes
- `created_at` — timestamp
