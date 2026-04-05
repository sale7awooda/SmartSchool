'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { getPaginatedInventory, createInventoryItem } from '@/lib/supabase-db';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, Search, Calendar, Wrench, Laptop, MonitorPlay, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: response, isLoading, mutate } = useSWR(
    ['inventory', page, debouncedSearch],
    ([_, p, s]) => getPaginatedInventory(p, limit, s)
  );

  const inventory = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalCount = response?.count || 0;

  if (!user) return null;

  if (!can('view', 'inventory')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const assetData = {
      name: formData.get('name'),
      category: formData.get('category'),
      status: 'Available',
    };

    setIsSubmittingAsset(true);
    try {
      await createInventoryItem(assetData);
      toast.success("Asset added successfully");
      setIsAddAssetOpen(false);
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add asset");
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage school assets and equipment.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="space-y-6">
          <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
              <div>
                <h2 className="text-xl font-bold text-foreground">Asset Management</h2>
                <p className="text-sm font-medium text-muted-foreground mt-1">Track equipment and maintenance schedules</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search assets..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
                  />
                </div>
                {can('create', 'inventory') && (
                  <button 
                    onClick={() => setIsAddAssetOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Plus size={16} />
                    Add Asset
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Asset Details</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Next Maintenance</th>
                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-4 text-right">
                          <Skeleton className="h-8 w-8 rounded-lg inline-block" />
                        </td>
                      </tr>
                    ))
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">No assets found.</td>
                    </tr>
                  ) : inventory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                            {item.category === 'Laptop' && <Laptop size={20} />}
                            {item.category === 'Projector' && <MonitorPlay size={20} />}
                            {item.category === 'Sports' && <Activity size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground font-medium">ID: {item.id} • {item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-foreground">{item.assignedTo}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          item.status === 'Available' ? 'bg-emerald-500/100/20 text-emerald-500' : 
                          item.status === 'In Use' ? 'bg-blue-500/20 text-blue-500' : 
                          'bg-amber-100 text-amber-500'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          {item.nextMaintenance}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        {can('manage', 'inventory') && (
                          <button 
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                            title="Schedule Maintenance"
                          >
                            <Wrench size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    Page <span className="text-foreground font-bold">{page}</span> of <span className="text-foreground font-bold">{totalPages}</span>
                  </span>
                  <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4">
                    Total: <span className="text-foreground font-bold">{totalCount}</span>
                  </span>
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {isAddAssetOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-border flex flex-col max-h-[90vh]"
                >
                  <div className="p-6 sm:p-8 border-b border-border bg-muted/50 shrink-0">
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New Asset</h2>
                    <p className="text-sm font-medium text-muted-foreground mt-2">Register a new item in the school inventory.</p>
                  </div>
                  
                  <form onSubmit={handleAddAsset} className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Asset Name</label>
                      <input required name="name" type="text" placeholder="e.g., Dell Latitude 3420" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Category</label>
                        <select required name="category" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground">
                          <option value="Laptop">Laptop</option>
                          <option value="Projector">Projector</option>
                          <option value="Sports">Sports Equipment</option>
                          <option value="Furniture">Furniture</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Assigned To</label>
                        <input required name="assigned_to" type="text" placeholder="e.g., Room 101" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Next Maintenance Date</label>
                      <input type="date" className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/50 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground" />
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button 
                        type="button"
                        onClick={() => setIsAddAssetOpen(false)}
                        className="flex-1 px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-background border border-border hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingAsset}
                        className="flex-1 px-4 py-3.5 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                      >
                        {isSubmittingAsset ? <Loader2 size={20} className="animate-spin" /> : 'Add Asset'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
