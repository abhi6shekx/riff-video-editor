-- RIFF Core Schema & Speckit-Style Social Creator & Brand Campaign Platform Migration
-- Includes Production-Grade Payout Transaction Locking, Dual-Phase Withdrawal Escrow,
-- Content Integrity (pHash) & Post-Payout Deletion Locks.

-- PostgreSQL 13+ and PGLite provide gen_random_uuid() natively without extension
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Creators, Brands, Admins)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'brand', 'admin')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  instagram_handle TEXT,
  instagram_verified BOOLEAN NOT NULL DEFAULT FALSE,
  followers_count INT NOT NULL DEFAULT 0,
  following_count INT NOT NULL DEFAULT 0,
  campaigns_completed INT NOT NULL DEFAULT 0,
  total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Follows
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- 3. Brands
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  total_spend NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Communities / Hubs
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  members_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Community Members
CREATE TABLE IF NOT EXISTS community_members (
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

-- 6. Posts (Memes, Images, Videos)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  caption TEXT DEFAULT '',
  top_caption TEXT DEFAULT '',
  bottom_caption TEXT DEFAULT '',
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'meme' CHECK (media_type IN ('meme', 'image', 'video', 'gif')),
  thumbnail_url TEXT,
  phash TEXT,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  shares_count INT NOT NULL DEFAULT 0,
  saves_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  remix_parent_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Post Interactions
CREATE TABLE IF NOT EXISTS post_likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_saves (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Campaigns with Budget Constraints
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_url TEXT,
  objective TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'meme' CHECK (content_type IN ('meme', 'reel', 'ugc')),
  total_budget NUMERIC(12, 2) NOT NULL CHECK (total_budget > 0),
  remaining_budget NUMERIC(12, 2) NOT NULL CHECK (remaining_budget >= 0),
  reward_per_creator NUMERIC(10, 2) NOT NULL CHECK (reward_per_creator > 0),
  per_creator_payout NUMERIC(10, 2) NOT NULL DEFAULT 500.00 CHECK (per_creator_payout > 0),
  maximum_creators INT NOT NULL,
  slots_taken INT NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,
  guidelines_do TEXT[] DEFAULT '{}',
  guidelines_dont TEXT[] DEFAULT '{}',
  mandatory_hashtags TEXT[] DEFAULT '{}',
  mandatory_mentions TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Campaign Submissions (Lifecycle with Anti-Fraud Review)
CREATE TABLE IF NOT EXISTS campaign_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  content_url TEXT NOT NULL,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'paid')),
  review_note TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  phash TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- 10. Wallets & Financial Ledger (Dual-Phase Escrow)
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE RESTRICT,
  available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
  pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
  lifetime_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (lifetime_earnings >= 0),
  total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('campaign_reward', 'withdrawal_hold', 'withdrawal_settled', 'withdrawal_failed_refund', 'admin_adjustment', 'bonus', 'referral')),
  amount NUMERIC(12, 2) NOT NULL,
  reference_id TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS
  idx_wallet_tx_unique_ref
ON wallet_transactions (reference_id);

CREATE INDEX IF NOT EXISTS
  idx_wallet_tx_user_history
ON wallet_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi', 'bank_transfer')),
  payment_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  idempotency_key TEXT UNIQUE,
  gateway_payout_id TEXT,
  failure_reason TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 11. Messaging
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  meme_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  sound_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'submission_approved', 'submission_rejected', 'reward_paid', 'campaign_new', 'message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Reports & Content Moderation
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'submission')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 14. RIFF Server Function Tables & Integrity Constraints
-- ============================================================================

CREATE TABLE IF NOT EXISTS riff_hubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS riff_briefs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT NOT NULL,
  total_budget NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
  remaining_budget NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
  payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'open',
  deadline TIMESTAMPTZ,
  maximum_creators INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE riff_briefs
  ADD COLUMN IF NOT EXISTS total_budget NUMERIC(12, 2) NOT NULL DEFAULT 10000.00;

ALTER TABLE riff_briefs
  ADD COLUMN IF NOT EXISTS remaining_budget NUMERIC(12, 2) NOT NULL DEFAULT 10000.00;

ALTER TABLE riff_briefs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS riff_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hub_id TEXT,
  image_url TEXT NOT NULL,
  top_text TEXT,
  bottom_text TEXT,
  parent_id TEXT,
  phash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE riff_posts
  ADD COLUMN IF NOT EXISTS phash TEXT;

