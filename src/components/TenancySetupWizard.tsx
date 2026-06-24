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
  ChevronRight
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
  { id: 'start_date', label: 'Start date', icon: CheckCircle2 }, // The user's screenshot has a green check for start date, but CalendarDays might be better before it's done. Let's use CheckCircle2 for completed, but for now just static icons.
  { id: 'bond', label: 'Bond', icon: Shield },
  { id: 'lease_agreement', label: 'Lease agreement', icon: FileText },
  { id: 'invite_tenants', label: 'Invite tenants', icon: Rocket },
];

export default function TenancySetupWizard({ isOpen, onClose, propertyId }: TenancySetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tenants, setTenants] = useState<TenantInput[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
      setIsAdding(false);
    }
    setFormData({ firstName: '', lastName: '', email: '', phone: '' });
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-12">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] z-10"
      >
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
          <div className="flex items-center justify-between md:hidden mb-6">
            <h3 className="font-bold text-slate-800">Tenancy Setup</h3>
            <button onClick={onClose} className="p-2 bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="space-y-1">
            {steps.map((step, idx) => {
              const isActive = currentStep === idx;
              const isPast = currentStep > idx;
              return (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-emerald-500 text-white' : 
                    isPast ? 'bg-emerald-500 text-white' : 'text-slate-400'
                  }`}>
                    {isPast || isActive ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`font-semibold text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative bg-white">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors hidden md:block"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 p-8 md:p-12 overflow-y-auto">
            {currentStep === 0 && (
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-slate-700" />
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tenant details</h2>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-8">
                  <Rocket className="w-3.5 h-3.5" /> Adding tenant details...
                </div>

                <div className="space-y-4 mb-8">
                  {tenants.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow group">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1">{t.firstName} {t.lastName}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {t.email}</span>
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {t.phone}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 border border-slate-200 rounded-lg bg-white shadow-sm transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg bg-white shadow-sm transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {isAdding ? (
                  <form onSubmit={handleSaveTenant} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
                    <h4 className="font-bold text-slate-800 mb-4">{editingId ? 'Edit Tenant' : 'Add New Tenant'}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">First Name</label>
                        <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="John" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Last Name</label>
                        <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Doe" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Email Address</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="john@example.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Phone Number</label>
                        <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="+61 400 000 000" />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); setFormData({firstName:'', lastName:'', email:'', phone:''}); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                      <button type="submit" className="px-4 py-2 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-sm transition-colors">{editingId ? 'Save Changes' : 'Add Tenant'}</button>
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Tenant
                  </button>
                )}

              </div>
            )}
            
            {/* Placeholders for future steps */}
            {currentStep > 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>Step {currentStep + 1} content coming soon...</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
            <div />
            <button 
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === 0 && tenants.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
