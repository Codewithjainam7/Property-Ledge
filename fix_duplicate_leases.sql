-- ==========================================
-- FIX DUPLICATE LEASES BUG
-- ==========================================
-- When you added the second tenant, the code accidentally created a 
-- SECOND "Active" lease for the same property, instead of adding them 
-- to the same lease as John Smith.
-- This script merges them into the same lease and deletes the duplicate.

-- 1. Move the new tenant to the original lease
WITH duplicate_leases AS (
    SELECT id, property_id,
           ROW_NUMBER() OVER(PARTITION BY property_id ORDER BY created_at ASC) as rn
    FROM public.leases
    WHERE status = 'Active'
),
primary_leases AS (
    SELECT id as primary_id, property_id FROM duplicate_leases WHERE rn = 1
),
secondary_leases AS (
    SELECT id as secondary_id, property_id FROM duplicate_leases WHERE rn > 1
)
UPDATE public.lease_tenants lt
SET lease_id = p.primary_id,
    is_primary = false,
    rent_share_percentage = 50 -- Adjust both to 50/50
FROM secondary_leases s
JOIN primary_leases p ON p.property_id = s.property_id
WHERE lt.lease_id = s.secondary_id;

-- 2. Adjust John Smith to 50% rent share as well
UPDATE public.lease_tenants
SET rent_share_percentage = 50
WHERE is_primary = true 
  AND lease_id IN (
      SELECT id FROM public.leases 
      WHERE status = 'Active' 
        AND id IN (SELECT lease_id FROM public.lease_tenants GROUP BY lease_id HAVING count(*) > 1)
  );

-- 3. Delete the empty duplicate lease
DELETE FROM public.leases
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER(PARTITION BY property_id ORDER BY created_at ASC) as rn
        FROM public.leases
        WHERE status = 'Active'
    ) t WHERE rn > 1
);
