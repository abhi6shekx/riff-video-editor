-- ============================================================================
-- 0003_governance_and_categories.sql
-- RIFF Multi-Tier Governance, Category Economy, Creator Levels & Audit Trail
-- ============================================================================

-- 1. Admin & Moderator Permissions
CREATE TABLE IF NOT EXISTS admin_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL, -- 'campaign.manage', 'submission.review', 'withdrawal.review', 'wallet.view', 'moderation.manage', 'category.manage', 'audit.view'
  granted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL, -- emoji or lucide icon name
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Category Dynamic Earning Rules
CREATE TABLE IF NOT EXISTS category_earning_rules (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'meme' CHECK (content_type IN ('meme', 'reel', 'ugc')),
  base_reward NUMERIC(10, 2) NOT NULL DEFAULT 25.00 CHECK (base_reward >= 0),
  bonus_per_1000_views NUMERIC(10, 2) NOT NULL DEFAULT 10.00 CHECK (bonus_per_1000_views >= 0),
  bonus_per_100_likes NUMERIC(10, 2) NOT NULL DEFAULT 5.00 CHECK (bonus_per_100_likes >= 0),
  max_reward NUMERIC(10, 2) NOT NULL DEFAULT 250.00 CHECK (max_reward >= base_reward),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, content_type)
);

-- 4. Submission Appeals Table
CREATE TABLE IF NOT EXISTS submission_appeals (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_submission_appeals_status ON submission_appeals(status);

-- 5. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL, -- 'owner', 'admin', 'moderator', 'system'
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'wallet', 'earning_rule', 'permission', 'campaign', 'submission', 'user'
  target_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);

-- 6. Add Creator Progression & Governance columns to existing tables
ALTER TABLE riff_wallets
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE riff_briefs
  ADD COLUMN IF NOT EXISTS campaign_type TEXT NOT NULL DEFAULT 'fixed_reward',
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS min_creator_tier TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS prize_first NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS prize_second NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS prize_third NUMERIC(12, 2);

-- 7. Seed Initial Categories
INSERT INTO categories (id, name, slug, description, icon, status, sort_order)
VALUES
  ('cat_relatable', 'Relatable', 'relatable', 'Everyday funny relatable struggles & thoughts', '😂', 'active', 1),
  ('cat_dark', 'Dark Humor', 'dark-humor', 'Witty, cynical & edge-of-the-seat punchlines', '💀', 'active', 2),
  ('cat_gaming', 'Gaming', 'gaming', 'Esports, clutch plays & gamer chat moments', '🎮', 'active', 3),
  ('cat_sports', 'Sports & Cricket', 'sports', 'IPL, last-ball thrillers & gully cricket riffs', '🏏', 'active', 4),
  ('cat_tech', 'Tech & Code', 'tech', 'Bugs in prod, AI taking jobs & 3am debugging', '💻', 'active', 5),
  ('cat_genz', 'Gen-Z & Pop', 'gen-z', 'Slang, trends, aesthetics & fast internet culture', '📱', 'active', 6),
  ('cat_india', 'Desi & Bollywood', 'desi', 'Indian cinema, family dinners & tapri chai', '🌍', 'active', 7),
  ('cat_corp', 'Corporate 9-to-5', 'corporate', 'Quick 5-min syncs, appraisal season & Monday blues', '🏢', 'active', 8),
  ('cat_trending', 'Trending Now', 'trending', 'Viral templates & breaking internet moments', '🔥', 'active', 9),
  ('cat_creative', 'Creative & Art', 'creative', 'High-effort designs, surrealism & remixes', '🎨', 'active', 10)
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Default Category Earning Rules
INSERT INTO category_earning_rules (id, category_id, content_type, base_reward, bonus_per_1000_views, bonus_per_100_likes, max_reward, active)
VALUES
  ('er_relatable', 'cat_relatable', 'meme', 20.00, 8.00, 4.00, 150.00, TRUE),
  ('er_dark', 'cat_dark', 'meme', 25.00, 10.00, 5.00, 180.00, TRUE),
  ('er_gaming', 'cat_gaming', 'meme', 30.00, 12.00, 6.00, 200.00, TRUE),
  ('er_sports', 'cat_sports', 'meme', 25.00, 10.00, 5.00, 180.00, TRUE),
  ('er_tech', 'cat_tech', 'meme', 40.00, 15.00, 8.00, 250.00, TRUE),
  ('er_genz', 'cat_genz', 'meme', 20.00, 8.00, 4.00, 150.00, TRUE),
  ('er_india', 'cat_india', 'meme', 25.00, 10.00, 5.00, 180.00, TRUE),
  ('er_corp', 'cat_corp', 'meme', 30.00, 12.00, 6.00, 200.00, TRUE),
  ('er_trending', 'cat_trending', 'meme', 35.00, 15.00, 8.00, 220.00, TRUE),
  ('er_creative', 'cat_creative', 'meme', 50.00, 20.00, 10.00, 300.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Default Admin Permissions for dev-user (Owner Superuser)
INSERT INTO admin_permissions (id, user_id, permission, granted_by)
VALUES
  ('perm_dev_1', 'dev-user', 'campaign.manage', 'system'),
  ('perm_dev_2', 'dev-user', 'submission.review', 'system'),
  ('perm_dev_3', 'dev-user', 'withdrawal.review', 'system'),
  ('perm_dev_4', 'dev-user', 'wallet.view', 'system'),
  ('perm_dev_5', 'dev-user', 'moderation.manage', 'system'),
  ('perm_dev_6', 'dev-user', 'category.manage', 'system'),
  ('perm_dev_7', 'dev-user', 'audit.view', 'system')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Initial Audit Log Record
INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, old_value, new_value, reason)
VALUES (
  'audit_init_001',
  'system',
  'system',
  'system.init_governance',
  'system',
  'riff_core',
  NULL,
  'governance_and_categories_initialized',
  'Initial bootstrap of RIFF Multi-Tier Governance, Category Economy, and Audit System'
)
ON CONFLICT (id) DO NOTHING;
