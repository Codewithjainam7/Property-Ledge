import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { Box, Typography, Button, TextField, IconButton, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, Chip } from '@mui/material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TemplateItem {
  description: string;
  amount: string;
}

export function InvoiceTemplateBuilder({ onClose }: { onClose: () => void }) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [items, setItems] = useState<TemplateItem[]>([{ description: 'Rent', amount: '' }]);
  const [properties, setProperties] = useState<any[]>([]);
  const [linkedProperties, setLinkedProperties] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    const loadProperties = async () => {
      const { data } = await supabase.from('properties').select('id, address');
      if (data) setProperties(data);
    };
    loadProperties();
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

  const handleSave = async () => {
    if (!name.trim() || items.some(i => !i.description.trim() || !i.amount.trim())) {
      alert("Please fill in all fields.");
      return;
    }
    if (!session?.user?.id) return;

    setIsSaving(true);
    const { error } = await supabase.from('invoice_templates').insert({
      user_id: session.user.id,
      name,
      items: items as any,
    });

    if (error) {
      alert(`Failed to save template: ${error.message}`);
    } else {
      onClose();
    }
    setIsSaving(false);
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
            <IconButton onClick={onClose}><X /></IconButton>
          </div>

          <TextField
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Line Items</Typography>
          {items.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <TextField
                label="Description"
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                sx={{ flex: 2 }}
                size="small"
              />
              <TextField
                label="Amount ($)"
                value={item.amount}
                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                type="number"
                sx={{ flex: 1 }}
                size="small"
              />
              <IconButton onClick={() => handleRemoveItem(index)} color="error" disabled={items.length === 1}>
                <Trash2 size={16} />
              </IconButton>
            </Box>
          ))}

          <Button startIcon={<Plus size={16} />} onClick={handleAddItem} sx={{ mb: 3, textTransform: 'none' }}>
            Add Line Item
          </Button>

          {properties.length > 0 && (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Link to Properties (optional)</InputLabel>
              <Select
                multiple
                value={linkedProperties}
                onChange={(e) => setLinkedProperties(e.target.value as string[])}
                input={<OutlinedInput label="Link to Properties (optional)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((v) => (
                      <Chip key={v} label={properties.find(p => p.id === v)?.address || v} size="small" />
                    ))}
                  </Box>
                )}
              >
                {properties.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Checkbox checked={linkedProperties.indexOf(p.id) > -1} />
                    <ListItemText primary={p.address} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '50px' }}>Cancel</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={isSaving}
              sx={{ borderRadius: '50px', fontWeight: 700 }}
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </Box>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
