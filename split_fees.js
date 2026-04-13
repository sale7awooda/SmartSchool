const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/fees/page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

const imports = content.substring(0, content.indexOf('export default function FeesPage()'));

const accountantStart = content.indexOf('function AccountantFees()');
const parentStart = content.indexOf('function ParentFees()');

const accountantContent = content.substring(accountantStart, parentStart);
const parentContent = content.substring(parentStart);

const accountantFile = imports + 'export ' + accountantContent;
const parentFile = imports + 'export ' + parentContent;

fs.mkdirSync(path.join(__dirname, 'components/dashboard/fees'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'components/dashboard/fees/AccountantFees.tsx'), accountantFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/fees/ParentFees.tsx'), parentFile);

const newPageContent = imports + `
import { AccountantFees } from "@/components/dashboard/fees/AccountantFees";
import { ParentFees } from "@/components/dashboard/fees/ParentFees";

export default function FeesPage() {
  const { user } = useAuth();
  const { can, isRole } = usePermissions();
  const { t } = useLanguage();

  if (!user) return null;

  if (!can('view', 'fees')) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  if (isRole(["parent", "student"])) return <ParentFees />;
  if (isRole(["admin", "accountant"])) return <AccountantFees />;

  return (
    <div className="p-4">You do not have permission to view this page.</div>
  );
}
`;

fs.writeFileSync(filePath, newPageContent);
console.log('Done splitting fees page');
