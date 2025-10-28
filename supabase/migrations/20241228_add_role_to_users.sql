-- Add role column to users table
-- This field tracks whether the user is a regular user or admin

-- Create enum type for role
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- Add comment for documentation
COMMENT ON COLUMN users.role IS 'User role: user (regular user) or admin (administrator)';

-- Create index for faster role-based queries
CREATE INDEX idx_users_role ON users(role);

-- Optionally, set first user as admin (uncomment if needed)
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

