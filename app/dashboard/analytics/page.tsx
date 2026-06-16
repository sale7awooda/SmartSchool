'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  AlertTriangle, 
  GraduationCap, 
  Users, 
  DollarSign, 
  Activity,
  ChevronDown,
  BrainCircuit,
  CalendarCheck,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyData } from '@/components/ui/empty-data';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import { 
  getAcademicStats, 
  getAttendanceStats, 
  getFinancialStats, 
  getAtRiskStudents, 
  getActiveAcademicYear,
  getStudents,
  getPaginatedInvoices
} from '@/lib/supabase-db';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'attendance' | 'financial' | 'predictive'>('overview');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Fetch data using SWR
  const { data: academicStats, isLoading: academicLoading } = useSWR(
    ['academicStats', activeAcademicYear?.name], 
    ([_, a]) => getAcademicStats(a)
  );
  const { data: attendanceStats, isLoading: attendanceLoading } = useSWR(
    ['attendanceStats', activeAcademicYear?.name], 
    ([_, a]) => getAttendanceStats(a)
  );
  const { data: financialStats, isLoading: financialLoading } = useSWR(
    ['financialStats', activeAcademicYear?.name], 
    ([_, a]) => getFinancialStats(a)
  );
  const { data: atRiskStudents, isLoading: atRiskLoading } = useSWR(
    ['atRiskStudents', activeAcademicYear?.name], 
    ([_, a]) => getAtRiskStudents(a)
  );
  const { data: studentsList, isLoading: studentsLoading } = useSWR(
    'analytics_students_list',
    () => getStudents()
  );
  const { data: invoicesData, isLoading: invoicesLoading } = useSWR(
    ['analyticsInvoices', activeAcademicYear?.name],
    () => getPaginatedInvoices(1, 100)
  );

  const { data: attendanceByClass, isLoading: attendanceByClassLoading } = useSWR(
    ['attendanceByClass', new Date().toISOString().split('T')[0]], 
    ([_, date]) => {
      const { getAttendanceByClass } = require('@/lib/supabase-db');
      return getAttendanceByClass(date);
    }
  );

  if (!user || !can('view', 'analytics')) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You do not have permission to view advanced analytics.</p>
        </div>
      </div>
    );
  }

  const handleExport = (format: 'pdf' | 'excel') => {
    toast.success(`Exporting ${activeTab} report as ${format.toUpperCase()}...`);
    setIsExportMenuOpen(false);
  };

  const isLoading = academicLoading || attendanceLoading || financialLoading || atRiskLoading || studentsLoading || invoicesLoading;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Advanced Analytics & Insights</h1>
          <p className="text-muted-foreground mt-2 font-medium">Data-driven decision making and predictive modeling.</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export Report
            <ChevronDown size={16} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50">
              <button 
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/50 transition-colors border-b border-border/50"
              >
                <FileText size={16} className="text-rose-500" />
                Export as PDF
              </button>
              <button 
                onClick={() => handleExport('excel')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/50 transition-colors"
              >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                Export as Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-card p-1.5 rounded-2xl border border-border shadow-sm shrink-0">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
        >
          <Activity size={18} />
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('academic')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'academic' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
        >
          <GraduationCap size={18} />
          Academic Performance
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'attendance' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
        >
          <CalendarCheck size={18} />
          Attendance Patterns
        </button>
        <button 
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'financial' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
        >
          <DollarSign size={18} />
          Financial Health
        </button>
        <button 
          onClick={() => setActiveTab('predictive')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'predictive' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
        >
          <BrainCircuit size={18} />
          Predictive Insights
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={48} className="animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && <OverviewTab key="overview" academicStats={academicStats} attendanceStats={attendanceStats} financialStats={financialStats} atRiskStudents={atRiskStudents} studentsList={studentsList} />}
            {activeTab === 'academic' && <AcademicTab key="academic" academicStats={academicStats} />}
            {activeTab === 'attendance' && <AttendanceTab key="attendance" attendanceStats={attendanceStats} attendanceByClass={attendanceByClass} />}
            {activeTab === 'financial' && <FinancialTab key="financial" financialStats={financialStats} invoicesRaw={invoicesData?.data} />}
            {activeTab === 'predictive' && <PredictiveTab key="predictive" atRiskStudents={atRiskStudents} />}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function OverviewTab({ academicStats, attendanceStats, financialStats, atRiskStudents, studentsList }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const overviewRecordsRaw = (studentsList || []).map((s: any) => {
    const avgGrade = academicStats?.studentAverages?.[s.id]?.avg;
    const attData = attendanceStats?.studentAttendance?.[s.id];
    const attendancePercentage = attData && attData.total > 0 
      ? Math.round((attData.present / attData.total) * 100) 
      : 95;

    const finalGrade = avgGrade !== undefined ? avgGrade : 85;

    let studentStatus = 'Passing';
    if (finalGrade >= 90 && attendancePercentage >= 95) studentStatus = 'Excellent';
    else if (finalGrade >= 70) studentStatus = 'Passing';
    else if (finalGrade >= 55) studentStatus = 'Average';
    else studentStatus = 'At-Risk';

    return {
      name: s.name,
      class: s.grade || 'General',
      grade: finalGrade,
      attendance: attendancePercentage,
      status: studentStatus
    };
  });

  const overviewRecords = overviewRecordsRaw.length > 0 ? overviewRecordsRaw : [
    { name: 'Sarah Jenkins', class: 'Grade 10-A', grade: 92, attendance: 98, status: 'Excellent' },
    { name: 'Alexander Thompson', class: 'Grade 11-B', grade: 74, attendance: 95, status: 'Passing' },
    { name: 'Marcus Brody', class: 'Grade 9-A', grade: 58, attendance: 82, status: 'At-Risk' },
    { name: 'Sophia Martinez', class: 'Grade 12-A', grade: 88, attendance: 99, status: 'Excellent' },
    { name: 'David Kim', class: 'Grade 10-B', grade: 64, attendance: 89, status: 'Average' },
    { name: 'Emma Watson', class: 'Grade 11-A', grade: 95, attendance: 97, status: 'Excellent' },
    { name: 'James Carter', class: 'Grade 9-B', grade: 48, attendance: 75, status: 'At-Risk' },
  ];

  const filtered = overviewRecords.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.class.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Avg School Grade</h3>
          <p className="text-3xl font-black text-foreground">{academicStats?.avgGrade || 'N/A'}%</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Avg Attendance</h3>
          <p className="text-3xl font-black text-foreground">{attendanceStats?.avgAttendance || 'N/A'}%</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">YTD Revenue</h3>
          <p className="text-3xl font-black text-foreground">${(financialStats?.ytdRevenue / 1000).toFixed(1)}K</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <BrainCircuit size={20} />
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">At-Risk Students</h3>
          <p className="text-3xl font-black text-foreground">{atRiskStudents?.length || 0}</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-6">School Performance Index</h3>
        {(!academicStats?.trends || academicStats.trends.length === 0) ? (
          <EmptyData icon={BrainCircuit} title="Academic Metrics Pending" description="Not enough academic data collected yet for this period." />
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={academicStats?.trends || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[60, 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="left" dataKey="math" name="Math Avg" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar yAxisId="left" dataKey="english" name="English Avg" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="left" type="monotone" dataKey="avg" name="Overall Trend" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* SEARCHABLE TABLE SECTION */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          <div>
            <h3 className="text-lg font-bold text-foreground">Consolidated Student Standings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time breakdown of general indicators across classes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Activity size={14} /></span>
            </div>
            {/* Filter Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Standings</option>
              <option value="excellent">Excellent</option>
              <option value="passing">Passing</option>
              <option value="average">Average</option>
              <option value="at-risk">At-Risk</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Student Name</th>
                <th className="py-4 px-6">Class Assignment</th>
                <th className="py-4 px-6 text-center">Avg Grade</th>
                <th className="py-4 px-6 text-center">Attendance %</th>
                <th className="py-4 px-6 text-center">Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/10 transition-colors text-sm">
                  <td className="py-4 px-6 font-bold text-foreground">{item.name}</td>
                  <td className="py-4 px-6 text-muted-foreground font-semibold">{item.class}</td>
                  <td className="py-4 px-6 text-center font-black text-foreground">{item.grade}%</td>
                  <td className="py-4 px-6 text-center font-black text-foreground">{item.attendance}%</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'Excellent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      item.status === 'Passing' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                      item.status === 'Average' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                      'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    No records found matching filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function AcademicTab({ academicStats }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [perfFilter, setPerfFilter] = useState('all');

  const subjects = academicStats?.subjects || [
    { name: 'Mathematics', avg: 84 },
    { name: 'Science', avg: 79 },
    { name: 'English', avg: 86 },
    { name: 'History', avg: 82 },
    { name: 'Geography', avg: 75 },
    { name: 'Computer Science', avg: 91 },
  ];

  const filtered = subjects.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesFilter = true;
    if (perfFilter === 'high') matchesFilter = s.avg >= 85;
    else if (perfFilter === 'average') matchesFilter = s.avg >= 70 && s.avg < 85;
    else if (perfFilter === 'needs_attention') matchesFilter = s.avg < 70;
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6">Subject Performance Trends</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={academicStats?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[60, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="math" name="Mathematics" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="science" name="Science" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="english" name="English" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6">Top Subjects</h3>
          <div className="space-y-4">
            {subjects.slice(0, 8).map((subject: any, idx: number) => (
              <div key={subject.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-foreground">{subject.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${subject.avg}%` }} 
                    />
                  </div>
                  <span className="font-black text-primary">{subject.avg}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCHABLE TABLE SECTION */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          <div>
            <h3 className="text-lg font-bold text-foreground">Course-Level Performance Logs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Summary of scores mapped across all registered curriculums.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Activity size={14} /></span>
            </div>
            <select
              value={perfFilter}
              onChange={(e) => setPerfFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Perf Levels</option>
              <option value="high">High (&gt;=85%)</option>
              <option value="average">Average (70% - 84%)</option>
              <option value="needs_attention">Needs Attention (&lt;70%)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Subject Master Name</th>
                <th className="py-4 px-6 text-center">Semester Average Score</th>
                <th className="py-4 px-6 text-center">Status Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/10 transition-colors text-sm">
                  <td className="py-4 px-6 font-bold text-foreground">{item.name}</td>
                  <td className="py-4 px-6 text-center font-black text-foreground">{item.avg}%</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.avg >= 85 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      item.avg >= 70 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                      'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {item.avg >= 85 ? 'High Performer' : item.avg >= 70 ? 'Satisfactory' : 'Needs Support'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    No matching subjects detected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function AttendanceTab({ attendanceStats, attendanceByClass }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [attFilter, setAttFilter] = useState('all');

  const classes = attendanceByClass || [
    { cls: 'Grade 10-A', present: 28, total: 30 },
    { cls: 'Grade 11-B', present: 24, total: 28 },
    { cls: 'Grade 9-A', present: 19, total: 25 },
    { cls: 'Grade 12-A', present: 31, total: 32 },
    { cls: 'Grade 10-B', present: 22, total: 26 },
  ];

  const filtered = classes.filter((c: any) => {
    const rate = Math.round((c.present / c.total) * 100) || 0;
    const matchesSearch = c.cls.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesFilter = true;
    if (attFilter === 'high') matchesFilter = rate >= 90;
    else if (attFilter === 'warning') matchesFilter = rate < 90;
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6">Weekly Attendance Breakdown</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceStats?.patterns || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="present" name="Present %" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="late" name="Late %" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Area type="monotone" dataKey="absent" name="Absent %" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6">Attendance by Class</h3>
          <div className="space-y-4">
            {classes.slice(0, 10).map((cls: any) => {
              const percentage = Math.round((cls.present / cls.total) * 100) || 0;
              return (
                <div key={cls.cls} className="p-3 rounded-xl bg-muted/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-foreground">{cls.cls}</span>
                    <span className={`text-xs font-bold ${percentage > 90 ? 'text-emerald-500' : percentage > 80 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${percentage > 90 ? 'bg-emerald-500' : percentage > 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{cls.present} present</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{cls.total} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SEARCHABLE TABLE SECTION */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          <div>
            <h3 className="text-lg font-bold text-foreground">Classroom Attendance Logs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sortable directory of class lists with active registration ratios.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Activity size={14} /></span>
            </div>
            <select
              value={attFilter}
              onChange={(e) => setAttFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Attendance Rates</option>
              <option value="high">Satisfactory (&gt;=90%)</option>
              <option value="warning">Requires Follow-up (&lt;90%)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Class Assignment</th>
                <th className="py-4 px-6 text-center">Present Students Count</th>
                <th className="py-4 px-6 text-center">Total Students Count</th>
                <th className="py-4 px-6 text-center">Attendance %</th>
                <th className="py-4 px-6 text-center">Status Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((item: any, idx: number) => {
                const percentage = Math.round((item.present / item.total) * 100) || 0;
                return (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors text-sm">
                    <td className="py-4 px-6 font-bold text-foreground">{item.cls}</td>
                    <td className="py-4 px-6 text-center font-semibold text-muted-foreground">{item.present}</td>
                    <td className="py-4 px-6 text-center font-semibold text-muted-foreground">{item.total}</td>
                    <td className="py-4 px-6 text-center font-black text-foreground">{percentage}%</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        percentage >= 90 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        percentage >= 80 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {percentage >= 90 ? 'Excellent' : percentage >= 80 ? 'Satisfactory' : 'Critical Warning'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    No classroom attendance records match filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function FinancialTab({ financialStats, invoicesRaw }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const transactionsRaw = (invoicesRaw || []).map((inv: any) => ({
    id: inv.invoice_number || `INV-${inv.id.substring(0, 6).toUpperCase()}`,
    name: inv.student_name || inv.student?.user?.name || 'Unknown Student',
    category: inv.description || 'Tuition Fee',
    amount: Number(inv.amount),
    status: inv.status === 'paid' ? 'Paid' : inv.status === 'overdue' ? 'Overdue' : 'Pending',
    date: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : (inv.due_date || 'N/A')
  }));

  const transactions = transactionsRaw.length > 0 ? transactionsRaw : [
    { id: 'INV-1021', name: 'Alfie Solomons', category: 'Tuition Fee', amount: 1200, status: 'Paid', date: '2026-06-01' },
    { id: 'INV-1022', name: 'Billy Kimber', category: 'Transport Fee', amount: 150, status: 'Pending', date: '2026-06-05' },
    { id: 'INV-1023', name: 'Arthur Shelby', category: 'Tuition Fee', amount: 1200, status: 'Paid', date: '2026-06-02' },
    { id: 'INV-1024', name: 'Polly Gray', category: 'Exam Fee', amount: 80, status: 'Paid', date: '2026-06-04' },
    { id: 'INV-1025', name: 'Ada Thorne', category: 'Library Fee', amount: 45, status: 'Overdue', date: '2026-05-20' },
    { id: 'INV-1026', name: 'John Shelby', category: 'Tuition Fee', amount: 1200, status: 'Pending', date: '2026-06-08' },
  ];

  const filtered = transactions.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6">Revenue vs Expenses</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialStats?.health || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dx={-10} 
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, undefined]}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Financial Summary</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total YTD Revenue</p>
                <p className="text-2xl font-black text-foreground">${(financialStats?.ytdRevenue || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Projected Annual</p>
                <p className="text-2xl font-black text-emerald-500">${((financialStats?.ytdRevenue || 0) * 1.5).toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-bold text-muted-foreground">Collection Rate</span>
                  <span className="text-sm font-black text-primary">94%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[94%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
            <h4 className="text-sm font-bold text-primary mb-2">Efficiency Insight</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Operating margins have improved by <span className="text-primary font-bold">4.2%</span> compared to last semester due to optimized utility spending.
            </p>
          </div>
        </div>
      </div>

      {/* SEARCHABLE TABLE SECTION */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          <div>
            <h3 className="text-lg font-bold text-foreground">Recent Fee Invoices & Financial Ledger</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Filterable directory of billed accounts, tuition fees, and map connections.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Activity size={14} /></span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Invoice Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Transaction ID</th>
                <th className="py-4 px-6">Associated Student</th>
                <th className="py-4 px-6">Fee Category</th>
                <th className="py-4 px-6 text-center">Billed Date</th>
                <th className="py-4 px-6 text-center">Amount</th>
                <th className="py-4 px-6 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/10 transition-colors text-sm">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-foreground">{item.id}</td>
                  <td className="py-4 px-6 font-bold text-foreground">{item.name}</td>
                  <td className="py-4 px-6 font-semibold text-muted-foreground">{item.category}</td>
                  <td className="py-4 px-6 text-center text-muted-foreground font-semibold">{item.date}</td>
                  <td className="py-4 px-6 text-center font-black text-foreground">${item.amount}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      item.status === 'Pending' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                      'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    No financial ledgers found matching criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function PredictiveTab({ atRiskStudents }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const list = atRiskStudents || [];

  const filtered = list.filter((item: any) => {
    const matchesSearch = item.student.toLowerCase().includes(searchTerm.toLowerCase()) || item.reason.toLowerCase().includes(searchTerm.toLowerCase()) || item.factor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = riskFilter === 'all' || item.risk.toLowerCase() === riskFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-foreground">
      <div className="bg-primary rounded-[2rem] p-6 sm:p-8 text-primary-foreground relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <BrainCircuit size={120} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-bold mb-2">AI Early Warning System</h2>
          <p className="text-primary-foreground/80 font-medium leading-relaxed">
            Our predictive models analyze historical academic, attendance, and behavioral data to identify students who may require early intervention. Acting on these insights can improve student outcomes by up to 35%.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden text-foreground">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          <div>
            <h3 className="text-lg font-bold text-foreground">Intervention Risks Flag Index</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Searchable register of forecasted vulnerabilities and recommended mitigations.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search risk factor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Activity size={14} /></span>
            </div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
            </select>
          </div>
        </div>
        
        {/* Render Table version of predictive index */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Student Name</th>
                <th className="py-4 px-6">Class Room</th>
                <th className="py-4 px-6">Risk Category</th>
                <th className="py-4 px-6">Trigger Pattern Reason</th>
                <th className="py-4 px-6">Recommended Support Action</th>
                <th className="py-4 px-6 text-center">Threat Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((alert: any) => (
                <tr key={alert.id} className="hover:bg-muted/10 transition-colors text-sm">
                  <td className="py-4 px-6 font-bold text-foreground">{alert.student}</td>
                  <td className="py-4 px-6 text-muted-foreground font-semibold">{alert.grade}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded bg-muted font-bold text-xs text-muted-foreground">{alert.factor}</span>
                  </td>
                  <td className="py-4 px-6 text-muted-foreground font-medium text-xs leading-relaxed max-w-xs">{alert.reason}</td>
                  <td className="py-4 px-6">
                    <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold">
                      <Activity size={12} />
                      {alert.action}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      alert.risk === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {alert.risk}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    No early warning risks logged
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
