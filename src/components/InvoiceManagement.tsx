import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { motion } from 'framer-motion';
import { Plus, FileText, Settings, CreditCard, ChevronRight, Calendar, Bell, ShieldCheck, Clock } from 'lucide-react';
import { Box, Typography, Button, Tabs, Tab, Card, CardContent, Chip, IconButton } from '@mui/material';
import { InvoiceTemplateBuilder } from './InvoiceTemplateBuilder';
import { InvoiceGenerator } from './InvoiceGenerator';

export function InvoiceManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full mt-20 md:mt-0 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk', letterSpacing: '-0.5px' }}>
              Billing & Invoices
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage templates, generate invoices, and automate rent collection.
            </Typography>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button 
              variant="outlined" 
              startIcon={<Settings className="w-4 h-4" />}
              sx={{ borderRadius: '50px', fontWeight: 'bold', px: 4, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem' }}
            >
              Settings
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowTemplateBuilder(true)}
              disableElevation
              sx={{ borderRadius: '50px', fontWeight: 'bold', px: 4, py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem', boxShadow: '0 8px 16px -4px rgba(59,34,181,0.2)' }}
            >
              New Template
            </Button>
          </div>
        </div>

        {/* Custom Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 6 }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{
            '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 3, borderRadius: '3px 3px 0 0' },
            '& .MuiTab-root': { textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', fontSize: '0.875rem', minWidth: 120, py: 3 }
          }}>
            <Tab label="Invoices" icon={<FileText className="w-4 h-4 mb-1" />} iconPosition="start" />
            <Tab label="Templates" icon={<CreditCard className="w-4 h-4 mb-1" />} iconPosition="start" />
            <Tab label="Automation" icon={<Calendar className="w-4 h-4 mb-1" />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab 0: Generated Invoices */}
        {activeTab === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {invoices.length === 0 ? (
              <Card sx={{ borderRadius: 5, p: { xs: 4, md: 8 }, textAlign: 'center', bgcolor: 'rgba(59, 34, 181, 0.02)', border: '1px dashed rgba(59, 34, 181, 0.2)' }} elevation={0}>
                <div className="w-20 h-20 rounded-[24px] bg-white flex items-center justify-center mx-auto mb-6 shadow-sm border border-outline-variant/30">
                  <FileText className="w-10 h-10 text-primary/40" />
                </div>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, fontFamily: 'Space Grotesk' }}>No Invoices Yet</Typography>
                <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                  You haven't generated any invoices. Create a template first, then generate an invoice for your tenants.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => setShowGenerator(true)}
                  disabled={templates.length === 0}
                  disableElevation
                  sx={{ borderRadius: '50px', px: 6, py: 1.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 8px 16px -4px rgba(59,34,181,0.2)' }}
                >
                  Generate Invoice
                </Button>
                {templates.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 3, fontWeight: 'bold' }}>
                    * You need to create a template first.
                  </Typography>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk' }}>All Invoices</Typography>
                  <Button onClick={() => setShowGenerator(true)} variant="contained" size="small" disableElevation sx={{ borderRadius: '50px', fontWeight: 'bold', px: 3, py: 1, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', boxShadow: '0 4px 12px -4px rgba(59,34,181,0.2)' }}>Generate New</Button>
                </div>
                {invoices.map((inv, idx) => (
                  <Card key={idx} sx={{ borderRadius: 4, border: '1px solid #ededf1', mb: 3, transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', boxShadow: '0 12px 32px -12px rgba(59,34,181,0.1)' } }} elevation={0}>
                    <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, p: '24px !important', gap: 3 }}>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                          <FileText className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <Typography sx={{ fontWeight: 900, fontSize: '1.125rem' }}>{inv.tenantName}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{inv.propertyName}</Typography>
                          <div className="flex items-center gap-3">
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>DUE: {inv.dueDate}</Typography>
                            <Chip label={inv.status || 'Draft'} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', bgcolor: inv.status === 'Sent' ? 'success.light' : 'warning.light', color: inv.status === 'Sent' ? 'success.dark' : 'warning.dark' }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', fontFamily: 'Space Grotesk' }}>${inv.totalAmount}</Typography>
                        <IconButton sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}><ChevronRight className="w-5 h-5 text-gray-500" /></IconButton>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 1: Templates */}
        {activeTab === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {templates.length === 0 ? (
               <Card sx={{ borderRadius: 5, p: { xs: 4, md: 8 }, textAlign: 'center', bgcolor: 'rgba(59, 34, 181, 0.02)', border: '1px dashed rgba(59, 34, 181, 0.2)' }} elevation={0}>
                 <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, fontFamily: 'Space Grotesk' }}>Create Your First Template</Typography>
                 <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                   Templates allow you to define line items (Rent, Water, Council rates) that can be easily reused.
                 </Typography>
                 <Button variant="contained" disableElevation onClick={() => setShowTemplateBuilder(true)} sx={{ borderRadius: '50px', px: 6, py: 1.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 8px 16px -4px rgba(59,34,181,0.2)' }}>
                   Create Template
                 </Button>
               </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((tpl, idx) => (
                  <Card key={idx} sx={{ borderRadius: 5, border: '1px solid #ededf1', p: 4, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { borderColor: 'primary.main', boxShadow: '0 24px 48px -12px rgba(59,34,181,0.12)', transform: 'translateY(-4px)' } }} elevation={0}>
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.25rem', fontFamily: 'Space Grotesk', lineHeight: 1.2 }}>{tpl.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tpl.items?.length || 0} Line Items</Typography>
                      </div>
                      <Chip label="ACTIVE" size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', bgcolor: 'success.light', color: 'success.dark' }} />
                    </div>
                    <div className="bg-surface-container-lowest rounded-2xl p-4 mb-6 space-y-3 border border-outline-variant/30">
                      {tpl.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm items-center">
                          <span className="text-on-surface-variant font-medium">{item.description}</span>
                          <span className="font-bold text-on-surface">${item.amount}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outlined" fullWidth sx={{ borderRadius: '50px', fontWeight: 'bold', py: 1.5, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }} onClick={() => setShowGenerator(true)}>
                      Generate from Template
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 2: Automation (Future Phase UI) */}
        {activeTab === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <Card sx={{ borderRadius: 4, p: 4, border: '1px solid #ededf1' }} elevation={0}>
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                   <Clock className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                   <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Automated Sending</Typography>
                   <Typography variant="body2" color="text.secondary">Configure when invoices should be sent automatically.</Typography>
                 </div>
               </div>
               
               <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 mb-6">
                 <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
                 <Typography variant="body2" color="text.secondary" sx={{ color: 'amber.800' }}>
                   <strong>Coming Soon:</strong> The automation engine is currently in development. Soon you will be able to set "Send 5 days before due date" and Property Ledge will handle the rest.
                 </Typography>
               </div>
             </Card>
          </motion.div>
        )}

      </div>

      {showTemplateBuilder && <InvoiceTemplateBuilder onClose={() => setShowTemplateBuilder(false)} />}
      {showGenerator && <InvoiceGenerator onClose={() => setShowGenerator(false)} />}

    </DashboardLayout>
  );
}
