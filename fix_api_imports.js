const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'lib/api');
const files = fs.readdirSync(apiDir);

files.forEach(file => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(apiDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Fix supabase import
    content = content.replace(/from '\.\/supabase\/client'/g, "from '@/lib/supabase/client'");
    
    // Fix mock-db import
    content = content.replace(/from '\.\/mock-db'/g, "from '@/lib/mock-db'");
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in ${file}`);
  }
});
