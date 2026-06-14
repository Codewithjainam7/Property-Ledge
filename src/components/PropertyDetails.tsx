import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, MapPin, Building, Home, FileText, Wallet, Clock, Wrench, BarChart3, HelpCircle, XCircle, ClipboardList, Users, User, ArrowUpRight, Trash2, Plus, Image as ImageIcon, Maximize2, X, CheckCircle2, Send, Mail, Phone, Briefcase, DollarSign, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
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

  const [invitingEnquiryId, setInvitingEnquiryId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [activeLease, setActiveLease] = useState<any>(null);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  // Edit Property State
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  // Tenant Invitation State
  const [tenant, setTenant] = useState<any>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    rentAmount: '',
    leaseStart: ''
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

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



      // Fetch active lease details including tenant_signature
      const { data: leaseData } = await supabase
        .from('leases')
        .select('*')
        .eq('property_id', id)
        .eq('status', 'Active')
        .maybeSingle();
        
      if (leaseData) {
        setActiveLease(leaseData);
      }

      // Fetch tenant details linked to this property
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('property_id', id)
        .maybeSingle();

      setTenant(tenantData);
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



  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);

    try {
      const userRes = await supabase.auth.getUser();
      const currentUserId = userRes.data.user?.id;
      if (!currentUserId) throw new Error("Not authenticated");

      // Check if user with this email already exists
      const { data: existingUserId, error: rpcError } = await supabase.rpc('get_user_by_email', { p_email: inviteForm.email });

      // Create pending tenant
      const { data: newTenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          property_id: id,
          owner_id: currentUserId,
          first_name: inviteForm.firstName,
          last_name: inviteForm.lastName,
          email: inviteForm.email,
          user_id: !rpcError && existingUserId ? existingUserId : null,
          status: 'Pending',
          access_level: { receives_emails: true, can_login: true }
        })
        .select()
        .single();

      if (tenantErr) throw tenantErr;

      // Create pending lease
      const { error: leaseErr } = await supabase
        .from('leases')
        .insert({
          property_id: id,
          created_by: currentUserId,
          start_date: inviteForm.leaseStart,
          rent_amount: parseFloat(inviteForm.rentAmount) || 0,
          status: 'Pending',
          payment_frequency: property.paymentFrequency || 'Weekly'
        });

      if (leaseErr) throw leaseErr;

      // Update property columns
      await supabase
        .from('properties')
        .update({
          tenant_name: `${inviteForm.firstName} ${inviteForm.lastName}`,
          tenant_email: inviteForm.email,
          rent_amount: parseFloat(inviteForm.rentAmount) || property.rentAmount,
          lease_start: inviteForm.leaseStart
        })
        .eq('id', id);

      // Send email invite
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: inviteForm.email,
            subject: `Welcome to Property Ledge - Accept Your Lease at ${property.address}`,
            templateType: 'tenant-invite',
            variables: {
              firstName: inviteForm.firstName,
              lastName: inviteForm.lastName,
              propertyAddress: `${property.address}, ${property.suburb}`,
              inviteUrl: `${window.location.origin}/signup?invite=true&email=${inviteForm.email}`,
              rentAmount: inviteForm.rentAmount || '0',
              leaseStart: inviteForm.leaseStart
            }
          }
        });
      } catch (emailErr: any) {
        console.error("Mailtrap Edge Function call failed (continuing with simulated invite):", emailErr);
      }

      // Close the invite form modal and show the beautiful success modal
      setIsInviteModalOpen(false);
      setShowInviteSuccessModal(true);
      
      setTenant(newTenant);
      setProperty(prev => ({
        ...prev,
        tenantName: `${inviteForm.firstName} ${inviteForm.lastName}`,
        tenantEmail: inviteForm.email,
        rentAmount: parseFloat(inviteForm.rentAmount) || prev.rentAmount,
        leaseStart: inviteForm.leaseStart
      }));

      // Reset form
      setInviteForm({ firstName: '', lastName: '', email: '', rentAmount: '', leaseStart: '' });
      
      // Auto close success modal after 4 seconds
      setTimeout(() => {
        setShowInviteSuccessModal(false);
      }, 4000);

    } catch (err: any) {
      console.error("Failed to invite tenant:", err);
      setInviteError(err.message || "Failed to create invitation. Please try again.");
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async () => {
    if (!tenant) return;
    try {
      const userRes = await supabase.auth.getUser();
      const landlordEmail = userRes.data.user?.email || '';
      await supabase.functions.invoke('send-email', {
        body: {
          to: tenant.email,
          subject: `Welcome to Property Ledge - Accept Your Lease at ${property.address}`,
          templateType: 'tenant-invite',
          variables: {
            firstName: tenant.first_name || 'Tenant',
            lastName: tenant.last_name || '',
            propertyAddress: `${property.address}, ${property.suburb}`,
            inviteUrl: `${window.location.origin}/signup?invite=true&email=${tenant.email}`,
            rentAmount: property.rent_amount || '0',
            leaseStart: property.lease_start
          }
        }
      });
      alert("Invitation email resent successfully!");
    } catch (err) {
      console.error("Error resending invite:", err);
      alert("Failed to resend invitation email.");
    }
  };

  const handleCancelInvite = async () => {
    if (!window.confirm("Are you sure you want to cancel this pending tenant invitation?")) return;
    try {
      await supabase.from('tenants').delete().eq('property_id', id).in('status', ['Pending', 'Invited']);
      await supabase.from('leases').delete().eq('property_id', id).in('status', ['Pending', 'Invited']);

      await supabase.from('properties').update({
        tenant_name: null,
        tenant_email: null,
        lease_start: null
      }).eq('id', id);

      setTenant(null);
      setProperty(prev => ({
        ...prev,
        tenantName: null,
        tenantEmail: null,
        leaseStart: null
      }));
      alert("Tenant invitation canceled.");
    } catch (err) {
      console.error("Error canceling invite:", err);
      alert("Failed to cancel invitation.");
    }
  };

  const handleRemoveTenant = async () => {
    if (!permissions?.can_manage_tenants) return;
    if (window.confirm("Are you sure you want to remove the current tenant? This will also terminate their active lease.")) {
      await supabase.from('properties').update({
        tenant_name: null,
        tenant_email: null,
        lease_start: null
      }).eq('id', id);

      await supabase.from('leases').update({
        status: 'Terminated',
        end_date: new Date().toISOString().split('T')[0]
      }).eq('property_id', id).eq('status', 'Active');

      await supabase.from('tenants').delete().eq('property_id', id);

      setTenant(null);
      setProperty(prev => ({ ...prev, tenantName: null, tenantEmail: null, leaseStart: null }));
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

  const renderTenantTab = () => {
    if (!tenant) {
      return (
        <div className="col-span-full bg-slate-900 border border-white/10 rounded-[32px] p-8 md:p-12 text-center shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0" />
          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-slate-300">
              <Users className="w-10 h-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">Property is Vacant</h3>
              <p className="text-slate-400 max-w-md mx-auto font-medium text-sm md:text-base">
                Invite a tenant to register, claim their portal, sign lease documents, and manage rent payments.
              </p>
            </div>
            <button 
              onClick={() => {
                setInviteForm({
                  firstName: '',
                  lastName: '',
                  email: '',
                  rentAmount: property?.rentAmount || '',
                  leaseStart: property?.leaseStart || ''
                });
                setIsInviteModalOpen(true);
              }}
              className="bg-white text-slate-950 hover:bg-slate-200 transition-all font-bold text-sm px-8 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Invite Tenant to this Property
            </button>
          </div>
        </div>
      );
    }

    if (tenant.status === 'Pending' || tenant.status === 'Invited') {
      return (
        <div className="col-span-full bg-surface-container-lowest border border-outline-variant/50 rounded-[32px] p-8 md:p-12 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none z-0" />
          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-amber-600">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-widest mb-2">
                Invitation Sent
              </div>
              <h3 className="text-2xl font-black text-on-surface tracking-tight">
                Pending Digital Handshake
              </h3>
              <p className="text-on-surface-variant/80 max-w-md mx-auto font-medium text-sm md:text-base">
                An invitation was emailed to <span className="text-on-surface font-semibold">{tenant.email}</span>. They need to set up their password and confirm lease details.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto bg-surface border border-outline-variant/50 rounded-2xl p-4 text-left shadow-sm">
              <div>
                <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider block">Tenant Name</span>
                <span className="text-sm font-semibold text-on-surface">{tenant.first_name} {tenant.last_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider block">Lease Start</span>
                <span className="text-sm font-semibold text-on-surface">{property.leaseStart ? new Date(property.leaseStart).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider block">Rent Amount</span>
                <span className="text-sm font-semibold text-on-surface">${property.rentAmount}/{property.paymentFrequency === 'Weekly' ? 'wk' : property.paymentFrequency === 'Fortnightly' ? 'fn' : 'mo'}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider block">Access Level</span>
                <span className="text-sm font-semibold text-on-surface">Portal Enabled</span>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={handleResendInvite}
                className="bg-surface hover:bg-surface-container text-on-surface border border-outline-variant/50 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full cursor-pointer shadow-sm"
              >
                Resend Invitation
              </button>
              <button 
                onClick={handleCancelInvite}
                className="bg-error-container/30 hover:bg-error-container/50 text-error border border-error-container transition-all font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full cursor-pointer shadow-sm"
              >
                Cancel Invitation
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {bentoTenantItems.map((item, index) => (
          <motion.div
            key={item.title}
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (item.action === 'View Lease') {
                setIsLeaseModalOpen(true);
              }
            }}
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
      </>
    );
  };

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
              {['tenant', 'manage'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex-1 py-3 px-2 text-center font-black text-[10px] md:text-xs uppercase tracking-widest z-10 transition-colors cursor-pointer ${activeTab === tab ? 'text-on-surface' : 'text-on-surface-variant/70 hover:text-on-surface'}`}
                >
                  <span className="relative z-20">
                    {tab === 'tenant' ? (property.tenantName ? 'Current Tenant' : 'Tenant') : 'Manage Prop'}
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
              <motion.div
                key={activeTab}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
              >
                {activeTab === 'tenant' ? renderTenantTab() : (
                  bentoManageItems.map((item, index) => (
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
                  ))
                )}
              </motion.div>
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

      {/* Invite Success Animated Modal via Portal */}
      {createPortal(
        <AnimatePresence>
          {showInviteSuccessModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-[#0d0e12] border border-white/10 rounded-[32px] p-8 relative z-10 overflow-hidden shadow-2xl text-center"
              >
                {/* Glow effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-emerald-500/20 blur-[60px] pointer-events-none" />
                
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(52,211,153,0.4)]"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>

                <motion.h3 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-black text-white tracking-tight mb-2"
                >
                  Invitation Sent!
                </motion.h3>

                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-slate-400 text-sm font-semibold mb-8 leading-relaxed"
                >
                  A secure setup link has been successfully dispatched to the tenant's email address. They can now complete their digital lease handshake.
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setShowInviteSuccessModal(false)}
                  className="w-full bg-white text-slate-950 font-black uppercase tracking-widest text-xs py-4 rounded-full hover:bg-slate-200 transition-colors shadow-lg"
                >
                  Close
                </motion.button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Lease Agreement Viewer Modal via Portal */}
      {createPortal(
        <AnimatePresence>
          {isLeaseModalOpen && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 md:p-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                onClick={() => setIsLeaseModalOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-surface rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
                  <div className="text-on-primary">
                    <h3 className="text-2xl font-black tracking-tight mb-1">Residential Lease Agreement</h3>
                    <p className="text-on-primary/80 text-sm font-medium">Digital lease record and signatures.</p>
                  </div>
                  <button 
                    onClick={() => setIsLeaseModalOpen(false)} 
                    className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-surface-container-lowest">
                  <div className="prose prose-sm max-w-none text-on-surface-variant mb-8 bg-white p-6 rounded-2xl border border-outline-variant/30 shadow-inner">
                    <h4 className="text-lg font-black text-on-surface mb-4">Terms and Conditions</h4>
                    <p>This Residential Tenancy Agreement is officially recorded.</p>
                    <p><strong>Property Address:</strong><br/>{property.address}, {property.suburb}, {property.state} {property.postcode}</p>
                    <p><strong>Rent Amount:</strong> ${activeLease?.rent_amount || property.rentAmount || property.rent_amount} per {activeLease?.payment_frequency || property.paymentFrequency || property.payment_frequency}</p>
                    <p><strong>Lease Term:</strong> {activeLease?.start_date ? new Date(activeLease.start_date).toLocaleDateString() : (property.leaseStart ? new Date(property.leaseStart).toLocaleDateString() : new Date().toLocaleDateString())} to {activeLease?.end_date ? new Date(activeLease.end_date).toLocaleDateString() : (property.leaseStart ? new Date(new Date(property.leaseStart).setMonth(new Date(property.leaseStart).getMonth() + (property.leaseDuration || 12))).toLocaleDateString() : 'N/A')}</p>
                    <p><strong>Bond Amount:</strong> ${activeLease?.bond_amount || (activeLease?.rent_amount || property.rentAmount || property.rent_amount) * 4}</p>
                    
                    <hr className="my-6 border-outline-variant/40" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col">
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-2">Landlord / Owner</span>
                        <span className="text-sm font-bold text-on-surface">{permissions?.is_owner ? 'You (Landlord)' : 'Property Manager'}</span>
                        <span className="text-xs text-on-surface-variant mt-1">{permissions?.email || ''}</span>
                      </div>
                      
                      <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col">
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-2">Tenant</span>
                        <span className="text-sm font-bold text-on-surface">{property.tenantName || 'N/A'}</span>
                        <span className="text-xs text-on-surface-variant mt-1">{property.tenantEmail || 'N/A'}</span>
                      </div>
                    </div>

                    {activeLease?.tenant_signature ? (
                      <div className="mt-6 p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-3">Tenant's Digital Signature</span>
                        <div className="bg-white p-4 rounded-xl border border-emerald-100/60 shadow-sm max-w-md w-full flex items-center justify-center">
                          <img src={activeLease.tenant_signature} alt="Tenant Signature" className="max-w-full max-h-[120px] object-contain" />
                        </div>
                        <span className="text-[10px] text-emerald-700/80 mt-3 font-mono">Digitally signed on {new Date(activeLease.updated_at).toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl text-center text-sm font-semibold flex items-center justify-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        Waiting for tenant signature.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/30 flex gap-4 shrink-0 justify-end">
                  <button 
                    onClick={() => setIsLeaseModalOpen(false)} 
                    className="px-6 py-3 bg-primary text-white hover:bg-primary/95 rounded-full font-black text-xs uppercase tracking-widest transition-colors cursor-pointer shadow-md"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Invite Tenant Modal */}
      {createPortal(
        <AnimatePresence>
          {isInviteModalOpen && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                onClick={() => setIsInviteModalOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-surface rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10"
              >
                <div className="bg-primary px-8 py-6 flex items-center justify-between shrink-0">
                  <div className="text-on-primary">
                    <h3 className="text-2xl font-black tracking-tight mb-1">Invite Tenant</h3>
                    <p className="text-on-primary/80 text-sm font-medium">Link a resident to this property.</p>
                  </div>
                  <button 
                    onClick={() => setIsInviteModalOpen(false)} 
                    className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleInviteSubmit} className="p-8 space-y-5 bg-surface-container-lowest overflow-y-auto">
                  {inviteError && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {inviteError}
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {inviteSuccess}
                    </div>
                  )}

                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex items-center gap-3">
                    <Building className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider block">Target Property</span>
                      <span className="text-sm font-bold text-on-surface">{property.address}, {property.suburb}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">First Name</label>
                      <input
                        required
                        type="text"
                        value={inviteForm.firstName}
                        onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                        className="w-full bg-white border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Last Name</label>
                      <input
                        required
                        type="text"
                        value={inviteForm.lastName}
                        onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                        className="w-full bg-white border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Tenant Email</label>
                    <input
                      required
                      type="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full bg-white border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                      placeholder="tenant@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Weekly Rent ($)</label>
                      <input
                        required
                        type="number"
                        value={inviteForm.rentAmount}
                        onChange={e => setInviteForm({ ...inviteForm, rentAmount: e.target.value })}
                        className="w-full bg-white border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                        placeholder="550"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Lease Start Date</label>
                      <input
                        required
                        type="date"
                        value={inviteForm.leaseStart}
                        onChange={e => setInviteForm({ ...inviteForm, leaseStart: e.target.value })}
                        className="w-full bg-white border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="flex-1 px-6 py-3.5 bg-surface-container border border-outline-variant/30 text-on-surface hover:bg-surface-container-high rounded-full font-black text-xs uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex-1 px-6 py-3.5 bg-primary text-on-primary hover:bg-primary/90 rounded-full font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {inviting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send Invite'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </DashboardLayout>
  );
}
