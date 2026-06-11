import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, MapPin, Building, Home, FileText, Wallet, Clock, Wrench, BarChart3, HelpCircle, XCircle, ClipboardList, Users, User, ArrowUpRight, Trash2, Plus, Image as ImageIcon, Maximize2, X, CheckCircle2, Send, Mail, Phone, Briefcase, DollarSign, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import emailjs from '@emailjs/browser';
import { SkeletonDetails } from './Skeletons';
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
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [invitingEnquiryId, setInvitingEnquiryId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any>(null);

  // Edit Property State
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const loadProperty = async () => {
      if (!id) return;
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        navigate('/dashboard/properties');
        return;
      }
      
      if (data.owner_id === userId) {
        setPermissions({
          can_view_property: true,
          can_view_lease: true,
          can_create_lease: true,
          can_edit_lease: true,
          can_manage_tenants: true,
          is_owner: true,
        });
      } else {
        const { data: teamData } = await supabase
          .from('property_team')
          .select('*')
          .eq('property_id', id)
          .eq('user_id', userId)
          .single();
          
        if (teamData) {
          setPermissions(teamData);
        } else {
          navigate('/dashboard/properties');
          return;
        }
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
      const propImages = mapped.images?.length > 0 ? mapped.images : (mapped.image ? [mapped.image] : []);
      setImages(propImages);

      // Fetch enquiries
      const { data: enquiriesData } = await supabase
        .from('property_enquiries')
        .select('*')
        .eq('property_id', id)
        .order('created_at', { ascending: false });
        
      if (enquiriesData) {
        setEnquiries(enquiriesData);
      }
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

  if (!property) {
    return (
      <DashboardLayout>
        <SkeletonDetails />
      </DashboardLayout>
    );
  }

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
          .update({ 
            image: newImages[0],
            images: newImages
          })
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
      .update({ 
        image: newImages[0] || null,
        images: newImages
      })
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

  const handleInviteTenant = async (enquiryId: string) => {
    try {
      setInvitingEnquiryId(enquiryId);
      
      const enq = enquiries.find(e => e.id === enquiryId);
      if (!enq) throw new Error("Enquiry not found");

      // Get landlord's email for the Reply-To field
      const { data: { session } } = await supabase.auth.getSession();
      const landlordEmail = session?.user?.email || '';

      // Send the real email using EmailJS
      await emailjs.send(
        'service_pvyeiv4',
        'template_83ro5mn',
        {
          email: enq.email,
          to_email: enq.email, // Standard EmailJS variable
          user_email: enq.email,
          tenant_name: enq.first_name,
          to_name: enq.first_name,
          role: 'Tenant',
          property_address: `${property.address}, ${property.suburb}`,
          reply_to: landlordEmail,
          property_id: property.id,
          invite_link: `${window.location.origin}/dashboard/marketplace/${property.id}`
        },
        'HiMuS6V2asatgtQDn'
      );

      // 1. Update Enquiry Status
      const { error: enqError } = await supabase
        .from('property_enquiries')
        .update({ status: 'Invited' })
        .eq('id', enquiryId);
        
      if (enqError) throw enqError;
      
      // 2. Update local state
      setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, status: 'Invited' } : e));
      
      alert("Invitation email successfully sent to the tenant! They can now accept the offer from their dashboard.");
    } catch (err: any) {
      console.error("Failed to invite tenant:", err);
      alert(`Failed to invite tenant. Error: ${err?.text || err?.message || 'Unknown error'}`);
    } finally {
      setInvitingEnquiryId(null);
    }
  };

  const handleRemoveTenant = async () => {
    if (!permissions?.can_manage_tenants) return;
    if (window.confirm("Are you sure you want to remove the current tenant? This will also terminate their active lease.")) {
      // Clear tenant info from property
      await supabase.from('properties').update({
        tenant_name: null,
        tenant_email: null
      }).eq('id', id);

      // Terminate any active leases for this property
      await supabase.from('leases').update({
        status: 'Terminated',
        end_date: new Date().toISOString().split('T')[0]
      }).eq('property_id', id).eq('status', 'Active');

      setProperty(prev => ({ ...prev, tenantName: null, tenantEmail: null }));
      alert("Tenant removed and active leases terminated.");
    }
  };

  const handleTerminateLease = async () => {
    if (!permissions?.can_edit_lease) return;
    if (window.confirm("Are you sure you want to terminate the active lease?")) {
      await supabase.from('leases').update({
        status: 'Terminated',
        end_date: new Date().toISOString().split('T')[0]
      }).eq('property_id', id).eq('status', 'Active');

      alert("Active leases terminated successfully.");
    }
  };

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    setEditError('');
    setEditing(true);

    try {
      const { error } = await supabase.from('properties').update({
        address: editingProperty.address,
        suburb: editingProperty.suburb,
        postcode: editingProperty.postcode,
        state: editingProperty.state,
        property_type: editingProperty.propertyType,
        bedrooms: parseInt(editingProperty.bedrooms) || 0,
        bathrooms: parseFloat(editingProperty.bathrooms) || 0,
        car_spaces: parseInt(editingProperty.car_spaces) || 0,
        status: editingProperty.status
      }).eq('id', id);

      if (error) throw error;

      setProperty(prev => ({ ...prev, ...editingProperty }));
      setShowEditPropertyModal(false);
    } catch (err: any) {
      console.error("Edit property error:", err);
      setEditError(err.message || "Failed to update property details.");
    } finally {
      setEditing(false);
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
              {permissions?.can_view_property && (
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg text-on-surface hover:bg-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 transform md:-translate-y-2 md:group-hover:translate-y-0 duration-200"
                >
                  <Wrench className="w-4 h-4" /> Options
                </button>
              )}

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
                        <button 
                          onClick={() => {
                            setEditingProperty(property);
                            setShowEditPropertyModal(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container rounded-xl cursor-pointer transition-colors text-left"
                        >
                          <Building className="w-4 h-4" /> Edit Property Details
                        </button>
                        <div className="h-px bg-outline-variant/30 my-1 mx-2"></div>
                        
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
            <div className="bg-surface-container-high/60 backdrop-blur-md p-1.5 rounded-full flex shadow-inner border border-white/20 w-full max-w-[500px] relative">
              {['tenant', 'applications', 'manage'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex-1 py-3 px-2 text-center font-black text-[10px] md:text-xs uppercase tracking-widest z-10 transition-colors cursor-pointer ${activeTab === tab ? 'text-on-surface' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
                >
                  <span className="relative z-20">
                    {tab === 'tenant' ? (property.tenantName ? 'Current Tenant' : 'Find Tenant') : tab === 'applications' ? `Applications (${enquiries.length})` : 'Manage Prop'}
                  </span>
                  {activeTab === tab && (
                    <motion.div
                      layoutId="iosSegment"
                      className="absolute inset-0 bg-surface rounded-full shadow-sm border border-black/5"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ zIndex: 10 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'applications' ? (
              <motion.div
                key="applications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-outline-variant/30"
              >
                <h3 className="text-2xl font-black font-display tracking-tight mb-6">Rental Applications</h3>
                
                {enquiries.length === 0 ? (
                  <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 border-dashed">
                    <ClipboardList className="w-12 h-12 text-on-surface-variant/40 mx-auto mb-3" />
                    <p className="text-on-surface-variant font-medium">No applications received yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {enquiries.map((enq) => (
                      <div key={enq.id} className="bg-surface border border-outline-variant/30 p-6 md:p-8 rounded-[24px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        {/* Status Ribbon */}
                        <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl font-black text-[10px] uppercase tracking-widest ${
                          enq.status === 'Invited' ? 'bg-emerald-500 text-white' : 
                          enq.status === 'Accepted' ? 'bg-primary text-white' : 
                          'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {enq.status}
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 mt-4 md:mt-0">
                          {/* Tenant Info */}
                          <div className="flex-1 space-y-6">
                            <div>
                              <h4 className="text-2xl font-black font-display tracking-tight text-on-surface mb-1">
                                {enq.first_name} {enq.last_name}
                              </h4>
                              <p className="text-sm font-medium text-on-surface-variant flex items-center gap-2">
                                Submitted {new Date(enq.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20">
                                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary shrink-0">
                                  <Mail className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Email</p>
                                  <p className="text-sm font-medium text-on-surface truncate">{enq.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20">
                                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary shrink-0">
                                  <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Phone</p>
                                  <p className="text-sm font-medium text-on-surface">{enq.phone}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20">
                                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                                  <Briefcase className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Employment</p>
                                  <p className="text-sm font-medium text-on-surface">{enq.employment_status}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                  <DollarSign className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Monthly Income</p>
                                  <p className="text-sm font-black text-on-surface">${enq.monthly_income}</p>
                                </div>
                              </div>
                            </div>
                            
                            {enq.message && (
                              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 relative">
                                <div className="absolute top-4 left-4 text-primary/20">
                                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/></svg>
                                </div>
                                <p className="text-sm italic text-on-surface-variant/90 leading-relaxed pl-10 pt-1 pr-2 relative z-10">
                                  {enq.message}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col justify-end gap-3 md:min-w-[200px] border-t md:border-t-0 md:border-l border-outline-variant/20 pt-5 md:pt-0 md:pl-8">
                            {enq.status === 'Pending' && (
                              <>
                                {permissions?.can_manage_tenants ? (
                                  <>
                                    <button 
                                      onClick={() => handleInviteTenant(enq.id)}
                                      disabled={invitingEnquiryId === enq.id}
                                      className="w-full bg-primary text-on-primary hover:bg-primary/90 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                      {invitingEnquiryId === enq.id ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                                          Sending Email...
                                        </>
                                      ) : (
                                        <>
                                          Invite by Email <Send className="w-4 h-4" />
                                        </>
                                      )}
                                    </button>
                                    <button className="w-full bg-surface-container text-on-surface hover:bg-error hover:text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors">
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <div className="bg-surface-container/50 text-on-surface-variant px-4 py-3 rounded-xl text-center text-xs font-bold uppercase tracking-wide">
                                    No Permission
                                  </div>
                                )}
                              </>
                            )}
                            {(enq.status === 'Invited' || enq.status === 'Accepted') && (
                              <div className="flex flex-col gap-2 items-center justify-center bg-emerald-50 rounded-2xl p-6 border border-emerald-100 text-center h-full">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <span className="font-black text-emerald-700 tracking-tight">
                                  {enq.status === 'Accepted' ? 'Lease Signed' : 'Invitation Sent'}
                                </span>
                                <span className="text-xs font-medium text-emerald-600/80">
                                  {enq.status === 'Accepted' ? 'Tenant has accepted the lease' : 'Waiting for tenant to accept'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
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
            )}
          </AnimatePresence>

          {/* Management Actions Section */}
          <AnimatePresence>
            {activeTab === 'tenant' && property.tenantName && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-8 pt-8 border-t border-outline-variant/30"
              >
                <h3 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-6 px-2">Property Manager Actions</h3>
                <div className="flex flex-wrap gap-4">
                  {permissions?.can_manage_tenants && (
                    <button 
                      onClick={handleRemoveTenant}
                      className="bg-error/10 hover:bg-error/20 text-error px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <User className="w-4 h-4" /> Remove Tenant
                    </button>
                  )}
                  {permissions?.can_edit_lease && (
                    <button 
                      onClick={handleTerminateLease}
                      className="bg-warning/10 hover:bg-warning/20 text-warning px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <AlertTriangle className="w-4 h-4" /> Terminate Lease
                    </button>
                  )}
                  {permissions?.can_edit_lease && (
                    <Link 
                      to="/dashboard/leases"
                      className="bg-primary/10 hover:bg-primary/20 text-primary px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4" /> Manage Renewals
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {permissions?.is_owner && (
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
          )}

        </div>
      </div>

      {/* Edit Property Modal */}
      {createPortal(
        <AnimatePresence>
          {showEditPropertyModal && editingProperty && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditPropertyModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[32px] w-full max-w-2xl shadow-2xl border border-outline-variant/50 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
                  <h3 className="font-black text-lg text-on-surface flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" /> Edit Property Details
                  </h3>
                  <button onClick={() => setShowEditPropertyModal(false)} className="text-on-surface-variant hover:text-on-surface"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                  {editError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>{editError}</p>
                    </div>
                  )}

                  <form onSubmit={handleEditProperty} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Street Address</label>
                      <input 
                        type="text" 
                        required
                        value={editingProperty.address}
                        onChange={(e) => setEditingProperty({...editingProperty, address: e.target.value})}
                        className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Suburb</label>
                        <input 
                          type="text" 
                          required
                          value={editingProperty.suburb}
                          onChange={(e) => setEditingProperty({...editingProperty, suburb: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">State</label>
                        <input 
                          type="text" 
                          required
                          value={editingProperty.state}
                          onChange={(e) => setEditingProperty({...editingProperty, state: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Postcode</label>
                        <input 
                          type="text" 
                          required
                          value={editingProperty.postcode}
                          onChange={(e) => setEditingProperty({...editingProperty, postcode: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Property Type</label>
                        <select
                          value={editingProperty.propertyType}
                          onChange={(e) => setEditingProperty({...editingProperty, propertyType: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none"
                        >
                          <option value="House">House</option>
                          <option value="Apartment">Apartment</option>
                          <option value="Townhouse">Townhouse</option>
                          <option value="Villa">Villa</option>
                          <option value="Duplex">Duplex</option>
                          <option value="Commercial">Commercial</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status</label>
                        <select
                          value={editingProperty.status}
                          onChange={(e) => setEditingProperty({...editingProperty, status: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Bedrooms</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editingProperty.bedrooms}
                          onChange={(e) => setEditingProperty({...editingProperty, bedrooms: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Bathrooms</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.5"
                          value={editingProperty.bathrooms}
                          onChange={(e) => setEditingProperty({...editingProperty, bathrooms: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Car Spaces</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editingProperty.car_spaces}
                          onChange={(e) => setEditingProperty({...editingProperty, car_spaces: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowEditPropertyModal(false)}
                        className="flex-1 bg-white border border-outline-variant/50 hover:bg-surface-container-low text-on-surface font-bold py-3.5 rounded-2xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={editing}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {editing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
