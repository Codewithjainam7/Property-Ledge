// src/components/PropertyOnboarding.tsx
import React, { useState } from 'react';
import { 
  Stepper, Step, StepLabel, Button, Typography, 
  TextField, Box, Paper, Select, MenuItem, InputLabel, FormControl,
  ThemeProvider, createTheme, CssBaseline, LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';

import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#22333b',
    },
    secondary: {
      main: '#a9927d',
    },
    background: {
      default: '#f2f4f3',
      paper: '#ffffff',
    },
    text: {
      primary: '#0a0908',
      secondary: '#22333b'
    }
  },
  typography: {
    fontFamily: '"Space Grotesk", "Outfit", "Inter", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 'bold',
      letterSpacing: '0.5px'
    }
  },
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true
      }
    },
    MuiFormControl: {
      defaultProps: {
        fullWidth: true
      }
    }
  }
});

const steps = ['Property Location', 'Property Image', 'Financial Setup', 'Tenant Verification', 'Final Review'];

export function PropertyOnboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  const [formData, setFormData] = useState({
    address: '',
    suburb: '',
    postcode: '',
    state: '',
    propertyType: '',
    image: '',
    rentAmount: '',
    paymentFrequency: 'Weekly',
    tenantName: '',
    tenantEmail: '',
    leaseStart: '',
    leaseDuration: '12'
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!formData.address.trim() || !formData.suburb.trim() || !formData.postcode.trim() || !formData.state || !formData.propertyType) {
        alert("Please fill in all mandatory property location fields.");
        return;
      }
    }
    if (activeStep === 1 && !formData.image.trim()) {
      alert("Property Image is a mandatory field. Please provide an image URL.");
      return;
    }
    if (activeStep === 2) {
      if (!formData.rentAmount.trim() || !formData.paymentFrequency) {
        alert("Please provide the rent amount and payment frequency.");
        return;
      }
    }

    if (activeStep === steps.length - 1) {
      if (!session?.user?.id) {
        alert("You must be logged in to add a property.");
        return;
      }

      setIsSubmitting(true);
      try {
        const propertyIdStr = 'PL-' + Math.floor(1000 + Math.random() * 9000).toString();
        
        // 1. Insert Property
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .insert({
            user_id: session.user.id,
            property_id: propertyIdStr,
            address: formData.address,
            suburb: formData.suburb,
            postcode: formData.postcode,
            state: formData.state,
            property_type: formData.propertyType,
            image: formData.image, // Base64 image
            rent_amount: Number(formData.rentAmount),
            payment_frequency: formData.paymentFrequency,
            tenant_name: formData.tenantName,
            tenant_email: formData.tenantEmail,
            lease_start: formData.leaseStart || null,
            lease_duration: formData.leaseDuration ? Number(formData.leaseDuration) : null
          })
          .select()
          .single();

        if (propertyError) throw propertyError;

        // 2. Insert Tenant (if details provided)
        if (formData.tenantName) {
          const names = formData.tenantName.split(' ');
          const firstName = names[0];
          const lastName = names.slice(1).join(' ') || 'Unknown';

          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .insert({
              user_id: session.user.id,
              first_name: firstName,
              last_name: lastName,
              email: formData.tenantEmail || null
            })
            .select()
            .single();

          if (tenantError) throw tenantError;

          // 3. Insert Lease
          if (formData.leaseStart && propertyData && tenantData) {
            let endDate = null;
            if (formData.leaseDuration && Number(formData.leaseDuration) > 0) {
              const start = new Date(formData.leaseStart);
              start.setMonth(start.getMonth() + Number(formData.leaseDuration));
              endDate = start.toISOString().split('T')[0];
            }

            const { error: leaseError } = await supabase
              .from('leases')
              .insert({
                user_id: session.user.id,
                property_id: propertyData.id,
                tenant_id: tenantData.id,
                start_date: formData.leaseStart,
                end_date: endDate,
                rent_amount: Number(formData.rentAmount),
                payment_frequency: formData.paymentFrequency
              });

            if (leaseError) throw leaseError;
          }
        }

        // Navigate to properties list instead of dashboard for immediate feedback
        navigate('/dashboard/properties');
      } catch (err: any) {
        console.error("Error saving property:", err);
        alert(`Failed to save property: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3, p: 2 }}>
            <TextField 
              label="Street Address" 
              name="address" 
              placeholder="e.g. 42 Wallaby Way"
              value={formData.address}
              onChange={handleChange}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap'} }}>
              <TextField 
                label="Suburb" 
                name="suburb" 
                value={formData.suburb}
                onChange={handleChange}
                sx={{ flex: 2 }}
              />
              <TextField 
                label="Postcode" 
                name="postcode" 
                value={formData.postcode}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap'} }}>
              <FormControl>
                <InputLabel>State/Territory</InputLabel>
                <Select
                  name="state"
                  value={formData.state}
                  label="State/Territory"
                  onChange={handleChange}
                >
                  <MenuItem value="NSW">New South Wales</MenuItem>
                  <MenuItem value="VIC">Victoria</MenuItem>
                  <MenuItem value="QLD">Queensland</MenuItem>
                  <MenuItem value="WA">Western Australia</MenuItem>
                  <MenuItem value="SA">South Australia</MenuItem>
                  <MenuItem value="TAS">Tasmania</MenuItem>
                  <MenuItem value="ACT">Australian Capital Territory</MenuItem>
                  <MenuItem value="NT">Northern Territory</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel>Property Type</InputLabel>
                <Select
                  name="propertyType"
                  value={formData.propertyType}
                  label="Property Type"
                  onChange={handleChange}
                >
                  <MenuItem value="House">House</MenuItem>
                  <MenuItem value="Apartment">Apartment/Unit</MenuItem>
                  <MenuItem value="Townhouse">Townhouse</MenuItem>
                  <MenuItem value="Commercial">Commercial</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3, p: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ 
                p: 4, 
                borderStyle: 'dashed', 
                borderWidth: 2, 
                borderRadius: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                borderColor: formData.image ? 'primary.main' : 'rgba(59, 34, 181, 0.3)',
                bgcolor: 'rgba(59, 34, 181, 0.02)'
              }}
            >
               <Upload className="w-8 h-8 text-primary" />
               <Typography sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Click to upload a property image</Typography>
               <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>JPG, PNG, WebP accepted. Required field.</Typography>
               <input
                 type="file"
                 hidden
                 accept="image/*"
                 onChange={handleImageUpload}
               />
            </Button>
            {formData.image && (
              <Box sx={{ mt: 2, borderRadius: 3, overflow: 'hidden', height: 240, border: '1px solid #ededf1', position: 'relative' }}>
                <img src={formData.image} alt="Property Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => e.target.style.display = 'none'} />
              </Box>
            )}
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField 
                label="Rent Amount ($)" 
                name="rentAmount" 
                type="number"
                placeholder="e.g. 500"
                value={formData.rentAmount}
                onChange={handleChange}
              />
              <FormControl>
                <InputLabel>Payment Frequency</InputLabel>
                <Select
                  name="paymentFrequency"
                  value={formData.paymentFrequency}
                  label="Payment Frequency"
                  onChange={handleChange}
                >
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="Fortnightly">Fortnightly</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Box>

          </Box>
        );
      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3, p: 2 }}>
            <TextField 
              label="Primary Tenant Full Name" 
              name="tenantName" 
              placeholder="e.g. Michael Smith"
              value={formData.tenantName}
              onChange={handleChange}
            />
            <TextField 
              label="Tenant Email Address" 
              name="tenantEmail" 
              type="email"
              placeholder="michael.smith@example.com"
              value={formData.tenantEmail}
              onChange={handleChange}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField 
                label="Lease Start Date" 
                name="leaseStart" 
                type="date"
                value={formData.leaseStart}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl>
                <InputLabel>Lease Duration</InputLabel>
                <Select
                  name="leaseDuration"
                  value={formData.leaseDuration}
                  label="Lease Duration"
                  onChange={handleChange}
                >
                  <MenuItem value="6">6 Months</MenuItem>
                  <MenuItem value="12">12 Months</MenuItem>
                  <MenuItem value="24">24 Months</MenuItem>
                  <MenuItem value="0">Periodic / Month-to-Month</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        );
      case 4:
        return (
          <Box sx={{ mt: 3, p: 4, bgcolor: '#f2f4f3', borderRadius: 3, border: '1px solid #ededf1', boxShadow: '0 8px 30px rgba(59, 34, 181, 0.02)' }}>
             <Typography variant="h6" gutterBottom color="primary.main" sx={{ mb: 3, fontWeight: '800', fontFamily: 'Space Grotesk' }}>
               Verify Implementation Overview
             </Typography>
             
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address Location</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{formData.address}, {formData.suburb} {formData.state} {formData.postcode}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property Image</Typography>
                  <Box sx={{ width: 60, height: 40, borderRadius: 1, overflow: 'hidden', border: '1px solid #ededf1' }}>
                     <img src={formData.image} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property Classification</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{formData.propertyType}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Automated Rent Schedule</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>${formData.rentAmount} / {formData.paymentFrequency}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tenant Identity</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{formData.tenantName} ({formData.tenantEmail})</Typography>
                </Box>
             </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen py-8 px-4 sm:px-8 md:px-16"
        style={{ backgroundColor: '#f2f4f3' }}
      >
        <Button 
          startIcon={<ArrowLeft size={18} />} 
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 4, color: 'text.secondary', fontWeight: 'bold' }}
        >
          Return to Dashboard
        </Button>

        <Paper elevation={0} sx={{ maxWidth: 840, mx: 'auto', p: { xs: 2, sm: 4, md: 6 }, borderRadius: { xs: 3, sm: 4, md: 5 }, border: '1px solid #ededf1', boxShadow: '0 24px 48px -12px rgba(59,34,181,0.06)' }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ letterSpacing: '-0.5px', fontWeight: '900', fontFamily: 'Space Grotesk', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              Add a New Property
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Initialize a property in your automated portfolio and connect your tenant.
            </Typography>
          </Box>

          {/* Mobile step indicator (Linear Progress) */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 4 }}>
            <Typography variant="overline" sx={{ display: 'block', textAlign: 'center', mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
              Step {activeStep + 1} of {steps.length}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={((activeStep + 1) / steps.length) * 100} 
              sx={{ height: 6, borderRadius: 3, backgroundColor: '#eaeceb', '& .MuiLinearProgress-bar': { borderRadius: 3, backgroundColor: '#22333b' } }} 
            />
          </Box>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: 'none', sm: 'flex' }, mb: 6 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: 300 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 2, sm: 0 }, justifyContent: 'space-between', mt: 6, pt: 4, borderTop: '1px solid #ededf1' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ py: 1.5, px: { xs: 0, sm: 4 }, color: 'text.secondary', fontWeight: 'bold', width: { xs: '100%', sm: 'auto' } }}
            >
              Previous Step
            </Button>
            <Button 
              onClick={handleNext} 
              variant="contained"
              disableElevation
              disabled={isSubmitting}
              sx={{ py: 1.5, px: { xs: 0, sm: 6 }, width: { xs: '100%', sm: 'auto' }, borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.875rem', fontWeight: 'bold' }}
            >
              {isSubmitting ? 'Saving...' : activeStep === steps.length - 1 ? 'Finalize & Save Property' : 'Proceed to Next'}
            </Button>
          </Box>
        </Paper>
      </motion.div>
    </ThemeProvider>
  );
}
