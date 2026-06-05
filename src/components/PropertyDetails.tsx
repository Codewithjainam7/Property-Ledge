import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, MapPin, Building, Home, FileText, Wallet, Clock, Wrench, BarChart3, HelpCircle, XCircle, ClipboardList, Users, ArrowUpRight, Trash2, Plus, Image as ImageIcon, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';

export function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tenant');
  
  // Gallery State
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const loadProperty = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        navigate('/dashboard/properties');
        return;
      }

      // Map snake_case to camelCase for UI
      const mapped = {
        ...data,
        rentAmount: data.rent_amount,
        propertyType: data.property_type,
        paymentFrequency: data.payment_frequency,
        tenantName: data.tenant_name,
        tenantEmail: data.tenant_email,
        leaseStart: data.lease_start,
        leaseDuration: data.lease_duration,
      };
      setProperty(mapped);
      const propImages = mapped.images || (mapped.image ? [mapped.image] : []);
      setImages(propImages);
    };
    loadProperty();
  }, [id, navigate]);



  // Auto-rotation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (images.length > 1 && !isFullScreenMode && !isHovering && !isMenuOpen) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [images.length, isFullScreenMode, isHovering, isMenuOpen]);

  if (!property) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, action: 'add' | 'replace' = 'replace') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        let newImages = [...images];
        if (action === 'replace' && images.length > 0) {
          newImages[currentImageIndex] = base64String;
        } else if (action === 'add' && images.length < 5) {
          newImages.push(base64String);
          setCurrentImageIndex(newImages.length - 1);
        } else if (images.length === 0) {
          newImages = [base64String];
        }

        setImages(newImages);
        setProperty({ ...property, images: newImages, image: newImages[0] });
        
        // Save to Supabase
        await supabase
          .from('properties')
          .update({ image: newImages[0] })
          .eq('id', id);

        setIsMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = async () => {
    if (images.length === 0) return;
    
    const newImages = [...images];
    newImages.splice(currentImageIndex, 1);
    
    setImages(newImages);
    setCurrentImageIndex(prev => Math.min(prev, Math.max(0, newImages.length - 1)));
    setProperty({ ...property, images: newImages, image: newImages[0] || null });
    
    // Save to Supabase
    await supabase
      .from('properties')
      .update({ image: newImages[0] || null })
      .eq('id', id);

    setIsMenuOpen(false);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      await supabase.from('properties').delete().eq('id', id);
      navigate('/dashboard/properties');
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
          
          {/* Back Button */}
          <div className="mb-4">
            <Link 
              to="/dashboard/properties" 
              className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors bg-surface-container-low hover:bg-surface-container px-4 py-2 rounded-full"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Properties
            </Link>
          </div>

          {/* Hero Cover Image */}
          <div 
            className="w-full h-64 md:h-80 lg:h-96 rounded-[32px] overflow-hidden relative mb-[-40px] shadow-sm group cursor-pointer bg-surface-container"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => images.length > 0 && setIsFullScreenMode(true)}
          >
            <AnimatePresence initial={false}>
              {images.length > 0 ? (
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt={property.address}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <div className="w-full h-full bg-surface-container flex items-center justify-center absolute inset-0">
                  <Building className="w-16 h-16 text-on-surface-variant/30" />
                </div>
              )}
            </AnimatePresence>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>
            
            {/* Image Indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {images.map((_, idx) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40'}`} />
                ))}
              </div>
            )}

            {/* Expand Icon */}
            {images.length > 0 && (
              <div className="absolute bottom-12 right-6 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                <Maximize2 className="w-4 h-4" />
              </div>
            )}

            {/* Action Menu Toggle */}
            <div 
              className="absolute top-6 right-6 z-30"
              onClick={(e) => e.stopPropagation()}
              onMouseLeave={() => setIsMenuOpen(false)}
            >
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg text-on-surface hover:bg-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 transform md:-translate-y-2 md:group-hover:translate-y-0 duration-200"
              >
                <Wrench className="w-4 h-4" /> Edit Cover Image
              </button>

              {/* Action Menu Dropdown */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 pt-2 z-50"
                  >
                    <div className="w-48 bg-surface rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden">
                      <div className="p-1">
                        {images.length < 5 && (
                          <label className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container rounded-xl cursor-pointer transition-colors">
                            <Plus className="w-4 h-4" /> Add Image ({images.length}/5)
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'add')} />
                          </label>
                        )}
                        {images.length > 0 && (
                          <>
                            <label className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container rounded-xl cursor-pointer transition-colors">
                              <ImageIcon className="w-4 h-4" /> Replace Image
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'replace')} />
                            </label>
                            <button 
                              onClick={handleDeleteImage}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-error hover:bg-error/10 rounded-xl cursor-pointer transition-colors text-left"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Image
                            </button>
                          </>
                        )}
                        {images.length === 0 && (
                          <label className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container rounded-xl cursor-pointer transition-colors">
                            <Plus className="w-4 h-4" /> Upload Image
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'add')} />
                          </label>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Dynamic Island Header (iOS Style) */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
            className="w-full max-w-4xl mx-auto bg-surface/90 backdrop-blur-2xl border border-white/50 rounded-[32px] md:rounded-full p-4 md:p-3 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[0_12px_40px_rgba(0,0,0,0.12)] gap-4 relative z-10"
          >
            <div className="flex items-center gap-4 pl-2 md:pl-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 shadow-inner">
                <MapPin className="w-5 h-5" />
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
                  className={`relative flex-1 py-3 text-center font-black text-xs uppercase tracking-widest z-10 transition-colors cursor-pointer ${activeTab === tab ? 'text-on-surface' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
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

      {/* Full-Screen Lightbox via Portal to break out of DashboardLayout z-index */}
      {createPortal(
        <AnimatePresence>
          {isFullScreenMode && images.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-8"
              onClick={() => setIsFullScreenMode(false)}
            >
              <button 
                className="absolute top-6 right-6 md:top-8 md:right-8 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-full flex items-center justify-center gap-2 text-white transition-all shadow-xl z-50 group"
                onClick={(e) => { e.stopPropagation(); setIsFullScreenMode(false); }}
              >
                <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Close</span>
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              </button>
              
              {images.length > 1 && (
                <>
                  <button 
                    className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-lg z-50 hover:scale-105"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button 
                    className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-lg z-50 hover:scale-105"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}

              <motion.img
                key={`fs-${currentImageIndex}`}
                src={images[currentImageIndex]}
                alt={property.address}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
              />

              {images.length > 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full text-white text-sm font-bold tracking-widest uppercase flex items-center gap-2 shadow-xl">
                  <ImageIcon className="w-4 h-4" /> {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </DashboardLayout>
  );
}
