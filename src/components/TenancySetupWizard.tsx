import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles
} from 'lucide-react';

interface TenancySetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
}

interface TenantInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const steps = [
  { id: 'tenant_details', label: 'Tenant details', icon: Users },
  { id: 'start_date', label: 'Start date', icon: CalendarDays },
  { id: 'bond', label: 'Bond', icon: Shield },
  { id: 'lease_agreement', label: 'Lease agreement', icon: FileText },
  { id: 'invite_tenants', label: 'Invite tenants', icon: Rocket },
];

export default function TenancySetupWizard({ isOpen, onClose, propertyId }: TenancySetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tenants, setTenants] = useState<TenantInput[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLeaseTypeOpen, setIsLeaseTypeOpen] = useState(false);
  
  const [leaseDetails, setLeaseDetails] = useState({
    startDate: '',
    leaseType: 'Periodic',
    endDate: ''
  });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  if (!isOpen) return null;

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setTenants(tenants.map(t => t.id === editingId ? { ...t, ...formData } : t));
      setEditingId(null);
    } else {
      setTenants([...tenants, { id: Date.now().toString(), ...formData }]);
    }
    setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    setIsAdding(false);
  };

  const isStepCompleted = (index: number) => {
    if (index === 0) return tenants.length > 0;
    if (index === 1) return leaseDetails.startDate !== '' && (leaseDetails.leaseType === 'Periodic' || leaseDetails.endDate !== '');
    if (index === 2) return false; // Bond not implemented yet
    if (index === 3) return false; // Lease agreement not implemented yet
    return false;
  };

  const handleEdit = (t: TenantInput) => {
    setFormData({ firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone });
    setEditingId(t.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setTenants(tenants.filter(t => t.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
        animate={{ opacity: 1, backdropFilter: 'blur(16px)' }} 
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl bg-[#f8fafc]/90 backdrop-blur-3xl rounded-none sm:rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-white/60 overflow-hidden flex flex-col md:flex-row h-[100dvh] sm:h-auto sm:max-h-[90vh] md:min-h-[650px] z-10"
      >
        {/* Decorative background blob */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[80px]" />
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-72 bg-white/40 border-b md:border-b-0 md:border-r border-white/40 p-4 sm:p-6 md:p-8 flex flex-col z-10 relative shrink-0">
          <div className="flex items-center justify-between md:hidden mb-8">
            <h3 className="font-black text-xl text-slate-800 tracking-tight">Tenancy Setup</h3>
            <button onClick={onClose} className="p-2 bg-white/60 rounded-full hover:bg-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="hidden md:block mb-10">
            <h3 className="font-black text-2xl text-slate-800 tracking-tight">Setup<br/>Tenancy</h3>
            <p className="text-sm text-slate-500 font-medium mt-2">Follow the steps to onboard your new tenant.</p>
          </div>
          
          <div className="flex md:flex-col gap-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0 relative">
            {steps.map((step, idx) => {
              const isActive = currentStep === idx;
              const isCompleted = isStepCompleted(idx);
              return (
                <div key={step.id} className="relative shrink-0 md:shrink-auto">
                  {isActive && (
                    <motion.div
                      layoutId="activeStep"
                      className="absolute inset-0 bg-white rounded-full md:rounded-2xl shadow-sm border border-white/60"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <button
                    onClick={() => setCurrentStep(idx)}
                    className={`relative w-auto md:w-full flex items-center gap-2 md:gap-4 px-4 py-2 md:py-3.5 rounded-full md:rounded-2xl transition-all text-left cursor-pointer ${
                      isActive ? 'z-10' : 'hover:bg-white/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 
                      isActive ? 'bg-primary text-on-primary shadow-md shadow-primary/20' : 'bg-slate-200/50 text-slate-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4.5 h-4.5" /> : <step.icon className="w-4 h-4" />}
                    </div>
                    <span className={`font-bold text-sm transition-colors duration-300 ${
                      isActive ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2.5 text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm border border-transparent hover:border-slate-200 rounded-full transition-all hidden md:block z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto overflow-x-hidden pb-24 md:pb-12 w-full">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div 
                  key="step-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto md:mx-0 pt-2 md:pt-4 w-full"
                >
                  <div className="flex items-center gap-3 mb-6 md:mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                      <Users className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display">Tenant details</h2>
                  </div>

                  <div className="space-y-4 mb-10">
                    <AnimatePresence>
                      {tenants.map((t) => (
                        <motion.div 
                          key={t.id} 
                          layout
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                          whileHover={{ y: -2, scale: 1.01 }}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-2xl border border-white bg-white/60 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all group gap-4 sm:gap-0 w-full overflow-hidden"
                        >
                          <div>
                            <h4 className="font-bold text-slate-800 text-base mb-2 sm:mb-1.5">{t.firstName} {t.lastName}</h4>
                            <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-2 sm:gap-4 text-xs text-slate-500 font-semibold">
                              <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md w-fit max-w-full overflow-hidden"><Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-none">{t.email}</span></span>
                              <span className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-md w-fit"><Phone className="w-3.5 h-3.5 shrink-0" /> {t.phone}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:opacity-0 group-hover:opacity-100 transition-opacity mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100/50">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleEdit(t)} className="p-2.5 text-slate-400 hover:text-primary hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all shadow-sm">
                              <Pencil className="w-4 h-4" />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleDelete(t.id)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all shadow-sm">
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence mode="wait">
                    {isAdding ? (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleSaveTenant} 
                        className="bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-4 sm:p-6 md:p-8 mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden w-full"
                      >
                        <h4 className="font-black text-lg text-slate-800 mb-6">{editingId ? 'Edit Tenant' : 'Add New Tenant'}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">First Name</label>
                            <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" placeholder="John" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Last Name</label>
                            <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" placeholder="Doe" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-6 md:mb-8">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Email Address</label>
                            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" placeholder="john@example.com" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Phone Number</label>
                            <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" placeholder="+61 400 000 000" />
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-end border-t border-slate-100 pt-6">
                          <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); setFormData({firstName:'', lastName:'', email:'', phone:''}); }} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors w-full sm:w-auto">Cancel</button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-md shadow-slate-900/10 transition-all w-full sm:w-auto">
                            {editingId ? 'Save Changes' : 'Add Tenant'}
                          </motion.button>
                        </div>
                      </motion.form>
                    ) : (
                      <motion.button 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsAdding(true)}
                        className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:shadow-md transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Tenant
                      </motion.button>
                    )}
                  </AnimatePresence>

                </motion.div>
              )}
              
              {currentStep === 1 && (
                <motion.div 
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-3xl mx-auto md:mx-0 pt-2 md:pt-4 w-full"
                >
                  <div className="flex items-center gap-3 mb-6 md:mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display">Start date</h2>
                  </div>

                  <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-4 sm:p-6 md:p-8 mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Start Date<span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={leaseDetails.startDate} 
                          onChange={e => setLeaseDetails({...leaseDetails, startDate: e.target.value})} 
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700" 
                        />
                      </div>
                      <div className="relative z-20">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Lease type</label>
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => setIsLeaseTypeOpen(!isLeaseTypeOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer text-slate-700"
                          >
                            {leaseDetails.leaseType}
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isLeaseTypeOpen ? '-rotate-90' : 'rotate-90'}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isLeaseTypeOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-30"
                              >
                                {['Periodic', 'Fixed Term'].map((type) => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                      setLeaseDetails({...leaseDetails, leaseType: type});
                                      setIsLeaseTypeOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-50 ${leaseDetails.leaseType === type ? 'text-primary bg-primary/5' : 'text-slate-600'}`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {leaseDetails.leaseType === 'Fixed Term' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="mb-6 overflow-hidden"
                        >
                          <div className="w-full sm:w-[calc(50%-12px)]">
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">End Date<span className="text-red-500">*</span></label>
                            <input 
                              type="date" 
                              value={leaseDetails.endDate} 
                              onChange={e => setLeaseDetails({...leaseDetails, endDate: e.target.value})} 
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700" 
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-start gap-3 mt-6 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                      <div className="w-5 h-5 rounded-full bg-slate-200/50 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-500">i</span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        If you're not sure about the exact start or end date, you can put an approximate date and change it later before signing.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Placeholders for future steps */}
              {currentStep > 1 && currentStep < 4 && (
                <motion.div 
                  key={`step-${currentStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center justify-center h-full text-slate-400"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Rocket className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-500">Step {currentStep + 1}</h3>
                  <p className="mt-2 font-medium">This step is coming soon...</p>
                </motion.div>
              )}

              {/* Invite Tenants Summary Step */}
              {currentStep === 4 && (
                <motion.div 
                  key="step-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-3xl mx-auto md:mx-0 pt-2 md:pt-4 w-full"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display">Invite tenants</h2>
                  </div>

                  <div className="bg-blue-50/80 border border-blue-100 p-6 rounded-2xl mb-8">
                    <h3 className="text-blue-800 font-bold text-lg mb-2">Confirm your tenancy details.</h3>
                    <p className="text-blue-600/80 text-sm">Please carefully review the tenancy details and confirm that they are correct. Once you have confirmed the details, you can invite your tenant and begin their onboarding.</p>
                  </div>

                  <div className="space-y-6">
                    {/* Tenants Section */}
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[24px] p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-slate-700" />
                        <h4 className="font-bold text-slate-800 text-lg">Tenants</h4>
                        {isStepCompleted(0) ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ml-2"><CheckCircle2 className="w-3.5 h-3.5" /></div>
                        ) : (
                          <div className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold ml-2">Missing details</div>
                        )}
                      </div>
                      
                      {isStepCompleted(0) ? (
                        <div className="space-y-3 mb-4">
                          {tenants.map(t => (
                            <p key={t.id} className="text-sm text-slate-600">{t.firstName} {t.lastName} - {t.phone}, {t.email}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 mb-4">No tenants have been added to this tenancy yet.</p>
                      )}
                      
                      <button onClick={() => setCurrentStep(0)} className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit Tenant details
                      </button>
                    </div>

                    {/* Start Date Section */}
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[24px] p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarDays className="w-5 h-5 text-slate-700" />
                        <h4 className="font-bold text-slate-800 text-lg">Start Date</h4>
                        {isStepCompleted(1) ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ml-2"><CheckCircle2 className="w-3.5 h-3.5" /></div>
                        ) : (
                          <div className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold ml-2">Missing details</div>
                        )}
                      </div>
                      
                      {isStepCompleted(1) ? (
                        <div className="space-y-1 mb-4 text-sm text-slate-600">
                          <p><strong>Start Date:</strong> {leaseDetails.startDate}</p>
                          <p><strong>Lease Type:</strong> {leaseDetails.leaseType}</p>
                          {leaseDetails.leaseType === 'Fixed Term' && <p><strong>End Date:</strong> {leaseDetails.endDate}</p>}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 mb-4">No start date has been added to this tenancy yet.</p>
                      )}
                      
                      <button onClick={() => setCurrentStep(1)} className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit Start Date
                      </button>
                    </div>

                    {/* Bond Section */}
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[24px] p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-slate-700" />
                        <h4 className="font-bold text-slate-800 text-lg">Bond</h4>
                        {isStepCompleted(2) ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ml-2"><CheckCircle2 className="w-3.5 h-3.5" /></div>
                        ) : (
                          <div className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold ml-2">Missing details</div>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-4">No bond has been added to this tenancy yet.</p>
                      <button onClick={() => setCurrentStep(2)} className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit Bond
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 md:px-12 md:py-8 border-t border-slate-200/50 flex justify-between items-center bg-white/80 backdrop-blur-xl md:rounded-br-[32px] z-20">
            <div className="flex gap-2">
              {/* Add back button if needed in future */}
              {currentStep > 0 && (
                <button 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-4 py-2.5 md:px-6 md:py-3 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold text-slate-600 hover:bg-white shadow-sm transition-all"
                >
                  Back
                </button>
              )}
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              className="flex items-center gap-2 px-6 py-2.5 md:px-8 md:py-3.5 bg-slate-900 text-white rounded-xl md:rounded-2xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
            >
              Next Step <ChevronRight className="w-4 h-4 md:w-4.5 md:h-4.5" />
            </motion.button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
