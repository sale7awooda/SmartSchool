const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/settings/page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

const imports = content.substring(0, content.indexOf('export default function SettingsPage()'));

const addStaffStart = content.indexOf('function AddStaffModal(');
const addMasterStart = content.indexOf('function AddMasterModal(');

const settingsPageContent = content.substring(content.indexOf('export default function SettingsPage()'), addStaffStart);

const addStaffContent = content.substring(addStaffStart, addMasterStart);
const addMasterContent = content.substring(addMasterStart);

const addStaffFile = imports + 'export ' + addStaffContent;
const addMasterFile = imports + 'export ' + addMasterContent;

fs.mkdirSync(path.join(__dirname, 'components/dashboard/settings'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'components/dashboard/settings/AddStaffModal.tsx'), addStaffFile);
fs.writeFileSync(path.join(__dirname, 'components/dashboard/settings/AddMasterModal.tsx'), addMasterFile);

const newPageContent = imports + `
import { AddStaffModal } from "@/components/dashboard/settings/AddStaffModal";
import { AddMasterModal } from "@/components/dashboard/settings/AddMasterModal";

` + settingsPageContent;

fs.writeFileSync(filePath, newPageContent);
console.log('Done splitting settings page');
