-- =============================================
-- SHARED_MEETINGS TABLE
-- Tracks meeting sharing relationships between users
-- =============================================
CREATE TABLE IF NOT EXISTS shared_meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_by_name TEXT NOT NULL,
  shared_by_email TEXT,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'comment')),
  viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- Prevent duplicate shares
  UNIQUE(meeting_id, shared_with_id)
);

-- Enable Row Level Security
ALTER TABLE shared_meetings ENABLE ROW LEVEL SECURITY;

-- Recipients can view their shared items
CREATE POLICY "Recipients can view shared meetings"
  ON shared_meetings FOR SELECT
  USING (auth.uid() = shared_with_id);

-- Owners can view shares they created
CREATE POLICY "Owners can view their shares"
  ON shared_meetings FOR SELECT
  USING (auth.uid() = owner_id);

-- Owners can create shares
CREATE POLICY "Owners can share meetings"
  ON shared_meetings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can delete shares
CREATE POLICY "Owners can remove shares"
  ON shared_meetings FOR DELETE
  USING (auth.uid() = owner_id);

-- Recipients can update (e.g., mark as viewed)
CREATE POLICY "Recipients can update shared meetings"
  ON shared_meetings FOR UPDATE
  USING (auth.uid() = shared_with_id);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS shared_meetings_shared_with_idx ON shared_meetings(shared_with_id);
CREATE INDEX IF NOT EXISTS shared_meetings_owner_idx ON shared_meetings(owner_id);
CREATE INDEX IF NOT EXISTS shared_meetings_meeting_idx ON shared_meetings(meeting_id);

-- Also allow recipients to read the actual meeting data
CREATE POLICY "Recipients can view shared meeting data"
  ON meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_meetings 
      WHERE shared_meetings.meeting_id = meetings.id 
      AND shared_meetings.shared_with_id = auth.uid()
    )
  );
