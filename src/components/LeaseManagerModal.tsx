import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  X, Calendar, DollarSign, Home, CheckCircle2, 
  AlertTriangle, Users, ClipboardCheck, Mail, Phone, Plus, ChevronRight, ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type LeaseManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  properties: any[];
  onLeaseCreated: () => void;
  initialData?: any;
};

function CustomDropdown({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: {value: string, label: string}[], placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const selected = options.find(o => o.value === value);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  return (
    <div className="relative" ref={triggerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 bg-transparent outline-none text-slate-800 font-bold text-[15px] cursor-pointer flex justify-between items-center"
      >
        <span className={value ? "" : "text-slate-400 font-medium"}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-[200]" onClick={() => setIsOpen(false)} />
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width }}
                className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-[210] max-h-60 overflow-y-auto"
              >
                <div 
                  className="px-5 py-3 hover:bg-slate-50 cursor-pointer text-[15px] font-bold text-slate-400"
                  onClick={() => { onChange(""); setIsOpen(false); }}
                >
                  {placeholder}
                </div>
                {options.map(opt => (
                  <div 
                    key={opt.value}
                    className={`px-5 py-3 hover:bg-slate-50 cursor-pointer text-[15px] font-bold text-slate-800 ${value === opt.value ? 'bg-primary/5 text-primary' : ''}`}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  >
                    {opt.label}
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

const steps = [
  { id: "property", label: "Property & Dates", icon: Home },
  { id: "financials", label: "Financials", icon: DollarSign },
  { id: "review", label: "Review & Confirm", icon: ClipboardCheck },
];

export function LeaseManagerModal({ isOpen, onClose, properties, onLeaseCreated, initialData }: LeaseManagerModalProps) {
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly');
  const [bondAmount, setBondAmount] = useState('');
  const [status, setStatus] = useState('Active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setHighestStep(0);
      setError(null);
      if (initialData) {
        setPropertyId(initialData.propertyId || '');
        setStartDate(initialData.startDate || '');
        setEndDate(initialData.endDate || '');
        setIsPeriodic(initialData.isPeriodic || false);
        setRentAmount(initialData.rentAmount || '');
        setPaymentFrequency(initialData.paymentFrequency || 'Monthly');
        setBondAmount(initialData.bondAmount || '');
        setStatus('Draft');
      } else {
        setPropertyId('');
        setStartDate('');
        setEndDate('');
        setIsPeriodic(false);
        setRentAmount('');
        setPaymentFrequency('Monthly');
        setBondAmount('');
        setStatus('Active');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isStepValid = (index: number) => {
    if (index === 0) return propertyId !== "" && startDate !== "" && (isPeriodic || endDate !== "");
    if (index === 1) return rentAmount !== "";
    return false;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 0 && !isStepValid(0)) {
      setError("Please fill in property and dates.");
      return;
    }
    if (currentStep === 1 && !isStepValid(1)) {
      setError("Please enter the rent amount.");
      return;
    }
    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    setCurrentStep(nextStep);
    setHighestStep(Math.max(highestStep, nextStep));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
    if (!isStepValid(0) || !isStepValid(1)) {
      setError("Please ensure all required fields are completed.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userId = session?.user?.id;
      if (!userId) throw new Error("No user found");

      // 1. Create Lease
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .insert([{
          property_id: propertyId,
          created_by: userId,
          start_date: startDate,
          end_date: isPeriodic ? null : (endDate || null),
          rent_amount: parseFloat(rentAmount),
          payment_frequency: paymentFrequency,
          bond_amount: parseFloat(bondAmount) || 0,
          status: status
        }])
        .select()
        .single();

      if (leaseError) throw leaseError;

      onLeaseCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create lease');
    } finally {
      setLoading(false);
    }
  };

  const selectedProperty = properties.find(p => p.id === propertyId);
  const displayAddress = selectedProperty ? `${selectedProperty.address}, ${selectedProperty.suburb}` : "New Lease Setup";

  // Deep Neumorphic Input Classes
  const inputContainerClasses = "relative bg-[#dde1e7] rounded-2xl shadow-[inset_5px_5px_10px_rgba(0,0,0,0.15),inset_-5px_-5px_10px_rgba(255,255,255,0.85)] focus-within:shadow-[inset_5px_5px_10px_rgba(79,70,229,0.12),inset_-5px_-5px_10px_rgba(255,255,255,0.9),0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300";
  const inputClasses = "w-full px-5 py-4 bg-transparent outline-none text-slate-800 font-bold text-[15px] placeholder:text-slate-400 placeholder:font-medium";
  const labelClasses = "block text-[11px] font-black text-slate-500 mb-2.5 uppercase tracking-widest pl-1";
  const cardClasses = "bg-[#e0e5ec] rounded-[28px] shadow-[8px_8px_16px_rgba(0,0,0,0.12),-8px_-8px_16px_rgba(255,255,255,0.9)] p-8";
  
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="relative bg-[#e0e5ec] rounded-[36px] w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-[20px_20px_60px_rgba(0,0,0,0.25),-20px_-20px_60px_rgba(255,255,255,0.3)] border border-white/30"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4 relative z-20 shrink-0">
            <button
              onClick={onClose}
              className="absolute right-6 top-6 w-12 h-12 flex items-center justify-center rounded-full bg-[#e0e5ec] text-slate-500 hover:text-red-500 shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7),0_0_15px_rgba(239,68,68,0.2)] transition-all duration-300 z-50 cursor-pointer group"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300 pointer-events-none" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5 drop-shadow-sm">
                <Home className="w-3.5 h-3.5" /> 
                {initialData ? "Renew Lease" : "Create Lease"}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight drop-shadow-sm truncate pr-16">
              {displayAddress}
            </h2>

            {/* Steps Pill */}
            <div className="mt-8 flex justify-center w-full">
              <div className="inline-flex bg-[#e0e5ec] rounded-full p-2 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.12),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]">
                {steps.map((step, idx) => {
                  const isActive = currentStep === idx;
                  const isCompleted = highestStep > idx; // Only tick if we've explicitly passed it!
                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        if (idx <= highestStep) setCurrentStep(idx);
                      }}
                      disabled={idx > highestStep}
                      className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                        isActive
                          ? "bg-slate-900 text-white shadow-[4px_4px_10px_rgba(0,0,0,0.2),0_0_20px_rgba(30,41,59,0.3)] scale-[1.02]"
                          : isCompleted
                          ? "text-slate-700 hover:bg-white/30 cursor-pointer"
                          : "text-slate-400 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs transition-colors duration-300 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : isCompleted
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200 text-slate-500"
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-8 mb-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2 shadow-[0_4px_12px_rgba(239,68,68,0.1)]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-8 py-4">
            <AnimatePresence mode="wait">
              {/* STEP 1: PROPERTY & DATES */}
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
                    <h3 className="text-2xl font-black text-slate-900 mb-2 drop-shadow-sm">Property & Dates</h3>
                    <p className="text-base text-slate-500 font-medium">Select the property and define the leasing period.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Select Property *</label>
                      <div className={inputContainerClasses}>
                        <CustomDropdown 
                          value={propertyId}
                          onChange={(id) => {
                            setPropertyId(id);
                            const prop = properties.find(p => p.id === id);
                            if (prop && prop.rent_amount) {
                              setRentAmount(prop.rent_amount.toString());
                            }
                          }}
                          options={properties.map(p => ({ value: p.id, label: `${p.address}${p.suburb ? `, ${p.suburb}` : ''}` }))}
                          placeholder="-- Choose a property --"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClasses}>Start Date *</label>
                        <div className={inputContainerClasses}>
                          <input 
                            type="date" 
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={inputClasses}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                          <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setIsPeriodic(!isPeriodic)}
                          >
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Periodic</span>
                            {/* Animated Toggle Switch */}
                            <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors duration-300 ease-in-out ${isPeriodic ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                              <motion.div
                                layout
                                className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"
                                animate={{ x: isPeriodic ? 20 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className={`${inputContainerClasses} ${isPeriodic ? 'opacity-50' : ''}`}>
                          <input 
                            type="date" 
                            disabled={isPeriodic}
                            required={!isPeriodic}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={inputClasses}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: FINANCIALS */}
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
                    <h3 className="text-2xl font-black text-slate-900 mb-2 drop-shadow-sm">Financial Details</h3>
                    <p className="text-base text-slate-500 font-medium">Set the rent amount, frequency, and bond details.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClasses}>Rent Amount *</label>
                        <div className={inputContainerClasses}>
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            required
                            min="0"
                            value={rentAmount}
                            onChange={(e) => setRentAmount(e.target.value)}
                            placeholder="0.00"
                            className={`${inputClasses} pl-10`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>Frequency</label>
                        <div className={inputContainerClasses}>
                          <CustomDropdown 
                            value={paymentFrequency}
                            onChange={setPaymentFrequency}
                            options={[
                              { value: "Weekly", label: "Weekly" },
                              { value: "Fortnightly", label: "Fortnightly" },
                              { value: "Monthly", label: "Monthly" }
                            ]}
                            placeholder="-- Choose frequency --"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClasses}>Bond Amount</label>
                        <div className={inputContainerClasses}>
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="number" 
                            min="0"
                            value={bondAmount}
                            onChange={(e) => setBondAmount(e.target.value)}
                            placeholder="0.00"
                            className={`${inputClasses} pl-10`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>Initial Status</label>
                        <div className={inputContainerClasses}>
                          <CustomDropdown 
                            value={status}
                            onChange={setStatus}
                            options={[
                              { value: "Active", label: "Active" },
                              { value: "Draft", label: "Draft" },
                              { value: "Pending", label: "Pending" }
                            ]}
                            placeholder="-- Choose status --"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: REVIEW */}
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
                    <h3 className="text-2xl font-black text-slate-900 mb-2 drop-shadow-sm">Review & Confirm</h3>
                    <p className="text-base text-slate-500 font-medium">Verify the lease details before finalizing.</p>
                  </div>
                  
                  <div className="bg-[#e0e5ec] p-8 rounded-[32px] shadow-[8px_8px_18px_rgba(0,0,0,0.12),-8px_-8px_18px_rgba(255,255,255,0.9)] space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <div className={labelClasses}>Property</div>
                        <div className="font-bold text-slate-900 pl-1">{displayAddress}</div>
                      </div>
                      <div>
                        <div className={labelClasses}>Status</div>
                        <div className="font-bold text-emerald-600 pl-1">{status}</div>
                      </div>
                      <div>
                        <div className={labelClasses}>Dates</div>
                        <div className="font-bold text-slate-900 pl-1">{startDate} to {isPeriodic ? 'Periodic' : endDate}</div>
                      </div>
                      <div>
                        <div className={labelClasses}>Rent Amount</div>
                        <div className="font-bold text-slate-900 pl-1">${rentAmount} {paymentFrequency}</div>
                      </div>
                      {bondAmount && (
                        <div>
                          <div className={labelClasses}>Bond Amount</div>
                          <div className="font-bold text-slate-900 pl-1">${bondAmount}</div>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-slate-300/30">
                      <div className="flex items-center gap-3 bg-[#dde1e7] p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.08),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]">
                        <Users className="w-5 h-5 text-slate-500" />
                        <p className="text-sm font-bold text-slate-600">Tenants can be assigned via <span className="text-slate-900">Tenancy Setup</span> after the lease is created.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="bg-[#e0e5ec] border-t border-white/30 p-6 sm:px-10 flex justify-between items-center rounded-b-[36px] shrink-0 z-20">
            <button
              onClick={currentStep === 0 ? onClose : handleBack}
              className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 bg-[#e0e5ec] shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.9)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all"
            >
              {currentStep === 0 ? "Cancel" : "Back"}
            </button>
            <button
              onClick={currentStep === steps.length - 1 ? handleSave : handleNext}
              disabled={loading || (currentStep === 0 && !isStepValid(0)) || (currentStep === 1 && !isStepValid(1))}
              className="px-10 py-4 rounded-2xl font-extrabold text-white bg-gradient-to-br from-slate-800 to-slate-950 hover:from-slate-700 hover:to-slate-900 transition-all shadow-[5px_5px_12px_rgba(0,0,0,0.15),-3px_-3px_8px_rgba(255,255,255,0.5),0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[5px_5px_12px_rgba(0,0,0,0.15),-3px_-3px_8px_rgba(255,255,255,0.5),0_0_40px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:shadow-[5px_5px_12px_rgba(0,0,0,0.1)] flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : currentStep === steps.length - 1 ? (
                initialData ? "Save Renewed Lease" : "Create Lease"
              ) : (
                <>
                  Next Step <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
