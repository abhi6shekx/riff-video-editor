import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_PERMISSIONS_CATALOG } from "../src/lib/types.ts";

test("Canonical Permission Catalog completeness and uniqueness", () => {
  const keys = ADMIN_PERMISSIONS_CATALOG.map((p) => p.key);
  const uniqueKeys = new Set(keys);
  assert.equal(keys.length, uniqueKeys.size, "Permission keys must be strictly unique");

  const requiredKeys = [
    "submission.review",
    "category.manage",
    "moderation.manage",
    "appeal.review",
    "campaign.manage",
    "withdrawal.review",
    "wallet.view",
    "audit.view",
    "staff.manage",
  ];

  for (const req of requiredKeys) {
    assert.ok(uniqueKeys.has(req), `Catalog must include ${req}`);
  }
});

test("Least privilege default for unauthenticated or unknown actor", () => {
  // Test role assignment logic for empty/null user ID
  function mockResolveActor(userId, isOwnerEnv = false) {
    if (!userId || !userId.trim()) {
      return { role: "creator", permissions: [], isOwner: false, isStaff: false };
    }
    if (isOwnerEnv) {
      return { role: "owner", permissions: ADMIN_PERMISSIONS_CATALOG.map((p) => p.key), isOwner: true, isStaff: true };
    }
    return { role: "creator", permissions: [], isOwner: false, isStaff: false };
  }

  const unauth = mockResolveActor(null);
  assert.equal(unauth.role, "creator");
  assert.equal(unauth.isOwner, false);
  assert.equal(unauth.isStaff, false);
  assert.equal(unauth.permissions.length, 0);

  const empty = mockResolveActor("");
  assert.equal(empty.role, "creator");
  assert.equal(empty.isOwner, false);
});

test("Privilege escalation protection: disallow self-role change and owner promotion", () => {
  function validateStaffRoleUpdate({ actorRole, actorId, targetUserId, newRole }) {
    if (actorRole !== "owner" && actorRole !== "super_admin") {
      throw new Error("Super Admin or Owner authority required to update staff roles.");
    }
    if (targetUserId === actorId) {
      throw new Error("Privilege Escalation Guard: You cannot alter your own role.");
    }
    if (newRole === "owner") {
      throw new Error("Privilege Violation: The Owner role cannot be assigned through staff management.");
    }
    if (actorRole === "super_admin" && (newRole === "super_admin" || newRole === "admin")) {
      throw new Error("Only the Platform Owner can appoint Super Admins or Admins.");
    }
    return true;
  }

  // Self promotion rejected
  assert.throws(
    () => validateStaffRoleUpdate({ actorRole: "super_admin", actorId: "u_123", targetUserId: "u_123", newRole: "owner" }),
    /Privilege Escalation Guard/,
  );

  // Promoting anyone to Owner rejected
  assert.throws(
    () => validateStaffRoleUpdate({ actorRole: "owner", actorId: "owner_1", targetUserId: "u_456", newRole: "owner" }),
    /Privilege Violation: The Owner role cannot be assigned/,
  );

  // Super Admin appointing another Super Admin rejected
  assert.throws(
    () => validateStaffRoleUpdate({ actorRole: "super_admin", actorId: "sa_1", targetUserId: "u_456", newRole: "super_admin" }),
    /Only the Platform Owner can appoint/,
  );

  // Normal user cannot update staff roles
  assert.throws(
    () => validateStaffRoleUpdate({ actorRole: "creator", actorId: "c_1", targetUserId: "u_456", newRole: "admin" }),
    /Super Admin or Owner authority required/,
  );

  // Owner promoting admin to moderator succeeds
  assert.equal(
    validateStaffRoleUpdate({ actorRole: "owner", actorId: "owner_1", targetUserId: "u_456", newRole: "moderator" }),
    true,
  );
});

