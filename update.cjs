const fs = require('fs');
const execSync = require('child_process').execSync;

execSync('git checkout -- src/components/TenancySetupWizard.tsx');
const originalCode = fs.readFileSync('src/components/TenancySetupWizard.tsx', 'utf8');
const uiPart = fs.readFileSync('C:/Users/Jainam Jain/.gemini/antigravity/brain/bcd3c128-5f3b-48aa-a104-2ca5d96ff99d/scratch/new_ui_v7.tsx', 'utf8');

const regex = /  return \([\s\S]*$/;
const match = originalCode.match(regex);
if (!match) {
    console.error('Could not find return block via regex');
    process.exit(1);
}

const topPart = originalCode.substring(0, match.index);
const newContent = topPart + uiPart + '\n}\n';
fs.writeFileSync('src/components/TenancySetupWizard.tsx', newContent);
console.log('Update complete v5');
