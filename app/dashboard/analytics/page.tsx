'use client';

// Test comment

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
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import { getAcademicStats, getAttendanceStats, getFinancialStats, getAtRiskStudents, getActiveAcademicYear } from '@/lib/supabase-db';

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

  const isLoading = academicLoading || attendanceLoading || financialLoading || atRiskLoading;

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
            {activeTab === 'overview' && <OverviewTab key="overview" academicStats={academicStats} attendanceStats={attendanceStats} financialStats={financialStats} atRiskStudents={atRiskStudents} />}
            {activeTab === 'academic' && <AcademicTab key="academic" academicStats={academicStats} />}
            {activeTab === 'attendance' && <AttendanceTab key="attendance" attendanceStats={attendanceStats} />}
            {activeTab === 'financial' && <FinancialTab key="financial" financialStats={financialStats} />}
            {activeTab === 'predictive' && <PredictiveTab key="predictive" atRiskStudents={atRiskStudents} />}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function OverviewTab({ academicStats, attendanceStats, financialStats, atRiskStudents }: any) {
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
        <div className="h-[350px] min-h-[350px]">
          {academicStats?.trends && academicStats.trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={academicStats.trends}>
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
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AcademicTab({ academicStats }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-6">Subject Performance Trends</h3>
        <div className="h-[400px] min-h-[400px]">
          {academicStats?.trends && academicStats.trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={academicStats.trends}>
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
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AttendanceTab({ attendanceStats }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-6">Weekly Attendance Breakdown</h3>
        <div className="h-[400px] min-h-[400px]">
          {attendanceStats?.patterns && attendanceStats.patterns.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceStats.patterns}>
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
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FinancialTab({ financialStats }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-6">Revenue vs Expenses</h3>
        <div className="h-[400px] min-h-[400px]">
          {financialStats?.health && financialStats.health.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialStats.health}>
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
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PredictiveTab({ atRiskStudents }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
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

      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">At-Risk Students</h3>
          <p className="text-sm font-medium text-muted-foreground mt-1">Students flagged by the predictive model requiring attention.</p>
        </div>
        
        <div className="divide-y divide-border">
          {atRiskStudents?.map((alert: any) => (
            <div key={alert.id} className="p-6 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-foreground text-lg">{alert.student}</h4>
                    <span className="text-sm font-medium text-muted-foreground">{alert.grade}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      alert.risk === 'High' ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      {alert.risk} Risk
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-muted text-muted-foreground">
                      {alert.factor}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-3">
                    <span className="text-foreground font-bold">Trigger:</span> {alert.reason}
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold">
                    <Activity size={16} />
                    Recommended Action: {alert.action}
                  </div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button className="px-4 py-2 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted/50 transition-colors shadow-sm">
                    Dismiss
                  </button>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm">
                    Take Action
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
