import re

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # Fix Calendar imports
        content = content.replace("import { Calendar, DashboardLayout }", "import { DashboardLayout }")
        content = content.replace("import { Calendar, supabase }", "import { supabase }")
        content = content.replace("import { Calendar, useAuth }", "import { useAuth }")
        content = content.replace("import { Calendar, useState", "import { useState")
        
        # Add Calendar back properly
        if "Calendar" not in content[:500]:
            content = content.replace("import { ", "import { Calendar, ", 1)

        # Fix setSavedContext / setWizardStep
        content = content.replace("setSavedContext(ctx); setWizardStep('resume');", "")
        content = content.replace("setSavedContext(ctx); setSelectedProperty(prop);", "setSelectedProperty(prop);")
        
        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("Fixed TS errors.")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
