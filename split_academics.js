const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/academics/page.tsx');
// Restore from backup
// Wait, I overwrote it. Let's just read from ParentAcademics since it has the whole file.
const content = require('fs').readFileSync(path.join(__dirname, 'components/dashboard/academics/ParentAcademics.tsx'), 'utf-8');

const imports = content.substring(0, content.indexOf('export default function AcademicsPage()'));

const adminStart = content.indexOf('function AdminAcademics()');
const teacherStart = content.indexOf('function TeacherAcademics()');
const parentStart = content.indexOf('function ParentAcademics()');

const adminContent = content.substring(adminStart, teacherStart);
const teacherContent = content.substring(teacherStart, parentStart);
const parentContent = content.substring(parentStart);

const adminFile = imports + 'export ' + adminContent;
const teacherFile = imports + 'export ' + teacherContent;
const parentFile = imports + 'export ' + parentContent;

fs.writeFileSync(path.join(__dirname, 'components/dashboard/academics/AdminAcademics.tsx'), adminFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/academics/TeacherAcademics.tsx'), teacherFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/academics/ParentAcademics.tsx'), parentFile);

const newPageContent = imports + `
import { AdminAcademics } from "@/components/dashboard/academics/AdminAcademics";
import { TeacherAcademics } from "@/components/dashboard/academics/TeacherAcademics";
import { ParentAcademics } from "@/components/dashboard/academics/ParentAcademics";

export default function AcademicsPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const { t } = useLanguage();

  if (!user) return null;

  if (!can('view', 'academics')) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  if (isRole("teacher")) return <TeacherAcademics />;
  if (isRole(["parent", "student"])) return <ParentAcademics />;
  if (isRole(["admin"])) return <AdminAcademics />;

  return (
    <div className="p-4">You do not have permission to view this page.</div>
  );
}
`;

fs.writeFileSync(filePath, newPageContent);
console.log('Done splitting academics page correctly');


