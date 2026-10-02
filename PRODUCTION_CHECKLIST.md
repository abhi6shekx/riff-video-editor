# RIFF Platform — Production Readiness Checklist (Step 32)

| Status | Verification Item | Production Requirement | Audit Status |
| :---: | :--- | :--- | :--- |
| ✅ | **Environment Variables Configured** | Separated by environment; documented in `.env.example` | Verified |
| ✅ | **Secrets Server-Side Only** | No secrets in client bundles; strictly server-only modules | Verified |
| ✅ | **Production Database Configured** | Serverless pooled Neon PostgreSQL configured | Verified |
| ✅ | **Migrations Applied** | 7 forward-only, non-destructive migrations applied sequentially | Verified |
| ✅ | **HTTPS Enabled** | Canonical `APP_URL` enforces HTTPS in production; callbacks secure | Verified |
| ✅ | **Authentication Callbacks Correct** | Dynamic origin resolution via `x-forwarded-host`/protocol | Verified |
| ✅ | **CORS Restricted** | No wildcard `*` on private APIs; same-origin TanStack Start | Verified |
| ✅ | **Cookies Secure** | `HttpOnly`, `SameSite: Lax`, and `Secure` in production | Verified |
| ✅ | **Security Headers Active** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy`, `HSTS` | Verified |
| ✅ | **Rate Limiting Active** | Server-side rolling 24h withdrawal velocity, points caps, submission velocity | Verified |
| ✅ | **Storage Configured** | Upload size constraints and supported MIME filters | Verified |
| ✅ | **Payment Webhooks Verified** | Signature verification and idempotency locks required on financial webhooks | Verified |
| ✅ | **Wallet Protections Active** | Negative points check constraints, concurrency locks on pending payouts | Verified |
| ✅ | **Audit Logging Active** | Immutable audit logs trigger preventing UPDATE/DELETE mutations | Verified |
| ✅ | **Error Handling Safe** | Redacted error diagnostics in production; traceable `errorId` returned | Verified |
| ✅ | **Health Check Works** | `/api/health` and `/api/ready` endpoints return non-leaking status | Verified |
| ✅ | **Build Succeeds** | `npm run build` succeeds (client, SSR, and Nitro Vercel output) | Verified |
| ✅ | **Typecheck Succeeds** | `npm run typecheck` passes with 0 TypeScript errors | Verified |
| ✅ | **Tests Pass** | Security audit test suite (8/8) and production smoke tests pass | Verified |
| ✅ | **No Obvious Secrets Committed** | Repository scanned; `.gitignore` prevents secret files from Git | Verified |
| ✅ | **No Localhost Production URLs** | URLs validated dynamically via `getAppUrl()` with HTTPS enforcement | Verified |
| ✅ | **Preview Environment Isolated** | `isWorkspacePreview()` cleanly separates sandbox dev/preview from live prod | Verified |
| ✅ | **Backup Strategy Documented** | Neon PITR and scheduled logical backups documented in `DATABASE_OPERATIONS.md` | Verified |
