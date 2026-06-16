'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { processUpdateStaffAction } from '@/app/actions/staff';
import { toast } from 'sonner';

export function EditStaffModal({ staff, onClose, onUpdate }: { staff: any; onClose: () => void; onUpdate: () => void }) {
  const { user } = useAuth();
  
  // Parse extra_info for account_number and other_info
  let extraInfo: any = {};
  try {
    if (staff?.extra_info) {
      extraInfo = typeof staff.extra_info === 'string' ? JSON.parse(staff.extra_info) : staff.extra_info;
    }
  } catch (e) {
    console.error('Error parsing staff extra_info', e);
  }

  // Initialize states matching Add New Employee fields
  const [role, setRole] = useState(staff.role || 'staff');
  const [designation, setDesignation] = useState(staff.designation || staff.department || '');
  const [name, setName] = useState(staff.name || '');
  const [email, setEmail] = useState(staff.email || '');
  const [phone, setPhone] = useState(staff.phone || '');
  const [dob, setDob] = useState(staff.dob || '');
  const [gender, setGender] = useState(staff.gender || '');
  const [dateOfJoin, setDateOfJoin] = useState(staff.date_of_join || '');
  const [salary, setSalary] = useState(staff.salary ? String(staff.salary) : '');
  const [accountNumber, setAccountNumber] = useState(extraInfo?.account_number || '');
  const [education, setEducation] = useState(staff.education || '');
  const [address, setAddress] = useState(staff.address || '');
  const [otherInfo, setOtherInfo] = useState(extraInfo?.other_info || '');
  const [isAttendanceMarker, setIsAttendanceMarker] = useState(staff.can_mark_attendance || false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to perform this action');
      return;
    }
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('staff_id', staff.id);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('role', role);
      formData.append('designation', designation);
      formData.append('dob', dob);
      formData.append('gender', gender);
      formData.append('date_of_join', dateOfJoin);
      formData.append('salary', salary);
      formData.append('education', education);
      formData.append('address', address);
      formData.append('updatedBy', user.id);
      formData.append('can_mark_attendance', isAttendanceMarker ? 'true' : 'false');
      
      const extraInfoObj = {
        account_number: accountNumber,
        other_info: otherInfo
      };
      formData.append('extra_info', JSON.stringify(extraInfoObj));

      // Calculate department based on role/designation
      let newDept = designation;
      if (role === 'teacher') {
        newDept = designation || 'Teaching';
      } else if (role === 'staff') {
        newDept = designation || 'General Staff';
      } else if (role === 'admin') {
        newDept = 'Administration';
      } else if (role === 'accountant') {
        newDept = 'Finance';
      }
      formData.append('department', newDept);

      const result = await processUpdateStaffAction({ success: false, message: '' }, formData);
      
      if (!result.success) {
        toast.error('Failed to update staff: ' + result.message);
        return;
      }

      toast.success('Staff profile updated successfully');
      onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error('An unexpected error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
      >
        <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Edit Staff Profile</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Update employee credentials and contract details.</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 relative">
          <form id="edit-staff-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Designation</label>
                <select 
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                >
                  <option value="">Select Designation</option>
                  <option value="Principal">Principal</option>
                  <option value="Vice Principal">Vice Principal</option>
                  <option value="Head of Department">Head of Department</option>
                  <option value="Senior Teacher">Senior Teacher</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Assistant Teacher">Assistant Teacher</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Clerical Staff">Clerical Staff</option>
                  <option value="Maintenance Staff">Maintenance Staff</option>
                  <option value="Security Guard">Security Guard</option>
                  <option value="Librarian">Librarian</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="john.doe@school.edu"
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Phone</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  value={dob} 
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Gender</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Join Date</label>
                <input 
                  type="date" 
                  value={dateOfJoin} 
                  onChange={(e) => setDateOfJoin(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Basic Salary</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={salary} 
                  onChange={(e) => setSalary(e.target.value)}
                  required
                  placeholder="5000"
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Bank Account Number</label>
                <input 
                  type="text" 
                  value={accountNumber} 
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Certificate / Qualifications</label>
              <input 
                type="text" 
                value={education} 
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. B.Sc. Education, Teaching License"
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Address</label>
              <textarea 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                rows={2} 
                placeholder="Full address"
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Other Related Info</label>
              <textarea 
                value={otherInfo} 
                onChange={(e) => setOtherInfo(e.target.value)}
                rows={2} 
                placeholder="Any other notes..."
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="flex items-center gap-3 p-4 border border-border rounded-xl bg-muted/30">
              <input
                type="checkbox"
                id="attendanceMarker"
                checked={isAttendanceMarker}
                onChange={(e) => setIsAttendanceMarker(e.target.checked)}
                className="w-5 h-5 rounded text-primary focus:ring-primary border-border cursor-pointer bg-background"
              />
              <label htmlFor="attendanceMarker" className="font-bold text-sm text-foreground cursor-pointer select-none">
                Can Mark Attendance
                <p className="font-normal text-xs text-muted-foreground mt-0.5">
                  Allows this staff member to mark daily attendance.
                </p>
              </label>
            </div>
          </form>
        </div>

        <div className="p-6 sm:p-8 border-t border-border bg-muted/50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-staff-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/95 transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
