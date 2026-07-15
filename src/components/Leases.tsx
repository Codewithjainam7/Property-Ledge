import React, { useState, useEffect } from 'react';
import { FileText, Plus, Building, User, Calendar, DollarSign, X, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, Eye, Trash2, Clock, UserPlus, Mail, Send, LayoutGrid, List, Settings, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { LeaseManagerModal } from './LeaseManagerModal';
import { generateVictoriaLeasePdf } from '../utils/leasePdfGenerator';

type Lease = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  bond_amount: number;
  payment_frequency: string;
  status: string;
  properties?: {
    address: string;
    suburb: string;
    owner_id: string;
  };
  lease_tenants?: {
    tenants: {
      first_name: string;
      last_name: string;
      email: string;
    }
  }[];
};

export function Leases() {
  const { session, user } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [canEditPropertyIds, setCanEditPropertyIds] = useState<string[]>([]);
  const [initialLeaseData, setInitialLeaseData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Delete Lease State
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Always clear cache so edits are reflected immediately
    sessionStorage.removeItem('cached_leases');
    sessionStorage.removeItem('cached_properties');
    if (session?.user?.id) {
      loadData(session.user.id);
    }
  }, [session?.user?.id]);

  const loadData = async (userId: string) => {
    if (!sessionStorage.getItem('cached_leases')) {
      setLoading(true);
    }
    try {
      const uId = session?.user.id;
      if (!uId) return;

      const { data: teamMemberships } = await supabase
        .from('property_team')
        .select('property_id, permissions')
        .eq('user_id', uId);
        
      const managedPropertyIds = teamMemberships?.map(m => m.property_id) || [];
      const createLeasePropertyIds = teamMemberships?.filter(m => (m as any).permissions?.can_create_lease).map(m => m.property_id) || [];
      const editLeasePropertyIds = teamMemberships?.filter(m => (m as any).permissions?.can_edit_lease).map(m => m.property_id) || [];
      setCanEditPropertyIds(editLeasePropertyIds);
      
      // Load properties for dropdown
      let propsQuery = supabase.from('properties').select('id, address, suburb, rent_amount, owner_id');
      if (createLeasePropertyIds.length > 0) {
        propsQuery = propsQuery.or(`owner_id.eq.${userId},id.in.(${createLeasePropertyIds.join(',')})`);
      } else {
        propsQuery = propsQuery.eq('owner_id', userId);
      }
      const { data: propsData } = await propsQuery;
        
      if (propsData) {
        setProperties(propsData);
        sessionStorage.setItem('cached_properties', JSON.stringify(propsData));
      }
      
      const query = supabase.from('leases').select(`
        *,
        properties!inner(address, suburb, owner_id),
        lease_tenants (
          tenants (first_name, last_name, email)
        )
      `).order('created_at', { ascending: false });
      
      const { data: leaseData, error: leaseError } = await query;

      if (leaseError) throw leaseError;
      if (leaseData) {
        // Filter on the client-side to avoid Supabase JS nested .or() bugs
        let filteredLeases = leaseData as unknown as Lease[];
        if (managedPropertyIds.length > 0) {
          filteredLeases = filteredLeases.filter(l => l.properties?.owner_id === userId || managedPropertyIds.includes(l.property_id));
        } else {
          filteredLeases = filteredLeases.filter(l => l.properties?.owner_id === userId);
        }

        setLeases(filteredLeases);
        sessionStorage.setItem('cached_leases', JSON.stringify(filteredLeases));
      }
      
    } catch (err) {
      console.error("Error loading leases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLease = async (leaseId: string) => {
    // Check if lease has active tenants
    const leaseToDelete = leases.find(l => l.id === leaseId);
    if (leaseToDelete && leaseToDelete.lease_tenants && leaseToDelete.lease_tenants.length > 0) {
      alert('Cannot delete lease with attached tenants. Please remove the tenants or end the lease first.');
      setDeletingLeaseId(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('leases').delete().eq('id', leaseId);
      if (error) throw error;
      sessionStorage.removeItem('cached_leases');
      if (session?.user?.id) loadData(session.user.id);
      setDeletingLeaseId(null);
    } catch (err: any) {
      console.error('Delete lease error:', err);
      alert('Failed to delete lease: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (leaseId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('leases').update({ status: newStatus }).eq('id', leaseId);
      if (error) throw error;
      sessionStorage.removeItem('cached_leases');
      if (session?.user?.id) loadData(session.user.id);
    } catch (err: any) {
      console.error('Update status error:', err);
      alert('Failed to update status');
    }
  };

  const handleConvertToPeriodic = async (leaseId: string) => {
    try {
      const { error } = await supabase.from('leases').update({ end_date: null, status: 'Active' }).eq('id', leaseId);
      if (error) throw error;
      sessionStorage.removeItem('cached_leases');
      if (session?.user?.id) loadData(session.user.id);
    } catch (err: any) {
      console.error('Convert periodic error:', err);
      alert('Failed to convert to periodic');
    }
  };

  const handleRenewLease = (lease: Lease) => {
    setInitialLeaseData({
      propertyId: lease.property_id,
      startDate: lease.end_date ? new Date(new Date(lease.end_date).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: '',
      isPeriodic: false,
      rentAmount: lease.rent_amount,
      paymentFrequency: lease.payment_frequency,
      bondAmount: lease.bond_amount,
      tenants: lease.lease_tenants?.map((lt: any) => ({
        firstName: lt.tenants?.first_name || '',
        lastName: lt.tenants?.last_name || '',
        email: lt.tenants?.email || ''
      })).filter((t: any) => t.firstName) || []
    });
    setShowLeaseModal(true);
  };
  const getLeaseTimeRemaining = (endDate: string | null, status: string) => {
    if (status === 'Expired') return 'Expired';
    if (!endDate) return 'Periodic (Month-to-Month)';
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Expired ${Math.abs(diffDays)} days ago`;
    if (diffDays === 0) return 'Expires today';
    if (diffDays < 30) return `Expires in ${diffDays} days`;
    
    const diffMonths = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (diffMonths === 1) return `Expires in 1 month${remainingDays > 0 ? `, ${remainingDays} days` : ''}`;
    return `Expires in ${diffMonths} months`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Draft': return 'bg-slate-100 text-on-surface border-outline-variant/50';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Expired': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-on-surface border-outline-variant/50';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Lease Management
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">Manage active leases, renewals, and historical records.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-full shadow-inner border border-white items-center">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-[#4a4a5e] hover:text-[#1c1c28]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-[#4a4a5e] hover:text-[#1c1c28]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {properties.length > 0 && (
            <button 
              onClick={() => { setInitialLeaseData(null); setShowLeaseModal(true); }}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Create Lease
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
      ) : (() => {
        const filteredLeases = leases.filter(lease => {
          const address = (lease.properties?.address || '').toLowerCase();
          const suburb = (lease.properties?.suburb || '').toLowerCase();
          const tenantNames = (lease.lease_tenants || []).map((lt: any) => `${lt.tenants?.first_name || ''} ${lt.tenants?.last_name || ''}`.toLowerCase()).join(' ');
          
          const matchesSearch = address.includes(searchQuery.toLowerCase()) || 
                                suburb.includes(searchQuery.toLowerCase()) || 
                                tenantNames.includes(searchQuery.toLowerCase());
                                
          if (statusFilter === 'All') return matchesSearch;
          return matchesSearch && lease.status === statusFilter;
        });

        return (
          <div className="grid gap-6">
            {/* Search and Filters panel */}
            {leases.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-surface-container-lowest backdrop-blur-xl rounded-[24px] border border-outline-variant/50 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search leases by address, suburb, or tenant name..."
                    className="w-full bg-surface border border-outline-variant/50 rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold text-on-surface placeholder-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                
                <div className="flex gap-2">
                  {['All', 'Active', 'Pending', 'Expired'].map((status) => (
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
            )}

            {leases.length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 text-center border border-outline-variant/30 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 border border-outline-variant/30">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">No Leases Found</h3>
                <p className="text-on-surface-variant max-w-sm mb-6">You don't have any leases recorded yet. Create one manually or wait for a tenant to sign a rental application.</p>
                {properties.length > 0 && (
                  <button 
                    onClick={() => setShowLeaseModal(true)}
                    className="bg-primary text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-primary/90 transition-colors"
                  >
                    Create First Lease
                  </button>
                )}
              </div>
            ) : filteredLeases.length === 0 ? (
              <div className="bg-white rounded-[32px] py-24 px-6 text-center border border-outline-variant/30 shadow-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-surface border border-outline-variant/50 text-on-surface-variant rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-on-surface mb-2 tracking-tight">No leases found</h3>
                <p className="text-on-surface-variant max-w-sm mx-auto font-medium">
                  No records match your filters. Try clearing your search query or selecting a different status filter.
                </p>
              </div>
            ) : (
              <>
              {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLeases.map(lease => (
                  <div key={lease.id} className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4">
                  {/* Header: Property & Status */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-on-surface line-clamp-1">{lease.properties?.address || 'Unknown Property'}</div>
                        <div className="text-xs text-on-surface-variant">{lease.properties?.suburb}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border shrink-0 ${getStatusColor(lease.status)}`}>
                      {lease.status}
                    </span>
                  </div>

                  <div className="h-[1px] w-full bg-outline-variant/30"></div>

                  {/* Body: Tenants, Term, Financials */}
                  <div className="flex flex-col gap-4 flex-grow">
                    {/* Tenants */}
                    <div>
                      <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tenants</div>
                      <div className="flex flex-col gap-1.5">
                        {lease.lease_tenants && lease.lease_tenants.length > 0 ? (
                          lease.lease_tenants.map((lt: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium text-sm text-on-surface">{lt.tenants?.first_name} {lt.tenants?.last_name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-sm text-slate-400 italic">No Tenants</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Term */}
                    <div>
                      <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Lease Term</div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{new Date(lease.start_date).toLocaleDateString()} <ArrowRight className="w-3 h-3 text-slate-300 mx-1 inline" /> {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Periodic'}</span>
                        </div>
                        <div className={`text-[11px] font-bold ${lease.status === 'Expired' || (lease.end_date && new Date(lease.end_date) < new Date()) ? 'text-red-500' : 'text-primary'}`}>
                          {getLeaseTimeRemaining(lease.end_date, lease.status)}
                        </div>
                      </div>
                    </div>

                    {/* Financials */}
                    <div>
                      <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Rent Amount</div>
                      <div className="flex items-center gap-1 font-bold text-on-surface text-lg">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        {Number(lease.rent_amount).toLocaleString('en-AU')} <span className="text-sm font-medium text-slate-400 font-normal">/ {lease.payment_frequency?.toLowerCase().replace('ly', '') || 'week'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] w-full bg-outline-variant/30 mt-auto"></div>

                  {/* Footer: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {lease.status === 'Active' && (
                      <>
                        <button onClick={() => handleUpdateStatus(lease.id, 'Expired')} className="text-xs px-2.5 py-1.5 font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200">
                          Set Expired
                        </button>
                        {lease.end_date && (
                          <button onClick={() => handleConvertToPeriodic(lease.id)} className="text-xs px-2.5 py-1.5 font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                            Make Periodic
                          </button>
                        )}
                      </>
                    )}
                    {(lease.status === 'Expired' || lease.status === 'Active') && (
                      <button onClick={() => handleRenewLease(lease)} className="text-xs px-2.5 py-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200" title="Edit or Renew Lease">
                        Edit / Renew
                      </button>
                    )}
                    {lease.status === 'Expired' && (
                      <button onClick={() => handleUpdateStatus(lease.id, 'Active')} className="text-xs px-2.5 py-1.5 font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                        Set Active
                      </button>
                    )}
                    
                    <div className="flex-grow"></div>
                    
                    <button 
                      onClick={() => {
                        const dummyAgreementDetails = {
                          signingProvider: `${session?.user?.email || 'Landlord'} - ${session?.user?.email || ''}, `,
                          dateOfAgreement: new Date().toISOString(),
                          renterAddresses: {},
                          urgentRepairs: { contactName: "Agent/Landlord", phone: "000", email: session?.user?.email || "" },
                          ownersCorporation: false,
                          conditionReport: "To be provided",
                          additionalTerms: "Standard Residential Tenancies Act terms apply"
                        };
                        const formattedTenants = lease.lease_tenants?.map(lt => ({
                          id: lt.tenants.email,
                          firstName: lt.tenants.first_name,
                          lastName: lt.tenants.last_name,
                          email: lt.tenants.email,
                          phone: ""
                        })) || [];
                        const bondDetails = { amount: String(lease.bond_amount || lease.rent_amount * 4 || 0), isPaid: false, dueDate: lease.start_date, collectViaPlatform: false };
                        const leaseDetails = {
                          startDate: lease.start_date,
                          endDate: lease.end_date,
                          rentAmount: String(lease.rent_amount),
                          rentFrequency: lease.payment_frequency,
                          leaseType: lease.end_date ? "Fixed term" : "Periodic"
                        };
                        const fullAddress = lease.properties ? `${lease.properties.address}, ${lease.properties.suburb}` : "";

                        generateVictoriaLeasePdf(dummyAgreementDetails, formattedTenants, bondDetails, leaseDetails, fullAddress, lease.property_id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary/20 hover:bg-primary/5 text-primary font-semibold text-xs rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </button>
                    
                    {(lease.properties?.owner_id === session?.user?.id || canEditPropertyIds.includes(lease.property_id)) && (
                      <button 
                        onClick={() => setDeletingLeaseId(lease.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 font-semibold text-xs rounded-lg transition-colors"
                        title="Delete Lease"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgba(59,34,181,0.04)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/5 bg-[#f8f9fc]/50">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Property</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Tenants</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Term / Dates</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Rent</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e]">Status</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-[#4a4a5e] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeases.map((lease, index) => (
                        <tr key={lease.id} className={`border-b border-black/5 transition-colors group ${index % 2 === 0 ? 'bg-transparent hover:bg-[#f8f9fc]/50' : 'bg-[#f8f9fc]/30 hover:bg-[#f8f9fc]/80'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#f8f9fc] to-white flex items-center justify-center shrink-0 border border-black/5 shadow-inner">
                                <Building className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex flex-col justify-center max-w-[200px]">
                                <div className="font-black text-sm text-[#1c1c28] tracking-tight truncate">{lease.properties?.address}</div>
                                <div className="text-[10px] font-bold text-[#4a4a5e] uppercase tracking-wider mt-0.5">{lease.properties?.suburb}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {lease.lease_tenants && lease.lease_tenants.length > 0 ? (
                                lease.lease_tenants.map((lt: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5">
                                    <span className="font-medium text-sm text-[#1c1c28] whitespace-nowrap">{lt.tenants?.first_name} {lt.tenants?.last_name}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No Tenants</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-medium text-[#1c1c28]">
                                {new Date(lease.start_date).toLocaleDateString()} - {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Periodic'}
                              </div>
                              <div className={`text-[11px] font-bold ${lease.status === 'Expired' || (lease.end_date && new Date(lease.end_date) < new Date()) ? 'text-red-500' : 'text-primary'}`}>
                                {getLeaseTimeRemaining(lease.end_date, lease.status)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="text-base font-black text-[#1c1c28]">${Number(lease.rent_amount).toLocaleString('en-AU')}</div>
                              <div className="text-[10px] text-[#4a4a5e] uppercase">/{lease.payment_frequency?.toLowerCase().replace('ly', '') || 'week'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${lease.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : lease.status === 'Expired' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                              {lease.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleRenewLease(lease)} 
                                className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-colors border border-primary/10"
                                title="Edit / Renew Lease"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  const dummyAgreementDetails = {
                                    signingProvider: `${session?.user?.email || 'Landlord'} - ${session?.user?.email || ''}, `,
                                    dateOfAgreement: new Date().toISOString(),
                                    renterAddresses: {},
                                    urgentRepairs: { contactName: "Agent/Landlord", phone: "000", email: session?.user?.email || "" },
                                    ownersCorporation: false,
                                    conditionReport: "To be provided",
                                    additionalTerms: "Standard Residential Tenancies Act terms apply"
                                  };
                                  const formattedTenants = lease.lease_tenants?.map(lt => ({
                                    id: lt.tenants.email,
                                    firstName: lt.tenants.first_name,
                                    lastName: lt.tenants.last_name,
                                    email: lt.tenants.email,
                                    phone: ""
                                  })) || [];
                                  const bondDetails = { amount: String(lease.bond_amount || lease.rent_amount * 4 || 0), isPaid: false, dueDate: lease.start_date, collectViaPlatform: false };
                                  const leaseDetails = {
                                    startDate: lease.start_date,
                                    endDate: lease.end_date,
                                    rentAmount: String(lease.rent_amount),
                                    rentFrequency: lease.payment_frequency,
                                    leaseType: lease.end_date ? "Fixed term" : "Periodic"
                                  };
                                  const fullAddress = lease.properties ? `${lease.properties.address}, ${lease.properties.suburb}` : "";

                                  generateVictoriaLeasePdf(dummyAgreementDetails, formattedTenants, bondDetails, leaseDetails, fullAddress, lease.property_id);
                                }}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors border border-blue-100"
                                title="Download PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              {(lease.properties?.owner_id === session?.user?.id || canEditPropertyIds.includes(lease.property_id)) && (
                                <button 
                                  onClick={() => setDeletingLeaseId(lease.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                                  title="Delete Lease"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </>
          )}
          </div>
        );
      })()}

      {/* ── CREATE LEASE MODAL ── */}
      <LeaseManagerModal
        isOpen={showLeaseModal}
        onClose={() => {
          setShowLeaseModal(false);
          setInitialLeaseData(null);
        }}
        properties={
          initialLeaseData
            ? properties // allow current property for renewal
            : properties.filter(p => {
                const propertyLeases = leases.filter(l => l.property_id === p.id && l.status === 'Active');
                if (propertyLeases.length === 0) return true;
                const activeLease = propertyLeases[0];
                if (!activeLease.end_date) return false; // periodic, no end date
                const daysRemaining = Math.ceil((new Date(activeLease.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                return daysRemaining <= 5;
              })
        }
        initialData={initialLeaseData}
        onLeaseCreated={() => {
          if (session?.user?.id) loadData(session.user.id);
        }}
      />

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {createPortal(
        <AnimatePresence>
          {deletingLeaseId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeletingLeaseId(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-[28px] w-full max-w-sm shadow-2xl border border-red-100 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="font-black text-xl text-on-surface mb-2">Delete Lease?</h3>
                <p className="text-on-surface-variant text-sm mb-6">This action is permanent and cannot be undone. The lease record will be removed from the database.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingLeaseId(null)} className="flex-1 bg-surface-container-low border border-outline-variant/50 text-on-surface font-bold py-3 rounded-2xl hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteLease(deletingLeaseId)}
                    disabled={isDeleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      </div>
    </DashboardLayout>
  );
}
