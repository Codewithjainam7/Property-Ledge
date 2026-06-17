import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, ChevronDown, PenTool } from 'lucide-react';
import { Typography, Button, TextField, Select, MenuItem, FormControl, Box, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '../utils/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LeaseState {
  propertyId: string;
  propertyAddress: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;
  
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  
  startDate: string;
  endDate: string;
  rentAmount: number;
  paymentFrequency: string;
  bondAmount: number;
  
  specialTerms: string;
}

const getInitialState = (user: any): LeaseState => {
  const d = new Date();
  const startDate = d.toISOString().split('T')[0];
  d.setFullYear(d.getFullYear() + 1);
  const endDate = d.toISOString().split('T')[0];

  return {
    propertyId: '',
    propertyAddress: '',
    landlordName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Landlord Name',
    landlordEmail: user?.email || '',
    landlordPhone: '',
    
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    
    startDate,
    endDate,
    rentAmount: 0,
    paymentFrequency: 'Weekly',
    bondAmount: 0,
    
    specialTerms: '1. The Tenant must maintain the premises in a reasonable state of cleanliness.\n2. The Tenant must not cause or permit a nuisance.\n3. The Tenant must notify the Landlord of any damage or required repairs as soon as practicable.'
  };
};

export function LeaseGenerator({ onClose, onSave, properties = [], initialLease = null }: { onClose: () => void, onSave?: () => void, properties?: any[], initialLease?: any }) {
  const { user } = useAuth();
  const isEditMode = !!initialLease;
  const [state, setState] = useState<LeaseState>(() => {
    if (initialLease) {
      // Pre-fill state from existing lease record
      const prop = properties.find(p => p.id === initialLease.property_id);
      return {
        propertyId: initialLease.property_id || '',
        propertyAddress: prop ? `${prop.address}${prop.suburb ? `, ${prop.suburb}` : ''}` : '',
        landlordName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        landlordEmail: user?.email || '',
        landlordPhone: '',
        tenantName: initialLease.tenant_name || '',
        tenantEmail: initialLease.tenant_email || '',
        tenantPhone: '',
        startDate: initialLease.start_date || '',
        endDate: initialLease.end_date || '',
        rentAmount: Number(initialLease.rent_amount) || 0,
        paymentFrequency: initialLease.payment_frequency || 'Weekly',
        bondAmount: Number(initialLease.bond_amount) || 0,
        specialTerms: initialLease.special_terms || '1. The Tenant must maintain the premises in a reasonable state of cleanliness.\n2. The Tenant must not cause or permit a nuisance.\n3. The Tenant must notify the Landlord of any damage or required repairs as soon as practicable.',
      };
    }
    return getInitialState(user);
  });
  const [isSaving, setIsSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const previewRef = useRef<HTMLDivElement>(null);
  
  const handlePropertyChange = async (propertyId: string) => {
    if (!propertyId || propertyId === 'none') {
      setState(prev => ({ ...prev, propertyId: '', propertyAddress: '' }));
      return;
    }
    const prop = properties.find(p => p.id === propertyId);
    if (prop) {
      let newEndDate = state.endDate;
      if (prop.lease_start && prop.lease_duration) {
        const d = new Date(prop.lease_start);
        d.setMonth(d.getMonth() + parseInt(prop.lease_duration));
        newEndDate = d.toISOString().split('T')[0];
      }

      setState(prev => ({
        ...prev,
        propertyId: prop.id,
        propertyAddress: `${prop.address}${prop.suburb ? `, ${prop.suburb}` : ''}`,
        rentAmount: Number(prop.rent_amount) || 0,
        bondAmount: (Number(prop.rent_amount) || 0) * 4, // Standard 4 weeks rent bond in AU
        tenantName: prop.tenant_name || prev.tenantName,
        tenantEmail: prop.tenant_email || prev.tenantEmail,
        startDate: prop.lease_start || prev.startDate,
        endDate: newEndDate
      }));

      // Try to fetch accepted applicant details if no tenant is set
      try {
        const { data: enq } = await supabase
          .from('property_enquiries')
          .select('first_name, last_name, email, phone')
          .eq('property_id', prop.id)
          .eq('status', 'Accepted')
          .limit(1)
          .single();
          
        if (enq) {
          setState(prev => ({ 
            ...prev, 
            tenantName: `${enq.first_name} ${enq.last_name}`.trim(),
            tenantEmail: enq.email,
            tenantPhone: enq.phone || ''
          }));
        }
      } catch (e) {
        // Ignore error if no accepted enquiry
      }
    }
  };

  const updateState = (key: keyof LeaseState, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: `Residential_Tenancy_Agreement_${state.propertyAddress?.replace(/[^a-zA-Z0-9]/g, '_')}`,
    onAfterPrint: () => {
      onClose();
    }
  });

  const handleGenerateAndSave = async () => {
    if (!state.propertyId) {
      alert("Please select a property first.");
      return;
    }
    
    setIsSaving(true);
    try {
      let leaseError;
      if (isEditMode && initialLease?.id) {
        // UPDATE existing lease
        const { error } = await supabase.from('leases').update({
          start_date: state.startDate,
          end_date: state.endDate || null,
          rent_amount: state.rentAmount,
          bond_amount: state.bondAmount,
          payment_frequency: state.paymentFrequency,
          status: 'Active'
        }).eq('id', initialLease.id);
        leaseError = error;
      } else {
        // INSERT new lease
        const { error } = await supabase.from('leases').insert({
          property_id: state.propertyId,
          created_by: user?.id,
          start_date: state.startDate,
          end_date: state.endDate || null,
          rent_amount: state.rentAmount,
          bond_amount: state.bondAmount,
          payment_frequency: state.paymentFrequency,
          status: 'Active'
        });
        leaseError = error;
      }

      if (leaseError) throw leaseError;

      // Force a dashboard refresh immediately
      if (onSave) onSave();

      // Trigger the print/PDF download
      handlePrint();
    } catch (e: any) {
      console.error('Error saving lease:', e);
      alert('Failed to save lease. Error: ' + (e?.message || 'Unknown'));
    } finally {
      setIsSaving(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="md:hidden flex items-center gap-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-2xl px-3 py-2 font-bold text-sm transition-all"
          >
            <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
            Back
          </button>
          <div className="hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <PenTool size={16} className="text-primary" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-on-surface">Lease Generator (AU)</span>
          </div>
        </div>

        <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center bg-surface-container-low rounded-lg p-0.5 border border-outline-variant/30">
          <button 
            onClick={() => setMobileTab('edit')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mobileTab === 'edit' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant'}`}
          >
            Edit
          </button>
          <button 
            onClick={() => setMobileTab('preview')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${mobileTab === 'preview' ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant'}`}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="hidden md:flex items-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-2xl px-4 py-2 font-bold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateAndSave}
            disabled={isSaving || !state.propertyId}
            className="flex items-center gap-2 bg-primary text-on-primary rounded-2xl px-5 py-2 font-bold text-sm shadow-md hover:opacity-90 transition-all disabled:opacity-60"
          >
            <Download size={16} />
            {isSaving ? 'Generating...' : isEditMode ? 'Update & Download PDF' : 'Generate & Save PDF'}
          </button>
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="flex-1 min-h-0 overflow-hidden relative flex flex-row w-full">
        {/* LEFT PANEL - MUI EDITOR */}
        <Box
          sx={{
            width: { xs: '100%', md: 450 },
            flex: { xs: '1 1 100%', md: '0 0 450px' },
            minHeight: 0,
            bgcolor: 'background.paper',
            borderRight: { xs: 0, md: 1 },
            borderColor: 'divider',
            overflowY: 'auto',
            p: { xs: 2, md: 3 },
            display: { xs: mobileTab === 'edit' ? 'flex' : 'none', md: 'flex' },
            flexDirection: 'column',
            gap: 3,
          }}
          className="custom-scrollbar"
        >
          {/* Global Settings */}
          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Property Details</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>Select Property</Typography>
              <Select value={state.propertyId || 'none'} onChange={(e) => handlePropertyChange(e.target.value as string)}>
                <MenuItem value="none" disabled>-- Choose a Property --</MenuItem>
                {properties.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.address} {p.suburb ? `(${p.suburb})` : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Landlord Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Full Name" size="small" fullWidth value={state.landlordName} onChange={(e) => updateState('landlordName', e.target.value)} />
              <TextField label="Email" size="small" fullWidth value={state.landlordEmail} onChange={(e) => updateState('landlordEmail', e.target.value)} />
              <TextField label="Phone Number" size="small" fullWidth value={state.landlordPhone} onChange={(e) => updateState('landlordPhone', e.target.value)} />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Tenant Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Full Name" size="small" fullWidth value={state.tenantName} onChange={(e) => updateState('tenantName', e.target.value)} />
              <TextField label="Email" size="small" fullWidth value={state.tenantEmail} onChange={(e) => updateState('tenantEmail', e.target.value)} />
              <TextField label="Phone Number" size="small" fullWidth value={state.tenantPhone} onChange={(e) => updateState('tenantPhone', e.target.value)} />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Lease Terms</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* @ts-ignore */}
                <TextField variant="outlined" label="Start Date" type="date" size="small" fullWidth value={state.startDate} onChange={(e) => updateState('startDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                {/* @ts-ignore */}
                <TextField variant="outlined" label="End Date" type="date" size="small" fullWidth value={state.endDate} onChange={(e) => updateState('endDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Rent Amount ($)" type="number" size="small" fullWidth value={state.rentAmount || ''} onChange={(e) => updateState('rentAmount', parseFloat(e.target.value) || 0)} />
                <FormControl fullWidth size="small">
                  {/* @ts-ignore */}
                  <Select value={state.paymentFrequency} onChange={(e) => updateState('paymentFrequency', e.target.value as string)}>
                    {['Weekly', 'Fortnightly', 'Monthly'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              <TextField label="Bond Amount ($)" type="number" size="small" fullWidth value={state.bondAmount || ''} onChange={(e) => updateState('bondAmount', parseFloat(e.target.value) || 0)} helperText="Usually 4x weekly rent" />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block' }}>Special Conditions</Typography>
            <TextField 
              label="Additional Terms" 
              size="small" 
              fullWidth 
              multiline 
              rows={6} 
              value={state.specialTerms} 
              onChange={(e) => updateState('specialTerms', e.target.value)} 
            />
          </Box>
          
          {/* Mobile save button */}
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ display: { xs: 'flex', md: 'none' }, mt: 2, py: 1.5, borderRadius: 2 }}
            onClick={handleGenerateAndSave}
            disabled={isSaving || !state.propertyId}
          >
            {isSaving ? 'Generating...' : 'Save PDF'}
          </Button>
        </Box>

        {/* RIGHT PANEL (A4 Preview) */}
        <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 bg-[#e2e8f0]/50 p-2 sm:p-4 md:p-8 overflow-auto justify-center custom-scrollbar items-start`}>
          <div className="w-[794px] bg-white shadow-2xl overflow-hidden shrink-0 transition-all duration-300 transform origin-top scale-[0.45] sm:scale-[0.65] md:scale-[0.75] lg:scale-100 md:origin-top lg:origin-center" style={{ marginBottom: window.innerWidth < 1024 ? '-250px' : '0' }}>
            <div ref={previewRef} className="w-[794px] min-h-[1123px] bg-white relative box-border font-sans text-gray-900" style={{ padding: '60px' }}>
              
              <style type="text/css" media="print">{`
                @page {
                  margin: 20mm;
                }
                .print-avoid-break {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
              `}</style>

              {/* Australian standard header */}
              <div className="text-center mb-8 border-b-2 border-gray-900 pb-6 print-avoid-break">
                <h1 className="text-3xl font-black uppercase tracking-tight">Residential Tenancy Agreement</h1>
                <p className="text-sm text-gray-600 mt-2 italic font-serif">Standard Form Agreement in accordance with Australian tenancy regulations.</p>
              </div>

              {/* 1. Premises */}
              <div className="mb-6 print-avoid-break">
                <h2 className="text-lg font-bold bg-gray-100 px-3 py-1 mb-3 border-l-4 border-gray-900">1. The Premises</h2>
                <div className="px-3">
                  <p className="mb-2"><span className="font-semibold w-40 inline-block">Address:</span> {state.propertyAddress || '________________________________________________'}</p>
                </div>
              </div>

              {/* 2. Parties */}
              <div className="mb-6 print-avoid-break">
                <h2 className="text-lg font-bold bg-gray-100 px-3 py-1 mb-3 border-l-4 border-gray-900">2. The Parties</h2>
                
                <div className="px-3 mb-4">
                  <h3 className="font-bold text-md mb-2 border-b border-gray-200 pb-1">Landlord</h3>
                  <div className="grid grid-cols-2 gap-y-2">
                    <p><span className="font-semibold text-gray-700">Name:</span> {state.landlordName || '________________________'}</p>
                    <p><span className="font-semibold text-gray-700">Phone:</span> {state.landlordPhone || '________________________'}</p>
                    <p className="col-span-2"><span className="font-semibold text-gray-700">Email:</span> {state.landlordEmail || '________________________'}</p>
                  </div>
                </div>

                <div className="px-3">
                  <h3 className="font-bold text-md mb-2 border-b border-gray-200 pb-1">Tenant(s)</h3>
                  <div className="grid grid-cols-2 gap-y-2">
                    <p><span className="font-semibold text-gray-700">Name:</span> {state.tenantName || '________________________'}</p>
                    <p><span className="font-semibold text-gray-700">Phone:</span> {state.tenantPhone || '________________________'}</p>
                    <p className="col-span-2"><span className="font-semibold text-gray-700">Email:</span> {state.tenantEmail || '________________________'}</p>
                  </div>
                </div>
              </div>

              {/* 3. Term & Rent */}
              <div className="mb-6 print-avoid-break">
                <h2 className="text-lg font-bold bg-gray-100 px-3 py-1 mb-3 border-l-4 border-gray-900">3. Term, Rent & Bond</h2>
                <div className="px-3 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <p><span className="font-semibold w-32 inline-block">Start Date:</span> {new Date(state.startDate).toLocaleDateString('en-AU')}</p>
                    <p><span className="font-semibold w-32 inline-block">End Date:</span> {state.endDate ? new Date(state.endDate).toLocaleDateString('en-AU') : 'Periodic (Ongoing)'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <p>
                      <span className="font-semibold w-32 inline-block">Rent Amount:</span> 
                      ${formatCurrency(state.rentAmount)} <span className="text-gray-500 text-sm">payable {state.paymentFrequency.toLowerCase()}</span>
                    </p>
                    <p>
                      <span className="font-semibold w-32 inline-block">Bond Amount:</span> 
                      ${formatCurrency(state.bondAmount)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded text-sm mt-2 border border-gray-200">
                    <span className="font-bold">RTBA Note:</span> The bond must be lodged with the Residential Tenancies Bond Authority (RTBA) within 10 business days of receipt.
                  </div>
                </div>
              </div>

              {/* 4. Standard Terms */}
              <div className="mb-6 print-avoid-break">
                <h2 className="text-lg font-bold bg-gray-100 px-3 py-1 mb-3 border-l-4 border-gray-900">4. Standard Terms</h2>
                <div className="px-3 text-sm space-y-2 text-justify text-gray-700">
                  <p><strong>4.1 Quiet Enjoyment:</strong> The Landlord must take all reasonable steps to ensure the Tenant has quiet enjoyment of the premises.</p>
                  <p><strong>4.2 Maintenance:</strong> The Landlord must ensure that the premises are maintained in good repair. The Tenant must keep the premises reasonably clean and report any damage.</p>
                  <p><strong>4.3 Use of Premises:</strong> The Tenant must not use the premises for any illegal purpose or cause a nuisance to neighbors.</p>
                  <p><strong>4.4 Alterations:</strong> The Tenant must not affix any fixture or make any alteration to the premises without the Landlord's prior written consent.</p>
                  <p><strong>4.5 Subletting:</strong> The Tenant must not assign or sub-let the whole or any part of the premises without the written consent of the Landlord.</p>
                </div>
              </div>

              {/* 5. Special Conditions */}
              {state.specialTerms && (
                <div className="mb-12 print-avoid-break">
                  <h2 className="text-lg font-bold bg-gray-100 px-3 py-1 mb-3 border-l-4 border-gray-900">5. Special Conditions</h2>
                  <div className="px-3 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {state.specialTerms}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="mt-auto border-t-2 border-gray-900 pt-8 print-avoid-break">
                <h2 className="text-lg font-bold mb-8">Signatures</h2>
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <div className="border-b border-gray-400 h-12 mb-2"></div>
                    <p className="font-bold text-sm">Landlord Signature</p>
                    <p className="text-xs text-gray-500 mt-1">Date: ____ / ____ / ________</p>
                  </div>
                  <div>
                    <div className="border-b border-gray-400 h-12 mb-2"></div>
                    <p className="font-bold text-sm">Tenant Signature</p>
                    <p className="text-xs text-gray-500 mt-1">Date: ____ / ____ / ________</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
