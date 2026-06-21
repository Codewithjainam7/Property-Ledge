-- Allow team members with can_edit_lease or can_manage_tenants to update properties
DROP POLICY IF EXISTS "Team update access properties" ON public.properties;

CREATE POLICY "Team update access properties" ON public.properties 
FOR UPDATE USING (
  public.has_property_permission(id, 'can_edit_lease') OR 
  public.has_property_permission(id, 'can_manage_tenants')
) WITH CHECK (
  public.has_property_permission(id, 'can_edit_lease') OR 
  public.has_property_permission(id, 'can_manage_tenants')
);
