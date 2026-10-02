# RIFF Platform — Production Database & Operational Runbook

## 1. Production Architecture Overview
- **Engine**: PostgreSQL 16+ (Managed via Neon serverless PostgreSQL).
- **Driver**: Node-postgres (`pg`) with connection pooling enabled.
- **Development/Preview Fallback**: In-memory PGLite (WASM) applied automatically when `DATABASE_URL` is omitted.
- **Migration Engine**: `scripts/migrate.mjs` applying sequentially numbered transaction-safe migrations (`migrations/*.sql`) tracked in the `_migrations` table.

---

## 2. Backup Strategy
Neon PostgreSQL provides continuous write-ahead logging (WAL) and point-in-time recovery (PITR):
1. **Point-in-Time Recovery (PITR)**:
   - Neon maintains continuous branching and WAL history up to 30 days.
   - Instant state restoration to any microsecond without data transfer.
2. **Scheduled Logical Backups (`pg_dump`)**:
   - Automated daily logical backups executed via CI/CD scheduled job:
     ```bash
     pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "riff_backup_$(date +%Y%m%d_%H%M%S).dump"
     ```
   - Encrypted and shipped to secure, immutable object storage (AWS S3 Glacier or GCS Archive).

---

## 3. Restore Strategy
1. **PITR Recovery via Neon Console / CLI**:
   ```bash
   neon branches create --from-branch main --name restore-point --time "2026-09-27T18:00:00Z"
   ```
2. **Logical Dump Restoration**:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" latest.dump
   ```

---

## 4. Migration Rollback & Safety Policy
- **Zero-Downtime Rule**: Migrations must always be **additive and backward-compatible**.
- **No Destructive Commands**:
  - `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, and `TRUNCATE` are strictly forbidden in production migration files.
  - Column deprecations must follow the expand-contract pattern:
    1. Phase 1: Add new column / nullable constraint.
    2. Phase 2: Dual-write or migrate background data.
    3. Phase 3: Switch application reads/writes.
    4. Phase 4: Clean up deprecated column after all instances are upgraded.
- **Rollback Procedure**:
  - Because `_migrations` records executed files sequentially, never manually delete migration rows.
  - Write a new sequential forward migration (e.g. `0008_revert_*.sql`) that adjusts constraints or schema backward without dropping data.

---

## 5. Media & Asset Storage Recovery
- **Destination**: Supabase Storage / AWS S3 buckets.
- **Object Versioning**: Enabled on all media buckets (`memes/`, `reels/`, `avatars/`).
- **Soft-Delete Lifecycle**: Content marked as deleted retains underlying blobs for 30 days before permanent purging.

---

## 6. Audit Log Immutability & Archival
- Audit logs are protected by database trigger `trg_prevent_audit_log_mutation` (`migrations/0007_security_hardening.sql`), which immediately aborts any `UPDATE` or `DELETE` statement.
- **Compliance Export**:
  - Read-only export queries (`SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'`) archive historical logs into WORM (Write Once, Read Many) cold storage for compliance.
