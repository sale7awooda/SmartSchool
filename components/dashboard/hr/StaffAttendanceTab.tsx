'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import useSWR from 'swr';
import { getPaginatedStaff } from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase/client';
import { Clock, Search, Save, Calendar, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';

// Sample data for initial setup
export function StaffAttendanceTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  
  const { data: staffData, isLoading } = useSWR(['staff_all'], () => getPaginatedStaff(1, 100));
  
  const [attendance, setAttendance] = useState<Record<string, { status: string, timeIn: string, timeOut: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // initialize logic
    const fetchData = async () => {
      if (!staffData?.data) return;
      
      const { data: records, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('date', date);

      const init: Record<string, any> = {};
      
      staffData.data.forEach(staff => {
        const found = records?.find(r => r.staff_id === staff.id);
        if (found) {
          init[staff.id] = { status: found.status, timeIn: found.time_in, timeOut: found.time_out };
        } else {
          init[staff.id] = { status: 'present', timeIn: '08:00', timeOut: '15:00' };
        }
      });
      setAttendance(init);
    };
    
    fetchData();
  }, [staffData, date]);

  const handleStatusChange = (id: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [id]: { ...prev[id], status }
    }));
  };

  const handleTimeChange = (id: string, field: 'timeIn' | 'timeOut', value: string) => {
    setAttendance(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const recordsToSave = Object.entries(attendance).map(([staffId, record]) => ({
        staff_id: staffId,
        date: date,
        status: record.status,
        time_in: record.timeIn,
        time_out: record.timeOut
      }));
      // we need to insert/upsert in supabase
      const { error } = await supabase.from('staff_attendance').upsert(recordsToSave, { onConflict: 'staff_id, date' });
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, we fallback
          throw new Error('staff_attendance table does not exist');
        }
        throw error;
      }
      toast.success('Attendance records saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = staffData?.data?.filter(staff => 
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    staff.role.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Daily Staff Attendance</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Record and manage staff attendance.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-1">
              <button 
                onClick={() => {
                  const [y, m, d] = date.split('-').map(Number);
                  const newDate = new Date(y, m - 1, d - 1);
                  setDate(newDate.toLocaleDateString('en-CA')); // YYYY-MM-DD local
                }}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                title="Previous Day"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hidden sm:block" />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-2 sm:pl-9 pr-2 sm:pr-4 py-1.5 bg-transparent text-sm font-bold focus:outline-none w-auto max-w-[130px] sm:max-w-max"
                />
              </div>
              <button 
                onClick={() => {
                  const [y, m, d] = date.split('-').map(Number);
                  const newDate = new Date(y, m - 1, d + 1);
                  setDate(newDate.toLocaleDateString('en-CA'));
                }}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                title="Next Day"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-70"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Records'}
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-border bg-card">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search staff by name or role..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-muted/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Staff Member</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Time In</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Time Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading staff...</td></tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{staff.name}</p>
                          <p className="text-xs font-medium text-muted-foreground capitalize">{staff.role}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleStatusChange(staff.id, 'present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            attendance[staff.id]?.status === 'present' 
                              ? 'bg-emerald-500 text-white shadow-sm' 
                              : 'bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500'
                          }`}
                        >
                          <CheckCircle2 size={14} />
                          Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(staff.id, 'absent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            attendance[staff.id]?.status === 'absent' 
                              ? 'bg-red-500 text-white shadow-sm' 
                              : 'bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                          }`}
                        >
                          <AlertTriangle size={14} />
                          Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(staff.id, 'late')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            attendance[staff.id]?.status === 'late' 
                              ? 'bg-amber-500 text-white shadow-sm' 
                              : 'bg-muted text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500'
                          }`}
                        >
                          <Clock size={14} />
                          Late
                        </button>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <input 
                        type="time" 
                        value={attendance[staff.id]?.timeIn || ''}
                        onChange={(e) => handleTimeChange(staff.id, 'timeIn', e.target.value)}
                        disabled={attendance[staff.id]?.status === 'absent'}
                        className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                      />
                    </td>
                    
                    <td className="p-4 text-center">
                      <input 
                        type="time" 
                        value={attendance[staff.id]?.timeOut || ''}
                        onChange={(e) => handleTimeChange(staff.id, 'timeOut', e.target.value)}
                        disabled={attendance[staff.id]?.status === 'absent'}
                        className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No staff found.
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
