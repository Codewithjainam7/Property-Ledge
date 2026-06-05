import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Download, Send } from 'lucide-react';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Card } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../utils/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const generatePDFDoc = (selectedProperty: any, selectedTemplate: any, dueDate: string, landlordName = 'Property Landlord') => {
  const doc = new jsPDF();
  const total = selectedTemplate.items.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);
  
  // Base colors
  const darkSlate: [number, number, number] = [28, 43, 51];
  const grayText: [number, number, number] = [74, 74, 94];
  const lightGray: [number, number, number] = [248, 249, 250];
  const mochaGold: [number, number, number] = [169, 146, 125];

  // Premium Left Border Accent
  doc.setFillColor(...mochaGold);
  doc.rect(0, 0, 3, 297, 'F');

  // Top right decorative banner
  doc.setFillColor(34, 51, 59); // Jet black
  doc.triangle(60, 0, 210, 0, 210, 45, 'F');

  // Thank you message inside banner
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(255, 255, 255);
  doc.text('Thank you for your business!', 200, 25, { align: 'right' });

  // Header Logo Circle Graphic
  doc.setFillColor(245, 245, 248);
  doc.circle(22, 25, 10, 'F');

  // Header - Property Ledge
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text('Property Ledge', 15, 25);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text('PROPERTY MANAGEMENT', 15, 31);

  // Accent line under brand
  doc.setDrawColor(...mochaGold);
  doc.setLineWidth(1.5);
  doc.line(15, 36, 45, 36);

  // INVOICE Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 51, 59);
  doc.text('INVOICE', 15, 48);

  // From Section
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text('FROM', 15, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(landlordName, 15, 65);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text('ABN 17 234 567 890', 15, 70);
  doc.text('Property Ledge\nAustralia', 15, 75);

  // Vertical Divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(65, 60, 65, 95);

  // Invoice Sent To Section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text('INVOICE SENT TO', 75, 60);
  doc.setFontSize(10);
  doc.text(selectedProperty.tenantName || 'Tenant Name', 75, 65);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text('ABN 45 678 123 456', 75, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(`Attention: ${selectedProperty.tenantName?.split(' ')[0] || ''}`, 75, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(selectedProperty.address, 75, 80);

  // Invoice Details Box (Right Side)
  doc.setFillColor(...lightGray);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(140, 50, 56, 45, 3, 3, 'FD'); // Fill and stroke
  
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.text('Invoice Date', 145, 57);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(new Date().toLocaleDateString('en-GB'), 191, 57, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text('Invoice No.', 145, 64);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(`INV${Math.floor(1000 + Math.random() * 9000)}`, 191, 64, { align: 'right' }); // Random invoice num

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text('Due Date', 145, 71);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '-', 191, 71, { align: 'right' });

  // AMOUNT DUE Premium Badge
  doc.setFillColor(34, 51, 59); // Jet black
  doc.roundedRect(140, 77, 56, 18, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('AMOUNT DUE', 145, 83);
  doc.setFontSize(14);
  doc.text(`$${formatCurrency(total)}`, 145, 91);

  // Table
  const tableData = selectedTemplate.items.map((item: any) => [
    item.description,
    '1',
    `$${formatCurrency(item.amount)}`,
    `$${formatCurrency(item.amount)}`
  ]);

  autoTable(doc, {
    startY: 110,
    head: [['DESCRIPTION', 'QTY', 'UNIT RATE', 'AMOUNT (AUD)']],
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 9, textColor: darkSlate, cellPadding: 5 },
    headStyles: { 
      fillColor: [34, 51, 59], // Jet Black
      textColor: 255, 
      fontStyle: 'bold', 
      fontSize: 8 
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252] // Very faint gray for alternating rows
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    didDrawCell: (data) => {
      if (data.row.section === 'body') {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 110;

  // Subtotals
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text('Subtotal', 140, finalY + 10);
  doc.setTextColor(...darkSlate);
  doc.text(`$${formatCurrency(total)}`, 195, finalY + 10, { align: 'right' });

  doc.setDrawColor(220, 220, 220);
  doc.line(140, finalY + 15, 195, finalY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DUE', 140, finalY + 22);
  doc.setFontSize(12);
  doc.text(`$${formatCurrency(total)}`, 195, finalY + 22, { align: 'right' });

  // Payment Instructions Box
  doc.setFillColor(...lightGray);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(14, finalY + 30, 182, 45, 4, 4, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text('PAYMENT INSTRUCTIONS', 20, finalY + 40);
  
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.text('Bank Name', 20, finalY + 47);
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text('Commonwealth Bank', 20, finalY + 52);

  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.text('BSB', 90, finalY + 47);
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text('123-456', 90, finalY + 52);

  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.text('Account Name', 20, finalY + 60);
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text(landlordName, 20, finalY + 65);

  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.text('Account Number', 90, finalY + 60);
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text('12345678', 90, finalY + 65);

  // Signature
  doc.setFontSize(28);
  doc.setFont('times', 'italic');
  doc.setTextColor(169, 146, 125); // Mocha/gold
  doc.text('Thank you!', 150, finalY + 55, { angle: -5 });

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 280, 195, 280);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text('ABN 17 234 567 890', 105, 285, { align: 'center' });

  return doc;
};

export function InvoiceGenerator({ onClose, initialInvoice }: { onClose: () => void, initialInvoice?: any }) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [{ data: props }, { data: tpls }] = await Promise.all([
        supabase.from('properties').select('id, address, tenant_name, rent_amount, payment_frequency'),
        supabase.from('invoice_templates').select('*'),
      ]);
      if (props) setProperties(props.map(p => ({ ...p, tenantName: p.tenant_name, rentAmount: p.rent_amount, paymentFrequency: p.payment_frequency })));
      if (tpls) setTemplates(tpls);

      if (initialInvoice) {
        setSelectedPropertyId(initialInvoice.property_id || initialInvoice.propertyId || '');
        setSelectedTemplateId(initialInvoice.template_id || initialInvoice.templateId || '');
        setDueDate(initialInvoice.due_date || initialInvoice.dueDate || '');
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDueDate(d.toISOString().split('T')[0]);
      }
    };
    loadData();
  }, [initialInvoice]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const calculateTotal = () => {
    if (!selectedTemplate) return 0;
    return selectedTemplate.items.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);
  };

  const handleGeneratePDF = async () => {
    if (!selectedProperty || !selectedTemplate) return;

    const landlordName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Property Landlord';
    const doc = generatePDFDoc(selectedProperty, selectedTemplate, dueDate, landlordName);
    const total = calculateTotal();

    // Save PDF locally
    doc.save(`Invoice_${selectedProperty.tenantName?.replace(/\s+/g, '_')}_${Date.now()}.pdf`);

    // Save invoice to Supabase
    await supabase.from('invoices').insert({
      user_id: user?.id,
      property_id: selectedProperty.id,
      template_id: selectedTemplate.id,
      invoice_number: `INV-${Date.now()}`,
      status: 'Unpaid',
      total_amount: total,
      due_date: dueDate,
    });

    onClose();
  };



  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 flex flex-col md:flex-row"
      >
        {/* Left Side - Controls */}
        <div className="p-6 md:p-8 w-full md:w-1/2 border-r border-gray-100 bg-gray-50/50">
          <div className="flex justify-between items-center mb-6 md:hidden">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Generate Invoice</Typography>
            <IconButton onClick={onClose}><X className="w-5 h-5" /></IconButton>
          </div>
          
          <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk', mb: 6, display: { xs: 'none', md: 'block' } }}>
            Generate Invoice
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Select Property / Tenant</InputLabel>
              <Select
                value={selectedPropertyId}
                label="Select Property / Tenant"
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                sx={{ borderRadius: 3, bgcolor: 'white' }}
              >
                {properties.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.address} ({p.tenantName || 'No tenant'})</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Select Template</InputLabel>
              <Select
                value={selectedTemplateId}
                label="Select Template"
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                sx={{ borderRadius: 3, bgcolor: 'white' }}
              >
                {templates.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }}
            />
          </Box>
        </div>

        {/* Right Side - Preview */}
        <div className="p-6 md:p-8 w-full md:w-1/2 flex flex-col">
          <div className="flex justify-end mb-6 hidden md:flex">
             <IconButton onClick={onClose} sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}><X className="w-5 h-5" /></IconButton>
          </div>
          
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Invoice Preview
          </Typography>

          <Card sx={{ flex: 1, borderRadius: '40px', border: '1px solid #ededf1', p: { xs: 4, md: 6 }, mb: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }} elevation={0}>
            {selectedProperty && selectedTemplate ? (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <Typography sx={{ fontWeight: 900, color: '#1c2b33', letterSpacing: '-1px', fontSize: '1.2rem' }}>Property Ledge</Typography>
                    <Typography sx={{ color: '#4a4a5e', fontSize: '0.85rem' }}>PROPERTY MANAGEMENT</Typography>
                  </div>
                  <div className="text-right">
                    <Typography sx={{ color: '#1c2b33', fontStyle: 'italic', fontSize: '0.9rem' }}>Thank you for your business!</Typography>
                  </div>
                </div>

                <Typography variant="h3" sx={{ fontWeight: 900, mb: 8, color: '#1c2b33', letterSpacing: '-1px' }}>INVOICE</Typography>
                
                <div className="flex flex-wrap justify-between items-start mb-8 gap-6">
                  <div>
                    <Typography sx={{ fontWeight: 900, color: '#1c2b33', mb: 2, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>From</Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: '#1c2b33', mb: 0.5 }}>
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Property Landlord'}
                    </Typography>
                    <Typography sx={{ color: '#4a4a5e', fontSize: '0.85rem', mb: 2 }}>{user?.email}</Typography>
                    <Typography sx={{ color: '#4a4a5e', fontSize: '0.85rem' }}>Property Ledge<br/>Australia</Typography>
                  </div>
                  
                  <div>
                    <Typography sx={{ fontWeight: 900, color: '#1c2b33', mb: 2, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Invoice Sent To</Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: '#1c2b33', mb: 0.5 }}>{selectedProperty.tenantName || 'Tenant Name'}</Typography>
                    <Typography sx={{ color: '#4a4a5e', fontSize: '0.85rem', mb: 2 }}>ABN 45 678 123 456</Typography>
                    <Typography sx={{ color: '#4a4a5e', fontSize: '0.85rem', fontWeight: 600 }}>Attention: {selectedProperty.tenantName?.split(' ')[0]}</Typography>
                    <Typography sx={{ color: '#4a4a5e', fontSize: '0.85rem', mt: 2 }}>{selectedProperty.address}</Typography>
                  </div>

                  <div className="bg-[#f8f9fa] rounded-2xl p-5 border border-[#ededf1] min-w-[220px]">
                    <div className="flex justify-between mb-3">
                      <Typography sx={{ fontSize: '0.85rem', color: '#4a4a5e' }}>Invoice Date</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{new Date().toLocaleDateString('en-GB')}</Typography>
                    </div>
                    <div className="flex justify-between mb-3">
                      <Typography sx={{ fontSize: '0.85rem', color: '#4a4a5e' }}>Invoice Number</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>INV0020</Typography>
                    </div>
                    <div className="flex justify-between mb-5 pb-5 border-b border-[#ededf1]">
                      <Typography sx={{ fontSize: '0.85rem', color: '#4a4a5e' }}>Due Date</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '-'}</Typography>
                    </div>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 900, color: '#1c2b33', mb: 0.5 }}>AMOUNT DUE (AUD)</Typography>
                    <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#1c2b33' }}>${formatCurrency(calculateTotal())}</Typography>
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-[32px] p-6 pb-8 border border-gray-200/50">
                  <div className="flex justify-between items-center px-4 mb-4 pb-2 border-b border-gray-200/50">
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: '#1c2b33', textTransform: 'uppercase' }}>Description</Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: '#1c2b33', textTransform: 'uppercase' }}>Amount (AUD)</Typography>
                  </div>
                  <div className="space-y-4 mb-6 px-4">
                    {selectedTemplate.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center pb-4 border-b border-gray-200/40 last:border-0">
                        <Typography sx={{ color: '#4a4a5e', fontSize: '0.95rem' }}>{item.description}</Typography>
                        <Typography sx={{ fontWeight: 500, color: '#1c2b33', fontSize: '0.95rem' }}>${formatCurrency(item.amount)}</Typography>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-end px-4 pt-4 border-t border-gray-200/60">
                    <div className="flex justify-between w-[250px] mb-4">
                      <Typography sx={{ color: '#4a4a5e', fontSize: '0.95rem' }}>Subtotal</Typography>
                      <Typography sx={{ color: '#1c2b33', fontSize: '0.95rem' }}>${formatCurrency(calculateTotal())}</Typography>
                    </div>
                    <div className="flex justify-between w-[250px] pt-4 border-t border-gray-200/60">
                      <Typography sx={{ fontWeight: 900, color: '#1c2b33', fontSize: '0.95rem' }}>TOTAL AMOUNT DUE</Typography>
                      <Typography sx={{ fontWeight: 900, color: '#1c2b33', fontSize: '1.2rem' }}>${formatCurrency(calculateTotal())}</Typography>
                    </div>
                  </div>
                </div>

                {/* payment instructions */}
                <div className="mt-10 pt-8 border-t border-gray-200/60">
                   <Typography sx={{ fontWeight: 900, color: '#1c2b33', mb: 4, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Instructions</Typography>
                   <div className="grid grid-cols-2 gap-6 max-w-md">
                     <div>
                       <Typography sx={{ fontSize: '0.75rem', color: '#4a4a5e', fontWeight: 'bold', mb: 0.5 }}>Bank Name</Typography>
                       <Typography sx={{ fontSize: '0.85rem', color: '#1c2b33' }}>Commonwealth Bank</Typography>
                     </div>
                     <div>
                       <Typography sx={{ fontSize: '0.75rem', color: '#4a4a5e', fontWeight: 'bold', mb: 0.5 }}>BSB</Typography>
                       <Typography sx={{ fontSize: '0.85rem', color: '#1c2b33' }}>123-456</Typography>
                     </div>
                     <div>
                       <Typography sx={{ fontSize: '0.75rem', color: '#4a4a5e', fontWeight: 'bold', mb: 0.5 }}>Account Name</Typography>
                       <Typography sx={{ fontSize: '0.85rem', color: '#1c2b33' }}>
                         {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Landlord'}
                       </Typography>
                     </div>
                     <div>
                       <Typography sx={{ fontSize: '0.75rem', color: '#4a4a5e', fontWeight: 'bold', mb: 0.5 }}>Account Number</Typography>
                       <Typography sx={{ fontSize: '0.85rem', color: '#1c2b33' }}>12345678</Typography>
                     </div>
                   </div>
                </div>
                <div className="mt-8 text-center border-t border-gray-200/60 pt-4">
                  <Typography sx={{ fontSize: '0.75rem', color: '#a0a0ab', letterSpacing: '2px' }}>ABN 17 234 567 890</Typography>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400">
                <Typography>Select a property and template to see preview.</Typography>
              </div>
            )}
          </Card>

          <div className="flex gap-3">
             <Button 
              variant="outlined" 
              fullWidth 
              startIcon={<Send className="w-4 h-4" />}
              disabled={!selectedProperty || !selectedTemplate}
              sx={{ borderRadius: '50px', py: 1.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}
            >
              Send Email
            </Button>
            <Button 
              variant="contained" 
              fullWidth 
              startIcon={<Download className="w-4 h-4" />}
              disabled={!selectedProperty || !selectedTemplate}
              onClick={handleGeneratePDF}
              disableElevation
              sx={{ borderRadius: '50px', py: 1.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', boxShadow: '0 8px 16px -4px rgba(59,34,181,0.2)' }}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
