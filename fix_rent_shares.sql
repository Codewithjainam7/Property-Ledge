-- Run this script in your Supabase SQL Editor to recalculate and fix existing rent shares
WITH tenant_counts AS (
  SELECT lease_id, COUNT(*) as cnt
  FROM lease_tenants
  GROUP BY lease_id
),
new_shares AS (
  SELECT 
    lt.lease_id,
    lt.tenant_id,
    FLOOR(100.0 / tc.cnt) as base_share,
    ROW_NUMBER() OVER(PARTITION BY lt.lease_id ORDER BY lt.tenant_id) as rn,
    tc.cnt
  FROM lease_tenants lt
  JOIN tenant_counts tc ON lt.lease_id = tc.lease_id
)
UPDATE lease_tenants
SET rent_share_percentage = 
  CASE 
    WHEN ns.rn = ns.cnt THEN 100 - (ns.base_share * (ns.cnt - 1))
    ELSE ns.base_share
  END
FROM new_shares ns
WHERE lease_tenants.lease_id = ns.lease_id AND lease_tenants.tenant_id = ns.tenant_id;
