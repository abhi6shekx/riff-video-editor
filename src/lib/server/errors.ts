/**
 * Production-Safe Server Error Handler.
 *
 * Rules:
 * - Production responses must NEVER expose stack traces, database queries,
 *   filesystem paths, or credentials.
 * - Every server error is assigned an errorId and logged server-side.
 * - Clients receive a clean, friendly error message with the errorId reference.
 */

import { isProduction } from "../env.server.ts";
import { serverLogger } from "./logger.ts";

export interface SafeServerErrorResponse {
  error: string;
  errorId: string;
  statusCode: number;
}

export function handleServerError(
  action: string,
  err: unknown,
  context?: { userId?: string; route?: string; meta?: Record<string, unknown> },
): SafeServerErrorResponse {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Log full diagnostics server-side with the unique reference ID
  serverLogger.error(action, err, context?.meta, {
    userId: context?.userId,
    route: context?.route,
    errorId,
  });

  const rawMessage = err instanceof Error ? err.message : String(err);

  // In production, mask database internals, SQL state codes, and raw syntax errors
  if (isProduction()) {
    // If the error message is already an intentional user-facing validation error (e.g. starts with "Insufficient", "Invalid", "Unauthorized", "Forbidden", etc.)
    const isUserFacing =
      /^(Unauthorized|Forbidden|Not found|Insufficient|Invalid|Maximum|Minimum|Cannot|Duplicate|Conflict)/i.test(
        rawMessage,
      );

    if (isUserFacing) {
      return {
        error: rawMessage,
        errorId,
        statusCode: 400,
      };
    }

    return {
      error: `An unexpected server error occurred. Reference ID: ${errorId}`,
      errorId,
      statusCode: 500,
    };
  }

  // Development mode returns the full descriptive error
  return {
    error: rawMessage,
    errorId,
    statusCode: 500,
  };
}
