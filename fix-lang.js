const fs = require('fs');

const path = './lib/language-context.tsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
let inEn = false, inAr = false;
let seenEn = new Set(), seenAr = new Set();
let newLines = [];

for (let line of lines) {
    if (line.includes('en: {')) {
        inEn = true;
        inAr = false;
    } else if (line.includes('ar: {')) {
        inEn = false;
        inAr = true;
    } else if (line.match(/^\s*};\s*$/) || line.includes('export const')) {
        inEn = false;
        inAr = false;
    }
    
    let match = line.match(/^\s*'([^']+)'\s*:/);
    if (match) {
        let key = match[1];
        if (inEn) {
            if (seenEn.has(key)) continue;
            seenEn.add(key);
        } else if (inAr) {
            if (seenAr.has(key)) continue;
            seenAr.add(key);
        }
    }
    newLines.push(line);
}

fs.writeFileSync(path, newLines.join('\n'));
console.log('Fixed duplicates');
