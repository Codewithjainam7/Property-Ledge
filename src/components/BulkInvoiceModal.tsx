import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Layers, X, ChevronLeft, Building, Calendar, DollarSign,
  CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Property {
  id: string;
  address: string;
  rent_amount?: number;
  tenant_name?: string;
  tenant_email?: string;
}

interface BulkInvoiceModalProps {
  onClose: () => void;
  onOpenSingle: () => void;
  properties: Property[];
  onSuccess: () => void;
}

type Screen = 'mode' | 'config' | 'generating' | 'done';

interface BulkConfig {
  propertyId: string;
  startMonth: string; // YYYY-MM
  monthCount: number | '';
  amountPerMonth: number | '';
  description: string;
  dueDays: number | '';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const addMonths = (dateStr: string, n: number): string => {
  const [year, month] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (dateStr: string): string => {
  const [year, month] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('en-AU', { month: 'long', year: 'numeric' });
};

const toIsoDate = (yearMonth: string, day = 1): string => {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toISOString().split('T')[0];
};

const addDaysToDate = (isoDate: string, days: number): string => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getTodayMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function BulkInvoiceModal({ onClose, onOpenSingle, properties, onSuccess }: BulkInvoiceModalProps) {
  const { user } = useAuth() as any;
  const [screen, setScreen] = useState<Screen>('mode');

  const [config, setConfig] = useState<BulkConfig>({
    propertyId: '',
    startMonth: getTodayMonth(),
    monthCount: 12,
    amountPerMonth: 0,
    description: 'Rent Payment',
    dueDays: 7,
  });

  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  // Auto-fill amount when property changes
  useEffect(() => {
    if (!config.propertyId) return;
    const prop = properties.find(p => p.id === config.propertyId);
    if (prop?.rent_amount) {
      setConfig(prev => ({
        ...prev,
        amountPerMonth: Number(prop.rent_amount),
        description: `Rent Payment — ${prop.address}`,
      }));
    }
  }, [config.propertyId]);

  // Preview: last month of the batch
  const endMonth = addMonths(config.startMonth, typeof config.monthCount === 'number' ? Math.max(1, config.monthCount) - 1 : 0);
  const selectedProp = properties.find(p => p.id === config.propertyId);
  const totalValue = (typeof config.amountPerMonth === 'number' ? config.amountPerMonth : 0) * (typeof config.monthCount === 'number' ? config.monthCount : 0);

  const isConfigValid =
    config.propertyId &&
    typeof config.monthCount === 'number' && config.monthCount >= 1 &&
    typeof config.amountPerMonth === 'number' && config.amountPerMonth > 0 &&
    typeof config.dueDays === 'number' && config.dueDays >= 1 &&
    config.startMonth;

  // ─── Bulk Generate Logic ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!isConfigValid || !user) return;
    setScreen('generating');
    setError(null);
    setProgress({ current: 0, total: config.monthCount as number, label: 'Preparing...' });

    try {
      const prop = properties.find(p => p.id === config.propertyId);

      // Fetch active lease for this property
      const { data: lease } = await supabase
        .from('leases')
        .select('id, tenant_id')
        .eq('property_id', config.propertyId)
        .eq('status', 'Active')
        .maybeSingle();

      // Fetch tenant details
      let tenantName = prop?.tenant_name || 'Tenant';
      let tenantEmail = prop?.tenant_email || '';

      if (lease?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('first_name, last_name, email')
          .eq('id', lease.tenant_id)
          .maybeSingle();
        if (tenant) {
          tenantName = `${tenant.first_name} ${tenant.last_name}`.trim();
          tenantEmail = tenant.email || '';
        }
      }

      let successCount = 0;

      for (let i = 0; i < (config.monthCount as number); i++) {
        const monthStr = addMonths(config.startMonth, i);
        const label = monthLabel(monthStr);
        setProgress({ current: i + 1, total: config.monthCount as number, label: `Creating invoice for ${label}...` });

        const issueDate = toIsoDate(monthStr, 1);
        const dueDaysVal = typeof config.dueDays === 'number' ? config.dueDays : 7;
        const dueDate = addDaysToDate(issueDate, dueDaysVal);

        // Build invoice number: INV-[PROP_PREFIX]-[MM]-[YYYY]
        const [yr, mo] = monthStr.split('-');
        const propPrefix = config.propertyId.split('-')[0].toUpperCase();
        const invoiceNumber = `INV-${propPrefix}-${mo}-${yr}`;

        const invoicePayload = {
          user_id: user.id,
          property_id: config.propertyId,
          lease_id: lease?.id || null,
          invoice_number: invoiceNumber,
          total_amount: config.amountPerMonth as number,
          issue_date: issueDate,
          due_date: dueDate,
          status: 'Draft',
          property_address: prop?.address || '',
          tenant_name: tenantName,
          tenant_email: tenantEmail,
          notes: `${config.description} — ${label}`,
          billing_period_start: issueDate,
          billing_period_end: dueDate,
          late_fee_applied: false,
        };

        const { data: newInvoice, error: invErr } = await supabase
          .from('invoices')
          .insert(invoicePayload)
          .select()
          .single();

        if (invErr) {
          console.error(`Failed to insert invoice for ${label}:`, invErr);
          continue; // Skip but keep going
        }

        // Sync to payments ledger
        if (newInvoice) {
          await supabase.from('payments').insert({
            property_id: config.propertyId,
            lease_id: lease?.id || null,
            invoice_id: newInvoice.id,
            amount_due: config.amountPerMonth as number,
            due_date: dueDate,
            status: 'Pending',
            payment_type: 'Rent',
          });
        }

        successCount++;
        // Small delay to avoid hammering Supabase rate limits
        await new Promise(r => setTimeout(r, 120));
      }

      setCreatedCount(successCount);
      setScreen('done');
    } catch (err: any) {
      setError(err.message || 'Unexpected error occurred');
      setScreen('config');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return createPortal(
    <AnimatePresence>
      <motion.div
        key="bulk-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(10, 9, 8, 0.55)', backdropFilter: 'blur(12px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full sm:max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.25)] overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ maxHeight: '92vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-black/10" />
          </div>

          {/* ── SCREEN: Mode Picker ── */}
          {screen === 'mode' && (
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[16px] bg-primary/10 flex items-center justify-center border border-primary/15">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#1c1c28] leading-none tracking-tight">Generate Invoice</h2>
                    <p className="text-xs font-bold text-[#4a4a5e] mt-0.5 uppercase tracking-widest">Choose Mode</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-[#4a4a5e]" />
                </button>
              </div>

              {/* Mode Cards */}
              <div className="grid grid-cols-1 gap-4">
                {/* Single */}
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { onClose(); onOpenSingle(); }}
                  className="group relative w-full text-left bg-gradient-to-br from-[#f8faf9] to-white border-2 border-outline-variant/30 rounded-[28px] p-6 hover:border-primary/30 hover:shadow-[0_12px_32px_rgba(34,51,59,0.1)] transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-[20px] bg-primary/8 border border-primary/12 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
                      <FileText className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-black text-[#1c1c28] tracking-tight">Single Invoice</h3>
                        <ArrowRight className="w-4 h-4 text-[#a9927d] group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-[#4a4a5e] font-medium leading-relaxed">
                        Open the Invoice Architect to design and customise one invoice with full template control.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 bg-primary/6 text-primary text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        <FileText className="w-3 h-3" />
                        1 Invoice
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* Bulk */}
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setScreen('config')}
                  className="group relative w-full text-left bg-gradient-to-br from-[#22333b]/5 to-[#a9927d]/5 border-2 border-[#22333b]/15 rounded-[28px] p-6 hover:border-[#22333b]/35 hover:shadow-[0_12px_32px_rgba(34,51,59,0.12)] transition-all duration-300"
                >
                  {/* Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#a9927d]/10 rounded-full blur-[40px] pointer-events-none" />
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-[20px] bg-[#22333b]/10 border border-[#22333b]/15 flex items-center justify-center shrink-0 group-hover:bg-[#22333b]/15 transition-colors">
                      <Layers className="w-7 h-7 text-[#22333b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-black text-[#1c1c28] tracking-tight">Bulk Generation</h3>
                        <ArrowRight className="w-4 h-4 text-[#a9927d] group-hover:text-[#22333b] group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-[#4a4a5e] font-medium leading-relaxed">
                        Auto-generate up to 24 monthly invoices at once, spaced 1 month apart — perfect for new leases.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-[#22333b]/8 text-[#22333b] text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                          <Layers className="w-3 h-3" />
                          Up to 24 invoices
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-[#a9927d]/12 text-[#5e503f] text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          1 Year+
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          )}

          {/* ── SCREEN: Bulk Config ── */}
          {screen === 'config' && (
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setScreen('mode')}
                    className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#4a4a5e]" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-[#1c1c28] leading-none tracking-tight">Bulk Generation</h2>
                    <p className="text-xs font-bold text-[#a9927d] mt-0.5 uppercase tracking-widest">Configure Options</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-[#4a4a5e]" />
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-[16px] p-4 mb-5">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                {/* Property */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-[#4a4a5e] uppercase tracking-widest mb-2">
                    <Building className="w-3.5 h-3.5 text-primary" />
                    Property
                  </label>
                  <div className="relative">
                    <select
                      value={config.propertyId}
                      onChange={e => setConfig(prev => ({ ...prev, propertyId: e.target.value }))}
                      className="w-full appearance-none bg-[#f8faf9] border-2 border-outline-variant/30 rounded-[16px] px-4 py-3 pr-10 font-semibold text-sm text-[#1c1c28] outline-none focus:border-primary focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="">Select a property...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-4 h-4 text-[#a9927d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {/* Start Month */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-[#4a4a5e] uppercase tracking-widest mb-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Start Month
                  </label>
                  <input
                    type="month"
                    value={config.startMonth}
                    onChange={e => setConfig(prev => ({ ...prev, startMonth: e.target.value }))}
                    className="w-full bg-[#f8faf9] border-2 border-outline-variant/30 rounded-[16px] px-4 py-3 font-semibold text-sm text-[#1c1c28] outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>

                {/* Month Count & Due Days — side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-[#4a4a5e] uppercase tracking-widest mb-2">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      No. of Months
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={config.monthCount}
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => ({ ...prev, monthCount: val === '' ? '' : parseInt(val) }));
                      }}
                      onBlur={() => {
                        if (typeof config.monthCount !== 'number') setConfig(prev => ({ ...prev, monthCount: 1 }));
                        else if (config.monthCount < 1) setConfig(prev => ({ ...prev, monthCount: 1 }));
                        else if (config.monthCount > 24) setConfig(prev => ({ ...prev, monthCount: 24 }));
                      }}
                      className="w-full bg-[#f8faf9] border-2 border-outline-variant/30 rounded-[16px] px-4 py-3 font-bold text-sm text-[#1c1c28] outline-none focus:border-primary focus:bg-white transition-all"
                    />
                    <p className="text-[11px] text-[#a9927d] font-bold mt-1.5 pl-1">Max 24 months</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-[#4a4a5e] uppercase tracking-widest mb-2">
                      <Calendar className="w-3.5 h-3.5 text-[#a9927d]" />
                      Due in (days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={config.dueDays}
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => ({ ...prev, dueDays: val === '' ? '' : parseInt(val) }));
                      }}
                      onBlur={() => {
                        if (typeof config.dueDays !== 'number') setConfig(prev => ({ ...prev, dueDays: 7 }));
                        else if (config.dueDays < 1) setConfig(prev => ({ ...prev, dueDays: 1 }));
                        else if (config.dueDays > 60) setConfig(prev => ({ ...prev, dueDays: 60 }));
                      }}
                      className="w-full bg-[#f8faf9] border-2 border-outline-variant/30 rounded-[16px] px-4 py-3 font-bold text-sm text-[#1c1c28] outline-none focus:border-primary focus:bg-white transition-all"
                    />
                    <p className="text-[11px] text-[#a9927d] font-bold mt-1.5 pl-1">After issue date</p>
                  </div>
                </div>

                {/* Amount per month */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-[#4a4a5e] uppercase tracking-widest mb-2">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    Amount Per Month (AUD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#a9927d]">$</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={config.amountPerMonth}
                      placeholder="0.00"
                      onChange={e => {
                        const val = e.target.value;
                        setConfig(prev => ({ ...prev, amountPerMonth: val === '' ? '' : parseFloat(val) }));
                      }}
                      onBlur={() => {
                        if (typeof config.amountPerMonth !== 'number') setConfig(prev => ({ ...prev, amountPerMonth: 0 }));
                        else if (config.amountPerMonth < 0) setConfig(prev => ({ ...prev, amountPerMonth: 0 }));
                      }}
                      className="w-full bg-[#f8faf9] border-2 border-outline-variant/30 rounded-[16px] pl-8 pr-4 py-3 font-bold text-sm text-[#1c1c28] outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-black text-[#4a4a5e] uppercase tracking-widest mb-2 block">Description</label>
                  <input
                    type="text"
                    value={config.description}
                    onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Rent Payment"
                    className="w-full bg-[#f8faf9] border-2 border-outline-variant/30 rounded-[16px] px-4 py-3 font-semibold text-sm text-[#1c1c28] outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* ── Live Summary Preview ── */}
              {isConfigValid && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-gradient-to-br from-[#22333b]/5 via-[#a9927d]/5 to-transparent border border-[#22333b]/15 rounded-[24px] p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#a9927d]" />
                    <span className="text-xs font-black text-[#22333b] uppercase tracking-widest">Generation Summary</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/70 rounded-[14px] p-3">
                      <div className="text-[10px] font-black text-[#a9927d] uppercase tracking-widest mb-1">Invoices</div>
                      <div className="text-2xl font-black text-[#22333b]">{config.monthCount}</div>
                    </div>
                    <div className="bg-white/70 rounded-[14px] p-3">
                      <div className="text-[10px] font-black text-[#a9927d] uppercase tracking-widest mb-1">Total Value</div>
                      <div className="text-2xl font-black text-[#22333b]">
                        ${totalValue.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="bg-white/70 rounded-[14px] p-3 col-span-2">
                      <div className="text-[10px] font-black text-[#a9927d] uppercase tracking-widest mb-1">Period</div>
                      <div className="text-sm font-bold text-[#22333b]">
                        {monthLabel(config.startMonth)} → {monthLabel(endMonth)}
                      </div>
                      {selectedProp && (
                        <div className="text-xs text-[#4a4a5e] font-semibold mt-0.5 truncate">{selectedProp.address}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!isConfigValid}
                className="mt-6 w-full h-14 rounded-[18px] bg-[#22333b] text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-[0_8px_24px_-6px_rgba(34,51,59,0.45)] hover:bg-[#111a1e] hover:shadow-[0_12px_28px_-6px_rgba(34,51,59,0.55)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Layers className="w-4 h-4" />
                Generate {typeof config.monthCount === 'number' && config.monthCount > 0 ? `${config.monthCount} ` : ''}Invoice{config.monthCount !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* ── SCREEN: Generating (Progress) ── */}
          {screen === 'generating' && (
            <div className="p-10 flex flex-col items-center text-center">
              {/* Animated Rings */}
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-[#22333b]/10" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#22333b] animate-spin"
                  style={{ animationDuration: '0.8s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layers className="w-8 h-8 text-[#22333b]" />
                </div>
              </div>

              <h3 className="text-xl font-black text-[#1c1c28] tracking-tight mb-2">Generating Invoices</h3>
              <p className="text-sm font-semibold text-[#4a4a5e] mb-8">{progress.label}</p>

              {/* Progress Bar */}
              <div className="w-full bg-[#f2f4f3] rounded-full h-2.5 mb-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#22333b] to-[#a9927d]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-sm font-black text-[#22333b]">
                {progress.current} / {progress.total}
              </p>
              <p className="text-xs text-[#a9927d] font-semibold mt-2">Please don't close this window…</p>
            </div>
          )}

          {/* ── SCREEN: Done ── */}
          {screen === 'done' && (
            <div className="p-10 flex flex-col items-center text-center">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-7"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </motion.div>

              <h3 className="text-2xl font-black text-[#1c1c28] tracking-tight mb-2">
                {createdCount} Invoice{createdCount !== 1 ? 's' : ''} Created!
              </h3>
              <p className="text-sm font-semibold text-[#4a4a5e] mb-3 max-w-xs">
                {monthLabel(config.startMonth)} → {monthLabel(endMonth)}
              </p>
              {selectedProp && (
                <div className="inline-flex items-center gap-2 bg-[#22333b]/6 text-[#22333b] text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-8">
                  <Building className="w-3.5 h-3.5" />
                  {selectedProp.address}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 w-full mb-8">
                <div className="bg-[#f8faf9] rounded-[20px] p-4 border border-outline-variant/20">
                  <div className="text-[10px] font-black text-[#a9927d] uppercase tracking-widest mb-1.5">Total Value</div>
                  <div className="text-xl font-black text-[#22333b]">
                    ${(Number(config.amountPerMonth) * createdCount).toLocaleString('en-AU')}
                  </div>
                </div>
                <div className="bg-[#f8faf9] rounded-[20px] p-4 border border-outline-variant/20">
                  <div className="text-[10px] font-black text-[#a9927d] uppercase tracking-widest mb-1.5">Per Month</div>
                  <div className="text-xl font-black text-[#22333b]">
                    ${Number(config.amountPerMonth).toLocaleString('en-AU')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="w-full h-14 rounded-[18px] bg-[#22333b] text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-[0_8px_24px_-6px_rgba(34,51,59,0.4)] hover:bg-[#111a1e] transition-all duration-300"
              >
                <CheckCircle2 className="w-4 h-4" />
                View All Invoices
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
