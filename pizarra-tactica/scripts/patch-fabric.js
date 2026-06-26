const fs = require('fs');
const path = require('path');

const fabricPath = path.join(__dirname, '..', 'node_modules', 'fabric', 'dist', 'fabric.js');
let content = fs.readFileSync(fabricPath, 'utf8');

let changed = false;

const replacements = [
  { from: /(var jsdom = require\(['"]jsdom['"]\);?)/g, to: 'var jsdom = null;' },
  { from: /(require\(['"]jsdom\/lib\/jsdom\/living\/generated\/utils['"]\)\.implForWrapper)/g, to: 'null' },
  { from: /(require\(['"]jsdom\/lib\/jsdom\/utils['"]\)\.Canvas)/g, to: 'null' }
];

for (const r of replacements) {
  if (r.from.test(content)) {
    content = content.replace(r.from, r.to);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(fabricPath, content, 'utf8');
  console.log('Fabric.js patched: jsdom references removed');
} else {
  console.log('Fabric.js already patched or jsdom not found');
}
