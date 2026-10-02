import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateProductionEnv } from "../src/lib/env.server.ts";
import { sanitizeLogPayload } from "../src/lib/server/logger.ts";
import { handleServerError } from "../src/lib/server/errors.ts";
import { checkServerHealth } from "../src/lib/server/health.ts";

describe("Step 32: Production Deployment & Environment Hardening", () => {
  it("Environment validation handles development/preview gracefully", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const res = validateProductionEnv();
      assert.equal(res.ok, true);
      assert.equal(res.environment, "development");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("Environment validation catches missing DATABASE_URL in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalGrokId = process.env.GROK_PROJECT_ID;
    const originalDbUrl = process.env.DATABASE_URL;

    process.env.NODE_ENV = "production";
    process.env.GROK_PROJECT_ID = "prod-project-123";
    delete process.env.DATABASE_URL;

    try {
      const res = validateProductionEnv();
      assert.equal(res.ok, false);
      assert.ok(res.errors.some((e) => e.includes("DATABASE_URL is not set")));
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalGrokId !== undefined) process.env.GROK_PROJECT_ID = originalGrokId;
      else delete process.env.GROK_PROJECT_ID;
      if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
      else delete process.env.DATABASE_URL;
    }
  });

  it("Environment validation rejects localhost database URLs in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalGrokId = process.env.GROK_PROJECT_ID;
    const originalDbUrl = process.env.DATABASE_URL;

    process.env.NODE_ENV = "production";
    process.env.GROK_PROJECT_ID = "prod-project-123";
    process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/neondb";

    try {
      const res = validateProductionEnv();
      assert.equal(res.ok, false);
      assert.ok(res.errors.some((e) => e.includes("points to localhost/loopback")));
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalGrokId !== undefined) process.env.GROK_PROJECT_ID = originalGrokId;
      else delete process.env.GROK_PROJECT_ID;
      if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
      else delete process.env.DATABASE_URL;
    }
  });

  it("Logger deeply redacts sensitive fields and connection strings", () => {
    const rawPayload = {
      user: "creator_123",
      password: "SuperSecretPassword!",
      token: "secret_token_abc",
      database_url: "postgres://user:secret@ep-db.neon.tech/main",
      session: {
        cookie: "auth_session=abcdef",
        apiKey: "xai_key_secret",
      },
      safeField: "public-metadata",
    };

    const sanitized = sanitizeLogPayload(rawPayload);

    assert.equal(sanitized.password, "[REDACTED]");
    assert.equal(sanitized.token, "[REDACTED]");
    assert.equal(sanitized.database_url, "[REDACTED]");
    assert.equal(sanitized.session.cookie, "[REDACTED]");
    assert.equal(sanitized.session.apiKey, "[REDACTED]");
    assert.equal(sanitized.safeField, "public-metadata");
    assert.equal(sanitized.user, "creator_123");
  });

  it("Error handler masks internal database queries and stack traces in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalGrokId = process.env.GROK_PROJECT_ID;

    process.env.NODE_ENV = "production";
    process.env.GROK_PROJECT_ID = "prod-project-123";

    try {
      const internalErr = new Error("syntax error at or near 'SELECT * FROM secrets_table WHERE password=' at /var/app/db.ts:45");
      const safeResponse = handleServerError("INTERNAL_QUERY", internalErr);

      assert.ok(!safeResponse.error.includes("secrets_table"));
      assert.ok(!safeResponse.error.includes("SELECT"));
      assert.ok(!safeResponse.error.includes("/var/app/db.ts"));
      assert.ok(safeResponse.error.includes("An unexpected server error occurred"));
      assert.ok(safeResponse.errorId.startsWith("err_"));
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalGrokId !== undefined) process.env.GROK_PROJECT_ID = originalGrokId;
      else delete process.env.GROK_PROJECT_ID;
    }
  });

  it("Health check returns structured diagnostics without leaking secrets", async () => {
    const { ok, data } = await checkServerHealth();
    assert.equal(typeof ok, "boolean");
    assert.ok(["healthy", "degraded", "unhealthy"].includes(data.status));
    assert.equal(typeof data.timestamp, "string");
    assert.equal(typeof data.uptimeSeconds, "number");
    assert.ok(data.checks.database === "connected" || data.checks.database === "fallback" || data.checks.database === "degraded");
    assert.ok(data.checks.configuration === "valid" || data.checks.configuration === "warning" || data.checks.configuration === "invalid");
  });
});
