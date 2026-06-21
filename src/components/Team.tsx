import React, { useState, useEffect } from 'react';
import { Shield, Plus, Building, Trash2, Mail, Users, Key, AlertTriangle, CheckCircle2, ChevronDown, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

type Property = {
  id: string;
  address: string;
  suburb: string;
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

export function Team() {
  const { session } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  
  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Agent');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);

  useEffect(() => {
    if (session?.user.id) {
      loadData(session.user.id);
    }
  }, [session]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Fetch properties
      const propsResponse = await supabase.from('properties').select('id, address, suburb').eq('owner_id', userId);
      const props = propsResponse.data || [];
      setProperties(props);

      if (props.length === 0) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }
      
      const propIds = props.map(p => p.id);

      // 2. Fetch Active team members (property_team)
      const { data: activeData, error: activeErr } = await supabase
        .from('property_team')
        .select(`
          *,
          user_profiles!property_team_user_profiles_fkey (first_name, last_name, email)
        `)
        .in('property_id', propIds);
        
      if (activeErr) console.error("Error fetching active team:", activeErr);

      // 3. Fetch Pending invites (team_invitations)
      const { data: pendingData, error: pendingErr } = await supabase
        .from('team_invitations')
        .select('*')
        .in('property_id', propIds)
        .in('status', ['Pending', 'Expired']);
        
      if (pendingErr) console.error("Error fetching pending invites:", pendingErr);

      // Combine into unified format
      const combined: TeamMemberRow[] = [];
      
      (activeData || []).forEach(member => {
        combined.push({
          id: member.id,
          isPending: false,
          property_id: member.property_id,
          user_id: member.user_id,
          role: member.role,
          email: member.email || member.user_profiles?.email || 'Unknown',
          first_name: member.user_profiles?.first_name,
          last_name: member.user_profiles?.last_name,
          status: 'Active',
          permissions: member.permissions
        });
      });

      (pendingData || []).forEach(invite => {
        combined.push({
          id: invite.id,
          isPending: true,
          property_id: invite.property_id,
          role: invite.role,
          email: invite.email,
          status: invite.status as 'Pending' | 'Expired',
          permissions: invite.permissions
        });
      });

      setTeamMembers(combined);
    } catch (err) {
      console.error("Error loading team data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);

    if (!selectedPropertyId) {
      setInviteError("Please select a property.");
      setInviting(false);
      return;
    }

    try {
      const selectedProp = properties.find(p => p.id === selectedPropertyId);
      const landlordEmail = session?.user?.email || '';
      
      // 1. Insert into team_invitations table
      const { data: inviteData, error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          property_id: selectedPropertyId,
          invited_by: session?.user?.id,
          email: inviteEmail.trim(),
          role: inviteRole,
          permissions: {
            can_view_property: true,
            can_view_lease: inviteRole !== 'Strata',
            can_create_lease: inviteRole === 'Manager' || inviteRole === 'Agent',
            can_edit_lease: inviteRole === 'Manager' || inviteRole === 'Agent',
            can_manage_tenants: inviteRole === 'Manager' || inviteRole === 'Agent',
            can_renew_lease: inviteRole === 'Manager' || inviteRole === 'Agent',
            can_terminate_lease: inviteRole === 'Manager' || inviteRole === 'Agent'
          }
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setInviteError("There is already a pending invitation for this email.");
        } else {
          setInviteError(insertError.message);
        }
        setInviting(false);
        return;
      }

      // 2. Send email via edge function
      let emailFailed = false;
      if (selectedProp && inviteData) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: inviteEmail,
              subject: `Invitation to join the property team at ${selectedProp.address}`,
              templateType: 'team-invite',
              variables: {
                propertyAddress: `${selectedProp.address}, ${selectedProp.suburb}`,
                inviteUrl: `${window.location.origin}/accept-invite?token=${inviteData.token}`,
                role: inviteRole,
                landlordEmail: landlordEmail
              }
            }
          });
        } catch (emailErr: any) {
          console.error("Email Edge Function call failed:", emailErr);
          emailFailed = true;
          setInviteError(`Invite created, but email failed: ${emailErr?.message || 'Unknown error'}`);
        }
      }

      if (!emailFailed) {
        setInviteSuccess("Invitation sent! They will appear as 'Pending' until they accept.");
      }

      setInviteEmail('');
      if (session?.user.id) loadData(session.user.id);
      
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
        setInviteError('');
      }, 3500);

    } catch (err: any) {
      console.error("Invite error:", err);
      setInviteError(err.message || "An error occurred.");
    } finally {
      setInviting(false);
    }
  };

  const togglePermission = async (member: TeamMemberRow, field: string, currentValue: boolean) => {
    // Only allow editing active members for now
    if (member.isPending) {
      alert("You can only edit permissions for active team members.");
      return;
    }

    try {
      if (!member.permissions) return;
      const newPermissions = { ...member.permissions, [field]: !currentValue };

      // Optimistic update
      setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: newPermissions } : m));
      
      const { error } = await supabase
        .from('property_team')
        .update({ permissions: newPermissions })
        .eq('id', member.id);
        
      if (error) {
        // Revert on error
        setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: member.permissions } : m));
        console.error("Error updating permission:", error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeMember = async (member: TeamMemberRow) => {
    const msg = member.isPending 
      ? "Are you sure you want to revoke this invitation?"
      : "Are you sure you want to remove this team member? They will lose access immediately.";
      
    if (!window.confirm(msg)) return;
    
    try {
      const table = member.isPending ? 'team_invitations' : 'property_team';
      const { error } = await supabase.from(table).delete().eq('id', member.id);
      if (error) throw error;
      setTeamMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Failed to remove member.");
    }
  };
  
  const resendInvite = async (member: TeamMemberRow) => {
    if (!member.isPending) return;
    try {
      // In a real app, you'd fetch the token and re-trigger send-email. 
      // For this implementation, we can just alert or implement the full fetch.
      alert(`Reminder email functionality would send a fresh link to ${member.email}`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Team Access
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">Manage agents, strata, and co-owners across your properties.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Invite Member
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <div>
          {properties.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-outline-variant/30 shadow-sm">
              <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-on-surface mb-2">No Properties Found</h3>
              <p className="text-on-surface-variant">You need to add a property before you can assign team members.</p>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-outline-variant/30 shadow-sm">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-on-surface mb-2">No Team Members Yet</h3>
              <p className="text-on-surface-variant">Invite an agent, strata manager, or co-owner to collaborate.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map(member => {
                const property = properties.find(p => p.id === member.property_id);
                const roleConfig: Record<string, { color: string; bg: string; border: string }> = {
                  Agent:   { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
                  Strata:  { color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
                  Manager: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                };
                const rc = roleConfig[member.role] || { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' };

                const permDefs = [
                  { key: 'can_view_lease',     label: 'View Leases',     blocked: false },
                  { key: 'can_create_lease',   label: 'Create Leases',   blocked: member.role === 'Strata' },
                  { key: 'can_edit_lease',     label: 'Edit Leases',     blocked: member.role === 'Strata' },
                  { key: 'can_manage_tenants', label: 'Manage Tenants',  blocked: member.role === 'Strata' },
                ];

                return (
                  <div key={member.id} className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    {/* Top row: avatar + info + role + property + actions */}
                    <div className="flex items-center gap-4 px-6 py-5">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-base shrink-0 ${member.isPending ? 'bg-amber-50 text-amber-500 border-2 border-amber-200' : 'bg-primary/10 text-primary border-2 border-primary/20'}`}>
                        {(member.first_name || member.email || '?').charAt(0).toUpperCase()}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-on-surface text-sm">
                            {member.isPending
                              ? member.email
                              : (member.first_name || member.last_name)
                                ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                : member.email}
                          </span>
                          {member.status === 'Active'  && <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">Active</span>}
                          {member.status === 'Pending' && <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Pending</span>}
                          {member.status === 'Expired' && <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700">Expired</span>}
                        </div>
                        {!member.isPending && <div className="text-xs text-on-surface-variant mt-0.5 truncate">{member.email}</div>}
                        {property && <div className="text-xs text-on-surface-variant/70 mt-0.5 flex items-center gap-1"><Building className="w-3 h-3" />{property.address}</div>}
                      </div>

                      {/* Role badge */}
                      <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${rc.color} ${rc.bg} ${rc.border}`}>
                        {member.role}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {member.isPending && (
                          <button onClick={() => resendInvite(member)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Resend Invitation">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => removeMember(member)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title={member.isPending ? 'Revoke Invite' : 'Remove Member'}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom row: permissions */}
                    <div className={`flex items-center gap-3 flex-wrap px-6 py-3 bg-surface-container-lowest border-t border-outline-variant/20 ${member.isPending ? 'opacity-40 pointer-events-none' : ''}`}>
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mr-1">Permissions</span>
                      {permDefs.map(({ key, label, blocked }) => {
                        const checked = (member.permissions as any)?.[key] || false;
                        return (
                          <button
                            key={key}
                            disabled={blocked}
                            onClick={() => !blocked && togglePermission(member, key, checked)}
                            title={blocked ? `${member.role}s cannot have this permission` : (checked ? `Revoke: ${label}` : `Grant: ${label}`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              blocked
                                ? 'opacity-25 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                                : checked
                                  ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                                  : 'bg-white border-outline-variant/50 text-slate-400 hover:border-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${blocked ? 'bg-slate-300' : checked ? 'bg-primary' : 'bg-slate-300'}`} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {createPortal(
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-outline-variant/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
                  <h3 className="font-black text-lg text-on-surface flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" /> Grant Access
                  </h3>
                  <button onClick={() => setShowInviteModal(false)} className="text-on-surface-variant hover:text-on-surface"><Plus className="w-6 h-6 rotate-45" /></button>
                </div>
                <div className="p-6">
                  {inviteError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>{inviteError}</p>
                    </div>
                  )}
                  {inviteSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl text-sm font-semibold flex gap-3 items-start">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p>{inviteSuccess}</p>
                    </div>
                  )}

                  <form onSubmit={handleInvite} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Select Property</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsPropertyDropdownOpen(!isPropertyDropdownOpen)}
                          className={`w-full flex items-center justify-between bg-surface-container-low border rounded-2xl px-4 py-3.5 text-on-surface font-bold transition-all outline-none ${isPropertyDropdownOpen ? 'border-primary ring-2 ring-primary' : 'border-outline-variant/50'}`}
                        >
                          <span>
                            {selectedPropertyId 
                              ? properties.find(p => p.id === selectedPropertyId)?.address 
                              : '-- Choose a property --'}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${isPropertyDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isPropertyDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-10 w-full mt-2 bg-surface-container-low border border-outline-variant/50 rounded-2xl shadow-xl overflow-hidden py-2"
                            >
                              <div 
                                className="px-4 py-2.5 hover:bg-white cursor-pointer transition-colors text-on-surface font-bold text-sm"
                                onClick={() => {
                                  setSelectedPropertyId('');
                                  setIsPropertyDropdownOpen(false);
                                }}
                              >
                                -- Choose a property --
                              </div>
                              {properties.map(p => (
                                <div 
                                  key={p.id}
                                  className={`px-4 py-2.5 cursor-pointer transition-colors text-sm font-bold ${selectedPropertyId === p.id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-white'}`}
                                  onClick={() => {
                                    setSelectedPropertyId(p.id);
                                    setIsPropertyDropdownOpen(false);
                                  }}
                                >
                                  {p.address}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Member Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                        <input 
                          type="email" 
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="agent@agency.com"
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-on-surface font-bold focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Assign Role</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['Agent', 'Strata', 'Manager'].map(role => (
                          <label key={role} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${inviteRole === role ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-outline-variant/50 hover:border-outline-variant/80 text-on-surface-variant font-medium'}`}>
                            <input type="radio" name="role" value={role} checked={inviteRole === role} onChange={() => setInviteRole(role)} className="hidden" />
                            <div className="text-sm">{role}</div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={inviting || !!inviteSuccess}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {inviting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send Invitation'}
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
      </div>
    </DashboardLayout>
  );
}