CREATE TABLE IF NOT EXISTS riff_submissions (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  post_id TEXT,
  user_id TEXT NOT NULL,
  content_url TEXT NOT NULL DEFAULT '',
  payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending',
  phash TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE riff_submissions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE riff_submissions
  ADD COLUMN IF NOT EXISTS phash TEXT;

ALTER TABLE riff_submissions
  ALTER COLUMN status SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS
  riff_submissions_one_per_creator
ON riff_submissions (brief_id, user_id);

CREATE TABLE IF NOT EXISTS riff_wallets (
  user_id TEXT PRIMARY KEY,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  lifetime_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE riff_wallets
  ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE riff_wallets
  ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS riff_wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  kind TEXT NOT NULL DEFAULT 'credit',
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS
  riff_wallet_transactions_campaign_unique
ON riff_wallet_transactions (user_id, label)
WHERE kind = 'credit';

ALTER TABLE riff_wallet_transactions
  ADD COLUMN IF NOT EXISTS reference_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS
  riff_wallet_transactions_reference_unique
ON riff_wallet_transactions (reference_id)
WHERE reference_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS riff_withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ============================================================================
-- 15. Post-Payout Deletion Locks (Anti-Sybil / Retention Defense)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_riff_post_deletion_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM riff_submissions
    WHERE post_id = OLD.id
      AND status = 'paid'
      AND reviewed_at > NOW() - INTERVAL '30 days'
  ) THEN
    RAISE EXCEPTION 'Contractual Hold: Posts linked to paid campaign rewards cannot be deleted within 30 days of payout.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_riff_post_deletion_lock ON riff_posts;
CREATE TRIGGER trg_riff_post_deletion_lock
  BEFORE DELETE ON riff_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_riff_post_deletion_lock();

-- ============================================================================
-- 16. Production-Grade Atomic Payout Transaction Stored Function
-- ============================================================================

CREATE OR REPLACE FUNCTION riff_approve_campaign_submission(
  p_submission_id TEXT,
  p_admin_id TEXT,
  p_approve BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_sub RECORD;
  v_campaign RECORD;
  v_payout NUMERIC;
  v_tx_id TEXT;
BEGIN
  -- 1. Lock and validate submission
  SELECT id, brief_id, user_id, payout, status
  INTO v_sub
  FROM riff_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found.';
  END IF;

  IF v_sub.status != 'pending' THEN
    RETURN jsonb_build_object('ok', true, 'status', v_sub.status, 'message', 'Already processed');
  END IF;

  -- Rejection branch
  IF NOT p_approve THEN
    UPDATE riff_submissions
    SET status = 'rejected',
        reviewed_at = NOW()
    WHERE id = p_submission_id;

    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  -- 2. Lock the campaign to guard the remaining budget from concurrent approvals
  SELECT id, remaining_budget, payout, status
  INTO v_campaign
  FROM riff_briefs
  WHERE id = v_sub.brief_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found.';
  END IF;

  v_payout := COALESCE(v_sub.payout, v_campaign.payout, 0);

  IF v_campaign.status != 'open' THEN
    RAISE EXCEPTION 'Campaign is no longer accepting payout approvals.';
  END IF;

  IF v_campaign.remaining_budget < v_payout THEN
    RAISE EXCEPTION 'Campaign budget exhausted. Remaining: %, Required: %', v_campaign.remaining_budget, v_payout;
  END IF;

  -- 3. Deduct campaign balance
  UPDATE riff_briefs
  SET remaining_budget = remaining_budget - v_payout,
      status = CASE WHEN (remaining_budget - v_payout) < v_payout THEN 'completed' ELSE status END,
      updated_at = NOW()
  WHERE id = v_sub.brief_id;

  -- 4. Advance submission state
  UPDATE riff_submissions
  SET status = 'paid',
      reviewed_at = NOW()
  WHERE id = p_submission_id;

  -- 5. Credit user's wallet
  INSERT INTO riff_wallets (user_id, balance, pending_balance, lifetime_earned, updated_at)
  VALUES (v_sub.user_id, v_payout, 0.00, v_payout, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = riff_wallets.balance + v_payout,
      lifetime_earned = riff_wallets.lifetime_earned + v_payout,
      updated_at = NOW();

  -- 6. Insert immutable ledger entry with Idempotency key
  v_tx_id := 'tx_' || gen_random_uuid()::text;
  INSERT INTO riff_wallet_transactions (
    id,
    user_id,
    label,
    amount,
    kind,
    reference_id,
    created_at
  ) VALUES (
    v_tx_id,
    v_sub.user_id,
    'Campaign payout · ' || v_sub.brief_id,
    v_payout,
    'credit',
    'submission:' || p_submission_id,
    NOW()
  ) ON CONFLICT (reference_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'paid',
    'payout', v_payout,
    'submission_id', p_submission_id,
    'campaign_id', v_sub.brief_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 17. Dual-Phase Withdrawal Lifecycle Stored Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION riff_request_withdrawal(
  p_withdrawal_id TEXT,
  p_user_id TEXT,
  p_amount NUMERIC,
  p_method TEXT,
  p_details JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_updated INT;
BEGIN
  IF p_amount < 100 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is 100.';
  END IF;

  -- Atomic Escrow Lock: Deduct available balance and add to pending balance
  UPDATE riff_wallets
  SET balance = balance - p_amount,
      pending_balance = pending_balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND balance >= p_amount;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Insufficient available balance.';
  END IF;

  -- Create withdrawal record in processing state
  INSERT INTO riff_withdrawals (
    id,
    user_id,
    amount,
    payment_method,
    payment_details,
    status,
    idempotency_key,
    created_at
  ) VALUES (
    p_withdrawal_id,
    p_user_id,
    p_amount,
    p_method,
    p_details,
    'processing',
    'withdrawal:' || p_withdrawal_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'withdrawal_id', p_withdrawal_id,
    'status', 'processing',
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION riff_reconcile_withdrawal(
  p_withdrawal_id TEXT,
  p_event TEXT,
  p_reason TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_wth RECORD;
BEGIN
  SELECT id, user_id, amount, payment_method, status
  INTO v_wth
  FROM riff_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal record not found.';
  END IF;

  IF v_wth.status != 'processing' THEN
    RETURN jsonb_build_object('ok', true, 'status', v_wth.status, 'message', 'Already settled');
  END IF;

  IF p_event = 'transfer.processed' THEN
    -- Deduct from pending_balance and complete
    UPDATE riff_wallets
    SET pending_balance = pending_balance - v_wth.amount,
        total_withdrawn = total_withdrawn + v_wth.amount,
        updated_at = NOW()
    WHERE user_id = v_wth.user_id;

    UPDATE riff_withdrawals
    SET status = 'completed',
        processed_at = NOW()
    WHERE id = p_withdrawal_id;

    INSERT INTO riff_wallet_transactions (
      id,
      user_id,
      label,
      amount,
      kind,
      reference_id,
      created_at
    ) VALUES (
      'tx_' || gen_random_uuid()::text,
      v_wth.user_id,
      'Withdrawal processed via ' || UPPER(v_wth.payment_method),
      -v_wth.amount,
      'debit',
      'withdrawal_success:' || p_withdrawal_id,
      NOW()
    ) ON CONFLICT (reference_id) DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'status', 'completed');

  ELSIF p_event = 'transfer.failed' THEN
    -- Refund: Move back from pending_balance to balance
    UPDATE riff_wallets
    SET balance = balance + v_wth.amount,
        pending_balance = pending_balance - v_wth.amount,
        updated_at = NOW()
    WHERE user_id = v_wth.user_id;

    UPDATE riff_withdrawals
    SET status = 'failed',
        admin_note = p_reason,
        processed_at = NOW()
    WHERE id = p_withdrawal_id;

    INSERT INTO riff_wallet_transactions (
      id,
      user_id,
      label,
      amount,
      kind,
      reference_id,
      created_at
    ) VALUES (
      'tx_' || gen_random_uuid()::text,
      v_wth.user_id,
      'Withdrawal failed · Refunded to wallet',
      v_wth.amount,
      'credit',
      'withdrawal_refund:' || p_withdrawal_id,
      NOW()
    ) ON CONFLICT (reference_id) DO NOTHING;

    RETURN jsonb_build_object('ok', true, 'status', 'failed', 'refunded', true);
  ELSE
    RAISE EXCEPTION 'Unknown event: %', p_event;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Initial Seed Data for Riff Hubs & Briefs
INSERT INTO riff_hubs (id, name, slug, description, avatar_url)
VALUES
  ('pavilion', 'Pavilion', 'pavilion', 'Floodlights, last balls, and the cousin who always bowls the death over.', '/memes/cricket.jpg'),
  ('bassline', 'Bassline', 'bassline', 'Booths, bass, and the lie that you would leave at eleven.', '/memes/club.jpg'),
  ('drop', 'Drop', 'drop', 'Original colorways, wet asphalt, and a savings account that never stood a chance.', '/memes/sneaker.jpg'),
  ('late-shift', 'Late Shift', 'late-shift', 'Sticky notes, MIDI, and the quick tweak that ate the night.', '/memes/desk.jpg'),
  ('tandoor', 'Tandoor', 'tandoor', 'Griddles, steam, and the salad day that never survives the stall.', '/memes/food.jpg'),
  ('menagerie', 'Menagerie', 'menagerie', 'Judgmental cats, confused dogs, and the group chat at 2am.', '/memes/cat.jpg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO riff_briefs (id, title, description, brand, total_budget, remaining_budget, payout, status, deadline, maximum_creators)
VALUES
  ('b1', 'Make the teal-bone colorway feel inevitable', 'Nova Drops ships a new pair this Friday. We want riffs that treat the shoe like a character, not a product.', 'Nova Drops', 15000.00, 15000.00, 450.00, 'open', NOW() + INTERVAL '14 days', 50),
  ('b2', 'The death over nobody talks about', 'Pitchside launches the 10-second recap reel for every league match. Best cricket memes take the pool.', 'Pitchside', 18000.00, 18000.00, 600.00, 'open', NOW() + INTERVAL '7 days', 30),
  ('b3', 'Club food is not a joke', 'Street-eats special with Tandoor nights. Share your 3am roadside feast moments.', 'Tandoor Nights', 10000.00, 10000.00, 350.00, 'open', NOW() + INTERVAL '21 days', 40)
ON CONFLICT (id) DO NOTHING;
