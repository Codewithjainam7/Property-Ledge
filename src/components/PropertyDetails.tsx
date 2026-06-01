import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Building, Home, FileText, Wallet, Clock, Wrench, BarChart3, HelpCircle, XCircle, ClipboardList, Users, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';

export function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tenant');

  useEffect(() => {
    const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
    const found = loadedProps.find((p: any) => p.id === id);
    if (found) {
      setProperty(found);
    } else {
      navigate('/dashboard');
    }
  }, [id, navigate]);

  if (!property) return null;

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
      const updatedProps = loadedProps.filter((p: any) => p.id !== id);
      localStorage.setItem('properties', JSON.stringify(updatedProps));
      navigate('/dashboard');
    }
  };

  const bentoTenantItems = property.tenantName ? [
    { title: 'Tenant Profile', desc: `Current tenant: ${property.tenantName}. Contact: ${property.tenantEmail || 'N/A'}.`, icon: Users, action: 'View Profile', colSpan: 'md:col-span-2 lg:col-span-2', bg: 'bg-primary text-on-primary', accent: 'text-on-primary', iconBg: 'bg-white/10' },
    { title: 'Lease Agreement', desc: `Started: ${property.leaseStart ? new Date(property.leaseStart).toLocaleDateString() : 'N/A'}. Duration: ${property.leaseDuration || '12'} months.`, icon: FileText, action: 'View Lease', colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Rent Status', desc: 'Rent is currently paid up to date. Next payment due in 4 days.', icon: Wallet, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Communication', desc: 'Message tenant, log calls, and view email history.', icon: Home, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Upcoming Inspections', desc: 'Routine inspection scheduled for next month.', icon: Clock, action: 'Manage', colSpan: 'md:col-span-2 lg:col-span-1', bg: 'bg-secondary-container text-on-secondary-container', accent: 'text-on-secondary-container', iconBg: 'bg-white/30' },
  ] : [
    { title: 'Create Ad', desc: 'Craft your property listing and broadcast it to major real estate portals.', icon: FileText, action: 'Get Started', colSpan: 'md:col-span-2 lg:col-span-2', bg: 'bg-primary text-on-primary', accent: 'text-on-primary', iconBg: 'bg-white/10' },
    { title: 'Applications', desc: 'Review background checks, rental history, and affordability scores.', icon: ClipboardList, action: 'Review', colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Enquiries', desc: 'Manage prospect messages, emails, and direct phone calls instantly.', icon: Home, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Tenant Checks', desc: 'Identity verification and National Tenancy Database (NTD) screening.', icon: Users, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Tenancy Setup', desc: 'Finalize the digital lease agreement and collect the initial bond payment.', icon: Clock, action: 'Continue', colSpan: 'md:col-span-2 lg:col-span-1', bg: 'bg-secondary-container text-on-secondary-container', accent: 'text-on-secondary-container', iconBg: 'bg-white/30' },
  ];

  const bentoManageItems = [
    { title: 'Finance Report', desc: 'Generate EOFY tax-ready reports tracking all income and depreciable assets.', icon: BarChart3, action: 'View Report', colSpan: 'md:col-span-2 lg:col-span-2', bg: 'bg-primary text-on-primary', accent: 'text-on-primary', iconBg: 'bg-white/10' },
    { title: 'Maintenance', desc: 'Track repair requests, approve quotes, and schedule tradies.', icon: Wrench, action: 'Manage', colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Condition Report', desc: 'Digital entry, routine, and exit inspection photos and logs.', icon: Clock, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Tenant Bills', desc: 'Forward water usage and utility invoices directly to your tenant.', icon: FileText, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-surface-container-high text-on-surface', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Bond & Rent', desc: 'Monitor active ledger, upcoming due dates, and lodged bond receipts.', icon: Wallet, chevron: true, colSpan: 'md:col-span-2 lg:col-span-1', bg: 'bg-secondary-container text-on-secondary-container', accent: 'text-on-secondary-container', iconBg: 'bg-white/30' },
  ];

  const activeItems = activeTab === 'tenant' ? bentoTenantItems : bentoManageItems;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen relative overflow-hidden">
        
        {/* iOS 26 Ambient Background Blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none z-0"></div>

        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto relative z-10 space-y-8">
          
          {/* Dynamic Island Header (iOS Style) */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-4xl mx-auto bg-surface/80 backdrop-blur-2xl border border-white/50 rounded-[32px] md:rounded-full p-4 md:p-2.5 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[0_8px_30px_rgba(0,0,0,0.06)] gap-4"
          >
            <div className="flex items-center gap-4 pl-2 md:pl-4">
              <div className="w-14 h-14 bg-surface-container rounded-full flex items-center justify-center shrink-0 shadow-inner overflow-hidden border-2 border-surface relative">
                {property.image ? (
                  <img src={property.image} alt={property.address} className="w-full h-full object-cover" />
                ) : (
                  <Building className="w-6 h-6 text-on-surface-variant" />
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-base md:text-lg font-black text-on-surface leading-tight tracking-tight">
                  {property.address}, {property.suburb}
                </h1>
                <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant mt-0.5 uppercase tracking-wider">
                  <span>{property.state} {property.postcode}</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                  <span className="text-secondary">Draft Ad</span>
                </div>
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full md:w-auto px-6 py-3.5 bg-on-surface text-surface rounded-full font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
            >
              Activate Plan <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* iOS Segmented Control */}
          <div className="flex justify-center my-10">
            <div className="bg-surface-container-high/60 backdrop-blur-md p-1.5 rounded-full flex shadow-inner border border-white/20 w-full max-w-[340px] relative">
              {['tenant', 'manage'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex-1 py-3 text-center font-black text-xs uppercase tracking-widest z-10 transition-colors ${activeTab === tab ? 'text-on-surface' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
                >
                  {tab === 'tenant' ? (property.tenantName ? 'Current Tenant' : 'Find Tenant') : 'Manage Prop'}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="iosSegment"
                      className="absolute inset-0 bg-surface rounded-full shadow-sm border border-black/5"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bento Box Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
            >
              {activeItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  variants={itemVariants}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${item.colSpan} ${item.bg} rounded-[32px] p-6 md:p-8 flex flex-col min-h-[220px] relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.08)] cursor-pointer`}
                >
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-sm ${item.accent} ${item.iconBg}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      {item.chevron && (
                        <div className="w-8 h-8 rounded-full bg-surface/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="w-4 h-4 text-on-surface-variant" />
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto">
                      <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2 font-display">{item.title}</h3>
                      <p className="text-sm font-medium leading-relaxed max-w-[90%] mb-6 opacity-80">{item.desc}</p>
                    </div>

                    {item.action && (
                      <div className="mt-auto pt-2">
                        <button className="bg-white/10 backdrop-blur-md text-inherit px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-sm hover:bg-white/20 transition-colors flex items-center gap-2 group-hover:shadow-md">
                          {item.action} <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="pt-12 pb-16 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              className="text-xs font-black text-error/60 hover:text-error uppercase tracking-widest px-6 py-3 rounded-full hover:bg-error/10 transition-colors flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Delete Property Profile
            </motion.button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
