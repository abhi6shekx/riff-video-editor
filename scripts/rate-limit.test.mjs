import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "../src/lib/server/rate-limit.ts";

test("checkRateLimit allows requests under threshold", () => {
  const testKey = `test_user_${Date.now()}_1`;
  const config = { maxRequests: 3, windowMs: 10000 };

  const res1 = checkRateLimit(testKey, config);
  assert.equal(res1.allowed, true);
  assert.equal(res1.remaining, 2);

  const res2 = checkRateLimit(testKey, config);
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 1);

  const res3 = checkRateLimit(testKey, config);
  assert.equal(res3.allowed, true);
  assert.equal(res3.remaining, 0);
});

test("checkRateLimit blocks requests when maxRequests exceeded", () => {
  const testKey = `test_user_${Date.now()}_2`;
  const config = { maxRequests: 2, windowMs: 10000 };

  checkRateLimit(testKey, config);
  checkRateLimit(testKey, config);

  const blockedRes = checkRateLimit(testKey, config);
  assert.equal(blockedRes.allowed, false);
  assert.equal(blockedRes.remaining, 0);
  assert.ok(blockedRes.retryAfterSeconds > 0);
});
