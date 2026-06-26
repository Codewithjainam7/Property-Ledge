import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import {
  Users,
  CalendarDays,
  Shield,
  FileText,
  Rocket,
  X,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { generateVictoriaLeasePdf } from "../utils/leasePdfGenerator";
import { supabase } from '../lib/supabase';

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

const steps = [
  { id: "tenant_details", label: "Tenant details", icon: Users },
  { id: "start_date", label: "Start date", icon: CalendarDays },
  { id: "bond", label: "Bond", icon: Shield },
  { id: "lease_agreement", label: "Lease agreement", icon: FileText },
  { id: "invite_tenants", label: "Invite tenants", icon: Rocket },
];

export default function TenancySetupWizard({
  isOpen,
  onClose,
  propertyId,
  propertyAddress,
}: TenancySetupWizardProps) {
  const { user } = useAuth();
  const defaultProvider = user
    ? `${user.user_metadata?.full_name || user.email} - ${user.email}${user.phone ? `, ${user.phone}` : ""}`
    : "";

  const [currentStep, setCurrentStep] = useState(0);
  const [tenants, setTenants] = useState<TenantInput[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTenantsToInvite, setSelectedTenantsToInvite] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLeaseTypeOpen, setIsLeaseTypeOpen] = useState(false);
  const [isSigningProviderOpen, setIsSigningProviderOpen] = useState(false);
  const [isConditionReportOpen, setIsConditionReportOpen] = useState(false);

  const [leaseDetails, setLeaseDetails] = useState({
    startDate: "",
    leaseType: "Periodic",
    endDate: "",
  });

  const [bondDetails, setBondDetails] = useState({
    amount: "",
    isPaid: false,
    dueDate: "",
    collectViaPlatform: true,
  });

  const [leaseAgreementDetails, setLeaseAgreementDetails] = useState({
    signingProvider: defaultProvider,
    dateOfAgreement: new Date().toISOString().split("T")[0],
    renterAddresses: {} as Record<string, string>,
    urgentRepairs: { contactName: "", phone: "", email: "" },
    ownersCorporation: true,
    conditionReport: "",
    additionalTerms: "",
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  if (!isOpen) return null;

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setTenants(
        tenants.map((t) => (t.id === editingId ? { ...t, ...formData } : t)),
      );
      setEditingId(null);
    } else {
      const newId = Date.now().toString();
      setTenants([...tenants, { id: newId, ...formData }]);
      setSelectedTenantsToInvite((prev) => [...prev, newId]);
    }
    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
    setIsAdding(false);
  };

  const toggleTenantInvite = (id: string) => {
    setSelectedTenantsToInvite((prev) => 
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleSendInvites = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

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
          start_date: leaseDetails.startDate,
          end_date: leaseDetails.leaseType === 'Fixed Term' ? leaseDetails.endDate : null,
          rent_amount: rentAmount,
          payment_frequency: 'Monthly',
          status: 'Active', // Setup wizard confirms it instantly, or 'Draft' if waiting for handshake. Assuming 'Active' or 'Draft'. Handshake requires 'Active' lease in some cases, but 'accept_lease' handles it. Let's use 'Draft' for security.
          bond_amount: parseFloat(bondDetails.amount) || 0,
        }])
        .select()
        .single();

      if (leaseError) throw leaseError;

      // 3. Create all Tenants
      for (const t of tenants) {
        const isSelectedForInvite = selectedTenantsToInvite.includes(t.id);
        const inviteToken = isSelectedForInvite ? crypto.randomUUID() : null;
        const passcode = isSelectedForInvite ? Math.floor(100000 + Math.random() * 900000).toString() : null;
        
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert([{
            property_id: propertyId,
            first_name: t.firstName,
            last_name: t.lastName,
            email: t.email,
            phone: t.phone,
            status: isSelectedForInvite ? 'Invited' : 'Pending',
            invite_token: inviteToken,
            access_level: { receives_emails: isSelectedForInvite, can_login: isSelectedForInvite }
          }])
          .select()
          .single();

        if (tenantError) throw tenantError;

        // Link to lease_tenants
        await supabase
          .from('lease_tenants')
          .insert([{
            lease_id: newLease.id,
            tenant_id: newTenant.id,
            is_primary: true // first tenant could be primary, simplifying for now
          }]);

        // 4. Send Email if Selected
        if (isSelectedForInvite) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: t.email,
              templateType: 'tenant-invite',
              data: {
                tenantFirstName: t.firstName,
                propertyName: propertyAddress,
                inviteUrl: `${window.location.origin}/accept-tenant-invite?token=${inviteToken}`,
                startDate: leaseDetails.startDate,
                rentAmount: rentAmount,
                bondAmount: bondDetails.amount || '0',
                passcode: passcode
              }
            }
          });
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Error setting up tenancy:', err);
      setSubmitError(err.message || 'An error occurred during setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepCompleted = (index: number) => {
    if (index === 0) return tenants.length > 0;
    if (index === 1)
      return (
        leaseDetails.startDate !== "" &&
        (leaseDetails.leaseType === "Periodic" || leaseDetails.endDate !== "")
      );
    if (index === 2)
      return (
        bondDetails.amount !== "" &&
        (!bondDetails.isPaid ? bondDetails.dueDate !== "" : true)
      );
    if (index === 3) {
      const isDateValid = leaseAgreementDetails.dateOfAgreement !== "";
      const isRepairsValid =
        leaseAgreementDetails.urgentRepairs.contactName !== "" &&
        leaseAgreementDetails.urgentRepairs.phone !== "" &&
        leaseAgreementDetails.urgentRepairs.email !== "";
      const areAddressesValid =
        tenants.length > 0 &&
        tenants.every(
          (t) =>
            leaseAgreementDetails.renterAddresses[t.id] &&
            leaseAgreementDetails.renterAddresses[t.id].trim() !== "",
        );
      return isDateValid && isRepairsValid && areAddressesValid;
    }
    return false;
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Background Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
      />

      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full max-w-5xl bg-white/80 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden flex flex-col h-[85vh] min-h-[700px] max-h-[900px] z-10 border border-white/60"
      >
        {/* Decorative ambient blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-[100px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-400/10 blur-[100px]" />
        </div>

        {/* Header & Horizontal Stepper */}
        <div className="relative z-10 px-8 pt-8 pb-4">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-primary" /> Tenancy Setup
              </p>
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight drop-shadow-sm">
                  {propertyAddress || "New Tenancy"}
                </h2>

                {/* Active Tenants Summary Chips */}
                {tenants.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-300/50">
                    {tenants.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold text-slate-700"
                      >
                        <Users className="w-3.5 h-3.5 text-primary/70" />
                        {t.firstName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/60 hover:bg-white text-slate-600 hover:text-slate-900 rounded-full transition-all shadow-sm border border-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pill Segmented Stepper */}
          <div className="flex w-full overflow-x-auto hide-scrollbar gap-2 p-1.5 bg-white/50 backdrop-blur-md rounded-lg border border-white shadow-sm">
            {steps.map((step, idx) => {
              const isActive = currentStep === idx;
              const isCompleted = isStepCompleted(idx);
              const isClickable = isCompleted || isActive || currentStep > idx;

              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && setCurrentStep(idx)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap outline-none flex-1 justify-center ${
                    isActive
                      ? "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-white text-slate-900 font-bold"
                      : isCompleted
                        ? "bg-transparent text-slate-800 font-bold hover:bg-white/60 cursor-pointer border border-transparent"
                        : "bg-transparent text-slate-500 font-bold cursor-not-allowed opacity-70 border border-transparent"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shadow-sm transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-primary/30"
                        : isCompleted
                          ? "bg-emerald-500 text-white shadow-emerald-500/30"
                          : "bg-white text-slate-500"
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className="text-sm drop-shadow-sm">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-8 py-4">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto w-full"
              >
                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 drop-shadow-sm">
                    Tenant Details
                  </h3>
                  <p className="text-base text-slate-700 font-medium">
                    Add the details of the people moving into this property.
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <AnimatePresence>
                    {tenants.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{
                          opacity: 0,
                          scale: 0.98,
                          height: 0,
                          marginBottom: 0,
                        }}
                        className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                      >
                        <div className="w-full sm:w-auto text-center sm:text-left mb-3 sm:mb-0">
                          <h4 className="font-bold text-slate-900 text-lg mb-1">
                            {t.firstName} {t.lastName}
                          </h4>
                          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-700 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-500" />{" "}
                              {t.email}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />{" "}
                              {t.phone}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(t)}
                            className="p-2.5 text-slate-500 hover:text-primary bg-white hover:bg-slate-50 rounded-lg transition-all shadow-sm border border-slate-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-2.5 text-slate-500 hover:text-red-500 bg-white hover:bg-slate-50 rounded-lg transition-all shadow-sm border border-slate-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                  {isAdding ? (
                    <motion.form
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onSubmit={handleSaveTenant}
                      className="bg-white/70 backdrop-blur-xl border border-white rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
                    >
                      <h4 className="font-bold text-xl text-slate-900 mb-6 drop-shadow-sm text-center">
                        {editingId ? "Edit Tenant" : "Add New Tenant"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                        <div>
                          <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.firstName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                firstName: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-sm text-slate-900"
                            placeholder="e.g. John"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.lastName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                lastName: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-sm text-slate-900"
                            placeholder="e.g. Doe"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                        <div>
                          <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                            Email Address{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-sm text-slate-900"
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-sm text-slate-900"
                            placeholder="0400 000 000"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 justify-end pt-5 border-t border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAdding(false);
                            setEditingId(null);
                            setFormData({
                              firstName: "",
                              lastName: "",
                              email: "",
                              phone: "",
                            });
                          }}
                          className="px-6 py-3 text-sm font-extrabold text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-8 py-3 text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
                        >
                          {editingId ? "Save Changes" : "Add Tenant"}
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsAdding(true)}
                      className="flex items-center justify-center w-full gap-2 px-6 py-6 bg-white/60 backdrop-blur-md border-2 border-dashed border-slate-300 rounded-lg text-sm font-extrabold text-slate-600 hover:text-primary hover:border-primary hover:bg-white transition-all shadow-sm"
                    >
                      <Plus className="w-5 h-5" />{" "}
                      {tenants.length > 0
                        ? "Add another tenant"
                        : "Add first tenant"}
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto w-full"
              >
                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 drop-shadow-sm">
                    Lease Dates
                  </h3>
                  <p className="text-base text-slate-700 font-medium">
                    When does this tenancy start and end?
                  </p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={leaseDetails.startDate}
                        onChange={(e) =>
                          setLeaseDetails({
                            ...leaseDetails,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm"
                      />
                    </div>
                    <div className="relative z-[100]">
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                        Lease type
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsLeaseTypeOpen(!isLeaseTypeOpen)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 bg-white border rounded-lg text-sm font-semibold outline-none transition-all text-slate-900 shadow-sm ${isLeaseTypeOpen ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"}`}
                        >
                          {leaseDetails.leaseType}
                          <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isLeaseTypeOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        <AnimatePresence>
                          {isLeaseTypeOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-slate-200 z-[100] py-1.5 overflow-hidden"
                            >
                              {["Periodic", "Fixed Term"].map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    setLeaseDetails({
                                      ...leaseDetails,
                                      leaseType: type,
                                    });
                                    setIsLeaseTypeOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-all hover:bg-slate-50 text-slate-700"
                                >
                                  <span
                                    className={
                                      leaseDetails.leaseType === type
                                        ? "text-primary"
                                        : ""
                                    }
                                  >
                                    {type}
                                  </span>
                                  {leaseDetails.leaseType === type && (
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {leaseDetails.leaseType === "Fixed Term" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-8 overflow-hidden"
                      >
                        <div className="w-full sm:w-[calc(50%-12px)]">
                          <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                            End Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={leaseDetails.endDate}
                            onChange={(e) =>
                              setLeaseDetails({
                                ...leaseDetails,
                                endDate: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-4 items-start bg-blue-50/90 p-5 rounded-2xl text-sm text-slate-800 border border-blue-100 shadow-[inset_0_2px_10px_rgba(255,255,255,0.5)] relative z-0">
                    <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">
                      If you're not sure about the exact dates yet, you can
                      enter approximate dates now and adjust them later before
                      finalising the lease.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto w-full"
              >
                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 drop-shadow-sm">
                    Bond Details
                  </h3>
                  <p className="text-base text-slate-700 font-medium">
                    Record the bond amount and payment status.
                  </p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                  <div className="mb-10">
                    <label className="block text-xs font-extrabold text-slate-600 mb-3 uppercase tracking-wider">
                      Bond Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative max-w-sm">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xl">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={bondDetails.amount}
                        onChange={(e) =>
                          setBondDetails({
                            ...bondDetails,
                            amount: e.target.value,
                          })
                        }
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-2xl font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 placeholder:text-slate-400 shadow-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        style={{ MozAppearance: "textfield" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 mb-3 uppercase tracking-wider">
                        Payment Status
                      </label>
                      <div className="flex bg-slate-100 p-1.5 rounded-lg w-fit border border-slate-200 shadow-inner">
                        <button
                          onClick={() =>
                            setBondDetails({ ...bondDetails, isPaid: true })
                          }
                          className={`px-6 py-3 rounded-lg text-sm font-extrabold transition-all ${bondDetails.isPaid ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-slate-100" : "text-slate-600 hover:text-slate-800"}`}
                        >
                          Paid
                        </button>
                        <button
                          onClick={() =>
                            setBondDetails({ ...bondDetails, isPaid: false })
                          }
                          className={`px-6 py-3 rounded-lg text-sm font-extrabold transition-all ${!bondDetails.isPaid ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-slate-100" : "text-slate-600 hover:text-slate-800"}`}
                        >
                          Not Paid
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {!bondDetails.isPaid && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="w-full"
                        >
                          <label className="block text-xs font-extrabold text-slate-600 mb-3 uppercase tracking-wider">
                            Due Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={bondDetails.dueDate}
                            onChange={(e) =>
                              setBondDetails({
                                ...bondDetails,
                                dueDate: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="pt-8 border-t border-slate-200/50">
                    <label className="block text-xs font-extrabold text-slate-600 mb-4 uppercase tracking-wider">
                      Collect bond via platform?
                    </label>
                    <div className="flex bg-slate-100 p-1.5 rounded-lg w-fit border border-slate-200 shadow-inner">
                      <button
                        onClick={() =>
                          setBondDetails({
                            ...bondDetails,
                            collectViaPlatform: true,
                          })
                        }
                        className={`px-6 py-3 rounded-lg text-sm font-extrabold transition-all ${bondDetails.collectViaPlatform ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "text-slate-600 hover:text-slate-800"}`}
                      >
                        Yes, collect via platform
                      </button>
                      <button
                        onClick={() =>
                          setBondDetails({
                            ...bondDetails,
                            collectViaPlatform: false,
                          })
                        }
                        className={`px-6 py-3 rounded-lg text-sm font-extrabold transition-all ${!bondDetails.collectViaPlatform ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-slate-100" : "text-slate-600 hover:text-slate-800"}`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto w-full"
              >
                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 drop-shadow-sm">
                    Lease Agreement Details
                  </h3>
                  <p className="text-base text-slate-700 font-medium">
                    Please provide the required details to generate the Victoria
                    Residential Rental Agreement.
                  </p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] space-y-8 text-left">
                  {/* Signing Rental Provider */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                      Signing rental provider{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative z-[100]">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setIsSigningProviderOpen(!isSigningProviderOpen)
                          }
                          className={`w-full flex items-center justify-between px-4 py-3.5 bg-white border rounded-lg text-sm font-semibold outline-none transition-all shadow-sm ${isSigningProviderOpen ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"} ${!leaseAgreementDetails.signingProvider ? "text-slate-400" : "text-slate-900"}`}
                        >
                          <span className="truncate">
                            {leaseAgreementDetails.signingProvider ||
                              "Select signing provider"}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${isSigningProviderOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        <AnimatePresence>
                          {isSigningProviderOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-slate-200 z-[100] py-1.5 overflow-hidden"
                            >
                              {[defaultProvider].filter(Boolean).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    setLeaseAgreementDetails({
                                      ...leaseAgreementDetails,
                                      signingProvider: opt,
                                    });
                                    setIsSigningProviderOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-all hover:bg-slate-50 text-slate-700"
                                >
                                  <span
                                    className={`truncate text-left ${leaseAgreementDetails.signingProvider === opt ? "text-primary" : ""}`}
                                  >
                                    {opt}
                                  </span>
                                  {leaseAgreementDetails.signingProvider ===
                                    opt && (
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Lease Details */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4">
                      Lease Details
                    </h4>
                    <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                      Date of agreement <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={leaseAgreementDetails.dateOfAgreement}
                      onChange={(e) =>
                        setLeaseAgreementDetails({
                          ...leaseAgreementDetails,
                          dateOfAgreement: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm"
                    />
                  </div>

                  {/* Renter addresses */}
                  {tenants.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-800 mb-4">
                        Renter addresses
                      </h4>
                      <div className="space-y-4">
                        {tenants.map((t) => (
                          <div key={t.id}>
                            <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                              {t.firstName} {t.lastName} current address
                            </label>
                            <input
                              type="text"
                              placeholder="Search for address or enter manually"
                              value={
                                leaseAgreementDetails.renterAddresses[t.id] ||
                                ""
                              }
                              onChange={(e) =>
                                setLeaseAgreementDetails({
                                  ...leaseAgreementDetails,
                                  renterAddresses: {
                                    ...leaseAgreementDetails.renterAddresses,
                                    [t.id]: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm placeholder:text-slate-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Urgent Repairs */}
                  <div className="pt-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">
                      Urgent Repairs
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Details of person the renter should contact for an urgent
                      repair
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                          Contact name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={
                            leaseAgreementDetails.urgentRepairs.contactName
                          }
                          onChange={(e) =>
                            setLeaseAgreementDetails({
                              ...leaseAgreementDetails,
                              urgentRepairs: {
                                ...leaseAgreementDetails.urgentRepairs,
                                contactName: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                          Phone number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Phone number"
                          value={leaseAgreementDetails.urgentRepairs.phone}
                          onChange={(e) =>
                            setLeaseAgreementDetails({
                              ...leaseAgreementDetails,
                              urgentRepairs: {
                                ...leaseAgreementDetails.urgentRepairs,
                                phone: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase tracking-wider">
                          Email address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={leaseAgreementDetails.urgentRepairs.email}
                          onChange={(e) =>
                            setLeaseAgreementDetails({
                              ...leaseAgreementDetails,
                              urgentRepairs: {
                                ...leaseAgreementDetails.urgentRepairs,
                                email: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Owners Corporation */}
                  <div className="pt-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">
                      Owners corporation (formerly body corporate)
                    </h4>
                    <label className="block text-xs font-extrabold text-slate-600 mb-3 tracking-wider">
                      Do owners corporation rules apply to the premises? If yes,
                      these must be included in the "Additional Terms" of this
                      agreement. <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer w-fit">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${leaseAgreementDetails.ownersCorporation ? "border-primary bg-primary" : "border-slate-300 bg-white"}`}
                        >
                          {leaseAgreementDetails.ownersCorporation && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="ownersCorp"
                          className="hidden"
                          checked={leaseAgreementDetails.ownersCorporation}
                          onChange={() =>
                            setLeaseAgreementDetails({
                              ...leaseAgreementDetails,
                              ownersCorporation: true,
                            })
                          }
                        />
                        <span className="text-sm font-semibold text-slate-800">
                          Yes
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer w-fit">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${!leaseAgreementDetails.ownersCorporation ? "border-primary bg-primary" : "border-slate-300 bg-white"}`}
                        >
                          {!leaseAgreementDetails.ownersCorporation && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="ownersCorp"
                          className="hidden"
                          checked={!leaseAgreementDetails.ownersCorporation}
                          onChange={() =>
                            setLeaseAgreementDetails({
                              ...leaseAgreementDetails,
                              ownersCorporation: false,
                            })
                          }
                        />
                        <span className="text-sm font-semibold text-slate-800">
                          No
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Condition report */}
                  <div className="pt-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">
                      Condition report
                    </h4>
                    <label className="block text-xs font-extrabold text-slate-600 mb-2 tracking-wider leading-relaxed">
                      The renter must be given two copies of the condition
                      report (or one emailed copy) on or before the date the
                      renter moves into the rented premises.{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-3 z-[90]">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setIsConditionReportOpen(!isConditionReportOpen)
                          }
                          className={`w-full flex items-center justify-between px-4 py-3.5 bg-white border rounded-lg text-sm font-semibold outline-none transition-all shadow-sm ${isConditionReportOpen ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"} ${!leaseAgreementDetails.conditionReport ? "text-slate-400" : "text-slate-900"}`}
                        >
                          <span className="truncate text-left">
                            {leaseAgreementDetails.conditionReport ||
                              "Select an option"}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${isConditionReportOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        <AnimatePresence>
                          {isConditionReportOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-slate-200 z-[90] py-1.5 overflow-hidden"
                            >
                              {[
                                "The condition report has been provided",
                                "The condition report will be provided to the renter on or before the date the agreement starts",
                              ].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    setLeaseAgreementDetails({
                                      ...leaseAgreementDetails,
                                      conditionReport: opt,
                                    });
                                    setIsConditionReportOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-all hover:bg-slate-50 text-slate-700"
                                >
                                  <span
                                    className={`truncate text-left ${leaseAgreementDetails.conditionReport === opt ? "text-primary" : ""}`}
                                  >
                                    {opt}
                                  </span>
                                  {leaseAgreementDetails.conditionReport ===
                                    opt && (
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Additional Terms */}
                  <div className="pt-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">
                      Additional Terms
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Any additional terms or conditions for the lease
                      agreement. These will be added to the lease agreement as a
                      separate section.
                    </p>
                    <textarea
                      rows={5}
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 shadow-sm resize-y"
                      value={leaseAgreementDetails.additionalTerms}
                      onChange={(e) =>
                        setLeaseAgreementDetails({
                          ...leaseAgreementDetails,
                          additionalTerms: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 border-t border-slate-200/50 flex items-center justify-between">
                    <button
                      onClick={() => {
                        generateVictoriaLeasePdf(
                          leaseAgreementDetails,
                          tenants,
                          bondDetails,
                          leaseDetails,
                          propertyAddress
                        );
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 shadow-sm text-slate-800 rounded-lg text-sm font-extrabold hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Save lease agreement
                    </button>

                    <button
                      onClick={() => setCurrentStep(4)}
                      className="flex items-center gap-2 text-slate-500 text-sm font-bold hover:text-slate-800 transition-colors"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto w-full"
              >
                <div className="text-center mb-10">
                  <h3 className="text-3xl font-black text-slate-900 mb-3 drop-shadow-sm">
                    Review & Confirm
                  </h3>
                  <p className="text-slate-700 font-medium text-lg">
                    Please review the details before sending out the tenant
                    invites.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Tenant Summary */}
                  <div
                    className={`bg-white/70 backdrop-blur-xl border rounded-2xl p-6 sm:p-8 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${isStepCompleted(0) ? "border-white" : "border-red-200 bg-red-50/80"}`}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h4 className="font-bold text-slate-900 flex items-center gap-3 text-xl">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                          <Users className="w-5 h-5 text-slate-500" />
                        </div>
                        Tenants
                      </h4>
                      {isStepCompleted(0) ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm text-white">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <span className="text-xs font-black text-red-600 bg-red-100 px-3 py-1.5 rounded-lg uppercase tracking-wider border border-red-200">
                          Missing
                        </span>
                      )}
                    </div>
                    {isStepCompleted(0) ? (
                      <div className="space-y-3">
                        {tenants.map((t) => (
                          <div
                            key={t.id}
                            className="flex justify-between items-center text-base p-4 bg-white border border-slate-100 rounded-lg shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={selectedTenantsToInvite.includes(t.id)} 
                                onChange={() => toggleTenantInvite(t.id)}
                                className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                              />
                              <span className="font-extrabold text-slate-900">
                                {t.firstName} {t.lastName}
                              </span>
                            </div>
                            <span className="text-slate-600 font-semibold">
                              {t.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-4 pt-2">
                        <p className="text-base text-red-600 font-bold bg-white px-5 py-3 rounded-lg border border-red-100 shadow-sm">
                          You must add at least one tenant.
                        </p>
                        <button
                          onClick={() => setCurrentStep(0)}
                          className="text-sm font-extrabold bg-white border border-red-200 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                        >
                          Fix this section
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dates Summary */}
                  <div
                    className={`bg-white/70 backdrop-blur-xl border rounded-2xl p-6 sm:p-8 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${isStepCompleted(1) ? "border-white" : "border-red-200 bg-red-50/80"}`}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h4 className="font-bold text-slate-900 flex items-center gap-3 text-xl">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                          <CalendarDays className="w-5 h-5 text-slate-500" />
                        </div>
                        Lease Dates
                      </h4>
                      {isStepCompleted(1) ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm text-white">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <span className="text-xs font-black text-red-600 bg-red-100 px-3 py-1.5 rounded-lg uppercase tracking-wider border border-red-200">
                          Missing
                        </span>
                      )}
                    </div>
                    {isStepCompleted(1) ? (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="p-5 bg-white border border-slate-100 rounded-lg min-w-[160px] shadow-sm">
                          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                            Start Date
                          </span>
                          <span className="font-black text-slate-900 text-lg">
                            {leaseDetails.startDate}
                          </span>
                        </div>
                        <div className="p-5 bg-white border border-slate-100 rounded-lg min-w-[160px] shadow-sm">
                          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                            Type
                          </span>
                          <span className="font-black text-slate-900 text-lg">
                            {leaseDetails.leaseType}
                          </span>
                        </div>
                        {leaseDetails.leaseType === "Fixed Term" && (
                          <div className="p-5 bg-white border border-slate-100 rounded-lg min-w-[160px] shadow-sm">
                            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                              End Date
                            </span>
                            <span className="font-black text-slate-900 text-lg">
                              {leaseDetails.endDate}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-4 pt-2">
                        <p className="text-base text-red-600 font-bold bg-white px-5 py-3 rounded-lg border border-red-100 shadow-sm">
                          Please provide a valid start date (and end date if
                          Fixed Term).
                        </p>
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="text-sm font-extrabold bg-white border border-red-200 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                        >
                          Fix this section
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bond Summary */}
                  <div
                    className={`bg-white/70 backdrop-blur-xl border rounded-2xl p-6 sm:p-8 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${isStepCompleted(2) ? "border-white" : "border-red-200 bg-red-50/80"}`}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h4 className="font-bold text-slate-900 flex items-center gap-3 text-xl">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                          <Shield className="w-5 h-5 text-slate-500" />
                        </div>
                        Bond
                      </h4>
                      {isStepCompleted(2) ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm text-white">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <span className="text-xs font-black text-red-600 bg-red-100 px-3 py-1.5 rounded-lg uppercase tracking-wider border border-red-200">
                          Missing
                        </span>
                      )}
                    </div>
                    {isStepCompleted(2) ? (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="p-5 bg-white border border-slate-100 rounded-lg min-w-[160px] shadow-sm">
                          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                            Amount
                          </span>
                          <span className="font-black text-slate-900 text-lg">
                            ${bondDetails.amount}
                          </span>
                        </div>
                        <div className="p-5 bg-white border border-slate-100 rounded-lg min-w-[160px] shadow-sm">
                          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                            Status
                          </span>
                          <span
                            className={`font-black text-lg ${bondDetails.isPaid ? "text-emerald-600" : "text-amber-600"}`}
                          >
                            {bondDetails.isPaid
                              ? "Paid"
                              : `Due: ${bondDetails.dueDate}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-4 pt-2">
                        <p className="text-base text-red-600 font-bold bg-white px-5 py-3 rounded-lg border border-red-100 shadow-sm">
                          Please provide the bond amount and payment status.
                        </p>
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="text-sm font-extrabold bg-white border border-red-200 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                        >
                          Fix this section
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="relative z-10 px-8 py-6 flex justify-between items-center border-t border-white/60 bg-white/40 backdrop-blur-md">
          <div>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-8 py-3.5 text-slate-700 font-extrabold text-sm bg-white/80 border border-white rounded-lg hover:bg-white transition-all shadow-sm"
              >
                Back
              </button>
            )}
          </div>

          {currentStep === steps.length - 1 ? (
            <div className="flex items-center gap-4">
              {submitError && <span className="text-red-500 text-sm font-bold">{submitError}</span>}
              <button
                onClick={handleSendInvites}
                disabled={
                  !isStepCompleted(0) ||
                  !isStepCompleted(1) ||
                  !isStepCompleted(2) ||
                  isSubmitting
                }
                className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-lg text-base font-extrabold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <><Rocket className="w-5 h-5" /> Send Invites</>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))
              }
              className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-lg text-base font-extrabold hover:bg-slate-800 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
            >
              Next Step <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
