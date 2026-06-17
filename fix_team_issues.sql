-- 1. Drop existing foreign key constraint if it exists to prevent errors
ALTER TABLE public.property_team
DROP CONSTRAINT IF EXISTS property_team_user_profiles_fkey;

-- 2. Add foreign key constraint to link property_team with user_profiles
ALTER TABLE public.property_team
ADD CONSTRAINT property_team_user_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 3. Drop existing Team view self policy to avoid duplicates
DROP POLICY IF EXISTS "Team view self" ON public.property_team;

-- 4. Create SELECT policy for team members to read their own memberships
CREATE POLICY "Team view self" ON public.property_team
FOR SELECT USING (user_id = auth.uid());
