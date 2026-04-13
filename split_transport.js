const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/transport/page.tsx');
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

const adminModalLines = lines.slice(987, 1234);

fs.mkdirSync(path.join(__dirname, 'components/dashboard/transport'), { recursive: true });

const content = `import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Search, Plus, Calendar, MapPin, UserCircle, Phone, Mail, Heart, Activity, AlertCircle, Star, ThumbsUp, ThumbsDown, Camera, UserPlus, Settings, Trash2, Edit, Bus, Users, Clock, Shield, Map } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function AdminModal({ isModalOpen, setIsModalOpen, modalMode, formData, setFormData, handleSaveRoute, isSubmitting, t }: any) {
  return (
    <AnimatePresence>
${adminModalLines.join('\n')}
    </AnimatePresence>
  );
}
`;

fs.writeFileSync(path.join(__dirname, 'components/dashboard/transport/AdminModal.tsx'), content);

const newLines = [
  ...lines.slice(0, 987),
  '      <AdminModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} modalMode={modalMode} formData={formData} setFormData={setFormData} handleSaveRoute={handleSaveRoute} isSubmitting={isSubmitting} t={t} />',
  ...lines.slice(1234)
];

const imports = `
import { AdminModal } from '@/components/dashboard/transport/AdminModal';
`;

const finalContent = newLines.join('\n').replace("import { Skeleton } from '@/components/ui/skeleton';", "import { Skeleton } from '@/components/ui/skeleton';" + imports);

fs.writeFileSync(filePath, finalContent);
console.log('Done splitting transport page');
