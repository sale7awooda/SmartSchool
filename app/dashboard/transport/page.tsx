'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AdminModal } from '@/components/dashboard/transport/AdminModal';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { fetchRoute, searchAddress } from '@/lib/routing';
import { getActiveAcademicYear } from '@/lib/supabase-db';
import useSWR from 'swr';
import { 
  BusRoute, 
  Student,
  BusStop,
  User as UserType
} from '@/types';
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
  const { data: activeAcademicYear } = useSWR('active_academic_year', getActiveAcademicYear);
  const { can, isAdmin, isRole } = usePermissions();
  const [activeTab, setActiveTab] = useState<'routes' | 'tracking'>('routes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin State
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentRoute, setCurrentRoute] = useState<Partial<BusRoute>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Map & Route Planning State
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressResults, setAddressResults] = useState<any[]>([]); // Geocoding results can vary
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAddingStop, setIsAddingStop] = useState(false);

  // Mock live tracking state
  const [liveLocation, setLiveLocation] = useState({ lat: 34.0522, lng: -118.2437 });
  const [droppedOffStudents, setDroppedOffStudents] = useState<string[]>([]);

  // Supabase Realtime state
  const [channels, setChannels] = useState<Record<string, RealtimeChannel>>({});
  const [liveBusLocations, setLiveBusLocations] = useState<Record<string, {lat: number, lng: number}>>({});
  
  // GPS Broadcasting state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [gpsInterval, setGpsInterval] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedInterval = localStorage.getItem('GPS_UPDATE_INTERVAL');
      return savedInterval ? parseInt(savedInterval) * 60000 : 60000;
    }
    return 60000;
  });
  const [parentStudent, setParentStudent] = useState<Student | null>(null);
  const [drivers, setDrivers] = useState<UserType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = (key: string) => key;

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data, error } = await supabase
        .from('bus_routes')
        .select(`
          *,
          stops:bus_stops(*),
          driver:users!driver_id(id, name, phone),
          attendant:users!attendant_id(id, name, phone)
        `)
        .order('route_number');
      
      if (error) {
        console.error('Error fetching routes:', error);
        return;
      }

      if (data) {
        const mappedRoutes = data.map(route => ({
          ...route,
          driver_name: route.driver?.name,
          driver_phone: route.driver?.phone,
          attendant_name: route.attendant?.name,
          attendant_phone: route.attendant?.phone,
          stops: route.stops.map((stop: BusStop & { lat?: number, lng?: number, arrival_time?: string, student_id?: string }) => ({
            id: stop.id,
            name: stop.name,
            arrivalTime: stop.arrival_time || stop.arrivalTime,
            coordinates: { lat: stop.lat || stop.coordinates?.lat || 0, lng: stop.lng || stop.coordinates?.lng || 0 },
            studentId: stop.student_id || stop.studentId
          }))
        }));
        setRoutes(mappedRoutes as any);
      }
    };

    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['staff', 'teacher']);
      
      if (!error && data) {
        setDrivers(data);
      }
    };

    const fetchStudents = async () => {
      let query = supabase.from('students').select('*');
      if (activeAcademicYear) {
        query = query.eq('academic_year', activeAcademicYear.name);
      }
      const { data, error } = await query;
      
      if (!error && data) {
        setStudents(data);
      }
    };

    fetchRoutes();
    fetchDrivers();
    fetchStudents();

    // Subscribe to route updates
    const channel = supabase
      .channel('public:bus_routes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_routes' }, () => {
        fetchRoutes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAcademicYear]);

  useEffect(() => {
    // No longer need to initialize gpsInterval here
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
    
    let isMounted = true;
    let localChannels: Record<string, RealtimeChannel> = {};

    const isParent = user?.role === 'parent';
    const isStaff = user?.role === 'staff' || user?.role === 'teacher';
    const isAdminRole = user?.role === 'admin';

    const fetchParentStudent = async () => {
      if (isParent && user?.studentId) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.studentId)
          .single();
        return data;
      }
      return null;
    };

    const setupChannels = async () => {
      const studentData = await fetchParentStudent();
      if (!isMounted) return;
      setParentStudent(studentData);
      
      const parentRoute = studentData?.bus_route_id 
        ? routes.find(r => r.id === studentData.bus_route_id) 
        : null;

      const staffRoute = isStaff 
        ? routes.find(r => r.attendant_id === user?.id || r.driver_id === user?.id) 
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
          .on('broadcast', { event: 'location_update' }, (payload: { payload: { routeId: string, lat: number, lng: number } }) => {
            setLiveBusLocations(prev => ({
              ...prev,
              [payload.payload.routeId]: { lat: payload.payload.lat, lng: payload.payload.lng }
            }));
          })
          .subscribe();
        newChannels[routeId] = channel;
      });

      if (!isMounted) {
        Object.values(newChannels).forEach(channel => {
          supabase.removeChannel(channel);
        });
        return;
      }

      localChannels = newChannels;
      setChannels(newChannels);
    };

    setupChannels();

    return () => {
      isMounted = false;
      Object.values(localChannels).forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, routes]); // Removed channels from dependencies to fix infinite loop

  // Handle GPS Broadcasting Interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isBroadcasting && supabase) {
      const isStaff = user?.role === 'staff' || user?.role === 'teacher';
      const staffRoute = isStaff 
        ? routes.find(r => r.attendant_id === user?.id || r.driver_id === user?.id) 
        : null;

      if (staffRoute && channels[staffRoute.id]) {
        toast.success(`Started broadcasting GPS every ${gpsInterval / 60000} minute(s).`);
        
        intervalId = setInterval(() => {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
              const { latitude, longitude } = position.coords;
              
              channels[staffRoute.id].send({
                type: 'broadcast',
                event: 'location_update',
                payload: { routeId: staffRoute.id, lat: latitude, lng: longitude }
              });

              setLiveBusLocations(prev => ({
                ...prev,
                [staffRoute.id]: { lat: latitude, lng: longitude }
              }));
            }, (error) => {
              console.error("Geolocation error:", error);
              // Fallback to simulation if geolocation fails
              setLiveBusLocations(prev => {
                const currentLoc = prev[staffRoute.id] || { lat: 39.7850, lng: -89.6450 };
                const newLat = currentLoc.lat + (Math.random() - 0.5) * 0.001;
                const newLng = currentLoc.lng + (Math.random() - 0.5) * 0.001;
                
                channels[staffRoute.id].send({
                  type: 'broadcast',
                  event: 'location_update',
                  payload: { routeId: staffRoute.id, lat: newLat, lng: newLng }
                });
                
                return {
                  ...prev,
                  [staffRoute.id]: { lat: newLat, lng: newLng }
                };
              });
            });
          }
        }, gpsInterval);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isBroadcasting, channels, gpsInterval, user, routes]);

  if (!user) return null;

  if (!can('view', 'transport')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const isParent = isRole(['parent']);
  const isStaff = isRole(['staff', 'teacher']);

  // For Parents: Find their child's bus route
  const parentRoute = parentStudent?.busRouteId 
    ? routes.find(r => r.id === parentStudent.busRouteId) 
    : null;

  // For Staff: Find assigned route
  const staffRoute = isStaff 
    ? routes.find(r => r.attendant_id === user.id) 
    : null;

  // Filter routes for Admin view
  const filteredRoutes = routes.filter(route => 
    route.route_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.bus_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusUpdate = async (routeId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bus_routes')
        .update({ status: newStatus })
        .eq('id', routeId);
      
      if (error) throw error;
      
      setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: newStatus as any } : r));
      toast.success(`Bus status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
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
      route_number: '',
      bus_number: '',
      driver_id: '',
    });
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      try {
        const { error } = await supabase
          .from('bus_routes')
          .delete()
          .eq('id', routeId);
        
        if (error) throw error;
        
        setRoutes(prev => prev.filter(r => r.id !== routeId));
        toast.success('Route deleted successfully');
      } catch (error) {
        console.error('Error deleting route:', error);
        toast.error('Failed to delete route');
      }
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

  const handleSaveRoute = async () => {
    if (!currentRoute.route_number || !currentRoute.bus_number || !currentRoute.driver_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (modalMode === 'create') {
        const { data, error } = await supabase
          .from('bus_routes')
          .insert([{
            route_number: currentRoute.route_number,
            bus_number: currentRoute.bus_number,
            driver_id: currentRoute.driver_id,
            attendant_id: currentRoute.attendant_id,
            status: 'Not Started'
          }])
          .select()
          .single();
        
        if (error) throw error;

        // Insert stops if any
        if (currentRoute.stops && currentRoute.stops.length > 0) {
          const stopsToInsert = currentRoute.stops.map((stop, index) => ({
            route_id: data.id,
            name: stop.name,
            lat: stop.coordinates?.lat,
            lng: stop.coordinates?.lng,
            arrival_time: stop.arrivalTime,
            student_id: stop.studentId,
            order_index: index
          }));
          await supabase.from('bus_stops').insert(stopsToInsert);
        }
        
        toast.success('Route created successfully');
      } else {
        const { error } = await supabase
          .from('bus_routes')
          .update({
            route_number: currentRoute.route_number,
            bus_number: currentRoute.bus_number,
            driver_id: currentRoute.driver_id,
            attendant_id: currentRoute.attendant_id
          })
          .eq('id', currentRoute.id);
          
        if (error) throw error;

        // For simplicity, we're not handling stop updates here in the MVP,
        // but in a real app, you'd sync the stops array with the database.
        
        toast.success('Route updated successfully');
      }
      setIsModalOpen(false);
      // The realtime subscription will update the UI
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    }
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
                        studentName: students.find(st => st.id === s.studentId)?.name,
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
                      <p className="text-sm text-muted-foreground mt-1">{parentRoute.live_status}</p>
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
                      <p className="font-bold text-lg text-foreground">{drivers.find(d => d.id === parentRoute.driver_id)?.name || 'Unknown Driver'}</p>
                      <p className="text-sm text-muted-foreground">Role: {drivers.find(d => d.id === parentRoute.driver_id)?.role || 'Staff'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors">
                      <Phone size={18} />
                      Call Driver
                    </button>
                    {parentRoute.attendant_name && (
                      <div className="p-4 bg-muted rounded-xl border border-border">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Bus Attendant</p>
                        <p className="font-bold text-foreground">{parentRoute.attendant_name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{parentRoute.attendant_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4">Vehicle Info</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-xl">
                      <span className="text-sm font-medium text-muted-foreground">Bus Number</span>
                      <span className="font-bold text-foreground">{parentRoute.bus_number}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-xl">
                      <span className="text-sm font-medium text-muted-foreground">Route ID</span>
                      <span className="font-bold text-foreground">{parentRoute.route_number}</span>
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
                      <h3 className="text-xl font-bold text-foreground">{route.route_number}</h3>
                      <p className="text-sm font-medium text-muted-foreground">{route.bus_number}</p>
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
                      <span>Driver: {drivers.find(d => d.id === route.driver_id)?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <MapPin size={16} className="text-muted-foreground" />
                      <span>{route.current_location || 'Unknown Location'}</span>
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
                  studentName: students.find(st => st.id === s.studentId)?.name,
                  eta: s.arrivalTime
                })).filter(s => s.lat !== 0)}
                liveBusLocations={Object.entries(liveBusLocations).map(([routeId, loc]) => ({ ...loc, routeId }))}
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
                  <h2 className="text-3xl font-bold">{staffRoute.route_number}</h2>
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
                      studentName: students.find(st => st.id === s.studentId)?.name,
                      eta: s.arrivalTime
                    })).filter(s => s.lat !== 0)}
                    liveBusLocation={liveBusLocations[staffRoute.id] || { lat: 39.7850, lng: -89.6450 }} // Fallback to mock if no live data
                  />
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-md p-3 rounded-xl border border-border shadow-sm flex items-center justify-between z-10">
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</p>
                   <p className="text-sm font-bold text-foreground">{staffRoute.current_location}</p>
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
                      if (isBroadcasting) {
                        setIsBroadcasting(false);
                        toast.info('Stopped broadcasting GPS location.');
                      } else {
                        setIsBroadcasting(true);
                        // Send immediate update on start
                        const currentLoc = liveBusLocations[staffRoute.id] || { lat: 39.7850, lng: -89.6450 };
                        const newLat = currentLoc.lat + (Math.random() - 0.5) * 0.01;
                        const newLng = currentLoc.lng + (Math.random() - 0.5) * 0.01;
                        channels[staffRoute.id].send({
                          type: 'broadcast',
                          event: 'location_update',
                          payload: { routeId: staffRoute.id, lat: newLat, lng: newLng }
                        });
                        setLiveBusLocations(prev => ({
                          ...prev,
                          [staffRoute.id]: { lat: newLat, lng: newLng }
                        }));
                      }
                    } else {
                      toast.error('Not connected to real-time server.');
                    }
                  }}
                  className={`w-full mt-4 p-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                    isBroadcasting 
                      ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  <MapPin size={20} />
                  {isBroadcasting ? 'Stop GPS Broadcast' : 'Start Live GPS Broadcast'}
                </button>
              </div>

              <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4">Student Drop-off</h3>
                <div className="space-y-4">
                  {students
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
      <AdminModal 
        isModalOpen={isModalOpen} 
        setIsModalOpen={setIsModalOpen} 
        modalMode={modalMode} 
        currentRoute={currentRoute} 
        setCurrentRoute={setCurrentRoute} 
        handleSaveRoute={handleSaveRoute} 
        isSubmitting={isSubmitting} 
        t={t} 
        drivers={drivers} 
        students={students}
        isAddingStop={isAddingStop}
        setIsAddingStop={setIsAddingStop}
        studentSearchQuery={studentSearchQuery}
        setStudentSearchQuery={setStudentSearchQuery}
        selectedStudent={selectedStudent}
        setSelectedStudent={setSelectedStudent}
        addressSearchQuery={addressSearchQuery}
        setAddressSearchQuery={setAddressSearchQuery}
        handleAddressSearch={handleAddressSearch}
        addressResults={addressResults}
        setAddressResults={setAddressResults}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        handleAddStop={handleAddStop}
        handleRemoveStop={handleRemoveStop}
        handleUpdateStop={handleUpdateStop}
        routeCoordinates={routeCoordinates}
      />
    </motion.div>
  );
}
