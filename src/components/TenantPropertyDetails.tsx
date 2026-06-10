import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Home, Bed, Bath, Car, CheckCircle2, Info, Send, Clock, ArrowUpRight, Users, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

import { SignaturePad } from './SignaturePad';

export function TenantPropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enquiryStatus, setEnquiryStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSuccessTransition, setShowSuccessTransition] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: session?.user?.email || '',
    phone: '',
    employmentStatus: 'Employed Full-Time',
    monthlyIncome: '',
    message: 'I am very interested in renting this property. Please let me know the next steps.'
  });

  useEffect(() => {
    if (id) {
      fetchPropertyDetails();
    }
    if (id && session?.user?.id) {
      checkExistingEnquiry();
    }
  }, [id, session]);

  const fetchPropertyDetails = async () => {
    try {
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
        
      if (propError) throw propError;
      
      // Fetch owner profile manually since there's no direct FK
      if (propData && propData.owner_id) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, email')
          .eq('id', propData.owner_id)
          .single();
          
        propData.user_profiles = profileData;
      }
      
      setProperty(propData);
      
      const propImages = propData.images?.length > 0 ? propData.images : (propData.image ? [propData.image] : []);
      setImages(propImages);
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-rotation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (images.length > 1 && !isFullScreenMode && !isHovering && !isModalOpen && !isLeaseModalOpen) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [images.length, isFullScreenMode, isHovering, isModalOpen, isLeaseModalOpen]);

  const checkExistingEnquiry = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('property_enquiries')
        .select('status')
        .eq('property_id', id)
        .eq('tenant_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        setEnquiryStatus(data[0].status);
      } else {
        setEnquiryStatus(null);
      }
    } catch (error) {
      console.error("Error checking enquiry:", error);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitApplication = async () => {
    if (!session?.user?.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('property_enquiries')
        .insert({
          property_id: id,
          tenant_id: session.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          employment_status: formData.employmentStatus,
          monthly_income: Number(formData.monthlyIncome) || 0,
          message: formData.message,
          status: 'Pending'
        });

      if (error) throw error;
      
      setEnquiryStatus('Pending');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert(`Failed to submit: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignLease = async () => {
    if (!session?.user?.id || !signatureData) return;
    setIsSubmitting(true);
    try {
      // Use the secure RPC function to bypass RLS and perform all lease operations atomically
      const { error: rpcError } = await supabase.rpc('accept_lease', {
        p_property_id: id,
        p_signature_data: signatureData
      });
        
      if (rpcError) throw rpcError;

      setEnquiryStatus('Accepted');
      setShowSuccessTransition(true);
      
      // Delay navigation to show success animation
      setTimeout(() => {
        setIsLeaseModalOpen(false);
        navigate('/dashboard/my-lease');
      }, 3000);
      
    } catch (err: any) {
      console.error(err);
      alert(`Failed to sign the lease: ${err.message || JSON.stringify(err)}. Please try again or contact support.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!property) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center">
          <h2 className="text-2xl font-bold">Property not found</h2>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-primary hover:underline">Go back</button>
        </div>
      </DashboardLayout>
    );
  }

  const bentoTenantItems = [
    { 
      title: enquiryStatus === 'Pending' ? 'Application Sent' : enquiryStatus === 'Invited' ? 'You\'re Invited!' : enquiryStatus === 'Accepted' ? 'Lease Active' : 'Submit Application', 
      desc: enquiryStatus === 'Pending' ? 'The landlord is reviewing your application.' : enquiryStatus === 'Invited' ? 'The landlord has officially invited you to rent this property. Click here to Accept.' : enquiryStatus === 'Accepted' ? 'You are currently renting this property.' : 'Apply directly to the landlord to rent this property.', 
      icon: enquiryStatus ? CheckCircle2 : Send, 
      action: enquiryStatus === 'Pending' || enquiryStatus === 'Accepted' ? null : enquiryStatus === 'Invited' ? 'Review & Sign Lease' : 'Apply Now', 
      colSpan: 'md:col-span-2 lg:col-span-2', 
      bg: enquiryStatus === 'Invited' ? 'bg-emerald-500 text-white' : 'bg-primary text-on-primary', 
      accent: enquiryStatus === 'Invited' ? 'text-emerald-100' : 'text-on-primary', 
      iconBg: 'bg-white/10',
      onClick: () => {
        if (!enquiryStatus) setIsModalOpen(true);
        if (enquiryStatus === 'Invited') setIsLeaseModalOpen(true);
      }
    },
    { 
      title: 'Listed By', 
      desc: `${property.user_profiles?.first_name || 'Property'} ${property.user_profiles?.last_name || 'Owner'} is the verified landlord for this property.`, 
      icon: Users, 
      colSpan: 'md:col-span-1 lg:col-span-1', 
      bg: 'bg-surface-container-high text-on-surface', 
      accent: 'text-primary', 
      iconBg: 'bg-primary/10' 
    },
    { 
      title: 'Bedrooms', 
      desc: `${property.bedrooms} spacious bedroom${property.bedrooms !== 1 ? 's' : ''}.`, 
      icon: Bed, 
      colSpan: 'md:col-span-1 lg:col-span-1', 
      bg: 'bg-surface-container-high text-on-surface', 
      accent: 'text-primary', 
      iconBg: 'bg-primary/10' 
    },
    { 
      title: 'Bathrooms', 
      desc: `${property.bathrooms} modern bathroom${property.bathrooms !== 1 ? 's' : ''}.`, 
      icon: Bath, 
      colSpan: 'md:col-span-1 lg:col-span-1', 
      bg: 'bg-surface-container-high text-on-surface', 
      accent: 'text-primary', 
      iconBg: 'bg-primary/10' 
    },
    { 
      title: 'Parking', 
      desc: `${property.car_spaces} dedicated car space${property.car_spaces !== 1 ? 's' : ''}.`, 
      icon: Car, 
      colSpan: 'md:col-span-1 lg:col-span-1', 
      bg: 'bg-secondary-container text-on-secondary-container', 
      accent: 'text-on-secondary-container', 
      iconBg: 'bg-white/30' 
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen relative overflow-hidden">
        
        {/* iOS Ambient Background Blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none z-0"></div>

        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto relative z-10 space-y-8">
          
          {/* Back Button */}
          <div className="mb-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors bg-surface-container-low hover:bg-surface-container px-4 py-2 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </button>
          </div>

          {/* Hero Cover Image */}
          <div 
            className="w-full h-64 md:h-80 lg:h-96 rounded-[32px] overflow-hidden relative mb-[-40px] shadow-sm bg-surface-container group cursor-pointer"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => images.length > 0 && setIsFullScreenMode(true)}
          >
            <AnimatePresence initial={false}>
              {images.length > 0 ? (
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt={`${property.address} - view ${currentImageIndex + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center absolute inset-0">
                  <Home className="w-16 h-16 text-on-surface-variant/30 mb-2" />
                  <span className="text-sm font-medium text-on-surface-variant/60">No images available</span>
                </div>
              )}
            </AnimatePresence>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <div className={`absolute inset-0 flex items-center justify-between px-4 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length); }}
                  className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/50 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % images.length); }}
                  className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/50 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
            
            {/* Expand Icon */}
            {images.length > 0 && (
              <div className="absolute bottom-12 right-6 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                <Maximize2 className="w-4 h-4" />
              </div>
            )}
            
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg text-primary z-30">
              {property.property_type}
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
                  <span className="text-primary">${property.rent_amount || '0'}/{property.payment_frequency === 'Monthly' ? 'mo' : 'wk'}</span>
                </div>
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!enquiryStatus) setIsModalOpen(true);
              }}
              className="w-full md:w-auto px-6 py-3.5 bg-on-surface text-surface rounded-full font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {enquiryStatus ? 'Application Status' : 'Apply Now'} <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* Spacer for aesthetics */}
          <div className="h-4"></div>

          {/* Tab Content (Bento Box Grid) */}
          <AnimatePresence mode="wait">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
            >
              {bentoTenantItems.map((item) => (
                <motion.div
                  key={item.title}
                  variants={itemVariants}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.onClick}
                  className={`${item.colSpan} ${item.bg} rounded-[32px] p-6 md:p-8 flex flex-col min-h-[220px] relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${item.onClick ? 'cursor-pointer' : ''}`}
                >
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-sm ${item.accent} ${item.iconBg}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      {(item as any).chevron && (
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
                        <button className="bg-white/10 backdrop-blur-md text-inherit px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-sm hover:bg-white/20 transition-colors flex items-center gap-2 group-hover:shadow-md cursor-pointer">
                          {item.action} <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Tailwind Application Form Modal via Portal */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 sm:px-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-surface rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
              >
                <div className="p-6 md:p-8 overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black font-display tracking-tight text-on-surface">Rental Application</h2>
                    <button 
                      onClick={() => !isSubmitting && setIsModalOpen(false)} 
                      className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 text-primary mb-8 border border-primary/10">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium leading-relaxed">This information will be sent directly to the verified landlord for review. Your data is secure.</p>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">First Name <span className="text-error">*</span></label>
                        <input 
                          type="text" name="firstName" value={formData.firstName} onChange={handleChange} 
                          className="w-full bg-surface-container hover:bg-surface-container-high px-5 py-3.5 rounded-2xl outline-none border-2 border-transparent focus:border-primary/20 transition-all font-medium text-on-surface" 
                          placeholder="John" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Last Name <span className="text-error">*</span></label>
                        <input 
                          type="text" name="lastName" value={formData.lastName} onChange={handleChange} 
                          className="w-full bg-surface-container hover:bg-surface-container-high px-5 py-3.5 rounded-2xl outline-none border-2 border-transparent focus:border-primary/20 transition-all font-medium text-on-surface" 
                          placeholder="Doe" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Email <span className="text-error">*</span></label>
                        <input 
                          type="email" name="email" value={formData.email} onChange={handleChange} 
                          className="w-full bg-surface-container hover:bg-surface-container-high px-5 py-3.5 rounded-2xl outline-none border-2 border-transparent focus:border-primary/20 transition-all font-medium text-on-surface" 
                          placeholder="john@example.com" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Phone <span className="text-error">*</span></label>
                        <input 
                          type="tel" name="phone" value={formData.phone} onChange={handleChange} 
                          className="w-full bg-surface-container hover:bg-surface-container-high px-5 py-3.5 rounded-2xl outline-none border-2 border-transparent focus:border-primary/20 transition-all font-medium text-on-surface" 
                          placeholder="0400 000 000" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Employment <span className="text-error">*</span></label>
                        <div className="relative">
                          <select 
                            name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} 
                            className="w-full bg-surface-container hover:bg-surface-container-high px-5 py-3.5 rounded-2xl outline-none border-2 border-transparent focus:border-primary/20 transition-all font-medium text-on-surface appearance-none cursor-pointer"
                          >
                            <option value="Employed Full-Time">Employed Full-Time</option>
                            <option value="Employed Part-Time">Employed Part-Time</option>
                            <option value="Self-Employed">Self-Employed</option>
                            <option value="Student">Student</option>
                            <option value="Unemployed">Unemployed</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Monthly Income <span className="text-error">*</span></label>
                        <input 
                          type="number" name="monthlyIncome" value={formData.monthlyIncome} onChange={handleChange} 
                          className="w-full bg-surface-container hover:bg-surface-container-high px-5 py-3.5 rounded-2xl outline-none border-2 border-transparent focus:border-primary/20 transition-all font-medium text-on-surface" 
                          placeholder="5000" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Message to Landlord</label>
                      <textarea 
                        name="message" value={formData.message} onChange={handleChange} rows={3}
                        className="w-full bg-surface-container hover:bg-surface-container-high px-5 py-3.5 rounded-2xl outline-none border-2 border-transparent focus:border-primary/20 transition-all font-medium text-on-surface resize-none" 
                        placeholder="Hi, I am very interested in your property..." 
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button 
                      onClick={() => setIsModalOpen(false)} 
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSubmitApplication} 
                      disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.phone || !formData.monthlyIncome}
                      className="flex-[2] px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          Send Application <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Lease Agreement & Signature Modal via Portal */}
      {createPortal(
        <AnimatePresence>
          {isLeaseModalOpen && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 md:p-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                onClick={() => !isSubmitting && !showSuccessTransition && setIsLeaseModalOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-surface rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {showSuccessTransition ? (
                  <div className="flex flex-col items-center justify-center p-16 text-center min-h-[400px]">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                    >
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>
                    <motion.h3 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl font-black text-on-surface tracking-tight mb-3"
                    >
                      Congratulations!
                    </motion.h3>
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-on-surface-variant font-medium text-lg max-w-md mx-auto mb-8"
                    >
                      You are now the official tenant of <span className="font-bold text-on-surface">{property?.address}</span>.
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center gap-3 text-sm font-bold text-primary"
                    >
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                      Redirecting to My Lease dashboard...
                    </motion.div>
                  </div>
                ) : (
                  <>
                    <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
                      <div className="text-on-primary">
                        <h3 className="text-2xl font-black tracking-tight mb-1">Residential Lease Agreement</h3>
                        <p className="text-on-primary/80 text-sm font-medium">Please review and sign to secure your property.</p>
                      </div>
                      <button 
                        onClick={() => !isSubmitting && setIsLeaseModalOpen(false)} 
                        className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                      <div className="prose prose-sm max-w-none text-on-surface-variant mb-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-inner">
                        <h4 className="text-lg font-black text-on-surface mb-4">Terms and Conditions</h4>
                        <p>This Residential Tenancy Agreement is made on <strong>{new Date().toLocaleDateString()}</strong>.</p>
                        <p><strong>Between:</strong></p>
                        <p>Landlord: {property.user_profiles?.first_name} {property.user_profiles?.last_name} ({property.user_profiles?.email})</p>
                        <p><strong>And:</strong></p>
                        <p>Tenant: {session?.user?.user_metadata?.first_name} {session?.user?.user_metadata?.last_name} ({session?.user?.email})</p>
                        <hr className="my-4 border-outline-variant/40" />
                        <p><strong>Property Address:</strong><br/>{property.address}, {property.suburb}, {property.state} {property.postcode}</p>
                        <p><strong>Rent Amount:</strong> ${property.rent_amount} per {property.payment_frequency}</p>
                        <p><strong>Lease Term:</strong> 12 Months, commencing on {new Date().toLocaleDateString()}</p>
                        <p><strong>Bond Amount:</strong> ${property.rent_amount * 4}</p>
                        <hr className="my-4 border-outline-variant/40" />
                        <p className="text-xs text-on-surface-variant/70 leading-relaxed">
                          By signing this agreement, the Tenant agrees to be bound by the standard terms and conditions of a residential tenancy, including timely payment of rent, maintenance of the property in a clean and undamaged state, and adherence to all local strata or council regulations.
                        </p>
                      </div>

                      <SignaturePad onSign={(data) => setSignatureData(data)} />
                    </div>

                    <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/30 flex gap-4 shrink-0">
                      <button 
                        onClick={() => setIsLeaseModalOpen(false)} 
                        disabled={isSubmitting}
                        className="px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer w-32"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSignLease} 
                        disabled={isSubmitting || !signatureData}
                        className="flex-1 px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Generating Lease...
                          </>
                        ) : (
                          <>
                            Sign & Accept Lease <CheckCircle2 className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Full-Screen Lightbox via Portal */}
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
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length); }}
                  className="absolute left-4 md:left-8 w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white transition-all z-50"
                >
                  <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              )}
              
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt={`${property.address} full screen view ${currentImageIndex + 1}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
              />

              {images.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % images.length); }}
                  className="absolute right-4 md:right-8 w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white transition-all z-50"
                >
                  <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </DashboardLayout>
  );
}
