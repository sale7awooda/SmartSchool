import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit, Bus, Users, Clock, Shield, Map, CheckCircle2, User as UserIcon, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
const TransportMap = dynamic(() => import('@/components/transport/TransportMap'), { ssr: false });
import Image from 'next/image';

import { BusRoute, User, Student, BusStop } from '@/types';

interface AdminModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  modalMode: 'create' | 'edit' | 'view';
  currentRoute: Partial<BusRoute>;
  setCurrentRoute: (route: Partial<BusRoute>) => void;
  handleSaveRoute: () => Promise<void>;
  isSubmitting: boolean;
  t: (key: string) => string;
  drivers: User[];
  students: Student[];
  isAddingStop: boolean;
  setIsAddingStop: (isAdding: boolean) => void;
  studentSearchQuery: string;
  setStudentSearchQuery: (query: string) => void;
  selectedStudent: Student | null;
  setSelectedStudent: (student: Student | null) => void;
  addressSearchQuery: string;
  setAddressSearchQuery: (query: string) => void;
  handleAddressSearch: () => void;
  addressResults: any[];
  setAddressResults: (results: any[]) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void;
  handleAddStop: () => void;
  handleRemoveStop: (index: number) => void;
  handleUpdateStop: (index: number, field: keyof BusStop, value: string) => void;
  routeCoordinates: [number, number][];
}

export function AdminModal({ 
  isModalOpen, 
  setIsModalOpen, 
  modalMode, 
  currentRoute, 
  setCurrentRoute, 
  handleSaveRoute, 
  isSubmitting, 
  t, 
  drivers,
  students,
  isAddingStop,
  setIsAddingStop,
  studentSearchQuery,
  setStudentSearchQuery,
  selectedStudent,
  setSelectedStudent,
  addressSearchQuery,
  setAddressSearchQuery,
  handleAddressSearch,
  addressResults,
  setAddressResults,
  selectedLocation,
  setSelectedLocation,
  handleAddStop,
  handleRemoveStop,
  handleUpdateStop,
  routeCoordinates
}: AdminModalProps) {
  return (
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
                      value={currentRoute.route_number || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, route_number: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. R-101"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Bus Number</label>
                    <input 
                      type="text" 
                      value={currentRoute.bus_number || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, bus_number: e.target.value})}
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
                      value={currentRoute.driver_id || ''}
                      onChange={(e) => setCurrentRoute({...currentRoute, driver_id: e.target.value})}
                      disabled={modalMode === 'view'}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Driver</option>
                      {drivers.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Attendant (Supervisor)</label>
                    <select 
                      value={currentRoute.attendant_id || ''}
                      onChange={(e) => {
                        const attendant = drivers.find((u: any) => u.id === e.target.value);
                        setCurrentRoute({
                          ...currentRoute, 
                          attendant_id: e.target.value,
                          attendant_name: attendant?.name,
                          attendant_phone: attendant?.phone
                        });
                      }}
                      disabled={modalMode === 'view'}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Attendant</option>
                      {drivers.map((u: any) => (
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
                                {students.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())).map(student => (
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
                                <UserIcon size={12} className="mr-1" />
                                {students.find(s => s.id === stop.studentId)?.name || 'Student'}
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
                        studentName: students.find(st => st.id === s.studentId)?.name,
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
  );
}
