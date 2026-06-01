import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Send } from 'lucide-react';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Card } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function InvoiceGenerator({ onClose }: { onClose: () => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    setProperties(JSON.parse(localStorage.getItem('properties') || '[]'));
    setTemplates(JSON.parse(localStorage.getItem('invoice_templates') || '[]'));
    
    // Set default due date to 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const calculateTotal = () => {
    if (!selectedTemplate) return 0;
    return selectedTemplate.items.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);
  };

  const handleGeneratePDF = () => {
    if (!selectedProperty || !selectedTemplate) return;

    const doc = new jsPDF();
    const total = calculateTotal();
    
    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 34, 181); // Primary color
    doc.text('INVOICE', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('PropertyLedge automated billing', 14, 32);

    // Dates & Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 140, 25);
    doc.text(`Due Date: ${new Date(dueDate).toLocaleDateString()}`, 140, 32);
    doc.text(`Invoice #: INV-${Date.now().toString().slice(-6)}`, 140, 39);

    // Billed To
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedProperty.tenantName || 'Tenant Name', 14, 57);
    doc.text(selectedProperty.address, 14, 64);
    doc.text(`${selectedProperty.suburb}, ${selectedProperty.state} ${selectedProperty.postcode}`, 14, 71);

    // Table
    const tableData = selectedTemplate.items.map((item: any) => [
      item.description,
      `$${parseFloat(item.amount).toFixed(2)}`
    ]);

    (doc as any).autoTable({
      startY: 85,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 34, 181] },
      foot: [['Total', `$${total.toFixed(2)}`]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Save PDF
    doc.save(`Invoice_${selectedProperty.tenantName?.replace(/\s+/g, '_')}_${Date.now()}.pdf`);

    // Save to localStorage
    const generated = JSON.parse(localStorage.getItem('generated_invoices') || '[]');
    generated.push({
      id: Date.now().toString(),
      tenantName: selectedProperty.tenantName,
      propertyName: selectedProperty.address,
      dueDate,
      totalAmount: total.toFixed(2),
      status: 'Sent', // Auto marking as sent for MVP
      templateId: selectedTemplate.id,
      propertyId: selectedProperty.id,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('generated_invoices', JSON.stringify(generated));
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

          <div className="space-y-5">
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
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }}
            />
          </div>
        </div>

        {/* Right Side - Preview */}
        <div className="p-6 md:p-8 w-full md:w-1/2 flex flex-col">
          <div className="flex justify-end mb-6 hidden md:flex">
             <IconButton onClick={onClose} sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}><X className="w-5 h-5" /></IconButton>
          </div>
          
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Invoice Preview
          </Typography>

          <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid #ededf1', p: 4, mb: 4 }} elevation={0}>
            {selectedProperty && selectedTemplate ? (
              <div>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 900, mb: 4 }}>INVOICE</Typography>
                
                <div className="flex justify-between mb-6">
                  <div>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Billed To:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{selectedProperty.tenantName}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedProperty.address}</Typography>
                  </div>
                  <div className="text-right">
                    <Typography variant="body2" color="text.secondary">Due Date:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{new Date(dueDate).toLocaleDateString()}</Typography>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                  {selectedTemplate.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between p-3 border-b border-gray-100 last:border-0">
                      <Typography variant="body2">{item.description}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>${parseFloat(item.amount).toFixed(2)}</Typography>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 bg-gray-100/50">
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Total Due</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: '900', color: 'primary.main' }}>${calculateTotal().toFixed(2)}</Typography>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center opacity-50">
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
    </div>
  );
}
