import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { Box, Typography, Button, TextField, IconButton, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, Chip } from '@mui/material';
interface TemplateItem {
  description: string;
  amount: string;
}

export function InvoiceTemplateBuilder({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<TemplateItem[]>([{ description: 'Rent', amount: '' }]);
  const [properties, setProperties] = useState<any[]>([]);
  const [linkedProperties, setLinkedProperties] = useState<string[]>([]);

  React.useEffect(() => {
    const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
    setProperties(loadedProps);
  }, []);

  const handleAddItem = () => {
    setItems([...items, { description: '', amount: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof TemplateItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSave = () => {
    if (!name.trim() || items.some(i => !i.description.trim() || !i.amount.trim())) {
      alert("Please fill in all fields.");
      return;
    }
    const templates = JSON.parse(localStorage.getItem('invoice_templates') || '[]');
    templates.push({ id: Date.now().toString(), name, items, linkedProperties });
    localStorage.setItem('invoice_templates', JSON.stringify(templates));
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20"
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk' }}>
              Create Invoice Template
            </Typography>
            <IconButton onClick={onClose} sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}>
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          <div className="flex flex-col gap-6">
            <TextField 
              label="Template Name" 
              placeholder="e.g. Monthly Rent + Water"
              fullWidth 
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />

            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
              <InputLabel>Linked Properties (Optional)</InputLabel>
              <Select
                multiple
                value={linkedProperties}
                onChange={(e) => setLinkedProperties(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                input={<OutlinedInput label="Linked Properties (Optional)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const prop = properties.find(p => p.id === value);
                      return <Chip key={value} label={prop ? prop.address : value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {properties.map((prop) => (
                  <MenuItem key={prop.id} value={prop.id}>
                    <Checkbox checked={linkedProperties.indexOf(prop.id) > -1} />
                    <ListItemText primary={prop.address} secondary={prop.tenant?.name || 'No tenant'} />
                  </MenuItem>
                ))}
                {properties.length === 0 && (
                  <MenuItem disabled>No properties available</MenuItem>
                )}
              </Select>
            </FormControl>

            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>Line Items</Typography>
              
              <div className="space-y-3 mb-4">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3">
                    <TextField 
                      placeholder="Description (e.g. Rent)" 
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField 
                      placeholder="Amount ($)" 
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      sx={{ width: 150, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      size="small"
                      type="number"
                    />
                    <IconButton 
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      sx={{ color: 'error.main', opacity: items.length === 1 ? 0.3 : 1 }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </IconButton>
                  </div>
                ))}
              </div>

              <Button 
                variant="outlined" 
                startIcon={<Plus className="w-4 h-4" />}
                onClick={handleAddItem}
                sx={{ borderRadius: '50px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', px: 3 }}
              >
                Add Line Item
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/30 flex justify-end gap-3">
          <Button onClick={onClose} sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', px: 3, borderRadius: '50px' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disableElevation sx={{ borderRadius: '50px', px: 5, py: 1.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 8px 16px -4px rgba(34,51,59,0.2)' }}>
            Save Template
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
