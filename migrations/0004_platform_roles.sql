-- ============================================================================
-- 0004_platform_roles.sql
-- Expand profiles role constraint to include multi-tier platform governance roles
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('creator', 'brand', 'moderator', 'admin', 'super_admin', 'owner'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warnings_count INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
