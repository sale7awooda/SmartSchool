import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit, ChevronRight, GraduationCap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function StudentProfileModal({ selectedPerson, setSelectedPerson, activeProfileTab, setActiveProfileTab, behaviorRecords, timelineRecords, t, isStudent }: any) {
  return (
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
                    {t('overview')}
                  </button>
                  
                  <button
                    onClick={() => setActiveProfileTab('medical')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'medical' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('medical')}
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('behavior')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'behavior' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('behavior')}
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('timeline')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeProfileTab === 'timeline' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-slate-200'
                    }`}
                  >
                    {t('timeline')}
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
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('email_address')}</p>
                            <p className="text-sm font-bold text-foreground mt-0.5 break-all">{selectedPerson.email}</p>
                          </div>
                        </div>
                      )}

                      {'phone' in selectedPerson && selectedPerson.phone && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                          <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Phone size={20} /></div>
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('phone_number')}</p>
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
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('grade')}</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.grade}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><UserCircle size={20} /></div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('roll_no')}</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.rollNumber}</p>
                            </div>
                          </div>
                          {selectedPerson.dob && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 shadow-sm">
                              <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Calendar size={20} /></div>
                              <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('date_of_birth')}</p>
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
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('address')}</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{selectedPerson.address}</p>
                        </div>
                      </div>
                    )}

                    {isStudent(selectedPerson) && selectedPerson.medical?.emergencyContact && (
                      <div className="bg-destructive/10 rounded-2xl p-5 border border-destructive/20">
                        <h3 className="text-destructive dark:text-rose-400 font-bold flex items-center gap-2 mb-3">
                          <AlertCircle size={18} /> {t('emergency_contact')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">{t('name')}</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">{t('relation')}</p>
                            <p className="text-sm font-bold text-foreground dark:text-rose-100">{selectedPerson.medical.emergencyContact.relation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-destructive/70 dark:text-rose-400/70 uppercase tracking-wider">{t('phone')}</p>
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
                              <h3 className="font-bold text-foreground">{t('conditions')}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedPerson.medical.conditions.length > 0 ? (
                                selectedPerson.medical.conditions.map((c: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20">{c}</span>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">{t('none_listed')}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-card dark:bg-slate-900 p-5 rounded-2xl border border-border dark:border-slate-800 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-500/100/10 text-amber-500 rounded-lg"><AlertCircle size={20} /></div>
                            <h3 className="font-bold text-foreground">{t('allergies')}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedPerson.medical.allergies.length > 0 ? (
                              selectedPerson.medical.allergies.map((a: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-amber-500/100/10 text-amber-500 rounded-lg text-sm font-bold border border-amber-500/20 dark:border-amber-500/20">{a}</span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">{t('no_known_allergies')}</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">{t('no_medical_records')}</div>
                    )}
                  </div>
                )}

                {/* Student Behavior Tab */}
                {activeProfileTab === 'behavior' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/100/10 p-5 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/20 text-center">
                        <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-emerald-500 mb-2 shadow-sm">
                          <ThumbsUp size={20} />
                        </div>
                        <p className="text-3xl font-bold text-emerald-500">{selectedPerson.merits || 0}</p>
                        <p className="text-xs font-bold text-emerald-500/70 uppercase tracking-wider mt-1">{t('total_merits')}</p>
                      </div>
                      <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/20 text-center">
                        <div className="w-10 h-10 mx-auto bg-card rounded-full flex items-center justify-center text-destructive mb-2 shadow-sm">
                          <ThumbsDown size={20} />
                        </div>
                        <p className="text-3xl font-bold text-destructive">{selectedPerson.demerits || 0}</p>
                        <p className="text-xs font-bold text-destructive/70 uppercase tracking-wider mt-1">{t('total_demerits')}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-foreground">{t('recent_records')}</h3>
                      {behaviorRecords.length > 0 ? (
                        behaviorRecords.map((record: any) => (
                          <div key={record.id} className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-800 shadow-sm flex gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              record.type === 'merit' ? 'bg-emerald-500/20 dark:bg-emerald-500/100/20 text-emerald-500' : 'bg-destructive/20 dark:bg-destructive/100/20 text-destructive'
                            }`}>
                              {record.type === 'merit' ? <Star size={18} /> : <AlertCircle size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground">{record.title || record.type}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                  record.type === 'merit' ? 'bg-emerald-500/100/20 text-emerald-500' : 'bg-destructive/20 text-destructive'
                                }`}>
                                  {record.type === 'merit' ? '+' : '-'}{record.points} {t('pts')}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{record.description}</p>
                              <p className="text-xs font-medium text-muted-foreground mt-2">{new Date(record.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">{t('no_behavior_records')}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Student Timeline Tab */}
                {activeProfileTab === 'timeline' && isStudent(selectedPerson) && (
                  <div className="space-y-6">
                    {timelineRecords.length > 0 ? (
                      <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 rtl:pl-0 rtl:pr-8 rtl:before:left-auto rtl:before:right-[15px]">
                        {timelineRecords.map((event: any) => (
                          <div key={event.id} className="relative">
                            <div className="absolute -left-[39px] w-8 h-8 rounded-full bg-card dark:bg-slate-900 border-2 border-primary/20 dark:border-indigo-900 flex items-center justify-center text-primary shadow-sm z-10 rtl:-left-auto rtl:-right-[39px]">
                              {event.type === 'award' ? <Star size={14} /> : 
                               event.type === 'alert' ? <AlertCircle size={14} /> :
                               event.type === 'file' ? <Activity size={14} /> :
                               <Calendar size={14} />}
                            </div>
                            <div className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-800 shadow-sm">
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md mb-2 inline-block">
                                {new Date(event.date).toLocaleDateString()}
                              </span>
                              <h4 className="font-bold text-foreground">{event.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">{t('no_timeline_events')}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border dark:border-slate-800 bg-muted/50 dark:bg-slate-800/50">
                <button 
                  onClick={handleCloseProfile}
                  className="w-full px-4 py-3.5 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted transition-all active:scale-[0.98] shadow-sm"
                >
                  {t('close_profile')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
