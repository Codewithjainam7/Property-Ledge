import React, { useState } from 'react';
import { 
  Stepper, Step, StepLabel, Button, Typography, 
  TextField, Box, Paper, Select, MenuItem, InputLabel, FormControl,
  ThemeProvider, createTheme, CssBaseline, LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Home } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
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

const steps = ['Property Location', 'Features', 'Property Image', 'Final Review'];

interface PropertyOnboardingProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function PropertyOnboarding({ onCancel, onSuccess }: PropertyOnboardingProps = {}) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  const [formData, setFormData] = useState({
    address: '',
    suburb: '',
    postcode: '',
    state: '',
    propertyCategory: 'Residential',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    carSpaces: '',
    rentAmount: '',
    paymentFrequency: 'Weekly',
    image: null,
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'propertyCategory') {
        newData.propertyType = ''; // Reset property type when category changes
      }
      return newData;
    });
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
    
    if (activeStep === steps.length - 1) {
      if (!session?.user?.id) {
        alert("You must be logged in to add a property.");
        return;
      }

      setIsSubmitting(true);
      try {
        const propertyIdStr = 'PL-' + Math.floor(1000 + Math.random() * 9000).toString();
        
        // Ensure user exists in public.user_profiles to prevent foreign key errors if DB was manually wiped
        const { data: existingUser } = await supabase.from('user_profiles').select('id').eq('id', session.user.id).maybeSingle();
        if (!existingUser) {
          await supabase.from('user_profiles').insert({
             id: session.user.id,
             email: session.user.email,
             first_name: session.user.user_metadata?.first_name || session.user.user_metadata?.full_name?.split(' ')[0] || 'Unknown',
             last_name: session.user.user_metadata?.last_name || 'User'
          });
        }

        // 1. Insert Property
        const { data: propData, error: propertyError } = await supabase
          .from('properties')
          .insert({
            owner_id: session.user.id,
            property_id: propertyIdStr,
            address: formData.address,
            suburb: formData.suburb,
            postcode: formData.postcode,
            state: formData.state,
            property_category: formData.propertyCategory,
            property_type: formData.propertyType,
            bedrooms: Number(formData.bedrooms),
            bathrooms: Number(formData.bathrooms),
            car_spaces: Number(formData.carSpaces),
            rent_amount: Number(formData.rentAmount) || 0,
            payment_frequency: formData.paymentFrequency,
            image: formData.image || null,
          })
          .select()
          .single();

        if (propertyError) throw propertyError;

        // Tenant insertion block removed
        if (onSuccess) {
          onSuccess();
        } else {
          // Navigate to properties list instead of dashboard for immediate feedback
          navigate('/dashboard/properties');
        }
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
              <FormControl fullWidth>
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
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="propertyCategory"
                  value={formData.propertyCategory}
                  label="Category"
                  onChange={handleChange}
                >
                  <MenuItem value="Residential">Residential</MenuItem>
                  <MenuItem value="Commercial">Commercial</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Property Type</InputLabel>
                <Select
                  name="propertyType"
                  value={formData.propertyType}
                  label="Property Type"
                  onChange={handleChange}
                >
                  {formData.propertyCategory === 'Residential' ? (
                    [
                      <MenuItem key="house" value="House">House</MenuItem>,
                      <MenuItem key="apartment" value="Apartment/Unit">Apartment/Unit</MenuItem>,
                      <MenuItem key="townhouse" value="Townhouse">Townhouse</MenuItem>
                    ]
                  ) : (
                    [
                      <MenuItem key="retail" value="Retail">Retail</MenuItem>,
                      <MenuItem key="office" value="Office">Office</MenuItem>,
                      <MenuItem key="industrial" value="Industrial">Industrial</MenuItem>,
                      <MenuItem key="warehouse" value="Warehouse">Warehouse</MenuItem>
                    ]
                  )}
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
                label="Bedrooms" 
                name="bedrooms" 
                type="number"
                value={formData.bedrooms}
                onChange={handleChange}

                sx={{ flex: 1 }}
              />
              <TextField 
                label="Bathrooms" 
                name="bathrooms" 
                type="number"
                value={formData.bathrooms}
                onChange={handleChange}

                sx={{ flex: 1 }}
              />
              <TextField 
                label="Car Spaces" 
                name="carSpaces" 
                type="number"
                value={formData.carSpaces}
                onChange={handleChange}

                sx={{ flex: 1 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField 
                label="Advertised Rent ($)" 
                name="rentAmount" 
                type="number"
                placeholder="e.g. 500"
                value={formData.rentAmount}
                onChange={handleChange}

                sx={{ flex: 2 }}
              />
              <FormControl sx={{ flex: 1 }}>
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
      case 2:
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
               <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>JPG, PNG, WebP accepted. Optional.</Typography>
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
      case 3:
        return (
          <Box sx={{ mt: 3, p: 4, bgcolor: '#f2f4f3', borderRadius: 3, border: '1px solid #ededf1', boxShadow: '0 8px 30px rgba(59, 34, 181, 0.02)' }}>
             <Typography variant="h6" gutterBottom color="primary.main" sx={{ mb: 3, fontWeight: '800', fontFamily: 'Space Grotesk' }}>
               Verify Property Overview
             </Typography>
             
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address Location</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>{formData.address}, {formData.suburb} {formData.state} {formData.postcode}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property Type</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{formData.propertyType}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Features</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{formData.bedrooms} Bed, {formData.bathrooms} Bath, {formData.carSpaces} Car</Typography>
                </Box>

                {formData.image && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property Image</Typography>
                    <Box sx={{ width: 60, height: 40, borderRadius: 1, overflow: 'hidden', border: '1px solid #ededf1' }}>
                      <img src={formData.image} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  </Box>
                )}
             </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  if (onCancel) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="w-full">
          <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 } }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ letterSpacing: '-0.5px', fontWeight: '900', fontFamily: 'Space Grotesk', fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
              Add a New Property
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
              Initialize a physical property asset in your portfolio.
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

          <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: 'none', sm: 'flex' }, mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: 250 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 2, sm: 0 }, justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #ededf1' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ py: 1.2, px: { xs: 0, sm: 4 }, color: 'text.secondary', fontWeight: 'bold', width: { xs: '100%', sm: 'auto' } }}
            >
              Previous Step
            </Button>
            <Button 
              onClick={handleNext} 
              variant="contained"
              disableElevation
              disabled={isSubmitting}
              sx={{ py: 1.2, px: { xs: 0, sm: 6 }, width: { xs: '100%', sm: 'auto' }, borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.875rem', fontWeight: 'bold' }}
            >
              {isSubmitting ? 'Saving...' : activeStep === steps.length - 1 ? 'Save Property' : 'Proceed to Next'}
            </Button>
          </Box>
        </div>
      </ThemeProvider>
    );
  }

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
              Initialize a physical property asset in your portfolio.
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

          <Box sx={{ minHeight: 300, position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {renderStepContent(activeStep)}
              </motion.div>
            </AnimatePresence>
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
              {isSubmitting ? 'Saving...' : activeStep === steps.length - 1 ? 'Save Property' : 'Proceed to Next'}
            </Button>
          </Box>
        </Paper>
      </motion.div>
    </ThemeProvider>
  );
}
