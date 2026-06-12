import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase
    .from('schedules')
    .select(`
      *,
      teacher:users(name),
      subject:subjects(name),
      class:classes(name)
    `);
  console.log(`Length from DB: ${data?.length}`);

  const extractedMappings = [];
  const mappingCounts = {};

  data?.forEach(s => {
    const gradeName = s.class?.name || 'Unknown';
    const subjectName = s.subject?.name || 'Unknown';
    const teacherName = s.teacher?.name || 'Unknown';
    const key = `${gradeName}-${subjectName}-${teacherName}`;
    mappingCounts[key] = (mappingCounts[key] || 0) + 1;
  });

  Object.entries(mappingCounts).forEach(([key, count]) => {
    const [grade, subject, teacher] = key.split('-');
    extractedMappings.push({
      grade,
      subject,
      teacher,
      classesPerWeek: count
    });
  });

  console.log(`Total Mappings created: ${extractedMappings.length}`);
  const totalClassesMapped = extractedMappings.reduce((acc, m) => acc + m.classesPerWeek, 0);
  console.log(`Total Classes mapped: ${totalClassesMapped}`);
  
  const issue = extractedMappings.filter(m => m.teacher === undefined || m.subject === undefined);
  console.log('Any broken mappings from split(-)?', issue);
}
run();
