-- 0006_system_configuration.sql
-- Step 30: System Configuration

CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints
DO $$
BEGIN
  ALTER TABLE system_config DROP CONSTRAINT IF EXISTS system_config_value_type_check;
  ALTER TABLE system_config ADD CONSTRAINT system_config_value_type_check 
    CHECK (value_type IN ('boolean', 'integer', 'decimal', 'string', 'json'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE system_config DROP CONSTRAINT IF EXISTS system_config_category_check;
  ALTER TABLE system_config ADD CONSTRAINT system_config_category_check 
    CHECK (category IN ('platform', 'content', 'moderation', 'economy', 'notifications', 'security'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_is_public ON system_config(is_public);

-- Default Values (ON CONFLICT DO NOTHING preserves any existing modifications)
INSERT INTO system_config (id, key, value, value_type, category, description, is_public, updated_by)
VALUES
  -- A. Platform
  ('cfg_maintenance_mode', 'maintenance_mode', 'false', 'boolean', 'platform', 'When enabled, normal users see a maintenance screen and non-administrative API mutations are paused. Staff retain bypass access.', TRUE, 'system'),
  ('cfg_new_registrations_enabled', 'new_registrations_enabled', 'true', 'boolean', 'platform', 'Controls whether new creator and visitor account registrations are accepted.', TRUE, 'system'),
  ('cfg_platform_enabled', 'platform_enabled', 'true', 'boolean', 'platform', 'Master platform availability toggle for creator feed, reels studio, and social actions.', TRUE, 'system'),

  -- B. Content
  ('cfg_max_upload_size_mb', 'max_upload_size_mb', '100', 'integer', 'content', 'Maximum allowed media file size in megabytes (MB) for uploads.', TRUE, 'system'),
  ('cfg_max_reel_duration_seconds', 'max_reel_duration_seconds', '180', 'integer', 'content', 'Maximum duration in seconds allowed for Reel Studio exports.', TRUE, 'system'),
  ('cfg_max_post_images', 'max_post_images', '10', 'integer', 'content', 'Maximum number of images allowed per post or carousel.', TRUE, 'system'),
  ('cfg_max_caption_length', 'max_caption_length', '2200', 'integer', 'content', 'Maximum character limit for captions across memes and reels.', TRUE, 'system'),
  ('cfg_allowed_media_types', 'allowed_media_types', '["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]', 'json', 'content', 'Whitelist of permitted MIME media types for media upload.', TRUE, 'system'),

  -- C. Moderation
  ('cfg_default_submission_status', 'default_submission_status', 'pending', 'string', 'moderation', 'Initial moderation review status for new submissions (pending or approved).', FALSE, 'system'),
  ('cfg_auto_review_enabled', 'auto_review_enabled', 'false', 'boolean', 'moderation', 'Automatically review and score submissions with perceptual hashing and text safety.', FALSE, 'system'),
  ('cfg_auto_review_threshold', 'auto_review_threshold', '0.85', 'decimal', 'moderation', 'Confidence threshold (0.0 to 1.0) required for AI auto-approval.', FALSE, 'system'),
  ('cfg_report_threshold', 'report_threshold', '5', 'integer', 'moderation', 'Number of community reports before content is elevated to high-priority review queue.', FALSE, 'system'),
  ('cfg_auto_hide_report_threshold', 'auto_hide_report_threshold', '10', 'integer', 'moderation', 'Number of unique user reports that triggers automatic temporary content hiding pending review.', FALSE, 'system'),

  -- D. Creator Economy
  ('cfg_riff_points_enabled', 'riff_points_enabled', 'true', 'boolean', 'economy', 'Global toggle for RIFF Points reward distributions and points balances.', TRUE, 'system'),
  ('cfg_points_per_approved_post', 'points_per_approved_post', '10', 'integer', 'economy', 'Default RIFF points awarded when a meme post is approved (if category has no custom points).', TRUE, 'system'),
  ('cfg_points_per_approved_reel', 'points_per_approved_reel', '25', 'integer', 'economy', 'Default RIFF points awarded when a reel is approved (if category has no custom points).', TRUE, 'system'),
  ('cfg_minimum_withdrawal_points', 'minimum_withdrawal_points', '1000', 'integer', 'economy', 'Minimum RIFF Points balance required to request a payout.', TRUE, 'system'),
  ('cfg_maximum_withdrawal_points', 'maximum_withdrawal_points', '100000', 'integer', 'economy', 'Maximum RIFF Points that can be requested in a single payout transaction.', TRUE, 'system'),
  ('cfg_daily_withdrawal_limit', 'daily_withdrawal_limit', '100000', 'integer', 'economy', 'Maximum cumulative RIFF Points a creator can withdraw within a rolling 24-hour window.', TRUE, 'system'),
  ('cfg_creator_reward_enabled', 'creator_reward_enabled', 'true', 'boolean', 'economy', 'Global switch allowing creators to convert points into monetary payout requests.', TRUE, 'system'),

  -- E. Notifications
  ('cfg_push_notifications_enabled', 'push_notifications_enabled', 'true', 'boolean', 'notifications', 'Enables web push and browser notification delivery.', FALSE, 'system'),
  ('cfg_email_notifications_enabled', 'email_notifications_enabled', 'true', 'boolean', 'notifications', 'Enables transactional and contest alert email dispatches.', FALSE, 'system'),
  ('cfg_notification_batching_enabled', 'notification_batching_enabled', 'true', 'boolean', 'notifications', 'Batches high-frequency social notifications into digest summaries.', FALSE, 'system'),

  -- F. Security
  ('cfg_session_duration_hours', 'session_duration_hours', '168', 'integer', 'security', 'Active user session duration in hours before re-authentication is required.', FALSE, 'system'),
  ('cfg_login_rate_limit', 'login_rate_limit', '10', 'integer', 'security', 'Maximum login attempts per IP/handle per 15-minute window before throttling.', FALSE, 'system'),
  ('cfg_otp_rate_limit', 'otp_rate_limit', '5', 'integer', 'security', 'Maximum OTP verification attempts per phone/email per 10-minute window.', FALSE, 'system'),
  ('cfg_password_attempt_limit', 'password_attempt_limit', '5', 'integer', 'security', 'Maximum failed password attempts before account lock.', FALSE, 'system'),
  ('cfg_suspicious_login_detection_enabled', 'suspicious_login_detection_enabled', 'true', 'boolean', 'security', 'Flag and challenge logins from new IP addresses or uncommon geo-locations.', FALSE, 'system')
ON CONFLICT (key) DO NOTHING;
