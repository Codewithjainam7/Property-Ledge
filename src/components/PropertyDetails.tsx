import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, MapPin, Building, Home, FileText, Wallet, Clock, Wrench, BarChart3, HelpCircle, XCircle, ClipboardList, Users, User, ArrowUpRight, Trash2, Plus, Image as ImageIcon, Maximize2, X, CheckCircle2, Send, Mail, Phone, Briefcase, DollarSign, AlertTriangle, Sparkles, IdCard, UserCheck, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { TextField, Box, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { SkeletonDetails } from './Skeletons';
import { useAuth } from '../contexts/AuthContext';
import TenancySetupWizard from './TenancySetupWizard';

export function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userContext } = useAuth();
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

  // Edit Tenant State
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [tenantEditError, setTenantEditError] = useState('');
  const [editingTenantLoading, setEditingTenantLoading] = useState(false);

  // Tenant Invitation State
  const [loadingData, setLoadingData] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    rentAmount: '',
    leaseStart: ''
  });
  const [invitingType, setInvitingType] = useState<'direct' | 'invite' | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [leaseFileBase64, setLeaseFileBase64] = useState<string | null>(null);
  const [isTenancySetupOpen, setIsTenancySetupOpen] = useState(false);

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
          setPermissions({
            can_view_property: teamData.permissions?.can_view_property ?? false,
            can_view_lease: teamData.permissions?.can_view_lease ?? false,
            can_create_lease: teamData.permissions?.can_create_lease ?? false,
            can_edit_lease: teamData.permissions?.can_edit_lease ?? false,
            can_manage_tenants: teamData.permissions?.can_manage_tenants ?? false,
            is_owner: false,
          });
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

      if (window.location.search.includes('edit=true') && data.owner_id === userId) {
        setEditingProperty(mapped);
        setShowEditPropertyModal(true);
      }



      // Fetch active lease, tenants, and team members in parallel for faster loading
      const [leaseRes, tenantsRes, teamMembersRes] = await Promise.all([
        supabase.from('leases').select('*').eq('property_id', id).eq('status', 'Active').maybeSingle(),
        supabase.from('tenants').select('*').eq('property_id', id),
        supabase.from('property_team').select('id, user_id, role, status, permissions').eq('property_id', id)
      ]);

      const leaseData = leaseRes.data;
      const directTenants = tenantsRes.data;
      const teamMembers = teamMembersRes.data;

      if (leaseData) {
        setActiveLease(leaseData);
      }

      if (directTenants && directTenants.length > 0) {
        // Got tenants directly — use them. Also try to enrich with rent share from lease_tenants if available.
        if (leaseData) {
          const { data: leaseTenantsData } = await supabase
            .from('lease_tenants')
            .select('tenant_id, rent_share_percentage, is_primary')
            .eq('lease_id', leaseData.id);

          const shareMap: Record<string, { rent_share_percentage: number; is_primary: boolean }> = {};
          if (leaseTenantsData) {
            for (const lt of leaseTenantsData) {
              shareMap[lt.tenant_id] = {
                rent_share_percentage: lt.rent_share_percentage,
                is_primary: lt.is_primary
              };
            }
          }

          setTenants(directTenants.map(t => ({
            ...t,
            rent_share_percentage: shareMap[t.id]?.rent_share_percentage ?? t.rent_share_percentage ?? Math.round(100 / directTenants.length),
            is_primary: shareMap[t.id]?.is_primary ?? t.is_primary ?? false
          })));
        } else {
          // No active lease, just show tenants as-is
          setTenants(directTenants.map(t => ({
            ...t,
            rent_share_percentage: t.rent_share_percentage ?? Math.round(100 / directTenants.length),
            is_primary: t.is_primary ?? false
          })));
        }
      } else if (leaseData) {
        // Fallback: try lease_tenants junction table
        const { data: leaseTenantsData } = await supabase
          .from('lease_tenants')
          .select('rent_share_percentage, is_primary, tenants(*)')
          .eq('lease_id', leaseData.id);
          
        if (leaseTenantsData && leaseTenantsData.length > 0) {
          setTenants(leaseTenantsData.map(lt => ({
            ...lt.tenants,
            rent_share_percentage: lt.rent_share_percentage,
            is_primary: lt.is_primary
          })));
        } else if (mapped.tenantName) {
          setTenants([{
             id: 'fallback',
             first_name: mapped.tenantName.split(' ')[0] || mapped.tenantName,
             last_name: mapped.tenantName.split(' ').slice(1).join(' ') || '',
             email: mapped.tenantEmail || '',
             rent_share_percentage: 100,
             is_primary: true
          }]);
        } else {
          setTenants([]);
        }
      } else if (mapped.tenantName) {
        // Last resort: use the denormalized tenant_name on the property itself
        setTenants([{
           id: 'fallback',
           first_name: mapped.tenantName.split(' ')[0] || mapped.tenantName,
           last_name: mapped.tenantName.split(' ').slice(1).join(' ') || '',
           email: mapped.tenantEmail || '',
           rent_share_percentage: 100,
           is_primary: true
        }]);
      } else {
        setTenants([]);
      }
      
      setLoadingData(false);
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

  if (!property || loadingData) {
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
        // Save to Supabase (Only saving the primary image to DB as 'images' column doesn't exist yet)
        const { error } = await supabase
          .from('properties')
          .update({ 
            image: newImages[0]
          })
          .eq('id', id);
          
        if (error) console.error("Error saving image:", error);

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
    
    // Save to Supabase (Only updating primary image)
    const { error } = await supabase
      .from('properties')
      .update({ 
        image: newImages[0] || null
      })
      .eq('id', id);

    if (error) console.error("Error deleting image:", error);

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



  const handleInviteSubmit = async (e: React.FormEvent, method: 'direct' | 'invite' = 'direct') => {
    e.preventDefault();
    setInviteError('');
    setInvitingType(method);

    try {
      const userRes = await supabase.auth.getUser();
      const currentUserId = userRes.data.user?.id;
      if (!currentUserId) throw new Error("Not authenticated");

      // Check if user with this email already exists
      const { data: existingUserId, error: rpcError } = await supabase.rpc('get_user_by_email', { p_email: inviteForm.email });

      // Check if an active lease already exists
      let targetLeaseId = null;
      const { data: existingLease } = await supabase
        .from('leases')
        .select('id')
        .eq('property_id', id)
        .eq('status', 'Active')
        .limit(1)
        .maybeSingle();

      if (existingLease) {
        targetLeaseId = existingLease.id;
      } else {
        // Create active lease FIRST if none exists
        const { data: newLease, error: leaseErr } = await supabase
          .from('leases')
          .insert({
            property_id: id,
            created_by: currentUserId,
            start_date: inviteForm.leaseStart,
            rent_amount: parseFloat(inviteForm.rentAmount) || 0,
            status: 'Active',
            payment_frequency: property.paymentFrequency || 'Weekly'
          })
          .select()
          .single();

        if (leaseErr) throw leaseErr;
        targetLeaseId = newLease.id;
      }

      // Create tenant (Invited or Active)
      const inviteToken = method === 'invite' ? crypto.randomUUID() : null;
      const passcode = method === 'invite' ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      const status = method === 'invite' ? 'Invited' : 'Active';

      const { data: newTenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          property_id: id,
          owner_id: currentUserId,
          first_name: inviteForm.firstName,
          last_name: inviteForm.lastName,
          email: inviteForm.email,
          user_id: !rpcError && existingUserId ? existingUserId : null,
          status: status,
          invite_token: inviteToken,
          passcode: passcode,
          access_level: { receives_emails: true, can_login: method === 'invite' }
        })
        .select()
        .single();

      if (tenantErr) throw tenantErr;

      // Calculate new rent share
      let newShare = 100;
      let remainderShare = 100;
      let shouldUpdateExisting = false;

      if (existingLease) {
        // Recalculate for everyone regardless of invite or direct add
        const currentTenantsCount = tenants.length;
        const newTenantCount = currentTenantsCount + 1;
        newShare = Math.floor(100 / newTenantCount);
        remainderShare = 100 - (newShare * currentTenantsCount);
        shouldUpdateExisting = true;
      }

      if (shouldUpdateExisting) {
        // Update all existing tenants to the evenly divided share
        await supabase
          .from('lease_tenants')
          .update({ rent_share_percentage: newShare })
          .eq('lease_id', targetLeaseId);
      }

      // Link new tenant to lease
      const { error: junctionErr } = await supabase
        .from('lease_tenants')
        .insert({
          lease_id: targetLeaseId,
          tenant_id: newTenant.id,
          is_primary: !existingLease,
          rent_share_percentage: existingLease ? remainderShare : 100
        });

      if (junctionErr) throw junctionErr;

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

      // Send email invite / welcome
      try {
        const userRes = await supabase.auth.getUser();
        const landlordEmail = userRes.data.user?.email;

        if (method === 'invite') {
           // Send Digital Handshake / Portal Invitation
           await supabase.functions.invoke('send-email', {
            body: {
              to: inviteForm.email,
              subject: `Invitation to access your Resident Portal for ${property.address}`,
              templateType: 'tenant-invite',
              variables: {
                tenantFirstName: inviteForm.firstName,
                propertyAddress: `${property.address}, ${property.suburb}`,
                inviteUrl: `${window.location.origin}/accept-tenant-invite?token=${inviteToken}`,
                passcode: passcode,
                startDate: inviteForm.leaseStart,
                rentAmount: inviteForm.rentAmount || '0',
                senderName: landlordEmail,
                senderEmail: landlordEmail
              }
            }
          });
          setInviteSuccess("Invitation sent! Tenant's status is now 'Invited'.");
        } else {
          // Direct Confirmation (Offline tenant)
          if (leaseFileBase64) {
            // Send Welcome Email with Attachment
            await supabase.functions.invoke('send-email', {
              body: {
                to: inviteForm.email,
                subject: `Welcome to Property Ledge - Your Lease for ${property.address}`,
                templateType: 'tenant-welcome',
                attachmentBase64: leaseFileBase64,
                attachmentFilename: leaseFile?.name || "Lease_Agreement.pdf",
                variables: {
                  tenantFirstName: inviteForm.firstName,
                  propertyAddress: `${property.address}, ${property.suburb}`,
                  startDate: inviteForm.leaseStart,
                  endDate: null,
                  rentAmount: inviteForm.rentAmount || '0',
                  bondAmount: (parseFloat(inviteForm.rentAmount) * 4) || 0,
                  paymentFrequency: property.paymentFrequency || 'Weekly',
                  specialTerms: "Please find your attached lease agreement. Please review and contact us if you have any questions.",
                  senderName: landlordEmail,
                  senderEmail: landlordEmail
                }
              }
            });
          } else {
            // Send Confirmation/Welcome Email (without attachment)
            await supabase.functions.invoke('send-email', {
              body: {
                to: inviteForm.email,
                subject: `Confirmation: You have been added as a Tenant at ${property.address}`,
                templateType: 'tenant-welcome',
                variables: {
                  tenantFirstName: inviteForm.firstName,
                  propertyAddress: `${property.address}, ${property.suburb}`,
                  startDate: inviteForm.leaseStart,
                  endDate: null,
                  rentAmount: inviteForm.rentAmount || '0',
                  bondAmount: (parseFloat(inviteForm.rentAmount) * 4) || 0,
                  paymentFrequency: property.paymentFrequency || 'Weekly',
                  specialTerms: "You have been registered for this property. We will send you any further updates regarding your lease or invoices via email.",
                  senderName: landlordEmail,
                  senderEmail: landlordEmail
                }
              }
            });
          }
          setInviteSuccess('Tenant confirmed successfully and welcome email sent.');
        }
        
        setShowInviteSuccessModal(true);} catch (emailErr: any) {
        console.error("Mailtrap Edge Function call failed:", emailErr);
      }

      // Close the invite form modal and show the beautiful success modal
      setIsInviteModalOpen(false);
      setShowInviteSuccessModal(true);
      
      // Instead of setting a single tenant, we just reload the property to get fresh lease_tenants
      const { data: newTenants } = await supabase.from('tenants').select('*').eq('property_id', id);
      if (newTenants) setTenants(newTenants);
      setProperty(prev => ({
        ...prev,
        tenantName: `${inviteForm.firstName} ${inviteForm.lastName}`,
        tenantEmail: inviteForm.email,
        rentAmount: parseFloat(inviteForm.rentAmount) || prev.rentAmount,
        leaseStart: inviteForm.leaseStart
      }));

      // Reset form
      setInviteForm({ firstName: '', lastName: '', email: '', rentAmount: '', leaseStart: '' });
      setLeaseFile(null);
      setLeaseFileBase64(null);
      
      // Auto close success modal after 4 seconds
      setTimeout(() => {
        setShowInviteSuccessModal(false);
      }, 4000);

    } catch (err: any) {
      console.error("Failed to invite tenant:", err);
      setInviteError(err.message || "Failed to create invitation. Please try again.");
    } finally {
      setInvitingType(null);
    }
  };

  const handleResendInvite = async (tenant: any) => {
    if (tenants.length === 0) return;
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

  const handleCancelInvite = async (tenantId: string) => {
    if (!window.confirm("Are you sure you want to cancel this pending tenant invitation?")) return;
    try {
      await supabase.from('tenants').delete().eq('id', tenantId);

      const newTenants = tenants.filter((t: any) => t.id !== tenantId);
      
      if (newTenants.length === 0) {
        await supabase.from('leases').delete().eq('property_id', id).in('status', ['Pending', 'Invited']);
        await supabase.from('properties').update({
          tenant_name: null,
          tenant_email: null,
          lease_start: null
        }).eq('id', id);
        setProperty(prev => ({
          ...prev,
          tenantName: null,
          tenantEmail: null,
          leaseStart: null
        }));
      }
      
      setTenants(newTenants);
      alert("Tenant invitation canceled.");
    } catch (err) {
      console.error("Error canceling invite:", err);
      alert("Failed to cancel invitation.");
    }
  };

  const handleRemoveTenant = async (tenantId: string) => {
    if (!permissions?.can_manage_tenants && !permissions?.is_owner) return;
    if (window.confirm("Are you sure you want to remove this tenant?")) {
      await supabase.from('tenants').delete().eq('id', tenantId);
      
      const newTenants = tenants.filter((t: any) => t.id !== tenantId);

      if (newTenants.length === 0) {
        await supabase.from('properties').update({
          tenant_name: null,
          tenant_email: null,
          lease_start: null
        }).eq('id', id);
        setProperty(prev => ({ ...prev, tenantName: null, tenantEmail: null, leaseStart: null }));

        await supabase.from('leases').update({
          status: 'Terminated',
          end_date: new Date().toISOString().split('T')[0]
        }).eq('property_id', id).eq('status', 'Active');
      }

      setTenants(newTenants);
      alert("Tenant removed.");
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
      const { error } = await supabase
        .from('properties')
        .update({
          address: editingProperty.address,
          suburb: editingProperty.suburb,
          postcode: editingProperty.postcode,
          state: editingProperty.state,
          category: editingProperty.category || 'Residential',
          property_type: editingProperty.propertyType,
          property_size: parseInt(editingProperty.property_size) || null,
          bedrooms: parseInt(editingProperty.bedrooms) || 0,
          bathrooms: parseInt(editingProperty.bathrooms) || 0,
          car_spaces: parseInt(editingProperty.car_spaces) || 0,
          rent_amount: parseFloat(editingProperty.rentAmount) || 0,
          payment_frequency: editingProperty.paymentFrequency,
          lease_duration: parseInt(editingProperty.leaseDuration) || 12,
        })
        .eq('id', id);

      if (error) throw error;
      
      setProperty({
        ...property,
        ...editingProperty,
        rentAmount: editingProperty.rentAmount,
        propertyType: editingProperty.propertyType,
        paymentFrequency: editingProperty.paymentFrequency,
      });
      setShowEditPropertyModal(false);
    } catch (err: any) {
      console.error('Error updating property:', err);
      setEditError(err.message || 'Failed to update property details.');
    } finally {
      setEditing(false);
    }
  };

  const handleEditTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setTenantEditError('');
    setEditingTenantLoading(true);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          first_name: editingTenant.first_name,
          last_name: editingTenant.last_name,
          email: editingTenant.email,
          phone: editingTenant.phone,
        })
        .eq('id', editingTenant.id);

      if (error) throw error;
      
      setShowEditTenantModal(false);
      const { data: newTenants } = await supabase.from('tenants').select('*').eq('property_id', id);
      if (newTenants) setTenants(newTenants); // Refresh to show new tenant details
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      setTenantEditError(err.message || 'Failed to update tenant details.');
    } finally {
      setEditingTenantLoading(false);
    }
  };

  const bentoTenantItems = tenants.length > 0 ? [
    { title: 'Tenant Profile', desc: `Current tenants: ${tenants.map(t => t.first_name).join(', ')}. Contact: ${tenants[0]?.email || 'N/A'}.`, icon: Users, action: 'View Profile', colSpan: 'md:col-span-2 lg:col-span-2', bg: 'bg-primary/90 backdrop-blur-xl border border-primary/20 shadow-lg text-on-primary', accent: 'text-on-primary', iconBg: 'bg-white/20' },
    { title: 'Lease Agreement', desc: `Started: ${property.leaseStart ? new Date(property.leaseStart).toLocaleDateString() : 'N/A'}. Duration: ${property.leaseDuration || '12'} months.`, icon: FileText, action: 'View Lease', colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Rent Status', desc: 'Rent is currently paid up to date. Next payment due in 4 days.', icon: Wallet, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Communication', desc: 'Message tenant, log calls, and view email history.', icon: Home, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Upcoming Inspections', desc: 'Routine inspection scheduled for next month.', icon: Clock, action: 'Manage', colSpan: 'md:col-span-2 lg:col-span-1', bg: 'bg-secondary/10 backdrop-blur-xl border border-secondary/20 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-secondary', iconBg: 'bg-white/50' },
  ] : [
    { title: 'Create Ad', desc: 'Craft your property listing and broadcast it to major real estate portals.', icon: FileText, action: 'Get Started', colSpan: 'md:col-span-2 lg:col-span-2', bg: 'bg-primary/90 backdrop-blur-xl border border-primary/20 shadow-lg text-on-primary', accent: 'text-on-primary', iconBg: 'bg-white/20' },
    { title: 'Applications', desc: 'Review background checks, rental history, and affordability scores.', icon: ClipboardList, action: 'Review', colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Enquiries', desc: 'Manage prospect messages, emails, and direct phone calls instantly.', icon: Home, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Tenant Checks', desc: 'Identity verification and National Tenancy Database (NTD) screening.', icon: Users, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Tenancy Setup', desc: 'Finalize the digital lease agreement and collect the initial bond payment.', icon: Clock, action: 'Continue', colSpan: 'md:col-span-2 lg:col-span-1', bg: 'bg-secondary/10 backdrop-blur-xl border border-secondary/20 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-secondary', iconBg: 'bg-white/50' },
  ];

  const bentoManageItems = [
    { title: 'Tenancy Setup', desc: 'Onboard a new tenant, finalize the digital lease agreement, and collect the initial bond payment.', icon: Users, action: 'Start Setup', colSpan: 'md:col-span-2 lg:col-span-3', bg: 'bg-slate-900 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] text-white', accent: 'text-white', iconBg: 'bg-white/10' },
    { title: 'Finance Report', desc: 'Generate EOFY tax-ready reports tracking all income and depreciable assets.', icon: BarChart3, action: 'View Report', colSpan: 'md:col-span-2 lg:col-span-2', bg: 'bg-primary/90 backdrop-blur-xl border border-primary/20 shadow-lg text-on-primary', accent: 'text-on-primary', iconBg: 'bg-white/20' },
    { title: 'Maintenance', desc: 'Track repair requests, approve quotes, and schedule tradies.', icon: Wrench, action: 'Manage', colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Condition Report', desc: 'Digital entry, routine, and exit inspection photos and logs.', icon: Clock, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Tenant Bills', desc: 'Forward water usage and utility invoices directly to your tenant.', icon: FileText, chevron: true, colSpan: 'md:col-span-1 lg:col-span-1', bg: 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-primary', iconBg: 'bg-primary/10' },
    { title: 'Bond & Rent', desc: 'Monitor active ledger, upcoming due dates, and lodged bond receipts.', icon: Wallet, chevron: true, colSpan: 'md:col-span-2 lg:col-span-1', bg: 'bg-secondary/10 backdrop-blur-xl border border-secondary/20 shadow-[0_8px_32px_rgba(0,0,0,0.04)] text-slate-800', accent: 'text-secondary', iconBg: 'bg-white/50' },
  ];

  const renderTenantTab = () => {
    if (tenants.length === 0) {
      return (
        <>
          {bentoTenantItems.map((item: any, index: number) => (
            <motion.div
              key={item.title}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => item.title === 'Tenancy Setup' ? setIsTenancySetupOpen(true) : undefined}
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
    }

    return (
      <>
        <div className="col-span-full bg-white/20 backdrop-blur-3xl border border-white/60 rounded-[32px] p-8 md:p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden">
          {/* Intense Liquid Glass Background Blobs */}
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-300/30 blur-[80px] pointer-events-none z-0" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-teal-300/20 blur-[80px] pointer-events-none z-0" />
          <div className="relative z-10 space-y-6">


            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest mb-2">
                Active Tenants
              </div>
              <h3 className="text-2xl font-black text-on-surface tracking-tight">
                Lease Confirmed & Active
              </h3>
              <p className="text-on-surface-variant/80 max-w-md mx-auto font-medium text-sm md:text-base">
                There are <span className="text-on-surface font-semibold">{tenants.length}</span> active tenant(s) registered for this lease.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto mt-8 text-left">
              {tenants.map((t: any) => {
                const isInvited = t.status === 'Invited';
                
                return (
                <div key={t.id} className={`bg-white/30 backdrop-blur-2xl border ${isInvited ? 'border-amber-300/60 shadow-[0_12px_40px_rgba(245,158,11,0.08),inset_0_1px_1px_rgba(255,255,255,1)] hover:shadow-[0_24px_56px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,1)]' : 'border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,1)] hover:shadow-[0_24px_56px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,1)]'} rounded-[32px] p-6 md:p-8 flex flex-col min-h-[220px] relative overflow-hidden group cursor-pointer hover:-translate-y-2 transition-all duration-500`}>
                  {/* Internal Glare Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${isInvited ? 'from-amber-100/40' : 'from-white/50'} via-transparent to-white/10 opacity-70 pointer-events-none`} />
                  
                  <div className="relative z-10 flex-1 flex flex-col">
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-sm bg-white/80 border border-white text-slate-800 font-black text-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                        {t.first_name?.[0]}{t.last_name?.[0]}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 text-[10px] font-black ${isInvited ? 'text-amber-800 bg-amber-400/20 border-amber-400/30' : 'text-emerald-800 bg-emerald-400/20 border-emerald-400/30'} backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-sm uppercase tracking-widest`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isInvited ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'} animate-pulse shrink-0`} />
                          {isInvited ? 'Invited' : 'Confirmed'}
                        </div>
                        {(permissions?.can_manage_tenants || permissions?.is_owner) && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTenant(t);
                                setShowEditTenantModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 transition-colors cursor-pointer"
                              title="Edit Tenant"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                isInvited ? handleCancelInvite(t.id) : handleRemoveTenant(t.id);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title={isInvited ? "Cancel Invitation" : "Remove Tenant"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2 font-display text-slate-900">
                        {t.first_name} {t.last_name}
                      </h3>
                      <p className="text-sm font-medium leading-relaxed max-w-[90%] mb-6 text-slate-600 opacity-90 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 shrink-0" /> {t.email || 'No email provided'}
                      </p>
                    </div>

                    <div className="mt-auto pt-2">
                      <div className={`bg-white/40 backdrop-blur-xl border ${isInvited ? 'border-amber-200/60' : 'border-white/80'} px-5 py-3 rounded-full flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,1)] group-hover:bg-white/60 transition-colors duration-300`}>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-600">Rent Share</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{isInvited ? 'Pending' : `${t.rent_share_percentage}%`}</span>
                      </div>
                    </div>

                  </div>
                </div>
                );
              })}
            </div>

          </div>
        </div>

        {bentoManageItems.map((item, index) => (
          <motion.div
            key={item.title}
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => item.title === 'Tenancy Setup' ? setIsTenancySetupOpen(true) : undefined}
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

  const hasManagerActions = permissions?.can_manage_tenants || permissions?.can_edit_lease;

  return (
    <DashboardLayout>
      <div className="min-h-screen relative overflow-hidden">
        
        {/* iOS 26 Ambient Background Blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none z-0"></div>

        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto relative z-10 space-y-8">
          
          {/* Back Button Removed as requested */}

          {/* Hero Cover Image */}
          <div 
            className="w-full h-64 md:h-80 lg:h-96 rounded-[32px] overflow-hidden relative mb-[-40px] group cursor-pointer bg-white/40 backdrop-blur-xl border border-white/60"
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
                  className="bg-white/80 backdrop-blur-xl px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50 text-slate-800 hover:bg-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 transform md:-translate-y-2 md:group-hover:translate-y-0 duration-200"
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
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              {permissions?.can_edit_lease || permissions?.can_manage_tenants || permissions?.is_owner ? (
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setEditingProperty(property);
                    setShowEditPropertyModal(true);
                  }}
                  className="w-full md:w-auto px-5 py-3.5 bg-surface-container-high text-on-surface hover:bg-surface-container-highest rounded-full font-black text-xs uppercase tracking-widest shadow-sm border border-outline-variant/30 flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" /> Edit
                </motion.button>
              ) : null}
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full md:w-auto px-6 py-3.5 bg-on-surface text-surface rounded-full font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
              >
                Activate Plan <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

          {/* iOS Segmented Control */}
          <div className="flex justify-center my-10">
            <div className="bg-white/30 backdrop-blur-xl p-1.5 rounded-full flex shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/60 w-full max-w-[500px] relative">
              {['tenant', 'manage'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex-1 py-3 px-2 text-center font-black text-[10px] md:text-xs uppercase tracking-widest z-10 transition-colors cursor-pointer ${activeTab === tab ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="relative z-20">
                    {tab === 'tenant' ? (property.tenantName ? 'Current Tenant' : 'Tenant') : 'Manage Prop'}
                  </span>
                  {activeTab === tab && (
                    <motion.div
                      layoutId="iosSegment"
                      className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-full shadow-md border border-white/80"
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
                      onClick={() => item.title === 'Tenancy Setup' ? setIsTenancySetupOpen(true) : undefined}
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

          {/* Management Actions Section Removed as requested */}

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

      <TenancySetupWizard 
        isOpen={isTenancySetupOpen} 
        onClose={() => setIsTenancySetupOpen(false)} 
        propertyId={id || ''} 
        propertyAddress={`${property?.address || ''}, ${property?.suburb || ''} ${property?.postcode || ''}`}
      />

      {/* Edit Property Modal */}
      {createPortal(
        <AnimatePresence>
          {showEditPropertyModal && editingProperty && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer" onClick={() => setShowEditPropertyModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.5 }} className="relative w-full max-w-2xl bg-[#f2f4f3] border border-outline-variant/40 rounded-[28px] shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-10 md:p-12">
                
                <button
                  onClick={() => setShowEditPropertyModal(false)}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="w-full mb-6 text-center">
                  <h3 className="text-[1.5rem] sm:text-[1.75rem] font-[900] tracking-[-0.5px] font-['Space_Grotesk'] mb-2">Edit Property</h3>
                  <p className="text-sm text-on-surface-variant">Update address, details, and advertised rent.</p>
                </div>
                
                <div className="w-full">
                  {editError && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-[16px] text-sm font-bold flex gap-3 items-center shadow-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>{editError}</p>
                    </div>
                  )}

                  <form onSubmit={handleEditProperty}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                      <TextField 
                        label="Street Address" 
                        name="address" 
                        required
                        fullWidth
                        value={editingProperty.address}
                        onChange={(e) => setEditingProperty({...editingProperty, address: e.target.value})}
                      />
                      
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap'} }}>
                        <TextField 
                          label="Suburb" 
                          name="suburb" 
                          required
                          value={editingProperty.suburb}
                          onChange={(e) => setEditingProperty({...editingProperty, suburb: e.target.value})}
                          sx={{ flex: 2 }}
                        />
                        <TextField 
                          label="Postcode" 
                          name="postcode" 
                          required
                          value={editingProperty.postcode}
                          onChange={(e) => setEditingProperty({...editingProperty, postcode: e.target.value})}
                          sx={{ flex: 1 }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap'} }}>
                        <FormControl fullWidth>
                          <InputLabel>State</InputLabel>
                          <Select
                            value={editingProperty.state}
                            label="State"
                            onChange={(e) => setEditingProperty({...editingProperty, state: e.target.value})}
                          >
                            <MenuItem value="NSW">New South Wales</MenuItem>
                            <MenuItem value="VIC">Victoria</MenuItem>
                            <MenuItem value="QLD">Queensland</MenuItem>
                            <MenuItem value="WA">Western Australia</MenuItem>
                            <MenuItem value="SA">South Australia</MenuItem>
                            <MenuItem value="TAS">Tasmania</MenuItem>
                            <MenuItem value="ACT">Australian Capital Territory</MenuItem>
                            <MenuItem value="NT">Northern Territory</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Button
                          variant={(!editingProperty.category || editingProperty.category === 'Residential') ? 'contained' : 'outlined'}
                          onClick={() => setEditingProperty({...editingProperty, category: 'Residential', propertyType: 'House'})}
                          fullWidth
                          sx={{ 
                            borderRadius: '12px', 
                            textTransform: 'none', 
                            fontWeight: 'bold',
                            ...( (!editingProperty.category || editingProperty.category === 'Residential') && { bgcolor: '#1f2937', color: 'white', '&:hover': { bgcolor: '#111827' } } )
                          }}
                        >
                          Residential
                        </Button>
                        <Button
                          variant={editingProperty.category === 'Commercial' ? 'contained' : 'outlined'}
                          onClick={() => setEditingProperty({...editingProperty, category: 'Commercial', propertyType: 'Office', bedrooms: 0, bathrooms: 0})}
                          fullWidth
                          sx={{ 
                            borderRadius: '12px', 
                            textTransform: 'none', 
                            fontWeight: 'bold',
                            ...( editingProperty.category === 'Commercial' && { bgcolor: '#1f2937', color: 'white', '&:hover': { bgcolor: '#111827' } } )
                          }}
                        >
                          Commercial
                        </Button>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                        <FormControl fullWidth>
                          <InputLabel>Property Type</InputLabel>
                          <Select
                            value={editingProperty.propertyType || editingProperty.property_type || ''}
                            label="Property Type"
                            onChange={(e) => setEditingProperty({...editingProperty, propertyType: e.target.value})}
                          >
                            {editingProperty.category === 'Commercial' ? (
                              [
                                <MenuItem key="Office" value="Office">Office</MenuItem>,
                                <MenuItem key="Retail" value="Retail">Retail</MenuItem>,
                                <MenuItem key="Warehouse" value="Warehouse">Warehouse</MenuItem>,
                                <MenuItem key="Industrial" value="Industrial">Industrial</MenuItem>,
                                <MenuItem key="Medical" value="Medical">Medical</MenuItem>,
                                <MenuItem key="Showroom" value="Showroom">Showroom</MenuItem>,
                                <MenuItem key="Other" value="Other">Other</MenuItem>
                              ]
                            ) : (
                              [
                                <MenuItem key="House" value="House">House</MenuItem>,
                                <MenuItem key="Apartment" value="Apartment">Apartment</MenuItem>,
                                <MenuItem key="Townhouse" value="Townhouse">Townhouse</MenuItem>,
                                <MenuItem key="Villa" value="Villa">Villa</MenuItem>,
                                <MenuItem key="Duplex" value="Duplex">Duplex</MenuItem>
                              ]
                            )}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={editingProperty.status || 'Active'}
                            label="Status"
                            onChange={(e) => setEditingProperty({...editingProperty, status: e.target.value})}
                          >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                            <MenuItem value="Maintenance">Maintenance</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      {editingProperty.category === 'Commercial' ? (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField 
                            label="Property Size (sqm)" 
                            type="number"
                            value={editingProperty.property_size || ''}
                            onChange={(e) => setEditingProperty({...editingProperty, property_size: e.target.value})}
                            fullWidth
                            slotProps={{ htmlInput: { min: 0 } }}
                          />
                          <TextField 
                            label="Car Spaces" 
                            type="number"
                            value={editingProperty.car_spaces || 0}
                            onChange={(e) => setEditingProperty({...editingProperty, car_spaces: e.target.value})}
                            fullWidth
                            slotProps={{ htmlInput: { min: 0 } }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField 
                            label="Beds" 
                            type="number"
                            value={editingProperty.bedrooms || 0}
                            onChange={(e) => setEditingProperty({...editingProperty, bedrooms: e.target.value})}
                            fullWidth
                            slotProps={{ htmlInput: { min: 0 } }}
                          />
                          <TextField 
                            label="Baths" 
                            type="number"
                            value={editingProperty.bathrooms || 0}
                            onChange={(e) => setEditingProperty({...editingProperty, bathrooms: e.target.value})}
                            fullWidth
                            slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                          />
                          <TextField 
                            label="Cars" 
                            type="number"
                            value={editingProperty.car_spaces || 0}
                            onChange={(e) => setEditingProperty({...editingProperty, car_spaces: e.target.value})}
                            fullWidth
                            slotProps={{ htmlInput: { min: 0 } }}
                          />
                        </Box>
                      )}

                      <TextField 
                        label="Advertised Rent ($)" 
                        type="number"
                        value={editingProperty.rentAmount || editingProperty.rent_amount || ''}
                        onChange={(e) => setEditingProperty({...editingProperty, rentAmount: e.target.value, rent_amount: e.target.value})}
                        fullWidth
                      />

                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button 
                          variant="outlined" 
                          fullWidth 
                          size="large"
                          onClick={() => setShowEditPropertyModal(false)}
                          sx={{ 
                            borderRadius: '12px',
                            color: 'text.primary',
                            borderColor: 'divider',
                            textTransform: 'none',
                            fontWeight: 'bold'
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          fullWidth 
                          size="large"
                          disabled={editing}
                          sx={{ 
                            borderRadius: '12px',
                            bgcolor: '#1f2937', // matching standard dark button
                            '&:hover': { bgcolor: '#111827' },
                            textTransform: 'none',
                            fontWeight: 'bold'
                          }}
                        >
                          {editing ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Box>
                    </Box>
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
                  Tenant Confirmed!
                </motion.h3>

                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-slate-400 text-sm font-semibold mb-8 leading-relaxed"
                >
                  The tenant has been securely linked to this lease. A confirmation email has been dispatched to their email address.
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
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-3">Tenants</span>
                        {tenants.length > 0 ? (
                          <div className="space-y-4">
                            {tenants.map((t, idx) => (
                              <div key={t.id || idx} className="flex flex-col">
                                <span className="text-sm font-bold text-on-surface">
                                  {t.first_name} {t.last_name} {t.status === 'Invited' ? '(Invited)' : ''}
                                </span>
                                <span className="text-xs text-on-surface-variant mt-0.5">{t.email}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-on-surface">{property.tenantName || 'N/A'}</span>
                            <span className="text-xs text-on-surface-variant mt-1">{property.tenantEmail || 'N/A'}</span>
                          </>
                        )}
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
                className="relative w-full max-w-lg bg-transparent shadow-[0_24px_48px_-12px_rgba(34,51,59,0.2)] flex flex-col z-10 rounded-[28px]"
              >
                <div className="bg-primary px-6 sm:px-8 py-6 rounded-t-[28px] flex items-center justify-between shrink-0 border-b border-primary-fixed-dim/20">
                  <div className="text-on-primary">
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1">Confirm Tenant</h3>
                    <p className="text-on-primary/80 text-xs sm:text-sm font-medium">Confirm tenant details and attach their signed lease.</p>
                  </div>
                  <button 
                    onClick={() => setIsInviteModalOpen(false)} 
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form className="p-6 sm:p-8 space-y-6 bg-white rounded-b-[28px] overflow-y-auto custom-scrollbar">
                  {inviteError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-[16px] text-xs font-bold flex items-center gap-2 shadow-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {inviteError}
                    </div>
                  )}

                  {inviteSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-[16px] text-xs font-bold flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {inviteSuccess}
                    </div>
                  )}

                  <div className="p-4 sm:p-5 bg-surface-container-lowest border border-outline-variant/40 rounded-[20px] flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-[14px] bg-primary/5 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-0.5">Target Property</span>
                      <span className="text-sm sm:text-base font-black text-on-surface">{property.address}, {property.suburb}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:gap-5 mt-2">
                    <div className="relative">
                      <input
                        required
                        type="text"
                        id="firstName"
                        value={inviteForm.firstName}
                        onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                        className="peer w-full bg-transparent border-2 border-outline-variant/40 rounded-[16px] px-4 py-3.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                        placeholder=" "
                      />
                      <label htmlFor="firstName" className="absolute left-3 -top-2.5 bg-white px-1.5 text-[11px] font-bold text-on-surface-variant transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:text-primary pointer-events-none">First Name</label>
                    </div>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        id="lastName"
                        value={inviteForm.lastName}
                        onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                        className="peer w-full bg-transparent border-2 border-outline-variant/40 rounded-[16px] px-4 py-3.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                        placeholder=" "
                      />
                      <label htmlFor="lastName" className="absolute left-3 -top-2.5 bg-white px-1.5 text-[11px] font-bold text-on-surface-variant transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:text-primary pointer-events-none">Last Name</label>
                    </div>
                  </div>

                  <div className="relative mt-2">
                    <input
                      required
                      type="email"
                      id="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="peer w-full bg-transparent border-2 border-outline-variant/40 rounded-[16px] px-4 py-3.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                      placeholder=" "
                    />
                    <label htmlFor="email" className="absolute left-3 -top-2.5 bg-white px-1.5 text-[11px] font-bold text-on-surface-variant transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:text-primary pointer-events-none">Tenant Email</label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:gap-5 mt-2">
                    <div className="relative">
                      <input
                        required
                        type="number"
                        id="rentAmount"
                        value={inviteForm.rentAmount}
                        onChange={e => setInviteForm({ ...inviteForm, rentAmount: e.target.value })}
                        className="peer w-full bg-transparent border-2 border-outline-variant/40 rounded-[16px] px-4 py-3.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold"
                        placeholder=" "
                      />
                      <label htmlFor="rentAmount" className="absolute left-3 -top-2.5 bg-white px-1.5 text-[11px] font-bold text-on-surface-variant transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:text-primary pointer-events-none">Weekly Rent ($)</label>
                    </div>
                    <div className="relative">
                      <input
                        required
                        type="date"
                        id="leaseStart"
                        value={inviteForm.leaseStart}
                        onChange={e => setInviteForm({ ...inviteForm, leaseStart: e.target.value })}
                        className="peer w-full bg-transparent border-2 border-outline-variant/40 rounded-[16px] px-4 py-3.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-all font-semibold [color-scheme:light]"
                        placeholder=" "
                      />
                      <label htmlFor="leaseStart" className="absolute left-3 -top-2.5 bg-white px-1.5 text-[11px] font-bold text-primary transition-all pointer-events-none">Lease Start</label>
                    </div>
                  </div>

                  <div className="relative overflow-hidden group mt-4">
                    <div className="relative p-6 border-2 border-dashed border-primary/30 rounded-[20px] flex flex-col items-center justify-center text-center hover:border-primary/60 transition-colors bg-surface-container-lowest/50 hover:bg-primary/5 cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLeaseFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLeaseFileBase64(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setLeaseFile(null);
                            setLeaseFileBase64(null);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        title="Click to upload lease PDF"
                      />
                      
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform pointer-events-none relative z-10">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className="text-[13px] font-black text-on-surface mb-1 pointer-events-none relative z-10">Upload Signed Lease (Optional)</h4>
                      <p className="text-[11px] font-medium text-on-surface-variant mb-4 px-2 max-w-[90%] truncate pointer-events-none relative z-10">
                        {leaseFile ? leaseFile.name : "Select a PDF file. If provided, the tenant will receive it in their Welcome Email."}
                      </p>
                      
                      <div className="bg-primary text-white font-bold text-[11px] sm:text-xs uppercase tracking-widest px-6 py-2.5 rounded-full shadow-md group-hover:shadow-lg group-hover:bg-primary-fixed-dim transition-all flex items-center gap-2 pointer-events-none relative z-10">
                        {leaseFile ? <><CheckCircle2 className="w-4 h-4"/> Change PDF</> : "Choose PDF File"}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="w-full sm:w-auto px-6 py-3.5 bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full font-bold text-sm transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleInviteSubmit(e, 'direct')}
                        disabled={invitingType !== null}
                        className="flex-1 px-6 py-3.5 bg-surface border border-outline-variant/50 hover:bg-surface-container text-on-surface rounded-full font-bold text-sm transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {invitingType === 'direct' ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div> : <>Add Directly</>}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleInviteSubmit(e, 'invite')}
                        disabled={invitingType !== null}
                        className="flex-1 px-6 py-3.5 bg-primary text-on-primary hover:bg-primary/95 rounded-full font-bold text-sm transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {invitingType === 'invite' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Invite to Portal</>}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Tenant Modal */}
      {createPortal(
        <AnimatePresence>
          {showEditTenantModal && editingTenant && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer" onClick={() => setShowEditTenantModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.5 }} className="relative w-full max-w-lg bg-[#f2f4f3] border border-outline-variant/40 rounded-[28px] shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-10">
                
                <button
                  onClick={() => setShowEditTenantModal(false)}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="w-full mb-6 text-center">
                  <h3 className="text-[1.5rem] sm:text-[1.75rem] font-[900] tracking-[-0.5px] font-['Space_Grotesk'] mb-2">Edit Tenant</h3>
                  <p className="text-sm text-on-surface-variant">Update tenant contact details.</p>
                </div>
                
                <div className="w-full">
                  {tenantEditError && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-[16px] text-sm font-bold flex gap-3 items-center shadow-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>{tenantEditError}</p>
                    </div>
                  )}

                  <form onSubmit={handleEditTenantSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap'} }}>
                        <TextField 
                          label="First Name" 
                          name="firstName" 
                          required
                          fullWidth
                          value={editingTenant.first_name || ''}
                          onChange={(e) => setEditingTenant({...editingTenant, first_name: e.target.value})}
                        />
                        <TextField 
                          label="Last Name" 
                          name="lastName" 
                          required
                          fullWidth
                          value={editingTenant.last_name || ''}
                          onChange={(e) => setEditingTenant({...editingTenant, last_name: e.target.value})}
                        />
                      </Box>
                      
                      <TextField 
                        label="Email Address" 
                        name="email" 
                        type="email"
                        required
                        fullWidth
                        value={editingTenant.email || ''}
                        onChange={(e) => setEditingTenant({...editingTenant, email: e.target.value})}
                      />
                      
                      <TextField 
                        label="Phone Number" 
                        name="phone"
                        fullWidth
                        value={editingTenant.phone || ''}
                        onChange={(e) => setEditingTenant({...editingTenant, phone: e.target.value})}
                      />
                      
                      <div className="mt-4 pt-6 border-t border-outline-variant/30 flex gap-3 justify-end">
                        <Button 
                          variant="outlined" 
                          color="inherit" 
                          onClick={() => setShowEditTenantModal(false)}
                          disabled={editingTenantLoading}
                          sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 800, px: 4 }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          variant="contained"
                          disabled={editingTenantLoading}
                          sx={{ 
                            borderRadius: '999px', 
                            textTransform: 'none', 
                            fontWeight: 800, 
                            px: 4,
                            bgcolor: 'var(--color-primary)',
                            '&:hover': { bgcolor: 'var(--color-primary)' },
                            boxShadow: 'none'
                          }}
                        >
                          {editingTenantLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </Box>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </DashboardLayout>
  );
}
