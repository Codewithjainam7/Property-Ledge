import React, { useState, useEffect } from 'react';
import { Search, Building, Users, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, ShieldCheck, Mail, Phone, X, Send, XCircle, FileUp, Download, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

type Property = {
  id: string;
  address: string;
  suburb: string;
  rent_amount?: number;
  payment_frequency?: string;
  lease_start?: string;
};

type Tenant = {
  id: string;
  property_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  lease_tenants?: {
    is_primary: boolean;
    leases: {
      id: string;
      property_id: string;
      status: string;
    };
  }[];
};

type Invoice = {
  property_id: string;
  status: string;
  due_date: string;
};

export function Tenants() {
  const { session, userContext } = useAuth();
  const navigate = useNavigate();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add Tenant State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [invitingType, setInvitingType] = useState<'direct' | 'invite' | null>(null);
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [leaseFileBase64, setLeaseFileBase64] = useState<string | null>(null);
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);
  
  const [inviteForm, setInviteForm] = useState({
    propertyId: '',
    firstName: '',
    lastName: '',
    email: '',
    rentAmount: '',
    leaseStart: ''
  });

  useEffect(() => {
    if (session?.user.id && userContext) {
      loadData(session.user.id);
    }
  }, [session, userContext]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const managedPropertyIds = userContext?.teamPropertyIds || [];
      
      let propsQuery = supabase.from('properties').select('id, address, suburb');
      let tenantsQuery = supabase.from('tenants').select(`
        *,
        lease_tenants(
          is_primary,
          leases(id, property_id, status)
        )
      `);
      let invoicesQuery = supabase.from('invoices').select('property_id, status, due_date');

      if (managedPropertyIds.length > 0) {
        propsQuery = propsQuery.or(`owner_id.eq.${userId},id.in.(${managedPropertyIds.join(',')})`);
        tenantsQuery = tenantsQuery.or(`owner_id.eq.${userId},property_id.in.(${managedPropertyIds.join(',')})`);
        invoicesQuery = invoicesQuery.or(`user_id.eq.${userId},property_id.in.(${managedPropertyIds.join(',')})`);
      } else {
        propsQuery = propsQuery.eq('owner_id', userId);
        tenantsQuery = tenantsQuery.eq('owner_id', userId);
        invoicesQuery = invoicesQuery.eq('user_id', userId);
      }

      // Fetch landlord's properties
      const { data: propsData } = await propsQuery;

      const propsList = propsData || [];
      setProperties(propsList);

      // Fetch tenants and invoices
      const [tenantsResponse, invoicesResponse] = await Promise.all([
        tenantsQuery,
        invoicesQuery
      ]);

      if (tenantsResponse.data) {
        setTenants(tenantsResponse.data as Tenant[]);
      }
      if (invoicesResponse.data) {
        setInvoices(invoicesResponse.data as Invoice[]);
      }
    } catch (err) {
      console.error("Error loading CRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (propertyId: string) => {
    const propInvoices = invoices.filter(inv => inv.property_id === propertyId);
    if (propInvoices.length === 0) return { label: 'No Invoices', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasArrears = propInvoices.some(inv => 
      inv.status.toLowerCase() === 'unpaid' && 
      inv.due_date && 
      new Date(inv.due_date) < today
    );

    if (hasArrears) {
      return { label: 'Arrears', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    }
    return { label: 'Up to Date', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const getLeaseStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return { label: 'Active', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'Past':
        return { label: 'Past Tenant', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
      case 'Pending':
      case 'Invited':
        return { label: 'Pending Invite', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      default:
        return { label: status || 'Inactive', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent, method: 'direct' | 'invite' = 'direct') => {
    e.preventDefault();
    setInviteError('');
    setInvitingType(method);

    if (!inviteForm.propertyId) {
      setInviteError('Please select a property.');
      setInvitingType(null);
      return;
    }

    try {
      const userRes = await supabase.auth.getUser();
      const currentUserId = userRes.data.user?.id;
      if (!currentUserId) throw new Error("Not authenticated");

      const property = properties.find(p => p.id === inviteForm.propertyId);
      if (!property) throw new Error("Property not found");

      // Check if user with this email already exists
      const { data: existingUserId, error: rpcError } = await supabase.rpc('get_user_by_email', { p_email: inviteForm.email });

      // Check if an active lease already exists
      let targetLeaseId = null;
      const { data: existingLease } = await supabase
        .from('leases')
        .select('id')
        .eq('property_id', property.id)
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
            property_id: property.id,
            created_by: currentUserId,
            start_date: inviteForm.leaseStart,
            rent_amount: parseFloat(inviteForm.rentAmount) || 0,
            status: 'Active',
            payment_frequency: property.payment_frequency || 'Weekly'
          })
          .select()
          .single();

        if (leaseErr) throw leaseErr;
        targetLeaseId = newLease.id;
      }

      // Create tenant (Invited or Active)
      const inviteToken = method === 'invite' ? crypto.randomUUID() : null;
      const status = method === 'invite' ? 'Invited' : 'Active';

      const { data: newTenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          property_id: property.id,
          owner_id: currentUserId,
          first_name: inviteForm.firstName,
          last_name: inviteForm.lastName,
          email: inviteForm.email,
          user_id: !rpcError && existingUserId ? existingUserId : null,
          status: status,
          invite_token: inviteToken,
          access_level: { receives_emails: true, can_login: method === 'invite' }
        })
        .select()
        .single();

      if (tenantErr) throw tenantErr;

      // Calculate new rent share
      let newShare = 100;
      let remainderShare = 100;
      let shouldUpdateExisting = false;
      const currentTenantsCount = tenants.filter(t => t.property_id === property.id).length;

      if (existingLease) {
        // Recalculate for everyone regardless of invite or direct add
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
          rent_amount: parseFloat(inviteForm.rentAmount) || property.rent_amount || 0,
          lease_start: inviteForm.leaseStart
        })
        .eq('id', property.id);

      // Send email invite / welcome
      try {
        const landlordEmail = session?.user?.email;

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
                  paymentFrequency: property.payment_frequency || 'Weekly',
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
                  paymentFrequency: property.payment_frequency || 'Weekly',
                  specialTerms: "You have been registered for this property. We will send you any further updates regarding your lease or invoices via email.",
                  senderName: landlordEmail,
                  senderEmail: landlordEmail
                }
              }
            });
          }
          setInviteSuccess('Tenant confirmed successfully and welcome email sent.');
        }
        
        setShowInviteSuccessModal(true);
        loadData(currentUserId); // Reload data to show new tenant
        
        setTimeout(() => {
          setIsInviteModalOpen(false);
          setShowInviteSuccessModal(false);
          setInviteForm({ propertyId: '', firstName: '', lastName: '', email: '', rentAmount: '', leaseStart: '' });
          setLeaseFile(null);
          setLeaseFileBase64(null);
        }, 3000);
      } catch (emailErr: any) {
        console.error("Mailtrap Edge Function call failed:", emailErr);
      }

    } catch (err: any) {
      console.error("Invite error:", err);
      setInviteError(err.message || "An error occurred during tenant setup.");
    } finally {
      setInvitingType(null);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const fullName = `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase();
    const email = (t.email || '').toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    
    // Determine derived status
    const activeLease = t.lease_tenants?.find(lt => lt.leases?.status === 'Active');
    const derivedStatus = (t.status === 'Invited' || t.status === 'Pending') 
      ? t.status 
      : (activeLease ? 'Active' : (t.lease_tenants?.length ? 'Past' : t.status));

    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Active') return matchesSearch && derivedStatus === 'Active';
    if (statusFilter === 'Pending') return matchesSearch && (derivedStatus === 'Pending' || derivedStatus === 'Invited');
    if (statusFilter === 'Past') return matchesSearch && derivedStatus === 'Past';
    return matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen relative overflow-hidden bg-surface text-on-surface py-12 px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-7xl mx-auto relative z-10 space-y-8 mt-16 md:mt-0">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Tenant Directory CRM
              </div>
              <h1 className="text-4xl font-black tracking-tight text-on-surface font-display">
                Tenants
              </h1>
              <p className="text-on-surface-variant mt-2 font-medium">Read-only directory of current and pending residents linked to your properties.</p>
            </div>
            
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-primary text-on-primary hover:bg-primary/90 transition-all font-bold text-sm px-6 py-3.5 rounded-full shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Users className="w-4 h-4" /> Add Tenant
            </button>
          </div>

          {/* Action & Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Setup Tenancy Action Card */}
            <div 
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-primary hover:bg-primary/95 text-on-primary rounded-[24px] p-6 shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>
              <div>
                <h3 className="text-xl font-black mb-1">Setup Tenancy</h3>
                <p className="text-sm text-white/80 font-medium">Add a new tenant and configure their lease details.</p>
              </div>
            </div>

            {/* Total Active Tenants */}
            <div className="bg-surface-container-lowest backdrop-blur-xl border border-outline-variant/50 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Active Tenants</p>
                <h3 className="text-3xl font-black text-on-surface">
                  {tenants.filter(t => t.lease_tenants?.some(lt => lt.leases?.status === 'Active') || t.status === 'Active').length}
                </h3>
              </div>
            </div>

            {/* Pending Invitations */}
            <div className="bg-surface-container-lowest backdrop-blur-xl border border-outline-variant/50 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pending Invites</p>
                <h3 className="text-3xl font-black text-on-surface">
                  {tenants.filter(t => t.status === 'Invited' || t.status === 'Pending').length}
                </h3>
              </div>
            </div>

            {/* Arrears */}
            <div className="bg-surface-container-lowest backdrop-blur-xl border border-outline-variant/50 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-rose-500/10 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">In Arrears</p>
                <h3 className="text-3xl font-black text-rose-600">
                  {tenants.filter(t => {
                    const activeLease = t.lease_tenants?.find(lt => lt.leases?.status === 'Active')?.leases;
                    const resolvedPropertyId = activeLease?.property_id || t.property_id;
                    return getPaymentStatus(resolvedPropertyId).label === 'Arrears';
                  }).length}
                </h3>
              </div>
            </div>
          </div>

          {/* Search and Filters panel */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-surface-container-lowest backdrop-blur-xl rounded-[24px] border border-outline-variant/50 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tenants by name or email..."
                className="w-full bg-surface border border-outline-variant/50 rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold text-on-surface placeholder-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              {['All', 'Active', 'Pending', 'Past'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-primary text-on-primary border-primary font-extrabold' 
                      : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:bg-surface-container'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* CRM Glassmorphic Data Table */}
          {loading ? (
            <div className="flex items-center justify-center py-32 bg-surface-container-lowest backdrop-blur-md rounded-[32px] border border-outline-variant/50">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-[32px] border border-outline-variant/50 shadow-sm overflow-hidden">
              {filteredTenants.length === 0 ? (
                <div className="py-24 px-6 text-center">
                  <div className="w-16 h-16 bg-surface border border-outline-variant/50 text-on-surface-variant rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-on-surface mb-2 tracking-tight">No tenants found</h3>
                  <p className="text-on-surface-variant max-w-sm mx-auto font-medium">
                    No records match your filters. Navigate to a vacant property details view to invite a tenant.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/40 bg-surface-container/50">
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tenant Details</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Property Address</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Lease Status</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Payment Ledger</th>
                        <th className="py-5 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      <AnimatePresence mode="popLayout">
                        {filteredTenants.map((tenant) => {
                          const activeLease = tenant.lease_tenants?.find(lt => lt.leases?.status === 'Active')?.leases;
                          const anyLease = activeLease || tenant.lease_tenants?.[0]?.leases;
                          
                          const resolvedPropertyId = anyLease?.property_id || tenant.property_id;
                          const prop = properties.find(p => p.id === resolvedPropertyId);
                          const payStatus = getPaymentStatus(resolvedPropertyId);
                          
                          const derivedStatus = (tenant.status === 'Invited' || tenant.status === 'Pending') 
                            ? tenant.status 
                            : (activeLease ? 'Active' : (tenant.lease_tenants?.length ? 'Past' : tenant.status));
                          const leaseBadge = getLeaseStatusBadge(derivedStatus);

                          return (
                            <motion.tr 
                              key={tenant.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="hover:bg-surface-container transition-colors group"
                            >
                              {/* Tenant Details */}
                              <td className="py-5 px-6">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-11 h-11 rounded-2xl bg-surface border border-outline-variant/50 text-primary flex items-center justify-center font-bold font-display shadow-sm group-hover:scale-105 transition-transform">
                                    {(tenant.first_name || 'T').charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-on-surface text-base tracking-tight leading-none mb-1.5">
                                      {tenant.first_name ? `${tenant.first_name} ${tenant.last_name || ''}` : 'Pending Invitation'}
                                    </p>
                                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5 shrink-0" /> {tenant.email || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Property Address */}
                              <td className="py-5 px-6">
                                <div className="flex items-center gap-2">
                                  <Building className="w-4 h-4 text-on-surface-variant" />
                                  <span className="font-semibold text-on-surface">
                                    {prop ? `${prop.address}, ${prop.suburb}` : 'Not Assigned'}
                                  </span>
                                </div>
                              </td>

                              {/* Lease Status */}
                              <td className="py-5 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${leaseBadge.color}`}>
                                  <Clock className="w-3 h-3" /> {leaseBadge.label}
                                </span>
                              </td>

                              {/* Payment Status */}
                              <td className="py-5 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${payStatus.color}`}>
                                  {payStatus.label === 'Arrears' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                  {payStatus.label}
                                </span>
                              </td>

                              {/* View Property Link */}
                              <td className="py-5 px-6 text-right">
                                {resolvedPropertyId ? (
                                  <button
                                    onClick={() => navigate(`/dashboard/property/${resolvedPropertyId}`)}
                                    className="inline-flex items-center gap-1.5 bg-surface border border-outline-variant/50 hover:bg-primary hover:text-on-primary hover:border-primary px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                                  >
                                    View Property <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-xs text-on-surface-variant/50 font-bold uppercase tracking-widest">N/A</span>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1">Add Tenant</h3>
                    <p className="text-on-primary/80 text-xs sm:text-sm font-medium">Add a tenant and link them to a property.</p>
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

                  <div className="relative">
                    <div
                      onClick={() => setIsPropertyDropdownOpen(!isPropertyDropdownOpen)}
                      className={`peer w-full bg-transparent border-2 ${isPropertyDropdownOpen ? 'border-primary' : 'border-outline-variant/40 hover:border-outline-variant/80'} rounded-[16px] px-4 py-3.5 text-sm text-on-surface transition-all font-semibold cursor-pointer flex justify-between items-center`}
                    >
                      <span>
                        {inviteForm.propertyId 
                          ? (() => {
                              const p = properties.find(prop => prop.id === inviteForm.propertyId);
                              return p ? `${p.address}, ${p.suburb}` : 'Select a Property...';
                            })()
                          : <span className="text-on-surface-variant/70">Select a Property...</span>
                        }
                      </span>
                      <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${isPropertyDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <label className={`absolute left-3 -top-2.5 bg-white px-1.5 text-[11px] font-bold transition-all pointer-events-none ${isPropertyDropdownOpen ? 'text-primary' : 'text-on-surface-variant'}`}>Target Property</label>
                    
                    <AnimatePresence>
                      {isPropertyDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsPropertyDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 py-2 z-50 max-h-60 overflow-y-auto custom-scrollbar"
                          >
                            {properties.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setInviteForm({ ...inviteForm, propertyId: p.id, rentAmount: p.rent_amount ? p.rent_amount.toString() : '', leaseStart: p.lease_start || '' });
                                  setIsPropertyDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors hover:bg-primary/5 ${inviteForm.propertyId === p.id ? 'bg-primary/10 text-primary' : 'text-on-surface'}`}
                              >
                                {p.address}, <span className="opacity-70 font-medium">{p.suburb}</span>
                              </button>
                            ))}
                            {properties.length === 0 && (
                              <div className="px-4 py-3 text-sm text-on-surface-variant text-center font-medium">No properties available</div>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
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
                              const base64String = reader.result?.toString().split(',')[1];
                              if (base64String) setLeaseFileBase64(base64String);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        {leaseFile ? <FileUp className="w-6 h-6" /> : <Download className="w-6 h-6" />}
                      </div>
                      <p className="text-sm font-bold text-on-surface mb-1">
                        {leaseFile ? leaseFile.name : "Upload Signed Lease PDF (Optional)"}
                      </p>
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        {leaseFile ? "Click to change file" : "Drag and drop or click to browse"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <button 
                      type="button"
                      onClick={(e) => handleInviteSubmit(e, 'invite')}
                      disabled={invitingType !== null}
                      className="w-full py-4 rounded-[16px] bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 group cursor-pointer"
                    >
                      {invitingType === 'invite' ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Send Digital Invite <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleInviteSubmit(e, 'direct')}
                      disabled={invitingType !== null}
                      className="w-full py-4 rounded-[16px] bg-surface-container border border-outline-variant text-on-surface font-black text-xs uppercase tracking-widest hover:bg-surface-container-high transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
                    >
                      {invitingType === 'direct' ? (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        "Add Directly (No Login Required)"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Success Modal */}
      {createPortal(
        <AnimatePresence>
          {showInviteSuccessModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Tenant Added!</h3>
                <p className="text-slate-500 font-medium mb-8">The tenant has been successfully registered to the property.</p>
                <button onClick={() => setShowInviteSuccessModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-lg shadow-slate-900/20">
                  Done
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </DashboardLayout>
  );
}
