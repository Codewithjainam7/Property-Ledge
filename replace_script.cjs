const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacements = [
  { regex: /bg-\[#f9f9fd\]/g, replace: 'bg-background' },
  { regex: /bg-\[#fcfdff\]/g, replace: 'bg-surface-container' },
  { regex: /bg-\[#0c0628\]/g, replace: 'bg-surface' },
  { regex: /bg-\[#08041a\]/g, replace: 'bg-surface' },
  { regex: /bg-\[#03010b\]/g, replace: 'bg-surface-container' },
  { regex: /text-\[#0f0b35\]/g, replace: 'text-on-surface' },
  { regex: /text-\[#5952af\]/g, replace: 'text-secondary' },
  { regex: /from-primary to-\[#6B3AFF\]/g, replace: 'bg-primary' },
  { regex: /to-\[#6B3AFF\]/g, replace: 'to-primary' },
  { regex: /from-\[#1A1A24\] to-\[#0D0D14\]/g, replace: 'bg-primary' },
  { regex: /bg-gradient-to-r from-primary to-primary/g, replace: 'bg-primary' },
  { regex: /bg-gradient-to-b bg-primary/g, replace: 'bg-primary' },
  { regex: /shadow-\[0_8px_30px_rgba\(59,34,181,0\.3\)\]/g, replace: 'shadow-sm' },
  { regex: /shadow-\[0_32px_80px_-12px_rgba\(59,34,181,0\.50\)\]/g, replace: 'shadow-md' },
  { regex: /bg-\[#1A1A24\]/g, replace: 'bg-primary' },
  { regex: /text-\[#333333\]/g, replace: 'text-on-surface' },
  { regex: /text-\[#a0aab2\]/g, replace: 'text-on-surface-variant' },
  { regex: /text-\[#a0acb5\]/g, replace: 'text-on-surface-variant' },
];

for (const rule of replacements) {
  content = content.replace(rule.regex, rule.replace);
}

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated.');
