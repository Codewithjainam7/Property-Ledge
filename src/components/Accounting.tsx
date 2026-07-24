import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Wallet, Building2, ChevronRight, ChevronLeft, Download,
  TrendingUp, TrendingDown, AlertCircle, Clock, CheckCircle2,
  Shield, Upload, FileText, BarChart3, CreditCard,
  Search, X, Check, Loader2, Receipt, Plus, MoreVertical,
  ArrowRight, RotateCcw, ChevronDown, SlidersHorizontal,
  LayoutList, AlignJustify, Rows3, PanelRightOpen, PanelRightClose,
  Columns, Filter, Star, Mail, Printer, Trash2, Edit2, Save,
  CheckSquare, Square, MinusSquare, Calendar
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Property { id: string; address: string; suburb: string | null; property_category: string; status: string; }
interface Lease { id: string; property_id: string; status: string; start_date: string; end_date: string | null; rent_amount: number; payment_frequency: string; }
interface Payment {
  id: string; property_id: string; tenant_id: string | null; lease_id: string | null;
  amount_due: number; amount_paid: number; due_date: string; paid_date: string | null;
  status: string; payment_type: string;
  properties?: { address: string }; tenants?: { first_name: string; last_name: string };
}
interface Expense {
  id: string; property_id: string; user_id: string; expense_date: string;
  category: string; description: string; amount: number; receipt_url: string | null;
  properties?: { address: string };
}

type WizardStep = 'resume' | 'property' | 'lease' | 'dashboard';
type WorkspaceView = 'payments' | 'expenses' | 'ledger' | 'deposits' | 'statements';
type Density = 'comfortable' | 'compact' | 'spreadsheet';
type PanelTab = 'details' | 'ledger' | 'notes';

