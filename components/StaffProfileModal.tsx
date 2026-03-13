import { 
  Mail, Phone, Building2, Briefcase, Calendar, Award, Book, Clock, ChevronRight, X
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/language-context';

export default function StaffProfileModal({ selectedStaff, handleCloseProfile, activeProfileTab, setActiveProfileTab, MOCK_LEAVE_REQUESTS, MOCK_PAYSLIPS, MOCK_FINANCIALS }: any) {
  const { t, isRTL } = useLanguage();

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'principal': return 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
      case 'teacher': return 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20';
      case 'superintendent': return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      default: return 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-5 relative bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-500/20">
            {selectedStaff.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedStaff.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(selectedStaff.role)}`}>
                {selectedStaff.role}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                {selectedStaff.department || 'Staff'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleCloseProfile}
            className={`absolute top-6 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ${isRTL ? 'left-6' : 'right-6'}`}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 sm:px-8 overflow-x-auto scrollbar-hide shrink-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'qualifications', label: 'Qualifications' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'leave', label: 'Leave History' },
            { id: 'payroll', label: 'Payroll' },
            { id: 'financials', label: 'Loans & Fines' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveProfileTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeProfileTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          {/* Overview Tab */}
          {activeProfileTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Mail, label: 'Email Address', value: selectedStaff.email },
                  { icon: Phone, label: 'Phone Number', value: selectedStaff.phone },
                  { icon: Building2, label: 'Department', value: selectedStaff.department || 'N/A' },
                  { icon: Briefcase, label: 'Designation', value: selectedStaff.designation || 'N/A' },
                  { icon: Calendar, label: 'Joined Date', value: selectedStaff.joinDate || 'N/A' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400"><item.icon size={20} /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 break-all truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qualifications Tab */}
          {activeProfileTab === 'qualifications' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Award size={20} className="text-indigo-600 dark:text-indigo-400" />
                  Academic Qualifications
                </h3>
                <ul className="space-y-3">
                  {selectedStaff.qualifications?.length > 0 ? selectedStaff.qualifications.map((qual: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{qual}</span>
                    </li>
                  )) : <p className="text-slate-500 dark:text-slate-400 text-sm">No qualifications listed.</p>}
                </ul>
              </div>

              {selectedStaff.subjects?.length > 0 && (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Book size={20} className="text-emerald-600 dark:text-emerald-400" />
                    Subjects Taught
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedStaff.subjects.map((subj: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-bold border border-emerald-100 dark:border-emerald-500/20">
                        {subj}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeProfileTab === 'schedule' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-3">
                <Clock size={20} className="text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                  This is a simplified view of the staff member&apos;s weekly schedule.
                </p>
              </div>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                <div key={day} className="bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-3">{day}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-16">09:00 AM</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Assigned Duty / Class</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Main Building</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Leave Tab */}
          {activeProfileTab === 'leave' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Recent Leave Requests</h3>
              {MOCK_LEAVE_REQUESTS?.filter((l: any) => l.staff === selectedStaff.name).length > 0 ? (
                MOCK_LEAVE_REQUESTS.filter((l: any) => l.staff === selectedStaff.name).map((leave: any) => (
                  <div key={leave.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{leave.type}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{leave.startDate} to {leave.endDate} ({leave.days} days)</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      leave.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 
                      leave.status === 'Rejected' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400' : 
                      'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No leave requests found.</p>
              )}
            </div>
          )}

          {/* Payroll Tab */}
          {activeProfileTab === 'payroll' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Recent Payslips</h3>
              {MOCK_PAYSLIPS?.filter((p: any) => p.staff === selectedStaff.name).length > 0 ? (
                MOCK_PAYSLIPS.filter((p: any) => p.staff === selectedStaff.name).map((slip: any) => (
                  <div key={slip.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{slip.month}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Processed: {slip.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 dark:text-white">{slip.amount}</p>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{slip.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No payroll records found.</p>
              )}
            </div>
          )}

          {/* Financials Tab */}
          {activeProfileTab === 'financials' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Loans, Bonuses & Fines</h3>
              {MOCK_FINANCIALS?.filter((f: any) => f.staff === selectedStaff.name).length > 0 ? (
                MOCK_FINANCIALS.filter((f: any) => f.staff === selectedStaff.name).map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.type}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${item.type === 'Fine' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.type === 'Fine' ? '-' : '+'}{item.amount}
                      </p>
                      <span className={`text-xs font-bold ${
                        item.status === 'Approved' || item.status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 
                        item.status === 'Active' ? 'text-indigo-600 dark:text-indigo-400' : 
                        'text-amber-600 dark:text-amber-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No financial records found.</p>
              )}
            </div>
          )}
        </div> 

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            onClick={handleCloseProfile}
            className="w-full px-4 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98] shadow-sm"
          >
            {t('close_profile') || 'Close Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
