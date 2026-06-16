export function getLetterGrade(score: number): string {
  if (score >= 90) return 'A*';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  return 'U';
}

export interface TemplateBRow {
  id: string;
  name: string;
  t1: number | null;
  t2: number | null;
  m1: number | null;
  m2: number | null;
  m3: number | null;
  m4: number | null;
  monthlyAvg: number | null;
  finalS: number | null;
  obtained: number | null;
  grade: string;
}

export function compileTemplateBRows(printStudentAllGrades: any[], subjects: any[]): TemplateBRow[] {
  if (!printStudentAllGrades || !subjects.length) return [];

  return subjects.map((sub: any) => {
    const t1 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Term 1')?.score ?? null;
    const t2 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Term 2')?.score ?? null;
    const finalS = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Final')?.score ?? null;

    const m1 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 1')?.score ?? null;
    const m2 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 2')?.score ?? null;
    const m3 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 3')?.score ?? null;
    const m4 = printStudentAllGrades.find(g => g.subject_id === sub.id && g.term === 'Month 4')?.score ?? null;

    const monthlyScores = [m1, m2, m3, m4].filter((s): s is number => s !== null);
    const monthlyAvg = monthlyScores.length > 0 ? Math.round(monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length) : null;

    let totalWeight = 0;
    let weightedSum = 0;

    if (t1 !== null) { weightedSum += t1 * 0.25; totalWeight += 0.25; }
    if (t2 !== null) { weightedSum += t2 * 0.25; totalWeight += 0.25; }
    if (monthlyAvg !== null) { weightedSum += monthlyAvg * 0.20; totalWeight += 0.20; }
    if (finalS !== null) { weightedSum += finalS * 0.30; totalWeight += 0.30; }

    const obtainedAvg = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
    const rawObtained = obtainedAvg ?? t1 ?? t2 ?? monthlyAvg ?? finalS ?? null;

    return {
      id: sub.id,
      name: sub.name,
      t1, t2, m1, m2, m3, m4, monthlyAvg, finalS,
      obtained: rawObtained,
      grade: rawObtained !== null ? getLetterGrade(rawObtained) : 'N/A'
    };
  });
}

export function compileTemplateBGrandAverage(rows: TemplateBRow[]): { percent: number; letter: string } {
  const validScores = rows.map(r => r.obtained).filter((s): s is number => s !== null);
  if (validScores.length === 0) return { percent: 0, letter: 'N/A' };
  const avg = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  return { percent: avg, letter: getLetterGrade(avg) };
}
