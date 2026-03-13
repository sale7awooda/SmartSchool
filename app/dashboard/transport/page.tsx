'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  MOCK_BUS_ROUTES, 
  MOCK_STUDENTS, 
  MOCK_DRIVERS, 
  MOCK_USERS,
  BusRoute, 
  Student,
  BusStop
} from '@/lib/mock-db';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Bus,
  MoreVertical,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Power,
  X,
  Save,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function TransportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'routes' | 'tracking'>('routes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin State
  const [routes, setRoutes] = useState<BusRoute[]>(MOCK_BUS_ROUTES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentRoute, setCurrentRoute] = useState<Partial<BusRoute>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Mock live tracking state
  const [liveLocation, setLiveLocation] = useState({ lat: 34.0522, lng: -118.2437 });
  const [droppedOffStudents, setDroppedOffStudents] = useState<string[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as Element).closest('.dropdown-trigger')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  if (!user) return null;

  const isAdmin = ['superadmin', 'schoolAdmin'].includes(user.role);
  const isParent = user.role === 'parent';
  const isStaff = user.role === 'staff' || user.role === 'teacher';

  // For Parents: Find their child's bus route
  const parentStudent = isParent && user.studentId 
    ? MOCK_STUDENTS.find(s => s.id === user.studentId) 
    : null;
  
  const parentRoute = parentStudent?.busRouteId 
    ? routes.find(r => r.id === parentStudent.busRouteId) 
    : null;

  // For Staff: Find assigned route
  const staffRoute = isStaff 
    ? routes.find(r => r.attendantId === user.id) 
    : null;

  // Filter routes for Admin view
  const filteredRoutes = routes.filter(route => 
    route.routeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.busNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusUpdate = (routeId: string, newStatus: string) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: newStatus as any } : r));
    toast.success(`Bus status updated to: ${newStatus}`);
  };

  const handleDropOff = (studentId: string, studentName: string) => {
    setDroppedOffStudents(prev => [...prev, studentId]);
    toast.success(`Notification sent: ${studentName} has been dropped off.`);
  };

  // Admin Actions
  const handleOpenModal = (mode: 'create' | 'edit' | 'view', route?: BusRoute) => {
    setModalMode(mode);
    setCurrentRoute(route ? { ...route } : { 
      stops: [], 
      status: 'Not Started',
      routeNumber: '',
      busNumber: '',
      driverId: '',
    });
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDeleteRoute = (routeId: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      setRoutes(prev => prev.filter(r => r.id !== routeId));
      toast.success('Route deleted successfully');
    }
    setActiveDropdown(null);
  };

  const handleToggleDisable = (routeId: string) => {
    // For MVP, we'll just toggle status to 'Completed' as a proxy for "Disabled" or add a visual indicator
    // In a real app, we'd have an 'isActive' flag.
    // Let's simulate by appending (Disabled) to the route number for now or just toast
    toast.success(`Route ${routeId} status toggled.`);
    setActiveDropdown(null);
  };

  const handleSaveRoute = () => {
    if (!currentRoute.routeNumber || !currentRoute.busNumber || !currentRoute.driverId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (modalMode === 'create') {
      const newRoute: BusRoute = {
        ...currentRoute as BusRoute,
        id: `route-${Date.now()}`,
        status: 'Not Started',
        stops: currentRoute.stops || []
      };
      setRoutes(prev => [...prev, newRoute]);
      toast.success('Route created successfully');
    } else {
      setRoutes(prev => prev.map(r => r.id === currentRoute.id ? currentRoute as BusRoute : r));
      toast.success('Route updated successfully');
    }
    setIsModalOpen(false);
  };

  const handleAddStop = () => {
    const newStop: BusStop = {
      id: `stop-${Date.now()}`,
      name: '',
      arrivalTime: ''
    };
    setCurrentRoute(prev => ({
      ...prev,
      stops: [...(prev.stops || []), newStop]
    }));
  };

  const handleUpdateStop = (index: number, field: keyof BusStop, value: string) => {
    const newStops = [...(currentRoute.stops || [])];
    newStops[index] = { ...newStops[index], [field]: value };
    setCurrentRoute(prev => ({ ...prev, stops: newStops }));
  };

  const handleRemoveStop = (index: number) => {
    const newStops = [...(currentRoute.stops || [])];
    newStops.splice(index, 1);
    setCurrentRoute(prev => ({ ...prev, stops: newStops }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transport & Tracking</h1>
        <p className="text-slate-500 mt-2 font-medium">
          {isParent ? "Track your child's bus and view route details." : "Manage bus routes, drivers, and live tracking."}
        </p>
      </div>

      {/* Parent View */}
      {isParent && (
        <div className="space-y-6">
          {parentRoute ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Status Card */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative h-96">
                  {/* Mock Map Background */}
                  <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                    <div className="text-center opacity-40">
                      <MapPin size={48} className="mx-auto mb-2 text-slate-400" />
                      <p className="font-bold text-slate-500">Live Map Simulation</p>
                    </div>
                    {/* Simulated Bus Icon moving */}
                    <motion.div 
                      animate={{ 
                        x: [0, 50, 0, -50, 0],
                        y: [0, 20, 0, -20, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                      className="absolute"
                    >
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white z-10">
                        <Bus size={20} />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-600 rounded-full animate-ping opacity-75"></div>
                    </motion.div>
                  </div>

                  {/* Status Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</p>
                      <p className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                        {parentRoute.status}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{parentRoute.liveStatus}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Arrival</p>
                      <p className="text-xl font-bold text-slate-900">10 mins</p>
                    </div>
                  </div>
                </div>

                {/* Route Timeline */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Navigation size={20} className="text-indigo-600" />
                    Route Timeline
                  </h3>
                  <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {parentRoute.stops.map((stop, index) => {
                      const isCompleted = index < 1; // Mock completed status
                      const isNext = index === 1;
                      
                      return (
                        <div key={stop.id} className="relative">
                          <div className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 ${
                            isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                            isNext ? 'bg-white border-indigo-600 text-indigo-600' :
                            'bg-white border-slate-300 text-slate-300'
                          }`}>
                            {isCompleted && <CheckCircle2 size={12} />}
                            {isNext && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                          </div>
                          <div className={`p-4 rounded-xl border transition-all ${
                            isNext ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white border-slate-100'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-bold ${isNext ? 'text-indigo-900' : 'text-slate-900'}`}>{stop.name}</h4>
                                {parentStudent?.stopId === stop.id && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md uppercase">
                                    Your Stop
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-bold text-slate-500">{stop.arrivalTime}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle Info */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Driver Details</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-slate-900">{MOCK_DRIVERS.find(d => d.id === parentRoute.driverId)?.name}</p>
                      <p className="text-sm text-slate-500">License: {MOCK_DRIVERS.find(d => d.id === parentRoute.driverId)?.licenseNumber}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors">
                      <Phone size={18} />
                      Call Driver
                    </button>
                    {parentRoute.attendantName && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bus Attendant</p>
                        <p className="font-bold text-slate-900">{parentRoute.attendantName}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{parentRoute.attendantPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Vehicle Info</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm font-medium text-slate-500">Bus Number</span>
                      <span className="font-bold text-slate-900">{parentRoute.busNumber}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm font-medium text-slate-500">Route ID</span>
                      <span className="font-bold text-slate-900">{parentRoute.routeNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100">
              <Bus size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900">No Bus Assigned</h3>
              <p className="text-slate-500 mt-2">Please contact the school administration to assign a bus route.</p>
            </div>
          )}
        </div>
      )}

      {/* Admin View */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTab('routes')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'routes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Routes List
              </button>
              <button 
                onClick={() => setActiveTab('tracking')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'tracking' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Live Map
              </button>
              <button 
                onClick={() => handleOpenModal('create')}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Add Route
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {activeTab === 'routes' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoutes.map(route => (
                <div key={route.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{route.routeNumber}</h3>
                      <p className="text-sm font-medium text-slate-500">{route.busNumber}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      route.status === 'In Transit' ? 'bg-emerald-100 text-emerald-700' :
                      route.status === 'Arrived at School' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {route.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <User size={16} className="text-slate-400" />
                      <span>Driver: {MOCK_DRIVERS.find(d => d.id === route.driverId)?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      <span>{route.currentLocation || 'Unknown Location'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Clock size={16} className="text-slate-400" />
                      <span>{route.stops.length} Stops</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal('view', route)}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition-colors"
                    >
                      View Details
                    </button>
                    <div className="relative dropdown-trigger">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === route.id ? null : route.id);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {activeDropdown === route.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20">
                          <button 
                            onClick={() => handleOpenModal('edit', route)}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit size={16} /> Edit Route
                          </button>
                          <button 
                            onClick={() => handleOpenModal('edit', route)}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <UserPlus size={16} /> Supervisor
                          </button>
                          <button 
                            onClick={() => handleToggleDisable(route.id)}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Power size={16} /> Disable/Enable
                          </button>
                          <button 
                            onClick={() => handleDeleteRoute(route.id)}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
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
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden h-[600px] relative flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MapPin size={64} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-900">Live Fleet Tracking</h3>
                <p className="text-slate-500 mt-2">Map view showing all active buses would appear here.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff/Driver View */}
      {isStaff && (
        <div className="max-w-md mx-auto space-y-6">
          {staffRoute ? (
            <>
              <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-indigo-100 font-medium mb-1">Current Route</p>
                  <h2 className="text-3xl font-bold">{staffRoute.routeNumber}</h2>
                  <p className="text-indigo-100 mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Live Tracking Active
                  </p>
                </div>
                <Bus className="absolute -right-6 -bottom-6 text-indigo-500/50 w-48 h-48" />
              </div>

              {/* Map View for Staff */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative h-64">
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                  <div className="text-center opacity-40">
                    <MapPin size={48} className="mx-auto mb-2 text-slate-400" />
                    <p className="font-bold text-slate-500">Live Map Simulation</p>
                  </div>
                  <motion.div 
                    animate={{ 
                      x: [0, 50, 0, -50, 0],
                      y: [0, 20, 0, -20, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="absolute"
                  >
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white z-10">
                      <Bus size={20} />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-600 rounded-full animate-ping opacity-75"></div>
                  </motion.div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</p>
                   <p className="text-sm font-bold text-slate-900">{staffRoute.currentLocation}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Route Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleStatusUpdate(staffRoute.id, 'In Transit')}
                    className="p-4 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors flex flex-col items-center gap-2"
                  >
                    <Navigation size={24} />
                    Start Trip
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(staffRoute.id, 'Arrived at School')}
                    className="p-4 rounded-xl bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-colors flex flex-col items-center gap-2"
                  >
                    <CheckCircle2 size={24} />
                    End Trip
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Student Drop-off</h3>
                <div className="space-y-4">
                  {MOCK_STUDENTS
                    .filter(s => s.busRouteId === staffRoute.id)
                    .sort((a, b) => {
                      const stopIndexA = staffRoute.stops.findIndex(stop => stop.id === a.stopId);
                      const stopIndexB = staffRoute.stops.findIndex(stop => stop.id === b.stopId);
                      return stopIndexA - stopIndexB;
                    })
                    .map(student => {
                      const isDroppedOff = droppedOffStudents.includes(student.id);
                      const stopName = staffRoute.stops.find(stop => stop.id === student.stopId)?.name || 'Unknown Stop';
                      
                      return (
                        <div 
                          key={student.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isDroppedOff 
                              ? 'bg-slate-100 border-slate-200 opacity-75' 
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${
                              isDroppedOff ? 'bg-slate-200 text-slate-500' : 'bg-white text-slate-700'
                            }`}>
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className={`font-bold text-sm ${isDroppedOff ? 'text-slate-500' : 'text-slate-900'}`}>
                                {student.name}
                              </p>
                              <p className="text-xs text-slate-500">{stopName}</p>
                            </div>
                          </div>
                          {isDroppedOff ? (
                            <span className="px-3 py-1.5 bg-slate-200 text-slate-500 text-xs font-bold rounded-lg flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Arrived
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleDropOff(student.id, student.name)}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
                            >
                              Drop Off
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100">
              <Bus size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900">No Route Assigned</h3>
              <p className="text-slate-500 mt-2">You are not currently assigned to any bus route.</p>
            </div>
          )}
        </div>
      )}

      {/* Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add New Route' : modalMode === 'edit' ? 'Edit Route' : 'Route Details'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Route Number</label>
                    <input 
                      type="text" 
                      value={currentRoute.routeNumber || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, routeNumber: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. R-101"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bus Number</label>
                    <input 
                      type="text" 
                      value={currentRoute.busNumber || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, busNumber: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. BUS-42"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Driver</label>
                    <select 
                      value={currentRoute.driverId || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, driverId: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Driver</option>
                      {MOCK_DRIVERS.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attendant (Supervisor)</label>
                    <select 
                      value={currentRoute.attendantId || ''}
                      onChange={(e) => {
                        const attendant = MOCK_USERS.find(u => u.id === e.target.value);
                        setCurrentRoute({
                          ...currentRoute, 
                          attendantId: e.target.value,
                          attendantName: attendant?.name,
                          attendantPhone: attendant?.phone
                        });
                      }}
                      disabled={modalMode === 'view'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Attendant</option>
                      {MOCK_USERS.filter(u => ['staff', 'teacher'].includes(u.role)).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Stops</label>
                    {modalMode !== 'view' && (
                      <button onClick={handleAddStop} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        <Plus size={14} /> Add Stop
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentRoute.stops?.map((stop, index) => (
                      <div key={index} className="flex gap-3">
                        <input 
                          type="text" 
                          value={stop.name}
                          onChange={(e) => handleUpdateStop(index, 'name', e.target.value)}
                          disabled={modalMode === 'view'}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Stop Name"
                        />
                        <input 
                          type="text" 
                          value={stop.arrivalTime}
                          onChange={(e) => handleUpdateStop(index, 'arrivalTime', e.target.value)}
                          disabled={modalMode === 'view'}
                          className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Time"
                        />
                        {modalMode !== 'view' && (
                          <button onClick={() => handleRemoveStop(index)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    {(!currentRoute.stops || currentRoute.stops.length === 0) && (
                      <div className="text-center py-4 text-slate-400 text-sm italic">No stops added yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button 
                    onClick={handleSaveRoute}
                    className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Save size={18} />
                    Save Route
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
