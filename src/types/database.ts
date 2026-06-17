export type PropertyCategory = 'Residential' | 'Commercial';

export interface PropertyTeamPermissions {
  can_view_property: boolean;
  can_view_lease: boolean;
  can_create_lease: boolean;
  can_edit_lease: boolean;
  can_manage_tenants: boolean;
  can_renew_lease: boolean;
  can_terminate_lease: boolean;
}

export interface TenantAccessLevel {
  receives_emails: boolean;
  can_login: boolean;
}

export interface UserContextData {
  isLandlordOrTeam: boolean;
  isTenant: boolean;
  isOwner: boolean;         // true if user owns properties directly
  isTeamMember: boolean;    // true if user was invited via team invite
  teamPropertyIds: string[]; // property IDs the user can access via team membership
  tenantStatus?: string;
  permissions?: {
    canViewLease: boolean;
    canCreateLease: boolean;
    canEditLease: boolean;
    canManageTenants: boolean;
  };
}

export interface TeamInvitation {
  id: string;
  property_id: string;
  invited_by: string;
  email: string;
  role: string;
  permissions?: PropertyTeamPermissions;
  token: string;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Expired';
  expires_at: string;
  created_at: string;
  accepted_at?: string;
}
