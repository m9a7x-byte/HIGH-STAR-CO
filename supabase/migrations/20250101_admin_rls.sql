-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow Admins to see all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'ADMIN'
  )
);

-- Allow Admins to update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'ADMIN'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'ADMIN'
  )
);

-- Allow Admins to insert profiles
CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'ADMIN'
  )
);

-- Allow Admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'ADMIN'
  )
);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);
