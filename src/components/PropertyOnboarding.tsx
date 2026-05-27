// src/components/PropertyOnboarding.tsx
import React, { useState } from 'react';
import { 
  Stepper, Step, StepLabel, Button, Typography, 
  TextField, Box, Paper, Select, MenuItem, InputLabel, FormControl,
  ThemeProvider, createTheme, CssBaseline
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3c6e71',
    },
    secondary: {
      main: '#284b63',
    },
    background: {
      default: '#f8f8f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#353535',
      secondary: '#284b63'
    }
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 'bold',
      letterSpacing: '0.5px'
    }
  },
  shape: {
    borderRadius: 16,
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

const steps = ['Property Location', 'Financial Setup', 'Tenant Verification', 'Final Review'];

export function PropertyOnboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    address: '',
    suburb: '',
    postcode: '',
    state: '',
    propertyType: '',
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

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Save property and redirect
      const properties = JSON.parse(localStorage.getItem('properties') || '[]');
      properties.push({ ...formData, id: Date.now().toString() });
      localStorage.setItem('properties', JSON.stringify(properties));
      navigate('/dashboard');
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
            <Box sx={{ p: 3, bgcolor: 'rgba(60, 110, 113, 0.05)', borderRadius: 2, border: '1px solid rgba(60, 110, 113, 0.2)' }}>
              <Typography variant="body2" color="secondary" fontWeight="medium">
                PropVault will automatically generate invoices based on this schedule and send them to the tenant on your behalf.
              </Typography>
            </Box>
          </Box>
        );
      case 2:
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
      case 3:
        return (
          <Box sx={{ mt: 3, p: 4, bgcolor: '#f8f8f8', borderRadius: 3, border: '1px solid #d9d9d9' }}>
             <Typography variant="h6" gutterBottom color="primary.main" fontWeight="800" sx={{ mb: 3 }}>
               Verify Implementation Overview
             </Typography>
             
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d9d9d9', pb: 1 }}>
                 <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">Address Location</Typography>
                 <Typography variant="body1" fontWeight="medium">{formData.address}, {formData.suburb} {formData.state} {formData.postcode}</Typography>
               </Box>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d9d9d9', pb: 1 }}>
                 <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">Property Classification</Typography>
                 <Typography variant="body1" fontWeight="medium">{formData.propertyType}</Typography>
               </Box>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d9d9d9', pb: 1 }}>
                 <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">Automated Rent Schedule</Typography>
                 <Typography variant="body1" fontWeight="medium">${formData.rentAmount} / {formData.paymentFrequency}</Typography>
               </Box>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                 <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">Tenant Identity</Typography>
                 <Typography variant="body1" fontWeight="medium">{formData.tenantName} ({formData.tenantEmail})</Typography>
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
      <Box sx={{ minHeight: '100vh', py: 8, px: { xs: 2, sm: 4, md: 8 }, bgcolor: 'background.default' }}>
        
        <Button 
          startIcon={<ArrowLeft size={18} />} 
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 4, color: 'text.secondary', fontWeight: 'bold' }}
        >
          Return to Dashboard
        </Button>

        <Paper elevation={0} sx={{ maxWidth: 840, mx: 'auto', p: { xs: 4, md: 6 }, borderRadius: 4, border: '1px solid #d9d9d9', boxShadow: '0 24px 48px -12px rgba(60,110,113,0.1)' }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="900" sx={{ letterSpacing: '-0.5px' }}>
              Add a New Property
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Initialize a property in your automated portfolio and connect your tenant.
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: 300 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6, pt: 4, borderTop: '1px solid #f8f8f8' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ py: 1.5, px: 4, color: 'text.secondary' }}
            >
              Previous Step
            </Button>
            <Button 
              onClick={handleNext} 
              variant="contained"
              disableElevation
              sx={{ py: 1.5, px: 6, borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.875rem' }}
            >
              {activeStep === steps.length - 1 ? 'Finalize & Save Property' : 'Proceed to Next'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
