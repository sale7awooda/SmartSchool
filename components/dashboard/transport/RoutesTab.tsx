'use client';

import { 
  User, 
  MapPin, 
  Clock, 
  MoreVertical, 
  Edit, 
  UserPlus, 
  Power, 
  Trash2 
} from 'lucide-react';
import { BusRoute, User as UserType } from '@/types';

interface RoutesTabProps {
  routes: BusRoute[];
  drivers: UserType[];
  searchQuery: string;
  handleOpenModal: (mode: 'create' | 'edit' | 'view', route?: BusRoute) => void;
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
  handleDeleteRoute,
  handleToggleDisable,
  activeDropdown,
  setActiveDropdown,
  t
}: RoutesTabProps) {
  
  const filteredRoutes = routes.filter(route => 
    route.route_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.bus_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
      {filteredRoutes.map(route => (
        <div key={route.id} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all group relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">{route.route_number}</h3>
              <p className="text-sm font-medium text-muted-foreground">{route.bus_number}</p>
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
              <User size={16} className="text-muted-foreground" />
              <span>Driver: {drivers.find(d => d.id === route.driver_id)?.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin size={16} className="text-muted-foreground" />
              <span>{route.current_location || 'Unknown Location'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock size={16} className="text-muted-foreground" />
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
              
              {activeDropdown === route.id && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-20">
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
                    <UserPlus size={16} /> Supervisor
                  </button>
                  <button 
                    onClick={() => handleToggleDisable(route.id)}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <Power size={16} /> Disable/Enable
                  </button>
                  <button 
                    onClick={() => handleDeleteRoute(route.id)}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
