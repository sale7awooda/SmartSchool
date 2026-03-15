'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { fetchRoute, searchAddress } from '@/lib/routing';
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

const TransportMap = dynamic(() => import('@/components/transport/TransportMap'), { ssr: false });

export default function TransportPage() {
  const { user } = useAuth();
  const { can, isAdmin, isRole } = usePermissions();
  const [activeTab, setActiveTab] = useState<'routes' | 'tracking'>('routes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin State
  const [routes, setRoutes] = useState<BusRoute[]>(MOCK_BUS_ROUTES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentRoute, setCurrentRoute] = useState<Partial<BusRoute>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Map & Route Planning State
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAddingStop, setIsAddingStop] = useState(false);

  // Mock live tracking state
  const [liveLocation, setLiveLocation] = useState({ lat: 34.0522, lng: -118.2437 });
  const [droppedOffStudents, setDroppedOffStudents] = useState<string[]>([]);

  // Supabase Realtime state
  const [supabase, setSupabase] = useState<any>(null);
  const [channels, setChannels] = useState<Record<string, RealtimeChannel>>({});
  const [liveBusLocations, setLiveBusLocations] = useState<Record<string, {lat: number, lng: number}>>({});

  useEffect(() => {
    // Initialize Supabase client
    const url = typeof window !== 'undefined' ? localStorage.getItem('SUPABASE_URL') : null;
    const key = typeof window !== 'undefined' ? localStorage.getItem('SUPABASE_ANON_KEY') : null;
    
    if (url && key) {
      const client = createClient(url, key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupabase(client);
      console.log('Connected to Supabase Realtime');
    } else {
      console.warn('Supabase URL or Key not found. Please configure in Settings > Advanced Configurations.');
    }
  }, []);

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

  // Update route coordinates when stops change
  useEffect(() => {
    async function updateRoute() {
      if (currentRoute.stops && currentRoute.stops.length >= 2) {
        const coords = currentRoute.stops.map(s => s.coordinates).filter(Boolean) as {lat: number, lng: number}[];
        if (coords.length >= 2) {
          const routeData = await fetchRoute(coords);
          if (routeData) {
            setRouteCoordinates(routeData.routeCoordinates);
          }
        } else {
          setRouteCoordinates([]);
        }
      } else {
        setRouteCoordinates([]);
      }
    }
    updateRoute();
  }, [currentRoute.stops]);

  // Join Supabase Realtime channels
  useEffect(() => {
    if (!supabase) return;
    
    const isParent = user?.role === 'parent';
    const isStaff = user?.role === 'staff' || user?.role === 'teacher';
    const isAdminRole = user?.role === 'schoolAdmin';

    const parentStudent = isParent && user?.studentId 
      ? MOCK_STUDENTS.find(s => s.id === user.studentId) 
      : null;
    
    const parentRoute = parentStudent?.busRouteId 
      ? routes.find(r => r.id === parentStudent.busRouteId) 
      : null;

    const staffRoute = isStaff 
      ? routes.find(r => r.attendantId === user?.id) 
      : null;

    const routeIdsToJoin: string[] = [];
    if (isParent && parentRoute) {
      routeIdsToJoin.push(parentRoute.id);
    } else if (isStaff && staffRoute) {
      routeIdsToJoin.push(staffRoute.id);
    } else if (isAdminRole) {
      // Admins join all active routes for fleet tracking
      routes.forEach(route => {
        if (route.status !== 'Not Started') {
          routeIdsToJoin.push(route.id);
        }
      });
    }

    const newChannels: Record<string, RealtimeChannel> = {};

    routeIdsToJoin.forEach(routeId => {
      const channel = supabase.channel(`route:${routeId}`)
        .on('broadcast', { event: 'location_update' }, (payload: any) => {
          setLiveBusLocations(prev => ({
            ...prev,
            [payload.payload.routeId]: { lat: payload.payload.lat, lng: payload.payload.lng }
          }));
        })
        .subscribe();
      newChannels[routeId] = channel;
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChannels(newChannels);

    return () => {
      Object.values(newChannels).forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [supabase, user, routes]);

  if (!user) return null;

  if (!can('view', 'transport')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const isParent = isRole(['parent']);
  const isStaff = isRole(['staff', 'teacher']);

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
    if (!selectedLocation || !selectedStudent) {
      toast.error('Please select a student and their location on the map.');
      return;
    }

    const newStop: BusStop = {
      id: `stop-${Date.now()}`,
      name: selectedStudent.name + "'s Stop",
      arrivalTime: '00:00 AM', // In a real app, calculate this based on ETA
      coordinates: selectedLocation,
      studentId: selectedStudent.id
    };

    setCurrentRoute(prev => ({
      ...prev,
      stops: [...(prev.stops || []), newStop]
    }));

    // Reset adding state
    setIsAddingStop(false);
    setSelectedStudent(null);
    setSelectedLocation(null);
    setStudentSearchQuery('');
    setAddressSearchQuery('');
    setAddressResults([]);
    toast.success('Stop added to route.');
  };

  const handleAddressSearch = async () => {
    if (!addressSearchQuery) return;
    const results = await searchAddress(addressSearchQuery);
    setAddressResults(results);
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
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Transport & Tracking</h1>
        <p className="text-muted-foreground mt-2 font-medium">
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
                <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden relative h-96">
                  {/* Map Background */}
                  <div className="absolute inset-0 bg-muted">
                    <TransportMap 
                      stops={parentRoute.stops.map(s => ({
                        lat: s.coordinates?.lat || 0,
                        lng: s.coordinates?.lng || 0,
                        name: s.name,
                        studentName: MOCK_STUDENTS.find(st => st.id === s.studentId)?.name,
                        eta: s.arrivalTime
                      })).filter(s => s.lat !== 0)}
                      liveBusLocation={liveBusLocations[parentRoute.id] || { lat: 39.7850, lng: -89.6450 }} // Fallback to mock if no live data
                    />
                  </div>

                  {/* Status Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 bg-card/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Status</p>
                      <p className="text-lg font-bold text-primary flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/100"></span>
                        </span>
                        {parentRoute.status}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{parentRoute.liveStatus}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Est. Arrival</p>
                      <p className="text-xl font-bold text-foreground">10 mins</p>
                    </div>
                  </div>
                </div>

                {/* Route Timeline */}
                <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                    <Navigation size={20} className="text-primary" />
                    Route Timeline
                  </h3>
                  <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                    {parentRoute.stops.map((stop, index) => {
                      const isCompleted = index < 1; // Mock completed status
                      const isNext = index === 1;
                      
                      return (
                        <div key={stop.id} className="relative">
                          <div className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 ${
                            isCompleted ? 'bg-emerald-500/100/100 border-emerald-500 text-primary-foreground' :
                            isNext ? 'bg-card border-primary text-primary' :
                            'bg-card border-border text-slate-300'
                          }`}>
                            {isCompleted && <CheckCircle2 size={12} />}
                            {isNext && <div className="w-2 h-2 bg-primary rounded-full" />}
                          </div>
                          <div className={`p-4 rounded-xl border transition-all ${
                            isNext ? 'bg-primary/10 border-primary/20 shadow-sm' : 'bg-card border-border'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-bold ${isNext ? 'text-indigo-900' : 'text-foreground'}`}>{stop.name}</h4>
                                {parentStudent?.stopId === stop.id && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-md uppercase">
                                    Your Stop
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-bold text-muted-foreground">{stop.arrivalTime}</span>
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
                <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4">Driver Details</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                      <User size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-foreground">{MOCK_DRIVERS.find(d => d.id === parentRoute.driverId)?.name}</p>
                      <p className="text-sm text-muted-foreground">License: {MOCK_DRIVERS.find(d => d.id === parentRoute.driverId)?.licenseNumber}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors">
                      <Phone size={18} />
                      Call Driver
                    </button>
                    {parentRoute.attendantName && (
                      <div className="p-4 bg-muted rounded-xl border border-border">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Bus Attendant</p>
                        <p className="font-bold text-foreground">{parentRoute.attendantName}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{parentRoute.attendantPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4">Vehicle Info</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-xl">
                      <span className="text-sm font-medium text-muted-foreground">Bus Number</span>
                      <span className="font-bold text-foreground">{parentRoute.busNumber}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-xl">
                      <span className="text-sm font-medium text-muted-foreground">Route ID</span>
                      <span className="font-bold text-foreground">{parentRoute.routeNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-12 bg-card rounded-[2rem] border border-border">
              <Bus size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-foreground">No Bus Assigned</h3>
              <p className="text-muted-foreground mt-2">Please contact the school administration to assign a bus route.</p>
            </div>
          )}
        </div>
      )}

      {/* Admin View */}
      {isAdmin() && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-[1.5rem] border border-border shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTab('routes')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'routes' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Routes List
              </button>
              <button 
                onClick={() => setActiveTab('tracking')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'tracking' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Live Map
              </button>
              <button 
                onClick={() => handleOpenModal('create')}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-primary-foreground shadow-md hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Add Route
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all"
              />
            </div>
          </div>

          {activeTab === 'routes' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoutes.map(route => (
                <div key={route.id} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{route.routeNumber}</h3>
                      <p className="text-sm font-medium text-muted-foreground">{route.busNumber}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      route.status === 'In Transit' ? 'bg-emerald-500/100/20 text-emerald-500' :
                      route.status === 'Arrived at School' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {route.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <User size={16} className="text-muted-foreground" />
                      <span>Driver: {MOCK_DRIVERS.find(d => d.id === route.driverId)?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <MapPin size={16} className="text-muted-foreground" />
                      <span>{route.currentLocation || 'Unknown Location'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Clock size={16} className="text-muted-foreground" />
                      <span>{route.stops.length} Stops</span>
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
          ) : (
            <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden h-[600px] relative flex items-center justify-center bg-muted">
              <TransportMap 
                stops={routes.flatMap(r => r.stops).map(s => ({
                  lat: s.coordinates?.lat || 0,
                  lng: s.coordinates?.lng || 0,
                  name: s.name,
                  studentName: MOCK_STUDENTS.find(st => st.id === s.studentId)?.name,
                  eta: s.arrivalTime
                })).filter(s => s.lat !== 0)}
                liveBusLocation={Object.values(liveBusLocations)[0] || { lat: 39.7850, lng: -89.6450 }} // Show first active bus or mock
              />
            </div>
          )}
        </div>
      )}

      {/* Staff/Driver View */}
      {isStaff && (
        <div className="max-w-md mx-auto space-y-6">
          {staffRoute ? (
            <>
              <div className="bg-primary text-primary-foreground p-6 rounded-[2rem] shadow-lg shadow-primary/20 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-indigo-100 font-medium mb-1">Current Route</p>
                  <h2 className="text-3xl font-bold">{staffRoute.routeNumber}</h2>
                  <p className="text-indigo-100 mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Live Tracking Active
                  </p>
                </div>
                <Bus className="absolute -right-6 -bottom-6 text-primary/50 w-48 h-48" />
              </div>

              {/* Map View for Staff */}
              <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden relative h-64">
                <div className="absolute inset-0 bg-muted">
                  <TransportMap 
                    stops={staffRoute.stops.map(s => ({
                      lat: s.coordinates?.lat || 0,
                      lng: s.coordinates?.lng || 0,
                      name: s.name,
                      studentName: MOCK_STUDENTS.find(st => st.id === s.studentId)?.name,
                      eta: s.arrivalTime
                    })).filter(s => s.lat !== 0)}
                    liveBusLocation={liveBusLocations[staffRoute.id] || { lat: 39.7850, lng: -89.6450 }} // Fallback to mock if no live data
                  />
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-md p-3 rounded-xl border border-border shadow-sm flex items-center justify-between z-10">
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</p>
                   <p className="text-sm font-bold text-foreground">{staffRoute.currentLocation}</p>
                </div>
              </div>

              <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Route Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleStatusUpdate(staffRoute.id, 'In Transit')}
                    className="p-4 rounded-xl bg-emerald-500/100/10 text-emerald-500 font-bold hover:bg-emerald-500/100/20 transition-colors flex flex-col items-center gap-2"
                  >
                    <Navigation size={24} />
                    Start Trip
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(staffRoute.id, 'Arrived at School')}
                    className="p-4 rounded-xl bg-muted text-foreground font-bold hover:bg-muted transition-colors flex flex-col items-center gap-2"
                  >
                    <CheckCircle2 size={24} />
                    End Trip
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (channels[staffRoute.id]) {
                      // Simulate moving slightly from the default mock location
                      const currentLoc = liveBusLocations[staffRoute.id] || { lat: 39.7850, lng: -89.6450 };
                      const newLat = currentLoc.lat + (Math.random() - 0.5) * 0.01;
                      const newLng = currentLoc.lng + (Math.random() - 0.5) * 0.01;
                      channels[staffRoute.id].send({
                        type: 'broadcast',
                        event: 'location_update',
                        payload: { routeId: staffRoute.id, lat: newLat, lng: newLng }
                      });
                      toast.success('Location update broadcasted to all users.');
                    } else {
                      toast.error('Not connected to real-time server.');
                    }
                  }}
                  className="w-full mt-4 p-4 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin size={20} />
                  Broadcast Live GPS Update
                </button>
              </div>

              <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Student Drop-off</h3>
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
                              ? 'bg-muted border-border opacity-75' 
                              : 'bg-muted border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${
                              isDroppedOff ? 'bg-slate-200 text-muted-foreground' : 'bg-card text-foreground'
                            }`}>
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className={`font-bold text-sm ${isDroppedOff ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {student.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{stopName}</p>
                            </div>
                          </div>
                          {isDroppedOff ? (
                            <span className="px-3 py-1.5 bg-slate-200 text-muted-foreground text-xs font-bold rounded-lg flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Arrived
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleDropOff(student.id, student.name)}
                              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
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
            <div className="text-center p-12 bg-card rounded-[2rem] border border-border">
              <Bus size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-foreground">No Route Assigned</h3>
              <p className="text-muted-foreground mt-2">You are not currently assigned to any bus route.</p>
            </div>
          )}
        </div>
      )}

      {/* Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden border border-border max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
                <h2 className="text-xl font-bold text-foreground">
                  {modalMode === 'create' ? 'Add New Route' : modalMode === 'edit' ? 'Edit Route' : 'Route Details'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-card rounded-xl border border-border text-muted-foreground hover:text-muted-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Route Number</label>
                    <input 
                      type="text" 
                      value={currentRoute.routeNumber || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, routeNumber: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. R-101"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Bus Number</label>
                    <input 
                      type="text" 
                      value={currentRoute.busNumber || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, busNumber: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. BUS-42"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Driver</label>
                    <select 
                      value={currentRoute.driverId || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, driverId: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Driver</option>
                      {MOCK_DRIVERS.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Attendant (Supervisor)</label>
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
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Attendant</option>
                      {MOCK_USERS.filter(u => ['staff', 'teacher'].includes(u.role)).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Stops</label>
                      {modalMode !== 'view' && !isAddingStop && (
                        <button onClick={() => setIsAddingStop(true)} className="text-xs font-bold text-primary hover:text-primary flex items-center gap-1">
                          <Plus size={14} /> Add Stop
                        </button>
                      )}
                    </div>
                    
                    {isAddingStop && modalMode !== 'view' && (
                      <div className="p-4 bg-muted border border-border rounded-xl space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-sm">New Stop</h4>
                          <button onClick={() => setIsAddingStop(false)} className="text-muted-foreground hover:text-foreground"><X size={16}/></button>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1">Select Student</label>
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input 
                              type="text" 
                              value={studentSearchQuery}
                              onChange={(e) => setStudentSearchQuery(e.target.value)}
                              placeholder="Search student name..."
                              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            {studentSearchQuery && !selectedStudent && (
                              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {MOCK_STUDENTS.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())).map(student => (
                                  <button
                                    key={student.id}
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setStudentSearchQuery(student.name);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                  >
                                    {student.name} ({student.grade})
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedStudent && (
                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1">Location (Search or Click Map)</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={addressSearchQuery}
                                onChange={(e) => setAddressSearchQuery(e.target.value)}
                                placeholder="Search address..."
                                className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button onClick={handleAddressSearch} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">Search</button>
                            </div>
                            {addressResults.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {addressResults.map((res, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      setSelectedLocation({ lat: res.lat, lng: res.lng });
                                      setAddressResults([]);
                                      setAddressSearchQuery(res.name.split(',')[0]);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs bg-card border border-border rounded-lg hover:bg-muted truncate"
                                  >
                                    {res.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            {selectedLocation && (
                              <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-600 text-xs font-bold">
                                <CheckCircle2 size={14} /> Location Selected
                              </div>
                            )}
                          </div>
                        )}

                        <button 
                          onClick={handleAddStop}
                          disabled={!selectedStudent || !selectedLocation}
                          className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50"
                        >
                          Add to Route
                        </button>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {currentRoute.stops?.map((stop, index) => (
                        <div key={index} className="flex flex-col gap-2 p-3 bg-muted border border-border rounded-xl">
                          <div className="flex justify-between items-start">
                            <div className="font-bold text-sm">{stop.name}</div>
                            {modalMode !== 'view' && (
                              <button onClick={() => handleRemoveStop(index)} className="text-destructive hover:bg-destructive/10 p-1 rounded-md transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="flex gap-3">
                            <input 
                              type="text" 
                              value={stop.arrivalTime}
                              onChange={(e) => handleUpdateStop(index, 'arrivalTime', e.target.value)}
                              disabled={modalMode === 'view'}
                              className="w-32 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              placeholder="ETA (e.g. 07:30 AM)"
                            />
                            {stop.studentId && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <User size={12} className="mr-1" />
                                {MOCK_STUDENTS.find(s => s.id === stop.studentId)?.name || 'Student'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!currentRoute.stops || currentRoute.stops.length === 0) && !isAddingStop && (
                        <div className="text-center py-8 text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-xl">
                          No stops added yet. Click &quot;Add Stop&quot; to begin.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-[400px] lg:h-auto min-h-[400px] bg-muted rounded-xl border border-border overflow-hidden relative">
                    <TransportMap 
                      stops={(currentRoute.stops || []).map(s => ({
                        lat: s.coordinates?.lat || 0,
                        lng: s.coordinates?.lng || 0,
                        name: s.name,
                        studentName: MOCK_STUDENTS.find(st => st.id === s.studentId)?.name,
                        eta: s.arrivalTime
                      })).filter(s => s.lat !== 0)}
                      interactive={modalMode !== 'view' && isAddingStop}
                      onLocationSelect={(lat, lng) => setSelectedLocation({lat, lng})}
                      selectedLocation={selectedLocation}
                      routeCoordinates={routeCoordinates}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-colors"
                >
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button 
                    onClick={handleSaveRoute}
                    className="px-6 py-3 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
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
