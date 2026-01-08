-- Add current_session_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_session_id UUID;

-- Optional: Create an index for faster lookups if needed (though lookups are usually by ID)
-- CREATE INDEX IF NOT EXISTS idx_profiles_session_id ON profiles(current_session_id);
