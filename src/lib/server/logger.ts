/**
 * Production-Safe Server-Side Structured Logger.
 *
 * Requirements:
 * - Structured JSON output in production.
 * - Automatic redaction of sensitive values (passwords, tokens, cookies, secrets, keys).
 * - Traceable error identifiers.
 * - Server-only execution.
 */

import { isProduction } from "../env.server.ts";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /key/i,
  /card/i,
  /cvv/i,
  /database_url/i,
  /connectionstring/i,
  /credential/i,
];

/**
 * Deeply redacts sensitive keys from log metadata payloads.
 */
export function sanitizeLogPayload(data: unknown, depth = 0): unknown {
  if (depth > 4 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Redact connection strings or JWT-like tokens
    if (data.startsWith("postgres://") || data.startsWith("postgresql://")) {
      return "[REDACTED_DATABASE_URL]";
    }
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(data)) {
      return "[REDACTED_JWT_TOKEN]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogPayload(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(key))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeLogPayload(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  userId?: string;
  route?: string;
  errorId?: string;
  durationMs?: number;
  message?: string;
  meta?: unknown;
}

class ServerLogger {
  private log(
    level: LogLevel,
    action: string,
    message?: string,
    meta?: Record<string, unknown>,
    extra?: { userId?: string; route?: string; errorId?: string; durationMs?: number },
  ) {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      userId: extra?.userId,
      route: extra?.route,
      errorId: extra?.errorId,
      durationMs: extra?.durationMs,
      message,
      meta: meta ? sanitizeLogPayload(meta) : undefined,
    };

    if (isProduction()) {
      // Single-line JSON in production for log aggregators (Datadog, CloudWatch, Vercel)
      console.log(JSON.stringify(entry));
    } else {
      // Readable formatting for local development
      const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.action}]`;
      const userStr = entry.userId ? ` (user: ${entry.userId})` : "";
      const errStr = entry.errorId ? ` (err: ${entry.errorId})` : "";
      console.log(`${prefix}${userStr}${errStr} ${message || ""}`, entry.meta || "");
    }
  }

  info(action: string, message?: string, meta?: Record<string, unknown>, extra?: { userId?: string; route?: string }) {
    this.log("INFO", action, message, meta, extra);
  }

  warn(action: string, message?: string, meta?: Record<string, unknown>, extra?: { userId?: string; route?: string }) {
    this.log("WARN", action, message, meta, extra);
  }

  error(action: string, err: unknown, meta?: Record<string, unknown>, extra?: { userId?: string; route?: string; errorId?: string }) {
    const errorId = extra?.errorId || `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = !isProduction() && err instanceof Error ? err.stack : undefined;

    this.log("ERROR", action, errorMessage, { ...meta, stack: errorStack }, { ...extra, errorId });
    return errorId;
  }
}

export const serverLogger = new ServerLogger();
