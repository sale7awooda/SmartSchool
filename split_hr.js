const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/hr/page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

const imports = content.substring(0, content.indexOf('export default function HRPage()'));

const directoryStart = content.indexOf('function DirectoryTab(');
const leaveStart = content.indexOf('function LeaveTab(');
const payrollStart = content.indexOf('function PayrollTab(');
const financialsStart = content.indexOf('function FinancialsTab(');
const documentsStart = content.indexOf('function DocumentsTab(');

const hrPageContent = content.substring(content.indexOf('export default function HRPage()'), directoryStart);

const directoryContent = content.substring(directoryStart, leaveStart);
const leaveContent = content.substring(leaveStart, payrollStart);
const payrollContent = content.substring(payrollStart, financialsStart);
const financialsContent = content.substring(financialsStart, documentsStart);
const documentsContent = content.substring(documentsStart);

const directoryFile = imports + 'export ' + directoryContent;
const leaveFile = imports + 'export ' + leaveContent;
const payrollFile = imports + 'export ' + payrollContent;
const financialsFile = imports + 'export ' + financialsContent;
const documentsFile = imports + 'export ' + documentsContent;

fs.mkdirSync(path.join(__dirname, 'components/dashboard/hr'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'components/dashboard/hr/DirectoryTab.tsx'), directoryFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/hr/LeaveTab.tsx'), leaveFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/hr/PayrollTab.tsx'), payrollFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/hr/FinancialsTab.tsx'), financialsFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/hr/DocumentsTab.tsx'), documentsFile);

const newPageContent = imports + `
import { DirectoryTab } from "@/components/dashboard/hr/DirectoryTab";
import { LeaveTab } from "@/components/dashboard/hr/LeaveTab";
import { PayrollTab } from "@/components/dashboard/hr/PayrollTab";
import { FinancialsTab } from "@/components/dashboard/hr/FinancialsTab";
import { DocumentsTab } from "@/components/dashboard/hr/DocumentsTab";

` + hrPageContent;

fs.writeFileSync(filePath, newPageContent);
console.log('Done splitting HR page');
