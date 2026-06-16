import { describe, it, expect } from 'vitest';
import { getLetterGrade, compileTemplateBRows, compileTemplateBGrandAverage } from '@/components/dashboard/students/grade-cards/grade-utils';

describe('getLetterGrade', () => {
  it('returns A* for score >= 90', () => {
    expect(getLetterGrade(90)).toBe('A*');
    expect(getLetterGrade(100)).toBe('A*');
    expect(getLetterGrade(95)).toBe('A*');
  });

  it('returns A for 80-89', () => {
    expect(getLetterGrade(80)).toBe('A');
    expect(getLetterGrade(89)).toBe('A');
    expect(getLetterGrade(84)).toBe('A');
  });

  it('returns B for 70-79', () => {
    expect(getLetterGrade(70)).toBe('B');
    expect(getLetterGrade(79)).toBe('B');
    expect(getLetterGrade(75)).toBe('B');
  });

  it('returns C for 60-69', () => {
    expect(getLetterGrade(60)).toBe('C');
    expect(getLetterGrade(69)).toBe('C');
  });

  it('returns D for 50-59', () => {
    expect(getLetterGrade(50)).toBe('D');
    expect(getLetterGrade(59)).toBe('D');
  });

  it('returns E for 40-49', () => {
    expect(getLetterGrade(40)).toBe('E');
    expect(getLetterGrade(49)).toBe('E');
  });

  it('returns U for score < 40', () => {
    expect(getLetterGrade(39)).toBe('U');
    expect(getLetterGrade(0)).toBe('U');
    expect(getLetterGrade(-5)).toBe('U');
  });

  it('handles boundary values correctly', () => {
    expect(getLetterGrade(89)).toBe('A');
    expect(getLetterGrade(90)).toBe('A*');
    expect(getLetterGrade(79)).toBe('B');
    expect(getLetterGrade(80)).toBe('A');
  });
});

describe('compileTemplateBRows', () => {
  const subjects = [
    { id: 'sub-1', name: 'Mathematics' },
    { id: 'sub-2', name: 'English' },
  ];

  it('returns empty array when no subjects', () => {
    const result = compileTemplateBRows([{ subject_id: 'sub-1', term: 'Term 1', score: 85 }], []);
    expect(result).toEqual([]);
  });

  it('returns empty array when grades is null or undefined', () => {
    const result = compileTemplateBRows(null as any, subjects);
    expect(result).toEqual([]);
  });

  it('maps subject grades with correct term weighting', () => {
    const grades = [
      { subject_id: 'sub-1', term: 'Term 1', score: 80 },
      { subject_id: 'sub-1', term: 'Term 2', score: 90 },
      { subject_id: 'sub-1', term: 'Final', score: 85 },
      { subject_id: 'sub-1', term: 'Month 1', score: 70 },
      { subject_id: 'sub-1', term: 'Month 2', score: 80 },
    ];

    const result = compileTemplateBRows(grades, subjects);

    expect(result).toHaveLength(2);
    const math = result[0];
    expect(math.name).toBe('Mathematics');
    expect(math.t1).toBe(80);
    expect(math.t2).toBe(90);
    expect(math.m1).toBe(70);
    expect(math.m2).toBe(80);
    expect(math.m3).toBeNull();
    expect(math.m4).toBeNull();
    expect(math.finalS).toBe(85);
    expect(math.monthlyAvg).toBe(75);
  });

  it('computes obtained score weighted correctly', () => {
    const grades = [
      { subject_id: 'sub-1', term: 'Term 1', score: 80 },
      { subject_id: 'sub-1', term: 'Term 2', score: 90 },
      { subject_id: 'sub-1', term: 'Final', score: 85 },
      { subject_id: 'sub-1', term: 'Month 1', score: 70 },
      { subject_id: 'sub-1', term: 'Month 2', score: 80 },
    ];

    const result = compileTemplateBRows(grades, subjects);
    // weighted: (80*0.25)+(90*0.25)+(75*0.20)+(85*0.30) / (0.25+0.25+0.20+0.30)
    // = (20+22.5+15+25.5) / 1.0 = 83
    expect(result[0].obtained).toBe(83);
    expect(result[0].grade).toBe('A');
  });

  it('handles missing terms (null scores)', () => {
    const grades = [
      { subject_id: 'sub-1', term: 'Term 1', score: 80 },
      { subject_id: 'sub-1', term: 'Final', score: 90 },
    ];

    const result = compileTemplateBRows(grades, subjects);
    const math = result[0];
    expect(math.t1).toBe(80);
    expect(math.t2).toBeNull();
    expect(math.finalS).toBe(90);
    expect(math.monthlyAvg).toBeNull();
    // weighted: (80*0.25)+(90*0.30) / (0.25+0.30) = (20+27)/0.55 = 85.45 -> 85
    expect(math.obtained).toBe(85);
  });

  it('returns N/A grade when no scores at all', () => {
    const result = compileTemplateBRows([], subjects);
    expect(result[0].grade).toBe('N/A');
    expect(result[0].obtained).toBeNull();
  });

  it('handles multiple subjects independently', () => {
    const grades = [
      { subject_id: 'sub-1', term: 'Term 1', score: 70 },
      { subject_id: 'sub-2', term: 'Term 1', score: 95 },
    ];

    const result = compileTemplateBRows(grades, subjects);
    expect(result[0].name).toBe('Mathematics');
    expect(result[0].obtained).toBe(70);
    expect(result[0].grade).toBe('B');
    expect(result[1].name).toBe('English');
    expect(result[1].obtained).toBe(95);
    expect(result[1].grade).toBe('A*');
  });
});

describe('compileTemplateBGrandAverage', () => {
  it('computes average of all obtained scores', () => {
    const rows = [
      { obtained: 80, grade: 'A' },
      { obtained: 90, grade: 'A*' },
      { obtained: 70, grade: 'B' },
    ] as any;

    const result = compileTemplateBGrandAverage(rows);
    // avg = (80+90+70)/3 = 80
    expect(result.percent).toBe(80);
    expect(result.letter).toBe('A');
  });

  it('filters out null obtained scores', () => {
    const rows = [
      { obtained: 80, grade: 'A' },
      { obtained: null, grade: 'N/A' },
      { obtained: 90, grade: 'A*' },
    ] as any;

    const result = compileTemplateBGrandAverage(rows);
    // avg = (80+90)/2 = 85
    expect(result.percent).toBe(85);
    expect(result.letter).toBe('A');
  });

  it('returns 0 and N/A when no valid scores', () => {
    const rows = [
      { obtained: null, grade: 'N/A' },
    ] as any;

    const result = compileTemplateBGrandAverage(rows);
    expect(result.percent).toBe(0);
    expect(result.letter).toBe('N/A');
  });

  it('returns 0 and N/A for empty array', () => {
    const result = compileTemplateBGrandAverage([]);
    expect(result.percent).toBe(0);
    expect(result.letter).toBe('N/A');
  });

  it('rounds the average', () => {
    const rows = [
      { obtained: 83, grade: 'B' },
      { obtained: 84, grade: 'B' },
    ] as any;

    const result = compileTemplateBGrandAverage(rows);
    // avg = (83+84)/2 = 83.5 -> 84
    expect(result.percent).toBe(84);
    expect(result.letter).toBe('A');
  });
});
