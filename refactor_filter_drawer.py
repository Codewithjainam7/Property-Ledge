import re

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Add state
        state_str = "  const [dateMenuOpen, setDateMenuOpen] = useState(false);"
        if state_str in content:
            content = content.replace(state_str, state_str + "\n  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);")

        # 2. Remove inline status filter and add button
        status_filter_code = """                  {/* Status Filter */}
                  {view === 'payments' && (
                    <div className="relative">
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none bg-[#f2f4f3] border border-[#e6e8e7] rounded-md pl-3 pr-8 py-1.5 text-sm font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b] cursor-pointer hover:border-[#a9927d] transition-colors">
                        <option value="all">All Status</option>
                        {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a9927d] pointer-events-none" />
                    </div>
                  )}"""
        
        filter_button_code = """                  {/* Filter Drawer Button */}
                  <button onClick={() => setIsFilterDrawerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#f2f4f3] rounded-md border border-[#e6e8e7] text-sm font-semibold text-[#22333b] hover:border-[#a9927d] transition-colors whitespace-nowrap">
                    <SlidersHorizontal className="w-4 h-4 text-[#a9927d]" /> Filters
                    {statusFilter !== 'all' && <span className="w-2 h-2 rounded-full bg-[#22333b]"></span>}
                  </button>"""
                  
        if status_filter_code in content:
            content = content.replace(status_filter_code, filter_button_code)
            
        # 3. Add Filter Drawer overlay at the end of workspace
        # We find the Row count footer and insert the drawer right before it, or right after.
        footer_start = content.find("{/* Row count footer */}")
        if footer_start != -1:
            drawer_code = """
            {/* ── Filter Drawer ── */}
            {isFilterDrawerOpen && (
              <div className="fixed inset-0 z-[100] flex justify-end">
                <div className="absolute inset-0 bg-black/20" onClick={() => setIsFilterDrawerOpen(false)} />
                <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e8e7]">
                    <h2 className="text-lg font-bold text-[#22333b] flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" /> Filters</h2>
                    <button onClick={() => setIsFilterDrawerOpen(false)} className="p-1 text-[#a9927d] hover:text-[#22333b] hover:bg-[#f2f4f3] rounded-md transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#a9927d] uppercase tracking-widest">Status</label>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-[#f2f4f3] border border-[#e6e8e7] rounded-md px-3 py-2 text-sm font-semibold text-[#22333b] focus:ring-2 focus:border-[#22333b] outline-none hover:border-[#a9927d] transition-colors cursor-pointer">
                        <option value="all">All Statuses</option>
                        {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-2 opacity-50 pointer-events-none">
                      <label className="text-xs font-bold text-[#a9927d] uppercase tracking-widest">Tenant (Coming Soon)</label>
                      <select disabled className="w-full bg-[#f2f4f3] border border-[#e6e8e7] rounded-md px-3 py-2 text-sm font-semibold text-[#22333b]">
                        <option>All Tenants</option>
                      </select>
                    </div>
                  </div>
                  <div className="p-6 border-t border-[#e6e8e7] bg-[#f8faf9] flex items-center gap-3">
                    <button onClick={() => { setStatusFilter('all'); setIsFilterDrawerOpen(false); }} className="flex-1 py-2.5 text-sm font-bold text-[#22333b] bg-white border border-[#e6e8e7] rounded-md hover:border-[#a9927d] transition-colors">Clear All</button>
                    <button onClick={() => setIsFilterDrawerOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#22333b] rounded-md hover:bg-[#111a1e] transition-colors">Apply</button>
                  </div>
                </div>
              </div>
            )}
            
            """
            content = content[:footer_start] + drawer_code + content[footer_start:]
            
        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)

        print("Drawer refactoring applied successfully!")

    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