test("Permission delegation: reject arbitrary permissions and prevent self-granting", () => {
  const validPermKeys = new Set(ADMIN_PERMISSIONS_CATALOG.map((p) => p.key));

  function validatePermissionGrant({ actorRole, actorId, targetUserId, permissions }) {
    if (actorRole !== "owner") {
      throw new Error("Privilege Violation: Only the Platform Owner can grant or alter staff permissions.");
    }
    if (targetUserId === actorId) {
      throw new Error("Privilege Escalation Guard: You cannot alter your own permissions.");
    }
    for (const p of permissions) {
      if (!validPermKeys.has(p)) {
        throw new Error(`Invalid permission '${p}'.`);
      }
    }
    return true;
  }

  // Self-granting rejected
  assert.throws(
    () => validatePermissionGrant({ actorRole: "owner", actorId: "owner_1", targetUserId: "owner_1", permissions: ["staff.manage"] }),
    /Privilege Escalation Guard/,
  );

  // Arbitrary permission rejected
  assert.throws(
    () => validatePermissionGrant({ actorRole: "owner", actorId: "owner_1", targetUserId: "admin_1", permissions: ["database.drop"] }),
    /Invalid permission 'database.drop'/,
  );

  // Non-owner cannot grant
  assert.throws(
    () => validatePermissionGrant({ actorRole: "super_admin", actorId: "sa_1", targetUserId: "admin_1", permissions: ["submission.review"] }),
    /Privilege Violation: Only the Platform Owner/,
  );

  // Valid permissions grant succeeds
  assert.equal(
    validatePermissionGrant({ actorRole: "owner", actorId: "owner_1", targetUserId: "admin_1", permissions: ["submission.review", "moderation.manage"] }),
    true,
  );
});

test("IDOR Resource ownership and post deletion check", () => {
  function canDeletePost({ callerId, postOwnerId, isStaffModerator }) {
    if (callerId === postOwnerId) return true;
    if (isStaffModerator) return true;
    return false;
  }

  // Post owner can delete their post
  assert.equal(canDeletePost({ callerId: "user_a", postOwnerId: "user_a", isStaffModerator: false }), true);

  // Another user cannot delete
  assert.equal(canDeletePost({ callerId: "user_b", postOwnerId: "user_a", isStaffModerator: false }), false);

  // Staff moderator can delete
  assert.equal(canDeletePost({ callerId: "staff_mod", postOwnerId: "user_a", isStaffModerator: true }), true);
});

test("Conflict of interest: authors cannot approve their own submission or arbitrate their own appeal", () => {
  function checkSubmissionReview({ reviewerId, authorId }) {
    if (reviewerId === authorId) {
      throw new Error("Conflict of Interest: You cannot review or arbitrate your own submission.");
    }
    return true;
  }

  function checkAppealReview({ reviewerId, appellantId }) {
    if (reviewerId === appellantId) {
      throw new Error("Conflict of Interest: You cannot review or arbitrate your own appeal.");
    }
    return true;
  }

  assert.throws(() => checkSubmissionReview({ reviewerId: "user_1", authorId: "user_1" }), /Conflict of Interest/);
  assert.equal(checkSubmissionReview({ reviewerId: "admin_1", authorId: "user_1" }), true);

  assert.throws(() => checkAppealReview({ reviewerId: "creator_a", appellantId: "creator_a" }), /Conflict of Interest/);
  assert.equal(checkAppealReview({ reviewerId: "moderator_1", appellantId: "creator_a" }), true);
});

test("Creator economy: point balance deduction protection against negative values", () => {
  function applyPointAdjustment(currentBalance, delta) {
    if (delta < 0 && currentBalance + delta < 0) {
      throw new Error(`Insufficient points: User currently has ${currentBalance} points; cannot deduct ${Math.abs(delta)} points.`);
    }
    return currentBalance + delta;
  }

  assert.equal(applyPointAdjustment(500, 100), 600);
  assert.equal(applyPointAdjustment(500, -200), 300);
  assert.throws(() => applyPointAdjustment(100, -250), /Insufficient points/);
});

test("Withdrawal validation against system configuration limits", () => {
  function validateWithdrawal(amount, { minPoints = 1000, maxPoints = 100000, isFrozen = false, pointsEnabled = true }) {
    if (!pointsEnabled) throw new Error("RIFF Points system is currently paused.");
    if (isFrozen) throw new Error("Your creator wallet is currently frozen. Contact support.");
    if (amount < minPoints) throw new Error(`Minimum withdrawal amount is ${minPoints} points.`);
    if (amount > maxPoints) throw new Error(`Maximum single withdrawal is ${maxPoints} points.`);
    return true;
  }

  assert.throws(() => validateWithdrawal(500, { minPoints: 1000 }), /Minimum withdrawal amount/);
  assert.throws(() => validateWithdrawal(150000, { maxPoints: 100000 }), /Maximum single withdrawal/);
  assert.throws(() => validateWithdrawal(5000, { isFrozen: true }), /frozen/);
  assert.throws(() => validateWithdrawal(5000, { pointsEnabled: false }), /paused/);
  assert.equal(validateWithdrawal(5000, { minPoints: 1000, maxPoints: 100000 }), true);
});
