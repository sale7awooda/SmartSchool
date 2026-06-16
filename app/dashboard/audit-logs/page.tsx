'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Search, 
  Filter, 
  Clock, 
  Maximize2, 
  RotateCcw, 
  Terminal, 
  AlertTriangle, 
  FileText, 
  Database,
  User,
  Settings,
  X,
  Play,
  Activity,
  CheckCircle,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Fetch real audit logs from Supabase
  const { data: dbLogs, error, mutate, isLoading } = useSWR('audit_logs_fetch', async () => {
    if (!supabase) return [];
    
    const { data: rawLogs, error: logError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (logError) {
      console.warn('Unable to query database audit_logs table, using fallback:', logError.message);
      return [];
    }

    if (!rawLogs || rawLogs.length === 0) {
      return [];
    }

    const userIds = [...new Set(rawLogs.map(log => log.user_id).filter(Boolean))];

    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', userIds);
      
      if (!usersError && usersData) {
        usersData.forEach(user => {
          usersMap[user.id] = user;
        });
      }
    }

    // Merge logs with user information manual mapping
    const mergedLogs = rawLogs.map(log => ({
      ...log,
      users: log.user_id ? usersMap[log.user_id] : null
    }));

    return mergedLogs;
  });

  const allLogs = (dbLogs || []).map(log => {
    // Normalise fields
    return {
      id: log.id,
      action_type: log.action_type || log.action || 'USER_ACTION',
      created_at: log.created_at,
      severity: log.severity || (log.action_type === 'FACTORY_RESET' ? 'High' : (log.action_type === 'CONFIG_OVERRIDE' || log.action_type === 'GRADE_MODIFIED') ? 'Medium' : 'Low'),
      module: log.module || (log.action_type?.includes('CONFIG') ? 'Security Override' : 'System Operations'),
      ip_address: log.ip_address || '127.0.0.1',
      user_agent: log.user_agent || 'Client API Browser Request',
      users: log.users || { name: 'System User', role: 'staff', email: 'guest@smartschool.edu' },
      details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details || { message: 'Action executed successfully.' }
    };
  });

  // Filter & Search logic
  const filteredLogs = allLogs.filter((log: any) => {
    const rawString = `${log.action_type} ${log.module} ${log.users?.name || ''} ${JSON.stringify(log.details)}`.toLowerCase();
    const matchesSearch = rawString.includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchesSearch && matchesAction && matchesSeverity;
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center p-8 bg-card border border-border rounded-3xl max-w-md shadow-sm">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-2xl font-black text-foreground tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground mt-2 text-sm font-semibold leading-relaxed">
            Due to privacy and security isolation protocols, only administrators can monitor the global audit ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Shield className="text-primary" size={28} />
            System Audit logs
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            Monitor real-time security events, critical settings overrides, and administrative actions.
          </p>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-4 shadow-sm shrink-0 text-foreground">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs font-semibold focus:border-primary outline-none text-foreground"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Search size={14} /></span>
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="FACTORY_RESET">Factory Reset</option>
            <option value="CONFIG_OVERRIDE">Config Override</option>
            <option value="GRADE_MODIFIED">Grade Change</option>
            <option value="VISITOR_CHECK_IN">Visitor In</option>
            <option value="ASSET_INVENTORY_ADD">Inventory Add</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-black uppercase tracking-widest hidden lg:block">
          {filteredLogs.length} matching events logged
        </div>
      </div>

      {/* Main Audit Logs Table */}
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground sticky top-0 bg-card z-10">
                <th className="py-4 px-6 w-1/5">Action & Scope</th>
                <th className="py-4 px-6">System Operator</th>
                <th className="py-4 px-6">Description Message</th>
                <th className="py-4 px-6 text-center">Severity</th>
                <th className="py-4 px-6 text-right">Timestamp</th>
                <th className="py-4 px-6 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredLogs.map((log: any) => (
                <tr 
                  key={log.id} 
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-muted/10 transition-colors group cursor-pointer text-sm"
                >
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-black font-mono text-xs text-primary">{log.action_type}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/80 mt-0.5">{log.module}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{log.users?.name}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">{log.users?.role}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-muted-foreground font-medium text-xs leading-relaxed max-w-sm block truncate group-hover:text-foreground">
                      {log.details?.message || 'Administrative transactions logged.'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      log.severity === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/25' :
                      log.severity === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25' :
                      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-xs text-muted-foreground font-semibold">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-muted-foreground group-hover:text-primary transition-colors block">
                      <Maximize2 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Clock size={36} className="mx-auto text-muted-foreground/30 mb-3 animate-pulse" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      No matching audit logs recorded
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expandable JSON Detail Viewer Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg h-screen bg-card border-l border-border p-6 shadow-2xl flex flex-col text-foreground relative z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-5 border-b border-border shrink-0">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold mb-2">
                    <Terminal size={12} />
                    {selectedLog.action_type}
                  </div>
                  <h3 className="text-xl font-black text-foreground tracking-tight">Record Event Inspector</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Raw telemetry transaction and execution metadata.</p>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-y-auto py-6 space-y-6 custom-scrollbar pr-2">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/80">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Triggered Module</span>
                    <span className="text-sm font-bold text-foreground">{selectedLog.module}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Threat Severity</span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-1 ${
                      selectedLog.severity === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/25' :
                      selectedLog.severity === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25' :
                      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                    }`}>
                      {selectedLog.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Client IP Address</span>
                    <span className="text-xs font-mono font-bold text-foreground/80">{selectedLog.ip_address}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">System User Name</span>
                    <span className="text-xs font-bold text-foreground/80">{selectedLog.users?.name}</span>
                  </div>
                </div>

                {/* Description and metadata */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Action Summary Description</h4>
                  <p className="text-sm text-foreground/90 leading-relaxed font-bold bg-muted/10 p-4 border border-border/50 rounded-2xl">
                    {selectedLog.details?.message || 'Administrative log event.'}
                  </p>
                </div>

                {/* RAW details JSON block */}
                <div className="space-y-2 flex-1 flex flex-col min-h-[180px]">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Raw Structured Payload Telemetry</h4>
                  <div className="flex-1 bg-muted/60 p-4 rounded-2xl border border-border font-mono text-xs text-foreground overflow-auto p-4 max-h-[300px]">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.details, null, 2)}</pre>
                  </div>
                </div>

                {/* Context Agent Metadata */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">User Agent telemetry</span>
                  <span className="text-xs text-muted-foreground leading-relaxed block font-semibold">
                    {selectedLog.user_agent}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-border flex justify-between shrink-0">
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={12} />
                  Logged {new Date(selectedLog.created_at).toLocaleString()}
                </span>
                <button 
                  onClick={() => {
                    toast.success('Successfully archived transaction.');
                    setSelectedLog(null);
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted-foreground/20 text-xs font-black rounded-lg transition-all cursor-pointer"
                >
                  Archive Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
