'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { User, Student, Parent } from '@/lib/mock-db';
import { getStudents, getParents, getUsers, getBehaviorRecords, getTimelineRecords } from '@/lib/supabase-db';
import { 
  Search, Phone, Mail, UserCircle, GraduationCap, ChevronRight, Filter, 
  MapPin, Calendar, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Clock,
  Briefcase, Book, Award, Building2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type DirectoryTab = 'staff' | 'students' | 'parents';
type ProfileTab = 'overview' | 'medical' | 'behavior' | 'timeline' | 'schedule' | 'qualifications';

export default function DirectoryPage() {
  const { user } = useAuth();
  const { can, isRole, isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<DirectoryTab>('staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [studentMembers, setStudentMembers] = useState<Student[]>([]);
  const [parentMembers, setParentMembers] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [behaviorRecords, setBehaviorRecords] = useState<any[]>([]);
  const [timelineRecords, setTimelineRecords] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [students, parents, users] = await Promise.all([
          getStudents(),
          getParents(),
          getUsers()
        ]);
        
        setStudentMembers(students);
        setParentMembers(parents);
        setStaffMembers(users.filter(u => !['student', 'parent'].includes(u.role)));
      } catch (error) {
        console.error('Error loading directory data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPerson && 'grade' in selectedPerson) {
      async function loadProfileDetails() {
        try {
          const [behavior, timeline] = await Promise.all([
            getBehaviorRecords(selectedPerson.id),
            getTimelineRecords(selectedPerson.id)
          ]);
          setBehaviorRecords(behavior);
          setTimelineRecords(timeline);
        } catch (error) {
          console.error('Error loading profile details:', error);
        }
      }
      loadProfileDetails();
    }
  }, [selectedPerson]);

  if (!user) return null;

  if (!can('view', 'users') && !can('view', 'staff') && !can('view', 'students')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  // Filter data based on role
  let displayStaff = staffMembers;
  let displayStudents = studentMembers;
  let displayParents = parentMembers;

  if (isRole('teacher')) {
    // Teachers see their students and other staff
    // Assuming teacher sees all students for now
    displayParents = displayParents.filter(p => displayStudents.some(s => s.id === p.studentId));
  } else if (isRole('student')) {
    // Students see only themselves and their teachers
    displayStudents = displayStudents.filter(s => s.id === user.id || s.id === user.studentId);
    displayParents = []; // Students don't see parents directory
    displayStaff = displayStaff.filter(s => s.role === 'teacher'); // Only see teachers
  } else if (isRole('parent')) {
    // Parents see their children and their children's teachers
    displayStudents = displayStudents.filter(s => s.id === user.studentId);
    displayParents = displayParents.filter(p => p.id === user.id);
    displayStaff = displayStaff.filter(s => s.role === 'teacher'); // Only see teachers
  }

  const filteredStaff = displayStaff.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.role.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredStudents = displayStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.grade.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredParents = displayParents.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.studentId?.toLowerCase().includes(searchQuery.toLowerCase()));

  const isStudent = (person: any): person is Student => {
    return person && 'grade' in person;
  };

  const isStaff = (person: any): person is User => {
    return person && 'role' in person && ['teacher', 'staff', 'admin', 'accountant'].includes(person.role);
  };

  const handleCloseProfile = () => {
    setSelectedPerson(null);
    setActiveProfileTab('overview');
    setBehaviorRecords([]);
    setTimelineRecords([]);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
      case 'teacher': return 'bg-primary/20 text-primary border-primary/20';
      case 'accountant': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
      case 'staff': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">School Directory</h1>
        <p className="text-muted-foreground mt-2 font-medium">Find contact information and detailed profiles for staff, students, and parents.</p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-[1.5rem] border border-border shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide w-full sm:w-auto">
            {(['staff', 'students', 'parents'] as const).filter(tab => {
              if (tab === 'staff') return can('view', 'staff');
              if (tab === 'students') return can('view', 'students');
              if (tab === 'parents') return can('view', 'users') || isRole('teacher');
              return false;
            }).map((tab) => (
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
              className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center p-20 space-y-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Loading directory...</p>
            </div>
          ) : (
            <>
              {activeTab === 'staff' && (
            filteredStaff.length === 0 ? <div className="col-span-full p-12 text-center text-muted-foreground font-medium">No staff found.</div> :
            filteredStaff.map((staff) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={staff.id} 
                onClick={() => setSelectedPerson(staff)} 
                className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={20} className="text-primary" />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shadow-inner border border-primary/20/50">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">{staff.name}</h3>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(staff.role)}`}>
                      {staff.role.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {staff.staffProfile?.department && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 size={16} className="text-muted-foreground" />
                      <span>{staff.staffProfile.department}</span>
                    </div>
                  )}
                  {staff.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                      <Mail size={16} className="text-muted-foreground" />
                      <span className="truncate">{staff.email}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}

          {activeTab === 'students' && (
            filteredStudents.length === 0 ? <div className="col-span-full p-12 text-center text-muted-foreground font-medium">No students found.</div> :
            filteredStudents.map((student) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={student.id} 
                onClick={() => setSelectedPerson(student)} 
                className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md hover:border-emerald-500/20 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={20} className="text-emerald-500" />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-2xl shadow-inner border border-emerald-500/20/50">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-emerald-500 transition-colors">{student.name}</h3>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
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
                className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm hover:shadow-md hover:border-amber-500/20 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={20} className="text-amber-500" />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-2xl shadow-inner border border-amber-500/20/50">
                    {parent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-amber-500 transition-colors">{parent.name}</h3>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
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
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedPerson && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-card rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-border max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-border flex items-center gap-5 relative bg-muted/50 shrink-0">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner ${
                  'role' in selectedPerson && selectedPerson.role === 'parent' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20/50' :
                  isStudent(selectedPerson) ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20/50' :
                  'bg-primary/10 text-primary border border-primary/20/50'
                }`}>
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">{selectedPerson.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      'role' in selectedPerson ? getRoleBadgeColor(selectedPerson.role) : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {'role' in selectedPerson ? selectedPerson.role.replace(/([A-Z])/g, ' $1').trim() : 'Student'}
                    </span>
                    {isStaff(selectedPerson) && selectedPerson.staffProfile?.department && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-card border border-border text-muted-foreground">
                        {selectedPerson.staffProfile.department}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleCloseProfile}
                  className="absolute top-6 right-6 p-2 bg-card rounded-xl border border-border text-muted-foreground hover:text-muted-foreground transition-colors"
                >
                  <ChevronRight size={20} className="rotate-90 sm:rotate-0" />
                </button>
              </div>
              
              {/* Tabs */}
              {(isStudent(selectedPerson) || isStaff(selectedPerson)) && (
                <div className="flex border-b border-border px-6 sm:px-8 overflow-x-auto scrollbar-hide shrink-0">
                  <button
                    onClick={() => setActiveProfileTab('overview')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'overview' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Overview
                  </button>
                  
                  {isStudent(selectedPerson) && (
                    <>
                      <button
                        onClick={() => setActiveProfileTab('medical')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                          activeProfileTab === 'medical' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Medical
                      </button>
                      <button
                        onClick={() => setActiveProfileTab('behavior')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                          activeProfileTab === 'behavior' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Behavior
                      </button>
                      <button
                        onClick={() => setActiveProfileTab('timeline')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                          activeProfileTab === 'timeline' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Timeline
                      </button>
                    </>
                  )}

                  {isStaff(selectedPerson) && (
                    <>
                      <button
                        onClick={() => setActiveProfileTab('qualifications')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                          activeProfileTab === 'qualifications' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Qualifications
                      </button>
                      <button
                        onClick={() => setActiveProfileTab('schedule')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                          activeProfileTab === 'schedule' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Schedule
                      </button>
                    </>
                  )}
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
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Mail size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</p>
                            <p className="text-sm font-bold text-foreground mt-0.5 break-all">{selectedPerson.email}</p>
                          </div>
                        </div>
                      )}

                      {'phone' in selectedPerson && selectedPerson.phone && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Phone size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.phone}</p>
                          </div>
                        </div>
                      )}

                      {/* Staff Specific Overview */}
                      {isStaff(selectedPerson) && selectedPerson.staffProfile && (
                        <>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Building2 size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Department</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.staffProfile.department}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Briefcase size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Designation</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.staffProfile.designation}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Calendar size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Joined Date</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.staffProfile.joinDate}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Student Specific Overview */}
                      {isStudent(selectedPerson) && (
                        <>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><GraduationCap size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grade</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.grade}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roll No.</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.rollNumber}</p>
                            </div>
                          </div>
                          {selectedPerson.dob && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
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
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                        <div className="p-3 bg-muted rounded-xl text-muted-foreground"><MapPin size={20} /></div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.address}</p>
                        </div>
                      </div>
                    )}

                    {isStudent(selectedPerson) && selectedPerson.medical?.emergencyContact && (
                      <div className="bg-destructive/10 rounded-2xl p-5 border border-destructive/20">
                        <h3 className="text-destructive font-bold flex items-center gap-2 mb-3">
                          <AlertCircle size={18} /> Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-destructive/70 uppercase tracking-wider">Name</p>
                            <p className="text-sm font-bold text-foreground">{selectedPerson.medical.emergencyContact.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 uppercase tracking-wider">Relation</p>
                            <p className="text-sm font-bold text-foreground">{selectedPerson.medical.emergencyContact.relation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 uppercase tracking-wider">Phone</p>
                            <p className="text-sm font-bold text-foreground">{selectedPerson.medical.emergencyContact.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Staff Qualifications Tab */}
                {activeProfileTab === 'qualifications' && isStaff(selectedPerson) && selectedPerson.staffProfile && (
                  <div className="space-y-6">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                      <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                        <Award size={20} className="text-primary" />
                        Academic Qualifications
                      </h3>
                      <ul className="space-y-3">
                        {selectedPerson.staffProfile.qualifications.map((qual, i) => (
                          <li key={i} className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                            <div className="w-2 h-2 rounded-full bg-primary/100"></div>
                            <span className="font-medium text-foreground">{qual}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {selectedPerson.staffProfile.subjects && (
                      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                          <Book size={20} className="text-emerald-500" />
                          Subjects Taught
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedPerson.staffProfile.subjects.map((subj, i) => (
                            <span key={i} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm font-bold border border-emerald-500/20">
                              {subj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Staff Schedule Tab (Mock) */}
                {activeProfileTab === 'schedule' && isStaff(selectedPerson) && (
                  <div className="space-y-4">
                    <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex items-center gap-3">
                      <Clock size={20} className="text-primary" />
                      <p className="text-sm font-medium text-primary">
                        This is a simplified view of the teacher&apos;s weekly schedule.
                      </p>
                    </div>
                    {/* Mock Schedule Items */}
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                      <div key={day} className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                        <h4 className="font-bold text-foreground mb-3">{day}</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 p-2 hover:bg-muted rounded-lg transition-colors">
                            <span className="text-xs font-bold text-muted-foreground w-16">09:00 AM</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-foreground">Mathematics - Grade 4</p>
                              <p className="text-xs text-muted-foreground">Room 101</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-2 hover:bg-muted rounded-lg transition-colors">
                            <span className="text-xs font-bold text-muted-foreground w-16">11:00 AM</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-foreground">English - Grade 5</p>
                              <p className="text-xs text-muted-foreground">Room 203</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Student Medical Tab */}
                {activeProfileTab === 'medical' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {selectedPerson.medical ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-destructive/10 text-destructive rounded-lg"><Activity size={20} /></div>
                              <h3 className="font-bold text-foreground">Blood Group</h3>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{selectedPerson.medical.bloodGroup}</p>
                          </div>
                          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
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

                        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><AlertCircle size={20} /></div>
                            <h3 className="font-bold text-foreground">Allergies</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedPerson.medical.allergies.length > 0 ? (
                              selectedPerson.medical.allergies.map((a, i) => (
                                <span key={i} className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-sm font-bold border border-amber-500/20">{a}</span>
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
                          <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 text-center">
                            <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-emerald-500 mb-2 shadow-sm">
                              <ThumbsUp size={20} />
                            </div>
                            <p className="text-3xl font-bold text-emerald-500">{selectedPerson.merits || 0}</p>
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mt-1">Total Merits</p>
                          </div>
                          <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/20 text-center">
                            <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-destructive mb-2 shadow-sm">
                              <ThumbsDown size={20} />
                            </div>
                            <p className="text-3xl font-bold text-destructive">{selectedPerson.demerits || 0}</p>
                            <p className="text-xs font-bold text-destructive uppercase tracking-wider mt-1">Total Demerits</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="font-bold text-foreground">Recent Records</h3>
                          {behaviorRecords.length > 0 ? (
                            behaviorRecords.map((record) => (
                              <div key={record.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  record.type === 'merit' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-destructive/20 text-destructive'
                                }`}>
                                  {record.type === 'merit' ? <Star size={18} /> : <AlertCircle size={18} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-foreground">{record.title}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                      record.type === 'merit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                                    }`}>
                                      {record.type === 'merit' ? '+' : '-'}{record.points} pts
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-0.5">{record.description}</p>
                                  <p className="text-xs font-medium text-muted-foreground mt-2">{new Date(record.created_at).toLocaleDateString()}</p>
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
                    {timelineRecords.length > 0 ? (
                      <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {timelineRecords.map((event) => (
                          <div key={event.id} className="relative">
                            <div className="absolute -left-[39px] w-8 h-8 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center text-primary shadow-sm z-10">
                              {event.type === 'award' ? <Star size={14} /> : 
                               event.type === 'alert' ? <AlertCircle size={14} /> :
                               event.type === 'file' ? <Activity size={14} /> :
                               <Calendar size={14} />}
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md mb-2 inline-block">
                                {new Date(event.created_at).toLocaleDateString()}
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

              <div className="p-6 border-t border-border bg-muted/50">
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
