-- Add order_code column to topups table for PayOS webhook matching
ALTER TABLE topups 
ADD COLUMN IF NOT EXISTS order_code INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_topups_order_code ON topups(order_code);

-- Add comment
COMMENT ON COLUMN topups.order_code IS 'PayOS order code for webhook matching';

