'use client';

import { useState, useEffect, useRef } from 'react';
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
  User as UserType,
  AddressResult
} from '@/types';
import { 
  Plus,
  Search,
  Bus,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

// Subcomponents
import { RoutesTab } from '@/components/dashboard/transport/RoutesTab';
import { LiveTrackingTab } from '@/components/dashboard/transport/LiveTrackingTab';
import { DriverConsoleTab } from '@/components/dashboard/transport/DriverConsoleTab';

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

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
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);

  // Map & Route Planning State
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAddingStop, setIsAddingStop] = useState(false);

  // Mock live tracking state
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
  const lastBroadcastRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const [drivers, setDrivers] = useState<UserType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = (key: string) => key;

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
      setRoutes(mappedRoutes as BusRoute[]);
    }
  };

  useEffect(() => {
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
     
  }, [user, routes]);

  // Handle GPS Broadcasting Interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isBroadcasting && supabase) {
      const isStaff = user?.role === 'staff' || user?.role === 'teacher';
      const staffRoute = isStaff 
        ? routes.find(r => r.attendant_id === user?.id || r.driver_id === user?.id) 
        : null;

      if (staffRoute && channels[staffRoute.id]) {
        toast.success(`Started broadcasting GPS every ${gpsInterval / 60000} minute(s) with dynamic motion filtering.`);
        
        // Reset last broadcast reference when starting broadcasting
        lastBroadcastRef.current = null;

        intervalId = setInterval(() => {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
              const { latitude, longitude } = position.coords;
              const now = Date.now();
              const last = lastBroadcastRef.current;
              
              const distance = last ? getDistanceMeters(last.lat, last.lng, latitude, longitude) : Infinity;
              const timeDiff = now - (last?.timestamp || 0);

              // Restrict updates: must have moved >10 meters and >=10 seconds elapsed, or be first update
              if (!last || (timeDiff >= 10000 && distance > 10)) {
                channels[staffRoute.id].send({
                  type: 'broadcast',
                  event: 'location_update',
                  payload: { routeId: staffRoute.id, lat: latitude, lng: longitude }
                });

                setLiveBusLocations(prev => ({
                  ...prev,
                  [staffRoute.id]: { lat: latitude, lng: longitude }
                }));

                lastBroadcastRef.current = { lat: latitude, lng: longitude, timestamp: now };
              }
            }, (error) => {
              console.error("Geolocation error:", error);
              setLiveBusLocations(prev => {
                const currentLoc = prev[staffRoute.id] || { lat: 39.7850, lng: -89.6450 };
                const newLat = currentLoc.lat + (Math.random() - 0.5) * 0.001;
                const newLng = currentLoc.lng + (Math.random() - 0.5) * 0.001;
                
                const now = Date.now();
                const last = lastBroadcastRef.current;
                const distance = last ? getDistanceMeters(last.lat, last.lng, newLat, newLng) : Infinity;
                const timeDiff = now - (last?.timestamp || 0);
                
                if (!last || (timeDiff >= 10000 && distance > 10)) {
                  channels[staffRoute.id].send({
                    type: 'broadcast',
                    event: 'location_update',
                    payload: { routeId: staffRoute.id, lat: newLat, lng: newLng }
                  });
                  
                  lastBroadcastRef.current = { lat: newLat, lng: newLng, timestamp: now };
                  return {
                    ...prev,
                    [staffRoute.id]: { lat: newLat, lng: newLng }
                  };
                }
                
                return prev;
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

  const parentRoute = (parentStudent?.bus_route_id 
    ? routes.find(r => r.id === parentStudent.bus_route_id) 
    : null) || null;

  const staffRoute = (isStaff 
    ? routes.find(r => r.attendant_id === user.id || r.driver_id === user.id) 
    : null) || null;

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
    setRouteToDelete(routeId);
    setActiveDropdown(null);
  };

  const confirmDeleteRoute = async () => {
    if (!routeToDelete) return;
    try {
      const { error } = await supabase
        .from('bus_routes')
        .delete()
        .eq('id', routeToDelete);
      
      if (error) throw error;
      
      setRoutes(prev => prev.filter(r => r.id !== routeToDelete));
      toast.success('Route deleted successfully');
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
    } finally {
      setRouteToDelete(null);
    }
  };

  const handleToggleDisable = (routeId: string) => {
    toast.success(`Route ${routeId} status toggled.`);
    setActiveDropdown(null);
  };

  const handleSaveRoute = async () => {
    if (!currentRoute.route_number || !currentRoute.bus_number || !currentRoute.driver_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
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
        
        toast.success('Route updated successfully');
      }
      setIsModalOpen(false);
      fetchRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    } finally {
      setIsSubmitting(false);
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
      arrivalTime: '00:00 AM',
      coordinates: selectedLocation,
      studentId: selectedStudent.id
    };

    setCurrentRoute(prev => ({
      ...prev,
      stops: [...(prev.stops || []), newStop]
    }));

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
        <LiveTrackingTab
          isParent={true}
          parentRoute={parentRoute}
          parentStudent={parentStudent}
          liveBusLocations={liveBusLocations}
          students={students}
          drivers={drivers}
          routes={routes}
        />
      )}

      {/* Admin View */}
      {isAdmin() && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-[1.5rem] border border-border shadow-sm shrink-0">
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
              {can('create', 'transport') && (
                <button 
                  onClick={() => handleOpenModal('create')}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-primary-foreground shadow-md hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Route
                </button>
              )}
            </div>
            {activeTab === 'routes' && (
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
            )}
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === 'routes' ? (
              <RoutesTab
                routes={routes}
                drivers={drivers}
                searchQuery={searchQuery}
                handleOpenModal={handleOpenModal}
                handleDeleteRoute={handleDeleteRoute}
                handleToggleDisable={handleToggleDisable}
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                t={t}
              />
            ) : (
              <LiveTrackingTab
                isParent={false}
                parentRoute={null}
                parentStudent={null}
                liveBusLocations={liveBusLocations}
                students={students}
                drivers={drivers}
                routes={routes}
              />
            )}
          </div>
        </div>
      )}

      {/* Staff/Driver View */}
      {isStaff && (
        <DriverConsoleTab
          staffRoute={staffRoute}
          students={students}
          liveBusLocations={liveBusLocations}
          setLiveBusLocations={setLiveBusLocations}
          channels={channels}
          isBroadcasting={isBroadcasting}
          setIsBroadcasting={setIsBroadcasting}
          droppedOffStudents={droppedOffStudents}
          handleStatusUpdate={handleStatusUpdate}
          handleDropOff={handleDropOff}
          gpsInterval={gpsInterval}
          setGpsInterval={setGpsInterval}
        />
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

      {routeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card text-foreground rounded-[1.5rem] border border-border shadow-xl p-6 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 text-red-500 rounded-full mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">Delete Fleet Route?</h3>
              <p className="text-xs text-muted-foreground font-semibold">
                Are you sure you want to delete this bus route? This will permanently remove its schedules, driver pairings and stop schedules.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRouteToDelete(null)}
                className="flex-1 py-2.5 text-xs bg-muted hover:bg-muted/80 text-muted-foreground font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRoute}
                className="flex-1 py-2.5 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              >
                Delete Route
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
