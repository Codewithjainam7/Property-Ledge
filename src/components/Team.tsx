import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Building, Trash2, Users, AlertTriangle, CheckCircle2, ChevronDown, Clock, RefreshCw, Search, Filter, MoreHorizontal, LayoutGrid, List, UserCheck, X as XIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider, CssBaseline, Modal, Box, Typography, IconButton, FormControl, InputLabel, Select, MenuItem, Button, TextField, FormLabel } from '@mui/material';
import { wizardTheme } from './TenancySetupWizard';
import { X } from 'lucide-react';

type Property = {
  id: string;
  address: string;
  suburb: string;
  image?: string;
};

// Unified interface for the UI, combining Active members and Pending invites
type TeamMemberRow = {
  id: string;
  isPending: boolean;
  property_id: string;
  user_id?: string;
  role: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: 'Pending' | 'Active' | 'Expired';
  created_at?: string;
  permissions?: {
    can_view_property: boolean;
    can_view_lease: boolean;
    can_create_lease: boolean;
    can_edit_lease: boolean;
    can_manage_tenants: boolean;
    can_renew_lease: boolean;
    can_terminate_lease: boolean;
  };
};

// Role style config
const roleConfig: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  Agent:   { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-500' },
  Strata:  { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  Manager: { color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200',dot: 'bg-emerald-500' },
  Tenant:  { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
};

const displayRoles: Record<string, string> = {
  Agent: 'Agent', Strata: 'Strata', Manager: 'Co-owner', Tenant: 'Tenant'
};

const avatarColors = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-teal-500',
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20];

export function Team() {
  const { session } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('Agent');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Table UI State
  const [activeTab, setActiveTab] = useState<'all' | 'Tenant' | 'Agent' | 'Manager' | 'Strata'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (session?.user.id) {
      loadData(session.user.id);
    }
  }, [session]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const propsResponse = await supabase.from('properties').select('id, address, suburb, image').eq('owner_id', userId);
      const props = propsResponse.data || [];
      setProperties(props);

      if (props.length === 0) { setTeamMembers([]); setLoading(false); return; }
      const propIds = props.map(p => p.id);

      const { data: activeData } = await supabase
        .from('property_team')
        .select('*, user_profiles!property_team_user_profiles_fkey (first_name, last_name, email)')
        .in('property_id', propIds);

      const { data: pendingData } = await supabase
        .from('team_invitations').select('*').in('property_id', propIds).in('status', ['Pending', 'Expired']);

      const { data: tenantsData } = await supabase
        .from('tenants').select('*').in('property_id', propIds);

      const combined: TeamMemberRow[] = [];

      (activeData || []).forEach(member => {
        combined.push({
          id: member.id, isPending: false, property_id: member.property_id, user_id: member.user_id,
          role: member.role, email: member.email || member.user_profiles?.email || 'Unknown',
          first_name: member.user_profiles?.first_name, last_name: member.user_profiles?.last_name,
          status: 'Active', permissions: member.permissions, created_at: member.created_at
        });
      });
      (pendingData || []).forEach(invite => {
        combined.push({
          id: invite.id, isPending: true, property_id: invite.property_id, role: invite.role,
          email: invite.email, status: invite.status as 'Pending' | 'Expired',
          permissions: invite.permissions, created_at: invite.created_at
        });
      });
      (tenantsData || []).forEach(tenant => {
        combined.push({
          id: tenant.id, isPending: tenant.status === 'Invited' || tenant.status === 'Pending',
          property_id: tenant.property_id, role: 'Tenant',
          email: tenant.email, first_name: tenant.first_name, last_name: tenant.last_name,
          status: tenant.status === 'Active' ? 'Active' : 'Pending', created_at: tenant.created_at,
          permissions: { can_view_property: false, can_view_lease: true, can_create_lease: false, can_edit_lease: false, can_manage_tenants: false, can_renew_lease: false, can_terminate_lease: false }
        });
      });

      setTeamMembers(combined);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(''); setInviteSuccess(''); setInviting(true);
    if (!selectedPropertyId) { setInviteError("Please select a property."); setInviting(false); return; }
    try {
      const selectedProp = properties.find(p => p.id === selectedPropertyId);
      const landlordEmail = session?.user?.email || '';
      let emailFailed = false;

      if (inviteRole === 'Tenant') {
        const inviteToken = crypto.randomUUID();
        const { data: tenantData, error: insertError } = await supabase.from('tenants').insert([{
          property_id: selectedPropertyId, owner_id: session?.user?.id,
          email: inviteEmail.trim(), first_name: inviteFirstName.trim() || 'Invited',
          last_name: inviteLastName.trim(), status: 'Invited', invite_token: inviteToken,
          access_level: { receives_emails: true, can_login: true }
        }]).select().single();
        if (insertError) { setInviteError(insertError.message); setInviting(false); return; }
        if (selectedProp) {
          try {
            await supabase.functions.invoke('send-email', { body: { to: inviteEmail, subject: `Invitation to join ${selectedProp.address} as a Tenant`, templateType: 'tenant-invite', variables: { firstName: inviteFirstName.trim() || 'Tenant', propertyAddress: `${selectedProp.address}, ${selectedProp.suburb}`, inviteUrl: `${window.location.origin}/accept-tenant-invite?token=${inviteToken}`, leaseStart: 'TBD', rentAmount: 'TBD', bondAmount: 'TBD' } } });
          } catch (emailErr: any) { emailFailed = true; setInviteError(`Tenant created, but email failed: ${emailErr?.message || 'Unknown error'}`); }
        }
      } else {
        const { data: inviteData, error: insertError } = await supabase.from('team_invitations').insert({ property_id: selectedPropertyId, invited_by: session?.user?.id, email: inviteEmail.trim(), role: inviteRole, permissions: { can_view_property: true, can_view_lease: inviteRole !== 'Strata', can_create_lease: inviteRole === 'Manager' || inviteRole === 'Agent', can_edit_lease: inviteRole === 'Manager' || inviteRole === 'Agent', can_manage_tenants: inviteRole === 'Manager' || inviteRole === 'Agent', can_renew_lease: inviteRole === 'Manager' || inviteRole === 'Agent', can_terminate_lease: inviteRole === 'Manager' || inviteRole === 'Agent' } }).select().single();
        if (insertError) { if (insertError.code === '23505') { setInviteError("There is already a pending invitation for this email."); } else { setInviteError(insertError.message); } setInviting(false); return; }
        if (selectedProp && inviteData) {
          try {
            await supabase.functions.invoke('send-email', { body: { to: inviteEmail, subject: `Invitation to join the property team at ${selectedProp.address}`, templateType: 'team-invite', variables: { propertyAddress: `${selectedProp.address}, ${selectedProp.suburb}`, inviteUrl: `${window.location.origin}/accept-invite?token=${inviteData.token}`, role: inviteRole, landlordEmail } } });
          } catch (emailErr: any) { emailFailed = true; setInviteError(`Invite created, but email failed: ${emailErr?.message || 'Unknown error'}`); }
        }
      }

      if (!emailFailed) {
        setInviteSuccess(`Successfully invited ${inviteEmail}`);
        setTimeout(() => { setShowInviteModal(false); setInviteEmail(''); setInviteFirstName(''); setInviteLastName(''); setInviteRole('Agent'); setInviteSuccess(''); loadData(session?.user?.id || ''); }, 2000);
      }
    } catch (err: any) { setInviteError(err.message || "An error occurred."); } finally { setInviting(false); }
  };

  const togglePermission = async (member: TeamMemberRow, field: string, currentValue: boolean) => {
    if (member.isPending) return;
    try {
      if (!member.permissions) return;
      const newPermissions = { ...member.permissions, [field]: !currentValue };
      setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: newPermissions } : m));
      const { error } = await supabase.from('property_team').update({ permissions: newPermissions }).eq('id', member.id);
      if (error) { setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: member.permissions } : m)); }
    } catch (err) { console.error(err); }
  };

  const changeRole = async (member: TeamMemberRow, newRole: string) => {
    try {
      if (member.isPending) { await supabase.from('team_invitations').update({ role: newRole }).eq('id', member.id); }
      else { await supabase.from('property_team').update({ role: newRole }).eq('id', member.id); }
      setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
    } catch (err) { console.error(err); alert("Failed to change role."); }
  };

  const removeMember = async (member: TeamMemberRow) => {
    const msg = member.isPending ? "Revoke this invitation?" : "Remove this team member? They will lose access immediately.";
    if (!window.confirm(msg)) return;
    try {
      const table = member.isPending ? 'team_invitations' : (member.role === 'Tenant' ? 'tenants' : 'property_team');
      const { error } = await supabase.from(table).delete().eq('id', member.id);
      if (error) throw error;
      setTeamMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (err) { console.error(err); alert("Failed to remove member."); }
  };

  const resendInvite = async (member: TeamMemberRow) => {
    if (!member.isPending) return;
    alert(`Reminder email functionality would send a fresh link to ${member.email}`);
  };

  // Derived stats
  const totalMembers = teamMembers.length;
  const activeMembers = teamMembers.filter(m => m.status === 'Active').length;
  const pendingInvites = teamMembers.filter(m => m.status === 'Pending' || m.status === 'Expired').length;
  const uniqueRoles = new Set(teamMembers.map(m => m.role)).size;

  // Filtered + paginated members
  const filteredMembers = useMemo(() => {
    let list = teamMembers;
    if (activeTab !== 'all') list = list.filter(m => m.role === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.email.toLowerCase().includes(q) ||
        (m.first_name || '').toLowerCase().includes(q) ||
        (m.last_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [teamMembers, activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / rowsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery, rowsPerPage]);

  const tabCounts = {
    all: teamMembers.length,
    Tenant: teamMembers.filter(m => m.role === 'Tenant').length,
    Agent: teamMembers.filter(m => m.role === 'Agent').length,
    Manager: teamMembers.filter(m => m.role === 'Manager').length,
    Strata: teamMembers.filter(m => m.role === 'Strata').length,
  };

  const statsCards = [
    { label: 'Total Members', value: totalMembers, sub: 'Across all properties', icon: <Users className="w-5 h-5" />, iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
    { label: 'Active Members', value: activeMembers, sub: totalMembers > 0 ? `${Math.round(activeMembers / totalMembers * 100)}% of total` : '—', icon: <UserCheck className="w-5 h-5" />, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Pending Invites', value: pendingInvites, sub: 'Awaiting acceptance', icon: <Clock className="w-5 h-5" />, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'Roles', value: uniqueRoles, sub: 'Across all properties', icon: <Shield className="w-5 h-5" />, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
              <Users className="w-7 h-7 text-on-surface" />
              Team Access
            </h1>
            <p className="text-sm text-on-surface-variant font-medium mt-1">Manage agents, strata members, and co-owners across all your properties.</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-on-surface text-white px-5 py-2.5 rounded-2xl font-bold hover:opacity-90 transition-all shadow-sm text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((stat) => (
                <div key={stat.label} className="bg-white rounded-[20px] border border-outline-variant/30 p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${stat.iconBg} ${stat.iconColor}`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-on-surface-variant truncate">{stat.label}</p>
                    <p className="text-2xl font-black text-on-surface leading-none mt-0.5">{stat.value}</p>
                    <p className="text-[11px] text-on-surface-variant/70 mt-0.5 truncate">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Properties Row ── */}
            {properties.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-on-surface">Properties</h2>
                  <button
                    onClick={() => { setSelectedPropertyId(''); setShowInviteModal(true); }}
                    className="flex items-center gap-1.5 border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low px-3 py-1.5 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Invite to Property
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                  {properties.map(property => {
                    const pm = teamMembers.filter(m => m.property_id === property.id);
                    const active = pm.filter(m => m.status === 'Active').length;
                    const pending = pm.filter(m => m.status === 'Pending' || m.status === 'Expired').length;
                    const roles = new Set(pm.map(m => m.role)).size;
                    return (
                      <div key={property.id} className="bg-white rounded-[20px] border border-outline-variant/30 shadow-sm hover:shadow-lg transition-all cursor-pointer group shrink-0 w-[220px] sm:w-[240px] overflow-hidden">
                        {/* Property image placeholder */}
                        <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-slate-100 relative overflow-hidden">
                          {property.image ? (
                            <img src={property.image} alt={property.address} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Building className="w-10 h-10 text-primary/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Building className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-on-surface text-sm leading-tight truncate">{property.address}</p>
                              <p className="text-[11px] text-on-surface-variant font-medium">{property.suburb}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mb-3">
                            {pm.slice(0, 4).map((m, i) => (
                              <div key={m.id} className={`w-6 h-6 rounded-full border-2 border-white text-white text-[9px] font-black flex items-center justify-center -ml-${i > 0 ? '1' : '0'} ${getAvatarColor(m.email)}`}>
                                {(m.first_name || m.email || '?').charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {pm.length > 4 && <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 text-slate-600 text-[9px] font-black flex items-center justify-center -ml-1">+{pm.length - 4}</div>}
                            <span className="ml-1 text-[11px] font-bold text-on-surface-variant">{pm.length} Member{pm.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /><span className="text-xs font-black">{active}</span></div>
                              <p className="text-[10px] text-on-surface-variant font-medium">Active</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-amber-500"><Clock className="w-3 h-3" /><span className="text-xs font-black">{pending}</span></div>
                              <p className="text-[10px] text-on-surface-variant font-medium">Pending</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-blue-500"><Shield className="w-3 h-3" /><span className="text-xs font-black">{roles}</span></div>
                              <p className="text-[10px] text-on-surface-variant font-medium">Roles</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Members Table ── */}
            <div className="bg-white rounded-[24px] border border-outline-variant/30 shadow-sm overflow-hidden">
              {/* Table Header: Tabs + Search + Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 pt-5 pb-0 border-b border-outline-variant/20">
                {/* Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  <h3 className="text-base font-black text-on-surface mr-3 shrink-0">All Members</h3>
                  {([
                    { key: 'all', label: 'All', count: tabCounts.all },
                    { key: 'Tenant', label: 'Tenants', count: tabCounts.Tenant },
                    { key: 'Agent', label: 'Agents', count: tabCounts.Agent },
                    { key: 'Manager', label: 'Co-owners', count: tabCounts.Manager },
                    { key: 'Strata', label: 'Others', count: tabCounts.Strata },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`shrink-0 px-3 py-2 text-sm font-bold transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
                        activeTab === tab.key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {tab.label}
                      <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Search */}
                <div className="flex items-center gap-2 pb-2 sm:pb-0 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-surface-container-low border border-outline-variant/40 rounded-xl pl-9 pr-3 py-2 text-sm text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all w-48"
                    />
                  </div>
                  <button className="flex items-center gap-1.5 border border-outline-variant/40 rounded-xl px-3 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors">
                    <Filter className="w-4 h-4" /> Filter
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Table */}
              {paginatedMembers.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-on-surface-variant text-sm">{searchQuery ? 'No members match your search.' : 'No members in this category yet.'}</p>
                  {!searchQuery && (
                    <button onClick={() => setShowInviteModal(true)} className="mt-4 bg-primary/10 text-primary font-black text-sm px-6 py-2.5 rounded-full hover:bg-primary/20 transition-colors">
                      + Invite Member
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-outline-variant/20">
                        <th className="text-left px-6 py-3 text-[11px] font-black text-on-surface-variant uppercase tracking-wider">Member</th>
                        <th className="text-left px-4 py-3 text-[11px] font-black text-on-surface-variant uppercase tracking-wider">Role</th>
                        <th className="text-left px-4 py-3 text-[11px] font-black text-on-surface-variant uppercase tracking-wider">Property</th>
                        <th className="text-left px-4 py-3 text-[11px] font-black text-on-surface-variant uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-[11px] font-black text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">Invited On</th>
                        <th className="text-right px-6 py-3 text-[11px] font-black text-on-surface-variant uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {paginatedMembers.map(member => {
                        const property = properties.find(p => p.id === member.property_id);
                        const rc = roleConfig[member.role] || { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', dot: 'bg-slate-400' };
                        const displayName = (member.first_name || member.last_name)
                          ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                          : member.email.split('@')[0];
                        const avatarBg = getAvatarColor(member.email);

                        return (
                          <tr key={member.id} className="hover:bg-surface-container-lowest/50 transition-colors group">
                            {/* Member */}
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${member.isPending ? 'bg-amber-400' : avatarBg}`}>
                                  {(member.first_name || member.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-on-surface text-sm truncate">{displayName}</p>
                                  <p className="text-xs text-on-surface-variant truncate">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            {/* Role */}
                            <td className="px-4 py-3.5">
                              {member.role === 'Tenant' ? (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${rc.color} ${rc.bg} ${rc.border}`}>
                                  {displayRoles[member.role] || member.role}
                                </span>
                              ) : (
                                <div className="relative inline-block">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === member.id ? null : member.id); }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${rc.color} ${rc.bg} ${rc.border} hover:opacity-80`}
                                  >
                                    {displayRoles[member.role] || member.role}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdownId === member.id ? 'rotate-180' : ''}`} />
                                  </button>
                                  <AnimatePresence>
                                    {openDropdownId === member.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                                        <motion.div
                                          initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }} transition={{ duration: 0.12 }}
                                          className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-slate-200 py-1.5 z-50 overflow-hidden"
                                        >
                                          {['Manager', 'Strata', 'Agent'].map(r => {
                                            const rConf = roleConfig[r] || rc;
                                            return (
                                              <button key={r} onClick={() => { changeRole(member, r); setOpenDropdownId(null); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors hover:bg-slate-50 ${member.role === r ? rConf.color : 'text-slate-700'}`}
                                              >
                                                {displayRoles[r] || r}
                                              </button>
                                            );
                                          })}
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </td>
                            {/* Property */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Building className="w-3.5 h-3.5 text-on-surface-variant/60 shrink-0" />
                                <span className="text-sm font-semibold text-on-surface-variant truncate max-w-[140px]">
                                  {property ? property.address : '—'}
                                </span>
                              </div>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${member.status === 'Active' ? 'bg-emerald-500' : member.status === 'Expired' ? 'bg-red-400' : 'bg-amber-400'}`} />
                                <span className={`text-sm font-bold ${member.status === 'Active' ? 'text-emerald-700' : member.status === 'Expired' ? 'text-red-600' : 'text-amber-600'}`}>
                                  {member.status}
                                </span>
                              </div>
                            </td>
                            {/* Invited On */}
                            <td className="px-4 py-3.5 hidden lg:table-cell">
                              <span className="text-sm text-on-surface-variant font-medium">{formatDate(member.created_at)}</span>
                            </td>
                            {/* Actions */}
                            <td className="px-6 py-3.5 text-right">
                              <div className="relative inline-block">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenActionId(openActionId === member.id ? null : member.id); }}
                                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                <AnimatePresence>
                                  {openActionId === member.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setOpenActionId(null)} />
                                      <motion.div
                                        initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }} transition={{ duration: 0.12 }}
                                        className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-slate-200 py-1.5 z-50 overflow-hidden"
                                      >
                                        {member.isPending && (
                                          <button onClick={() => { resendInvite(member); setOpenActionId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                            <RefreshCw className="w-4 h-4 text-slate-400" /> Resend Invite
                                          </button>
                                        )}
                                        <button onClick={() => { removeMember(member); setOpenActionId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                                          <Trash2 className="w-4 h-4" /> {member.isPending ? 'Revoke Invite' : 'Remove Member'}
                                        </button>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {filteredMembers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant/20">
                  <p className="text-sm text-on-surface-variant font-medium order-2 sm:order-1">
                    Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredMembers.length)}–{Math.min(currentPage * rowsPerPage, filteredMembers.length)} of {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-3 order-1 sm:order-2">
                    {/* Page buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page = i + 1;
                        if (totalPages > 5 && currentPage > 3) page = currentPage - 2 + i;
                        if (page > totalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-xl text-sm font-bold transition-colors ${currentPage === page ? 'bg-primary text-white' : 'border border-outline-variant/40 text-on-surface hover:bg-surface-container-low'}`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                    </div>
                    {/* Rows per page */}
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant font-medium">
                      <span className="hidden sm:inline">Rows per page</span>
                      <div className="relative">
                        <select
                          value={rowsPerPage}
                          onChange={e => setRowsPerPage(Number(e.target.value))}
                          className="appearance-none bg-white border border-outline-variant/40 rounded-xl px-3 py-1.5 pr-7 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                          {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Invite Modal ── */}
        <ThemeProvider theme={wizardTheme}>
          <CssBaseline />
          <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} closeAfterTransition>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 550, bgcolor: 'background.paper', borderRadius: '28px', boxShadow: 24, p: 0, outline: 'none', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: { xs: 3, md: 5 }, overflowY: 'auto', flex: 1, position: 'relative' }}>
                <IconButton onClick={() => setShowInviteModal(false)} sx={{ position: 'absolute', top: 16, right: 16 }}>
                  <X />
                </IconButton>
                <Box sx={{ textAlign: 'center', mb: 4, pt: 1 }}>
                  <Typography variant="h4" component="h1" gutterBottom sx={{ letterSpacing: '-0.5px', fontWeight: '900', fontFamily: 'Space Grotesk', fontSize: { xs: '1.75rem', sm: '2rem' } }}>
                    Grant Access
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Invite a new member to collaborate on your property.
                  </Typography>
                </Box>

                {inviteError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 shrink-0" /><p>{inviteError}</p>
                  </div>
                )}
                {inviteSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 shrink-0" /><p>{inviteSuccess}</p>
                  </div>
                )}

                <form onSubmit={handleInvite}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Select Property</InputLabel>
                    <Select value={selectedPropertyId} label="Select Property" onChange={e => setSelectedPropertyId(e.target.value as string)} sx={{ borderRadius: '16px' }}>
                      {properties.map(p => <MenuItem key={p.id} value={p.id}>{p.address}, {p.suburb}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField fullWidth label="Member Email" type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '16px' } }} />
                  <AnimatePresence>
                    {inviteRole === 'Tenant' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 3, pt: 1 }}>
                          <TextField fullWidth label="First Name" required={inviteRole === 'Tenant'} value={inviteFirstName} onChange={e => setInviteFirstName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px' } }} />
                          <TextField fullWidth label="Last Name" required={inviteRole === 'Tenant'} value={inviteLastName} onChange={e => setInviteLastName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px' } }} />
                        </Box>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <FormControl component="fieldset" sx={{ width: '100%', mb: 4 }}>
                    <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1, fontSize: '0.875rem' }}>Assign Role</FormLabel>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1.5 }}>
                      {['Agent', 'Strata', 'Manager', 'Tenant'].map(role => (
                        <label key={role} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${inviteRole === role ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-outline-variant/50 hover:border-outline-variant/80 text-on-surface-variant font-medium'}`}>
                          <input type="radio" name="role" value={role} checked={inviteRole === role} onChange={() => setInviteRole(role)} className="hidden" />
                          <div className="text-sm">{{ Agent: 'Real Estate Agent', Strata: 'Strata Manager', Manager: 'Property Manager', Tenant: 'Tenant' }[role]}</div>
                        </label>
                      ))}
                    </Box>
                  </FormControl>
                  <Button type="submit" variant="contained" fullWidth disabled={inviting || !!inviteSuccess} sx={{ py: 2, borderRadius: '16px', fontSize: '0.875rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </form>
              </Box>
            </Box>
          </Modal>
        </ThemeProvider>

      </div>
    </DashboardLayout>
  );
}
