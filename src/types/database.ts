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
  tenantStatus?: string;
}
