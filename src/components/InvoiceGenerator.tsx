import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Plus, Trash2, Building, Calendar as CalendarIcon, User, ChevronDown, PenTool } from 'lucide-react';
import { Typography, Button, TextField, Select, MenuItem, IconButton, Accordion, AccordionSummary, AccordionDetails, FormControl, Paper, Box, Checkbox, Divider, CircularProgress, Backdrop, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '../utils/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ----------------------------------------------------------------------
// TYPES & INITIAL STATE
// ----------------------------------------------------------------------

interface InvoiceItem {
  id: string;
  description: string;
  rate: number;
  gst: number; // percentage
}

interface InvoiceState {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  
  landlordName: string;
  landlordAbn: string;
  landlordAddress: string;
  landlordPhone: string;
  landlordEmail: string;

  tenantName: string;
  tenantEmail: string;
  tenantAbn: string;
  tenantAttention: string;
  tenantAddress: string;

  items: InvoiceItem[];
  
  paymentInstructions: string;
  notes: string;
  
  templateStyle: 'classic' | 'modern' | 'minimalist' | 'corporate' | 'creative' | 'elegant' | 'google' | 'monochrome';
  propertyId: string | null;
}

const getInitialState = (user: any, initialData?: any): InvoiceState => {
  const d = new Date();
  const issueDate = initialData?.issue_date || d.toISOString().split('T')[0];
  d.setDate(d.getDate() + 7);
  const dueDate = initialData?.due_date || d.toISOString().split('T')[0];

  return {
    invoiceNumber: initialData?.invoice_number || `INV${Date.now().toString().slice(-6)}`,
    issueDate,
    dueDate,
    landlordName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Landlord Name',
    landlordAbn: '17 234 567 890',
    landlordAddress: '123 Main Street\nSydney NSW 2000\nAustralia',
    landlordPhone: '0412 345 678',
    landlordEmail: user?.email || '',
    tenantName: initialData?.tenant_name || initialData?.tenantName || 'Tenant Name',
    tenantEmail: initialData?.tenant_email || '',
    propertyId: initialData?.property_id || null,
    tenantAbn: '45 678 123 456',
    tenantAttention: initialData?.tenant_name || initialData?.tenantName || 'Tenant Name',
    tenantAddress: initialData?.property_address || initialData?.propertyName || 'Property Address\nCity State Zip\nAustralia',
    items: [
      {
        id: Date.now().toString(),
        description: initialData ? `Rent payment for ${initialData.property_address || initialData.propertyName}` : `Rent payment for 1 month (${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})`,
        rate: initialData?.total_amount || 1000,
        gst: 0
      }
    ],
    paymentInstructions: 'Bank Name: Commonwealth Bank\nBSB: 123-456\nAccount: 12345678',
    notes: 'Please let us know if you have any questions.',
    templateStyle: 'classic'
  };
};

// ----------------------------------------------------------------------
// REACT COMPONENT
// ----------------------------------------------------------------------

export function InvoiceGenerator({ onClose, properties = [], initialData }: { onClose: () => void, properties?: any[], initialData?: any }) {
  const { user } = useAuth();
  const [state, setState] = useState<InvoiceState>(getInitialState(user, initialData));
  const [isSaving, setIsSaving] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [bulkStartMonth, setBulkStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [bulkMonthCount, setBulkMonthCount] = useState(12);
  const [bulkDueDays, setBulkDueDays] = useState(7);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [mobileScale, setMobileScale] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);

  const [contentHeight, setContentHeight] = useState(1123);

  useEffect(() => {
    const calcScale = () => setMobileScale(Math.min((window.innerWidth - 32) / 794, 1));
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, []);

  useEffect(() => {
    if (!mobilePreviewRef.current && !previewRef.current) return;
    const target = mobilePreviewRef.current || previewRef.current;
    if (!target) return;

    const observer = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        for (let entry of entries) {
          setContentHeight(entry.target.scrollHeight);
        }
      });
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [mobileTab, state.templateStyle, state.items]);

  const handlePropertyChange = async (propertyId: string) => {
    if (!propertyId || propertyId === 'none') {
      setState(prev => ({ ...prev, propertyId: null }));
      return;
    }
    const prop = properties.find(p => p.id === propertyId);
    if (prop) {
      setState(prev => ({
        ...prev,
        propertyId: prop.id,
        landlordAddress: prop.address,
        tenantName: prop.tenant_name || prev.tenantName,
        tenantAddress: prop.address,
        items: [
          {
            id: Date.now().toString(),
            description: `Rent payment for ${prop.address}`,
            rate: Number(prop.rent_amount) || 0,
            gst: 0
          }
        ]
      }));

      // Foolproof fallback: If the database is missing the tenant name on the property record, 
      // fetch it directly from the actual tenants table or the accepted rental application!
      if (!prop.tenant_name || prop.tenant_name.trim() === 'Tenant' || prop.tenant_name.trim() === 'Unknown Tenant' || prop.tenant_name.trim() === 'Tenant Name') {
        try {
          // 1. Try active lease first
          const { data: lease } = await supabase
            .from('leases')
            .select('id, tenant_id, lease_tenants(tenants(first_name, last_name, email))')
            .eq('property_id', prop.id)
            .eq('status', 'Active')
            .maybeSingle();

          if (lease && lease.lease_tenants) {
            const lTenants = lease.lease_tenants as any;
            const tenant = Array.isArray(lTenants) ? lTenants[0]?.tenants : lTenants?.tenants;
            if (tenant) {
              setState(prev => ({ 
                ...prev, 
                tenantName: `${tenant.first_name} ${tenant.last_name}`.trim(),
                tenantEmail: tenant.email || ''
              }));
              return;
            }
          }

          // 2. Fallback to accepted property enquiry
          const { data: enq } = await supabase
            .from('property_enquiries')
            .select('first_name, last_name, email')
            .eq('property_id', prop.id)
            .eq('status', 'Accepted')
            .limit(1)
            .maybeSingle();
            
          if (enq) {
            setState(prev => ({ 
              ...prev, 
              tenantName: `${enq.first_name} ${enq.last_name}`.trim(),
              tenantEmail: enq.email || ''
            }));
          }
        } catch (e) {
          console.error("Failed to fetch fallback tenant name:", e);
        }
      }
    }
  };

  const updateState = (key: keyof InvoiceState, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const addItem = () => {
    setState(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: 'New Item', rate: 0, gst: 0 }]
    }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (id: string) => {
    setState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const subtotal = state.items.reduce((acc, curr) => acc + curr.rate, 0);
  const totalGst = state.items.reduce((acc, curr) => acc + (curr.rate * (curr.gst / 100)), 0);
  const total = subtotal + totalGst;

  const leaseIdDisplay = (() => {
    let hash = 0;
    const idToHash = state.propertyId || state.invoiceNumber;
    for (let i = 0; i < idToHash.length; i++) {
      hash = ((hash << 5) - hash) + idToHash.charCodeAt(i);
      hash |= 0;
    }
    return `L-${Math.abs(hash).toString().substring(0, 8).padEnd(6, '0')}`;
  })();

  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: `${state.invoiceNumber}_${state.tenantName?.replace(/\s+/g, '_')}`,
    onAfterPrint: async () => {
      setIsSaving(true);
      try {
        // Fetch the active lease for this property to attach it to the invoice
        let activeLeaseId = null;
        if (state.propertyId) {
          const { data: lease } = await supabase
            .from('leases')
            .select('id')
            .eq('property_id', state.propertyId)
            .eq('status', 'Active')
            .maybeSingle();
          
          if (lease) activeLeaseId = lease.id;
        }

        const invoicePayload = {
          user_id: user?.id,
          property_id: state.propertyId,
          lease_id: activeLeaseId,
          invoice_number: state.invoiceNumber,
          total_amount: total,
          due_date: state.dueDate || new Date().toISOString().split('T')[0],
          issue_date: state.issueDate || new Date().toISOString().split('T')[0],
          property_address: properties.find(p => p.id === state.propertyId)?.address || initialData?.property_address || '',
          tenant_name: state.tenantName,
          tenant_email: state.tenantEmail,
          billing_period_start: state.issueDate || new Date().toISOString().split('T')[0],
          billing_period_end: state.dueDate || new Date().toISOString().split('T')[0],
        };

        let invError;
        if (initialData?.id) {
          // Update existing invoice
          const { error } = await supabase.from('invoices').update(invoicePayload).eq('id', initialData.id);
          invError = error;
        } else {
          // Insert new invoice and return the ID
          const { data: newInvoice, error } = await supabase.from('invoices').insert({
            ...invoicePayload,
            status: 'Draft'
          }).select().single();
          
          invError = error;
          
          if (!error && newInvoice && state.propertyId) {
            // Auto-sync with Phase 4 Ledger (only for new invoices)
            await supabase.from('payments').insert({
               property_id: state.propertyId,
               lease_id: activeLeaseId,
               invoice_id: newInvoice.id,
               amount_due: total,
               due_date: state.dueDate || new Date().toISOString().split('T')[0],
               status: 'Pending',
               payment_type: 'Rent' // Assume Rent by default for generated invoices
            });
          }
        }

        if (invError) throw invError;

        onClose();
      } catch (e: any) {
        console.error('Error saving invoice:', e);
        alert('Failed to save invoice. Error: ' + (e?.message || 'Unknown'));
      } finally {
        setIsSaving(false);
      }
    }
  });

  const handleSaveBulk = async () => {
    setIsSaving(true);
    try {
      // Resolve active lease for this property to get lease_id
      let activeLeaseId = null;
      if (state.propertyId) {
        const { data: lease } = await supabase
          .from('leases')
          .select('id')
          .eq('property_id', state.propertyId)
          .eq('status', 'Active')
          .maybeSingle();
        
        if (lease) activeLeaseId = lease.id;
      }

      const totalAmount = total; // computed total in frontend
      
      const addMonthsLocal = (dateStr: string, n: number): string => {
        const [year, month] = dateStr.split('-').map(Number);
        const d = new Date(year, month - 1 + n, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };

      const toIsoDateLocal = (yearMonth: string, day = 1): string => {
        const [year, month] = yearMonth.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toISOString().split('T')[0];
      };

      const addDaysToDateLocal = (isoDate: string, days: number): string => {
        const d = new Date(isoDate);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };

      const propPrefix = state.propertyId ? state.propertyId.split('-')[0].toUpperCase() : 'CUST';

      for (let i = 0; i < bulkMonthCount; i++) {
        const monthStr = addMonthsLocal(bulkStartMonth, i);
        const [yr, mo] = monthStr.split('-');
        
        const issueDateVal = toIsoDateLocal(monthStr, 1);
        const dueDateVal = addDaysToDateLocal(issueDateVal, bulkDueDays);
        const invoiceNumberVal = `INV-${propPrefix}-${mo}-${yr}`;

        const monthLabel = new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleString('en-AU', { month: 'long', year: 'numeric' });

        const invoicePayload = {
          user_id: user?.id,
          property_id: state.propertyId,
          lease_id: activeLeaseId,
          invoice_number: invoiceNumberVal,
          total_amount: totalAmount,
          due_date: dueDateVal,
          issue_date: issueDateVal,
          property_address: state.tenantAddress || '',
          tenant_name: state.tenantName,
          tenant_email: state.tenantEmail,
          notes: `${state.notes}\n\nRent payment for ${monthLabel}`,
          billing_period_start: issueDateVal,
          billing_period_end: dueDateVal,
          status: 'Draft',
          late_fee_applied: false
        };

        const { data: newInvoice, error: invError } = await supabase.from('invoices').insert(invoicePayload).select().single();
        if (invError) throw invError;

        if (newInvoice && state.propertyId) {
          // Auto-sync with Payments ledger
          await supabase.from('payments').insert({
             property_id: state.propertyId,
             lease_id: activeLeaseId,
             invoice_id: newInvoice.id,
             amount_due: totalAmount,
             due_date: dueDateVal,
             status: 'Pending',
             payment_type: 'Rent'
          });
        }
      }

      alert(`Successfully generated ${bulkMonthCount} bulk invoices!`);
      onClose();
    } catch (e: any) {
      console.error('Error saving bulk invoices:', e);
      alert('Failed to save bulk invoices. Error: ' + (e?.message || 'Unknown'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAndSave = () => {
    if (isBulk) {
      handleSaveBulk();
    } else {
      handlePrint();
    }
  };

  // Common Template Components to reduce repetition
  const renderItemsTable = (headColor: string, textColor: string, borderColor: string, isClassic = false, alternateRowColor?: string) => (
    <div className="mb-10 w-full border border-gray-200 rounded-sm overflow-hidden">
      <div className={`flex text-sm font-bold py-3 px-4`} style={{ backgroundColor: headColor, color: isClassic ? '#0a1432' : textColor, borderBottom: `2px solid ${borderColor}` }}>
        <div className="flex-1">Description</div>
        <div className="w-32 text-right">Rate</div>
        <div className="w-24 text-center">GST</div>
        <div className="w-32 text-right">Amount</div>
      </div>
      <div>
        {state.items.map((item, i) => (
          <div key={i} className="flex text-sm py-4 px-4 border-b border-gray-200 last:border-b-0" style={{ backgroundColor: alternateRowColor && i % 2 !== 0 ? alternateRowColor : 'transparent', color: '#334155' }}>
            <div className="flex-1 font-medium">{item.description}</div>
            <div className="w-32 text-right">${formatCurrency(item.rate)}</div>
            <div className="w-24 text-center">{item.gst}%</div>
            <div className="w-32 text-right font-bold" style={{ color: isClassic ? '#0a1432' : '#0f172a' }}>${formatCurrency(item.rate * (1 + item.gst / 100))}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] flex flex-col bg-surface-container-lowest"
    >
      {/* ── HEADER ── */}
      <div className="flex-shrink-0 z-10 flex items-center justify-between px-4 md:px-6 h-[60px] md:h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40 shadow-sm">
        {/* Left: back button (mobile) / logo icon (desktop) */}
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          <button
            onClick={onClose}
            className="md:hidden flex items-center gap-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-2xl px-3 py-2 font-bold text-sm transition-all"
          >
            <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
            Back
          </button>
          {/* Desktop icon badge + title */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <PenTool size={16} className="text-primary" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-on-surface">Invoice Architect</span>
          </div>
        </div>

        {/* Center: title on mobile */}
        <span className="md:hidden text-base font-extrabold tracking-tight text-on-surface absolute left-1/2 -translate-x-1/2">Invoice Architect</span>

        {/* Right: invoice no chip (mobile) / action buttons (desktop) */}
        <div className="flex items-center gap-2">
          {/* Mobile: show invoice number as a subtle badge */}
          <span className="md:hidden text-[11px] font-black text-on-surface-variant bg-surface-container-low border border-outline-variant/50 rounded-full px-2.5 py-1 tracking-wider">
            {state.invoiceNumber}
          </span>
          {/* Desktop buttons */}
          <button
            onClick={onClose}
            className="hidden md:flex items-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-2xl px-4 py-2 font-bold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateAndSave}
            disabled={isSaving}
            className="hidden md:flex items-center gap-2 bg-primary text-on-primary rounded-2xl px-5 py-2 font-bold text-sm shadow-md hover:opacity-90 transition-all disabled:opacity-60"
          >
            <Download size={16} />
            {isSaving ? 'Generating...' : isBulk ? 'Generate Bulk' : 'Save PDF'}
          </button>
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* SLIDING WRAPPER FOR MOBILE TABS */}
        <div 
          className={`flex h-full w-[200%] md:w-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            mobileTab === 'preview' ? '-translate-x-1/2 md:translate-x-0' : 'translate-x-0'
          }`}
        >
          {/* LEFT PANEL - MUI EDITOR */}
          <Box
            sx={{
              // On mobile: take exactly 50% of the 200% wrapper (which is 100% of viewport)
              // On desktop: fixed width sidebar
              width: { xs: '50%', md: 450 },
              flex: { xs: '0 0 50%', md: '0 0 450px' },
              minHeight: 0,
              minWidth: 0,
              bgcolor: 'background.paper',
              borderRight: { xs: 0, md: 1 },
              borderColor: 'divider',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              p: { xs: 2, md: 3 },
              display: 'flex', // ALWAYS rendered for the slide animation
              flexDirection: 'column',
              gap: 3,
            }}
          className="custom-scrollbar"
        >
          
          {/* Global Settings */}
          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Global Settings</Typography>
            
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>Select Property</Typography>
              <Select value={state.propertyId || 'none'} onChange={(e) => handlePropertyChange(e.target.value as string)}>
                <MenuItem value="none">Custom / No Property</MenuItem>
                {properties.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.address}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>Template Style</Typography>
              <Select value={state.templateStyle} onChange={(e) => updateState('templateStyle', e.target.value as any)}>
                <MenuItem value="classic">Classic Clean</MenuItem>
                <MenuItem value="modern">Modern Slate</MenuItem>
                <MenuItem value="minimalist">Minimalist Line</MenuItem>
                <MenuItem value="corporate">Corporate Blue</MenuItem>
                <MenuItem value="creative">Creative Studio</MenuItem>
                <MenuItem value="elegant">Elegant Serif</MenuItem>
                <MenuItem value="google">Google Material</MenuItem>
                <MenuItem value="monochrome">Monochrome Dark</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'primary.50/10', border: '1px solid', borderColor: 'primary.100', borderRadius: '16px' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.900' }}>Generate in Bulk</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>Create sequential monthly invoices</Typography>
              </Box>
              <Checkbox
                checked={isBulk}
                onChange={(e) => setIsBulk(e.target.checked)}
                sx={{ p: 0.5, '&.Mui-checked': { color: 'primary.main' } }}
              />
            </Box>

            {isBulk ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                  variant="outlined"
                  label="Start Month"
                  type="month"
                  size="small"
                  fullWidth
                  value={bulkStartMonth}
                  onChange={(e) => setBulkStartMonth(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    variant="outlined"
                    label="Months Count"
                    type="number"
                    size="small"
                    fullWidth
                    value={bulkMonthCount}
                    onChange={(e) => setBulkMonthCount(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <TextField
                    variant="outlined"
                    label="Due in (days)"
                    type="number"
                    size="small"
                    fullWidth
                    value={bulkDueDays}
                    onChange={(e) => setBulkDueDays(Math.min(60, Math.max(1, parseInt(e.target.value) || 7)))}
                  />
                </Box>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  {/* @ts-ignore */}
                  <TextField variant="outlined" label="Issue Date" type="date" size="small" fullWidth value={state.issueDate} onChange={(e) => updateState('issueDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                  {/* @ts-ignore */}
                  <TextField variant="outlined" label="Due Date" type="date" size="small" fullWidth value={state.dueDate} onChange={(e) => updateState('dueDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                </Box>
                
                <TextField 
                  variant="outlined"
                  label="Invoice Number" 
                  size="small" 
                  fullWidth 
                  value={state.invoiceNumber} 
                  disabled
                  helperText="System Generated Automatically"
                  sx={{ mb: 3 }}
                />
              </>
            )}
          </Box>

          <Divider />

          {/* Accordions */}
          <Box>
            <Accordion disableGutters variant="outlined" sx={{ mb: 2, borderRadius: 1 }}>
              <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><User size={18} color="#3b82f6" /><Typography sx={{ fontWeight: 700 }}>Landlord Details</Typography></Box>
              </AccordionSummary>
              <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
                <TextField label="Name" size="small" fullWidth value={state.landlordName} onChange={(e) => updateState('landlordName', e.target.value)} />
                <TextField label="ABN" size="small" fullWidth value={state.landlordAbn} onChange={(e) => updateState('landlordAbn', e.target.value)} />
                <TextField label="Address" size="small" fullWidth multiline rows={3} value={state.landlordAddress} onChange={(e) => updateState('landlordAddress', e.target.value)} />
                <TextField label="Phone" size="small" fullWidth value={state.landlordPhone} onChange={(e) => updateState('landlordPhone', e.target.value)} />
                <TextField label="Email" size="small" fullWidth value={state.landlordEmail} onChange={(e) => updateState('landlordEmail', e.target.value)} />
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters variant="outlined" sx={{ borderRadius: 1 }}>
              <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><Building size={18} color="#3b82f6" /><Typography sx={{ fontWeight: 700 }}>Tenant (Bill To)</Typography></Box>
              </AccordionSummary>
              <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
                <TextField label="Name" size="small" fullWidth value={state.tenantName} onChange={(e) => updateState('tenantName', e.target.value)} />
                <TextField label="Email" size="small" fullWidth value={state.tenantEmail} onChange={(e) => updateState('tenantEmail', e.target.value)} />
                <TextField label="ABN" size="small" fullWidth value={state.tenantAbn} onChange={(e) => updateState('tenantAbn', e.target.value)} />
                <TextField label="Attention" size="small" fullWidth value={state.tenantAttention} onChange={(e) => updateState('tenantAttention', e.target.value)} />
                <TextField label="Address" size="small" fullWidth multiline rows={3} value={state.tenantAddress} onChange={(e) => updateState('tenantAddress', e.target.value)} />
              </AccordionDetails>
            </Accordion>
          </Box>

          <Divider />

          {/* Line Items */}
          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Line Items</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
              {state.items.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <TextField label="Description" size="small" fullWidth value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField label="Rate" type="number" size="small" fullWidth placeholder="0" value={item.rate || ''} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} />
                    <TextField label="GST (%)" type="number" size="small" fullWidth placeholder="0" value={item.gst || ''} onChange={(e) => updateItem(item.id, 'gst', parseFloat(e.target.value) || 0)} />
                    <IconButton onClick={() => removeItem(item.id)} size="small" color="error" sx={{ bgcolor: 'error.50', border: 1, borderColor: 'error.100', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Box>
            <Button variant="outlined" fullWidth onClick={addItem} startIcon={<Plus size={18} />} sx={{ borderStyle: 'dashed', borderWidth: 2, py: 1.5, borderRadius: 2, color: 'text.secondary', borderColor: 'divider' }}>Add Line Item</Button>
          </Box>

          <Divider />

          {/* Footer */}
          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Footer & Instructions</Typography>
            <TextField label="Payment Instructions" size="small" fullWidth multiline rows={4} value={state.paymentInstructions} onChange={(e) => updateState('paymentInstructions', e.target.value)} sx={{ mb: 3 }} />
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={state.notes} onChange={(e) => updateState('notes', e.target.value)} />
          </Box>

        </Box>

        {/* DESKTOP RIGHT PANEL - always in DOM (needed for printing), hidden on mobile */}
        <div className="hidden md:flex flex-1 bg-[#e2e8f0]/50 p-8 overflow-auto justify-center custom-scrollbar items-start">
          <div className="w-[794px] bg-white shadow-2xl overflow-hidden shrink-0 transition-all duration-300">
            <div ref={previewRef} className="w-[794px] min-h-min bg-white relative box-border" style={{ padding: '60px' }}>
              
              {state.templateStyle === 'classic' && (
                <div className="font-sans text-[#162129] h-full flex flex-col">
                  <div className="flex justify-between items-start mb-16">
                    <h1 className="text-5xl font-bold text-[#0a1432] tracking-tight">INVOICE</h1>
                    <div className="bg-[#f8fafc] rounded-xl p-5 w-64">
                      <div className="flex justify-between mb-3 text-xs"><span className="text-[#646e82]">Invoice Date</span><span className="font-semibold text-[#0a1432]">{new Date(state.issueDate).toLocaleDateString('en-GB')}</span></div>
                      <div className="flex justify-between mb-4 text-xs"><span className="text-[#646e82]">Due Date</span><span className="font-semibold text-[#0a1432]">{new Date(state.dueDate).toLocaleDateString('en-GB')}</span></div>
                      <div className="border-t border-[#e2e8f0] pt-4"><span className="text-xs font-bold text-[#0a1432] block mb-1">Amount Due (AUD)</span><span className="text-3xl font-bold text-[#2962ff]">${formatCurrency(total)}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10 mb-16">
                    <div>
                      <h3 className="text-xs font-bold text-[#2962ff] mb-2 uppercase tracking-wide">From</h3>
                      <p className="font-bold text-sm text-[#0a1432] mb-1">{state.landlordName}</p>
                      {state.landlordAbn && <p className="text-xs text-[#646e82] mb-3">ABN {state.landlordAbn}</p>}
                      <p className="text-xs text-[#646e82] whitespace-pre-line mb-3">{state.landlordAddress}</p>
                    </div>
                    <div className="pl-10">
                      <h3 className="text-xs font-bold text-[#2962ff] mb-2 uppercase tracking-wide">Invoice sent to</h3>
                      <p className="font-bold text-sm text-[#0a1432] mb-1">{state.tenantName}</p>
                      {state.tenantAbn && <p className="text-xs text-[#646e82] mb-3">ABN {state.tenantAbn}</p>}
                      <p className="text-xs text-[#646e82] whitespace-pre-line">{state.tenantAddress}</p>
                    </div>
                  </div>
                  
                  {renderItemsTable('#f8fafc', '#646e82', '#2962ff', true)}
                  
                  <div className="flex justify-between items-start mb-12">
                    <div className="w-64"><div className="bg-[#f8fafc] rounded-xl p-4 mb-4"><span className="text-xs font-bold text-[#2962ff]">Due Date: <span className="text-[#0a1432]">{new Date(state.dueDate).toLocaleDateString('en-GB')}</span></span></div><p className="text-xs text-[#646e82] pl-2">{state.notes}</p></div>
                    <div className="w-72">
                      <div className="flex justify-between py-2 text-xs"><span className="text-[#0a1432]">Subtotal</span><span className="text-[#0a1432]">${formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between py-2 text-xs"><span className="text-[#0a1432]">GST</span><span className="text-[#0a1432]">${formatCurrency(totalGst)}</span></div>
                      <div className="flex justify-between py-4 mt-2 bg-[#f8fafc] rounded-lg px-4 items-center"><span className="text-xs font-bold text-[#2962ff]">TOTAL AMOUNT DUE</span><span className="text-lg font-bold text-[#2962ff]">${formatCurrency(total)}</span></div>
                    </div>
                  </div>
                  <div className="mt-8 bg-[#f8fafc] rounded-xl p-6"><h4 className="text-sm font-bold text-[#0a1432] mb-2">Payment Instructions</h4><p className="text-xs text-[#646e82] whitespace-pre-line">{state.paymentInstructions}</p></div>
                </div>
              )}

              {state.templateStyle === 'modern' && (
                <div className="font-sans text-[#162129] relative h-full flex flex-col">
                  <div className="absolute top-[-60px] bottom-[-60px] left-[-60px] w-4 bg-blue-500 z-10" />
                  <div className="bg-[#22333b] text-white p-12 -mx-[60px] -mt-[60px] mb-12 flex justify-between items-start pl-[60px]">
                    <div><h1 className="text-3xl font-black tracking-tight">{state.landlordName}</h1><p className="text-xs text-[#b4c8d2] mt-1 tracking-widest">PROPERTY MANAGEMENT</p></div>
                    <div className="text-right pr-[60px]"><h2 className="text-4xl font-black">INVOICE</h2></div>
                  </div>
                  <div className="grid grid-cols-3 gap-8 mb-12 pl-4">
                    <div><h3 className="text-[10px] font-bold text-[#647482] uppercase tracking-widest mb-3">From</h3><p className="font-bold text-sm text-[#162129] mb-1">{state.landlordName}</p><p className="text-xs text-[#647482] whitespace-pre-line">{state.landlordAddress}</p></div>
                    <div><h3 className="text-[10px] font-bold text-[#647482] uppercase tracking-widest mb-3">Bill To</h3><p className="font-bold text-sm text-[#162129] mb-1">{state.tenantName}</p><p className="text-xs text-[#647482] whitespace-pre-line">{state.tenantAddress}</p></div>
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-5 text-center"><p className="text-[10px] font-bold text-[#647482] uppercase tracking-widest mb-1">Due Date</p><p className="text-base font-bold text-[#162129] mb-3">{new Date(state.dueDate).toLocaleDateString('en-GB')}</p><p className="text-2xl font-black text-[#22333b]">${formatCurrency(total)}</p></div>
                  </div>
                  
                  <div className="pl-4">
                    {renderItemsTable('#22333b', '#ffffff', '#e2e8f0')}
                  </div>

                  <div className="flex justify-end mb-8 pl-4">
                    <div className="w-72">
                      <div className="flex justify-between py-2 text-sm"><span className="text-[#647482]">Subtotal</span><span className="text-[#162129]">${formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between py-2 text-sm border-b border-[#e2e8f0] mb-4 pb-4"><span className="text-[#647482]">GST</span><span className="text-[#162129]">${formatCurrency(totalGst)}</span></div>
                      <div className="flex justify-between items-center bg-[#22333b] text-white py-4 px-5 rounded-lg"><span className="text-sm font-bold uppercase tracking-widest">Total Due</span><span className="text-xl font-black">${formatCurrency(total)}</span></div>
                    </div>
                  </div>
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6 w-2/3 ml-4 mt-8">
                    <h4 className="text-[10px] font-bold text-[#22333b] uppercase tracking-widest mb-3">Instructions & Notes</h4>
                    {state.notes && <p className="text-xs text-[#647482] whitespace-pre-line leading-relaxed mb-3">{state.notes}</p>}
                    <p className="text-xs text-[#647482] whitespace-pre-line leading-relaxed">{state.paymentInstructions}</p>
                  </div>
                </div>
              )}

              {state.templateStyle === 'minimalist' && (
                <div className="font-sans text-black h-full flex flex-col">
                  <div className="flex justify-between items-end mb-16"><h1 className="text-4xl tracking-widest">INVOICE</h1><div className="text-right text-sm text-gray-500"><p>Due: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p></div></div>
                  <div className="mb-8"><p className="font-semibold text-sm mb-1">{state.landlordName}</p><p className="text-xs text-gray-500 whitespace-pre-line">{state.landlordAddress}</p></div>
                  <div className="border-t border-black pt-8 mb-16"><p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Bill To</p><p className="font-semibold text-sm mb-1">{state.tenantName}</p><p className="text-xs text-gray-500 whitespace-pre-line">{state.tenantAddress}</p></div>
                  
                  {renderItemsTable('transparent', '#000000', '#e5e7eb')}

                  <div className="flex justify-end mb-8 border-t border-gray-200 pt-8 mt-auto">
                    <div className="w-72 space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium">${formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">GST</span><span className="font-medium">${formatCurrency(totalGst)}</span></div>
                      <div className="flex justify-between text-xl font-black pt-4 border-t border-gray-200 text-black"><span>Total Due</span><span>${formatCurrency(total)}</span></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-8 pt-6 border-t border-gray-100">
                    <p className="font-semibold text-black uppercase tracking-wider mb-2">Instructions & Notes</p>
                    {state.notes && <p className="whitespace-pre-line leading-relaxed mb-3">{state.notes}</p>}
                    <p className="whitespace-pre-line leading-relaxed">{state.paymentInstructions}</p>
                  </div>
                </div>
              )}

              {state.templateStyle === 'corporate' && (
                <div className="font-sans text-[#0f172a] h-full flex flex-col">
                  <div className="bg-[#0f172a] -mx-[60px] -mt-[60px] px-[60px] py-12 mb-10 text-white flex justify-between items-center">
                    <h1 className="text-4xl font-bold">INVOICE</h1>
                    <div className="text-right"><p className="text-sm opacity-60">Due: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-10 mb-12">
                    <div><h3 className="font-bold text-lg mb-2">{state.landlordName}</h3><p className="text-sm text-gray-500 whitespace-pre-line">{state.landlordAddress}</p></div>
                    <div className="text-right"><h3 className="font-bold text-sm text-gray-400 mb-2 uppercase">Bill To:</h3><p className="font-bold text-lg mb-2">{state.tenantName}</p><p className="text-sm text-gray-500 whitespace-pre-line">{state.tenantAddress}</p></div>
                  </div>
                  
                  {renderItemsTable('#f1f5f9', '#0f172a', '#e2e8f0')}

                  <div className="flex justify-end mb-8">
                    <div className="w-80">
                      <div className="flex justify-between text-sm mb-2 px-6"><span className="text-gray-500">Subtotal</span><span className="font-medium">${formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between text-sm mb-4 px-6"><span className="text-gray-500">GST</span><span className="font-medium">${formatCurrency(totalGst)}</span></div>
                      <div className="flex justify-between text-xl font-bold text-[#0f172a] bg-[#f1f5f9] p-6 rounded-lg"><span>Total Due</span><span>${formatCurrency(total)}</span></div>
                    </div>
                  </div>
                  <div className="mt-8 border-t border-gray-200 pt-8 mt-auto">
                    <h4 className="font-bold mb-2 text-sm uppercase tracking-wider">Instructions & Notes</h4>
                    {state.notes && <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{state.notes}</p>}
                    <p className="text-sm text-gray-600 whitespace-pre-line">{state.paymentInstructions}</p>
                  </div>
                </div>
              )}

              {state.templateStyle === 'creative' && (
                <div className="font-sans text-[#18181b] relative overflow-hidden h-full flex flex-col">
                  <div className="absolute top-[-150px] right-[-150px] w-96 h-96 bg-[#f97316] rounded-full opacity-[0.08]" />
                  <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 bg-[#fb923c] rounded-full opacity-[0.05]" />
                  <div className="relative z-10 flex-1 flex flex-col">
                    <h1 className="text-7xl font-black mb-2 tracking-tighter">INVOICE.</h1>

                    <div className="grid grid-cols-2 gap-10 mb-16">
                      <div><p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Invoice To</p><p className="font-bold text-2xl mb-2">{state.tenantName}</p><p className="text-sm text-gray-600 whitespace-pre-line">{state.tenantAddress}</p></div>
                      <div className="text-right"><p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">From</p><p className="font-bold text-xl mb-2">{state.landlordName}</p><p className="text-sm text-gray-600 whitespace-pre-line">{state.landlordAddress}</p><p className="text-sm font-bold text-[#f97316] mt-4">Due: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p></div>
                    </div>
                    
                    {renderItemsTable('transparent', '#f97316', '#f97316')}

                    <div className="flex justify-end mb-8">
                      <div className="w-72 text-right">
                        <div className="flex justify-between text-base mb-2"><span className="text-gray-500 font-medium">Subtotal</span><span className="font-bold">${formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between text-base mb-6"><span className="text-gray-500 font-medium">GST</span><span className="font-bold">${formatCurrency(totalGst)}</span></div>
                        <p className="text-xl font-black mb-1">TOTAL AMOUNT</p>
                        <p className="text-5xl font-black text-[#f97316]">${formatCurrency(total)}</p>
                      </div>
                    </div>
                    <div className="mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-auto">
                      <h4 className="font-bold mb-2 text-[#f97316]">Instructions & Notes</h4>
                      {state.notes && <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{state.notes}</p>}
                      <p className="text-sm text-gray-600 whitespace-pre-line">{state.paymentInstructions}</p>
                    </div>
                  </div>
                </div>
              )}

              {state.templateStyle === 'elegant' && (
                <div className="font-serif text-[#2d2d2d] h-full flex flex-col">
                  <h1 className="text-5xl text-center mb-6 tracking-[0.2em]">INVOICE</h1>
                  <div className="w-24 h-px bg-[#c0a060] mx-auto mb-8" />

                  <p className="text-center text-sm font-bold text-[#c0a060] mb-16">Due Date: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p>
                  
                  <div className="grid grid-cols-2 gap-10 mb-16 text-center">
                    <div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">From</p><p className="font-bold text-xl mb-3">{state.landlordName}</p><p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{state.landlordAddress}</p></div>
                    <div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">To</p><p className="font-bold text-xl mb-3">{state.tenantName}</p><p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{state.tenantAddress}</p></div>
                  </div>
                  
                  {renderItemsTable('transparent', '#c0a060', '#c0a060')}

                  <div className="flex justify-end mb-auto">
                    <div className="w-80 border-t border-[#c0a060] pt-6">
                      <div className="flex justify-between text-sm mb-3"><span className="text-gray-500 italic">Subtotal</span><span className="font-bold">${formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between text-sm mb-6"><span className="text-gray-500 italic">GST</span><span className="font-bold">${formatCurrency(totalGst)}</span></div>
                      <div className="flex justify-between text-2xl font-bold"><span>Total Due</span><span className="text-[#c0a060]">${formatCurrency(total)}</span></div>
                    </div>
                  </div>
                  <div className="text-center mt-16 pt-8 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Information & Notes</p>
                    {state.notes && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed mb-3">{state.notes}</p>}
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{state.paymentInstructions}</p>
                  </div>
                </div>
              )}

              {state.templateStyle === 'google' && (
                <div className="font-sans text-[#202124] h-full flex flex-col bg-white -mx-[60px] -my-[60px] px-[80px] py-[80px] border-[8px] border-[#f8f9fa]">
                  <div className="flex justify-between items-start mb-16 pb-8 border-b-2 border-[#f1f3f4]">
                    <div className="flex items-center gap-5">
                      <div className="flex flex-col gap-1 pr-5 border-r-2 border-[#f1f3f4]">
                        <div className="flex gap-1">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#ea4335]"></div>
                          <div className="w-3.5 h-3.5 rounded-full bg-[#4285f4]"></div>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#fbbc04]"></div>
                          <div className="w-3.5 h-3.5 rounded-full bg-[#34a853]"></div>
                        </div>
                      </div>
                      <div>
                        <h1 className="text-3xl font-medium text-[#202124] tracking-tight">{state.landlordName}</h1>
                        <p className="text-sm text-[#5f6368] whitespace-pre-line mt-1.5">{state.landlordAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-3xl font-normal text-[#1a73e8] tracking-tight mb-2">INVOICE</h2>

                    </div>
                  </div>

                  <div className="flex gap-10 mb-16">
                    <div className="flex-1 bg-[#f8fafd] rounded-2xl p-6 border border-[#e8eaed]">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-4 h-4 text-[#1a73e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        <p className="text-[11px] font-bold text-[#1a73e8] uppercase tracking-wider">Billed To</p>
                      </div>
                      <p className="text-xl font-medium text-[#202124] mb-2">{state.tenantName}</p>
                      <p className="text-sm text-[#5f6368] whitespace-pre-line leading-relaxed max-w-md">{state.tenantAddress}</p>
                    </div>
                    
                    <div className="w-[300px] flex flex-col gap-4">
                      <div className="flex justify-between items-center bg-[#f8f9fa] rounded-xl p-4 border border-[#e8eaed]">
                        <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wider">Issue Date</p>
                        <p className="text-sm font-medium text-[#202124]">{new Date(state.issueDate).toLocaleDateString('en-GB')}</p>
                      </div>
                      <div className="flex justify-between items-center bg-[#fce8e6] rounded-xl p-4 border border-[#fad2cf]">
                        <p className="text-xs font-bold text-[#d93025] uppercase tracking-wider">Due Date</p>
                        <p className="text-sm font-bold text-[#d93025]">{new Date(state.dueDate).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10 rounded-2xl overflow-hidden border border-[#e8eaed]">
                    {renderItemsTable('#f8f9fa', '#202124', '#e8eaed', false, '#ffffff')}
                  </div>

                  <div className="flex justify-end mb-16">
                    <div className="w-[340px]">
                      <div className="flex justify-between py-3 text-sm"><span className="text-[#5f6368]">Subtotal</span><span className="text-[#202124] font-medium">${formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between py-3 text-sm border-b-2 border-[#f1f3f4] mb-4"><span className="text-[#5f6368]">Tax (GST)</span><span className="text-[#202124] font-medium">${formatCurrency(totalGst)}</span></div>
                      <div className="flex justify-between items-center bg-[#f8fafd] p-6 rounded-2xl border-2 border-[#1a73e8]">
                        <span className="text-sm font-bold text-[#1a73e8] uppercase tracking-widest">Total Due</span>
                        <span className="text-3xl font-medium text-[#1a73e8]">${formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-8 border-t-2 border-[#f1f3f4]">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e8eaed]">
                        <p className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider mb-2">Instructions</p>
                        <p className="text-sm text-[#5f6368] whitespace-pre-line leading-relaxed">{state.paymentInstructions}</p>
                      </div>
                      {state.notes && (
                        <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e8eaed]">
                          <p className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider mb-2">Additional Notes</p>
                          <p className="text-sm text-[#5f6368] whitespace-pre-line leading-relaxed">{state.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {state.templateStyle === 'monochrome' && (
                <div className="font-sans text-black min-h-[1123px] flex flex-col border-[12px] border-black p-10 -mx-[60px] -my-[60px] bg-white">
                  <div className="flex justify-between items-end border-b-4 border-black pb-6 mb-10">
                    <h1 className="text-6xl font-black uppercase tracking-tighter">Invoice</h1>
                    <div className="text-right font-bold text-sm">

                      <p className="mt-1">DUE: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-12 mb-16">
                    <div>
                      <div className="bg-black text-white inline-block px-3 py-1 font-bold text-xs uppercase mb-4">From</div>
                      <p className="font-black text-xl mb-2 uppercase">{state.landlordName}</p>
                      <p className="text-sm font-medium whitespace-pre-line uppercase leading-relaxed">{state.landlordAddress}</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-black text-white inline-block px-3 py-1 font-bold text-xs uppercase mb-4">Bill To</div>
                      <p className="font-black text-xl mb-2 uppercase">{state.tenantName}</p>
                      <p className="text-sm font-medium whitespace-pre-line uppercase leading-relaxed">{state.tenantAddress}</p>
                    </div>
                  </div>

                  {renderItemsTable('transparent', '#000000', '#000000')}

                  <div className="flex justify-end mb-8 mt-8 border-t-4 border-black pt-6">
                    <div className="w-80">
                      <div className="flex justify-between text-base font-bold mb-3 uppercase"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between text-base font-bold mb-6 uppercase"><span>GST</span><span>${formatCurrency(totalGst)}</span></div>
                      <div className="flex justify-between text-3xl font-black uppercase bg-black text-white p-4"><span>Total</span><span>${formatCurrency(total)}</span></div>
                    </div>
                  </div>

                  <div className="mt-8 bg-gray-100 p-6 border-2 border-black mt-auto">
                    <p className="font-black text-sm uppercase mb-2">Instructions & Notes</p>
                    {state.notes && <p className="text-sm font-medium whitespace-pre-line uppercase mb-3">{state.notes}</p>}
                    <p className="text-sm font-medium whitespace-pre-line uppercase">{state.paymentInstructions}</p>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>

        {/* MOBILE PREVIEW PANEL */}
        <div className="md:hidden flex-[0_0_50%] min-w-0 min-h-0 flex flex-col bg-[#e2e8f0]/60">
            {/* Scrollable preview area - flex-1 min-h-0 so it scrolls within the fixed viewport */}
            <div className="flex-1 min-h-0 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div
                className="p-4 overflow-hidden transition-all duration-300"
                style={{ height: `${Math.round(contentHeight * mobileScale * zoomLevel) + 32}px`, width: `${Math.round(794 * mobileScale * zoomLevel) + 32}px` }}
              >
                <div
                  style={{
                    width: '794px',
                    height: `${contentHeight}px`,
                    transform: `scale(${mobileScale * zoomLevel})`,
                    transformOrigin: 'top left',
                    marginBottom: `${Math.round((mobileScale * zoomLevel - 1) * contentHeight)}px`,
                    marginRight: `${Math.round((mobileScale * zoomLevel - 1) * 794)}px`,
                    flexShrink: 0,
                    pointerEvents: 'none',
                  }}
                  className="bg-white shadow-2xl overflow-hidden transition-all duration-300"
                >
                  <div ref={mobilePreviewRef} className="w-[794px] min-h-min bg-white relative box-border" style={{ padding: '60px' }}>
                    
                    {state.templateStyle === 'classic' && (
                      <div className="font-sans text-[#162129] h-full flex flex-col">
                        <div className="flex justify-between items-start mb-16">
                          <h1 className="text-5xl font-bold text-[#0a1432] tracking-tight">INVOICE</h1>
                          <div className="bg-[#f8fafc] rounded-xl p-5 w-64">
                            <div className="flex justify-between mb-3 text-xs"><span className="text-[#646e82]">Invoice Date</span><span className="font-semibold text-[#0a1432]">{new Date(state.issueDate).toLocaleDateString('en-GB')}</span></div>
                            <div className="flex justify-between mb-4 text-xs"><span className="text-[#646e82]">Due Date</span><span className="font-semibold text-[#0a1432]">{new Date(state.dueDate).toLocaleDateString('en-GB')}</span></div>
                            <div className="border-t border-[#e2e8f0] pt-4"><span className="text-xs font-bold text-[#0a1432] block mb-1">Amount Due (AUD)</span><span className="text-3xl font-bold text-[#2962ff]">${formatCurrency(total)}</span></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-10 mb-16">
                          <div>
                            <h3 className="text-xs font-bold text-[#2962ff] mb-2 uppercase tracking-wide">From</h3>
                            <p className="font-bold text-sm text-[#0a1432] mb-1">{state.landlordName}</p>
                            {state.landlordAbn && <p className="text-xs text-[#646e82] mb-3">ABN {state.landlordAbn}</p>}
                            <p className="text-xs text-[#646e82] whitespace-pre-line mb-3">{state.landlordAddress}</p>
                          </div>
                          <div className="pl-10">
                            <h3 className="text-xs font-bold text-[#2962ff] mb-2 uppercase tracking-wide">Invoice sent to</h3>
                            <p className="font-bold text-sm text-[#0a1432] mb-1">{state.tenantName}</p>
                            {state.tenantAbn && <p className="text-xs text-[#646e82] mb-3">ABN {state.tenantAbn}</p>}
                            <p className="text-xs text-[#646e82] whitespace-pre-line">{state.tenantAddress}</p>
                          </div>
                        </div>
                        
                        {renderItemsTable('#f8fafc', '#646e82', '#2962ff', true)}
                        
                        <div className="flex justify-between items-start mb-12">
                          <div className="w-64"><div className="bg-[#f8fafc] rounded-xl p-4 mb-4"><span className="text-xs font-bold text-[#2962ff]">Due Date: <span className="text-[#0a1432]">{new Date(state.dueDate).toLocaleDateString('en-GB')}</span></span></div><p className="text-xs text-[#646e82] pl-2">{state.notes}</p></div>
                          <div className="w-72">
                            <div className="flex justify-between py-2 text-xs"><span className="text-[#0a1432]">Subtotal</span><span className="text-[#0a1432]">${formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between py-2 text-xs"><span className="text-[#0a1432]">GST</span><span className="text-[#0a1432]">${formatCurrency(totalGst)}</span></div>
                            <div className="flex justify-between py-4 mt-2 bg-[#f8fafc] rounded-lg px-4 items-center"><span className="text-xs font-bold text-[#2962ff]">TOTAL AMOUNT DUE</span><span className="text-lg font-bold text-[#2962ff]">${formatCurrency(total)}</span></div>
                          </div>
                        </div>
                        <div className="mt-8 bg-[#f8fafc] rounded-xl p-6"><h4 className="text-sm font-bold text-[#0a1432] mb-2">Payment Instructions</h4><p className="text-xs text-[#646e82] whitespace-pre-line">{state.paymentInstructions}</p></div>
                      </div>
                    )}

                    {state.templateStyle === 'modern' && (
                      <div className="font-sans text-[#162129] relative h-full flex flex-col">
                        <div className="absolute top-[-60px] bottom-[-60px] left-[-60px] w-4 bg-blue-500 z-10" />
                        <div className="bg-[#22333b] text-white p-12 -mx-[60px] -mt-[60px] mb-12 flex justify-between items-start pl-[60px]">
                          <div><h1 className="text-3xl font-black tracking-tight">{state.landlordName}</h1><p className="text-xs text-[#b4c8d2] mt-1 tracking-widest">PROPERTY MANAGEMENT</p></div>
                          <div className="text-right pr-[60px]"><h2 className="text-4xl font-black">INVOICE</h2></div>
                        </div>
                        <div className="grid grid-cols-3 gap-8 mb-12 pl-4">
                          <div><h3 className="text-[10px] font-bold text-[#647482] uppercase tracking-widest mb-3">From</h3><p className="font-bold text-sm text-[#162129] mb-1">{state.landlordName}</p><p className="text-xs text-[#647482] whitespace-pre-line">{state.landlordAddress}</p></div>
                          <div><h3 className="text-[10px] font-bold text-[#647482] uppercase tracking-widest mb-3">Bill To</h3><p className="font-bold text-sm text-[#162129] mb-1">{state.tenantName}</p><p className="text-xs text-[#647482] whitespace-pre-line">{state.tenantAddress}</p></div>
                          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-5 text-center"><p className="text-[10px] font-bold text-[#647482] uppercase tracking-widest mb-1">Due Date</p><p className="text-base font-bold text-[#162129] mb-3">{new Date(state.dueDate).toLocaleDateString('en-GB')}</p><p className="text-2xl font-black text-[#22333b]">${formatCurrency(total)}</p></div>
                        </div>
                        
                        <div className="pl-4">
                          {renderItemsTable('#22333b', '#ffffff', '#e2e8f0')}
                        </div>

                        <div className="flex justify-end mb-8 pl-4">
                          <div className="w-72">
                            <div className="flex justify-between py-2 text-sm"><span className="text-[#647482]">Subtotal</span><span className="text-[#162129]">${formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between py-2 text-sm border-b border-[#e2e8f0] mb-4 pb-4"><span className="text-[#647482]">GST</span><span className="text-[#162129]">${formatCurrency(totalGst)}</span></div>
                            <div className="flex justify-between items-center bg-[#22333b] text-white py-4 px-5 rounded-lg"><span className="text-sm font-bold uppercase tracking-widest">Total Due</span><span className="text-xl font-black">${formatCurrency(total)}</span></div>
                          </div>
                        </div>
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6 w-2/3 ml-4 mt-8">
                          <h4 className="text-[10px] font-bold text-[#22333b] uppercase tracking-widest mb-3">Instructions & Notes</h4>
                          {state.notes && <p className="text-xs text-[#647482] whitespace-pre-line leading-relaxed mb-3">{state.notes}</p>}
                          <p className="text-xs text-[#647482] whitespace-pre-line leading-relaxed">{state.paymentInstructions}</p>
                        </div>
                      </div>
                    )}

                    {state.templateStyle === 'minimalist' && (
                      <div className="font-sans text-black h-full flex flex-col">
                        <div className="flex justify-between items-end mb-16"><h1 className="text-4xl tracking-widest">INVOICE</h1><div className="text-right text-sm text-gray-500"><p>Due: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p></div></div>
                        <div className="mb-8"><p className="font-semibold text-sm mb-1">{state.landlordName}</p><p className="text-xs text-gray-500 whitespace-pre-line">{state.landlordAddress}</p></div>
                        <div className="border-t border-black pt-8 mb-16"><p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Bill To</p><p className="font-semibold text-sm mb-1">{state.tenantName}</p><p className="text-xs text-gray-500 whitespace-pre-line">{state.tenantAddress}</p></div>
                        
                        {renderItemsTable('transparent', '#000000', '#e5e7eb')}

                        <div className="flex justify-end mb-8 border-t border-gray-200 pt-8 mt-auto">
                          <div className="w-72 space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium">${formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">GST</span><span className="font-medium">${formatCurrency(totalGst)}</span></div>
                            <div className="flex justify-between text-xl font-black pt-4 border-t border-gray-200 text-black"><span>Total Due</span><span>${formatCurrency(total)}</span></div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-8 pt-6 border-t border-gray-100">
                          <p className="font-semibold text-black uppercase tracking-wider mb-2">Instructions & Notes</p>
                          {state.notes && <p className="whitespace-pre-line leading-relaxed mb-3">{state.notes}</p>}
                          <p className="whitespace-pre-line leading-relaxed">{state.paymentInstructions}</p>
                        </div>
                      </div>
                    )}

                    {state.templateStyle === 'corporate' && (
                      <div className="font-sans text-[#0f172a] h-full flex flex-col">
                        <div className="bg-[#0f172a] -mx-[60px] -mt-[60px] px-[60px] py-12 mb-10 text-white flex justify-between items-center">
                          <h1 className="text-4xl font-bold">INVOICE</h1>
                          <div className="text-right"><p className="text-sm opacity-60">Due: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-10 mb-12">
                          <div><h3 className="font-bold text-lg mb-2">{state.landlordName}</h3><p className="text-sm text-gray-500 whitespace-pre-line">{state.landlordAddress}</p></div>
                          <div className="text-right"><h3 className="font-bold text-sm text-gray-400 mb-2 uppercase">Bill To:</h3><p className="font-bold text-lg mb-2">{state.tenantName}</p><p className="text-sm text-gray-500 whitespace-pre-line">{state.tenantAddress}</p></div>
                        </div>
                        
                        {renderItemsTable('#f1f5f9', '#0f172a', '#e2e8f0')}

                        <div className="flex justify-end mb-8">
                          <div className="w-80">
                            <div className="flex justify-between text-sm mb-2 px-6"><span className="text-gray-500">Subtotal</span><span className="font-medium">${formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-sm mb-4 px-6"><span className="text-gray-500">GST</span><span className="font-medium">${formatCurrency(totalGst)}</span></div>
                            <div className="flex justify-between text-xl font-bold text-[#0f172a] bg-[#f1f5f9] p-6 rounded-lg"><span>Total Due</span><span>${formatCurrency(total)}</span></div>
                          </div>
                        </div>
                        <div className="mt-8 border-t border-gray-200 pt-8 mt-auto">
                          <h4 className="font-bold mb-2 text-sm uppercase tracking-wider">Instructions & Notes</h4>
                          {state.notes && <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{state.notes}</p>}
                          <p className="text-sm text-gray-600 whitespace-pre-line">{state.paymentInstructions}</p>
                        </div>
                      </div>
                    )}

                    {state.templateStyle === 'creative' && (
                      <div className="font-sans text-[#18181b] relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-[-150px] right-[-150px] w-96 h-96 bg-[#f97316] rounded-full opacity-[0.08]" />
                        <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 bg-[#fb923c] rounded-full opacity-[0.05]" />
                        <div className="relative z-10 flex-1 flex flex-col">
                          <h1 className="text-7xl font-black mb-2 tracking-tighter">INVOICE.</h1>

                          <div className="grid grid-cols-2 gap-10 mb-16">
                            <div><p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Invoice To</p><p className="font-bold text-2xl mb-2">{state.tenantName}</p><p className="text-sm text-gray-600 whitespace-pre-line">{state.tenantAddress}</p></div>
                            <div className="text-right"><p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">From</p><p className="font-bold text-xl mb-2">{state.landlordName}</p><p className="text-sm text-gray-600 whitespace-pre-line">{state.landlordAddress}</p><p className="text-sm font-bold text-[#f97316] mt-4">Due: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p></div>
                          </div>
                          
                          {renderItemsTable('transparent', '#f97316', '#f97316')}

                          <div className="flex justify-end mb-8">
                            <div className="w-72 text-right">
                              <div className="flex justify-between text-base mb-2"><span className="text-gray-500 font-medium">Subtotal</span><span className="font-bold">${formatCurrency(subtotal)}</span></div>
                              <div className="flex justify-between text-base mb-6"><span className="text-gray-500 font-medium">GST</span><span className="font-bold">${formatCurrency(totalGst)}</span></div>
                              <p className="text-xl font-black mb-1">TOTAL AMOUNT</p>
                              <p className="text-5xl font-black text-[#f97316]">${formatCurrency(total)}</p>
                            </div>
                          </div>
                          <div className="mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-auto">
                            <h4 className="font-bold mb-2 text-[#f97316]">Instructions & Notes</h4>
                            {state.notes && <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{state.notes}</p>}
                            <p className="text-sm text-gray-600 whitespace-pre-line">{state.paymentInstructions}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {state.templateStyle === 'elegant' && (
                      <div className="font-serif text-[#2d2d2d] h-full flex flex-col">
                        <h1 className="text-5xl text-center mb-6 tracking-[0.2em]">INVOICE</h1>
                        <div className="w-24 h-px bg-[#c0a060] mx-auto mb-8" />

                        <p className="text-center text-sm font-bold text-[#c0a060] mb-16">Due Date: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p>
                        
                        <div className="grid grid-cols-2 gap-10 mb-16 text-center">
                          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">From</p><p className="font-bold text-xl mb-3">{state.landlordName}</p><p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{state.landlordAddress}</p></div>
                          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">To</p><p className="font-bold text-xl mb-3">{state.tenantName}</p><p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{state.tenantAddress}</p></div>
                        </div>
                        
                        {renderItemsTable('transparent', '#c0a060', '#c0a060')}

                        <div className="flex justify-end mb-8">
                          <div className="w-80 border-t border-[#c0a060] pt-6">
                            <div className="flex justify-between text-sm mb-3"><span className="text-gray-500 italic">Subtotal</span><span className="font-bold">${formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-sm mb-6"><span className="text-gray-500 italic">GST</span><span className="font-bold">${formatCurrency(totalGst)}</span></div>
                            <div className="flex justify-between text-2xl font-bold"><span>Total Due</span><span className="text-[#c0a060]">${formatCurrency(total)}</span></div>
                          </div>
                        </div>
                        <div className="mt-8 border-t border-[#c0a060] pt-8 text-center mt-auto">
                          <h4 className="text-xs font-bold text-[#c0a060] uppercase tracking-[0.2em] mb-3">Notes & Instructions</h4>
                          {state.notes && <p className="text-sm text-gray-600 whitespace-pre-line italic mb-3">{state.notes}</p>}
                          <p className="text-sm text-gray-600 whitespace-pre-line italic">{state.paymentInstructions}</p>
                        </div>
                      </div>
                    )}

                    {state.templateStyle === 'google' && (
                      <div className="font-sans text-[#202124] h-full flex flex-col bg-white -mx-[60px] -my-[60px] px-[80px] py-[80px] border-[8px] border-[#f8f9fa]">
                        <div className="flex justify-between items-start mb-16 pb-8 border-b-2 border-[#f1f3f4]">
                          <div className="flex items-center gap-5">
                            <div className="flex flex-col gap-1 pr-5 border-r-2 border-[#f1f3f4]">
                              <div className="flex gap-1">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#ea4335]"></div>
                                <div className="w-3.5 h-3.5 rounded-full bg-[#4285f4]"></div>
                              </div>
                              <div className="flex gap-1">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#fbbc04]"></div>
                                <div className="w-3.5 h-3.5 rounded-full bg-[#34a853]"></div>
                              </div>
                            </div>
                            <div>
                              <h1 className="text-3xl font-medium text-[#202124] tracking-tight">{state.landlordName}</h1>
                              <p className="text-sm text-[#5f6368] whitespace-pre-line mt-1.5">{state.landlordAddress}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <h2 className="text-3xl font-normal text-[#1a73e8] tracking-tight mb-2">INVOICE</h2>

                          </div>
                        </div>

                        <div className="flex gap-10 mb-16">
                          <div className="flex-1 bg-[#f8fafd] rounded-2xl p-6 border border-[#e8eaed]">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-4 h-4 text-[#1a73e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                              <p className="text-[11px] font-bold text-[#1a73e8] uppercase tracking-wider">Billed To</p>
                            </div>
                            <p className="text-xl font-medium text-[#202124] mb-2">{state.tenantName}</p>
                            <p className="text-sm text-[#5f6368] whitespace-pre-line leading-relaxed max-w-md">{state.tenantAddress}</p>
                          </div>
                          
                          <div className="w-[300px] flex flex-col gap-4">
                            <div className="flex justify-between items-center bg-[#f8f9fa] rounded-xl p-4 border border-[#e8eaed]">
                              <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wider">Issue Date</p>
                              <p className="text-sm font-medium text-[#202124]">{new Date(state.issueDate).toLocaleDateString('en-GB')}</p>
                            </div>
                            <div className="flex justify-between items-center bg-[#fce8e6] rounded-xl p-4 border border-[#fad2cf]">
                              <p className="text-xs font-bold text-[#d93025] uppercase tracking-wider">Due Date</p>
                              <p className="text-sm font-bold text-[#d93025]">{new Date(state.dueDate).toLocaleDateString('en-GB')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-10 rounded-2xl overflow-hidden border border-[#e8eaed]">
                          {renderItemsTable('#f8f9fa', '#202124', '#e8eaed', false, '#ffffff')}
                        </div>

                        <div className="flex justify-end mb-16">
                          <div className="w-[340px]">
                            <div className="flex justify-between py-3 text-sm"><span className="text-[#5f6368]">Subtotal</span><span className="text-[#202124] font-medium">${formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between py-3 text-sm border-b-2 border-[#f1f3f4] mb-4"><span className="text-[#5f6368]">Tax (GST)</span><span className="text-[#202124] font-medium">${formatCurrency(totalGst)}</span></div>
                            <div className="flex justify-between items-center bg-[#f8fafd] p-6 rounded-2xl border-2 border-[#1a73e8]">
                              <span className="text-sm font-bold text-[#1a73e8] uppercase tracking-widest">Total Due</span>
                              <span className="text-3xl font-medium text-[#1a73e8]">${formatCurrency(total)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-8 border-t-2 border-[#f1f3f4]">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e8eaed]">
                              <p className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider mb-2">Instructions</p>
                              <p className="text-sm text-[#5f6368] whitespace-pre-line leading-relaxed">{state.paymentInstructions}</p>
                            </div>
                            {state.notes && (
                              <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e8eaed]">
                                <p className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider mb-2">Additional Notes</p>
                                <p className="text-sm text-[#5f6368] whitespace-pre-line leading-relaxed">{state.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {state.templateStyle === 'monochrome' && (
                      <div className="font-mono text-black h-full flex flex-col bg-white">
                        <div className="border-4 border-black p-8 mb-8 mt-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex justify-between items-start">
                          <div>
                            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-2">INVOICE</h1>

                          </div>
                          <div className="text-right border-l-4 border-black pl-8">
                            <p className="font-bold uppercase text-sm mb-1">Issue Date: {new Date(state.issueDate).toLocaleDateString('en-GB')}</p>
                            <p className="font-bold uppercase text-sm bg-black text-white px-2 py-1 inline-block mt-2">Due: {new Date(state.dueDate).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                          <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="font-black text-sm uppercase mb-2 bg-black text-white inline-block px-1">From</p>
                            <p className="font-bold text-lg leading-tight mb-1">{state.landlordName}</p>
                            <p className="text-sm font-medium whitespace-pre-line">{state.landlordAddress}</p>
                          </div>
                          <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-50">
                            <p className="font-black text-sm uppercase mb-2 bg-black text-white inline-block px-1">Bill To</p>
                            <p className="font-bold text-lg leading-tight mb-1">{state.tenantName}</p>
                            <p className="text-sm font-medium whitespace-pre-line">{state.tenantAddress}</p>
                          </div>
                        </div>

                        {/* Brutalist Custom Table */}
                        <div className="mb-8 w-full border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex text-sm font-black uppercase bg-black text-white py-3 px-4">
                            <div className="flex-1">Description</div>
                            <div className="w-32 text-right">Rate</div>
                            <div className="w-24 text-center">GST</div>
                            <div className="w-32 text-right">Amount</div>
                          </div>
                          <div>
                            {state.items.map((item, i) => (
                              <div key={i} className="flex text-sm py-4 px-4 border-t-2 border-black font-medium hover:bg-yellow-100 transition-colors">
                                <div className="flex-1 font-bold">{item.description}</div>
                                <div className="w-32 text-right">${formatCurrency(item.rate)}</div>
                                <div className="w-24 text-center border-x-2 border-black px-2 mx-2">{item.gst}%</div>
                                <div className="w-32 text-right font-black">${formatCurrency(item.rate * (1 + item.gst / 100))}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end mb-8 mt-8 border-t-4 border-black pt-6">
                          <div className="w-80">
                            <div className="flex justify-between text-base font-bold mb-3 uppercase"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-base font-bold mb-6 uppercase"><span>GST</span><span>${formatCurrency(totalGst)}</span></div>
                            <div className="flex justify-between text-3xl font-black uppercase bg-black text-white p-4"><span>Total</span><span>${formatCurrency(total)}</span></div>
                          </div>
                        </div>

                        <div className="mt-8 bg-gray-100 p-6 border-2 border-black mt-auto">
                          <p className="font-black text-sm uppercase mb-2">Instructions & Notes</p>
                          {state.notes && <p className="text-sm font-medium whitespace-pre-line uppercase mb-3">{state.notes}</p>}
                          <p className="text-sm font-medium whitespace-pre-line uppercase">{state.paymentInstructions}</p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
            {/* Zoom controls + Download */}
            <div className="p-3 bg-white border-t border-gray-200 flex flex-col gap-2">
              {/* Zoom row */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-200">
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zoom</Typography>
                <div className="flex items-center gap-2">
                  <IconButton
                    size="small"
                    onClick={() => setZoomLevel(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
                    disabled={zoomLevel <= 0.5}
                    sx={{ bgcolor: 'white', border: 1, borderColor: 'divider', width: 32, height: 32 }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>−</span>
                  </IconButton>
                  <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'center', fontSize: '0.85rem' }}>
                    {Math.round(mobileScale * zoomLevel * 100)}%
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setZoomLevel(z => Math.min(3, parseFloat((z + 0.25).toFixed(2))))}
                    disabled={zoomLevel >= 3}
                    sx={{ bgcolor: 'white', border: 1, borderColor: 'divider', width: 32, height: 32 }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>+</span>
                  </IconButton>
                  <Button
                    size="small"
                    onClick={() => setZoomLevel(1)}
                    sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', minWidth: 'auto', px: 1, py: 0.5 }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              {/* Download button */}
              <Button
                variant="contained"
                fullWidth
                disableElevation
                startIcon={<Download size={20} />}
                onClick={handleGenerateAndSave}
                disabled={isSaving}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 800, fontSize: '0.9rem' }}
              >
                {isSaving ? 'Generating...' : isBulk ? 'Generate Bulk Invoices' : 'Save as PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION ── matches site DashboardLayout style ── */}
      <div className="md:hidden flex-shrink-0 flex items-center bg-surface/80 backdrop-blur-xl border-t border-outline-variant/40 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
        {/* Edit tab */}
        <button
          onClick={() => setMobileTab('edit')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 font-bold text-xs transition-all ${
            mobileTab === 'edit'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className={`flex items-center justify-center w-14 h-8 rounded-2xl transition-all ${
            mobileTab === 'edit' ? 'bg-primary/10' : ''
          }`}>
            <PenTool size={18} />
          </div>
          <span className={`text-[11px] tracking-wide ${mobileTab === 'edit' ? 'font-extrabold' : 'font-semibold'}`}>Edit</span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-outline-variant/40" />

        {/* Preview tab */}
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 font-bold text-xs transition-all ${
            mobileTab === 'preview'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className={`flex items-center justify-center w-14 h-8 rounded-2xl transition-all ${
            mobileTab === 'preview' ? 'bg-primary/10' : ''
          }`}>
            <Download size={18} />
          </div>
          <span className={`text-[11px] tracking-wide ${mobileTab === 'preview' ? 'font-extrabold' : 'font-semibold'}`}>Preview</span>
        </button>
      </div>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, display: 'flex', flexDirection: 'column', gap: 2 }}
        open={isSaving}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6">Generating High-Quality PDF...</Typography>
      </Backdrop>
    </motion.div>,
    document.body
  );
}
