-- 1. Condition Reports main table
CREATE TABLE IF NOT EXISTS condition_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Move In', 'Routine', 'Move Out', 'Custom')),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed')),
  notes TEXT,
  signature_manager TEXT, -- Base64 encoded or Storage URL
  signature_tenant TEXT,  -- Base64 encoded or Storage URL
  signature_landlord TEXT, -- Base64 encoded or Storage URL
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Inspection Rooms table
CREATE TABLE IF NOT EXISTS inspection_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES condition_reports(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL, -- e.g. "Bedroom 1", "Living Room"
  status VARCHAR(50) DEFAULT 'Incomplete' CHECK (status IN ('Incomplete', 'Completed')),
  room_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Inspection Items table
CREATE TABLE IF NOT EXISTS inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES inspection_rooms(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL, -- e.g. "Walls", "Ceiling", "Floor", "Doors", "Windows"
  rating VARCHAR(50) CHECK (rating IN ('Excellent', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Not Applicable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Inspection Defects table
CREATE TABLE IF NOT EXISTS inspection_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES inspection_rooms(id) ON DELETE CASCADE NOT NULL,
  item_name VARCHAR(255), -- Optional link to a specific item
  notes TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('Minor', 'Moderate', 'Major', 'Urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Inspection Photos table
CREATE TABLE IF NOT EXISTS inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES inspection_rooms(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for testing (PMs can CRUD everything, Tenants can Read)
DROP POLICY IF EXISTS "Permissive reports" ON condition_reports;
CREATE POLICY "Permissive reports" ON condition_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive rooms" ON inspection_rooms;
CREATE POLICY "Permissive rooms" ON inspection_rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive items" ON inspection_items;
CREATE POLICY "Permissive items" ON inspection_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive defects" ON inspection_defects;
CREATE POLICY "Permissive defects" ON inspection_defects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive photos" ON inspection_photos;
CREATE POLICY "Permissive photos" ON inspection_photos FOR ALL USING (true) WITH CHECK (true);
