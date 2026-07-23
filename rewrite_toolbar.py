def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # Find the old toolbar: from "{/* ── Unified Command Toolbar ── */}" to the line before "{/* ── Main Grid"
        start_marker = "{/* \u2500\u2500 Unified Command Toolbar \u2500\u2500 */}"
        end_marker = "{/* \u2500\u2500 Main Grid + Right Panel \u2500\u2500 */}"

        start_idx = content.find(start_marker)
        end_idx = content.find(end_marker)

        if start_idx == -1:
            print("Could not find start marker!")
            return
        if end_idx == -1:
            print("Could not find end marker!")
            return

        # We need to find the shrink-0 wrapper start (the line before the toolbar comment)
        # Go back to find the <div className="shrink-0 pb-3">
        shrink_start = content.rfind('<div className="shrink-0 pb-3">', 0, start_idx)
        if shrink_start == -1:
            shrink_start = start_idx
            # find the indentation start
            while shrink_start > 0 and content[shrink_start-1] != '\n':
                shrink_start -= 1

        new_toolbar = """            {/* ── Toolbar ── */}
            <div className="shrink-0 pb-3">
              <div className="bg-white border border-[#e6e8e7] rounded-lg shadow-sm">
                {/* Row 1: Filters */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#e6e8e7] flex-wrap">
                  {/* Property */}
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a9927d] pointer-events-none z-10" />
                    <select
                      value={selectedProperty.id}
                      onChange={e => {
                        const p = properties.find(pr => pr.id === e.target.value);
                        if (p) {
                          const activeLease = leases.find(l => l.property_id === p.id && l.status === 'Active') || leases.find(l => l.property_id === p.id);
                          if (activeLease) openDashboard(p, activeLease);
                        }
                      }}
                      className="appearance-none bg-[#f2f4f3] border border-[#e6e8e7] rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b] focus:border-[#22333b] outline-none cursor-pointer hover:border-[#a9927d] transition-colors"
                    >
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#a9927d] pointer-events-none" />
                  </div>

                  {/* Lease */}
                  <div className="relative">
                    <select
                      value={selectedLease.id}
                      onChange={e => {
                        const l = leases.find(ls => ls.id === e.target.value);
                        if (l) openDashboard(selectedProperty, l);
                      }}
                      className="appearance-none bg-[#f2f4f3] border border-[#e6e8e7] rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b] focus:border-[#22333b] outline-none cursor-pointer hover:border-[#a9927d] transition-colors"
                    >
                      {leases.filter(l => l.property_id === selectedProperty.id).map(l => (
                        <option key={l.id} value={l.id}>
                          {l.status} \\u2014 {l.start_date} \\u2192 {l.end_date || 'Ongoing'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#a9927d] pointer-events-none" />
                  </div>

                  {/* Date Range */}
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a9927d] pointer-events-none z-10" />
                    <select
                      value={dateRange}
                      onChange={e => setDateRange(e.target.value)}
                      className="appearance-none bg-[#f2f4f3] border border-[#e6e8e7] rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b] focus:border-[#22333b] outline-none cursor-pointer hover:border-[#a9927d] transition-colors"
                    >
                      {['All Time', 'This Month', 'Last Month', 'This Year', 'Last Year'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#a9927d] pointer-events-none" />
                  </div>

                  {/* Status */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="appearance-none bg-[#f2f4f3] border border-[#e6e8e7] rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-[#22333b] focus:ring-2 focus:ring-[#22333b] focus:border-[#22333b] outline-none cursor-pointer hover:border-[#a9927d] transition-colors"
                    >
                      <option value="all">All Status</option>
                      {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#a9927d] pointer-events-none" />
                  </div>

                  {/* Search */}
                  <div className="relative flex-1 min-w-[150px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a9927d]" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#f2f4f3] border border-[#e6e8e7] rounded-lg text-xs focus:ring-2 focus:ring-[#22333b] focus:border-[#22333b] outline-none transition-colors placeholder-[#a9927d]"
                    />
                  </div>

                  {/* Export */}
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e6e8e7] text-[#22333b] rounded-lg text-xs font-bold hover:bg-[#f2f4f3] transition-colors whitespace-nowrap">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>

                  {view === 'expenses' && (
                    <button onClick={() => setPanelRow({ id: '__new_expense__' } as any)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22333b] text-white rounded-lg text-xs font-bold hover:bg-[#111a1e] transition-colors whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Add Expense
                    </button>
                  )}
                  {view === 'statements' && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22333b] text-white rounded-lg text-xs font-bold hover:bg-[#111a1e] transition-colors whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Add Bank Entry
                    </button>
                  )}
                </div>

                {/* Row 2: Tabs + Density */}
                <div className="flex items-center justify-between px-4 bg-[#fafbfa] rounded-b-lg">
                  <div className="flex overflow-x-auto">
                    {([
                      { key: 'payments', label: 'Payments', icon: <CreditCard className="w-3.5 h-3.5" /> },
                      { key: 'deposits', label: 'Income', icon: <Shield className="w-3.5 h-3.5" /> },
                      { key: 'expenses', label: 'Bank Expenses', icon: <TrendingDown className="w-3.5 h-3.5" /> },
                      { key: 'ledger',   label: 'Ledger',   icon: <FileText className="w-3.5 h-3.5" /> },
                      { key: 'statements', label: 'Statements', icon: <Upload className="w-3.5 h-3.5" /> },
                    ] as const).map(v => (
                      <button key={v.key} onClick={() => { setView(v.key); setSelectedRows(new Set()); setPanelRow(null); setSearch(''); setStatusFilter('all'); }}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${view === v.key ? 'border-[#22333b] text-[#22333b]' : 'border-transparent text-[#a9927d] hover:text-[#22333b]'}`}>
                        {v.icon} {v.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 relative" ref={densityRef}>
                    <button onClick={() => setShowDensity(v => !v)} className="flex items-center gap-1.5 px-3 py-1 border border-[#e6e8e7] bg-white rounded-lg text-xs font-semibold text-[#22333b] hover:border-[#a9927d] transition-colors">
                      {densityConfig[density].icon}
                      <span className="hidden sm:inline">{densityConfig[density].label}</span>
                      <ChevronDown className="w-3 h-3 text-[#a9927d]" />
                    </button>
                    {showDensity && (
                      <div className="absolute top-8 right-0 bg-white border border-[#e6e8e7] rounded-lg shadow-lg z-20 w-44 overflow-hidden p-1">
                        {(Object.entries(densityConfig) as [Density, typeof densityConfig[Density]][]).map(([k, v]) => (
                          <button key={k} onClick={() => { setDensity(k); setShowDensity(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors rounded ${density === k ? 'bg-[#22333b] text-white' : 'text-[#22333b] hover:bg-[#f2f4f3]'}`}>
                            {v.icon} {v.label}
                            {density === k && <Check className="w-3 h-3 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

"""

        content = content[:shrink_start] + new_toolbar + content[end_idx:]

        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)

        print("Toolbar completely rewritten!")

    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
