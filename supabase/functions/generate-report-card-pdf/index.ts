import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from 'https://esm.sh/jspdf-autotable@3.5.31';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { student_id, term, academic_year } = await req.json();
    if (!student_id || !term) {
      return new Response(JSON.stringify({ error: 'student_id and term are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Student not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('*, subject:subjects(name)')
      .eq('student_id', student_id)
      .eq('term', term)
      .eq('academic_year', academic_year || '2025-2026');

    if (gradesError) {
      return new Response(JSON.stringify({ error: 'Grades fetch error.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Attempt to get attendance summary
    const { data: attendanceData, error: attError } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', student_id);

    let present = 0, absent = 0, late = 0;
    if (!attError && attendanceData) {
       present = attendanceData.filter(a => a.status === 'present').length;
       absent = attendanceData.filter(a => a.status === 'absent').length;
       late = attendanceData.filter(a => a.status === 'late').length;
    }
    const totalDays = present + absent + late;
    const attPercentage = totalDays > 0 ? ((present + late * 0.5) / totalDays * 100).toFixed(1) : '100.0';

    // 3. Fetch all grades for this grade level and term to calculate rank
    const { data: classGrades, error: classGradesError } = await supabase
      .from('grades')
      .select('student_id, score, score_max, students!inner(grade)')
      .eq('term', term)
      .eq('academic_year', academic_year || '2025-2026')
      .eq('students.grade', student.grade);

    let rankString = 'N/A';
    
    if (!classGradesError && classGrades && classGrades.length > 0) {
      // Calculate average percentage per student
      const studentAverages = new Map<string, { totalScores: number, totalMax: number }>();
      
      classGrades.forEach((g: any) => {
        if (g.score !== null && g.score_max !== null) {
          const current = studentAverages.get(g.student_id) || { totalScores: 0, totalMax: 0 };
          current.totalScores += g.score;
          current.totalMax += g.score_max;
          studentAverages.set(g.student_id, current);
        }
      });

      // Convert to percentages and sort
      const rankings: { id: string, percentage: number }[] = [];
      studentAverages.forEach((val, id) => {
        if (val.totalMax > 0) {
          rankings.push({ id, percentage: (val.totalScores / val.totalMax) * 100 });
        }
      });

      rankings.sort((a, b) => b.percentage - a.percentage);
      
      const currentStudentIndex = rankings.findIndex(r => r.id === student_id);
      if (currentStudentIndex !== -1) {
        rankString = `${currentStudentIndex + 1} of ${rankings.length}`;
      }
    }

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Official Report Card", 14, 25);
    
    doc.setFontSize(12);
    doc.text(`Student: ${student.first_name} ${student.last_name}`, 14, 38);
    doc.text(`Grade: ${student.grade || 'N/A'}`, 14, 44);
    doc.text(`Roll Number: ${student.roll_number || 'N/A'}`, 14, 50);
    doc.text(`Class Rank: ${rankString}`, 14, 56);
    
    doc.text(`Term: ${term}`, 120, 38);
    doc.text(`Academic Year: ${academic_year || '2025-2026'}`, 120, 44);

    // Write Attendance
    doc.setFontSize(10);
    doc.text(`Attendance Summary: ${present} Present | ${absent} Absent | ${late} Late`, 14, 64);
    doc.text(`Attendance Rate: ${attPercentage}%`, 14, 69);

    autoTable(doc, {
      startY: 75,
      head: [['Subject', 'Score', 'Max', 'Percentage', 'Grade', 'Teacher Remarks']],
      body: grades?.map(g => [
        (g.subject as any)?.name || 'Unknown',
        g.score?.toString() || '-',
        g.score_max?.toString() || '-',
        (g.score && g.score_max) ? ((g.score/g.score_max)*100).toFixed(1)+'%' : '-',
        (g.score && g.score_max) ? (((g.score/g.score_max)*100) >= 90 ? 'A' : (((g.score/g.score_max)*100) >= 80 ? 'B' : (((g.score/g.score_max)*100) >= 70 ? 'C' : 'F'))) : '-',
        g.remarks || ''
      ]) || []
    });

    const pdfArrayBuffer = doc.output("arraybuffer");
    return new Response(pdfArrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-card-${student_id}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
