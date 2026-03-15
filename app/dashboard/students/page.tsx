'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MOCK_STUDENTS, MOCK_PARENTS, User, Student } from '@/lib/mock-db';
import { 
  Search, Phone, Mail, UserCircle, GraduationCap, ChevronRight, Filter, 
  MapPin, Calendar, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type DirectoryTab = 'students' | 'parents';
type ProfileTab = 'overview' | 'medical' | 'behavior' | 'timeline';

export default function StudentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DirectoryTab>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<User | Student | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');

  if (!user) return null;

  if (!['superadmin', 'schoolAdmin', 'teacher'].includes(user.role)) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const filteredStudents = MOCK_STUDENTS.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.grade.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredParents = MOCK_PARENTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.studentId?.toLowerCase().includes(searchQuery.toLowerCase()));

  const isStudent = (person: User | Student): person is Student => {
    return 'grade' in person;
  };

  const handleCloseProfile = () => {
    setSelectedPerson(null);
    setActiveProfileTab('overview');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'schoolAdmin': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
      case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
      case 'accountant': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
      case 'staff': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Students Directory</h1>
        <p className="text-muted-foreground mt-2 font-medium">Find contact information and detailed profiles for students and parents.</p>
      </div>

      <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card dark:bg-slate-900 p-4 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide w-full sm:w-auto">
            {(['students', 'parents'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:border-border'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'students' && (
            filteredStudents.length === 0 ? <div className="col-span-full p-12 text-center text-muted-foreground font-medium">No students found.</div> :
            filteredStudents.map((student) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={student.id} 
                onClick={() => setSelectedPerson(student)} 
                className="bg-card dark:bg-slate-900 p-6 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/20 dark:hover:border-emerald-500/30 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={20} className="text-emerald-500 dark:text-emerald-500" />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/100/10 text-emerald-500 flex items-center justify-center font-bold text-2xl shadow-inner border border-emerald-500/20">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-500 transition-colors">{student.name}</h3>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/100/10 text-emerald-500 border border-emerald-500/20">
                      Student
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap size={16} className="text-muted-foreground" />
                    <span>{student.grade}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCircle size={16} className="text-muted-foreground" />
                    <span>Roll: {student.rollNumber}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {activeTab === 'parents' && (
            filteredParents.length === 0 ? <div className="col-span-full p-12 text-center text-muted-foreground font-medium">No parents found.</div> :
            filteredParents.map((parent) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={parent.id} 
                onClick={() => setSelectedPerson(parent)} 
                className="bg-card dark:bg-slate-900 p-6 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500/20 dark:hover:border-amber-500/30 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={20} className="text-amber-500 dark:text-amber-500" />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/100/10 text-amber-500 flex items-center justify-center font-bold text-2xl shadow-inner border border-amber-500/20">
                    {parent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-amber-500 dark:group-hover:text-amber-500 transition-colors">{parent.name}</h3>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/100/10 text-amber-500 border border-amber-500/20">
                      Parent
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCircle size={16} className="text-muted-foreground" />
                    <span>Child ID: {parent.studentId}</span>
                  </div>
                  {parent.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone size={16} className="text-muted-foreground" />
                      <span>{parent.phone}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      </div>

      <AnimatePresence>
        {selectedPerson && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 dark:bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-card dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-border dark:border-slate-800 flex items-center gap-5 relative bg-muted/50 dark:bg-slate-800/50 shrink-0">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner ${
                  'role' in selectedPerson && selectedPerson.role === 'parent' ? 'bg-amber-500/100/10 text-amber-500 border border-amber-500/20' :
                  isStudent(selectedPerson) ? 'bg-emerald-500/100/10 text-emerald-500 border border-emerald-500/20' :
                  'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{selectedPerson.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      'role' in selectedPerson ? getRoleBadgeColor(selectedPerson.role) : 'bg-emerald-500/100/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {'role' in selectedPerson ? selectedPerson.role.replace(/([A-Z])/g, ' $1').trim() : 'Student'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleCloseProfile}
                  className="absolute top-6 right-6 p-2 bg-card rounded-xl border border-border text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-300 transition-colors"
                >
                  <ChevronRight size={20} className="rotate-90 sm:rotate-0" />
                </button>
              </div>
              
              {/* Tabs */}
              {isStudent(selectedPerson) && (
                <div className="flex border-b border-border dark:border-slate-800 px-6 sm:px-8 overflow-x-auto scrollbar-hide shrink-0">
                  <button
                    onClick={() => setActiveProfileTab('overview')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'overview' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Overview
                  </button>
                  
                  <button
                    onClick={() => setActiveProfileTab('medical')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'medical' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Medical
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('behavior')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'behavior' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Behavior
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('timeline')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'timeline' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    Timeline
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                {/* Overview Tab */}
                {activeProfileTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contact Info */}
                      {'email' in selectedPerson && selectedPerson.email && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Mail size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</p>
                            <p className="text-sm font-bold text-foreground mt-0.5 break-all">{selectedPerson.email}</p>
                          </div>
                        </div>
                      )}

                      {'phone' in selectedPerson && selectedPerson.phone && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Phone size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.phone}</p>
                          </div>
                        </div>
                      )}

                      {/* Student Specific Overview */}
                      {isStudent(selectedPerson) && (
                        <>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><GraduationCap size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grade</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.grade}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roll No.</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.rollNumber}</p>
                            </div>
                          </div>
                          {selectedPerson.dob && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Calendar size={20} /></div>
                              <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date of Birth</p>
                                <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.dob}</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {isStudent(selectedPerson) && selectedPerson.address && (
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                        <div className="p-3 bg-muted rounded-xl text-muted-foreground"><MapPin size={20} /></div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.address}</p>
                        </div>
                      </div>
                    )}

                    {isStudent(selectedPerson) && selectedPerson.medical?.emergencyContact && (
                      <div className="bg-destructive/10 rounded-2xl p-5 border border-destructive/20">
                        <h3 className="text-destructive dark:text-rose-400 font-bold flex items-center gap-2 mb-3">
                          <AlertCircle size={18} /> Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">Name</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">Relation</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.relation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">Phone</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Medical Tab */}
                {activeProfileTab === 'medical' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {selectedPerson.medical ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-destructive/10 text-destructive rounded-lg"><Activity size={20} /></div>
                              <h3 className="font-bold text-foreground">Blood Group</h3>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{selectedPerson.medical.bloodGroup}</p>
                          </div>
                          <div className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-primary/10 text-primary rounded-lg"><Heart size={20} /></div>
                              <h3 className="font-bold text-foreground">Conditions</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedPerson.medical.conditions.length > 0 ? (
                                selectedPerson.medical.conditions.map((c, i) => (
                                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20">{c}</span>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">None listed</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-500/100/10 text-amber-500 rounded-lg"><AlertCircle size={20} /></div>
                            <h3 className="font-bold text-foreground">Allergies</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedPerson.medical.allergies.length > 0 ? (
                              selectedPerson.medical.allergies.map((a, i) => (
                                <span key={i} className="px-3 py-1 bg-amber-500/100/10 text-amber-500 rounded-lg text-sm font-bold border border-amber-500/20 dark:border-amber-500/20">{a}</span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No known allergies</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No medical records available.</div>
                    )}
                  </div>
                )}

                {/* Student Behavior Tab */}
                {activeProfileTab === 'behavior' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {selectedPerson.behavior ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-emerald-500/100/10 p-5 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/20 text-center">
                            <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-emerald-500 mb-2 shadow-sm">
                              <ThumbsUp size={20} />
                            </div>
                            <p className="text-3xl font-bold text-emerald-500">{selectedPerson.behavior.merits}</p>
                            <p className="text-xs font-bold text-emerald-500/70 uppercase tracking-wider mt-1">Total Merits</p>
                          </div>
                          <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/20 text-center">
                            <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-destructive mb-2 shadow-sm">
                              <ThumbsDown size={20} />
                            </div>
                            <p className="text-3xl font-bold text-destructive">{selectedPerson.behavior.demerits}</p>
                            <p className="text-xs font-bold text-destructive/70 uppercase tracking-wider mt-1">Total Demerits</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="font-bold text-foreground">Recent Records</h3>
                          {selectedPerson.behavior.records.length > 0 ? (
                            selectedPerson.behavior.records.map((record) => (
                              <div key={record.id} className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-800 shadow-sm flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  record.type === 'merit' ? 'bg-emerald-500/20 dark:bg-emerald-500/100/20 text-emerald-500' : 'bg-destructive/20 dark:bg-destructive/100/20 text-destructive'
                                }`}>
                                  {record.type === 'merit' ? <Star size={18} /> : <AlertCircle size={18} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-foreground">{record.title}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                      record.type === 'merit' ? 'bg-emerald-500/100/20 text-emerald-500' : 'bg-destructive/20 text-destructive'
                                    }`}>
                                      {record.type === 'merit' ? '+' : '-'}{record.points} pts
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-0.5">{record.description}</p>
                                  <p className="text-xs font-medium text-muted-foreground mt-2">{record.date}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">No behavior records found.</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No behavior records available.</div>
                    )}
                  </div>
                )}

                {/* Student Timeline Tab */}
                {activeProfileTab === 'timeline' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {selectedPerson.timeline && selectedPerson.timeline.length > 0 ? (
                      <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        {selectedPerson.timeline.map((event) => (
                          <div key={event.id} className="relative">
                            <div className="absolute -left-[39px] w-8 h-8 rounded-full bg-card dark:bg-slate-900 border-2 border-primary/20 dark:border-indigo-900 flex items-center justify-center text-primary shadow-sm z-10">
                              {event.icon === 'award' ? <Star size={14} /> : 
                               event.icon === 'alert' ? <AlertCircle size={14} /> :
                               event.icon === 'file' ? <Activity size={14} /> :
                               <Calendar size={14} />}
                            </div>
                            <div className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-800 shadow-sm">
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md mb-2 inline-block">
                                {event.date}
                              </span>
                              <h4 className="font-bold text-foreground">{event.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No timeline events available.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border dark:border-slate-800 bg-muted/50 dark:bg-slate-800/50">
                <button 
                  onClick={handleCloseProfile}
                  className="w-full px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-all active:scale-[0.98] shadow-sm"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
