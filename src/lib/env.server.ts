/**
 * Centralized Server-Side Environment Validation Layer.
 *
 * Enforces strict environment separation between:
 * - Development (local developer environment)
 * - Preview / Staging (sandbox preview or branch deployments)
 * - Production (live deployment serving end users)
 *
 * Rules:
 * 1. Server-only: this module must never be imported in browser/client code.
 * 2. Fail-fast in production: missing required configuration throws on boot.
 * 3. Safe in dev/preview: graceful defaults (e.g. PGLite fallback) are preserved.
 * 4. Never leak credentials or raw connection strings in logs or exceptions.
 */

export type AppEnvironment = "development" | "preview" | "production" | "test";

export function env(key: string, defaultValue?: string): string | undefined {
  if (typeof process === "undefined" || !process.env) {
    return defaultValue;
  }
  const v = process.env[key]?.trim();
  return v ? v : defaultValue;
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}

export function getAppEnvironment(): AppEnvironment {
  const nodeEnv = env("NODE_ENV")?.toLowerCase();
  if (nodeEnv === "test") return "test";
  if (isWorkspacePreview()) {
    return "development";
  }
  if (nodeEnv === "production") {
    // Vercel preview environments set VERCEL_ENV="preview"
    if (env("VERCEL_ENV") === "preview") {
      return "preview";
    }
    return "production";
  }
  return "development";
}

export function isProduction(): boolean {
  return getAppEnvironment() === "production";
}

export function isDevelopment(): boolean {
  return getAppEnvironment() === "development";
}

/**
 * Canonical Application Base URL.
 * Guarantees HTTPS protocol in production environments.
 */
export function getAppUrl(): string {
  const customUrl = env("APP_URL");
  if (customUrl) {
    if (isProduction() && customUrl.startsWith("http://")) {
      return customUrl.replace(/^http:\/\//i, "https://");
    }
    return customUrl.replace(/\/+$/, "");
  }

  // Vercel deployment URL fallback
  const vercelUrl = env("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  // Safe development fallback
  return "http://localhost:8080";
}

export interface EnvValidationResult {
  ok: boolean;
  environment: AppEnvironment;
  errors: string[];
  warnings: string[];
}

/**
 * Validates environment variables for production deployment readiness.
 * Does not expose secret values in errors or warnings.
 */
export function validateProductionEnv(): EnvValidationResult {
  const currentEnv = getAppEnvironment();
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawDbUrl = env("DATABASE_URL");
  const rawAuthSecret = env("BETTER_AUTH_SECRET");
  const authEnabled = env("VITE_AUTH_ENABLED") === "true";
  const appUrl = env("APP_URL");

  if (currentEnv === "production") {
    // 1. Database Safety in Production
    if (!rawDbUrl) {
      errors.push("DATABASE_URL is not set. Production deployments must configure a persistent PostgreSQL/Neon database.");
    } else {
      if (rawDbUrl.includes("localhost") || rawDbUrl.includes("127.0.0.1")) {
        errors.push("DATABASE_URL points to localhost/loopback in a production environment.");
      }
      if (!rawDbUrl.startsWith("postgres://") && !rawDbUrl.startsWith("postgresql://")) {
        errors.push("DATABASE_URL must be a valid PostgreSQL connection URI.");
      }
    }

    // 2. Base URL Safety in Production
    if (!appUrl) {
      warnings.push("APP_URL is not explicitly configured; falling back to deployment host header.");
    } else if (appUrl.startsWith("http://") && !appUrl.includes("localhost")) {
      warnings.push("APP_URL is configured with non-HTTPS scheme in production; forcing HTTPS.");
    }

    // 3. Authentication Secrets
    if (authEnabled) {
      if (!rawAuthSecret) {
        errors.push("BETTER_AUTH_SECRET must be configured when authentication is enabled in production.");
      } else if (rawAuthSecret.length < 32) {
        errors.push("BETTER_AUTH_SECRET is too weak (must be at least 32 characters for cryptographic security).");
      }
    }
  } else {
    // In dev or preview, log informational warnings if production flags are missing
    if (!rawDbUrl) {
      warnings.push("DATABASE_URL is unset. Running with local embedded PGLite database fallback.");
    }
    if (!appUrl) {
      warnings.push("APP_URL is unset. Defaulting to local preview contract (http://localhost:8080).");
    }
  }

  return {
    ok: errors.length === 0,
    environment: currentEnv,
    errors,
    warnings,
  };
}

/**
 * Asserts environment configuration is valid for production deployment.
 * Throws a clean, safe exception if production invariants are violated.
 */
export function assertProductionEnvReady(): void {
  const result = validateProductionEnv();
  if (!result.ok) {
    const errorList = result.errors.map((e, idx) => `  ${idx + 1}. ${e}`).join("\n");
    throw new Error(
      `[Production Environment Error] Fatal configuration issues detected:\n${errorList}\nPlease check your production environment settings.`,
    );
  }
}
