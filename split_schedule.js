const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/schedule/wizard/page.tsx');
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

const draftsModalLines = lines.slice(1070, 1152);

fs.mkdirSync(path.join(__dirname, 'components/dashboard/schedule'), { recursive: true });

const content = `import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit, Save, Play, CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function DraftsModal({ isDraftModalOpen, setIsDraftModalOpen, drafts, loadDraft, handleDeleteDraft, isSubmitting }: any) {
  return (
    <AnimatePresence>
${draftsModalLines.join('\n')}
    </AnimatePresence>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'components/dashboard/schedule/DraftsModal.tsx'), content);

const newLines = [
  ...lines.slice(0, 1070),
  '      <DraftsModal isDraftModalOpen={isDraftModalOpen} setIsDraftModalOpen={setIsDraftModalOpen} drafts={drafts} loadDraft={loadDraft} handleDeleteDraft={handleDeleteDraft} isSubmitting={isSubmitting} />',
  ...lines.slice(1152)
];

const imports = `
import { DraftsModal } from '@/components/dashboard/schedule/DraftsModal';
`;

const finalContent = newLines.join('\n').replace("import { Skeleton } from '@/components/ui/skeleton';", "import { Skeleton } from '@/components/ui/skeleton';" + imports);

fs.writeFileSync(filePath, finalContent);
console.log('Done splitting schedule wizard page');
