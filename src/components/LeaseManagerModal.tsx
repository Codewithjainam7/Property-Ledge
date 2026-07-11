import React, { useState, useEffect } from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  ThemeProvider,
  createTheme,
  CssBaseline,
  LinearProgress,
  IconButton,
  Modal,
  Fade,
  Backdrop,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { X, CheckCircle2, Home } from "lucide-react";

const theme = createTheme({
  palette: {
    primary: {
      main: "#22333b",
    },
    secondary: {
      main: "#a9927d",
    },
    background: {
      default: "#f2f4f3",
      paper: "#ffffff",
    },
    text: {
      primary: "#0a0908",
      secondary: "#22333b",
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "Outfit", "Inter", sans-serif',
    button: {
      textTransform: "none",
      fontWeight: "bold",
      letterSpacing: "0.5px",
    },
  },
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
      },
    },
    MuiFormControl: {
      defaultProps: {
        fullWidth: true,
      },
    },
  },
});

interface LeaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: any[];
  onLeaseCreated: () => void;
  initialData?: any;
}

const steps = [
  "Property & Tenant",
  "Lease Terms",
  "Financials",
  "Review & Confirm",
];

export function LeaseManagerModal({
  isOpen,
  onClose,
  properties,
  onLeaseCreated,
  initialData,
}: LeaseManagerModalProps) {
  const { session } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);

  // Form State
  const [propertyId, setPropertyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [rentAmount, setRentAmount] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState("Monthly");
  const [bondAmount, setBondAmount] = useState("");
  const [status, setStatus] = useState("Active");

  // Tenant State
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantFirstName, setTenantFirstName] = useState("");
  const [tenantLastName, setTenantLastName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveStep(0);
      setHighestStep(0);
      setSubmitError(null);
      if (initialData) {
        setPropertyId(initialData.propertyId || initialData.property_id || "");
        setStartDate(initialData.startDate || initialData.start_date || "");
        setEndDate(initialData.endDate || initialData.end_date || "");
        setIsPeriodic(
          initialData.isPeriodic || initialData.end_date === null || false,
        );
        setRentAmount(initialData.rentAmount || initialData.rent_amount || "");
        setPaymentFrequency(
          initialData.paymentFrequency ||
            initialData.payment_frequency ||
            "Monthly",
        );
        setBondAmount(initialData.bondAmount || initialData.bond_amount || "");
        setStatus(initialData.status || "Draft");

        if (
          initialData.lease_tenants &&
          initialData.lease_tenants.length > 0 &&
          initialData.lease_tenants[0].tenants
        ) {
          const t = initialData.lease_tenants[0].tenants;
          setTenantId(t.id || null);
          setTenantFirstName(t.first_name || "");
          setTenantLastName(t.last_name || "");
          setTenantEmail(t.email || "");
          setTenantPhone(t.phone || "");
        }
      } else {
        setPropertyId("");
        setStartDate("");
        setEndDate("");
        setIsPeriodic(false);
        setRentAmount("");
        setPaymentFrequency("Monthly");
        setBondAmount("");
        setStatus("Active");
        setTenantId(null);
        setTenantFirstName("");
        setTenantLastName("");
        setTenantEmail("");
        setTenantPhone("");
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isStepValid = (index: number) => {
    if (index === 0)
      return (
        propertyId !== "" && tenantFirstName !== "" && tenantLastName !== ""
      );
    if (index === 1) return startDate !== "" && (isPeriodic || endDate !== "");
    if (index === 2) return rentAmount !== "";
    return false;
  };

  const handleNext = () => {
    setSubmitError(null);
    if (activeStep === 0 && !isStepValid(0)) {
      setSubmitError("Please fill in property and tenant details.");
      return;
    }
    if (activeStep === 1 && !isStepValid(1)) {
      setSubmitError("Please fill in the lease dates.");
      return;
    }
    if (activeStep === 2 && !isStepValid(2)) {
      setSubmitError("Please enter the rent amount.");
      return;
    }
    if (activeStep === steps.length - 1) {
      handleSave();
      return;
    }
    const nextStep = Math.min(activeStep + 1, steps.length - 1);
    setActiveStep(nextStep);
    setHighestStep(Math.max(highestStep, nextStep));
  };

  const handleBack = () => {
    setSubmitError(null);
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const userId = session?.user?.id;
      if (!userId) throw new Error("No user found");

      // 1. Upsert Lease
      const leasePayload = {
        property_id: propertyId,
        created_by: userId,
        start_date: startDate,
        end_date: isPeriodic ? null : endDate || null,
        rent_amount: parseFloat(rentAmount),
        payment_frequency: paymentFrequency,
        bond_amount: parseFloat(bondAmount) || 0,
        status: status,
      };

      let leaseRes;
      if (initialData && initialData.id) {
        leaseRes = await supabase
          .from("leases")
          .update(leasePayload)
          .eq("id", initialData.id)
          .select()
          .single();
      } else {
        leaseRes = await supabase
          .from("leases")
          .insert([leasePayload])
          .select()
          .single();
      }

      if (leaseRes.error) throw leaseRes.error;
      const newLease = leaseRes.data;

      // 2. Upsert Tenant
      const tenantPayload = {
        property_id: propertyId,
        owner_id: userId,
        first_name: tenantFirstName,
        last_name: tenantLastName,
        email: tenantEmail,
        phone: tenantPhone,
        status: "Active",
        access_level: { receives_emails: true, can_login: true },
      };

      let tenantRes;
      if (tenantId) {
        tenantRes = await supabase
          .from("tenants")
          .update(tenantPayload)
          .eq("id", tenantId)
          .select()
          .single();
      } else {
        tenantRes = await supabase
          .from("tenants")
          .insert([tenantPayload])
          .select()
          .single();
      }

      if (tenantRes.error) throw tenantRes.error;
      const newTenant = tenantRes.data;

      // 3. Link Lease and Tenant if new
      if (!initialData || !initialData.id) {
        const { error: linkError } = await supabase
          .from("lease_tenants")
          .insert([
            {
              lease_id: newLease.id,
              tenant_id: newTenant.id,
              is_primary: true,
            },
          ]);
        if (linkError) throw linkError;
      }

      onLeaseCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Failed to create lease");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const displayAddress = selectedProperty
    ? `${selectedProperty.address}, ${selectedProperty.suburb}`
    : "New Lease Setup";

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              mt: 3,
              p: 2,
            }}
          >
            <FormControl fullWidth>
              <InputLabel>Select Property *</InputLabel>
              <Select
                value={propertyId}
                label="Select Property *"
                onChange={(e) => {
                  const id = e.target.value as string;
                  setPropertyId(id);
                  const prop = properties.find((p) => p.id === id);
                  if (prop && prop.rent_amount) {
                    setRentAmount(prop.rent_amount.toString());
                  }
                }}
              >
                {properties.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.address}
                    {p.suburb ? `, ${p.suburb}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="h6"
              sx={{ fontSize: "1rem", fontWeight: 800, mt: 1 }}
            >
              Tenant Details
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <TextField
                label="First Name *"
                value={tenantFirstName}
                onChange={(e) => setTenantFirstName(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Last Name *"
                value={tenantLastName}
                onChange={(e) => setTenantLastName(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <TextField
                label="Email"
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Phone"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              mt: 3,
              p: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <TextField
                label="Start Date *"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Lease Type</InputLabel>
                <Select
                  value={isPeriodic ? "Periodic" : "Fixed Term"}
                  label="Lease Type"
                  onChange={(e) => setIsPeriodic(e.target.value === "Periodic")}
                >
                  <MenuItem value="Fixed Term">Fixed Term</MenuItem>
                  <MenuItem value="Periodic">Periodic</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {!isPeriodic && (
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
              >
                <TextField
                  label="End Date *"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}
          </Box>
        );
      case 2:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              mt: 3,
              p: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <TextField
                label="Rent Amount *"
                type="number"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={paymentFrequency}
                  label="Frequency"
                  onChange={(e) =>
                    setPaymentFrequency(e.target.value as string)
                  }
                >
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="Fortnightly">Fortnightly</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <TextField
                label="Bond Amount"
                type="number"
                value={bondAmount}
                onChange={(e) => setBondAmount(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Initial Status</InputLabel>
                <Select
                  value={status}
                  label="Initial Status"
                  onChange={(e) => setStatus(e.target.value as string)}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        );
      case 3:
        return (
          <Box
            sx={{
              mt: 3,
              p: 4,
              bgcolor: "#f2f4f3",
              borderRadius: 3,
              border: "1px solid #ededf1",
              boxShadow: "0 8px 30px rgba(59, 34, 181, 0.02)",
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              color="primary.main"
              sx={{ mb: 3, fontWeight: "800", fontFamily: "Space Grotesk" }}
            >
              Confirm Details
            </Typography>
            <Box
              sx={{ bgcolor: "rgba(0,0,0,0.02)", p: 3, borderRadius: 4, mb: 2 }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Selected Property
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }} gutterBottom>
                {displayAddress}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Tenant
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {tenantFirstName} {tenantLastName} ({tenantEmail})
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                  mt: 3,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Lease Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {isPeriodic ? "Periodic" : "Fixed Term"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #ededf1",
                    pb: 1.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Dates
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {startDate} to {isPeriodic ? "Periodic" : endDate}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Rent Amount
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  ${rentAmount} {paymentFrequency}
                </Typography>
              </Box>
              {bondAmount && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #ededf1",
                    pb: 1.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Bond Amount
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    ${bondAmount}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: "rgba(5, 150, 105, 0.05)",
                borderRadius: 2,
                border: "1px solid rgba(5, 150, 105, 0.2)",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: "#059669", fontWeight: "bold" }}
              >
                Tenants can be assigned via Tenancy Setup after the lease is
                created.
              </Typography>
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
      <Modal
        open={isOpen}
        onClose={onClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
            sx: {
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
            },
          },
        }}
      >
        <Fade in={isOpen}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: 840,
              bgcolor: "background.paper",
              borderRadius: "28px",
              boxShadow: 24,
              p: 0,
              outline: "none",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{ p: { xs: 3, sm: 4 }, flexShrink: 0, position: "relative" }}
            >
              <IconButton
                onClick={onClose}
                sx={{
                  position: "absolute",
                  right: 16,
                  top: 16,
                  color: "text.secondary",
                }}
              >
                <X />
              </IconButton>

              <Box sx={{ textAlign: "center", mb: { xs: 3, md: 4 } }}>
                <Typography
                  variant="h5"
                  component="h1"
                  gutterBottom
                  sx={{
                    letterSpacing: "-0.5px",
                    fontWeight: "900",
                    fontFamily: "Space Grotesk",
                    fontSize: { xs: "1.5rem", sm: "1.75rem" },
                  }}
                >
                  {initialData ? "Renew Lease" : displayAddress}
                </Typography>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                >
                  {initialData
                    ? "Configure the details for renewing this lease."
                    : "Configure the property and financial details for this new lease."}
                </Typography>
              </Box>

              <Box sx={{ display: { xs: "block", sm: "none" }, mb: 3 }}>
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    mb: 1,
                    fontWeight: "bold",
                    color: "primary.main",
                  }}
                >
                  Step {activeStep + 1} of {steps.length}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={((activeStep + 1) / steps.length) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#eaeceb",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      backgroundColor: "#22333b",
                    },
                  }}
                />
              </Box>

              <Stepper
                activeStep={activeStep}
                alternativeLabel
                sx={{ display: { xs: "none", sm: "flex" } }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {submitError && (
              <Box sx={{ px: { xs: 3, sm: 4 }, pb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    color: "#b91c1c",
                    bgcolor: "#fef2f2",
                    border: "1px solid #fecaca",
                  }}
                >
                  {submitError}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                px: { xs: 3, sm: 4 },
                pb: 2,
                overflowY: "auto",
                flexGrow: 1,
                minHeight: 250,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {renderStepContent(activeStep)}
                </motion.div>
              </AnimatePresence>
            </Box>

            <Box
              sx={{
                p: { xs: 3, sm: 4 },
                borderTop: "1px solid #ededf1",
                bgcolor: "#f8f9fa",
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                gap: { xs: 2, sm: 0 },
                justifyContent: "space-between",
                borderRadius: "0 0 28px 28px",
              }}
            >
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{
                  py: 1.2,
                  px: { xs: 0, sm: 4 },
                  color: "text.secondary",
                  fontWeight: "bold",
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                Previous Step
              </Button>
              <Button
                onClick={handleNext}
                variant="contained"
                disableElevation
                disabled={isSubmitting}
                sx={{
                  py: 1.2,
                  px: { xs: 0, sm: 6 },
                  width: { xs: "100%", sm: "auto" },
                  borderRadius: "50px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                }}
              >
                {isSubmitting
                  ? "Saving..."
                  : activeStep === steps.length - 1
                    ? initialData
                      ? "Renew Lease"
                      : "Create Lease"
                    : "Proceed to Next"}
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </ThemeProvider>
  );
}
