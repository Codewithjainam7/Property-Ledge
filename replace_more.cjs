const fs = require('fs');
const path = require('path');
const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  // DashboardLayout.tsx
  { regex: /bg-\[#eff1f3\]/g, replace: 'bg-surface-container-low' },
  { regex: /bg-\[#ffffff\]/g, replace: 'bg-surface' },
  { regex: /text-\[#0C2B4B\]/g, replace: 'text-on-surface' },
  { regex: /bg-\[#0C2B4B\]/g, replace: 'bg-on-surface' },
  { regex: /bg-\[#d6e5e6\]/g, replace: 'bg-primary/10' },
  { regex: /text-\[#a0acb5\]/g, replace: 'text-outline' },
  { regex: /text-\[#c62828\]/g, replace: 'text-error' },
  { regex: /bg-\[#fdf0f0\]/g, replace: 'bg-error-container' },
  { regex: /border-\[#facdcd\]/g, replace: 'border-error/30' },
  { regex: /hover:bg-\[#fae3e3\]/g, replace: 'hover:bg-error-container/80' },
  
  // AccountSettings.tsx
  { regex: /border-\[#356064\]/g, replace: 'border-primary' },
  { regex: /ring-\[#356064\]/g, replace: 'ring-primary' },
  { regex: /bg-\[#eef3f7\]/g, replace: 'bg-surface-container-high' },

  // PropertyOnboarding.tsx (MUI Theme and inline styles)
  { regex: /main: '#3b22b5'/g, replace: "main: '#22333b'" },
  { regex: /main: '#5952af'/g, replace: "main: '#a9927d'" },
  { regex: /default: '#f9f9fd'/g, replace: "default: '#f2f4f3'" },
  { regex: /primary: '#1a1c1f'/g, replace: "primary: '#0a0908'" },
  { regex: /secondary: '#474554'/g, replace: "secondary: '#22333b'" },
  { regex: /'#ededf1'/g, replace: "'#c2b0a0'" },
  { regex: /backgroundColor: '#f9f9fd'/g, replace: "backgroundColor: '#f2f4f3'" },
  { regex: /bgcolor: '#ffffff'/g, replace: "bgcolor: '#f2f4f3'" }
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
