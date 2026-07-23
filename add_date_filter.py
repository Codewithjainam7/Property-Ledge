import re

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # Find the filtered Grid Data section
        target_str = """  // ── Filtered Grid Data ──
  const filteredPayments = useMemo(() => {
    let r = payments.filter(p => p.payment_type === 'Rent');
    if (statusFilter !== 'all') r = r.filter(p => p.status === statusFilter);
    if (search) r = r.filter(p => (p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '').toLowerCase().includes(search.toLowerCase()) || (p.properties?.address || '').toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [payments, statusFilter, search]);

  const filteredExpenses = useMemo(() => {
    let r = [...expenses];
    if (search) r = r.filter(e => e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [expenses, search]);"""

        replacement_str = """  // ── Filtered Grid Data ──
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (dateRange === 'This Month') return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0] };
    if (dateRange === 'Last Month') return { startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0], endDate: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0] };
    if (dateRange === 'This Year') return { startDate: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], endDate: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0] };
    if (dateRange === 'Last Year') return { startDate: new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0], endDate: new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0] };
    return { startDate: null, endDate: null };
  }, [dateRange]);

  const filteredPayments = useMemo(() => {
    let r = payments.filter(p => p.payment_type === 'Rent');
    if (statusFilter !== 'all') r = r.filter(p => p.status === statusFilter);
    if (search) r = r.filter(p => (p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '').toLowerCase().includes(search.toLowerCase()) || (p.properties?.address || '').toLowerCase().includes(search.toLowerCase()));
    if (startDate && endDate) r = r.filter(p => p.due_date >= startDate && p.due_date <= endDate);
    return r;
  }, [payments, statusFilter, search, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    let r = [...expenses];
    if (search) r = r.filter(e => e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()));
    if (startDate && endDate) r = r.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
    return r;
  }, [expenses, search, startDate, endDate]);"""

        if target_str in content:
            content = content.replace(target_str, replacement_str)
            with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully updated filter logic!")
        else:
            print("Could not find the target string.")

    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
