import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Settings, CreditCard, ChevronRight, Calendar, Bell, ShieldCheck, Clock, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { InvoiceTemplateBuilder } from './InvoiceTemplateBuilder';
import { InvoiceGenerator } from './InvoiceGenerator';

export function InvoiceManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'invoice' | 'template'; id: number | string | null }>({ isOpen: false, type: 'invoice', id: null });
  
  // State for mock data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    // Load templates and invoices from localStorage
    const loadedTemplates = JSON.parse(localStorage.getItem('invoice_templates') || '[]');
    const loadedInvoices = JSON.parse(localStorage.getItem('generated_invoices') || '[]');
    setTemplates(loadedTemplates);
    setInvoices(loadedInvoices);
  }, [showTemplateBuilder, showGenerator]);

  const confirmDelete = () => {
    if (deleteConfirm.type === 'invoice' && typeof deleteConfirm.id === 'number') {
      const updated = invoices.filter((_, i) => i !== deleteConfirm.id);
      setInvoices(updated);
      localStorage.setItem('generated_invoices', JSON.stringify(updated));
    } else if (deleteConfirm.type === 'template' && typeof deleteConfirm.id === 'string') {
      const updated = templates.filter(t => t.id !== deleteConfirm.id);
      setTemplates(updated);
      localStorage.setItem('invoice_templates', JSON.stringify(updated));
    }
    setDeleteConfirm({ isOpen: false, type: 'invoice', id: null });
  };

  const tabs = [
    { label: "Invoices", icon: <FileText className="w-4 h-4" /> },
    { label: "Templates", icon: <CreditCard className="w-4 h-4" /> },
    { label: "Automation", icon: <Calendar className="w-4 h-4" /> }
  ];

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
              Manage templates, generate invoices, and automate rent collection.
            </Typography>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button 
              variant="outlined" 
              startIcon={<Settings className="w-4 h-4" />}
              sx={{ borderRadius: '50px', fontWeight: 900, px: 3, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', borderColor: 'rgba(0,0,0,0.1)', color: 'text.primary', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.2)' } }}
            >
              Settings
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Plus className="w-5 h-5" />}
              onClick={() => {
                setShowTemplateBuilder(true);
              }}
              disableElevation
              sx={{ bgcolor: '#22333b', '&:hover': { bgcolor: '#111a1e' }, borderRadius: '50px', fontWeight: 900, px: 3, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', boxShadow: '0 8px 16px -4px rgba(34,51,59,0.3)' }}
            >
              New Template
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
          {/* Tab 0: Generated Invoices */}
          {activeTab === 0 && (
            <motion.div key="invoices" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
              {invoices.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-3xl border border-white/80 rounded-[40px] p-10 md:p-16 text-center shadow-[0_16px_40px_-12px_rgba(59,34,181,0.06)] relative overflow-hidden group">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-colors duration-700" />
                  
                  <div className="relative z-10">
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-white to-[#f8f9fc] flex items-center justify-center mx-auto mb-8 shadow-[0_12px_32px_rgba(59,34,181,0.08)] border border-white group-hover:scale-110 transition-transform duration-500">
                      <FileText className="w-10 h-10 text-primary" />
                    </div>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, fontFamily: 'Space Grotesk', color: '#1c1c28' }}>No Invoices Yet</Typography>
                    <Typography sx={{ mb: 6, maxWidth: 450, mx: 'auto', color: '#4a4a5e', fontSize: '1.1rem', lineHeight: 1.6 }}>
                      You haven't generated any invoices. Create a template first, then generate professional invoices for your tenants in seconds.
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => setShowGenerator(true)}
                      disabled={templates.length === 0}
                      disableElevation
                      sx={{ bgcolor: '#22333b', borderRadius: '50px', px: 6, py: 2, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 12px 24px -8px rgba(34,51,59,0.4)', '&:hover': { bgcolor: '#111a1e', boxShadow: '0 16px 32px -8px rgba(34,51,59,0.5)' } }}
                    >
                      Generate Invoice
                    </Button>
                    {templates.length === 0 && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 4, fontWeight: 900, color: 'error.main', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        * You need to create a template first.
                      </Typography>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk', color: '#1c1c28' }}>All Invoices</Typography>
                    <Button onClick={() => setShowGenerator(true)} variant="contained" size="small" disableElevation sx={{ bgcolor: '#22333b', '&:hover': { bgcolor: '#111a1e' }, borderRadius: '50px', fontWeight: 900, px: 3, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', boxShadow: '0 8px 16px -4px rgba(34,51,59,0.3)' }}>Generate New</Button>
                  </div>
                  
                  <div className="grid gap-4">
                    {invoices.map((inv, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[32px] p-5 sm:p-6 shadow-[0_8px_32px_rgba(59,34,181,0.03)] hover:shadow-[0_16px_48px_rgba(59,34,181,0.08)] hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 group flex flex-col md:flex-row justify-between items-start md:items-center gap-5"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#f8f9fc] to-white flex items-center justify-center shrink-0 border border-black/5 shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <FileText className="w-7 h-7 text-primary" />
                          </div>
                          <div>
                            <Typography sx={{ fontWeight: 900, fontSize: '1.125rem', color: '#1c1c28', mb: 0.5 }}>{inv.tenantName}</Typography>
                            <Typography variant="body2" sx={{ color: '#4a4a5e', fontWeight: 500, mb: 1.5 }}>{inv.propertyName}</Typography>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#4a4a5e] bg-black/5 px-2.5 py-1 rounded-full">
                                Due: {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 ${inv.status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                {inv.status === 'Sent' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {inv.status || 'Draft'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-t-0 border-outline-variant/30 pt-4 md:pt-0">
                          <div className="text-right">
                            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Amount</div>
                            <Typography sx={{ fontWeight: 900, fontSize: '1.75rem', fontFamily: 'Space Grotesk', color: '#1c1c28', lineHeight: 1 }}>${inv.totalAmount}</Typography>
                          </div>
                          <div className="flex gap-2">
                            <IconButton 
                              onClick={() => setDeleteConfirm({ isOpen: true, type: 'invoice', id: idx })}
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
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 1: Templates */}
          {activeTab === 1 && (
            <motion.div key="templates" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
              {templates.length === 0 ? (
                 <div className="bg-white/60 backdrop-blur-3xl border border-white/80 rounded-[40px] p-10 md:p-16 text-center shadow-[0_16px_40px_-12px_rgba(59,34,181,0.06)] relative overflow-hidden group">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-[80px] group-hover:bg-secondary/10 transition-colors duration-700" />
                   
                   <div className="relative z-10">
                     <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-white to-[#f8f9fc] flex items-center justify-center mx-auto mb-8 shadow-[0_12px_32px_rgba(59,34,181,0.08)] border border-white group-hover:scale-110 transition-transform duration-500">
                       <CreditCard className="w-10 h-10 text-secondary" />
                     </div>
                     <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, fontFamily: 'Space Grotesk', color: '#1c1c28' }}>Create Your First Template</Typography>
                     <Typography sx={{ mb: 6, maxWidth: 450, mx: 'auto', color: '#4a4a5e', fontSize: '1.1rem', lineHeight: 1.6 }}>
                       Templates allow you to define standardized line items (like Rent, Water, and Council rates) that can be easily reused across your portfolio.
                     </Typography>
                     <Button variant="contained" disableElevation onClick={() => setShowTemplateBuilder(true)} sx={{ bgcolor: '#22333b', borderRadius: '50px', px: 6, py: 2, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 12px 24px -8px rgba(34,51,59,0.4)', '&:hover': { bgcolor: '#111a1e', boxShadow: '0 16px 32px -8px rgba(34,51,59,0.5)' } }}>
                       Create Template
                     </Button>
                   </div>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((tpl, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[36px] p-8 shadow-[0_8px_32px_rgba(59,34,181,0.04)] hover:shadow-[0_24px_48px_rgba(59,34,181,0.12)] hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 flex flex-col group relative overflow-hidden"
                    >
                      <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/5 rounded-full blur-[50px] group-hover:bg-primary/10 transition-colors duration-500" />
                      
                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f8f9fc] to-white flex items-center justify-center border border-black/5 shadow-inner">
                          <CreditCard className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                          <IconButton 
                            onClick={() => setDeleteConfirm({ isOpen: true, type: 'template', id: tpl.id })}
                            size="small"
                            sx={{ bgcolor: 'rgba(239,68,68,0.05)', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' }, transition: 'all 0.3s' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                          </span>
                        </div>
                      </div>
                      
                      <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', fontFamily: 'Space Grotesk', lineHeight: 1.2, mb: 2, color: '#1c1c28' }}>{tpl.name}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '1px', mb: 6 }}>{tpl.items?.length || 0} Line Items Defined</Typography>
                      
                      <div className="bg-[#f8f9fc] rounded-[24px] p-5 mb-8 space-y-4 border border-[#f0f1f5] flex-1">
                        {tpl.items?.slice(0, 3).map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-[13px] items-center">
                            <span className="text-[#4a4a5e] font-semibold truncate pr-4">{item.description}</span>
                            <span className="font-black text-[#1c1c28]">${item.amount}</span>
                          </div>
                        ))}
                        {tpl.items?.length > 3 && (
                          <div className="text-[11px] font-black text-primary uppercase tracking-widest text-center pt-2">
                            + {tpl.items.length - 3} more items
                          </div>
                        )}
                      </div>
                      
                      <Button variant="outlined" fullWidth sx={{ borderRadius: '50px', fontWeight: 900, py: 2, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', borderColor: 'rgba(59,34,181,0.2)', color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main' } }} onClick={() => setShowGenerator(true)}>
                        Generate from Template
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 2: Automation (Future Phase UI) */}
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
                 
                 <div className="p-6 md:p-8 bg-gradient-to-r from-amber-50 to-[#fffdf7] border border-amber-200/60 rounded-[32px] flex gap-5 mb-4 relative z-10 shadow-sm">
                   <ShieldCheck className="w-8 h-8 text-amber-600 shrink-0" />
                   <div>
                     <Typography sx={{ fontWeight: 900, color: 'amber.900', mb: 1, fontSize: '1.1rem' }}>Coming Soon</Typography>
                     <Typography variant="body1" sx={{ color: 'amber.800', lineHeight: 1.6, fontWeight: 500 }}>
                       The automation engine is currently in development. Soon you will be able to set specific triggers like "Send 5 days before due date" and Property Ledge will handle the entire generation and dispatch sequence automatically.
                     </Typography>
                   </div>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {showTemplateBuilder && <InvoiceTemplateBuilder onClose={() => setShowTemplateBuilder(false)} />}
      {showGenerator && <InvoiceGenerator onClose={() => { setShowGenerator(false); setSelectedInvoice(null); }} initialInvoice={selectedInvoice} />}

      <Dialog
        open={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: 'invoice', id: null })}
        sx={{ '& .MuiDialog-paper': { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontFamily: 'Space Grotesk' }}>
          Delete {deleteConfirm.type === 'invoice' ? 'Invoice' : 'Template'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setDeleteConfirm({ isOpen: false, type: 'invoice', id: null })} 
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
