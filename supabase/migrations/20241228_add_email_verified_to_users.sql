-- Add email_verified column to users table if it doesn't exist
-- This field tracks whether the user has verified their email address

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
    
    -- Add comment for documentation
    COMMENT ON COLUMN users.email_verified IS 'Indicates whether the user has verified their email address';
  END IF;
END $$;

-- Update email_verified to true for existing users with confirmed emails
-- This assumes that existing users have confirmed their emails
UPDATE users 
SET email_verified = true 
WHERE email_verified = false;

