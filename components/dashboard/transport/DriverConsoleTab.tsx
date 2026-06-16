'use client';

import dynamic from 'next/dynamic';
import { 
  Bus, 
  Navigation, 
  CheckCircle2, 
  MapPin, 
  User 
} from 'lucide-react';
import { BusRoute, Student, User as UserType } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AlertTriangle } from 'lucide-react';

const TransportMap = dynamic(() => import('@/components/transport/TransportMap'), { ssr: false });


interface DriverConsoleTabProps {
  staffRoute: BusRoute | null;
  students: Student[];
  liveBusLocations: Record<string, { lat: number; lng: number }>;
  setLiveBusLocations: React.Dispatch<React.SetStateAction<Record<string, { lat: number; lng: number }>>>;
  channels: Record<string, RealtimeChannel>;
  isBroadcasting: boolean;
  setIsBroadcasting: (val: boolean) => void;
  droppedOffStudents: string[];
  handleStatusUpdate: (routeId: string, status: string) => void;
  handleDropOff: (studentId: string, studentName: string) => void;
  gpsInterval: number;
  setGpsInterval: (val: number) => void;
}

export function DriverConsoleTab({
  staffRoute,
  students,
  liveBusLocations,
  setLiveBusLocations,
  channels,
  isBroadcasting,
  setIsBroadcasting,
  droppedOffStudents,
  handleStatusUpdate,
  handleDropOff,
  gpsInterval,
  setGpsInterval
}: DriverConsoleTabProps) {

  if (!staffRoute) {
    return (
      <div className="text-center p-12 bg-card rounded-[2rem] border border-border max-w-md mx-auto">
        <Bus size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-foreground">No Route Assigned</h3>
        <p className="text-muted-foreground mt-2">You are not currently assigned to any bus route.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
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
          <ErrorBoundary name="DriverConsoleTab Map" fallback={
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-card">
              <AlertTriangle className="text-destructive h-8 w-8 mb-2 animate-pulse" />
              <p className="font-semibold text-sm">Failed to Load Map</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Leaflet rendering encountered an error. Ensure Mapbox token is correct.
              </p>
            </div>
          }>
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
          </ErrorBoundary>
        </div>
        <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-md p-3 rounded-xl border border-border shadow-sm flex items-center justify-between z-10">
           <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</p>
           <p className="text-sm font-bold text-foreground">{staffRoute.current_location || 'Not Broadcasting'}</p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4">Route Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleStatusUpdate(staffRoute.id, 'In Transit')}
            className="p-4 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20 transition-colors flex flex-col items-center gap-2"
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

        <div className="mt-6 pt-6 border-t border-border/40">
           <div className="flex items-center justify-between mb-3">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Broadcast Frequency</p>
             <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
               Every {gpsInterval / 60000} min{gpsInterval / 60000 > 1 ? 's' : ''}
             </span>
           </div>
           <div className="flex gap-2">
             {[1, 5, 10].map((mins) => (
               <button
                 key={mins}
                 onClick={() => {
                   const val = mins * 60000;
                   setGpsInterval(val);
                   localStorage.setItem('GPS_UPDATE_INTERVAL', mins.toString());
                   toast.success(`GPS update interval set to ${mins} minute(s)`);
                 }}
                 className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                   gpsInterval === mins * 60000 
                     ? 'bg-primary text-primary-foreground border-primary' 
                     : 'bg-card text-muted-foreground border-border hover:bg-muted'
                 }`}
               >
                 {mins}m
               </button>
             ))}
           </div>
           <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
             Lower intervals provide more accurate tracking but consume more battery and data. 1 minute is recommended during active transit.
           </p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4">Student Drop-off</h3>
        <div className="space-y-4">
          {students
            .filter(s => s.busRouteId === staffRoute.id)
            .sort((a, b) => {
              const stopIndexA = staffRoute.stops?.findIndex(stop => stop.id === a.stopId) ?? -1;
              const stopIndexB = staffRoute.stops?.findIndex(stop => stop.id === b.stopId) ?? -1;
              return stopIndexA - stopIndexB;
            })
            .map(student => {
              const isDroppedOff = droppedOffStudents.includes(student.id);
              const stopName = staffRoute.stops?.find(stop => stop.id === student.stopId)?.name || 'Unknown Stop';
              
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
    </div>
  );
}
