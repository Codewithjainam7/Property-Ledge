import React, { useState } from 'react';
import { 
  Stepper, Step, StepLabel, Button, Typography, 
  TextField, Box, Paper, Select, MenuItem, InputLabel, FormControl,
  ThemeProvider, createTheme, CssBaseline, LinearProgress, IconButton, Checkbox, FormControlLabel, Modal, Fade, Backdrop
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, CheckCircle2, User, Plus, Pencil, Trash2 } from 'lucide-react';

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

interface TenancySetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyAddress?: string;
}

interface TenantInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const steps = ['Tenant Details', 'Lease & Bond', 'Review & Confirm'];

export default function TenancySetupWizard({
  isOpen,
  onClose,
  propertyId,
  propertyAddress,
}: TenancySetupWizardProps) {
  const { user } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [tenants, setTenants] = useState<TenantInput[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [leaseDetails, setLeaseDetails] = useState({
    startDate: "",
    endDate: "",
    leaseType: "Fixed Term",
  });

  const [bondDetails, setBondDetails] = useState({
    amount: "",
    isPaid: false,
    dueDate: "",
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [successPopup, setSuccessPopup] = useState<{ show: boolean; addedNames: string[] }>({ show: false, addedNames: [] });

  const handleSaveTenant = () => {
    if (!formData.firstName || !formData.email) return;

    if (editingId) {
      setTenants(
        tenants.map((t) => (t.id === editingId ? { ...t, ...formData } : t))
      );
    } else {
      setTenants([
        ...tenants,
        {
          id: crypto.randomUUID(),
          ...formData,
        },
      ]);
    }
    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (t: TenantInput) => {
    setFormData({
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
    });
    setEditingId(t.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setTenants(tenants.filter((t) => t.id !== id));
  };

  const handleSetupTenancy = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("Could not authenticate user");
      const userId = userData.user.id;

      // 1. Fetch property to get the rent amount (fallback to bond/4 if missing)
      const { data: propData } = await supabase
        .from('properties')
        .select('rent_amount')
        .eq('id', propertyId)
        .single();
      
      const rentAmount = propData?.rent_amount || (parseFloat(bondDetails.amount) / 4) || 0;

      // 2. Create the Lease
      const { data: newLease, error: leaseError } = await supabase
        .from('leases')
        .insert([{
          property_id: propertyId,
          created_by: userId,
          start_date: leaseDetails.startDate,
          end_date: leaseDetails.leaseType === 'Fixed Term' ? leaseDetails.endDate : null,
          rent_amount: rentAmount,
          payment_frequency: 'Monthly',
          status: 'Active',
          bond_amount: parseFloat(bondDetails.amount) || 0,
          bond_is_paid: bondDetails.isPaid,
          bond_due_date: bondDetails.dueDate || null,
        }])
        .select()
        .single();

      if (leaseError) throw leaseError;

      // 3. Create Tenants and Link to Lease
      let addedNames: string[] = [];
      for (const t of tenants) {
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert([{
            property_id: propertyId,
            owner_id: userId,
            first_name: t.firstName,
            last_name: t.lastName,
            email: t.email,
            phone: t.phone,
            status: 'Pending',
            access_level: { receives_emails: true, can_login: true }
          }])
          .select()
          .single();

        if (tenantError) throw tenantError;

        // Link to lease_tenants
        const { error: linkError } = await supabase
          .from('lease_tenants')
          .insert([{
            lease_id: newLease.id,
            tenant_id: newTenant.id,
            is_primary: true
          }]);
          
        if (linkError) throw linkError;
        
        addedNames.push(`${t.firstName} ${t.lastName}`.trim() || t.email);
      }

      setSuccessPopup({ show: true, addedNames });
    } catch (err: any) {
      console.error('Error setting up tenancy:', err);
      setSubmitError(err.message || 'An error occurred during setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepCompleted = (index: number) => {
    if (index === 0) return tenants.length > 0 && !isAdding;
    if (index === 1) {
      return (
        leaseDetails.startDate !== "" &&
        (leaseDetails.leaseType === "Periodic" || leaseDetails.endDate !== "") &&
        bondDetails.amount !== "" &&
        (!bondDetails.isPaid ? bondDetails.dueDate !== "" : true)
      );
    }
    if (index === 2) return false; // Review step
    return false;
  };

  const handleNext = () => {
    if (activeStep === 0 && !isStepCompleted(0)) {
        alert("Please add at least one tenant and save their details.");
        return;
    }
    if (activeStep === 1 && !isStepCompleted(1)) {
        alert("Please fill in all mandatory lease and bond fields.");
        return;
    }

    if (activeStep === steps.length - 1) {
        handleSetupTenancy();
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {tenants.map((t) => (
                    <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, border: '1px solid #ededf1', bgcolor: '#f9f9f9' }}>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t.firstName} {t.lastName}</Typography>
                            <Typography variant="body2" color="text.secondary">{t.email} {t.phone ? `| ${t.phone}` : ''}</Typography>
                        </Box>
                        <Box>
                            <IconButton onClick={() => handleEdit(t)} color="primary"><Pencil size={18} /></IconButton>
                            <IconButton onClick={() => handleDelete(t.id)} color="error"><Trash2 size={18} /></IconButton>
                        </Box>
                    </Box>
                ))}
            </Box>

            {isAdding || tenants.length === 0 ? (
                <Box sx={{ p: 3, borderRadius: 3, border: '1px solid #ededf1', bgcolor: '#fff' }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap'}, mb: 2 }}>
                        <TextField 
                            label="First Name *" 
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                        <TextField 
                            label="Last Name" 
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap'}, mb: 2 }}>
                        <TextField 
                            label="Email *" 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <TextField 
                            label="Phone" 
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {tenants.length > 0 && (
                            <Button onClick={() => {
                                setIsAdding(false);
                                setEditingId(null);
                                setFormData({ firstName: "", lastName: "", email: "", phone: "" });
                            }} color="inherit">Cancel</Button>
                        )}
                        <Button 
                            variant="contained" 
                            onClick={handleSaveTenant}
                            disabled={!formData.firstName || !formData.email}
                            sx={{ borderRadius: '50px' }}
                        >
                            {editingId ? "Save Changes" : "Add Tenant"}
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Button 
                    variant="outlined" 
                    onClick={() => setIsAdding(true)}
                    startIcon={<Plus />}
                    sx={{ p: 3, borderStyle: 'dashed', borderWidth: 2, borderRadius: 3, color: 'text.secondary', borderColor: '#ededf1' }}
                >
                    Add another tenant
                </Button>
            )}
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 3, p: 2 }}>
            <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Lease Details</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' }, mb: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Lease Type</InputLabel>
                        <Select
                            value={leaseDetails.leaseType}
                            label="Lease Type"
                            onChange={(e) => setLeaseDetails({ ...leaseDetails, leaseType: e.target.value })}
                        >
                            <MenuItem value="Periodic">Periodic</MenuItem>
                            <MenuItem value="Fixed Term">Fixed Term</MenuItem>
                        </Select>
                    </FormControl>
                        <TextField 
                            label="Start Date *" 
                            type="date"
                            value={leaseDetails.startDate}
                            onChange={(e) => setLeaseDetails({ ...leaseDetails, startDate: e.target.value })}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                </Box>
                {leaseDetails.leaseType === "Fixed Term" && (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                        <TextField 
                            label="End Date *" 
                            type="date"
                            slotProps={{ inputLabel: { shrink: true } }}
                            value={leaseDetails.endDate}
                            onChange={(e) => setLeaseDetails({ ...leaseDetails, endDate: e.target.value })}
                        />
                    </Box>
                )}
            </Box>

            <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Bond Details</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' }, mb: 2 }}>
                    <TextField 
                        label="Bond Amount ($) *" 
                        type="number"
                        value={bondDetails.amount}
                        onChange={(e) => setBondDetails({ ...bondDetails, amount: e.target.value })}
                        sx={{ flex: 1 }}
                    />
                </Box>
                <Box sx={{ mb: 2 }}>
                    <FormControlLabel 
                        control={<Checkbox checked={bondDetails.isPaid} onChange={(e) => setBondDetails({...bondDetails, isPaid: e.target.checked})} />} 
                        label="Bond has been paid" 
                    />
                </Box>
                {!bondDetails.isPaid && (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                        <TextField 
                            label="Due Date *" 
                            type="date"
                            slotProps={{ inputLabel: { shrink: true } }}
                            value={bondDetails.dueDate}
                            onChange={(e) => setBondDetails({ ...bondDetails, dueDate: e.target.value })}
                            sx={{ flex: 1 }}
                        />
                    </Box>
                )}
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: 3, p: 4, bgcolor: '#f2f4f3', borderRadius: 3, border: '1px solid #ededf1', boxShadow: '0 8px 30px rgba(59, 34, 181, 0.02)' }}>
             <Typography variant="h6" gutterBottom color="primary.main" sx={{ mb: 3, fontWeight: '800', fontFamily: 'Space Grotesk' }}>
               Verify Tenancy Overview
             </Typography>
             
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>{propertyAddress || propertyId}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tenants</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                    {tenants.map(t => `${t.firstName} ${t.lastName}`).join(', ')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ededf1', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lease Period</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {leaseDetails.startDate} {leaseDetails.leaseType === 'Fixed Term' ? `to ${leaseDetails.endDate}` : '(Periodic)'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bond</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    ${bondDetails.amount} - {bondDetails.isPaid ? 'Paid' : `Due ${bondDetails.dueDate}`}
                  </Typography>
                </Box>
             </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} closeAfterTransition>
      <Fade in={isOpen}>
        <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: 840,
            bgcolor: 'background.paper',
            borderRadius: '28px',
            boxShadow: 24,
            p: 0,
            outline: 'none',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ p: { xs: 2, sm: 4, md: 6 }, overflowY: 'auto', flex: 1, position: 'relative' }}>
                <IconButton 
                    onClick={onClose} 
                    sx={{ position: 'absolute', top: 16, right: 16 }}
                >
                    <X />
                </IconButton>
                
                <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, pt: 2 }}>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ letterSpacing: '-0.5px', fontWeight: '900', fontFamily: 'Space Grotesk', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                        {propertyAddress || "Tenancy Setup"}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        Configure the tenants and lease details for this property.
                    </Typography>
                </Box>

                {/* Mobile step indicator */}
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
                        {isSubmitting ? 'Processing...' : activeStep === steps.length - 1 ? 'Setup Tenancy' : 'Proceed to Next'}
                    </Button>
                </Box>
            </Box>

            {/* Success Popup inside ThemeProvider */}
            <Modal open={successPopup.show} onClose={() => {
                    setSuccessPopup({ show: false, addedNames: [] });
                    onClose();
                }}
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                    boxShadow: 24,
                    p: 4,
                    textAlign: 'center'
                }}>
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>Tenancy Created</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        The lease has been created and tenants have been added to the system. You can invite them from Team Access.
                    </Typography>
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={() => {
                            setSuccessPopup({ show: false, addedNames: [] });
                            onClose();
                        }}
                        sx={{ borderRadius: '50px', py: 1.5, fontWeight: 'bold' }}
                    >
                        Done
                    </Button>
                </Box>
            </Modal>
          </ThemeProvider>
        </Box>
      </Fade>
    </Modal>
  );
}
