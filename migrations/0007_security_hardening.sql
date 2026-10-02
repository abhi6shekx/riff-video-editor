-- 0007_security_hardening.sql
-- Step 31: Security + Audit Hardening

-- 1. Ensure riff_points column and non-negative constraint on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS riff_points INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_riff_points_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_riff_points_check CHECK (riff_points >= 0);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Non-negative constraints on creator economy wallets
DO $$
BEGIN
  ALTER TABLE riff_wallets DROP CONSTRAINT IF EXISTS riff_wallets_balance_check;
  ALTER TABLE riff_wallets ADD CONSTRAINT riff_wallets_balance_check CHECK (balance >= 0);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE riff_wallets DROP CONSTRAINT IF EXISTS riff_wallets_pending_balance_check;
  ALTER TABLE riff_wallets ADD CONSTRAINT riff_wallets_pending_balance_check CHECK (pending_balance >= 0);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Strictly positive withdrawal amount constraints
DO $$
BEGIN
  ALTER TABLE riff_withdrawals DROP CONSTRAINT IF EXISTS riff_withdrawals_amount_check;
  ALTER TABLE riff_withdrawals ADD CONSTRAINT riff_withdrawals_amount_check CHECK (amount > 0);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_amount_check;
  ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_amount_check CHECK (amount > 0);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 4. Unique idempotency index for payout operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_riff_withdrawals_idempotency 
ON riff_withdrawals (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 5. Strict budget integrity on briefs/campaigns
DO $$
BEGIN
  ALTER TABLE riff_briefs DROP CONSTRAINT IF EXISTS riff_briefs_budget_check;
  ALTER TABLE riff_briefs ADD CONSTRAINT riff_briefs_budget_check 
    CHECK (total_budget > 0 AND remaining_budget >= 0 AND payout > 0);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6. Immutable Audit Trail (Append-Only Enforcement)
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Policy Violation: audit_logs is append-only and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();
