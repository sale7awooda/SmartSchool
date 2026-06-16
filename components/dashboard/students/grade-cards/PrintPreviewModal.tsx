'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Printer, Layout, Building } from 'lucide-react';
import { getLetterGrade, compileTemplateBRows, compileTemplateBGrandAverage } from './grade-utils';

interface PrintPreviewModalProps {
  open: boolean;
  student: any;
  printStudentAllGrades: any[] | undefined;
  isPrintGradesLoading: boolean;
  subjects: any[];
  activeTemplate: 'template-a' | 'template-b';
  onTemplateChange: (t: 'template-a' | 'template-b') => void;
  activeTerm: string;
  currentDbTerm: string;
  systemSettings: any;
  attendanceSummary: { present: number; total: number; absent: number } | null;
  studentRank: { rank: number; total: number } | null;
  onPrint: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin h-8 w-8 text-indigo-600 ${className || ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export function PrintPreviewModal({
  open,
  student,
  printStudentAllGrades,
  isPrintGradesLoading,
  subjects,
  activeTemplate,
  onTemplateChange,
  activeTerm,
  currentDbTerm,
  systemSettings,
  attendanceSummary,
  studentRank,
  onPrint,
  onClose,
  t
}: PrintPreviewModalProps) {
  const isTeacher = false;

  return (
    <AnimatePresence>
      {open && student && (
        <div id="print-modal-backdrop" className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 overflow-y-auto custom-scrollbar flex items-center justify-center p-0 md:p-6 print:static print:block print:w-full print:h-auto print:bg-white print:p-0">
          <div id="print-modal-content" className="bg-card w-full max-w-5xl md:border md:border-border min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl flex flex-col print:static print:block print:w-full print:h-auto print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0">

            <div className="p-4 border-b border-border bg-card sticky top-0 z-50 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-background transition-colors">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="font-extrabold text-base text-foreground leading-tight">{t('document_printing_desk')}</h3>
                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{t('printing_desk_desc')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                <button
                  onClick={() => onTemplateChange('template-a')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTemplate === 'template-a' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                  }`}
                >
                  <Layout size={14} /> {t('single_period_card')}
                </button>
                <button
                  onClick={() => onTemplateChange('template-b')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTemplate === 'template-b' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                  }`}
                >
                  <Building size={14} /> {t('annual_progress_report')}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={onPrint} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition-colors">
                  <Printer size={16} /> {t('print_save_pdf')}
                </button>
                <button onClick={onClose} className="px-3 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-xl transition-colors">
                  {t('close_drawer')}
                </button>
              </div>
            </div>

            <div id="print-modal-backdrop-inner" className="flex-1 p-6 md:p-12 overflow-y-auto bg-card dark:bg-slate-950/20 print:p-0 print:bg-white print:block print:static print:w-full print:h-auto">

              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page { size: portrait; margin: 0.8cm 1cm !important; }
                  body { visibility: hidden !important; background: white !important; color: black !important; }
                  #print-modal-backdrop, #print-modal-backdrop *, #print-modal-content, #print-modal-content *,
                  #print-modal-backdrop-inner, #print-modal-backdrop-inner *, #printable-card-frame, #printable-card-frame * {
                    visibility: visible !important;
                  }
                  #print-modal-backdrop { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: white !important; box-shadow: none !important; border: none !important; display: block !important; }
                  #print-modal-content { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; background: white !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; display: block !important; }
                  #print-modal-backdrop-inner { background: white !important; margin: 0 !important; padding: 0 !important; display: block !important; width: 100% !important; }
                  #printable-card-frame { position: relative !important; display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 auto !important; padding: 2.5rem !important; background: white !important; color: black !important; border: 2px solid #57677a !important; border-radius: 2rem !important; box-shadow: none !important; }
                  * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
                  header, footer, aside, nav, button, [role="navigation"], .print\\:hidden, .print-hidden, div[class*="border-b"][class*="sticky"] { display: none !important; visibility: hidden !important; }
                  .flex { display: flex !important; }
                  .grid { display: grid !important; }
                  .block { display: block !important; }
                  #printable-card-frame .flex-col { flex-direction: column !important; }
                  #printable-card-frame .sm\\:flex-row { flex-direction: row !important; justify-content: space-between !important; align-items: center !important; display: flex !important; }
                  #printable-card-frame .sm\\:grid-cols-7 { display: grid !important; grid-template-columns: repeat(7, minmax(0, 1fr)) !important; }
                  #printable-card-frame .sm\\:grid-cols-2 { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                  #printable-card-frame .grid-cols-2 { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                  #printable-card-frame .sm\\:col-span-1 { grid-column: span 1 / span 1 !important; }
                  table { width: 100% !important; border-collapse: collapse !important; }
                  table tr th { padding: 8px 10px !important; font-size: 11px !important; line-height: 1.2 !important; background-color: #f1f5f9 !important; color: #000000 !important; border: 1px solid #475569 !important; }
                  table tr td { padding: 8px 10px !important; font-size: 11px !important; line-height: 1.2 !important; border: 1px solid #94a3b8 !important; }
                }
              `}} />

              <div id="printable-card-frame" className="bg-white text-black p-8 md:p-12 border-2 border-slate-300 rounded-[2rem] shadow-sm max-w-4xl mx-auto print:border-2 print:border-slate-400 print:rounded-[2rem] print:p-12">

                {isPrintGradesLoading ? (
                  <div className="text-center py-20 print:hidden">
                    <LoadingSpinner className="mx-auto mb-4" />
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('aggregating_records')}</p>
                  </div>
                ) : (
                  <>
                    {activeTemplate === 'template-a' && (
                      <div className="space-y-8">
                        <div className="h-2 w-full bg-slate-900 rounded-full" />
                        <div className="text-center space-y-3">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-slate-400 flex items-center justify-center text-slate-800 shrink-0">
                              <Building size={20} className="stroke-1" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-serif font-black uppercase text-slate-900 tracking-tight leading-none">
                              {systemSettings?.school_name || 'Noble Learning Academy'}
                            </h2>
                          </div>
                          <p className="text-xs uppercase font-serif tracking-widest text-slate-500">{t('official_academic_performance')}</p>
                        </div>

                        <div className="border-y border-slate-300 py-3.5 space-y-2 text-xs font-serif italic text-slate-800">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                            <div>{t('student_label')}: <span className="font-bold font-serif not-italic text-black text-sm">{student.name}</span></div>
                            <div>{t('roll_no_label')}: <span className="font-bold not-italic text-black text-sm font-mono">{student.roll_number ?? student.rollNumber ?? 'T-491'}</span></div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-2 border-t border-dashed border-slate-200">
                            <div>{t('grade')}: <span className="font-bold not-italic text-black text-sm uppercase">{student.grade || 'General'}</span></div>
                            <div>{t('academic_term_label')}: <span className="font-bold not-italic text-black text-sm uppercase">{currentDbTerm}</span></div>
                          </div>
                        </div>

                        <div className="overflow-hidden border border-slate-300 rounded-2xl">
                          <table className="w-full text-left text-xs bg-white">
                            <thead>
                              <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest border-b border-slate-300">
                                <th className="px-5 py-3">{t('course_catalog')}</th>
                                <th className="px-5 py-3 text-center">{t('max_scale')}</th>
                                <th className="px-5 py-3 text-center">{t('score_obtained')}</th>
                                <th className="px-5 py-3 text-center">{t('letter_grade')}</th>
                                <th className="px-5 py-3 hidden sm:table-cell print:table-cell">{t('instructor_feedback')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subjects.map((sub: any) => {
                                const gradeRecord = printStudentAllGrades?.find((g: any) => g.subject_id === sub.id && g.term === currentDbTerm);
                                const score = gradeRecord ? gradeRecord.score : null;
                                const lGrade = score !== null ? getLetterGrade(score) : 'Awaiting';
                                return (
                                  <tr key={sub.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                                    <td className="px-5 py-3.5 font-bold text-slate-900">{sub.name}</td>
                                    <td className="px-5 py-3.5 text-center font-mono text-slate-400">100</td>
                                    <td className="px-5 py-3.5 text-center font-extrabold text-slate-900 font-mono text-sm">{score !== null ? score : '-'}</td>
                                    <td className="px-5 py-3.5 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${lGrade === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-800'}`}>{lGrade}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-600 italic text-[11px] hidden sm:table-cell print:table-cell leading-relaxed">
                                      {gradeRecord?.comments || gradeRecord?.remarks || 'Consistently responsive in routine learning drills.'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="p-5 border-2 border-slate-900 border-double rounded-2xl bg-white space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">{t('admin_eval_legend')}</h4>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-[10px]">
                            {[
                              { grade: 'A+', range: '96 - 100' },
                              { grade: 'A', range: '91 - 95' },
                              { grade: 'B+', range: '86 - 90' },
                              { grade: 'B', range: '81 - 85' },
                              { grade: 'C', range: '76 - 80' },
                              { grade: 'D', range: '70 - 75' },
                              { grade: 'FAIL', range: '< 70', fail: true }
                            ].map(item => (
                              <div key={item.grade} className={`bg-slate-50 p-2 rounded border border-slate-200 ${item.fail ? 'col-span-full sm:col-span-1' : ''}`}>
                                <span className={`font-extrabold block ${item.fail ? 'text-red-600' : 'text-slate-950'}`}>{item.grade}</span>
                                <span className="text-slate-400 font-mono">{item.range}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-xl text-xs border border-slate-200">
                          <div className="flex gap-4 items-center">
                            <span className="font-bold text-slate-500 uppercase tracking-wide">{t('academic_attendance')}:</span>
                            {attendanceSummary ? (
                              <>
                                <span className="font-extrabold text-slate-900">Total days: {attendanceSummary.total}</span>
                                <span className="font-bold text-emerald-600">Attended: {attendanceSummary.present}</span>
                                <span className="font-bold text-red-500">Absent: {attendanceSummary.absent}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground animate-pulse">{t('calculating_records')}</span>
                            )}
                          </div>
                          <div className="hidden sm:block w-px bg-slate-200 h-4 mx-2" />
                          <div className="flex gap-2 items-center">
                            <span className="font-bold text-slate-500 uppercase tracking-wide">{t('performance_standing')}:</span>
                            {studentRank ? (
                              <span className="font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">Class Rank: {studentRank.rank} / {studentRank.total}</span>
                            ) : (
                              <span className="text-muted-foreground">Compiling...</span>
                            )}
                          </div>
                        </div>

                        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                          <div className="space-y-1"><div className="border-b border-slate-400 mx-auto w-48 h-6" /><span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">{t('teacher_endorsement')}</span></div>
                          <div className="space-y-1"><div className="border-b border-slate-400 mx-auto w-48 h-6" /><span className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">{t('admin_registrar')}</span></div>
                        </div>
                      </div>
                    )}

                    {activeTemplate === 'template-b' && (() => {
                      const rows = compileTemplateBRows(printStudentAllGrades || [], subjects);
                      const grandAvg = compileTemplateBGrandAverage(rows);
                      return (
                        <div className="border-4 border-slate-900 border-double p-6 md:p-10 bg-white space-y-8 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-8 h-8 border-r border-b border-slate-300" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-l border-b border-slate-300" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-r border-t border-slate-300" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-l border-t border-slate-300" />

                          <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-10 h-10 rounded-full border border-slate-400 flex items-center justify-center text-slate-800 shrink-0"><Building size={20} className="stroke-1" /></div>
                              <h2 className="text-2xl md:text-3xl font-serif font-black uppercase text-slate-900 tracking-tight leading-none">{systemSettings?.school_name || 'Noble Learning Academy'}</h2>
                            </div>
                            <p className="text-xs uppercase font-serif tracking-widest text-slate-500">Annual Progress & Performance Credentials</p>
                          </div>

                          <div className="border-y border-slate-300 py-3.5 space-y-2 text-xs font-serif italic text-slate-800">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                              <div>{t('student_label')}: <span className="font-bold font-serif not-italic text-black text-sm">{student.name}</span></div>
                              <div>{t('roll_no_label')}: <span className="font-bold not-italic text-black text-sm font-mono">{student.roll_number ?? student.rollNumber ?? 'T-491'}</span></div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pt-2 border-t border-dashed border-slate-200">
                              <div>{t('grade')}: <span className="font-bold not-italic text-black text-sm uppercase">{student.grade || 'General'}</span></div>
                              <div>{t('year_label')}: <span className="font-bold not-italic text-black text-sm">2025-2026</span></div>
                            </div>
                          </div>

                          <div className="overflow-hidden border border-slate-400">
                            <table className="w-full text-left text-[11px] bg-white font-serif">
                              <thead>
                                <tr className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider border-b border-slate-400 text-slate-800">
                                  <th className="px-3 py-3 border-r border-slate-400 leading-tight">{t('subject_scheme')}</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">{t('1st_term')}</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">{t('2nd_term')}</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M1</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M2</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M3</th>
                                  <th className="px-1 py-3 border-r border-slate-400 text-center">M4</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">{t('mo_avg')}</th>
                                  <th className="px-2 py-3 border-r border-slate-400 text-center">{t('final_exam')}</th>
                                  <th className="px-3 py-3 text-center bg-slate-200/50">{t('obtained_label')}</th>
                                  <th className="px-2 py-3 text-center">{t('letter_grade')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row: any) => (
                                  <tr key={row.id} className="border-b border-slate-300">
                                    <td className="px-3 py-2.5 border-r border-slate-300 font-bold not-italic text-black">{row.name}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.t1 ?? '-'}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.t2 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m1 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m2 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m3 ?? '-'}</td>
                                    <td className="px-1 py-2.5 border-r border-slate-300 text-center font-mono text-slate-600">{row.m4 ?? '-'}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.monthlyAvg ?? '-'}</td>
                                    <td className="px-2 py-2.5 border-r border-slate-300 text-center font-mono text-slate-800">{row.finalS ?? '-'}</td>
                                    <td className="px-3 py-2.5 border-r border-slate-300 text-center font-extrabold text-black font-mono bg-slate-100/30 text-sm">{row.obtained ?? '-'}</td>
                                    <td className="px-2 py-2.5 text-center font-serif font-black">{row.grade}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-2 font-serif text-xs text-slate-800">
                              <h4 className="font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 font-serif text-slate-900">{t('performance_eval_summary')}</h4>
                              <div className="flex justify-between items-center py-0.5 font-serif">
                                <span className="italic">{t('overall_term_percentile')}:</span>
                                <span className="font-mono font-extrabold text-sm text-slate-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">( {grandAvg.percent}% &nbsp;&nbsp;&nbsp; {grandAvg.letter} )</span>
                              </div>
                              {studentRank && (
                                <div className="flex justify-between items-center py-0.5 border-t border-slate-200/50 pt-1 font-serif">
                                  <span className="italic">{t('class_standing')}:</span>
                                  <span className="font-extrabold text-sm text-slate-800">{t('class_rank')} {studentRank.rank} / {studentRank.total}</span>
                                </div>
                              )}
                              {attendanceSummary && (
                                <div className="flex justify-between items-center py-0.5 font-serif">
                                  <span className="italic">{t('school_attendance')}:</span>
                                  <span className="font-mono font-extrabold text-[11px] text-slate-800">
                                    {attendanceSummary.total > 0 ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100) : 100}% ({attendanceSummary.present}/{attendanceSummary.total} days)
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-2 font-serif text-xs text-slate-800">
                              <h4 className="font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1 font-serif text-slate-900">{t('registrar_credentials')}</h4>
                              <p className="italic leading-normal text-[11px]">{t('registrar_cert_text').replace('{name}', student.name)}</p>
                            </div>
                          </div>

                          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs font-serif">
                            <div className="space-y-1"><div className="border-b border-slate-400 mx-auto w-48 h-6" /><span className="text-slate-500 font-bold uppercase tracking-wide text-[9px] block">{t('registrar_signature')}</span></div>
                            <div className="space-y-1"><div className="border-b border-slate-400 mx-auto w-48 h-6" /><span className="text-slate-500 font-bold uppercase tracking-wide text-[9px] block">{t('principal_signature')}</span></div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

              </div>
            </div>

            <div className="p-4 bg-muted border-t border-border flex justify-end gap-2 print:hidden shrink-0">
              <button onClick={onClose} className="px-5 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors">{t('return_to_dashboard')}</button>
            </div>

          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
