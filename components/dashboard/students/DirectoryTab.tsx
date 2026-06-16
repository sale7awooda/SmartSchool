'use client';

import React, { useState } from 'react';
import { Search, Filter, GraduationCap, Edit, Trash2, IdCard, Printer, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/lib/language-context';
import { Student } from '@/types';

interface DirectoryTabProps {
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  showFilters: boolean;
  setShowFilters: (val: boolean) => void;
  filterGrade: string;
  setFilterGrade: (val: string) => void;
  filterAcademicYear: string;
  setFilterAcademicYear: (val: string) => void;
  filterGender: string;
  setFilterGender: (val: string) => void;
  filterParentId: string;
  setFilterParentId: (val: string) => void;
  parentSearch: string;
  setParentSearch: (val: string) => void;
  foundParents: any[];
  classesList: string[];
  isLoadingData: boolean;
  students: any[];
  isAdmin: boolean;
  setSelectedPerson: (person: any) => void;
  handleOpenEditStudent: (student: any) => void;
  setStudentToDelete: (id: string | null) => void;
  setIsDeleteModalOpen: (val: boolean) => void;
  page: number;
  setPage: (val: number | ((p: number) => number)) => void;
  totalPages: number;
  totalCount: number;
}

export function DirectoryTab({
  t,
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  filterGrade,
  setFilterGrade,
  filterAcademicYear,
  setFilterAcademicYear,
  filterGender,
  setFilterGender,
  filterParentId,
  setFilterParentId,
  parentSearch,
  setParentSearch,
  foundParents,
  classesList,
  isLoadingData,
  students,
  isAdmin,
  setSelectedPerson,
  handleOpenEditStudent,
  setStudentToDelete,
  setIsDeleteModalOpen,
  page,
  setPage,
  totalPages,
  totalCount
}: DirectoryTabProps) {
  const [selectedIdCardStudent, setSelectedIdCardStudent] = useState<any>(null);
  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card dark:bg-slate-900 p-4 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${showFilters ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card border-border text-muted-foreground hover:bg-muted hover:border-border'}`}>
            <Filter size={16} />
            {t('filters')}
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder={t('search_students')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-primary transition-all placeholder:text-muted-foreground dark:placeholder:text-muted-foreground text-foreground"
          />
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm shrink-0 overflow-hidden">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">{t('grade')}</label>
                <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">{t('all_grades')}</option>
                  {classesList.map((c: string, idx: number) => <option key={`${c}-${idx}`} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">{t('academic_year')}</label>
                <select value={filterAcademicYear} onChange={e => setFilterAcademicYear(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">{t('all_years')}</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">{t('gender_label')}</label>
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">{t('all_genders')}</option>
                  <option value="Male">{t('male')}</option>
                  <option value="Female">{t('female')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">{t('parent_guardian_search')}</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={t('type_to_search_parent')} 
                    value={parentSearch}
                    onChange={e => {
                      setParentSearch(e.target.value);
                      if (!e.target.value) setFilterParentId('');
                    }}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {parentSearch.length >= 2 && foundParents.length > 0 && !filterParentId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-auto">
                      {foundParents.map((p: any, idx: number) => (
                        <button
                          key={`${p.id || idx}-${idx}`}
                          onClick={() => {
                            setFilterParentId(p.id);
                            setParentSearch(p.name);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        <div className="bg-card dark:bg-slate-900 rounded-[1.5rem] border border-border dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">{t('student')}</th>
                  <th className="px-6 py-4 font-bold">{t('roll_number')}</th>
                  <th className="px-6 py-4 font-bold">{t('grade')}</th>
                  <th className="px-6 py-4 font-bold">{t('parent_guardian')}</th>
                  <th className="px-6 py-4 font-bold text-right rtl:text-left">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingData ? (
                  [1, 2, 3, 4, 5].map((i: number) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-md" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4 text-right rtl:text-left"><Skeleton className="h-8 w-8 rounded-lg ml-auto rtl:ml-0 rtl:mr-auto" /></td>
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                      {t('no_students_found')}
                    </td>
                  </tr>
                ) : (
                  students.map((student: Student & { parents?: any[] }, idx: number) => (
                    <tr 
                      key={`${student.id || idx}-${idx}`} 
                      onClick={() => setSelectedPerson(student)}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-lg shadow-inner border border-emerald-500/20">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-foreground group-hover:text-emerald-500 transition-colors">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {student.roll_number}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
                          <GraduationCap size={14} />
                          {student.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {student.parents?.[0]?.parent?.name || t('na')}
                      </td>
                      <td className="px-6 py-4 text-right rtl:text-left">
                        <div className="flex items-center justify-end gap-2 rtl:justify-start">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIdCardStudent(student);
                            }}
                            title={t('export_id_card')}
                            className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <IdCard size={18} />
                          </button>
                          {isAdmin && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditStudent(student);
                                }}
                                className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentToDelete(student.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 rounded-xl mt-4 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            {t('previous')}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              {t('page_of').replace('{page}', page.toString()).replace('{total}', totalPages.toString())}
            </span>
            <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
              {t('total')}: <span className="text-foreground font-bold">{totalCount}</span>
            </span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            {t('next')}
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedIdCardStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col items-center p-6 relative"
            >
              <button 
                onClick={() => setSelectedIdCardStudent(null)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <h3 className="text-lg font-bold mb-4 text-center">{t('student_id_card_export')}</h3>

              {/* ID Card Wrapper */}
              <div className="p-4 bg-muted/30 border border-border rounded-3xl mb-6">
                <div id="student-id-card-print" className="relative w-72 h-[420px] bg-gradient-to-br from-card to-muted border border-border rounded-[1.5rem] overflow-hidden shadow-xl flex flex-col items-center p-5 text-foreground">
                  {/* Header banner */}
                  <div className="absolute top-0 inset-x-0 h-20 bg-primary flex flex-col justify-center items-center text-primary-foreground p-3">
                    <div className="flex items-center gap-1">
                      <GraduationCap size={18} className="text-white shrink-0" />
                      <span className="font-extrabold text-xs tracking-tight uppercase">{t('smart_school_portal')}</span>
                    </div>
                    <span className="text-[8px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{t('student_identity_card')}</span>
                  </div>

                  {/* Avatar section */}
                  <div className="mt-12 relative">
                    <div className="w-24 h-24 rounded-full border-4 border-card bg-primary-foreground/30 flex items-center justify-center overflow-hidden shadow-md">
                      <span className="text-2xl font-extrabold text-primary-foreground/80">
                        {selectedIdCardStudent.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-0.5 w-6 h-6 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center shadow-sm">
                      <span className="text-[6px] font-bold text-emerald-600 uppercase">{t('valid')}</span>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="mt-3 text-center space-y-1 w-full">
                    <h3 className="text-md font-black text-foreground tracking-tight truncate px-2">{selectedIdCardStudent.name}</h3>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold inline-block">
                      {selectedIdCardStudent.grade || t('grade_student')}
                    </span>
                  </div>

                  <div className="mt-4 w-full space-y-2 px-4 border-t border-b border-border/80 py-3 text-left">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-bold uppercase">{t('student_id')}</span>
                      <span className="text-foreground font-mono font-bold">{selectedIdCardStudent.roll_number || t('na')}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-bold uppercase">{t('birth_date')}</span>
                      <span className="text-foreground font-mono font-bold">{selectedIdCardStudent.dob || t('na')}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-bold uppercase">{t('academic_year')}</span>
                      <span className="text-foreground font-mono font-bold">{selectedIdCardStudent.academic_year || '2026-2027'}</span>
                    </div>
                  </div>

                  {/* Barcode/Footer */}
                  <div className="mt-auto w-full flex flex-col items-center gap-1.5">
                    <div className="h-6 w-44 bg-foreground/10 border-l border-r border-foreground/30 flex items-center justify-center font-mono text-[8px] tracking-[5px] text-foreground select-none">
                      *{selectedIdCardStudent.roll_number || '0000'}*
                    </div>
                    <span className="text-[7px] text-center text-muted-foreground font-semibold uppercase tracking-wider">{t('smart_school_management')}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setSelectedIdCardStudent(null)}
                  className="flex-1 py-1 px-4 rounded-xl font-bold text-sm text-muted-foreground hover:bg-muted transition-all border border-border cursor-pointer"
                >
                  {t('close')}
                </button>
                <button 
                  onClick={() => {
                    const printContent = document.getElementById('student-id-card-print');
                    if (!printContent) return;
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      window.print();
                      return;
                    }
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Student ID Card - \${selectedIdCardStudent.name}</title>
                          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                          <style>
                            @media print {
                              body { -webkit-print-color-adjust: exact; margin: 0; padding: 40px; background: white; }
                            }
                          </style>
                        </head>
                        <body class="bg-white flex items-center justify-center min-h-screen">
                          <div class="border-2 border-dashed border-gray-300 p-4 rounded-[2rem]">
                            \${printContent.outerHTML}
                          </div>
                          <script>
                            window.onload = function() {
                              window.print();
                              setTimeout(function() { window.close(); }, 500);
                            };
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Printer size={16} />
                  {t('print_export')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
