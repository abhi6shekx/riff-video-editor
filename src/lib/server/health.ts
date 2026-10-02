/**
 * Production Health & Readiness Probes.
 *
 * Verifies application availability and core service connectivity
 * without leaking sensitive infrastructure details, credentials, or internal stack traces.
 */

import { getSql, dbSource } from "../db.ts";
import { getAppEnvironment, validateProductionEnv } from "../env.server.ts";
import { serverLogger } from "./logger.ts";

export type DbHealthStatus = "connected" | "fallback" | "degraded";
export type ConfigHealthStatus = "valid" | "warning" | "invalid";

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: DbHealthStatus;
    configuration: ConfigHealthStatus;
  };
}

export async function checkServerHealth(): Promise<{ ok: boolean; data: HealthCheckResponse }> {
  let dbStatus: DbHealthStatus = "connected";

  try {
    const sql = await getSql();
    await sql`SELECT 1 as ping`;
    dbStatus = "connected";
  } catch (err) {
    if (dbSource === "pglite") {
      dbStatus = "fallback";
    } else {
      dbStatus = "degraded";
      serverLogger.error("HEALTH_CHECK_DB_FAILURE", err);
    }
  }

  const envValidation = validateProductionEnv();
  const configStatus: ConfigHealthStatus = !envValidation.ok ? "invalid" : envValidation.warnings.length > 0 ? "warning" : "valid";

  // In production, database must be "connected" and config "valid".
  // In dev/preview, "fallback" is healthy.
  const isHealthy =
    envValidation.ok &&
    (dbStatus === "connected" || (getAppEnvironment() !== "production" && dbStatus === "fallback"));

  const data: HealthCheckResponse = {
    status: isHealthy ? "healthy" : dbStatus === "connected" ? "degraded" : "unhealthy",
    environment: getAppEnvironment(),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      database: dbStatus,
      configuration: configStatus,
    },
  };

  return {
    ok: isHealthy,
    data,
  };
}
