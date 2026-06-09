-- Drop the existing constraint
ALTER TABLE public.property_enquiries
DROP CONSTRAINT IF EXISTS property_enquiries_status_check;

-- Add the new constraint that includes 'Invited'
ALTER TABLE public.property_enquiries
ADD CONSTRAINT property_enquiries_status_check 
CHECK (status IN ('Pending', 'Reviewed', 'Invited', 'Accepted', 'Rejected'));
