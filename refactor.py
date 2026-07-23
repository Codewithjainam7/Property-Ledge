import re
import sys

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        print("Original size:", len(content))

        # 1. Remove WizardStep and SavedContext usage from state
        content = re.sub(r"const \[wizardStep, setWizardStep\]\s*=\s*useState<WizardStep>\('property'\);\n\s*", "", content)
        content = re.sub(r"const \[savedContext, setSavedContext\]\s*=\s*useState<SavedContext \| null>\(null\);\n\s*", "", content)

        # 2. Update Context Fetching in useEffect
        fetch_effect_old = """    const fetch = async () => {
      setLoading(true);
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from('properties').select('id,address,suburb,property_category,status').eq('owner_id', user.id).order('address'),
        supabase.from('leases').select('id,property_id,status,start_date,end_date,rent_amount,payment_frequency').eq('created_by', user.id).order('start_date', { ascending: false }),
      ]);
      setProperties(p || []); setLeases(l || []);
      setLoading(false);
    };
    fetch();"""
        fetch_effect_new = """    const fetch = async () => {
      setLoading(true);
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from('properties').select('id,address,suburb,property_category,status').eq('owner_id', user.id).order('address'),
        supabase.from('leases').select('id,property_id,status,start_date,end_date,rent_amount,payment_frequency').eq('created_by', user.id).order('start_date', { ascending: false }),
      ]);
      const props = p || [];
      const lses = l || [];
      setProperties(props); setLeases(lses);

      let initialProp = props[0] || null;
      let initialLease = null;

      const raw = localStorage.getItem(CONTEXT_KEY);
      if (raw) {
        try {
          const ctx = JSON.parse(raw);
          const foundProp = props.find(x => x.id === ctx.propertyId);
          const foundLease = lses.find(x => x.id === ctx.leaseId);
          if (foundProp && foundLease) {
            initialProp = foundProp;
            initialLease = foundLease;
          }
        } catch { localStorage.removeItem(CONTEXT_KEY); }
      }

      if (!initialLease && initialProp) {
        initialLease = lses.find(x => x.property_id === initialProp.id && x.status === 'Active') || lses.find(x => x.property_id === initialProp.id) || null;
      }

      if (initialProp && initialLease) {
         await openDashboard(initialProp, initialLease);
      } else {
         setLoading(false);
      }
    };
    fetch();"""
        content = content.replace(fetch_effect_old, fetch_effect_new)

        # 3. Simplify openDashboard to remove setWizardStep
        content = content.replace("setPayments(pData || []); setExpenses(eData); setDashLoading(false); setWizardStep('dashboard');", "setPayments(pData || []); setExpenses(eData); setDashLoading(false); setLoading(false);")
        
        # 4. Remove resumeContext and changeContext
        content = re.sub(r"const resumeContext = useCallback\([\s\S]*?\]\);\n\s*", "", content)
        content = content.replace("const changeContext = () => { setSelectedProperty(null); setSelectedLease(null); setPropertySearch(''); setView('payments'); setSelectedRows(new Set()); setPanelRow(null); setWizardStep('property'); };", "")

        # 5. Remove Wizard UI from render
        # Find the start of the RENDER section
        render_start = content.find("  // RENDER")
        if render_start == -1:
            print("Could not find RENDER section")
            sys.exit(1)
        
        dashboard_start = content.find("{/* ════════════════════════════════════════════════════════", render_start)
        toast_end = content.find("{/* ════════ WIZARD: RESUME ════════ */}", render_start)
        
        if toast_end != -1 and dashboard_start != -1:
            # We replace everything between toast_end and dashboard_start with empty string
            content = content[:toast_end] + content[dashboard_start:]
            
        # 6. Change the dashboard wrapper condition
        content = content.replace("{wizardStep === 'dashboard' && selectedProperty && selectedLease && (", "{(selectedProperty && selectedLease) ? (")

        # Find the final closing of dashboard and add the else fallback
        # Wait, the closing braces of dashboard might be tricky, it's just `)}` at the end of the file.
        # Let's replace the last `        )}` before `      </div>`
        content = re.sub(r"        \)\}\n\n      </div>\n    </DashboardLayout>", r"""        ) : (
          <div className="flex-1 min-h-[80vh] flex items-center justify-center">
            {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#a9927d]" /> : <p className="text-[#a9927d]">No properties or leases available.</p>}
          </div>
        )}

      </div>
    </DashboardLayout>""", content)

        # Add new state for the context selector menu and date range filter
        state_additions = """
  // ── Toolbar State ──
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [dateRange, setDateRange] = useState('All Time');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
"""
        content = content.replace("// ── Workspace State ──", state_additions + "\n  // ── Workspace State ──")
        
        # We'll also need a ref for context menu
        # It's better if I write this cleanly.
        
        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)

        print("New size:", len(content))
        print("Refactoring initial steps complete.")

    except Exception as e:
        print("Error:", e)
        raise e

if __name__ == '__main__':
    main()