interface SavedContext { propertyId: string; propertyAddress: string; leaseId: string; leaseLabel: string; leaseStatus: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const fmtShort = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

const leaseStatusDot = (s: string) => ({ Active: '🟢', Expired: '⚪', Terminated: '⚪', Pending: '🟡', Draft: '🟡', Renewed: '🟡' }[s] || '⚫');
const leaseStatusColor = (s: string) => ({ Active: 'bg-emerald-100 text-emerald-800 border-emerald-200', Expired: 'bg-slate-100 text-slate-600 border-slate-200', Terminated: 'bg-slate-100 text-slate-600 border-slate-200', Pending: 'bg-amber-100 text-amber-800 border-amber-200', Draft: 'bg-amber-100 text-amber-800 border-amber-200' }[s] || 'bg-slate-100 text-slate-600 border-slate-200');

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Paid: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Overdue: 'bg-red-100 text-red-700',
    Partial: 'bg-blue-100 text-blue-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

const EXPENSE_CATEGORIES = ['Water', 'Strata', 'Repairs', 'Maintenance', 'Bank Fees', 'Interest', 'Other'];
const CONTEXT_KEY = 'pl_accounting_context';
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Overdue', 'Partial'];

const densityConfig: Record<Density, { rowPy: string; text: string; label: string; icon: React.ReactNode }> = {
  comfortable: { rowPy: 'py-3.5', text: 'text-sm', label: 'Comfortable', icon: <LayoutList className="w-3.5 h-3.5" /> },
  compact:     { rowPy: 'py-2',   text: 'text-sm', label: 'Compact',     icon: <AlignJustify className="w-3.5 h-3.5" /> },
  spreadsheet: { rowPy: 'py-1',   text: 'text-xs', label: 'Spreadsheet', icon: <Rows3 className="w-3.5 h-3.5" /> },
};

// ─── Main Component ───────────────────────────────────────────────────────────
function CustomDropdown({ value, options, onChange, icon, className = '' }: { value: string, options: {value: string, label: string}[], onChange: (val: string) => void, icon?: React.ReactNode, className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 appearance-none bg-[#f8faf9] border border-[#e6e8e7] rounded-[8px] px-4 py-2 text-[13px] font-semibold text-[#22333b] hover:border-[#a9927d] transition-all"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <span className="text-[#a9927d] shrink-0">{icon}</span>}
          <span className="truncate">{selected?.label || 'Select...'}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#a9927d] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-[#e6e8e7] rounded-[8px] shadow-xl z-[100] min-w-full overflow-hidden p-1 max-h-64 overflow-y-auto">
          {options.map(o => (
            <button 
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-[4px] transition-colors flex items-center justify-between ${value === o.value ? 'bg-[#22333b] text-white' : 'text-[#22333b] hover:bg-[#f2f4f3]'}`}
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <Check className="w-4 h-4 ml-2 shrink-0 text-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Accounting() {
  const { user } = useAuth();

  // ── Wizard ──
  const [propertySearch, setPropertySearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [leaseTenantName, setLeaseTenantName] = useState<string>('—');

  // ── Master Data ──
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases]         = useState<Lease[]>([]);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dashLoading, setDashLoading] = useState(false);

  
  // ── Toolbar State ──
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [dateRange, setDateRange] = useState('All Time');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortCol, setSortCol] = useState('Due Date');
  const [sortDesc, setSortDesc] = useState(true);

  // ── Workspace State ──
  const [view, setView]           = useState<WorkspaceView>('payments');
  const [density, setDensity]     = useState<Density>('compact');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [panelRow, setPanelRow]   = useState<Payment | Expense | null>(null);
  const [panelTab, setPanelTab]   = useState<PanelTab>('details');
  const [showDensity, setShowDensity] = useState(false);

  // ── Inline Editing ──
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [savingRows, setSavingRows]       = useState<Set<string>>(new Set());

  // ── Forms ──
  const [expenseForm, setExpenseForm] = useState({ expense_date: new Date().toISOString().split('T')[0], category: 'Maintenance', description: '', amount: '' });
  const [bankForm, setBankForm]       = useState({ date: '', interest: '', fees: '' });
  const [notes, setNotes]             = useState<Record<string, string>>({});

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  // ── Init ──
  useEffect(() => {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (raw) { try { const ctx = JSON.parse(raw);  } catch { localStorage.removeItem(CONTEXT_KEY); } }
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from('properties').select('id,address,suburb,property_category,status').eq('owner_id', user.id).order('address'),
        supabase.from('leases').select('id,property_id,status,start_date,end_date,rent_amount,payment_frequency').eq('created_by', user.id).order('start_date', { ascending: false }),
      ]);
      const props = p || [];
      const lses = l || [];
      setProperties(props); setLeases(lses);

      let initialProp = null;
      let initialLease = null;

      // 1. Try loading from localStorage context
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

      // 2. If nothing valid from localStorage, find the first property that has a lease
      if (!initialProp || !initialLease) {
        for (const pr of props) {
          const foundL = lses.find(x => x.property_id === pr.id && x.status === 'Active') || lses.find(x => x.property_id === pr.id);
          if (foundL) {
            initialProp = pr;
            initialLease = foundL;
            break;
          }
        }
      }

      // 3. Fallback: if we still don't have a lease, just select the first property and null lease (we will show empty state)
      if (!initialProp && props.length > 0) {
        initialProp = props[0];
      }

      if (initialProp && initialLease) {
         await openDashboard(initialProp, initialLease);
      } else {
         setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const propertyLeases   = useMemo(() => leases.filter(l => l.property_id === selectedProperty?.id), [leases, selectedProperty]);
  const filteredProperties = useMemo(() => propertySearch.trim() ? properties.filter(p => p.address.toLowerCase().includes(propertySearch.toLowerCase())) : properties, [properties, propertySearch]);

  // ── Open Dashboard ──
  const openDashboard = useCallback(async (prop: Property, lease: Lease) => {
    if (!user) return;
    setDashLoading(true);
    const ctx: SavedContext = { propertyId: prop.id, propertyAddress: prop.address, leaseId: lease.id, leaseLabel: `${lease.start_date} → ${lease.end_date || 'Ongoing'}`, leaseStatus: lease.status };
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
    setSelectedProperty(prop); setSelectedLease(lease);

    const { data: pData } = await supabase.from('payments').select('*,properties(address),tenants(first_name,last_name)').eq('property_id', prop.id).eq('lease_id', lease.id).order('due_date', { ascending: false });
    let eData: Expense[] = [];
    try { const { data, error } = await supabase.from('expenses').select('*,properties(address)').eq('property_id', prop.id).order('expense_date', { ascending: false }); if (!error && data) eData = data; } catch {}
    
    // Fetch lease tenants to use as fallback for payments that don't have a direct tenant_id
    const { data: ltData } = await supabase.from('lease_tenants').select('tenants(first_name,last_name)').eq('lease_id', lease.id);
    if (ltData && ltData.length > 0) {
      const names = ltData.map((lt: any) => lt.tenants ? `${lt.tenants.first_name} ${lt.tenants.last_name}` : '').filter(Boolean).join(', ');
      setLeaseTenantName(names || '—');
    } else {
      setLeaseTenantName('—');
    }

    setPayments(pData || []); setExpenses(eData); setDashLoading(false); setLoading(false);
  }, [user]);

  

  // ── KPIs ──
  const kpis = useMemo(() => {
    const collected    = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + Number(p.amount_paid), 0);
    const overdue      = payments.filter(p => p.status === 'Overdue').reduce((s, p) => s + (Number(p.amount_due) - Number(p.amount_paid)), 0);
    const upcoming     = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + Number(p.amount_due), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const net = collected - totalExpenses;
    return { collected, overdue, upcoming, totalExpenses, net };
  }, [payments, expenses]);

  // ── Filtered Grid Data ──
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
  }, [payments, statusFilter, search, startDate, endDate, sortCol, sortDesc]);

  const filteredExpenses = useMemo(() => {
    let r = [...expenses];
    if (search) r = r.filter(e => e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()));
    if (startDate && endDate) r = r.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
    return r;
  }, [expenses, search, startDate, endDate]);

  const depositPayments = useMemo(() => payments.filter(p => p.payment_type === 'Bond'), [payments]);

  const ledgerEntries = useMemo(() => {
    const entries: Array<{ date: string; type: string; category: string; detail: string; debit: number; credit: number; balance: number }> = [];
    payments.filter(p => p.status === 'Paid').forEach(p => entries.push({ date: p.paid_date || p.due_date, type: 'Income', category: p.payment_type, detail: p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '—', debit: 0, credit: Number(p.amount_paid), balance: 0 }));
    expenses.forEach(e => entries.push({ date: e.expense_date, type: 'Expense', category: e.category, detail: e.description, debit: Number(e.amount), credit: 0, balance: 0 }));
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let bal = 0; entries.forEach(e => { bal += e.credit - e.debit; e.balance = bal; });
    return entries;
  }, [payments, expenses]);

  // ── Row Selection ──
  const allPaymentIds    = filteredPayments.map(p => p.id);
  const allSelected      = allPaymentIds.length > 0 && allPaymentIds.every(id => selectedRows.has(id));
  const someSelected     = allPaymentIds.some(id => selectedRows.has(id)) && !allSelected;
  const toggleRow        = (id: string) => { const s = new Set(selectedRows); s.has(id) ? s.delete(id) : s.add(id); setSelectedRows(s); };
  const toggleAll        = () => { if (allSelected) setSelectedRows(new Set()); else setSelectedRows(new Set(allPaymentIds)); };
  const clearSelection   = () => setSelectedRows(new Set());

  // ── Inline Status Update ──
  const updateStatus = async (paymentId: string, newStatus: string) => {
    setSavingRows(prev => new Set(prev).add(paymentId));
    setEditingStatus(null);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'Paid') { updates.amount_paid = payments.find(p => p.id === paymentId)?.amount_due; updates.paid_date = new Date().toISOString().split('T')[0]; }
      const { error } = await supabase.from('payments').update(updates).eq('id', paymentId);
      if (error) throw error;
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, ...updates } : p));
      setToast({ message: 'Status updated', type: 'success' });
    } catch (err: any) { setToast({ message: err.message, type: 'error' }); }
    finally { setSavingRows(prev => { const s = new Set(prev); s.delete(paymentId); return s; }); }
  };

  // ── Bulk Mark Paid ──
  const bulkMarkPaid = async () => {
    const ids = Array.from(selectedRows).filter(id => { const p = payments.find(x => x.id === id); return p && p.status !== 'Paid'; });
    if (!ids.length) return;
    setSavingRows(new Set(ids));
    try {
      const today = new Date().toISOString().split('T')[0];
      for (const id of ids) {
        const p = payments.find(x => x.id === id);
        if (!p) continue;
        await supabase.from('payments').update({ status: 'Paid', amount_paid: p.amount_due, paid_date: today }).eq('id', id);
      }
      setPayments(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'Paid', amount_paid: p.amount_due, paid_date: today } : p));
      setToast({ message: `${ids.length} payment(s) marked as paid`, type: 'success' });
      clearSelection();
    } catch (err: any) { setToast({ message: err.message, type: 'error' }); }
    finally { setSavingRows(new Set()); }
  };

  // ── Add Expense ──
  const handleAddExpense = async () => {
    if (!user || !selectedProperty || !expenseForm.amount || !expenseForm.description) { setToast({ message: 'Fill all required fields', type: 'error' }); return; }
    try {
      const { data, error } = await supabase.from('expenses').insert({ user_id: user.id, property_id: selectedProperty.id, expense_date: expenseForm.expense_date, category: expenseForm.category, description: expenseForm.description, amount: parseFloat(expenseForm.amount) }).select('*,properties(address)').single();
      if (error) throw error;
      setExpenses(prev => [data, ...prev]);
      setExpenseForm({ expense_date: new Date().toISOString().split('T')[0], category: 'Maintenance', description: '', amount: '' });
      setToast({ message: 'Expense added!', type: 'success' });
    } catch (err: any) { setToast({ message: err.message || 'Run expenses migration first', type: 'error' }); }
  };

  const handleSaveBankInterest = async () => {
    if (!user || !selectedProperty || (!bankForm.interest && !bankForm.fees)) { setToast({ message: 'Enter amount', type: 'error' }); return; }
    try {
      const records: any[] = [];
      const date = bankForm.date || new Date().toISOString().split('T')[0];
      if (bankForm.interest && parseFloat(bankForm.interest) > 0) records.push({ user_id: user.id, property_id: selectedProperty.id, expense_date: date, category: 'Interest', description: 'Mortgage Interest', amount: parseFloat(bankForm.interest) });
      if (bankForm.fees && parseFloat(bankForm.fees) > 0) records.push({ user_id: user.id, property_id: selectedProperty.id, expense_date: date, category: 'Bank Fees', description: 'Bank Fees', amount: parseFloat(bankForm.fees) });
      if (records.length) { const { data, error } = await supabase.from('expenses').insert(records).select('*,properties(address)'); if (error) throw error; setExpenses(prev => [...(data || []), ...prev]); }
      setBankForm({ date: '', interest: '', fees: '' });
      setToast({ message: 'Saved!', type: 'success' });
    } catch (err: any) { setToast({ message: err.message, type: 'error' }); }
  };

  const handleReceiptUpload = async (files: FileList | null) => {
    if (!files || !user || !selectedProperty) return;
    try {
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: ue } = await supabase.storage.from('receipts').upload(filePath, file);
        if (ue) throw ue;
        const { data: ud } = supabase.storage.from('receipts').getPublicUrl(filePath);
        const { data, error } = await supabase.from('expenses').insert({ user_id: user.id, property_id: selectedProperty.id, expense_date: new Date().toISOString().split('T')[0], category: 'Other', description: `Receipt: ${file.name}`, amount: 0, receipt_url: ud?.publicUrl || filePath }).select('*,properties(address)').single();
        if (!error && data) setExpenses(prev => [data, ...prev]);
      }
      setToast({ message: `${files.length} receipt(s) uploaded!`, type: 'success' });
    } catch (err: any) { setToast({ message: err.message, type: 'error' }); }
  };

  // ── Ref for click-outside density dropdown ──
  const densityRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { 
      if (densityRef.current && !densityRef.current.contains(e.target as Node)) setShowDensity(false);
      setEditingStatus(null);
    };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const { rowPy, text } = densityConfig[density];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-16 md:mt-0 bg-[#fbf9f9] h-full flex flex-col overflow-hidden pt-4">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-md shadow-lg text-sm font-bold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToast(null)}><X className="w-3 h-3 ml-1 opacity-70" /></button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            ACCOUNTING WORKSPACE
        ════════════════════════════════════════════════════════ */}
        {(selectedProperty && selectedLease) ? (
          <div className="flex flex-col h-full overflow-hidden bg-white border border-[#e6e8e7] rounded-md shadow-sm mb-3">

            {/* ── Toolbar ── */}
            <div className="shrink-0 border-b border-[#e6e8e7]">
              <div className="bg-white">
                {/* Row 1: Filters */}
                <div className="flex items-end gap-3 px-5 pt-5 pb-3 border-b border-[#e6e8e7] flex-wrap">

                  {/* Property Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-[#a9927d] uppercase tracking-widest">Property</label>
                    <CustomDropdown
                      value={selectedProperty.id}
                      options={properties.map(p => ({ value: p.id, label: p.address }))}
                      onChange={val => {
                        const p = properties.find(pr => pr.id === val);
                        if (p) {
                          const activeLease = leases.find(l => l.property_id === p.id && l.status === 'Active') || leases.find(l => l.property_id === p.id);
                          if (activeLease) openDashboard(p, activeLease);
                        }
                      }}
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      className="w-[180px]"
                    />
                  </div>

                  {/* Lease Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-[#a9927d] uppercase tracking-widest">Lease</label>
                    <CustomDropdown
                      value={selectedLease.id}
                      options={leases.filter(l => l.property_id === selectedProperty.id).map(l => ({ 
                        value: l.id, 
                        label: `${l.status} — ${l.start_date} → ${l.end_date || 'Ongoing'}` 
                      }))}
                      onChange={val => {
                        const l = leases.find(ls => ls.id === val);
                        if (l) openDashboard(selectedProperty, l);
                      }}
                      className="w-[240px]"
                    />
                  </div>

                  {/* Separator */}
                  <div className="h-8 w-px bg-[#e6e8e7] mx-1 self-end mb-1 hidden sm:block" />

                  {/* Date Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-[#a9927d] uppercase tracking-widest">Period</label>
                    <CustomDropdown
                      value={dateRange}
                      options={['All Time', 'This Month', 'Last Month', 'This Year', 'Last Year'].map(r => ({ value: r, label: r }))}
                      onChange={val => setDateRange(val)}
                      icon={<Calendar className="w-3.5 h-3.5" />}
                      className="w-[140px]"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-[#a9927d] uppercase tracking-widest">Status</label>
                    <CustomDropdown
                      value={statusFilter}
                      options={[{ value: 'all', label: 'All Status' }, ...PAYMENT_STATUSES.map(s => ({ value: s, label: s }))]}
                      onChange={val => setStatusFilter(val)}
                      className="w-[130px]"
                    />
                  </div>

                  {/* View/Density Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-[#a9927d] uppercase tracking-widest">View</label>
                    <CustomDropdown
                      value={density}
                      options={(Object.entries(densityConfig) as [Density, typeof densityConfig[Density]][]).map(([k, v]) => ({ value: k, label: `${v.label} View` }))}
                      onChange={val => setDensity(val as Density)}
                      icon={densityConfig[density].icon}
                      className="w-[150px]"
                    />
                  </div>

                  {/* Separator */}
                  <div className="h-8 w-px bg-[#e6e8e7] mx-1 self-end mb-1 hidden sm:block" />

                  {/* Search */}
                  <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                    <label className="text-[9px] font-bold text-[#a9927d] uppercase tracking-widest">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a9927d]" />
                      <input
                        type="text"
                        placeholder="Tenant, invoice, reference..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-[#f8faf9] border border-[#e6e8e7] rounded-lg text-[13px] focus:ring-2 focus:ring-[#22333b]/20 focus:border-[#22333b] outline-none transition-all placeholder-[#b5ada5]"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end pb-0.5">
                    <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e6e8e7] text-[#22333b] rounded-lg text-xs font-bold hover:bg-[#f8faf9] hover:border-[#a9927d] transition-all whitespace-nowrap">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                    {view === 'expenses' && (
                      <button onClick={() => setPanelRow({ id: '__new_expense__' } as any)} className="flex items-center gap-1.5 px-4 py-2 bg-[#22333b] text-white rounded-lg text-xs font-bold hover:bg-[#111a1e] transition-all whitespace-nowrap shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Add Expense
                      </button>
                    )}
                    {view === 'statements' && (
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-[#22333b] text-white rounded-lg text-xs font-bold hover:bg-[#111a1e] transition-all whitespace-nowrap shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Add Bank Entry
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Tabs */}
                <div className="flex items-center justify-between px-5 bg-[#fafbfa]">
                  <div className="flex overflow-x-auto gap-1">
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
                </div>
              </div>
            </div>

{/* ── Main Grid + Right Panel ── */}
            <div className={`flex flex-1 min-h-0 bg-white overflow-hidden`}>

              {/* Grid */}
              <div className={`flex-1 overflow-auto min-w-0 transition-all duration-200 ${panelRow ? 'lg:w-[calc(100%-380px)]' : 'w-full'}`}>

                {/* ══ PAYMENTS GRID ══ */}
                {view === 'payments' && (
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[#e6e8e7] bg-[#f8faf9] sticky top-0 z-10">
                        <th className="px-3 py-2.5 w-8 sticky left-0 bg-[#f8faf9] z-20">
                          <button onClick={toggleAll} className="text-[#a9927d] hover:text-[#22333b] transition-colors">
                            {allSelected ? <CheckSquare className="w-4 h-4 text-[#22333b]" /> : someSelected ? <MinusSquare className="w-4 h-4 text-[#22333b]" /> : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                        {['Tenant', 'Due Date', 'Rent', 'Paid Date', 'Status', 'Paid Amount', 'Balance'].map(h => (
                          <th key={h} onClick={() => { if (sortCol === h) setSortDesc(!sortDesc); else { setSortCol(h); setSortDesc(false); } }} className={`px-4 ${density === 'spreadsheet' ? 'py-1.5' : 'py-2.5'} text-[10px] font-bold text-[#a9927d] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[#22333b] select-none group/th`}>
                            <div className="flex items-center gap-1">
                              {h}
                              <span className={`text-[8px] transition-opacity ${sortCol === h ? 'opacity-100' : 'opacity-0 group-hover/th:opacity-50'}`}>
                                {sortCol === h && sortDesc ? '▼' : '▲'}
                              </span>
                            </div>
                          </th>
                        ))}
                        
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f4f3]">
                      {filteredPayments.length === 0 ? (
                        <tr><td colSpan={9} className="py-16 text-center text-[#a9927d] text-sm">No payments found for this context.</td></tr>
                      ) : filteredPayments.map(row => {
                        const isSelected = selectedRows.has(row.id);
                        const isSaving   = savingRows.has(row.id);
                        const balance    = Number(row.amount_due) - Number(row.amount_paid);
                        return (
                          <tr key={row.id}
                            onClick={() => { setPanelRow(row); setPanelTab('details'); }}
                            className={`group transition-all duration-200 ease-in-out cursor-pointer ${isSelected || panelRow?.id === row.id ? 'bg-[#22333b]/[0.05]' : 'hover:bg-[#f8faf9]'} ${text}`}>
                            {/* Checkbox */}
                            <td className="px-3 sticky left-0 bg-inherit z-10" onClick={e => { e.stopPropagation(); toggleRow(row.id); }}>
                              {isSelected ? <CheckSquare className="w-4 h-4 text-[#22333b]" /> : <Square className="w-4 h-4 text-[#a9927d] group-hover:text-[#22333b]" />}
                            </td>
                            {/* Tenant */}
                            <td className={`px-4 ${rowPy} font-medium text-[#22333b] whitespace-nowrap`}>
                              {row.tenants ? `${row.tenants.first_name} ${row.tenants.last_name}` : <span className={leaseTenantName === '—' ? 'text-[#a9927d]' : ''}>{leaseTenantName}</span>}
                            </td>
                            {/* Due Date */}
                            <td className={`px-4 ${rowPy} text-[#5e503f] whitespace-nowrap`}>{fmtShort(row.due_date)}</td>
                            {/* Rent */}
                            <td className={`px-4 ${rowPy} font-semibold text-[#22333b]`}>{fmt(Number(row.amount_due))}</td>
                            {/* Paid Date */}
                            <td className={`px-4 ${rowPy} text-[#5e503f]`}>{row.paid_date ? fmtShort(row.paid_date) : <span className="text-[#a9927d]">—</span>}</td>
                            {/* Inline Status */}
                            <td className={`px-4 ${rowPy}`} onClick={e => { e.stopPropagation(); setEditingStatus(editingStatus === row.id ? null : row.id); }}>
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a9927d]" />
                              ) : editingStatus === row.id ? (
                                <div className="relative z-30" onClick={e => e.stopPropagation()}>
                                  <div className="absolute top-0 left-0 bg-white border border-[#e6e8e7] rounded-md shadow-lg overflow-hidden min-w-[120px] z-30 animate-in fade-in zoom-in-95 duration-100 p-1">
                                    {PAYMENT_STATUSES.map(s => (
                                      <button key={s} onClick={(e) => { e.stopPropagation(); updateStatus(row.id, s); }}
                                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-sm hover:bg-[#f2f4f3] transition-colors flex items-center gap-2 ${row.status === s ? 'text-[#22333b]' : 'text-[#5e503f]'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${s === 'Paid' ? 'bg-emerald-500' : s === 'Overdue' ? 'bg-red-500' : s === 'Partial' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity ${statusBadge(row.status)}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Paid' ? 'bg-emerald-500' : row.status === 'Overdue' ? 'bg-red-500' : row.status === 'Partial' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                  {row.status}
                                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                                </span>
                              )}
                            </td>
                            {/* Amount Paid */}
                            <td className={`px-4 ${rowPy} text-[#22333b]`}>{Number(row.amount_paid) > 0 ? fmt(Number(row.amount_paid)) : <span className="text-[#a9927d]">—</span>}</td>
                            {/* Balance */}
                            <td className={`px-4 ${rowPy} font-semibold ${balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                              {balance > 0 ? fmt(balance) : <span className="text-emerald-600">✓</span>}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                    {filteredPayments.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-[#e6e8e7] bg-[#f8faf9]">
                          <td colSpan={2} />
                          <td className="px-4 py-2 text-[10px] font-bold text-[#a9927d] uppercase">Total</td>
                          <td className="px-4 py-2 font-black text-[#22333b] text-sm">{fmt(filteredPayments.reduce((s, p) => s + Number(p.amount_due), 0))}</td>
                          <td />
                          <td />
                          <td className="px-4 py-2 font-black text-emerald-700 text-sm">{fmt(filteredPayments.reduce((s, p) => s + Number(p.amount_paid), 0))}</td>
                          <td className="px-4 py-2 font-black text-red-600 text-sm">{fmt(filteredPayments.reduce((s, p) => s + (Number(p.amount_due) - Number(p.amount_paid)), 0))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}

                {/* ══ EXPENSES GRID ══ */}
                {view === 'expenses' && (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-[#e6e8e7] bg-[#f8faf9] sticky top-0 z-10">
                        {['Date', 'Category', 'Description', 'Amount', ''].map(h => (
                          <th key={h} className={`px-4 ${density === 'spreadsheet' ? 'py-1.5' : 'py-2.5'} text-[10px] font-bold text-[#a9927d] uppercase tracking-wider`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f4f3]">
                      {/* Add row */}
                      <tr className="bg-[#f8faf9] border-b border-[#e6e8e7]">
                        <td className="px-4 py-2"><input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm(p => ({ ...p, expense_date: e.target.value }))} className={`bg-white border border-[#e6e8e7] rounded-md px-2 py-1 ${text} focus:ring-1 focus:ring-[#22333b] outline-none w-full`} /></td>
                        <td className="px-4 py-2">
                          <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} className={`bg-white border border-[#e6e8e7] rounded-md px-2 py-1 ${text} focus:ring-1 focus:ring-[#22333b] outline-none appearance-none cursor-pointer w-full`}>
                            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2"><input type="text" placeholder="Description *" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} className={`bg-white border border-[#e6e8e7] rounded-md px-2 py-1 ${text} focus:ring-1 focus:ring-[#22333b] outline-none w-full`} /></td>
                        <td className="px-4 py-2">
                          <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a9927d] text-xs">$</span>
                            <input type="number" placeholder="0.00 *" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} className={`bg-white border border-[#e6e8e7] rounded-md pl-5 pr-2 py-1 ${text} focus:ring-1 focus:ring-[#22333b] outline-none w-full`} />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={handleAddExpense} className={`flex items-center gap-1 px-3 py-1 bg-[#22333b] text-white rounded-md ${text} font-bold hover:bg-[#111a1e] transition-colors whitespace-nowrap`}><Plus className="w-3 h-3" /> Add</button>
                        </td>
                      </tr>
                      {filteredExpenses.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-[#a9927d] text-sm">No expenses yet. Use the row above to add one.</td></tr>
                      ) : filteredExpenses.map(e => (
                        <tr key={e.id} onClick={() => { setPanelRow(e); setPanelTab('details'); }} className={`group cursor-pointer transition-all duration-200 ease-in-out ${panelRow?.id === e.id ? 'bg-[#22333b]/[0.05]' : 'hover:bg-[#f8faf9]'} ${text}`}>
                          <td className={`px-4 ${rowPy} text-[#5e503f] whitespace-nowrap`}>{fmtShort(e.expense_date)}</td>
                          <td className={`px-4 ${rowPy}`}><span className="px-2 py-0.5 rounded border border-[#22333b] text-[10px] font-bold uppercase text-[#22333b]">{e.category}</span></td>
                          <td className={`px-4 ${rowPy} font-medium text-[#22333b]`}>{e.description}</td>
                          <td className={`px-4 ${rowPy} font-semibold text-[#22333b]`}>{fmt(Number(e.amount))}</td>
                          <td className={`px-4 ${rowPy} text-right`}><PanelRightOpen className="w-3.5 h-3.5 text-[#a9927d] opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                        </tr>
                      ))}
                    </tbody>
                    {filteredExpenses.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-[#e6e8e7] bg-[#f8faf9]">
                          <td colSpan={3} />
                          <td className="px-4 py-2 font-black text-[#22333b] text-sm">{fmt(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}

                {/* ══ LEDGER GRID ══ */}
                {view === 'ledger' && (
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[#e6e8e7] bg-[#f8faf9] sticky top-0 z-10">
                        {['Date', 'Type', 'Category', 'Detail', 'Debit (−)', 'Credit (+)', 'Balance'].map(h => (
                          <th key={h} className={`px-4 ${density === 'spreadsheet' ? 'py-1.5' : 'py-2.5'} text-[10px] font-bold text-[#a9927d] uppercase tracking-wider ${['Debit (−)', 'Credit (+)', 'Balance'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f4f3]">
                      {ledgerEntries.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-[#a9927d] text-sm">No entries for this lease context yet.</td></tr>
                      ) : ledgerEntries.map((e, i) => (
                        <tr key={i} className={`hover:bg-[#f8faf9] transition-colors ${text}`}>
                          <td className={`px-4 ${rowPy} text-[#5e503f] whitespace-nowrap`}>{fmtShort(e.date)}</td>
                          <td className={`px-4 ${rowPy}`}>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{e.type}</span>
                          </td>
                          <td className={`px-4 ${rowPy} text-[#22333b] font-medium`}>{e.category}</td>
                          <td className={`px-4 ${rowPy} text-[#5e503f]`}>{e.detail}</td>
                          <td className={`px-4 ${rowPy} text-right`}>{e.debit > 0 ? <span className="text-red-600 font-medium">−{fmt(e.debit)}</span> : <span className="text-[#a9927d]">—</span>}</td>
                          <td className={`px-4 ${rowPy} text-right`}>{e.credit > 0 ? <span className="text-emerald-700 font-medium">+{fmt(e.credit)}</span> : <span className="text-[#a9927d]">—</span>}</td>
                          <td className={`px-4 ${rowPy} text-right font-semibold text-[#22333b]`}>{fmt(e.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {ledgerEntries.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-[#e6e8e7] bg-[#f8faf9]">
                          <td colSpan={4} />
                          <td className="px-4 py-2 text-right font-black text-red-600 text-sm">−{fmt(ledgerEntries.reduce((s, e) => s + e.debit, 0))}</td>
                          <td className="px-4 py-2 text-right font-black text-emerald-700 text-sm">+{fmt(ledgerEntries.reduce((s, e) => s + e.credit, 0))}</td>
                          <td className="px-4 py-2 text-right font-black text-[#22333b] text-sm">{fmt(kpis.net)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}

                {/* ══ DEPOSITS GRID ══ */}
                {view === 'deposits' && (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-[#e6e8e7] bg-[#f8faf9] sticky top-0 z-10">
                        {['Tenant', 'Bond Amount', 'Amount Paid', 'Status', 'Due / Paid Date'].map(h => (
                          <th key={h} className={`px-4 ${density === 'spreadsheet' ? 'py-1.5' : 'py-2.5'} text-[10px] font-bold text-[#a9927d] uppercase tracking-wider`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f4f3]">
                      {depositPayments.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-[#a9927d] text-sm">No security deposits for this lease.</td></tr>
                      ) : depositPayments.map(row => (
                        <tr key={row.id} onClick={() => { setPanelRow(row); setPanelTab('details'); }} className={`group cursor-pointer transition-all duration-200 ease-in-out ${panelRow?.id === row.id ? 'bg-[#22333b]/[0.05]' : 'hover:bg-[#f8faf9]'} ${text}`}>
                          <td className={`px-4 ${rowPy} font-medium text-[#22333b]`}>{row.tenants ? `${row.tenants.first_name} ${row.tenants.last_name}` : leaseTenantName}</td>
                          <td className={`px-4 ${rowPy} font-semibold text-[#22333b]`}>{fmt(Number(row.amount_due))}</td>
                          <td className={`px-4 ${rowPy}`}>{fmt(Number(row.amount_paid))}</td>
                          <td className={`px-4 ${rowPy}`}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(row.status)}`}>{row.status === 'Paid' ? 'Held' : row.status}</span>
                          </td>
                          <td className={`px-4 ${rowPy} text-[#5e503f]`}>{row.paid_date ? fmtShort(row.paid_date) : fmtShort(row.due_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* ══ STATEMENTS GRID ══ */}
                {view === 'statements' && (
                  <div className="p-8">
                    <div className="bg-[#f8faf9] border border-[#e6e8e7] rounded-md p-6 max-w-lg mb-8">
                      <h3 className="text-sm font-bold text-[#22333b] mb-4 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-[#a9927d]" /> Record Bank Interest & Fees
                      </h3>
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest block mb-1">Date</label>
                          <input type="date" value={bankForm.date} onChange={e => setBankForm(p => ({ ...p, date: e.target.value }))} className="w-full bg-white border border-[#e6e8e7] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#22333b] outline-none" />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest block mb-1">Mortgage Interest</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a9927d] text-sm">$</span>
                              <input type="number" placeholder="0.00" value={bankForm.interest} onChange={e => setBankForm(p => ({ ...p, interest: e.target.value }))} className="w-full bg-white border border-[#e6e8e7] rounded-md pl-6 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#22333b] outline-none" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest block mb-1">Bank Fees</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a9927d] text-sm">$</span>
                              <input type="number" placeholder="0.00" value={bankForm.fees} onChange={e => setBankForm(p => ({ ...p, fees: e.target.value }))} className="w-full bg-white border border-[#e6e8e7] rounded-md pl-6 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#22333b] outline-none" />
                            </div>
                          </div>
                        </div>
                        <button onClick={handleSaveBankInterest} className="w-full mt-2 bg-[#22333b] text-white text-xs font-bold py-2.5 rounded-md hover:bg-[#111a1e] transition-colors flex items-center justify-center gap-2">
                          <Save className="w-3.5 h-3.5" /> Save Entry
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ══ RIGHT PANEL ══ */}
              {panelRow && (
                <div className="w-[360px] flex-shrink-0 border-l border-[#e6e8e7] flex flex-col bg-white">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e8e7]">
                    <div>
                      <p className="text-xs font-bold text-[#a9927d] uppercase tracking-widest">Selected Entry</p>
                      <p className="text-sm font-bold text-[#22333b] mt-0.5">
                        {'tenants' in panelRow && panelRow.tenants
                          ? `${panelRow.tenants.first_name} ${panelRow.tenants.last_name}`
                          : ('tenants' in panelRow ? leaseTenantName : '—')}
                      </p>
                    </div>
                    <button onClick={() => setPanelRow(null)} className="p-1.5 rounded-md hover:bg-[#f2f4f3] text-[#a9927d] hover:text-[#22333b] transition-colors">
                      <PanelRightClose className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Panel Tabs */}
                  <div className="flex border-b border-[#e6e8e7]">
                    {(['details', 'ledger', 'notes'] as PanelTab[]).map(t => (
                      <button key={t} onClick={() => setPanelTab(t)} className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 ${panelTab === t ? 'border-[#22333b] text-[#22333b]' : 'border-transparent text-[#a9927d] hover:text-[#22333b]'}`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {panelTab === 'details' && 'amount_due' in panelRow && (
                      <div className="flex flex-col gap-4">
                        {[
                          { label: 'Property', value: panelRow.properties?.address || '—' },
                          { label: 'Tenant', value: panelRow.tenants ? `${panelRow.tenants.first_name} ${panelRow.tenants.last_name}` : leaseTenantName },
                          { label: 'Due Date', value: fmtDate(panelRow.due_date) },
                          { label: 'Amount Due', value: fmt(Number(panelRow.amount_due)) },
                          { label: 'Amount Paid', value: fmt(Number(panelRow.amount_paid)) },
                          { label: 'Balance', value: fmt(Number(panelRow.amount_due) - Number(panelRow.amount_paid)) },
                          { label: 'Status', value: panelRow.status },
                          { label: 'Paid Date', value: panelRow.paid_date ? fmtDate(panelRow.paid_date) : '—' },
                          { label: 'Type', value: panelRow.payment_type },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest flex-shrink-0">{label}</span>
                            <span className="text-xs font-semibold text-[#22333b] text-right">{value}</span>
                          </div>
                        ))}
                        {panelRow.status !== 'Paid' && (
                          <button onClick={() => { updateStatus(panelRow.id, 'Paid'); setPanelRow(null); }}
                            className="mt-2 w-full bg-[#22333b] text-white text-xs font-bold py-2.5 rounded-md hover:bg-[#111a1e] transition-colors flex items-center justify-center gap-2">
                            <Check className="w-3.5 h-3.5" /> Mark as Paid
                          </button>
                        )}
                      </div>
                    )}
                    {panelTab === 'details' && 'expense_date' in panelRow && (
                      <div className="flex flex-col gap-4">
                        {[
                          { label: 'Date', value: fmtDate((panelRow as Expense).expense_date) },
                          { label: 'Category', value: (panelRow as Expense).category },
                          { label: 'Description', value: (panelRow as Expense).description },
                          { label: 'Amount', value: fmt(Number((panelRow as Expense).amount)) },
                          { label: 'Property', value: (panelRow as Expense).properties?.address || '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest flex-shrink-0">{label}</span>
                            <span className="text-xs font-semibold text-[#22333b] text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {panelTab === 'ledger' && (
                      <div className="flex flex-col gap-2">
                        {ledgerEntries.slice(0, 20).map((e, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-[#f2f4f3] last:border-0">
                            <div>
                              <p className="text-[10px] font-bold text-[#a9927d] uppercase">{e.category}</p>
                              <p className="text-xs text-[#22333b] font-medium">{fmtShort(e.date)}</p>
                            </div>
                            <span className={`text-xs font-bold ${e.type === 'Income' ? 'text-emerald-700' : 'text-red-600'}`}>
                              {e.type === 'Income' ? '+' : '−'}{fmt(e.credit || e.debit)}
                            </span>
                          </div>
                        ))}
                        {ledgerEntries.length === 0 && <p className="text-xs text-[#a9927d] text-center py-8">No ledger entries yet.</p>}
                      </div>
                    )}
                    {panelTab === 'notes' && (
                      <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-bold text-[#a9927d] uppercase tracking-widest">Notes</label>
                        <textarea
                          rows={8}
                          value={notes[panelRow.id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [panelRow.id]: e.target.value }))}
                          placeholder="Add notes about this entry…"
                          className="w-full bg-[#f2f4f3] border-none rounded-md p-3 text-xs text-[#22333b] focus:ring-2 focus:ring-[#22333b] outline-none resize-none"
                        />
                        <button onClick={() => setToast({ message: 'Note saved locally', type: 'success' })} className="w-full bg-[#22333b] text-white text-xs font-bold py-2 rounded-md hover:bg-[#111a1e] transition-colors">Save Note</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            
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
            
            {/* Row count footer */}
            <div className="shrink-0 flex items-center justify-between px-5 py-2.5 text-[10px] text-[#a9927d] font-bold border-t border-[#e6e8e7] bg-[#f8faf9]">
              <span>
                {view === 'payments' && `${filteredPayments.length} payments`}
                {view === 'expenses' && `${filteredExpenses.length} expenses`}
                {view === 'ledger'   && `${ledgerEntries.length} entries`}
                {view === 'deposits' && `${depositPayments.length} deposits`}
                {view === 'statements' && `Statements`}
              </span>
              <span>{density === 'spreadsheet' ? 'Spreadsheet' : density === 'compact' ? 'Compact' : 'Comfortable'} view</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[80vh] flex items-center justify-center p-6 bg-[#fbf9f9]">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-[#a9927d]" />
            ) : properties.length === 0 ? (
              <div className="text-center max-w-md bg-white border border-[#e6e8e7] rounded-[8px] p-8 shadow-sm">
                <Building2 className="w-12 h-12 text-[#a9927d] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#22333b] mb-2 font-display">No Properties Found</h3>
                <p className="text-sm text-[#5e503f] mb-6">You need to add a property to your account before you can track accounting and payments.</p>
                <a href="/properties" className="inline-block bg-[#22333b] text-white px-6 py-2.5 rounded-[8px] text-sm font-bold hover:bg-[#111a1e] transition-colors">
                  Go to Properties
                </a>
              </div>
            ) : !selectedLease ? (
              <div className="text-center max-w-md bg-white border border-[#e6e8e7] rounded-[8px] p-8 shadow-sm">
                <FileText className="w-12 h-12 text-[#a9927d] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#22333b] mb-2 font-display">No Leases Created</h3>
                <p className="text-sm text-[#5e503f] mb-6">To generate a payment ledger and track income, your property must have an active lease.</p>
                <a href="/leases" className="inline-block bg-[#22333b] text-white px-6 py-2.5 rounded-[8px] text-sm font-bold hover:bg-[#111a1e] transition-colors">
                  Go to Leases
                </a>
              </div>
            ) : (
              <p className="text-[#a9927d] font-bold">Loading workspace...</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
