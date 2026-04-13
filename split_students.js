const fs = require('fs');
const path = require('path');

function fixComponent(name) {
  const filePath = path.join(__dirname, `components/dashboard/students/${name}.tsx`);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace('      </AnimatePresence>\n    </AnimatePresence>\n  );\n}\n', '    </AnimatePresence>\n  );\n}\n');
  fs.writeFileSync(filePath, content);
}

fixComponent('PromotionModal');
fixComponent('DeleteModal');
fixComponent('AddStudentModal');
fixComponent('StudentProfileModal');

console.log('Fixed components');



