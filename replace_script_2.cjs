const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacements = [
  { regex: /bg-\[#0c0628\]/gi, replace: 'bg-surface' },
  { regex: /bg-\[#08041a\]/gi, replace: 'bg-surface' },
  { regex: /bg-\[#03010b\]/gi, replace: 'bg-surface-container' },
  { regex: /text-\[#a0aab2\]/gi, replace: 'text-on-surface-variant' },
];

for (const rule of replacements) {
  content = content.replace(rule.regex, rule.replace);
}

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated again.');
