-- DROP PERMISSIVE TESTING POLICIES
DROP POLICY IF EXISTS "Permissive reports" ON condition_reports;
DROP POLICY IF EXISTS "Permissive rooms" ON inspection_rooms;
DROP POLICY IF EXISTS "Permissive items" ON inspection_items;
DROP POLICY IF EXISTS "Permissive defects" ON inspection_defects;
DROP POLICY IF EXISTS "Permissive photos" ON inspection_photos;

-- 1. Condition Reports
CREATE POLICY "Access condition reports" ON condition_reports USING (
  EXISTS (SELECT 1 FROM properties p WHERE p.id = condition_reports.property_id AND p.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM property_team pt WHERE pt.property_id = condition_reports.property_id AND pt.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM leases l JOIN lease_tenants lt ON l.id = lt.lease_id JOIN tenants t ON lt.tenant_id = t.id WHERE l.id = condition_reports.lease_id AND t.email = auth.jwt()->>'email')
);

-- 2. Rooms
CREATE POLICY "Access inspection rooms" ON inspection_rooms USING (
  EXISTS (SELECT 1 FROM condition_reports cr WHERE cr.id = inspection_rooms.report_id AND (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = cr.property_id AND p.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM property_team pt WHERE pt.property_id = cr.property_id AND pt.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM leases l JOIN lease_tenants lt ON l.id = lt.lease_id JOIN tenants t ON lt.tenant_id = t.id WHERE l.id = cr.lease_id AND t.email = auth.jwt()->>'email')
  ))
);

-- 3. Items
CREATE POLICY "Access inspection items" ON inspection_items USING (
  EXISTS (SELECT 1 FROM inspection_rooms ir JOIN condition_reports cr ON ir.report_id = cr.id WHERE ir.id = inspection_items.room_id AND (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = cr.property_id AND p.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM property_team pt WHERE pt.property_id = cr.property_id AND pt.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM leases l JOIN lease_tenants lt ON l.id = lt.lease_id JOIN tenants t ON lt.tenant_id = t.id WHERE l.id = cr.lease_id AND t.email = auth.jwt()->>'email')
  ))
);

-- 4. Defects
CREATE POLICY "Access inspection defects" ON inspection_defects USING (
  EXISTS (SELECT 1 FROM inspection_rooms ir JOIN condition_reports cr ON ir.report_id = cr.id WHERE ir.id = inspection_defects.room_id AND (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = cr.property_id AND p.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM property_team pt WHERE pt.property_id = cr.property_id AND pt.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM leases l JOIN lease_tenants lt ON l.id = lt.lease_id JOIN tenants t ON lt.tenant_id = t.id WHERE l.id = cr.lease_id AND t.email = auth.jwt()->>'email')
  ))
);

-- 5. Photos
CREATE POLICY "Access inspection photos" ON inspection_photos USING (
  EXISTS (SELECT 1 FROM inspection_rooms ir JOIN condition_reports cr ON ir.report_id = cr.id WHERE ir.id = inspection_photos.room_id AND (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = cr.property_id AND p.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM property_team pt WHERE pt.property_id = cr.property_id AND pt.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM leases l JOIN lease_tenants lt ON l.id = lt.lease_id JOIN tenants t ON lt.tenant_id = t.id WHERE l.id = cr.lease_id AND t.email = auth.jwt()->>'email')
  ))
);
