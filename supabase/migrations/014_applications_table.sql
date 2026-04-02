-- 014_applications_table.sql
-- Phase 46: Track Quick Apply submissions per user + profile

CREATE TABLE applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id text NOT NULL,
  listing_address text,
  listing_type text,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, profile_id, listing_id)
);

CREATE INDEX idx_applications_user_profile ON applications (user_id, profile_id);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
