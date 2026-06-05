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

export const generatePDFDoc = (selectedProperty: any, selectedTemplate: any, dueDate: string, landlordName = 'Landlord', landlordEmail = '') => {
  const doc = new jsPDF();
  const total = selectedTemplate.items.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);

  // ── Brand palette ──────────────────────────────────────────────────────────
  const ink: [number, number, number]       = [22, 33, 41];      // #162129 — deepest text
  const slate: [number, number, number]     = [34, 51, 59];      // #22333b — primary brand dark
  const accent: [number, number, number]    = [59, 130, 246];    // blue-500 accent strip
  const muted: [number, number, number]     = [100, 116, 130];   // muted label text
  const border: [number, number, number]    = [226, 232, 240];   // light divider
  const bg: [number, number, number]        = [248, 250, 252];   // subtle section bg
  const white: [number, number, number]     = [255, 255, 255];

  const W = 210, H = 297; // A4 mm

  // ── Background ─────────────────────────────────────────────────────────────
  doc.setFillColor(...white);
  doc.rect(0, 0, W, H, 'F');

  // ── Left accent bar (brand colour) ─────────────────────────────────────────
  doc.setFillColor(...accent);
  doc.rect(0, 0, 4, H, 'F');

  // ── Header block ──────────────────────────────────────────────────────────
  doc.setFillColor(...slate);
  doc.rect(4, 0, W - 4, 52, 'F');

  // Brand name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('Property Ledge', 16, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 210);
  doc.text('PROPERTY MANAGEMENT', 16, 29);

  // "INVOICE" on the right of header
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('INVOICE', 195, 28, { align: 'right' });

  // Invoice number + date under INVOICE
  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 210);
  doc.text(`No. ${invoiceNo}`, 195, 36, { align: 'right' });
  doc.text(`Issued: ${new Date().toLocaleDateString('en-GB')}`, 195, 43, { align: 'right' });

  // ── FROM / BILL TO two-column ───────────────────────────────────────────────
  const colY = 68;

  // FROM
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...muted);
  doc.text('FROM', 16, colY);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ink);
  doc.text(landlordName, 16, colY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  if (landlordEmail) doc.text(landlordEmail, 16, colY + 14);
  doc.text('Property Ledge — Australia', 16, colY + 21);

  // BILL TO
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...muted);
  doc.text('BILL TO', 100, colY);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ink);
  doc.text(selectedProperty.tenantName || 'Tenant', 100, colY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text(selectedProperty.address || '', 100, colY + 14);

  // ── DUE DATE / AMOUNT pill (right side) ───────────────────────────────────
  doc.setFillColor(...bg);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.roundedRect(140, 60, 58, 38, 3, 3, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...muted);
  doc.text('DUE DATE', 169, 68, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ink);
  doc.text(dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '—', 169, 75, { align: 'center' });

  // divider inside box
  doc.setDrawColor(...border);
  doc.line(144, 80, 194, 80);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...muted);
  doc.text('AMOUNT DUE (AUD)', 169, 87, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text(`$${formatCurrency(total)}`, 169, 95, { align: 'center' });

  // ── Horizontal rule ────────────────────────────────────────────────────────
  doc.setDrawColor(...border);
  doc.setLineWidth(0.4);
  doc.line(16, 106, 194, 106);

  // ── Line items table ───────────────────────────────────────────────────────
  const tableData = selectedTemplate.items.map((item: any) => [
    item.description,
    '1',
    `$${formatCurrency(item.amount)}`,
    `$${formatCurrency(item.amount)}`
  ]);

  autoTable(doc, {
    startY: 112,
    head: [['DESCRIPTION', 'QTY', 'UNIT RATE', 'TOTAL']],
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 9, textColor: ink as any, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 } },
    headStyles: {
      fillColor: slate as any,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: bg as any },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 }
    },
  });

  const tableEnd = (doc as any).lastAutoTable.finalY || 140;

  // ── Totals block ──────────────────────────────────────────────────────────
  const totY = tableEnd + 8;
  doc.setDrawColor(...border);
  doc.line(130, totY, 194, totY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text('Subtotal', 130, totY + 8);
  doc.setTextColor(...ink);
  doc.text(`$${formatCurrency(total)}`, 194, totY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text('GST (0%)', 130, totY + 16);
  doc.setTextColor(...ink);
  doc.text('$0.00', 194, totY + 16, { align: 'right' });

  // Total due row — highlighted
  doc.setFillColor(...slate);
  doc.roundedRect(126, totY + 21, 72, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('TOTAL DUE', 131, totY + 29);
  doc.text(`$${formatCurrency(total)}`, 194, totY + 29, { align: 'right' });

  // ── Payment instructions ───────────────────────────────────────────────────
  const payY = totY + 42;
  doc.setFillColor(...bg);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.roundedRect(16, payY, 90, 38, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('PAYMENT INSTRUCTIONS', 21, payY + 8);

  const pi: Array<[string, string]> = [
    ['Bank', 'Please use bank transfer'],
    ['Reference', `${selectedProperty.tenantName || 'Tenant'} — ${invoiceNo}`],
    ['Due', dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '—'],
  ];
  pi.forEach(([label, value], i) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(label, 21, payY + 16 + i * 8);
    doc.setTextColor(...ink);
    doc.text(value, 21 + 22, payY + 16 + i * 8);
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...slate);
  doc.rect(0, H - 16, W, 16, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 210);
  doc.text(`${landlordName}  ·  Property Ledge  ·  propertyledge.vercel.app`, W / 2, H - 7, { align: 'center' });

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
    const landlordEmail = user?.email || '';
    const doc = generatePDFDoc(selectedProperty, selectedTemplate, dueDate, landlordName, landlordEmail);
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
              <div className="bg-white text-[#162129]">
                {/* Header */}
                <div className="bg-[#22333b] text-white p-6 -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-8 flex justify-between items-start rounded-t-3xl">
                  <div>
                    <Typography sx={{ fontWeight: 900, letterSpacing: '-1px', fontSize: '1.4rem' }}>Property Ledge</Typography>
                    <Typography sx={{ color: '#b4c8d2', fontSize: '0.75rem', letterSpacing: '1px' }}>PROPERTY MANAGEMENT</Typography>
                  </div>
                  <div className="text-right">
                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-1px' }}>INVOICE</Typography>
                    <Typography sx={{ color: '#b4c8d2', fontSize: '0.75rem' }}>No. INV-{Date.now().toString().slice(-6)}</Typography>
                    <Typography sx={{ color: '#b4c8d2', fontSize: '0.75rem' }}>Issued: {new Date().toLocaleDateString('en-GB')}</Typography>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
                  {/* From & Bill To */}
                  <div className="flex-1 grid grid-cols-2 gap-6">
                    <div>
                      <Typography sx={{ fontWeight: 900, color: '#647482', mb: 1.5, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>From</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#162129', mb: 0.5 }}>
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Property Landlord'}
                      </Typography>
                      <Typography sx={{ color: '#647482', fontSize: '0.8rem', mb: 1 }}>{user?.email}</Typography>
                      <Typography sx={{ color: '#647482', fontSize: '0.8rem' }}>Property Ledge — Australia</Typography>
                    </div>
                    
                    <div>
                      <Typography sx={{ fontWeight: 900, color: '#647482', mb: 1.5, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Bill To</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#162129', mb: 0.5 }}>{selectedProperty.tenantName || 'Tenant Name'}</Typography>
                      <Typography sx={{ color: '#647482', fontSize: '0.8rem' }}>{selectedProperty.address}</Typography>
                    </div>
                  </div>

                  {/* Due Date / Amount Pill */}
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 min-w-[180px] text-center">
                    <Typography sx={{ fontSize: '0.7rem', color: '#647482', fontWeight: 900, mb: 1 }}>DUE DATE</Typography>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: '#162129', mb: 3 }}>
                      {dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '—'}
                    </Typography>
                    
                    <div className="border-t border-[#e2e8f0] pt-3 mb-1">
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: '#647482' }}>AMOUNT DUE (AUD)</Typography>
                    </div>
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#22333b' }}>${formatCurrency(calculateTotal())}</Typography>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-8 border-b border-[#e2e8f0]">
                  <div className="flex bg-[#22333b] text-white px-4 py-2 text-xs font-bold rounded-md mb-2">
                    <div className="flex-1">DESCRIPTION</div>
                    <div className="w-16 text-center">QTY</div>
                    <div className="w-24 text-right">UNIT RATE</div>
                    <div className="w-24 text-right">TOTAL</div>
                  </div>
                  <div className="px-2">
                    {selectedTemplate.items.map((item: any, i: number) => (
                      <div key={i} className="flex py-3 border-b border-[#f1f5f9] last:border-0 text-sm">
                        <div className="flex-1 text-[#162129]">{item.description}</div>
                        <div className="w-16 text-center text-[#647482]">1</div>
                        <div className="w-24 text-right text-[#647482]">${formatCurrency(item.amount)}</div>
                        <div className="w-24 text-right font-medium">${formatCurrency(item.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-10">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-sm">
                      <Typography sx={{ color: '#647482' }}>Subtotal</Typography>
                      <Typography sx={{ color: '#162129' }}>${formatCurrency(calculateTotal())}</Typography>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <Typography sx={{ color: '#647482' }}>GST (0%)</Typography>
                      <Typography sx={{ color: '#162129' }}>$0.00</Typography>
                    </div>
                    <div className="flex justify-between py-3 px-4 mt-2 bg-[#22333b] text-white rounded-lg items-center">
                      <Typography sx={{ fontWeight: 900, fontSize: '0.9rem' }}>TOTAL DUE</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>${formatCurrency(calculateTotal())}</Typography>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions & Footer */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-6 border-t border-[#e2e8f0]">
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 flex-1 max-w-sm">
                     <Typography sx={{ fontWeight: 900, color: '#22333b', mb: 2, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Instructions</Typography>
                     <div className="space-y-2">
                       <div className="flex">
                         <Typography sx={{ width: '80px', fontSize: '0.75rem', color: '#647482' }}>Bank</Typography>
                         <Typography sx={{ fontSize: '0.75rem', color: '#162129', fontWeight: 500 }}>Please use bank transfer</Typography>
                       </div>
                       <div className="flex">
                         <Typography sx={{ width: '80px', fontSize: '0.75rem', color: '#647482' }}>Reference</Typography>
                         <Typography sx={{ fontSize: '0.75rem', color: '#162129', fontWeight: 500 }}>{selectedProperty.tenantName || 'Tenant'} — INV-{Date.now().toString().slice(-6)}</Typography>
                       </div>
                       <div className="flex">
                         <Typography sx={{ width: '80px', fontSize: '0.75rem', color: '#647482' }}>Due</Typography>
                         <Typography sx={{ fontSize: '0.75rem', color: '#162129', fontWeight: 500 }}>{dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '—'}</Typography>
                       </div>
                     </div>
                  </div>
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
