-- 0005_global_category_controls.sql
-- Step 29: Global Content & Category Controls

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS allowed_types TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS approval_points INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Expand status check constraint to support 'archived'
DO $$
BEGIN
  ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_status_check;
  ALTER TABLE categories ADD CONSTRAINT categories_status_check CHECK (status IN ('active', 'inactive', 'archived'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Enforce allowed_types constraint
DO $$
BEGIN
  ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_allowed_types_check;
  ALTER TABLE categories ADD CONSTRAINT categories_allowed_types_check CHECK (allowed_types IN ('all', 'post', 'reel'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Mark first category as default if none is set
UPDATE categories
SET is_default = TRUE
WHERE id = (SELECT id FROM categories ORDER BY sort_order ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM categories WHERE is_default = TRUE);
