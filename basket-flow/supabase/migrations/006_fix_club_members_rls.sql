-- Fix infinite recursion in club_members RLS policy.
-- The old policy on club_members queried club_members itself, causing recursion.
-- Solution: SECURITY DEFINER helper that bypasses RLS for membership checks.

-- Helper function that bypasses RLS to check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(_club_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = _club_id AND cm.user_id = _user_id);
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view club members" ON public.club_members;

-- Recreate using the helper function (no recursion because the function bypasses RLS)
CREATE POLICY "Members can view club members"
  ON public.club_members FOR SELECT
  USING (public.is_club_member(club_id, auth.uid()) OR user_id = auth.uid());
