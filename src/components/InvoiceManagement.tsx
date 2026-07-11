import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Settings, CreditCard, ChevronRight, Calendar, Bell, ShieldCheck, Clock, CheckCircle2, AlertCircle, Trash2, BarChart2, Mail, MailOpen, Activity, Search, Filter, LayoutGrid, List, Send } from 'lucide-react';
import { Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Checkbox, Select, MenuItem, FormControl } from '@mui/material';

import { InvoiceGenerator } from './InvoiceGenerator';
import { BulkInvoiceModal } from './BulkInvoiceModal';
import { InvoiceTemplateBuilder } from './InvoiceTemplateBuilder';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function InvoiceManagement() {
  const { userContext } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | string | null }>({ isOpen: false, id: null });
  const [dataLoading, setDataLoading] = useState(true);
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [savingAutomationId, setSavingAutomationId] = useState<string | null>(null);
  
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Automation manual trigger states
  const [runningEngine, setRunningEngine] = useState<'blueprints' | 'leases' | null>(null);
  const [automationResult, setAutomationResult] = useState<{
    message?: string;
    generatedInvoices?: number;
    generatedCount?: number; // handle both naming patterns if any
    emailsSent?: number;
    remindersSent?: number;
    lateFeesApplied?: number;
    error?: string;
  } | null>(null);

  const handleTriggerAutomation = async (engine: 'blueprints' | 'leases') => {
    setRunningEngine(engine);
    setAutomationResult(null);
    try {
      const functionName = engine === 'blueprints' ? 'invoice-automation' : 'generate-invoices';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {}
      });

      if (error) {
        throw error;
      }
      setAutomationResult(data || { message: "Job completed successfully." });
      await loadData();
    } catch (err: any) {
      console.error(`Automation trigger failed for ${engine}:`, err);
      setAutomationResult({ error: err.message || `Failed to execute ${engine} engine.` });
    } finally {
      setRunningEngine(null);
    }
  };

  const loadData = async () => {
    setDataLoading(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const managedPropertyIds = userContext?.teamPropertyIds || [];

    let invsQuery = supabase.from('invoices').select('*, properties(*)').order('created_at', { ascending: false });
    let propsQuery = supabase.from('properties').select('*');

    if (managedPropertyIds.length > 0) {
      invsQuery = invsQuery.or(`user_id.eq.${userId},property_id.in.(${managedPropertyIds.join(',')})`);
      propsQuery = propsQuery.or(`owner_id.eq.${userId},id.in.(${managedPropertyIds.join(',')})`);
    } else {
      invsQuery = invsQuery.eq('user_id', userId);
      propsQuery = propsQuery.eq('owner_id', userId);
    }

    const [
      { data: inv, error: invError },
      { data: props, error: propsError },
      { data: tmpl, error: tmplError },
      { data: enqs },
      { data: activeLeases }
    ] = await Promise.all([
      invsQuery,
      propsQuery,
      supabase.from('invoice_templates').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('property_enquiries').select('property_id, first_name, last_name, email').eq('status', 'Accepted'),
      supabase.from('leases').select('property_id, lease_tenants(tenants(first_name, last_name))').eq('status', 'Active')
    ]);

    if (tmplError) console.error("Error fetching templates:", tmplError);
    if (invError) console.error("Error fetching invoices:", invError);
    if (propsError) console.error("Error fetching properties:", propsError);
    if (inv) {
      // Map Supabase snake_case fields to what the UI expects
      setInvoices(inv.map(i => {
        let name = i.tenant_name || i.properties?.tenant_name;
        
        // Fallback 1: Resolve from Active Leases / tenancy setup
        if (!name || name.trim() === 'Tenant' || name.trim() === 'Unknown Tenant' || name.trim() === 'Tenant Name') {
          const activeLease = activeLeases?.find(l => l.property_id === i.property_id);
          if (activeLease?.lease_tenants) {
            const lTenants = activeLease.lease_tenants as any[];
            if (lTenants.length > 0 && lTenants[0].tenants) {
              name = `${lTenants[0].tenants.first_name} ${lTenants[0].tenants.last_name}`.trim();
            }
          }
        }

        // Fallback 2: Resolve from Accepted enquiries
        if (!name || name.trim() === 'Tenant' || name.trim() === 'Unknown Tenant' || name.trim() === 'Tenant Name') {
          const enq = enqs?.find(e => e.property_id === i.property_id);
          if (enq) name = `${enq.first_name} ${enq.last_name}`.trim();
        }
        if (!name) name = 'Unknown Tenant';
        return {
          ...i,
          tenantName: name,
          propertyName: i.property_address || i.properties?.address || 'Unknown Property',
          dueDate: i.due_date,
          totalAmount: i.total_amount,
          templateId: i.template_id,
          propertyId: i.property_id,
        };
      }));
    }
    if (props) {
      setProperties(props.map(p => {
        let name = p.tenant_name;
        // Fix dummy names instantly during the bulk load
        if (!name || name.trim() === 'Tenant' || name.trim() === 'Unknown Tenant' || name.trim() === 'Tenant Name') {
          // Check lease first
          const activeLease = activeLeases?.find(l => l.property_id === p.id);
          if (activeLease?.lease_tenants) {
            const lTenants = activeLease.lease_tenants as any[];
            if (lTenants.length > 0 && lTenants[0].tenants) {
              name = `${lTenants[0].tenants.first_name} ${lTenants[0].tenants.last_name}`.trim();
            }
          }
          // Fallback to accepted enquiries
          if (!name || name.trim() === 'Tenant' || name.trim() === 'Unknown Tenant' || name.trim() === 'Tenant Name') {
            const enq = enqs?.find(e => e.property_id === p.id);
            if (enq) name = `${enq.first_name} ${enq.last_name}`.trim();
          }
        }
        return { 
          ...p, 
          tenant_name: name, // Override original database value locally
          tenantName: name, 
          rentAmount: p.rent_amount, 
          paymentFrequency: p.payment_frequency 
        };
      }));
    }
    if (tmpl) setTemplates(tmpl);
    setDataLoading(false);
  };

  useEffect(() => {
    if (userContext) {
      loadData();
    }
  }, [showGenerator, showTemplateBuilder, userContext]);

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      await supabase.from('invoices').delete().eq('id', deleteConfirm.id);
      setInvoices(prev => prev.filter(i => i.id !== deleteConfirm.id));
      setSelectedInvoices(prev => prev.filter(id => id !== deleteConfirm.id));
    }
    setDeleteConfirm({ isOpen: false, id: null });
  };


  const handleBulkDownload = async () => {
    alert("Bulk download is temporarily disabled while we upgrade the PDF rendering engine. Please open and download invoices individually for now.");
    setSelectedInvoices([]);
  };

  const handleSaveAutomation = async (templateId: string, updates: any) => {
    setSavingAutomationId(templateId);
    try {
      const { error } = await supabase.from('invoice_templates').update(updates).eq('id', templateId);
      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          alert('Database schema update required. Please run the SQL migration to add auto_send_email and auto_approve columns.');
        } else {
          alert(`Error saving automation: ${error.message}`);
        }
      } else {
        // Update local state
        setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ...updates } : t));
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingAutomationId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await supabase.from('invoices').update({ status: newStatus }).eq('id', id);
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
    } catch (e: any) {
      alert("Error updating status: " + e.message);
    }
  };

  const handleSendReminder = async (id: string) => {
    try {
      const inv = invoices.find(i => i.id === id);
      if (!inv) return;

      const recipientEmail = inv.tenant_email;
      if (!recipientEmail) {
        alert('No email address on file for this tenant. Please update the tenant record first.');
        return;
      }
      
      // Call the Resend edge function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipientEmail,
          subject: `Reminder: Invoice ${inv.invoice_number} is Due`,
          templateType: "invoice",
          variables: {
            tenantName: inv.tenantName || inv.tenant_name || 'Tenant', 
            propertyAddress: inv.propertyName || inv.property_address || 'Property Address', 
            senderName: "Property Manager",
            senderEmail: "manager@propertyledge.com.au",
            invoiceNumber: inv.invoice_number,
            dueDate: inv.due_date,
            totalAmount: inv.total_amount,
            isReminder: true
          }
        }
      });
      
      if (error) throw error;
      
      alert(`Reminder sent to ${recipientEmail} via Resend.`);
      await handleUpdateStatus(id, 'Sent');
    } catch (err: any) {
      console.error("Failed to send email:", err);
      alert("Failed to send email: " + err.message);
    }
  };

  const tabs = [
    { label: "Invoices", icon: <FileText className="w-4 h-4" /> },
    { label: "Follow Up", icon: <AlertCircle className="w-4 h-4" /> },
    { label: "Automation", icon: <Calendar className="w-4 h-4" /> }
  ];

  const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
  const unopenedInvoices = invoices.filter(i => i.status === 'Sent');


  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full mt-20 md:mt-0 relative z-10">
        
        {/* Dynamic Background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk', letterSpacing: '-1px', color: '#1c1c28', mb: 1 }}>
              Billing & Invoices
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#4a4a5e', fontWeight: 500 }}>
              Generate custom invoices and automate rent collection.
            </Typography>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button 
              variant="contained" 
              startIcon={<Plus className="w-5 h-5" />}
              onClick={() => setShowModeModal(true)}
              disableElevation
              sx={{ bgcolor: '#22333b', '&:hover': { bgcolor: '#111a1e' }, borderRadius: '50px', fontWeight: 900, px: 3, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', boxShadow: '0 8px 16px -4px rgba(34,51,59,0.3)' }}
            >
              New Invoice
            </Button>
          </div>
        </div>

        {/* Custom iOS 26 Pill Tabs */}
        <div className="inline-flex bg-white/60 backdrop-blur-3xl border border-white p-1.5 rounded-[24px] shadow-[0_8px_32px_rgba(59,34,181,0.04)] mb-10 overflow-x-auto max-w-full">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`relative flex items-center gap-2 px-6 py-3 rounded-[20px] text-sm font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap z-10 ${isActive ? 'text-white' : 'text-[#4a4a5e] hover:text-[#1c1c28] hover:bg-white/40'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-primary rounded-[20px] shadow-[0_4px_16px_rgba(59,34,181,0.3)] -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-white' : 'text-primary'}`}>
                  {tab.icon}
                </span>
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Tab 0: Invoices List */}
          {activeTab === 0 && (
            <motion.div key="invoices" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
              {dataLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-[104px] bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 animate-pulse shadow-sm" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-3xl border border-white/80 rounded-[40px] p-10 md:p-16 text-center shadow-[0_16px_40px_-12px_rgba(59,34,181,0.06)] relative overflow-hidden group">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-colors duration-700" />
                  
                  <div className="relative z-10">
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-white to-[#f8f9fc] flex items-center justify-center mx-auto mb-8 shadow-[0_12px_32px_rgba(59,34,181,0.08)] border border-white group-hover:scale-110 transition-transform duration-500">
                      <FileText className="w-10 h-10 text-primary" />
                    </div>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, fontFamily: 'Space Grotesk', color: '#1c1c28' }}>No Invoices Yet</Typography>
                    <Typography sx={{ mb: 6, maxWidth: 450, mx: 'auto', color: '#4a4a5e', fontSize: '1.1rem', lineHeight: 1.6 }}>
                      You haven't generated any invoices yet. Click below to open the Invoice Architect and create your first professional invoice.
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => setShowModeModal(true)}
                      disableElevation
                      sx={{ bgcolor: '#22333b', borderRadius: '50px', px: 6, py: 2, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 12px 24px -8px rgba(34,51,59,0.4)', '&:hover': { bgcolor: '#111a1e', boxShadow: '0 16px 32px -8px rgba(34,51,59,0.5)' } }}
                    >
                      Generate Invoice
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 px-2 gap-4">
                    <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk', color: '#1c1c28' }}>All Invoices</Typography>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-full shadow-inner border border-white items-center mr-2">
                        <button 
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-[#4a4a5e] hover:text-[#1c1c28]'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setViewMode('table')}
                          className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-[#4a4a5e] hover:text-[#1c1c28]'}`}
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                      {invoices.length > 0 && (
                        <Button 
                          onClick={() => {
                            if (selectedInvoices.length === invoices.length) {
                              setSelectedInvoices([]);
                            } else {
                              setSelectedInvoices(invoices.map(inv => inv.id));
                            }
                          }}
                          variant="text" 
                          size="small" 
                          sx={{ color: '#4a4a5e', fontWeight: 900, px: 2, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }, flex: { xs: 1, sm: 'auto' } }}
                        >
                          {selectedInvoices.length === invoices.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      )}
                      {selectedInvoices.length > 0 && (
                        <Button 
                          onClick={handleBulkDownload} 
                          variant="outlined" 
                          size="small" 
                          sx={{ borderColor: 'primary.main', color: 'primary.main', borderRadius: '50px', fontWeight: 900, px: 3, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', '&:hover': { bgcolor: 'primary.main', color: 'white' }, flex: { xs: 1, sm: 'auto' } }}
                        >
                          Download ({selectedInvoices.length})
                        </Button>
                      )}
                      <Button onClick={() => setShowModeModal(true)} variant="contained" size="small" disableElevation sx={{ bgcolor: '#22333b', '&:hover': { bgcolor: '#111a1e' }, borderRadius: '50px', fontWeight: 900, px: 3, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', boxShadow: '0 8px 16px -4px rgba(34,51,59,0.3)', flex: { xs: 1, sm: 'auto' } }}>Generate New</Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                    {/* Basic visual filters mock */}
                    <div className="flex items-center gap-2 text-sm font-bold bg-white/60 rounded-full px-4 py-2 border border-white">
                      <Filter className="w-4 h-4 text-primary" /> Filter by:
                    </div>
                    <FormControl size="small" sx={{ minWidth: 140, maxWidth: 200 }}>
                      <Select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value)}
                        displayEmpty
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.6)',
                          borderRadius: '9999px',
                          border: '1px solid white',
                          boxShadow: 'none',
                          '.MuiOutlinedInput-notchedOutline': { border: 0 },
                          '&:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 },
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: '#1c1c28',
                          py: 0.5,
                          pl: 1
                        }}
                        MenuProps={{
                          slotProps: {
                            paper: {
                              sx: {
                                borderRadius: '16px',
                                boxShadow: '0 8px 32px rgba(59,34,181,0.08)',
                                mt: 1,
                                border: '1px solid rgba(255,255,255,0.6)',
                                backdropFilter: 'blur(16px)'
                              }
                            }
                          }
                        }}
                      >
                        <MenuItem value="all" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>All Properties</MenuItem>
                        {properties.map(p => <MenuItem key={p.id} value={p.id} sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.address}</MenuItem>)}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 140, maxWidth: 200 }}>
                      <Select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value)}
                        displayEmpty
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.6)',
                          borderRadius: '9999px',
                          border: '1px solid white',
                          boxShadow: 'none',
                          '.MuiOutlinedInput-notchedOutline': { border: 0 },
                          '&:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 },
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: '#1c1c28',
                          py: 0.5,
                          pl: 1
                        }}
                        MenuProps={{
                          slotProps: {
                            paper: {
                              sx: {
                                borderRadius: '16px',
                                boxShadow: '0 8px 32px rgba(59,34,181,0.08)',
                                mt: 1,
                                border: '1px solid rgba(255,255,255,0.6)',
                                backdropFilter: 'blur(16px)'
                              }
                            }
                          }
                        }}
                      >
                        <MenuItem value="all" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>All Statuses</MenuItem>
                        <MenuItem value="Draft" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Draft</MenuItem>
                        <MenuItem value="Sent" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Sent</MenuItem>
                        <MenuItem value="Overdue" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Overdue</MenuItem>
                        <MenuItem value="Paid" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Paid</MenuItem>
                      </Select>
                    </FormControl>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid gap-4">
                    {invoices
                      .filter(inv => propertyFilter === 'all' || inv.propertyId === propertyFilter)
                      .filter(inv => statusFilter === 'all' || (inv.status || 'Draft').toLowerCase() === statusFilter.toLowerCase())
                      .map((inv, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[32px] p-5 sm:p-6 shadow-[0_8px_32px_rgba(59,34,181,0.03)] hover:shadow-[0_16px_48px_rgba(59,34,181,0.08)] hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 group flex flex-col md:flex-row justify-between items-start md:items-center gap-5 min-w-0"
                      >
                        <div className="flex items-start sm:items-center gap-3 sm:gap-5 w-full min-w-0">
                          <Checkbox 
                            checked={selectedInvoices.includes(inv.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInvoices([...selectedInvoices, inv.id]);
                              } else {
                                setSelectedInvoices(selectedInvoices.filter(id => id !== inv.id));
                              }
                            }}
                            sx={{
                              color: 'rgba(59,34,181,0.2)',
                              '&.Mui-checked': { color: 'primary.main' },
                              padding: { xs: 0.5, sm: 1 }
                            }}
                          />
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-gradient-to-br from-[#f8f9fc] to-white flex items-center justify-center shrink-0 border border-black/5 shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Typography sx={{ fontWeight: 900, fontSize: { xs: '1rem', sm: '1.125rem' }, color: '#1c1c28', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.tenantName}</Typography>
                            <Typography variant="body2" sx={{ color: '#4a4a5e', fontWeight: 500, mb: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.propertyName}</Typography>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#4a4a5e] bg-black/5 px-2 py-1 rounded-full whitespace-nowrap">
                                Due: {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                              </span>
                              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${inv.status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                {inv.status === 'Sent' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {inv.status || 'Draft'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full md:w-auto gap-4 sm:gap-6 border-t md:border-t-0 border-outline-variant/30 pt-4 md:pt-0 mt-2 md:mt-0">
                          <div className="text-right">
                            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Amount</div>
                            <Typography sx={{ fontWeight: 900, fontSize: '1.75rem', fontFamily: 'Space Grotesk', color: '#1c1c28', lineHeight: 1 }}>${inv.totalAmount}</Typography>
                          </div>
                          <div className="flex gap-2">
                            <IconButton 
                              onClick={() => handleSendReminder(inv.id)}
                              sx={{ bgcolor: 'rgba(59,130,246,0.05)', color: '#3b82f6', '&:hover': { bgcolor: '#3b82f6', color: 'white' }, transition: 'all 0.3s' }}
                              title="Send Email to Tenant"
                            >
                              <Mail className="w-5 h-5" />
                            </IconButton>
                            <IconButton 
                              onClick={() => setDeleteConfirm({ isOpen: true, id: inv.id })}
                              sx={{ bgcolor: 'rgba(239,68,68,0.05)', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' }, transition: 'all 0.3s' }}
                            >
                              <Trash2 className="w-5 h-5" />
                            </IconButton>
                            <IconButton 
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowGenerator(true);
                              }}
                              sx={{ bgcolor: 'rgba(59,34,181,0.05)', color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: 'white' }, transition: 'all 0.3s' }}
                            >
                              <ChevronRight className="w-6 h-6" />
                            </IconButton>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    </div>
                  ) : (
                    <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgba(59,34,181,0.04)]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-black/5 bg-[#f8f9fc]/50">
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">#</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Tenant</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Property</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Due Date</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Amount</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Status</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices
                              .filter(inv => propertyFilter === 'all' || inv.propertyId === propertyFilter)
                              .filter(inv => statusFilter === 'all' || (inv.status || 'Draft').toLowerCase() === statusFilter.toLowerCase())
                              .map((inv, index) => (
                              <tr key={inv.id} className={`border-b border-black/5 transition-colors group ${index % 2 === 0 ? 'bg-transparent hover:bg-[#f8f9fc]/50' : 'bg-[#f8f9fc]/30 hover:bg-[#f8f9fc]/80'}`}>
                                <td className="px-6 py-4 text-[11px] font-black text-[#4a4a5e]">#{index + 1}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f8f9fc] to-white flex items-center justify-center border border-black/5 shrink-0">
                                      <FileText className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="font-black text-sm text-[#1c1c28]">{inv.tenantName}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-medium text-[#4a4a5e]">{inv.propertyName}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-medium text-[#1c1c28]">{new Date(inv.dueDate).toLocaleDateString('en-GB')}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-base font-black text-[#1c1c28]">${inv.totalAmount}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${(inv.status || 'Draft') === 'Sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : (inv.status || 'Draft') === 'Overdue' ? 'bg-red-50 text-red-600 border border-red-200' : (inv.status || 'Draft') === 'Paid' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                    {inv.status || 'Draft'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleSendReminder(inv.id)}
                                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors border border-blue-100"
                                      title="Send Email"
                                    >
                                      <Mail className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => { setSelectedInvoice(inv); setShowGenerator(true); }}
                                      className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-colors border border-primary/10"
                                      title="View Invoice"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm({ isOpen: true, id: inv.id })}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 1: Follow Up Dashboard (Epic 6.2) */}
          {activeTab === 1 && (
            <motion.div key="followup" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Overdue Section */}
                <div className="bg-red-50/50 backdrop-blur-3xl border border-red-100 rounded-[32px] p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'red.900' }}>Overdue Invoices</Typography>
                  </div>
                  {overdueInvoices.length === 0 ? (
                    <Typography sx={{ color: 'red.700', fontWeight: 600, textAlign: 'center', py: 4 }}>No overdue invoices! Great job.</Typography>
                  ) : (
                    <div className="space-y-4">
                      {overdueInvoices.map(inv => (
                        <div key={inv.id} className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <Typography sx={{ fontWeight: 800 }}>{inv.tenantName}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Due: {new Date(inv.dueDate).toLocaleDateString()}</Typography>
                            </div>
                            <Typography sx={{ fontWeight: 900, color: 'red.600' }}>${inv.totalAmount}</Typography>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleSendReminder(inv.id)} size="small" variant="contained" color="error" disableElevation sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 800 }}>Send Reminder</Button>
                            <Button onClick={() => handleUpdateStatus(inv.id, 'Paid')} size="small" variant="outlined" color="success" sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 800 }}>Mark as Paid</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unopened/Sent Section */}
                <div className="bg-blue-50/50 backdrop-blur-3xl border border-blue-100 rounded-[32px] p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'blue.900' }}>Unopened Invoices</Typography>
                  </div>
                  {unopenedInvoices.length === 0 ? (
                    <Typography sx={{ color: 'blue.700', fontWeight: 600, textAlign: 'center', py: 4 }}>No unopened invoices.</Typography>
                  ) : (
                    <div className="space-y-4">
                      {unopenedInvoices.map(inv => (
                        <div key={inv.id} className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <Typography sx={{ fontWeight: 800 }}>{inv.tenantName}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sent: {new Date(inv.created_at).toLocaleDateString()}</Typography>
                            </div>
                            <Typography sx={{ fontWeight: 900, color: 'blue.600' }}>${inv.totalAmount}</Typography>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleSendReminder(inv.id)} size="small" variant="outlined" color="primary" sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 800 }}>Resend Email</Button>
                            <Button onClick={() => handleUpdateStatus(inv.id, 'Viewed')} size="small" variant="text" color="inherit" sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 800 }}>Mock Open</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
          {/* Tab 2: Automation */}
          {activeTab === 2 && (
            <motion.div key="automation" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
               <div className="bg-white/60 backdrop-blur-3xl border border-white/80 rounded-[40px] p-8 md:p-10 shadow-[0_16px_40px_-12px_rgba(59,34,181,0.06)] relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
                 
                 <div className="flex items-center gap-5 mb-8 relative z-10">
                   <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-amber-50 to-white flex items-center justify-center border border-amber-100 shadow-inner shrink-0">
                     <Clock className="w-8 h-8 text-amber-500" />
                   </div>
                   <div>
                     <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk', color: '#1c1c28', mb: 1 }}>Automated Sending</Typography>
                     <Typography variant="body1" sx={{ color: '#4a4a5e', fontWeight: 500 }}>Configure when invoices should be sent automatically.</Typography>
                   </div>
                 </div>

                  {/* Automation Diagnostics & Trigger Desk */}
                  <div className="bg-[#fcfdfd]/90 backdrop-blur-xl border border-outline-variant/30 rounded-[32px] p-6 mb-8 relative z-10 shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-black text-[#a9927d] uppercase tracking-wider mb-1">
                          <Settings className="w-3.5 h-3.5 text-amber-500" />
                          System Diagnostics & Actions
                        </div>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#1c1c28', mb: 0.5 }}>Manual Automation Panel</Typography>
                        <Typography variant="body2" sx={{ color: '#4a4a5e', fontWeight: 500 }}>
                          Directly invoke automated billing scripts to run verification passes right now.
                        </Typography>
                      </div>

                      {/* Display live runner status if working */}
                      {runningEngine && (
                        <div className="inline-flex items-center gap-2.5 bg-amber-50 border border-amber-200/50 text-[#b45309] text-xs font-black uppercase tracking-widest px-4.5 py-2.5 rounded-full shrink-0">
                          <div className="w-4 h-4 border-2 border-[#b45309]/30 border-t-[#b45309] rounded-full animate-spin" />
                          Running {runningEngine === 'blueprints' ? 'Rules' : 'Billing'} Engine...
                        </div>
                      )}
                    </div>

                    {/* Results / Feedback area */}
                    {automationResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-6 p-5 border rounded-2xl ${automationResult.error ? 'bg-red-50/50 border-red-200 text-red-700' : 'bg-emerald-50/50 border-emerald-200 text-emerald-800'}`}
                      >
                        {automationResult.error ? (
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>Execution Error</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{automationResult.error}</Typography>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Automation run completed successfully!</Typography>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                              <div className="bg-white/80 border border-emerald-100 rounded-xl p-3.5 text-center">
                                <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Generated</div>
                                <div className="text-xl font-black text-emerald-800">
                                  {automationResult.generatedInvoices ?? automationResult.generatedCount ?? 0}
                                </div>
                              </div>
                              <div className="bg-white/80 border border-emerald-100 rounded-xl p-3.5 text-center">
                                <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Emails Sent</div>
                                <div className="text-xl font-black text-emerald-800">
                                  {automationResult.emailsSent ?? 0}
                                </div>
                              </div>
                              <div className="bg-white/80 border border-emerald-100 rounded-xl p-3.5 text-center">
                                <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Reminders</div>
                                <div className="text-xl font-black text-emerald-800">
                                  {automationResult.remindersSent ?? 0}
                                </div>
                              </div>
                              <div className="bg-white/80 border border-emerald-100 rounded-xl p-3.5 text-center">
                                <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Late Fees</div>
                                <div className="text-xl font-black text-emerald-800">
                                  {automationResult.lateFeesApplied ?? 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Quick triggers buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="bg-[#f8faf9] border border-gray-100 rounded-[20px] p-5 flex flex-col justify-between items-start gap-4">
                        <div>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1c1c28', mb: 1 }}>Blueprints & Overdue rules</Typography>
                          <Typography variant="caption" sx={{ color: '#4a4a5e', fontWeight: 600, display: 'block', lineHeight: 1.4 }}>
                            Evaluate schedule rules, auto-generate invoices, update overdue states, send reminder notices, and apply fees.
                          </Typography>
                        </div>
                        <Button 
                          variant="contained"
                          size="small"
                          disabled={!!runningEngine}
                          onClick={() => handleTriggerAutomation('blueprints')}
                          disableElevation
                          sx={{ 
                            bgcolor: '#d97706', 
                            color: 'white',
                            borderRadius: '50px', 
                            fontWeight: 900, 
                            px: 3.5, 
                            py: 1.25, 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px', 
                            fontSize: '0.7rem',
                            boxShadow: '0 6px 16px -4px rgba(217,119,6,0.3)',
                            '&:hover': { bgcolor: '#b45309' } 
                          }}
                        >
                          Run Rules Engine
                        </Button>
                      </div>

                      <div className="bg-[#f8faf9] border border-gray-100 rounded-[20px] p-5 flex flex-col justify-between items-start gap-4">
                        <div>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1c1c28', mb: 1 }}>Lease rent generator</Typography>
                          <Typography variant="caption" sx={{ color: '#4a4a5e', fontWeight: 600, display: 'block', lineHeight: 1.4 }}>
                            Examine active leases, generate rent invoices due today, render PDF bills, and email them to tenants via Resend.
                          </Typography>
                        </div>
                        <Button 
                          variant="contained"
                          size="small"
                          disabled={!!runningEngine}
                          onClick={() => handleTriggerAutomation('leases')}
                          disableElevation
                          sx={{ 
                            bgcolor: '#22333b', 
                            color: 'white',
                            borderRadius: '50px', 
                            fontWeight: 900, 
                            px: 3.5, 
                            py: 1.25, 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px', 
                            fontSize: '0.7rem',
                            boxShadow: '0 6px 16px -4px rgba(34,51,59,0.3)',
                            '&:hover': { bgcolor: '#111a1e' } 
                          }}
                        >
                          Run Lease Billing Engine
                        </Button>
                      </div>
                    </div>
                  </div>
                 
                 {templates.length === 0 ? (
                   <div className="p-6 md:p-8 bg-gradient-to-r from-amber-50 to-[#fffdf7] border border-amber-200/60 rounded-[32px] flex gap-5 mb-4 relative z-10 shadow-sm">
                     <ShieldCheck className="w-8 h-8 text-amber-600 shrink-0" />
                     <div>
                       <Typography sx={{ fontWeight: 900, color: 'amber.900', mb: 1, fontSize: '1.1rem' }}>No Automation Rules Found</Typography>
                       <Typography variant="body1" sx={{ color: 'amber.800', lineHeight: 1.6, fontWeight: 500 }}>
                         You need to create at least one Billing Blueprint before you can set up automation rules.
                       </Typography>
                       <Button 
                         variant="contained" 
                         onClick={() => setShowTemplateBuilder(true)}
                         disableElevation
                         sx={{ mt: 3, bgcolor: '#d97706', borderRadius: '50px', px: 4, py: 1.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 8px 16px -4px rgba(217,119,6,0.3)', '&:hover': { bgcolor: '#b45309' } }}
                       >
                         Create Blueprint
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <div className="grid gap-6 relative z-10">
                     {templates.map(template => (
                       <div key={template.id} className="bg-white/80 border border-gray-100 rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                         <div className="flex-1">
                           <Typography variant="h6" sx={{ fontWeight: 900, color: '#1c1c28', mb: 0.5 }}>{template.name}</Typography>
                           <Typography variant="body2" sx={{ color: '#4a4a5e', fontWeight: 500, mb: 3 }}>Blueprint Type: {template.template_type}</Typography>
                           
                           <div className="flex flex-wrap gap-6 items-center">
                             <div>
                               <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#4a4a5e', display: 'block', mb: 1 }}>Run on day of month</Typography>
                               <select 
                                 value={template.automation_day || ''}
                                 onChange={(e) => handleSaveAutomation(template.id, { automation_day: e.target.value ? parseInt(e.target.value) : null })}
                                 className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-sm"
                               >
                                 <option value="">Disabled</option>
                                 {[...Array(31)].map((_, i) => (
                                   <option key={i+1} value={i+1}>{i+1}{i+1 === 1 ? 'st' : i+1 === 2 ? 'nd' : i+1 === 3 ? 'rd' : 'th'}</option>
                                 ))}
                               </select>
                             </div>
                             
                             <div className="flex items-center gap-3">
                               <Checkbox 
                                 checked={template.auto_approve || false}
                                 onChange={(e) => handleSaveAutomation(template.id, { auto_approve: e.target.checked })}
                                 sx={{ p: 0, color: 'rgba(59,34,181,0.2)', '&.Mui-checked': { color: 'primary.main' } }}
                               />
                               <Typography variant="body2" sx={{ fontWeight: 700, color: '#1c1c28' }}>Auto-Approve</Typography>
                             </div>
                             
                             <div className="flex items-center gap-3">
                               <Checkbox 
                                 checked={template.auto_send_email || false}
                                 onChange={(e) => handleSaveAutomation(template.id, { auto_send_email: e.target.checked })}
                                 sx={{ p: 0, color: 'rgba(59,34,181,0.2)', '&.Mui-checked': { color: 'primary.main' } }}
                               />
                               <Typography variant="body2" sx={{ fontWeight: 700, color: '#1c1c28' }}>Auto-Send via Email</Typography>
                             </div>
                           </div>
                         </div>
                         
                         {savingAutomationId === template.id && (
                           <div className="flex items-center gap-2 text-primary text-sm font-bold bg-primary/5 px-4 py-2 rounded-full shrink-0">
                             <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> Saving...
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <AnimatePresence>
        {showGenerator && <InvoiceGenerator properties={properties} initialData={selectedInvoice} onClose={() => { setShowGenerator(false); setSelectedInvoice(null); loadData(); }} />}
        {showTemplateBuilder && <InvoiceTemplateBuilder onClose={() => setShowTemplateBuilder(false)} />}
        {showModeModal && (
          <BulkInvoiceModal
            properties={properties}
            onClose={() => setShowModeModal(false)}
            onOpenSingle={() => { setShowModeModal(false); setSelectedInvoice(null); setShowGenerator(true); }}
            onSuccess={() => { setShowModeModal(false); loadData(); }}
          />
        )}
      </AnimatePresence>

      <Dialog
        open={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        sx={{ '& .MuiDialog-paper': { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontFamily: 'Space Grotesk' }}>
          Delete Invoice
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this invoice? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setDeleteConfirm({ isOpen: false, id: null })} 
            sx={{ fontWeight: 700, color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            variant="contained" 
            color="error" 
            disableElevation 
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </DashboardLayout>
  );
}
