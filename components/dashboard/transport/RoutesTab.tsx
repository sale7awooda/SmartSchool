'use client';

import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Clock, 
  MoreVertical, 
  Edit, 
  UserPlus, 
  Power, 
  Trash2,
  Bus,
  PlusCircle,
  Users
} from 'lucide-react';
import { BusRoute, User as UserType } from '@/types';
import { useMemo, useDeferredValue } from 'react';

interface RoutesTabProps {
  routes: BusRoute[];
  drivers: UserType[];
  searchQuery: string;
  handleOpenModal: (mode: 'create' | 'edit' | 'view', route?: BusRoute, openAddStop?: boolean) => void;
  handleOpenAddStop: (route: BusRoute) => void;
  handleDeleteRoute: (routeId: string) => void;
  handleToggleDisable: (routeId: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (val: string | null) => void;
  t: (key: string) => string;
}

export function RoutesTab({
  routes,
  drivers,
  searchQuery,
  handleOpenModal,
  handleOpenAddStop,
  handleDeleteRoute,
  handleToggleDisable,
  activeDropdown,
  setActiveDropdown,
  t
}: RoutesTabProps) {
  const deferredQuery = useDeferredValue(searchQuery);
  const isSearching = searchQuery !== deferredQuery;

  const filteredRoutes = useMemo(() => {
    if (!deferredQuery) return routes;
    const q = deferredQuery.toLowerCase();
    return routes.filter(route => 
      (route.name || '').toLowerCase().includes(q) ||
      route.route_number.toLowerCase().includes(q) ||
      (route.bus_number || route.vehicle_number || '').toLowerCase().includes(q)
    );
  }, [routes, deferredQuery]);

  return (
    <AnimatePresence mode="wait">
      {isSearching ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm animate-pulse">
              <div className="h-5 w-24 bg-muted rounded-lg mb-4" />
              <div className="space-y-3 mb-6">
                <div className="h-4 w-32 bg-muted rounded-lg" />
                <div className="h-4 w-40 bg-muted rounded-lg" />
                <div className="h-4 w-20 bg-muted rounded-lg" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-muted rounded-xl" />
                <div className="w-10 h-10 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </motion.div>
      ) : filteredRoutes.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="col-span-full text-center py-16 bg-card rounded-[2rem] border border-border"
        >
          <Bus size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold text-foreground">
            {searchQuery ? 'No routes match your search' : 'No routes yet'}
          </h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? 'Try a different search term.' : 'Click "Add Route" to create the first one.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredRoutes.map((route, idx) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all group relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{route.route_number}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{route.bus_number || route.vehicle_number || '-'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  route.status === 'In Transit' ? 'bg-emerald-500/20 text-emerald-500' :
                  route.status === 'Arrived at School' ? 'bg-blue-500/20 text-blue-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {route.status}
                </span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <User size={16} className="text-muted-foreground shrink-0" />
                  <span>Driver: {drivers.find(d => d.id === route.driver_id)?.name || 'Unknown'}</span>
                </div>
                {route.attendant_name && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Users size={16} className="text-muted-foreground shrink-0" />
                    <span>Attendant: {route.attendant_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin size={16} className="text-muted-foreground shrink-0" />
                  <span>{route.current_location || 'Unknown Location'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock size={16} className="text-muted-foreground shrink-0" />
                  <span>{route.stops?.length || 0} Stops</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenModal('view', route)}
                  className="flex-1 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
                >
                  View Details
                </button>
                <div className="relative dropdown-trigger">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === route.id ? null : route.id);
                    }}
                    className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {activeDropdown === route.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 bottom-full mb-2 w-52 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-20"
                      >
                        <button 
                          onClick={() => handleOpenAddStop(route)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2 border-b border-border/50"
                        >
                          <PlusCircle size={16} className="text-emerald-500" /> Add Stop
                        </button>
                        <button 
                          onClick={() => handleOpenModal('edit', route)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <Edit size={16} /> Edit Route
                        </button>
                        <button 
                          onClick={() => handleOpenModal('edit', route)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <UserPlus size={16} /> Edit Supervisor (Attendant)
                        </button>
                        <button 
                          onClick={() => handleToggleDisable(route.id)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2 border-t border-border/50"
                        >
                          <Power size={16} /> Activate/Disable
                        </button>
                        <button 
                          onClick={() => handleDeleteRoute(route.id)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
