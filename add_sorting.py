import re

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Add sorting state
        state_str = "  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);"
        if state_str in content:
            content = content.replace(state_str, state_str + "\n  const [sortCol, setSortCol] = useState('Due Date');\n  const [sortDesc, setSortDesc] = useState(true);")

        # 2. Modify filteredPayments for sorting
        old_filter = """  const filteredPayments = useMemo(() => {
    let r = payments.filter(p => p.payment_type === 'Rent');
    if (statusFilter !== 'all') r = r.filter(p => p.status === statusFilter);
    if (search) r = r.filter(p => (p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '').toLowerCase().includes(search.toLowerCase()) || (p.properties?.address || '').toLowerCase().includes(search.toLowerCase()) || (p.id || '').toLowerCase().includes(search.toLowerCase()) || (p.payment_type || '').toLowerCase().includes(search.toLowerCase()));
    if (startDate && endDate) r = r.filter(p => p.due_date >= startDate && p.due_date <= endDate);
    return r;
  }, [payments, statusFilter, search, startDate, endDate]);"""
        
        new_filter = """  const filteredPayments = useMemo(() => {
    let r = payments.filter(p => p.payment_type === 'Rent');
    if (statusFilter !== 'all') r = r.filter(p => p.status === statusFilter);
    if (search) r = r.filter(p => (p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '').toLowerCase().includes(search.toLowerCase()) || (p.properties?.address || '').toLowerCase().includes(search.toLowerCase()) || (p.id || '').toLowerCase().includes(search.toLowerCase()) || (p.payment_type || '').toLowerCase().includes(search.toLowerCase()));
    if (startDate && endDate) r = r.filter(p => p.due_date >= startDate && p.due_date <= endDate);
    
    // Sort
    r.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortCol) {
        case 'Tenant': valA = a.tenants ? `${a.tenants.first_name} ${a.tenants.last_name}` : ''; valB = b.tenants ? `${b.tenants.first_name} ${b.tenants.last_name}` : ''; break;
        case 'Rent': valA = Number(a.amount_due); valB = Number(b.amount_due); break;
        case 'Paid Date': valA = a.paid_date || ''; valB = b.paid_date || ''; break;
        case 'Status': valA = a.status; valB = b.status; break;
        case 'Paid Amount': valA = Number(a.amount_paid); valB = Number(b.amount_paid); break;
        case 'Balance': valA = Number(a.amount_due) - Number(a.amount_paid); valB = Number(b.amount_due) - Number(b.amount_paid); break;
        case 'Due Date': default: valA = a.due_date; valB = b.due_date; break;
      }
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });

    return r;
  }, [payments, statusFilter, search, startDate, endDate, sortCol, sortDesc]);"""
        
        content = content.replace(old_filter, new_filter)

        # 3. Make TH clickable
        old_headers = """                        {['Tenant', 'Due Date', 'Rent', 'Paid Date', 'Status', 'Paid Amount', 'Balance'].map(h => (
                          <th key={h} className={`px-4 ${density === 'spreadsheet' ? 'py-1.5' : 'py-2.5'} text-[10px] font-bold text-[#a9927d] uppercase tracking-wider whitespace-nowrap`}>{h}</th>
                        ))}"""
        
        new_headers = """                        {['Tenant', 'Due Date', 'Rent', 'Paid Date', 'Status', 'Paid Amount', 'Balance'].map(h => (
                          <th key={h} onClick={() => { if (sortCol === h) setSortDesc(!sortDesc); else { setSortCol(h); setSortDesc(false); } }} className={`px-4 ${density === 'spreadsheet' ? 'py-1.5' : 'py-2.5'} text-[10px] font-bold text-[#a9927d] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[#22333b] select-none group/th`}>
                            <div className="flex items-center gap-1">
                              {h}
                              <span className={`text-[8px] transition-opacity ${sortCol === h ? 'opacity-100' : 'opacity-0 group-hover/th:opacity-50'}`}>
                                {sortCol === h && sortDesc ? '▼' : '▲'}
                              </span>
                            </div>
                          </th>
                        ))}"""
        
        content = content.replace(old_headers, new_headers)

        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)

        print("Sorting logic applied successfully.")
        
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
