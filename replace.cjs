const fs = require('fs');
const path = require('path');
const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  { regex: /bg-\[#3c6e71\]/g, replace: 'bg-primary' },
  { regex: /text-\[#3c6e71\]/g, replace: 'text-primary' },
  { regex: /bg-\[#356064\]/g, replace: 'bg-primary' },
  { regex: /text-\[#356064\]/g, replace: 'text-primary' },
  { regex: /hover:bg-\[#254548\]/g, replace: 'hover:bg-primary/90' },
  { regex: /bg-\[#bce4ec\]/g, replace: 'bg-secondary-container' },
  { regex: /text-\[#2f4f4f\]/g, replace: 'text-on-secondary-container' },
  { regex: /bg-\[#e2e6e9\]/g, replace: 'bg-surface-container-high' },
  { regex: /text-\[#333333\]/g, replace: 'text-on-surface' },
  { regex: /text-\[#6a808f\]/g, replace: 'text-on-surface-variant' },
  { regex: /border-\[#e2e8f0\]/g, replace: 'border-outline-variant/50' },
  { regex: /bg-\[#f8f9fa\]/g, replace: 'bg-surface-container-low' },
  { regex: /border-\[#d2d6dc\]/g, replace: 'border-outline-variant' },
  { regex: /text-\[#a0aab2\]/g, replace: 'text-outline' },
  { regex: /bg-\[#c8dfe3\]/g, replace: 'bg-surface-container-highest' },
  { regex: /hover:bg-\[#e2e6e9\]/g, replace: 'hover:bg-surface-container-highest' },
  { regex: /bg-\[#2b2d42\]/g, replace: 'bg-surface-container-high' },
  { regex: /text-\[#8d99ae\]/g, replace: 'text-on-surface-variant' }
];

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const rule of replacements) {
    content = content.replace(rule.regex, rule.replace);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  }
}
