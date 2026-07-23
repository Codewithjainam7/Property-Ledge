import re

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # Find the start of the Workspace render
        workspace_start = content.find("{(selectedProperty && selectedLease) ? (")
        toolbar_end = content.find("            {/* ── Main Grid + Right Panel ── */}")
        
        if workspace_start == -1 or toolbar_end == -1:
            print("Could not find sections!")
            print("workspace_start:", workspace_start)
            print("toolbar_end:", toolbar_end)
            return

        new_header = """{(selectedProperty && selectedLease) ? (
          <div className="flex flex-col h-full">

            {/* ── Unified Command Toolbar ── */}
            <div className="bg-white border border-[#e6e8e7] rounded-md shadow-sm mb-4">
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 gap-4 border-b border-[#e6e8e7]">
                
                {/* Left Side: Context & Date Range */}
                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  
                  {/* Context Selector */}
                  <div className="relative">
                    <button onClick={() => setContextMenuOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 bg-[#f2f4f3] rounded-md border border-[#e6e8e7] text-sm font-semibold text-[#22333b] hover:border-[#a9927d] transition-colors whitespace-nowrap">
                      <Building2 className="w-4 h-4 text-[#a9927d]" />
                      <span className="truncate max-w-[120px]">{selectedProperty.address}</span>
                      <span className="text-[#a9927d]">/</span>
                      <span className="truncate max-w-[150px]">{selectedLease.start_date} → {selectedLease.end_date || 'Ongoing'}</span>
                      <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#a9927d]" />
                    </button>
                    {contextMenuOpen && (
                      <div className="absolute top-10 left-0 w-80 max-h-96 overflow-y-auto bg-white border border-[#e6e8e7] rounded-md shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                        {properties.map(p => {
                          const pLeases = leases.filter(l => l.property_id === p.id);
                          if (pLeases.length === 0) return null;
                          return (
                            <div key={p.id} className="border-b border-[#e6e8e7] last:border-b-0 pb-2 mb-2 last:pb-0 last:mb-0">
                              <div className="px-4 py-2 bg-[#f8faf9] flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-[#a9927d]" />
                                <span className="text-xs font-bold text-[#22333b]">{p.address}</span>
                              </div>
                              <div className="flex flex-col">
                                {pLeases.map(l => (
                                  <button key={l.id} 
                                    onClick={() => { setContextMenuOpen(false); openDashboard(p, l); }}
                                    className={`flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${selectedLease.id === l.id ? 'bg-[#22333b]/5' : 'hover:bg-[#f8faf9]'}`}>
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: l.status === 'Active' ? '#10b981' : l.status === 'Future' ? '#3b82f6' : '#94a3b8' }} />
                                    <div className="flex-col">
                                      <p className="text-xs font-semibold text-[#22333b]">
                                        {l.start_date} → {l.end_date || 'Ongoing'}
                                      </p>
                                      <p className="text-[10px] text-[#a9927d]">{fmt(l.rent_amount)} / {l.payment_frequency}</p>
                                    </div>
                                    {selectedLease.id === l.id && <Check className="w-4 h-4 ml-auto mt-0.5 text-[#22333b]" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Date Range Selector */}
                  <div className="relative">
                    <button onClick={() => setDateMenuOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 bg-[#f2f4f3] rounded-md border border-[#e6e8e7] text-sm font-semibold text-[#22333b] hover:border-[#a9927d] transition-colors whitespace-nowrap">
                      <Calendar className="w-4 h-4 text-[#a9927d]" />
                      {dateRange}
                      <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#a9927d]" />
                    </button>
                    {dateMenuOpen && (
                      <div className="absolute top-10 left-0 w-48 bg-white border border-[#e6e8e7] rounded-md shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100 p-1">
                        {['All Time', 'This Month', 'Last Month', 'This Year', 'Last Year'].map(r => (
                          <button key={r} onClick={() => { setDateRange(r); setDateMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-sm hover:bg-[#f2f4f3] transition-colors flex items-center justify-between ${dateRange === r ? 'text-[#22333b]' : 'text-[#5e503f]'}`}>
                            {r}
                            {dateRange === r && <Check className="w-3.5 h-3.5 text-[#22333b]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Filter */}
                  {view === 'payments' && (
                    <div className="relative">
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none bg-[#f2f4f3] border border-[#e6e8e7] rounded-md pl-3 pr-8 py-1.5 text-sm font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b] cursor-pointer hover:border-[#a9927d] transition-colors">
                        <option value="all">All Status</option>
                        {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a9927d] pointer-events-none" />
                    </div>
                  )}

                  <div className="h-6 w-px bg-[#e6e8e7] mx-1 hidden sm:block"></div>
                  
                  {/* Global Search */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a9927d]" />
                    <input type="text" placeholder="Search data..." value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#f2f4f3] border border-[#e6e8e7] rounded-md text-sm focus:ring-2 focus:border-[#22333b] focus:ring-[#22333b] outline-none transition-all placeholder-[#a9927d]" />
                  </div>

                </div>

                {/* Right Side: Actions & Export */}
                <div className="flex items-center gap-2">
                   <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e6e8e7] text-[#22333b] rounded-md text-xs font-bold hover:bg-[#f2f4f3] transition-colors whitespace-nowrap">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  {view === 'payments' && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22333b] text-white rounded-md text-xs font-bold hover:bg-[#111a1e] transition-colors whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Generate Invoice
                    </button>
                  )}
                  {view === 'expenses' && (
                    <button onClick={() => setPanelRow({ id: '__new_expense__' } as any)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22333b] text-white rounded-md text-xs font-bold hover:bg-[#111a1e] transition-colors whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Add Expense
                    </button>
                  )}
                  {view === 'statements' && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22333b] text-white rounded-md text-xs font-bold hover:bg-[#111a1e] transition-colors whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Add Bank Entry
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Views (Tabs) & Density */}
              <div className="flex items-center justify-between px-4 bg-[#f8faf9] rounded-b-md">
                <div className="flex overflow-x-auto">
                    {([
                      { key: 'payments', label: 'Payments', icon: <CreditCard className="w-3.5 h-3.5" /> },
                      { key: 'expenses', label: 'Expenses', icon: <TrendingDown className="w-3.5 h-3.5" /> },
                      { key: 'ledger',   label: 'Ledger',   icon: <FileText className="w-3.5 h-3.5" /> },
                      { key: 'deposits', label: 'Deposits', icon: <Shield className="w-3.5 h-3.5" /> },
                      { key: 'statements', label: 'Statements', icon: <Upload className="w-3.5 h-3.5" /> },
                    ] as const).map(v => (
                    <button key={v.key} onClick={() => { setView(v.key); setSelectedRows(new Set()); setPanelRow(null); setSearch(''); setStatusFilter('all'); }}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${view === v.key ? 'border-[#22333b] text-[#22333b]' : 'border-transparent text-[#a9927d] hover:text-[#22333b]'}`}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
                {/* Density Toggle */}
                <div className="flex items-center gap-2 relative" ref={densityRef}>
                  <button onClick={() => setShowDensity(v => !v)} className="flex items-center gap-1.5 px-3 py-1 border border-[#e6e8e7] bg-white rounded-md text-xs font-semibold text-[#22333b] hover:border-[#a9927d] transition-colors">
                    {densityConfig[density].icon}
                    <span className="hidden sm:inline">{densityConfig[density].label}</span>
                    <ChevronDown className="w-3 h-3 text-[#a9927d]" />
                  </button>
                  {showDensity && (
                    <div className="absolute top-8 right-0 bg-white border border-[#e6e8e7] rounded-md shadow-lg z-20 w-44 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
                      {(Object.entries(densityConfig) as [Density, typeof densityConfig[Density]][]).map(([k, v]) => (
                        <button key={k} onClick={() => { setDensity(k); setShowDensity(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors rounded-sm ${density === k ? 'bg-[#22333b] text-white' : 'text-[#22333b] hover:bg-[#f2f4f3]'}`}>
                          {v.icon} {v.label}
                          {density === k && <Check className="w-3 h-3 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>\n\n"""

        # Replace the whole section
        content = content[:workspace_start] + new_header + content[toolbar_end:]

        # Add Calendar icon import
        if "Calendar" not in content[:500]:
            content = content.replace("import { ", "import { Calendar, ")

        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
            
        print("Success! Toolbar updated.")
        
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
