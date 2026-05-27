import React, { useState } from 'react';
import { User, Image as ImageIcon, MapPin, CreditCard, Receipt, FileText, Tag, Briefcase, Mail, Phone, Shield, Edit2, Check, X, Camera, ChevronRight } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'motion/react';

export function AccountSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{"name":"Jainam Jain","email":"jainam@gmail.com","mobile":"86000 59074"}'));
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'contact', label: 'Contact Information', icon: MapPin },
    { id: 'payment', label: 'Payment History', icon: Receipt },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'income', label: 'Income & Expense Codes', icon: Tag },
    { id: 'remittance', label: 'Remittance Codes', icon: FileText },
  ];

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = (field: string) => {
    const updatedUser = { ...user, [field]: editValue };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setEditingField(null);
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  const renderField = (fieldId: string, label: string, value: string, icon: React.ReactNode, type: string = "text", fullWidth: boolean = false) => {
    const isEditing = editingField === fieldId;

    return (
      <div className={`group relative bg-white rounded-2xl p-5 border border-[#e2e8f0] transition-colors focus-within:border-[#356064] focus-within:ring-1 focus-within:ring-[#356064] shadow-sm hover:shadow-md ${fullWidth ? 'col-span-full' : ''}`}>
        <label className="text-xs font-bold text-[#6a808f] uppercase tracking-widest block mb-3">{label}</label>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#f8f9fa] flex items-center justify-center shrink-0">
            {icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div 
                  key="edit"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-3"
                >
                  <input
                    type={type}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    className="w-full bg-[#f8f9fa] text-[15px] font-bold text-[#0C2B4B] rounded-xl px-4 py-2 border-2 border-[#356064] outline-none"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => handleSave(fieldId)} className="p-2.5 rounded-xl bg-[#356064] text-white hover:bg-[#254548] transition-colors shadow-sm">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={handleCancel} className="p-2.5 rounded-xl bg-white border border-[#e2e8f0] text-[#6a808f] hover:bg-[#f8f9fa] hover:text-[#0C2B4B] transition-colors shadow-sm">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="view"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-base font-bold text-[#0C2B4B] truncate">{value}</span>
                  <div className="shrink-0 flex items-center">
                    <button 
                      type="button"
                      onClick={() => handleEdit(fieldId, value)}
                      className="opacity-0 group-hover:opacity-100 px-4 py-2 text-sm font-bold bg-[#f8f9fa] border border-[#e2e8f0] rounded-xl text-[#0C2B4B] hover:border-[#356064] hover:bg-white transition-all focus:opacity-100 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#e2e8f0] px-6 md:px-10 py-5 flex items-center gap-3">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#0C2B4B]">Dashboard</h1>
        <ChevronRight className="w-5 h-5 text-[#a0acb5]" />
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#6a808f]">Account Settings</h1>
      </header>

      <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-10 items-start">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-[300px] lg:w-[320px] shrink-0 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-[32px] shadow-sm border border-[#e2e8f0] relative overflow-hidden">
            <div className="absolute inset-0 bg-[#356064] h-28"></div>
            
            <div className="relative pt-12 px-6 pb-8 flex flex-col items-center">
              <div className="relative group mb-4">
                <div className="w-28 h-28 bg-white rounded-full p-1.5 shadow-lg shrink-0 z-10 transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full bg-[#f8f9fa] rounded-full flex flex-col items-center justify-center overflow-hidden border border-[#e2e8f0] relative cursor-pointer group/avatar">
                    <User className="w-10 h-10 text-[#a0acb5]" />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                      <Camera className="w-6 h-6 text-white mb-2" />
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">Update</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-black text-[#0C2B4B] tracking-tight">{user.name || 'Jainam Jain'}</h2>
                <p className="text-[11px] font-bold text-[#6a808f] mt-2 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#356064]" /> Member since {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>

          {/* Vertical Navigation Tabs */}
          <div className="bg-white rounded-[24px] shadow-sm border border-[#e2e8f0] p-3">
            <nav className="flex flex-col gap-1">
              {tabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3.5 px-5 py-4 rounded-xl text-sm font-bold transition-all relative overflow-hidden group
                    ${activeTab === tab.id ? 'text-[#356064]' : 'text-[#6a808f] hover:text-[#0C2B4B] hover:bg-[#f8f9fa]'}
                  `}
                >
                  {activeTab === tab.id && (
                    <motion.div layoutId="vertTab" className="absolute inset-0 bg-[#eef3f7] z-0 rounded-xl" />
                  )}
                  <tab.icon className={`w-4 h-4 z-10 ${activeTab === tab.id ? 'text-[#356064]' : 'group-hover:text-[#0C2B4B]'}`} />
                  <span className="z-10 tracking-wide">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 w-full min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[24px] shadow-sm border border-[#e2e8f0] p-8 md:p-10">
                  <h3 className="text-lg font-black text-[#0C2B4B] mb-6 flex items-center gap-3">
                    <User className="w-6 h-6 text-[#356064]" /> Personal Identity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField('name', 'Full Legal Name', user.name || 'Jainam Jain', <User className="w-5 h-5 text-[#356064]" />, 'text', true)}
                    {renderField('email', 'Primary Email', user.email || 'jainam@gmail.com', <Mail className="w-5 h-5 text-[#356064]" />, 'email')}
                    {renderField('mobile', 'Primary Phone', user.mobile || '86000 59074', <Phone className="w-5 h-5 text-[#356064]" />, 'tel')}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'contact' && (
              <motion.div 
                key="contact"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-[24px] shadow-sm border border-[#e2e8f0] p-8">
                   <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 rounded-full bg-[#f8f9fa] flex items-center justify-center border border-[#e2e8f0]">
                       <Briefcase className="w-5 h-5 text-[#356064]" />
                     </div>
                     <div>
                       <h3 className="text-lg font-black text-[#0C2B4B]">Contact Roles</h3>
                       <p className="text-sm font-bold text-[#6a808f]">Manage operational contact points</p>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="bg-[#0C2B4B] w-2 h-2 rounded-full"></span>
                           <h4 className="font-bold text-[#0C2B4B] uppercase tracking-wider text-sm">Billing Details</h4>
                        </div>
                        {renderField('billing_email', 'Billing Email', user.billing_email || user.email || 'billing@example.com', <Mail className="w-5 h-5 text-[#356064]" />, 'email')}
                        {renderField('billing_phone', 'Billing Phone', user.billing_phone || user.mobile || '+91 86000 59074', <Phone className="w-5 h-5 text-[#356064]" />, 'tel')}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="bg-[#356064] w-2 h-2 rounded-full"></span>
                           <h4 className="font-bold text-[#0C2B4B] uppercase tracking-wider text-sm">Rental Provider Details</h4>
                        </div>
                        {renderField('provider_email', 'Provider Email', user.provider_email || user.email || 'provider@example.com', <Mail className="w-5 h-5 text-[#356064]" />, 'email')}
                        {renderField('provider_phone', 'Provider Phone', user.provider_phone || user.mobile || '+91 86000 59074', <Phone className="w-5 h-5 text-[#356064]" />, 'tel')}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab !== 'profile' && activeTab !== 'contact' && (
              <motion.div 
                key="coming-soon"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-[#e2e8f0] p-12 rounded-[32px] shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center"
              >
                <div className="w-24 h-24 bg-[#f8f9fa] rounded-[24px] flex items-center justify-center mb-6 shadow-inner border border-[#e2e8f0]">
                  {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Briefcase, { className: "w-10 h-10 text-[#356064]" })}
                </div>
                <h2 className="text-3xl font-black text-[#0C2B4B] mb-4">{tabs.find(t => t.id === activeTab)?.label}</h2>
                <p className="text-[#6a808f] font-medium text-lg max-w-md">This section is currently under development. Settings and preferences will be available here soon.</p>
                <button 
                  className="mt-10 px-8 py-4 bg-[#f8f9fa] border border-[#e2e8f0] text-[#0C2B4B] font-bold text-sm uppercase tracking-widest rounded-2xl hover:border-[#356064] hover:bg-white transition-all shadow-sm" 
                  onClick={() => setActiveTab('profile')}
                >
                  Return to Profile
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
