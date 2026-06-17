'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { 
  Navigation, 
  CheckCircle2, 
  Phone, 
  User, 
  Bus,
  MapPin,
  Clock,
  Activity
} from 'lucide-react';
import { BusRoute, Student, User as UserType } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AlertTriangle } from 'lucide-react';

const TransportMap = dynamic(() => import('@/components/transport/TransportMap'), { ssr: false });


interface LiveTrackingTabProps {
  isParent: boolean;
  parentRoute: BusRoute | null;
  parentStudent: Student | null;
  liveBusLocations: Record<string, { lat: number; lng: number }>;
  students: Student[];
  drivers: UserType[];
  routes: BusRoute[];
}

export function LiveTrackingTab({
  isParent,
  parentRoute,
  parentStudent,
  liveBusLocations,
  students,
  drivers,
  routes
}: LiveTrackingTabProps) {

  if (isParent) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {parentRoute ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Status Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden relative h-96">
                {/* Map Background */}
                <div className="absolute inset-0 bg-muted">
                  <ErrorBoundary name="LiveTrackingTab Map" fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-card">
                      <AlertTriangle className="text-destructive h-8 w-8 mb-2 animate-pulse" />
                      <p className="font-semibold text-sm">Failed to Load Map</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                        Leaflet rendering encountered an error. Ensure Mapbox token is correct.
                      </p>
                    </div>
                  }>
                    <TransportMap 
                      stops={parentRoute.stops.map(s => ({
                        lat: s.coordinates?.lat || 0,
                        lng: s.coordinates?.lng || 0,
                        name: s.name,
                        studentName: students.find(st => st.id === s.studentId)?.name,
                        eta: s.arrivalTime
                      })).filter(s => s.lat !== 0)}
                      liveBusLocation={liveBusLocations[parentRoute.id] || { lat: 39.7850, lng: -89.6450 }}
                    />
                  </ErrorBoundary>
                </div>

                {/* Status Overlay */}
                <div className="absolute bottom-6 left-6 right-6 bg-card/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-lg flex items-center justify-between z-10">
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
                    const isCompleted = index < 1;
                    const isNext = index === 1;
                    
                    return (
                      <motion.div 
                        key={stop.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative"
                      >
                        <div className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 ${
                          isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                          isNext ? 'bg-card border-primary text-primary' :
                          'bg-card border-border text-slate-300'
                        }`}>
                          {isCompleted && <CheckCircle2 size={12} />}
                          {isNext && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                        </div>
                        <div className={`p-4 rounded-xl border transition-all ${
                          isNext ? 'bg-primary/10 border-primary/20 shadow-sm' : 'bg-card border-border'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className={`font-bold ${isNext ? 'text-indigo-900 font-black' : 'text-foreground'}`}>{stop.name}</h4>
                              {parentStudent?.stopId === stop.id && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-md uppercase">
                                  Your Stop
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-muted-foreground">{stop.arrivalTime}</span>
                          </div>
                        </div>
                      </motion.div>
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
                    <span className="font-bold text-foreground">{parentRoute.bus_number || parentRoute.vehicle_number || '-'}</span>
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
            <Bus size={48} className="mx-auto text-slate-300 mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-foreground">No Bus Assigned</h3>
            <p className="text-muted-foreground mt-2">Please contact the school administration to assign a bus route.</p>
          </div>
        )}
      </div>
    );
  }

  // Admin Fleet View
  const activeRoutes = routes.filter(r => r.status === 'In Transit');
  const completedRoutes = routes.filter(r => r.status === 'Arrived at School' || r.status === 'Completed');
  const inactiveRoutes = routes.filter(r => r.status === 'Not Started');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-4 rounded-2xl border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Bus size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{routes.length}</p>
              <p className="text-xs font-medium text-muted-foreground">Total Routes</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card p-4 rounded-2xl border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Navigation size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeRoutes.length}</p>
              <p className="text-xs font-medium text-muted-foreground">Active</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-4 rounded-2xl border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedRoutes.length}</p>
              <p className="text-xs font-medium text-muted-foreground">Completed</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card p-4 rounded-2xl border border-border shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inactiveRoutes.length}</p>
              <p className="text-xs font-medium text-muted-foreground">Inactive</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Map + Route List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route List Sidebar */}
        <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-1">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            Route Status
          </h3>
          <AnimatePresence>
            {routes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 bg-card rounded-2xl border border-border"
              >
                <Bus size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No routes available</p>
              </motion.div>
            ) : (
              routes.map((route, idx) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-card p-4 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-foreground">{route.route_number}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      route.status === 'In Transit' ? 'bg-emerald-500/20 text-emerald-500' :
                      route.status === 'Arrived at School' || route.status === 'Completed' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {route.status === 'In Transit' ? 'LIVE' : route.status === 'Arrived at School' ? 'DONE' : 'IDLE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin size={12} />
                    <span className="truncate">{route.current_location || 'No location'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <User size={12} />
                    <span className="truncate">{drivers.find(d => d.id === route.driver_id)?.name || 'No driver'}</span>
                  </div>
                  {liveBusLocations[route.id] && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      Broadcasting
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Fleet Map */}
        <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden h-[600px] relative bg-muted">
          <ErrorBoundary name="LiveTrackingTab Fleet Map" fallback={
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-card">
              <AlertTriangle className="text-destructive h-8 w-8 mb-2 animate-pulse" />
              <p className="font-semibold text-sm">Failed to Load Fleet Map</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Leaflet rendering encountered an error. Ensure Mapbox token is correct.
              </p>
            </div>
          }>
            <TransportMap 
              stops={routes.flatMap(r => r.stops || []).map(s => ({
                lat: s.coordinates?.lat || 0,
                lng: s.coordinates?.lng || 0,
                name: s.name,
                studentName: students.find(st => st.id === s.studentId)?.name,
                eta: s.arrivalTime
              })).filter(s => s.lat !== 0)}
              liveBusLocations={Object.entries(liveBusLocations).map(([routeId, loc]) => ({ ...loc, routeId }))}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
