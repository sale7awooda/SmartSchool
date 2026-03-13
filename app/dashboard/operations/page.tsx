'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  UserCheck, 
  HeartPulse, 
  Package, 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  AlertTriangle, 
  Activity, 
  Wrench, 
  Laptop, 
  MonitorPlay,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

// Mock Data
const MOCK_LEAVE_REQUESTS = [
  { id: 'L1', type: 'Sick Leave', startDate: '2023-11-10', endDate: '2023-11-11', status: 'Approved', days: 2 },
  { id: 'L2', type: 'Annual Leave', startDate: '2023-12-20', endDate: '2023-12-31', status: 'Pending', days: 8 },
];

const MOCK_PAYSLIPS = [
  { id: 'P1', month: 'October 2023', amount: '$4,200.00', status: 'Paid', date: '2023-10-28' },
  { id: 'P2', month: 'September 2023', amount: '$4,200.00', status: 'Paid', date: '2023-09-28' },
];

const MOCK_VISITORS = [
  { id: 'V1', name: 'John Doe', purpose: 'Parent-Teacher Meeting', host: 'Edna Krabappel', timeIn: '09:15 AM', timeOut: null, status: 'Active', badgeId: 'B-1042' },
  { id: 'V2', name: 'Sarah Smith', purpose: 'Maintenance', host: 'Groundskeeper Willie', timeIn: '08:30 AM', timeOut: '10:45 AM', status: 'Completed', badgeId: 'B-1041' },
];

const MOCK_MEDICAL_RECORDS = [
  { id: 'M1', studentName: 'Bart Simpson', grade: 'Grade 4', allergies: ['Shrimp', 'Butterscotch'], conditions: ['ADHD'], bloodGroup: 'O-', lastVisit: '2023-10-15 (Headache)' },
  { id: 'M2', studentName: 'Lisa Simpson', grade: 'Grade 2', allergies: ['None'], conditions: ['Asthma'], bloodGroup: 'A+', lastVisit: '2023-09-02 (Routine Check)' },
];

const MOCK_INVENTORY = [
  { id: 'INV-001', name: 'Dell Latitude 3420', category: 'Laptop', assignedTo: 'Edna Krabappel', status: 'In Use', nextMaintenance: '2024-01-15' },
  { id: 'INV-002', name: 'Epson Projector X100', category: 'Projector', assignedTo: 'Room 101', status: 'Maintenance', nextMaintenance: '2023-11-05' },
  { id: 'INV-003', name: 'Basketball Set (10)', category: 'Sports', assignedTo: 'Gym', status: 'Available', nextMaintenance: '2024-05-20' },
];

export default function OperationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'visitors' | 'health' | 'inventory'>('visitors');

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Operations</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage visitors, health records, and inventory.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <button 
          onClick={() => setActiveTab('visitors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'visitors' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <UserCheck size={18} />
          Visitor Management
        </button>
        <button 
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'health' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <HeartPulse size={18} />
          Health & Medical
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Package size={18} />
          Inventory & Assets
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {activeTab === 'visitors' && <VisitorsTab key="visitors" />}
          {activeTab === 'health' && <HealthTab key="health" />}
          {activeTab === 'inventory' && <InventoryTab key="inventory" />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function HRTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Leave Requests</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Manage your time off</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
                <Plus size={16} />
                Request Leave
              </button>
            </div>
            
            <div className="space-y-4">
              {MOCK_LEAVE_REQUESTS.map(leave => (
                <div key={leave.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {leave.status === 'Approved' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{leave.type}</h3>
                      <p className="text-xs font-medium text-slate-500">{leave.startDate} to {leave.endDate} ({leave.days} days)</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payroll & Documents */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Payslips</h2>
            <div className="space-y-3">
              {MOCK_PAYSLIPS.map(slip => (
                <div key={slip.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{slip.month}</p>
                      <p className="text-xs font-medium text-slate-500">{slip.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{slip.amount}</p>
                    <Download size={14} className="inline-block text-slate-400 group-hover:text-indigo-600 transition-colors mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[2rem] shadow-sm p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Briefcase size={100} />
            </div>
            <h2 className="text-xl font-bold mb-2 relative z-10">HR Documents</h2>
            <p className="text-indigo-100 text-sm font-medium mb-6 relative z-10">Access employee handbook, policies, and tax forms.</p>
            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors relative z-10">
              Browse Documents
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VisitorsTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Visitor Management</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Track campus visitors and print badges</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search visitors..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">
              <Plus size={16} />
              New Check-in
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Visitor</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Purpose & Host</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_VISITORS.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                        {visitor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{visitor.name}</p>
                        <p className="text-xs text-slate-500 font-medium">Badge: {visitor.badgeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-700">{visitor.purpose}</p>
                    <p className="text-xs text-slate-500 font-medium">Host: {visitor.host}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-700">In: {visitor.timeIn}</p>
                    {visitor.timeOut && <p className="text-xs text-slate-500 font-medium">Out: {visitor.timeOut}</p>}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${visitor.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {visitor.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {visitor.status === 'Active' && (
                        <>
                          <button 
                            onClick={() => toast.success('Badge sent to printer')}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                            title="Print Badge"
                          >
                            <Printer size={18} />
                          </button>
                          <button 
                            onClick={() => toast.success('Visitor checked out')}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                          >
                            Check Out
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function HealthTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-rose-900">Clinic Visits Today</p>
            <p className="text-2xl font-black text-rose-700">12</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Active Allergies</p>
            <p className="text-2xl font-black text-amber-700">45</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <HeartPulse size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">Immunizations Up to Date</p>
            <p className="text-2xl font-black text-emerald-700">98%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Medical Records</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Confidential health information</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search student..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors shadow-sm whitespace-nowrap">
              <Plus size={16} />
              Log Incident
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_MEDICAL_RECORDS.map(record => (
            <div key={record.id} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{record.studentName}</h3>
                  <p className="text-sm font-medium text-slate-500">{record.grade} • Blood: <span className="text-rose-600 font-bold">{record.bloodGroup}</span></p>
                </div>
                <button className="text-indigo-600 text-sm font-bold hover:underline">View Full Profile</button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    {record.allergies.map(allergy => (
                      <span key={allergy} className={`px-2 py-1 rounded-md text-xs font-bold ${allergy === 'None' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {record.conditions.map(condition => (
                      <span key={condition} className="px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500">Last Clinic Visit: <span className="font-bold text-slate-700">{record.lastVisit}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function InventoryTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Asset Management</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Track equipment and maintenance schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search assets..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">
              <Plus size={16} />
              Add Asset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Details</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Maintenance</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_INVENTORY.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        {item.category === 'Laptop' && <Laptop size={20} />}
                        {item.category === 'Projector' && <MonitorPlay size={20} />}
                        {item.category === 'Sports' && <Activity size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-xs text-slate-500 font-medium">ID: {item.id} • {item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-700">{item.assignedTo}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      item.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 
                      item.status === 'In Use' ? 'bg-blue-100 text-blue-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {item.nextMaintenance}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                      title="Schedule Maintenance"
                    >
                      <Wrench size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
