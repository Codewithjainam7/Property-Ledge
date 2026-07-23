import re

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Sticky Toolbar
        content = content.replace(
            'className="bg-white border border-[#e6e8e7] rounded-md shadow-sm mb-4"',
            'className="bg-white border border-[#e6e8e7] rounded-md shadow-sm mb-4 sticky top-4 z-40"'
        )
        
        # 2. Remove Generate Invoice Button
        gen_invoice_block = """                  {view === 'payments' && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22333b] text-white rounded-md text-xs font-bold hover:bg-[#111a1e] transition-colors whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Generate Invoice
                    </button>
                  )}"""
        content = content.replace(gen_invoice_block, "")
        
        # 3. Rename and Reorder Tabs
        old_tabs = """                    {([
                      { key: 'payments', label: 'Payments', icon: <CreditCard className="w-3.5 h-3.5" /> },
                      { key: 'expenses', label: 'Expenses', icon: <TrendingDown className="w-3.5 h-3.5" /> },
                      { key: 'ledger',   label: 'Ledger',   icon: <FileText className="w-3.5 h-3.5" /> },
                      { key: 'deposits', label: 'Deposits', icon: <Shield className="w-3.5 h-3.5" /> },
                      { key: 'statements', label: 'Statements', icon: <Upload className="w-3.5 h-3.5" /> },
                    ] as const).map(v => ("""
        
        new_tabs = """                    {([
                      { key: 'payments', label: 'Payments', icon: <CreditCard className="w-3.5 h-3.5" /> },
                      { key: 'deposits', label: 'Income', icon: <Shield className="w-3.5 h-3.5" /> },
                      { key: 'expenses', label: 'Bank Expenses', icon: <TrendingDown className="w-3.5 h-3.5" /> },
                      { key: 'ledger',   label: 'Ledger',   icon: <FileText className="w-3.5 h-3.5" /> },
                      { key: 'statements', label: 'Statements', icon: <Upload className="w-3.5 h-3.5" /> },
                    ] as const).map(v => ("""
        
        content = content.replace(old_tabs, new_tabs)

        # 4. Enhance Search (Payments)
        old_search = "if (search) r = r.filter(p => (p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '').toLowerCase().includes(search.toLowerCase()) || (p.properties?.address || '').toLowerCase().includes(search.toLowerCase()));"
        new_search = "if (search) r = r.filter(p => (p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '').toLowerCase().includes(search.toLowerCase()) || (p.properties?.address || '').toLowerCase().includes(search.toLowerCase()) || (p.id || '').toLowerCase().includes(search.toLowerCase()) || (p.payment_type || '').toLowerCase().includes(search.toLowerCase()));"
        content = content.replace(old_search, new_search)

        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
            
        print("Formal specification updates applied successfully.")
        
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
