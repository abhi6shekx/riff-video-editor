import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AdminPermission,
  AuditLog,
  Battle,
  Category,
  Chat,
  Comment,
  ContentReport,
  ContentType,
  Hub,
  Meme,
  Message,
  Notification,
  Person,
  PlatformControls,
  PointsTransaction,
  Post,
  Submission,
  SystemConfigCategory,
  SystemConfigKey,
  SystemConfigRecord,
  Template,
  Tx,
  UserInterestProfile,
  WithdrawalRequest,
} from "./types";
import { OWNER_ONLY_CONFIG_KEYS } from "./types";
import {
  BATTLE,
  BRIEFS,
  CATEGORIES,
  CHATS,
  DEFAULT_PLATFORM_CONTROLS,
  HUBS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PENDING_SUBMISSIONS,
  INITIAL_POINTS_TXS,
  INITIAL_POSTS,
  INITIAL_REJECTED_SUBMISSIONS,
  INITIAL_REMOVED_SUBMISSIONS,
  INITIAL_REPORTS,
  INITIAL_SYSTEM_CONFIGS,
  INITIAL_WITHDRAWALS,
  MESSAGES,
  PEOPLE,
  STARTER_TX,
  YOU_ID,
  categoryMap,
} from "./seed";
import { uid } from "./utils";
import {
  type StreakData,
  DEFAULT_STREAK,
  evaluateStreakStatus,
  getLocalDateString,
} from "./streaks";

type Profile = {
  name: string;
  handle: string;
  bio: string;
  instagramHandle?: string;
  role?: Person["role"];
  followers?: number;
  following?: number;
  creatorPopularity?: number;
  riffPoints?: number;
  warningsCount?: number;
  isBanned?: boolean;
  isWalletFrozen?: boolean;
  permissions?: AdminPermission[];
};

// Calculate Popularity Score:
// 30% likes, 20% views, 15% comments, 15% shares, 10% saves, 10% recent velocity
export function computePopularityScore(post: {
  likes: number;
  views: number;
  comments: number;
  shares: number;
  saves: number;
  createdAt: number;
}): number {
  const ageHours = Math.max(0.1, (Date.now() - post.createdAt) / 3_600_000);
  const velocity = (post.likes + post.comments * 2 + post.shares * 3) / Math.pow(ageHours + 2, 1.2);
  const base =
    post.likes * 25 +
    Math.min(50000, post.views * 1.5) +
    post.comments * 35 +
    post.shares * 40 +
    post.saves * 20 +
    velocity * 120;
  return Math.round(base);
}

export const ROLE_HIERARCHY: Record<NonNullable<Person["role"]>, number> = {
  owner: 5,
  super_admin: 4,
  admin: 3,
  moderator: 2,
  brand: 1,
  creator: 1,
};

export function canPerformModeration(
  actorRole: Person["role"] = "creator",
  targetRole: Person["role"] = "creator",
): boolean {
  if (actorRole === "owner") return true;
  if (targetRole === "owner") return false;
  if (targetRole === "super_admin") return false;
  const actorRank = ROLE_HIERARCHY[actorRole] || 1;
  const targetRank = ROLE_HIERARCHY[targetRole] || 1;
  return actorRank > targetRank;
}

export function canManageRoles(
  actorRole: Person["role"] = "creator",
  targetCurrentRole: Person["role"] = "creator",
  newAssignedRole: Person["role"] = "creator",
): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "super_admin") {
    if (targetCurrentRole === "owner" || targetCurrentRole === "super_admin") return false;
    if (newAssignedRole === "owner" || newAssignedRole === "super_admin") return false;
    return true;
  }
  return false;
}

export function hasPermission(
  person: { role?: Person["role"]; permissions?: string[] } | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!person || !person.role) return false;
  if (person.role === "owner") return true;
  if (person.role === "super_admin") {
    if (permission !== "staff.manage") return true;
    return Boolean(person.permissions?.includes("staff.manage"));
  }
  return Boolean(person.permissions?.includes(permission));
}

export function canManagePermissions(
  actorRole: Person["role"] = "creator",
  targetRole: Person["role"] = "creator",
  delegatedPermissions: AdminPermission[] = [],
): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "super_admin") {
    if (targetRole === "owner" || targetRole === "super_admin") return false;
    if (delegatedPermissions.includes("staff.manage")) return false;
    return true;
  }
  return false;
}

type RiffState = {
  // User Profile
  onboarded: boolean;
  profile: Profile;
  setProfile: (p: Partial<Profile>) => void;
  finishOnboarding: (profile: Profile, hubs: string[]) => void;

  // Accounts & Governance Hierarchy
  people: Person[];
  reclassifyPost: (postId: string, newCategoryId: string, actorRole?: Person["role"]) => void;
  deletePost: (postId: string, actorRole?: Person["role"]) => boolean;
  issueWarning: (userHandle: string, reason: string, actorRole?: Person["role"]) => boolean;
  resetUserWarnings: (userHandle: string, reason?: string, actorRole?: Person["role"]) => boolean;
  banUser: (userHandle: string, reason: string, actorRole?: Person["role"]) => void;
  unbanUser: (userHandle: string, actorRole?: Person["role"]) => void;
  updateUserRole: (userHandle: string, newRole: Person["role"], actorRole?: Person["role"]) => boolean;

  // Platform Controls (Owner Superuser)
  platformControls: PlatformControls;
  updatePlatformControls: (updates: Partial<PlatformControls>, reason?: string) => void;
  updateEconomyLevers: (
    levers: {
      pointConversionRate?: number;
      minWithdrawalThreshold?: number;
      maxDailyWithdrawalLimit?: number;
      payoutProcessingFeePercent?: number;
    },
    reason?: string,
  ) => void;

  // Step 30: Centralized System Configuration
  systemConfigs: SystemConfigRecord[];
  getSystemConfigValue: (key: SystemConfigKey, defaultValue?: string) => string;
  updateSystemConfig: (
    key: SystemConfigKey,
    value: unknown,
    reason?: string,
  ) => { success: boolean; message: string };
  batchUpdateSystemConfigs: (
    updates: Array<{ key: SystemConfigKey; value: unknown }>,
    reason?: string,
  ) => { success: boolean; message: string };
  setSystemConfigs: (configs: SystemConfigRecord[]) => void;
  updateCategoryEarningRules: (
    categoryId: string,
    rules: {
      approvalPoints?: number;
      bonusPer1000Views?: number;
      bonusPer100Likes?: number;
      maxRewardCeiling?: number;
      status?: "active" | "inactive";
    },
    reason?: string,
  ) => void;
  toggleUserWalletFreeze: (userHandle: string, freeze: boolean, reason: string) => void;
  grantUserPermission: (userHandle: string, permission: AdminPermission) => void;
  revokeUserPermission: (userHandle: string, permission: AdminPermission) => void;
  setUserPermissions: (
    userHandle: string,
    permissions: AdminPermission[],
    actorRole?: Person["role"],
    reason?: string,
  ) => boolean;
  adjustUserPoints: (userHandle: string, deltaPoints: number, reason: string) => void;

  // Categories & Rewards
  categories: Category[];
  updateCategoryPoints: (categoryId: string, points: number) => void;
  addCategory: (cat: Category) => void;
  createCategory: (
    cat: Omit<Category, "id" | "status"> & { id?: string; status?: "active" | "inactive" | "archived" },
    reason?: string,
  ) => { success: boolean; message: string; category?: Category };
  updateCategory: (
    id: string,
    updates: Partial<Category>,
    reason?: string,
  ) => { success: boolean; message: string };
  toggleCategoryStatus: (
    id: string,
    reason?: string,
  ) => { success: boolean; message: string };
  reorderCategories: (
    orderedIds: string[],
    reason?: string,
  ) => { success: boolean; message: string };
  setDefaultCategory: (
    id: string,
    reason?: string,
  ) => { success: boolean; message: string };

  // Posts & Feed
  posts: Post[];
  pendingSubmissions: Post[];
  rejectedSubmissions: Post[];
  removedSubmissions: Post[];
  likedPostIds: string[];
  savedPostIds: string[];
  followingUserIds: string[];
  mutedCategoryIds: string[];
  mutedCreatorHandles: string[];
  demotedPostIds: string[];

  // Social interactions
  toggleLikePost: (postId: string) => void;
  toggleSavePost: (postId: string) => void;
  toggleFollowUser: (userHandleOrId: string) => void;
  incrementPostViews: (postId: string) => void;
  sharePost: (postId: string) => void;
  recordNegativeSignal: (
    postId: string,
    action: "not_interested" | "mute_category" | "mute_creator" | "report",
    categoryId?: string,
    creatorHandle?: string,
  ) => void;

  // Comments
  comments: Comment[];
  addCommentToPost: (postId: string, text: string, parentId?: string) => Comment;
  likeComment: (commentId: string) => void;

  // Create Flow (Post & Reel)
  submitContent: (input: {
    type: ContentType;
    mediaUrl: string;
    caption: string;
    topCaption?: string;
    bottomCaption?: string;
    categoryId: string;
    hashtags: string[];
    aspectRatio?: "9:16" | "1:1" | "4:5";
    musicTrack?: { title: string; artist: string; isTrending?: boolean };
    filter?: string;
    speed?: number;
    location?: string;
  }) => Post;

  // Admin & Moderation Queue
  auditLogs: AuditLog[];
  approveSubmission: (submissionId: string, overrideCategoryId?: string) => void;
  rejectSubmission: (submissionId: string, reason: string) => void;
  restoreRejectedSubmission: (submissionId: string) => void;
  restoreRemovedSubmission: (submissionId: string) => void;

  // Reports & Community Moderation
  reports: ContentReport[];
  reportPost: (input: {
    postId: string;
    reason: string;
    details?: string;
  }) => { success: boolean; message: string };
  resolveReport: (
    reportId: string,
    action: "dismiss" | "remove_content" | "warn_user",
    resolutionNote?: string,
  ) => boolean;

  // Points & Wallet (100% Private to User)
  pointsWallet: number;
  pointsTransactions: PointsTransaction[];
  creatorPopularity: number;

  // Streaks & Daily Login Rewards
  streak: StreakData;
  claimDailyReward: () => {
    success: boolean;
    pointsAwarded: number;
    newStreak: number;
    message: string;
  };

  // Withdrawals & Financial Escrow
  withdrawals: WithdrawalRequest[];
  requestWithdrawal: (input: {
    amount: number;
    method: "upi" | "bank_transfer";
    details: Record<string, unknown>;
  }) => { success: boolean; message: string; withdrawalId?: string };
  settleWithdrawal: (withdrawalId: string, actorRole?: Person["role"], note?: string) => boolean;
  rejectAndRefundWithdrawal: (withdrawalId: string, reason: string, actorRole?: Person["role"]) => boolean;
  flagFreezeAndRejectWithdrawal: (withdrawalId: string, reason: string, actorRole?: Person["role"]) => boolean;

  // AI Feed Algorithm User Interest Profile
  userInterestProfile: UserInterestProfile;
  adjustInterest: (categoryId: string, delta: number) => void;

  // Notifications
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Direct Messaging
  chats: Chat[];
  messages: Message[];
  sendTextMessage: (chatId: string, text: string) => void;
  sendMemeMessage: (chatId: string, mediaUrl: string) => void;
  markChatRead: (chatId: string) => void;

  // Backwards compatibility legacy state
  joinedHubIds: string[];
  heatedIds: string[];
  savedIds: string[];
  extraMemes: Meme[];
  extraComments: Comment[];
  extraMessages: Message[];
  readChatIds: string[];
  wallet: number;
  txs: Tx[];
  submissions: Submission[];
  battle: Battle;
  vote: "left" | "right" | null;
  imageGens: number;
  sessionScenes: { id: string; src: string; label: string }[];
  toggleHub: (id: string) => void;
  toggleHeat: (id: string) => void;
  toggleSave: (id: string) => void;
  postMeme: (input: {
    image: string;
    top: string;
    bottom: string;
    hubId?: string;
    parentId?: string;
    briefId?: string;
  }) => Meme;
  addComment: (memeId: string, text: string) => void;
  sendText: (chatId: string, text: string) => void;
  sendMeme: (chatId: string, memeId: string) => void;
  sendSound: (chatId: string, soundId: string) => void;
  markRead: (chatId: string) => void;
  voteBattle: (side: "left" | "right") => void;
  addScene: (src: string, label: string) => void;
  bumpGens: () => void;
};

export const useRiff = create<RiffState>()(
  persist(
    (set, get) => ({
      // Profile
      onboarded: true,
      profile: {
        name: "Abhishek Gawade",
        handle: "abhishek",
        bio: "Platform Owner & Founder · RIFF Studio. Building the future of viral media.",
        instagramHandle: "abhishek_on_riff",
        role: "owner",
        followers: 12480,
        following: 482,
        creatorPopularity: 99400,
        riffPoints: 2840,
        warningsCount: 0,
        isBanned: false,
      },
      setProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      finishOnboarding: (profile, hubs) => set({ onboarded: true, profile: { ...get().profile, ...profile }, joinedHubIds: hubs }),

      // Governance Hierarchy & User Management
      people: PEOPLE,

      reclassifyPost: (postId, newCategoryId, actorRole = "super_admin") => {
        const categories = get().categories;
        const targetCategory = categories.find((c) => c.id === newCategoryId) || categories[0];

        // Check in live posts & pending submissions
        const livePost = get().posts.find((p) => p.id === postId);
        const pendingPost = get().pendingSubmissions.find((p) => p.id === postId);
        const targetPost = livePost || pendingPost;
        if (!targetPost) return;

        const authorHandle = targetPost.authorHandle;

        // Check author role in people list
        let author = get().people.find((p) => p.handle === authorHandle || p.id === targetPost.authorId);
        if (!author && authorHandle === get().profile.handle) {
          author = {
            id: YOU_ID,
            handle: get().profile.handle,
            name: get().profile.name,
            bio: get().profile.bio,
            role: (get().profile.role as Person["role"]) || "owner",
            followers: get().profile.followers || 0,
            mark: "you",
            warningsCount: get().profile.warningsCount || 0,
          };
        }

        let updatedPeople = get().people;
        let isDemoted = false;
        let newWarningsCount = 0;

        if (author && author.role === "admin") {
          newWarningsCount = (author.warningsCount || 0) + 1;
          isDemoted = newWarningsCount >= 5;

          updatedPeople = get().people.map((p) => {
            if (p.handle === authorHandle || p.id === author?.id) {
              return {
                ...p,
                warningsCount: newWarningsCount,
                role: isDemoted ? "creator" : p.role,
              };
            }
            return p;
          });

          // Sync current profile if it's the current user
          if (authorHandle === get().profile.handle || author.id === YOU_ID) {
            set({
              profile: {
                ...get().profile,
                warningsCount: newWarningsCount,
                role: isDemoted ? "creator" : get().profile.role,
              },
            });
          }
        }

        // Update posts state
        const isPending = !!pendingPost;
        let updatedPosts = get().posts;
        let updatedPending = get().pendingSubmissions;

        if (isPending && pendingPost) {
          // Approve & reclassify pending post
          const approvedPost: Post = {
            ...pendingPost,
            approvedCategoryId: newCategoryId,
            approvalStatus: "category_changed",
            pointsAwarded: targetCategory.approvalPoints,
            reviewedBy: actorRole,
            reviewedAt: Date.now(),
          };
          updatedPending = updatedPending.filter((s) => s.id !== postId);
          updatedPosts = [approvedPost, ...updatedPosts];
        } else if (livePost) {
          updatedPosts = updatedPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  approvedCategoryId: newCategoryId,
                  approvalStatus: "category_changed",
                  pointsAwarded: targetCategory.approvalPoints,
                  reviewedBy: actorRole,
                  reviewedAt: Date.now(),
                }
              : p,
          );
        }

        // Build notifications
        const notifs: Notification[] = [];
        if (author) {
          if (isDemoted) {
            notifs.push({
              id: uid("notif"),
              userId: author.id,
              type: "demoted",
              title: "Demoted to Creator ⚠️",
              message: `You received 5 warnings for category misclassification. Your position has been automatically demoted from Admin to Creator.`,
              createdAt: Date.now(),
              isRead: false,
            });
          } else if (author.role === "admin") {
            notifs.push({
              id: uid("notif"),
              userId: author.id,
              type: "warning_issued",
              title: "Category Misclassification Warning ⚠️",
              message: `Your post was reclassified to ${targetCategory.icon} ${targetCategory.name} by ${actorRole}. Category warning count: ${newWarningsCount}/5.`,
              createdAt: Date.now(),
              isRead: false,
            });
          }
        }

        // Audit Log
        const auditLog: AuditLog = {
          id: uid("audit"),
          actorId: actorRole,
          actorRole: actorRole === "owner" ? "owner" : "super_admin",
          action: isDemoted ? "demote_admin" : "change_category",
          postId,
          postCaption: targetPost.caption || targetPost.topCaption || "Content",
          submitterHandle: authorHandle,
          userSelectedCategory: targetPost.userSelectedCategoryId,
          approvedCategory: targetCategory.name,
          pointsAwarded: targetCategory.approvalPoints,
          reason: isDemoted
            ? `Admin demoted to Creator after 5 category misclassification warnings`
            : `Reclassified to ${targetCategory.name} by ${actorRole}. Warning issued to admin.`,
          timestamp: Date.now(),
        };

        set({
          people: updatedPeople,
          posts: updatedPosts,
          pendingSubmissions: updatedPending,
          notifications: [...notifs, ...get().notifications],
          auditLogs: [auditLog, ...get().auditLogs],
        });
      },

      deletePost: (postId, actorRole = (get().profile.role as Person["role"]) || "owner") => {
        const post = get().posts.find((p) => p.id === postId) || get().pendingSubmissions.find((p) => p.id === postId);
        if (!post) return false;

        const targetAuthorRole = post.authorRole || "creator";
        if (!canPerformModeration(actorRole, targetAuthorRole) && post.authorHandle !== get().profile.handle) {
          return false;
        }

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
          action: "delete_post",
          postId,
          postCaption: post.caption || post.topCaption || "Deleted Content",
          submitterHandle: post.authorHandle,
          userSelectedCategory: post.userSelectedCategoryId,
          approvedCategory: "Deleted",
          pointsAwarded: 0,
          reason: `Post removed by ${actorRole} according to moderation hierarchy`,
          timestamp: Date.now(),
        };

        const removedPost: Post = {
          ...post,
          approvalStatus: "removed",
          rejectionReason: `Post removed by ${actorRole} according to moderation hierarchy`,
          reviewedBy: get().profile.handle,
          reviewedAt: Date.now(),
        };

        set({
          posts: get().posts.filter((p) => p.id !== postId),
          pendingSubmissions: get().pendingSubmissions.filter((p) => p.id !== postId),
          removedSubmissions: [removedPost, ...(get().removedSubmissions || [])],
          auditLogs: [audit, ...get().auditLogs],
        });
        return true;
      },

      issueWarning: (userHandle, reason, actorRole = (get().profile.role as Person["role"]) || "owner") => {
        let targetUser = get().people.find((p) => p.handle === userHandle);
        if (!targetUser) return false;
        if (!canPerformModeration(actorRole, targetUser.role)) {
          return false;
        }

        let isDemoted = false;
        let warningsCount = 0;

        const updatedPeople = get().people.map((p) => {
          if (p.handle === userHandle) {
            warningsCount = (p.warningsCount || 0) + 1;
            isDemoted = (p.role === "admin" || p.role === "moderator") && warningsCount >= 5;
            targetUser = { ...p, warningsCount, role: isDemoted ? "creator" : p.role };
            return targetUser;
          }
          return p;
        });

        if (userHandle === get().profile.handle) {
          set({
            profile: {
              ...get().profile,
              warningsCount,
              role: isDemoted ? "creator" : get().profile.role,
            },
          });
        }

        const notifs: Notification[] = [
          {
            id: uid("notif"),
            userId: targetUser?.id || userHandle,
            type: isDemoted ? "demoted" : "warning_issued",
            title: isDemoted ? "Demoted to Creator ⚠️" : "Official Moderation Warning ⚠️",
            message: isDemoted
              ? `You received 5 warnings and have been automatically demoted from ${targetUser?.role === "admin" ? "Admin" : "Moderator"} to Creator. Reason: ${reason}`
              : `Warning issued by ${actorRole}. Reason: ${reason}. Warnings: ${warningsCount}/5.`,
            createdAt: Date.now(),
            isRead: false,
          },
        ];

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
          action: isDemoted ? "demote_admin" : "issue_warning",
          postId: "N/A",
          postCaption: "User Governance Action",
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason,
          timestamp: Date.now(),
        };

        set({
          people: updatedPeople,
          notifications: [...notifs, ...get().notifications],
          auditLogs: [audit, ...get().auditLogs],
        });
        return true;
      },

      resetUserWarnings: (userHandle, reason = "Staff cleared warnings", actorRole = (get().profile.role as Person["role"]) || "owner") => {
        const target = get().people.find((p) => p.handle === userHandle);
        if (!target) return false;
        if (!canPerformModeration(actorRole, target.role)) return false;

        const updatedPeople = get().people.map((p) =>
          p.handle === userHandle ? { ...p, warningsCount: 0 } : p,
        );
        if (userHandle === get().profile.handle) {
          set({ profile: { ...get().profile, warningsCount: 0 } });
        }
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "super_admin",
          action: "reset_warnings",
          postId: "N/A",
          postCaption: "Disciplinary Warnings Reset",
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason,
          timestamp: Date.now(),
        };
        set({ people: updatedPeople, auditLogs: [audit, ...get().auditLogs] });
        return true;
      },

      banUser: (userHandle, reason, actorRole = (get().profile.role as Person["role"]) || "owner") => {
        const updatedPeople = get().people.map((p) =>
          p.handle === userHandle ? { ...p, isBanned: true } : p,
        );

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "super_admin",
          action: "ban_user",
          postId: "N/A",
          postCaption: "Account Suspension",
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason: `Account banned by ${actorRole}. Reason: ${reason}`,
          timestamp: Date.now(),
        };

        set({
          people: updatedPeople,
          posts: get().posts.filter((p) => p.authorHandle !== userHandle),
          pendingSubmissions: get().pendingSubmissions.filter((p) => p.authorHandle !== userHandle),
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      unbanUser: (userHandle, actorRole = (get().profile.role as Person["role"]) || "owner") => {
        const updatedPeople = get().people.map((p) =>
          p.handle === userHandle ? { ...p, isBanned: false } : p,
        );

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "super_admin",
          action: "unban_user",
          postId: "N/A",
          postCaption: "Account Unban",
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason: `Account unbanned by ${actorRole}`,
          timestamp: Date.now(),
        };

        set({
          people: updatedPeople,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      updateUserRole: (userHandle, newRole, actorRole = (get().profile.role as Person["role"]) || "owner") => {
        const target = get().people.find((p) => p.handle === userHandle);
        if (!target) return false;
        if (!canManageRoles(actorRole, target.role, newRole)) {
          return false;
        }
        const updatedPeople = get().people.map((p) =>
          p.handle === userHandle ? { ...p, role: newRole } : p,
        );
        if (userHandle === get().profile.handle) {
          set({ profile: { ...get().profile, role: newRole } });
        }
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "super_admin",
          action: "demote_admin",
          postId: "N/A",
          postCaption: `Role assigned: ${newRole.toUpperCase()}`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason: `Role changed to ${newRole} by ${actorRole}`,
          timestamp: Date.now(),
        };
        set({ people: updatedPeople, auditLogs: [audit, ...get().auditLogs] });
        return true;
      },

      // Platform Controls (Owner Superuser)
      platformControls: DEFAULT_PLATFORM_CONTROLS,
      updatePlatformControls: (updates, reason = "Owner updated platform controls") => {
        const updated = { ...get().platformControls, ...updates };
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: "owner",
          action: "platform_control_update",
          postId: "N/A",
          postCaption: `Controls: ${Object.keys(updates).join(", ")}`,
          submitterHandle: "platform",
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason,
          timestamp: Date.now(),
        };
        set({
          platformControls: updated,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      updateEconomyLevers: (levers, reason = "Owner updated platform economy levers") => {
        const updated = { ...get().platformControls, ...levers };
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: "owner",
          action: "economy_levers_update",
          postId: "N/A",
          postCaption: `Economy Levers: Rate ₹${updated.pointConversionRate}/pt, Min ₹${updated.minWithdrawalThreshold}, Max ₹${updated.maxDailyWithdrawalLimit}, Fee ${updated.payoutProcessingFeePercent}%`,
          submitterHandle: "platform",
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason,
          timestamp: Date.now(),
        };
        set({
          platformControls: updated,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      // Step 30: Centralized System Configuration Implementation
      systemConfigs: INITIAL_SYSTEM_CONFIGS,
      getSystemConfigValue: (key, defaultValue = "") => {
        const found = get().systemConfigs.find((c) => c.key === key);
        return found ? found.value : defaultValue;
      },
      updateSystemConfig: (key, value, reason) => {
        const actorRole = (get().profile.role as Person["role"]) || "creator";
        const isOwnerOnly = OWNER_ONLY_CONFIG_KEYS.includes(key);
        if (isOwnerOnly && actorRole !== "owner") {
          return { success: false, message: `Only the Platform Owner can modify '${key}'.` };
        }
        if (!isOwnerOnly && actorRole !== "owner" && actorRole !== "super_admin") {
          return { success: false, message: "Insufficient permissions to modify system configuration." };
        }

        const currentConfigs = get().systemConfigs;
        const oldRecord = currentConfigs.find((c) => c.key === key);
        const oldValue = oldRecord ? oldRecord.value : "";
        const parsedValue = typeof value === "object" ? JSON.stringify(value) : String(value).trim();

        const updatedConfigs = currentConfigs.map((c) =>
          c.key === key
            ? {
                ...c,
                value: parsedValue,
                updatedAt: new Date().toISOString(),
                updatedBy: get().profile.handle,
              }
            : c,
        );

        if (key === "maintenance_mode") {
          set({ platformControls: { ...get().platformControls, maintenanceMode: parsedValue === "true" } });
        }

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "super_admin",
          action: "config.update",
          resourceType: "system_config",
          resourceId: key,
          configKey: key,
          oldValue,
          newValue: parsedValue,
          reason: reason || `Updated system configuration '${key}'`,
          timestamp: Date.now(),
        };

        set({
          systemConfigs: updatedConfigs,
          auditLogs: [audit, ...get().auditLogs],
        });

        return { success: true, message: `Configuration '${key}' updated.` };
      },

      batchUpdateSystemConfigs: (updates, reason) => {
        const actorRole = (get().profile.role as Person["role"]) || "creator";
        for (const u of updates) {
          const isOwnerOnly = OWNER_ONLY_CONFIG_KEYS.includes(u.key);
          if (isOwnerOnly && actorRole !== "owner") {
            return { success: false, message: `Only the Platform Owner can modify '${u.key}'.` };
          }
          if (!isOwnerOnly && actorRole !== "owner" && actorRole !== "super_admin") {
            return { success: false, message: `Insufficient permissions to modify '${u.key}'.` };
          }
        }

        let updatedConfigs = [...get().systemConfigs];
        const newAudits: AuditLog[] = [];

        for (const u of updates) {
          const oldRecord = updatedConfigs.find((c) => c.key === u.key);
          const oldValue = oldRecord ? oldRecord.value : "";
          const parsedValue = typeof u.value === "object" ? JSON.stringify(u.value) : String(u.value).trim();

          updatedConfigs = updatedConfigs.map((c) =>
            c.key === u.key
              ? {
                  ...c,
                  value: parsedValue,
                  updatedAt: new Date().toISOString(),
                  updatedBy: get().profile.handle,
                }
              : c,
          );

          if (u.key === "maintenance_mode") {
            set({ platformControls: { ...get().platformControls, maintenanceMode: parsedValue === "true" } });
          }

          newAudits.push({
            id: uid("audit"),
            actorId: get().profile.handle,
            actorRole: actorRole === "owner" ? "owner" : "super_admin",
            action: "config.update",
            resourceType: "system_config",
            resourceId: u.key,
            configKey: u.key,
            oldValue,
            newValue: parsedValue,
            reason: reason || `Batch configuration update for '${u.key}'`,
            timestamp: Date.now(),
          });
        }

        set({
          systemConfigs: updatedConfigs,
          auditLogs: [...newAudits, ...get().auditLogs],
        });

        return { success: true, message: `${updates.length} configurations updated.` };
      },

      setSystemConfigs: (configs) => set({ systemConfigs: configs }),

      updateCategoryEarningRules: (categoryId, rules, reason = "Owner adjusted category economy rules") => {
        const cat = get().categories.find((c) => c.id === categoryId);
        const updatedCats = get().categories.map((c) =>
          c.id === categoryId ? { ...c, ...rules } : c,
        );
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: "owner",
          action: "update_points",
          postId: "N/A",
          postCaption: `Category ${cat?.name || categoryId} Economy Rules Updated`,
          submitterHandle: "system",
          userSelectedCategory: categoryId,
          approvedCategory: cat?.name || categoryId,
          pointsAwarded: rules.approvalPoints ?? cat?.approvalPoints ?? 0,
          reason: `${reason}. New Base: ${rules.approvalPoints ?? cat?.approvalPoints} pts`,
          timestamp: Date.now(),
        };
        set({
          categories: updatedCats,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      toggleUserWalletFreeze: (userHandle, freeze, reason) => {
        const updatedPeople = get().people.map((p) =>
          p.handle === userHandle ? { ...p, isWalletFrozen: freeze } : p,
        );
        if (get().profile.handle === userHandle) {
          set({ profile: { ...get().profile, isWalletFrozen: freeze } });
        }
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: "owner",
          action: freeze ? "wallet_freeze" : "wallet_unfreeze",
          postId: "N/A",
          postCaption: freeze ? `Wallet Frozen: @${userHandle}` : `Wallet Restored: @${userHandle}`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason: reason || (freeze ? "Emergency Wallet Freeze initiated by Owner" : "Wallet restored by Owner"),
          timestamp: Date.now(),
        };
        set({
          people: updatedPeople,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      grantUserPermission: (userHandle, permission) => {
        const updatedPeople = get().people.map((p) => {
          if (p.handle === userHandle) {
            const current = (p.permissions || []) as AdminPermission[];
            if (!current.includes(permission)) {
              return { ...p, permissions: [...current, permission] };
            }
          }
          return p;
        });
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: "owner",
          action: "grant_permission",
          postId: "N/A",
          postCaption: `Permission Granted: ${permission}`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason: `Delegated permission ${permission} granted to @${userHandle}`,
          timestamp: Date.now(),
        };
        set({
          people: updatedPeople,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      revokeUserPermission: (userHandle, permission) => {
        const updatedPeople = get().people.map((p) => {
          if (p.handle === userHandle) {
            const current = (p.permissions || []) as AdminPermission[];
            return { ...p, permissions: current.filter((perm) => perm !== permission) };
          }
          return p;
        });
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: "owner",
          action: "revoke_permission",
          postId: "N/A",
          postCaption: `Permission Revoked: ${permission}`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason: `Permission ${permission} revoked from @${userHandle}`,
          timestamp: Date.now(),
        };
        set({
          people: updatedPeople,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      setUserPermissions: (userHandle, permissions, actorRole = "owner", reason) => {
        const target = get().people.find((p) => p.handle === userHandle);
        if (!target) return false;

        // Constitutional immutability for Platform Owner
        if (target.role === "owner" || userHandle === "you") {
          return false;
        }

        // Super Admin constraints
        if (actorRole === "super_admin") {
          if (target.role === "super_admin") {
            return false;
          }
          if (permissions.includes("staff.manage")) {
            return false;
          }
        }

        if (actorRole !== "owner" && actorRole !== "super_admin") {
          return false;
        }

        const updatedPeople = get().people.map((p) => {
          if (p.handle === userHandle) {
            return { ...p, permissions: [...permissions] };
          }
          return p;
        });

        let updatedProfile = get().profile;
        if (get().profile.handle === userHandle) {
          updatedProfile = { ...updatedProfile, permissions: [...permissions] };
        }

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "super_admin" ? "super_admin" : "owner",
          action: "update_permissions",
          postId: "N/A",
          postCaption: `Permissions Updated: @${userHandle} (${permissions.length} active)`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: 0,
          reason: reason || `Updated delegated permissions for @${userHandle}: [${permissions.join(", ")}]`,
          timestamp: Date.now(),
        };

        set({
          people: updatedPeople,
          profile: updatedProfile,
          auditLogs: [audit, ...get().auditLogs],
        });

        return true;
      },

      adjustUserPoints: (userHandle, deltaPoints, reason) => {
        const updatedPeople = get().people.map((p) => {
          if (p.handle === userHandle) {
            const current = p.riffPoints || 0;
            return { ...p, riffPoints: Math.max(0, current + deltaPoints) };
          }
          return p;
        });
        if (get().profile.handle === userHandle) {
          const current = get().pointsWallet || 0;
          set({ pointsWallet: Math.max(0, current + deltaPoints) });
        }
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: "owner",
          action: "adjust_points",
          postId: "N/A",
          postCaption: `Points Adjusted: ${deltaPoints > 0 ? "+" : ""}${deltaPoints} pts`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: deltaPoints,
          reason,
          timestamp: Date.now(),
        };
        set({
          people: updatedPeople,
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      // Categories
      categories: CATEGORIES,
      updateCategoryPoints: (categoryId, points) => {
        set({
          categories: get().categories.map((c) => (c.id === categoryId ? { ...c, approvalPoints: points } : c)),
        });
      },
      addCategory: (cat) => {
        set({ categories: [...get().categories, cat] });
      },
      createCategory: (cat, reason = "Staff created new category") => {
        const cleanName = cat.name.trim();
        const cleanSlug = cat.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!cleanName || !cleanSlug) return { success: false, message: "Valid category name and slug are required." };

        const id = cat.id || `cat_${cleanSlug}_${Date.now().toString(36)}`;
        const sortOrder = cat.sortOrder || get().categories.length + 1;
        const newCat: Category = {
          id,
          name: cleanName,
          slug: cleanSlug,
          description: cat.description || "",
          icon: cat.icon || "📁",
          approvalPoints: cat.approvalPoints || 10,
          status: cat.status || "active",
          sortOrder,
          allowedTypes: cat.allowedTypes || "all",
          requiresReview: cat.requiresReview !== false,
          isDefault: Boolean(cat.isDefault),
        };

        let updatedCategories = [...get().categories];
        if (newCat.isDefault) {
          updatedCategories = updatedCategories.map((c) => ({ ...c, isDefault: false }));
        }
        updatedCategories.push(newCat);

        const actorRole = get().profile.role || "creator";
        const validActorRole = actorRole === "owner" || actorRole === "super_admin" || actorRole === "admin" || actorRole === "moderator" ? actorRole : "admin";
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: validActorRole,
          action: "category.create",
          timestamp: Date.now(),
          reason: `${reason}: Created "${cleanName}" (+${newCat.approvalPoints} pts)`,
        };

        set({
          categories: updatedCategories,
          auditLogs: [audit, ...get().auditLogs],
        });

        return { success: true, message: `Category "${cleanName}" created.`, category: newCat };
      },

      updateCategory: (id, updates, reason = "Staff updated category configuration") => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return { success: false, message: "Category not found." };

        const updatedCategories = get().categories.map((c) => {
          if (c.id === id) {
            return { ...c, ...updates };
          }
          if (updates.isDefault) {
            return { ...c, isDefault: false };
          }
          return c;
        });

        const actorRole = get().profile.role || "creator";
        const validActorRole = actorRole === "owner" || actorRole === "super_admin" || actorRole === "admin" || actorRole === "moderator" ? actorRole : "admin";
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: validActorRole,
          action: "category.update",
          timestamp: Date.now(),
          reason: `${reason}: Updated category "${cat.name}"`,
        };

        set({
          categories: updatedCategories,
          auditLogs: [audit, ...get().auditLogs],
        });

        return { success: true, message: `Category "${cat.name}" updated successfully.` };
      },

      toggleCategoryStatus: (id, reason) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return { success: false, message: "Category not found." };
        if (cat.isDefault && cat.status === "active") {
          return { success: false, message: "Cannot disable default fallback category. Set another category as default first." };
        }

        const newStatus: Category["status"] = cat.status === "active" ? "inactive" : "active";
        const updatedCategories = get().categories.map((c) =>
          c.id === id ? { ...c, status: newStatus } : c
        );

        const actorRole = get().profile.role || "creator";
        const validActorRole = actorRole === "owner" || actorRole === "super_admin" || actorRole === "admin" || actorRole === "moderator" ? actorRole : "admin";
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: validActorRole,
          action: "category.status",
          timestamp: Date.now(),
          reason: reason || `Status for category "${cat.name}" toggled to ${newStatus}`,
        };

        set({
          categories: updatedCategories,
          auditLogs: [audit, ...get().auditLogs],
        });

        return { success: true, message: `Category "${cat.name}" is now ${newStatus}.` };
      },

      reorderCategories: (orderedIds, reason = "Staff updated category display sequence") => {
        const currentCats = [...get().categories];
        const updatedCategories = orderedIds
          .map((id, index) => {
            const c = currentCats.find((cat) => cat.id === id);
            return c ? { ...c, sortOrder: index + 1 } : null;
          })
          .filter(Boolean) as Category[];

        currentCats.forEach((c) => {
          if (!orderedIds.includes(c.id)) {
            updatedCategories.push({ ...c, sortOrder: updatedCategories.length + 1 });
          }
        });

        const actorRole = get().profile.role || "creator";
        const validActorRole = actorRole === "owner" || actorRole === "super_admin" || actorRole === "admin" || actorRole === "moderator" ? actorRole : "admin";
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: validActorRole,
          action: "category.reorder",
          timestamp: Date.now(),
          reason,
        };

        set({
          categories: updatedCategories,
          auditLogs: [audit, ...get().auditLogs],
        });

        return { success: true, message: "Categories reordered successfully." };
      },

      setDefaultCategory: (id, reason) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return { success: false, message: "Category not found." };
        if (cat.status !== "active") {
          return { success: false, message: "Only active categories can be designated as default fallback." };
        }

        const updatedCategories = get().categories.map((c) => ({
          ...c,
          isDefault: c.id === id,
        }));

        const actorRole = get().profile.role || "creator";
        const validActorRole = actorRole === "owner" || actorRole === "super_admin" || actorRole === "admin" || actorRole === "moderator" ? actorRole : "admin";
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: validActorRole,
          action: "category.default",
          timestamp: Date.now(),
          reason: reason || `Set "${cat.name}" as default platform fallback category`,
        };

        set({
          categories: updatedCategories,
          auditLogs: [audit, ...get().auditLogs],
        });

        return { success: true, message: `"${cat.name}" is now the default fallback category.` };
      },

      // Posts & Feed State
      posts: INITIAL_POSTS,
      pendingSubmissions: INITIAL_PENDING_SUBMISSIONS,
      rejectedSubmissions: INITIAL_REJECTED_SUBMISSIONS,
      removedSubmissions: INITIAL_REMOVED_SUBMISSIONS,
      reports: INITIAL_REPORTS,
      likedPostIds: [],
      savedPostIds: [],
      followingUserIds: ["rahul", "aanya", "kabir"],
      mutedCategoryIds: [],
      mutedCreatorHandles: [],
      demotedPostIds: [],

      // AI Personalization Interest Profile
      userInterestProfile: {
        cat_tech: 0.85,
        cat_gaming: 0.9,
        cat_dark: 0.8,
        cat_sports: 0.6,
        cat_relatable: 0.75,
        cat_food: 0.5,
        cat_movies: 0.4,
        cat_music: 0.55,
        cat_india: 0.7,
        cat_education: 0.45,
        cat_genz: 0.65,
        cat_relationships: 0.4,
        cat_animals: 0.5,
      },
      adjustInterest: (catId, delta) => {
        const cur = get().userInterestProfile[catId] ?? 0.5;
        const updated = Math.max(0.05, Math.min(1.0, cur + delta));
        set({
          userInterestProfile: { ...get().userInterestProfile, [catId]: updated },
        });
      },

      // Social Interactions
      toggleLikePost: (postId) => {
        const isLiked = get().likedPostIds.includes(postId);
        const likedPostIds = isLiked
          ? get().likedPostIds.filter((id) => id !== postId)
          : [...get().likedPostIds, postId];

        const posts = get().posts.map((p) => {
          if (p.id === postId) {
            const newLikes = Math.max(0, p.likes + (isLiked ? -1 : 1));
            const newScore = computePopularityScore({ ...p, likes: newLikes });
            return { ...p, likes: newLikes, popularityScore: newScore };
          }
          return p;
        });

        // Boost interest if liked
        const post = posts.find((p) => p.id === postId);
        if (post && !isLiked) {
          get().adjustInterest(post.approvedCategoryId || post.userSelectedCategoryId, 0.05);
        }

        set({ likedPostIds, posts });
      },

      toggleSavePost: (postId) => {
        const has = get().savedPostIds.includes(postId);
        set({
          savedPostIds: has ? get().savedPostIds.filter((id) => id !== postId) : [...get().savedPostIds, postId],
        });
      },

      toggleFollowUser: (handleOrId) => {
        const has = get().followingUserIds.includes(handleOrId);
        set({
          followingUserIds: has
            ? get().followingUserIds.filter((id) => id !== handleOrId)
            : [...get().followingUserIds, handleOrId],
        });
      },

      incrementPostViews: (postId) => {
        set({
          posts: get().posts.map((p) => {
            if (p.id === postId) {
              const views = (p.views || 0) + 1;
              const popularityScore = computePopularityScore({ ...p, views });
              return { ...p, views, popularityScore };
            }
            return p;
          }),
        });
      },

      sharePost: (postId) => {
        set({
          posts: get().posts.map((p) => {
            if (p.id === postId) {
              const shares = (p.shares || 0) + 1;
              const popularityScore = computePopularityScore({ ...p, shares });
              return { ...p, shares, popularityScore };
            }
            return p;
          }),
        });
      },

      recordNegativeSignal: (postId, action, categoryId, creatorHandle) => {
        if (action === "not_interested") {
          set({ demotedPostIds: [...get().demotedPostIds, postId] });
          if (categoryId) get().adjustInterest(categoryId, -0.15);
        } else if (action === "mute_category" && categoryId) {
          set({
            mutedCategoryIds: [...get().mutedCategoryIds, categoryId],
            demotedPostIds: [...get().demotedPostIds, postId],
          });
          get().adjustInterest(categoryId, -0.5);
        } else if (action === "mute_creator" && creatorHandle) {
          set({
            mutedCreatorHandles: [...get().mutedCreatorHandles, creatorHandle],
            demotedPostIds: [...get().demotedPostIds, postId],
          });
        } else if (action === "report") {
          get().reportPost({
            postId,
            reason: "Flagged from quick feed options",
          });
        }
      },

      // Comments
      comments: INITIAL_COMMENTS,
      addCommentToPost: (postId, text, parentId) => {
        const newComment: Comment = {
          id: uid("c"),
          postId,
          authorId: YOU_ID,
          authorName: get().profile.name,
          authorHandle: get().profile.handle,
          authorAvatar: "/avatars/you.jpg",
          text: text.trim(),
          likes: 0,
          createdAt: Date.now(),
          parentId,
        };

        const updatedComments = [...get().comments, newComment];
        const updatedPosts = get().posts.map((p) => {
          if (p.id === postId) {
            const commentsCount = p.comments + 1;
            const newScore = computePopularityScore({ ...p, comments: commentsCount });
            return { ...p, comments: commentsCount, popularityScore: newScore };
          }
          return p;
        });

        set({ comments: updatedComments, posts: updatedPosts });
        return newComment;
      },

      likeComment: (commentId) => {
        set({
          comments: get().comments.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c)),
        });
      },

      // Content Submission Flow (Post / Reel)
      submitContent: ({
        type,
        mediaUrl,
        caption,
        topCaption,
        bottomCaption,
        categoryId,
        hashtags,
        aspectRatio = "1:1",
        musicTrack,
        filter,
        speed,
        location,
      }) => {
        const userRole = (get().profile.role as Person["role"]) || "creator";
        const isStaff = userRole === "admin" || userRole === "super_admin" || userRole === "owner" || userRole === "moderator";
        const platformEnabled = get().getSystemConfigValue("platform_enabled", "true") !== "false";
        if (!platformEnabled && !isStaff) {
          throw new Error("Platform submissions are temporarily paused by administration.");
        }

        const maxCaptionLen = Number(get().getSystemConfigValue("max_caption_length", "2200")) || 2200;
        if (caption.trim().length > maxCaptionLen) {
          throw new Error(`Caption exceeds maximum allowed length of ${maxCaptionLen} characters.`);
        }

        let category = get().categories.find((c) => c.id === categoryId);
        if (!category || category.status !== "active") {
          category =
            get().categories.find((c) => c.isDefault && c.status === "active") ||
            get().categories.find((c) => c.status === "active") ||
            get().categories[0];
        }

        const fallbackPostPts = Number(get().getSystemConfigValue("points_per_approved_post", "10")) || 10;
        const fallbackReelPts = Number(get().getSystemConfigValue("points_per_approved_reel", "25")) || 25;
        const points = category.approvalPoints || (type === "reel" ? fallbackReelPts : fallbackPostPts);
        const isAdminRole = userRole === "admin" || userRole === "super_admin" || userRole === "owner";
        const autoApprove = isAdminRole || category.requiresReview === false;

        const newPost: Post = {
          id: uid("p"),
          authorId: YOU_ID,
          authorName: get().profile.name,
          authorHandle: get().profile.handle,
          authorAvatar: "/avatars/you.jpg",
          authorMark: "you",
          authorRole: userRole,
          isVerified: true,
          type,
          mediaUrl,
          caption: caption.trim(),
          topCaption: topCaption?.trim(),
          bottomCaption: bottomCaption?.trim(),
          hashtags,
          userSelectedCategoryId: category.id,
          approvedCategoryId: autoApprove ? category.id : undefined,
          approvalStatus: autoApprove ? "approved" : "under_review",
          pointsAwarded: autoApprove ? points : 0,
          reviewedBy: autoApprove ? (isAdminRole ? get().profile.handle : "system_auto") : undefined,
          reviewedAt: autoApprove ? Date.now() : undefined,
          likes: 0,
          views: 1,
          comments: 0,
          shares: 0,
          saves: 0,
          createdAt: Date.now(),
          popularityScore: 10,
          aspectRatio,
          musicTrack,
          filter,
          speed,
          location,
        };

        if (autoApprove) {
          // Auto-approved! Add directly to live feed and credit points immediately
          let pointsWallet = get().pointsWallet + points;
          const newTx: PointsTransaction = {
            id: uid("tx"),
            userId: YOU_ID,
            amount: points,
            type: "content_approval",
            categoryId: category.id,
            categoryName: category.name,
            categoryIcon: category.icon,
            postId: newPost.id,
            postTitle: newPost.caption || newPost.topCaption || "Auto-Approved Content",
            contentType: newPost.type,
            timestamp: Date.now(),
          };

          const audit: AuditLog = {
            id: uid("audit"),
            actorId: isAdminRole ? get().profile.handle : "system_rules",
            actorRole: userRole === "owner" ? "owner" : userRole === "super_admin" ? "super_admin" : userRole === "admin" ? "admin" : "moderator",
            action: "approve",
            postId: newPost.id,
            postCaption: newPost.caption || newPost.topCaption || "Meme/Reel",
            submitterHandle: get().profile.handle,
            userSelectedCategory: category.id,
            approvedCategory: category.name,
            pointsAwarded: points,
            reason: isAdminRole ? "Staff post auto-published into selected category" : `Category "${category.name}" auto-approved per governance rule`,
            timestamp: Date.now(),
          };

          set({
            posts: [newPost, ...get().posts],
            pointsWallet,
            pointsTransactions: [newTx, ...get().pointsTransactions],
            auditLogs: [audit, ...get().auditLogs],
          });
        } else {
          // Regular creator submission goes into queue for moderation
          set({
            pendingSubmissions: [newPost, ...get().pendingSubmissions],
          });
        }

        return newPost;
      },

      // Admin Review Actions
      auditLogs: INITIAL_AUDIT_LOGS,
      approveSubmission: (submissionId, overrideCategoryId) => {
        const actorRole = (get().profile.role as Person["role"]) || "creator";
        if (
          actorRole !== "moderator" &&
          actorRole !== "admin" &&
          actorRole !== "super_admin" &&
          actorRole !== "owner"
        ) {
          return;
        }

        // Duplicate approval protection
        const alreadyLive = get().posts.some((p) => p.id === submissionId);
        if (alreadyLive) {
          set({
            pendingSubmissions: get().pendingSubmissions.filter((s) => s.id !== submissionId),
          });
          return;
        }

        const submission = get().pendingSubmissions.find((s) => s.id === submissionId);
        if (!submission) return;

        const actorHandle = get().profile.handle;
        const approvedCatId = overrideCategoryId || submission.userSelectedCategoryId;
        const category = get().categories.find((c) => c.id === approvedCatId) || get().categories[0];
        const points = category.approvalPoints;
        const isCategoryChanged = Boolean(overrideCategoryId && overrideCategoryId !== submission.userSelectedCategoryId);

        const livePost: Post = {
          ...submission,
          approvedCategoryId: approvedCatId,
          approvalStatus: isCategoryChanged ? "category_changed" : "approved",
          pointsAwarded: points,
          reviewedBy: actorHandle,
          reviewedAt: Date.now(),
          views: 120,
          popularityScore: computePopularityScore({ ...submission, views: 120, likes: 5 }),
        };

        // If the submitter is current user, award points to wallet
        let pointsWallet = get().pointsWallet;
        let pointsTransactions = get().pointsTransactions;
        let creatorPopularity = get().creatorPopularity;
        const isSelfSubmission =
          submission.authorId === YOU_ID || submission.authorHandle === get().profile.handle;

        if (isSelfSubmission) {
          pointsWallet += points;
          creatorPopularity += 120;
          const newTx: PointsTransaction = {
            id: uid("tx"),
            userId: YOU_ID,
            amount: points,
            type: "content_approval",
            categoryId: category.id,
            categoryName: category.name,
            categoryIcon: category.icon,
            postId: livePost.id,
            postTitle: livePost.caption || livePost.topCaption || "Approved content",
            contentType: livePost.type,
            timestamp: Date.now(),
          };
          pointsTransactions = [newTx, ...pointsTransactions];
        }

        // Check if author was an Admin and category was changed by Super Admin / Owner
        // 5-warning demotion system
        let adminDemoted = false;
        let adminNewWarnings = 0;
        const notifs: Notification[] = [];

        const updatedPeople = get().people.map((p) => {
          if (p.id === submission.authorId || p.handle === submission.authorHandle) {
            let pPopularity = (p.creatorPopularity || 0) + 120;
            let pPoints = (p.riffPoints || 0) + points;
            let pWarnings = p.warningsCount || 0;
            let pRole = p.role;

            if (isCategoryChanged && p.role === "admin") {
              pWarnings += 1;
              adminNewWarnings = pWarnings;
              if (pWarnings >= 5) {
                pRole = "creator";
                adminDemoted = true;
              }
            }

            return {
              ...p,
              creatorPopularity: pPopularity,
              riffPoints: pPoints,
              warningsCount: pWarnings,
              role: pRole,
            };
          }
          return p;
        });

        // Notifications
        if (isCategoryChanged && submission.authorRole === "admin") {
          notifs.push({
            id: uid("notif"),
            userId: submission.authorId,
            type: adminDemoted ? "demoted" : "warning_issued",
            title: adminDemoted ? "Demoted from Admin to Creator ⚠️" : "Category Misclassification Warning ⚠️",
            message: adminDemoted
              ? `You reached 5 category warnings and have been automatically demoted from Admin to Creator.`
              : `Your submission was reclassified to ${category.name} by @${actorHandle}. Warning ${adminNewWarnings}/5.`,
            createdAt: Date.now(),
            isRead: false,
          });
        }

        notifs.push({
          id: uid("notif"),
          userId: submission.authorId,
          type: isCategoryChanged ? "category_changed" : "post_approved",
          title: isCategoryChanged ? `Approved as ${category.name}! ✨` : `Post Approved! 🎉`,
          message: isCategoryChanged
            ? `Your submission was reclassified as ${category.icon} ${category.name} and approved! +${points} RIFF Points credited.`
            : `Your submission was approved in ${category.icon} ${category.name}! +${points} RIFF Points credited.`,
          points,
          postId: livePost.id,
          createdAt: Date.now(),
          isRead: false,
        });

        // Audit Log with authentic actor & role
        const audit: AuditLog = {
          id: uid("audit"),
          actorId: actorHandle,
          actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
          action: isCategoryChanged ? "change_category" : "approve",
          postId: livePost.id,
          postCaption: livePost.caption || livePost.topCaption || "Meme/Reel",
          submitterHandle: livePost.authorHandle,
          userSelectedCategory: submission.userSelectedCategoryId,
          approvedCategory: category.name,
          pointsAwarded: points,
          reason: isCategoryChanged
            ? `Reclassified to ${category.name} (+${points} pts) based on content topic by @${actorHandle} (${actorRole})${adminDemoted ? " - Admin auto-demoted after 5 warnings" : ""}`
            : `Verified content compliance with category quality standards by @${actorHandle} (${actorRole})`,
          timestamp: Date.now(),
        };

        set({
          pendingSubmissions: get().pendingSubmissions.filter((s) => s.id !== submissionId),
          posts: [livePost, ...get().posts],
          people: updatedPeople,
          pointsWallet,
          pointsTransactions,
          creatorPopularity,
          auditLogs: [audit, ...get().auditLogs],
          notifications: [...notifs, ...get().notifications],
        });
      },

      rejectSubmission: (submissionId, reason) => {
        const actorRole = (get().profile.role as Person["role"]) || "creator";
        if (
          actorRole !== "moderator" &&
          actorRole !== "admin" &&
          actorRole !== "super_admin" &&
          actorRole !== "owner"
        ) {
          return;
        }

        const cleanReason = reason?.trim();
        if (!cleanReason) {
          return;
        }

        const submission = get().pendingSubmissions.find((s) => s.id === submissionId);
        if (!submission) return;

        const actorHandle = get().profile.handle;

        const rejectedPost: Post = {
          ...submission,
          approvalStatus: "rejected",
          rejectionReason: cleanReason,
          reviewedBy: actorHandle,
          reviewedAt: Date.now(),
          pointsAwarded: 0,
        };

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: actorHandle,
          actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
          action: "reject",
          postId: submission.id,
          postCaption: submission.caption || submission.topCaption || "Meme/Reel",
          submitterHandle: submission.authorHandle,
          userSelectedCategory: submission.userSelectedCategoryId,
          approvedCategory: "None",
          pointsAwarded: 0,
          reason: `${cleanReason} (Reviewed by @${actorHandle} - ${actorRole})`,
          timestamp: Date.now(),
        };

        const notif: Notification = {
          id: uid("notif"),
          userId: submission.authorId,
          type: "post_rejected",
          title: "Submission Not Approved",
          message: `Your submission could not be approved. Reason: ${cleanReason}`,
          createdAt: Date.now(),
          isRead: false,
        };

        set({
          pendingSubmissions: get().pendingSubmissions.filter((s) => s.id !== submissionId),
          rejectedSubmissions: [rejectedPost, ...(get().rejectedSubmissions || [])],
          auditLogs: [audit, ...get().auditLogs],
          notifications: [notif, ...get().notifications],
        });
      },

      restoreRejectedSubmission: (submissionId) => {
        const actorRole = (get().profile.role as Person["role"]) || "creator";
        if (
          actorRole !== "moderator" &&
          actorRole !== "admin" &&
          actorRole !== "super_admin" &&
          actorRole !== "owner"
        ) {
          return;
        }

        const currentRejected = get().rejectedSubmissions || [];
        const target = currentRejected.find((p) => p.id === submissionId);
        if (!target) return;

        const restoredPost: Post = {
          ...target,
          approvalStatus: "under_review",
          rejectionReason: undefined,
          reviewedBy: undefined,
          reviewedAt: undefined,
        };

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
          action: "update_points",
          postId: target.id,
          postCaption: target.caption || target.topCaption || "Restored Content",
          submitterHandle: target.authorHandle,
          userSelectedCategory: target.userSelectedCategoryId,
          approvedCategory: "Pending",
          pointsAwarded: 0,
          reason: `Rejected submission restored back to review queue by @${get().profile.handle}`,
          timestamp: Date.now(),
        };

        set({
          rejectedSubmissions: currentRejected.filter((p) => p.id !== submissionId),
          pendingSubmissions: [restoredPost, ...get().pendingSubmissions],
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      restoreRemovedSubmission: (submissionId) => {
        const actorRole = (get().profile.role as Person["role"]) || "creator";
        if (actorRole !== "admin" && actorRole !== "super_admin" && actorRole !== "owner") {
          return;
        }

        const currentRemoved = get().removedSubmissions || [];
        const target = currentRemoved.find((p) => p.id === submissionId);
        if (!target) return;

        const restoredPost: Post = {
          ...target,
          approvalStatus: "approved",
          rejectionReason: undefined,
          reviewedBy: get().profile.handle,
          reviewedAt: Date.now(),
        };

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
          action: "approve",
          postId: target.id,
          postCaption: target.caption || target.topCaption || "Restored Content",
          submitterHandle: target.authorHandle,
          userSelectedCategory: target.userSelectedCategoryId,
          approvedCategory: target.approvedCategoryId || "Restored",
          pointsAwarded: target.pointsAwarded || 0,
          reason: `Removed content restored back to live feed by @${get().profile.handle}`,
          timestamp: Date.now(),
        };

        set({
          removedSubmissions: currentRemoved.filter((p) => p.id !== submissionId),
          posts: [restoredPost, ...get().posts],
          auditLogs: [audit, ...get().auditLogs],
        });
      },

      // Community Reports & Moderation
      reportPost: ({ postId, reason, details }) => {
        const post =
          get().posts.find((p) => p.id === postId) ||
          get().pendingSubmissions.find((p) => p.id === postId);
        if (!post) {
          return { success: false, message: "Post not found or already removed." };
        }

        const reporterHandle = get().profile.handle;
        const currentReports = get().reports || [];

        // Duplicate report prevention: cannot submit duplicate open report for same post
        const hasOpenReport = currentReports.some(
          (r) => r.postId === postId && r.reportedBy === reporterHandle && r.status === "open",
        );
        if (hasOpenReport) {
          return {
            success: false,
            message: "You already have an open report for this content under moderator review.",
          };
        }

        const newReport: ContentReport = {
          id: uid("rep"),
          postId,
          postCaption: post.caption || post.topCaption || "Reported Content",
          postMediaUrl: post.mediaUrl,
          postType: post.type,
          creatorHandle: post.authorHandle,
          creatorRole: post.authorRole || "creator",
          reportedBy: reporterHandle,
          reason: reason.trim(),
          details: details?.trim() || undefined,
          status: "open",
          createdAt: Date.now(),
        };

        // Automatically demote from reporter's personal feed
        set({
          reports: [newReport, ...currentReports],
          demotedPostIds: [...get().demotedPostIds, postId],
        });

        return {
          success: true,
          message: "Report submitted. Content will be inspected by the RIFF safety team.",
        };
      },

      resolveReport: (reportId, action, resolutionNote) => {
        const actorRole = (get().profile.role as Person["role"]) || "creator";
        if (
          actorRole !== "moderator" &&
          actorRole !== "admin" &&
          actorRole !== "super_admin" &&
          actorRole !== "owner"
        ) {
          return false;
        }

        const currentReports = get().reports || [];
        const report = currentReports.find((r) => r.id === reportId);
        if (!report) return false;

        const actorHandle = get().profile.handle;
        const targetRole = report.creatorRole || "creator";

        // Role hierarchy: higher level accounts cannot be moderated by lower level
        if (
          action !== "dismiss" &&
          !canPerformModeration(actorRole, targetRole) &&
          report.creatorHandle !== actorHandle
        ) {
          return false;
        }

        const cleanNote = resolutionNote?.trim() || "Resolved by moderator.";

        if (action === "dismiss") {
          const updatedReports = currentReports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: "dismissed" as const,
                  reviewedBy: actorHandle,
                  reviewedAt: Date.now(),
                  resolutionNote: cleanNote,
                  actionTaken: "dismissed" as const,
                }
              : r,
          );

          const audit: AuditLog = {
            id: uid("audit"),
            actorId: actorHandle,
            actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
            action: "report_dismissed",
            postId: report.postId,
            postCaption: report.postCaption,
            submitterHandle: report.creatorHandle,
            userSelectedCategory: "N/A",
            approvedCategory: "N/A",
            pointsAwarded: 0,
            reason: `Report #${report.id} dismissed by @${actorHandle}. Note: ${cleanNote}`,
            timestamp: Date.now(),
          };

          set({
            reports: updatedReports,
            auditLogs: [audit, ...get().auditLogs],
          });
          return true;
        }

        if (action === "remove_content") {
          const updatedReports = currentReports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: "actioned" as const,
                  reviewedBy: actorHandle,
                  reviewedAt: Date.now(),
                  resolutionNote: cleanNote,
                  actionTaken: "content_removed" as const,
                }
              : r,
          );

          const audit: AuditLog = {
            id: uid("audit"),
            actorId: actorHandle,
            actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
            action: "report_actioned",
            postId: report.postId,
            postCaption: report.postCaption,
            submitterHandle: report.creatorHandle,
            userSelectedCategory: "N/A",
            approvedCategory: "N/A",
            pointsAwarded: 0,
            reason: `Content removed due to valid report #${report.id}. Note: ${cleanNote}`,
            timestamp: Date.now(),
          };

          const notif: Notification = {
            id: uid("notif"),
            userId: report.creatorHandle,
            type: "warning_issued",
            title: "Post Removed by Moderation ⚠️",
            message: `Your post was removed following community review. Note: ${cleanNote}`,
            createdAt: Date.now(),
            isRead: false,
          };

          set({
            reports: updatedReports,
            posts: get().posts.filter((p) => p.id !== report.postId),
            pendingSubmissions: get().pendingSubmissions.filter((p) => p.id !== report.postId),
            auditLogs: [audit, ...get().auditLogs],
            notifications: [notif, ...get().notifications],
          });
          return true;
        }

        if (action === "warn_user") {
          // Self-warning protection
          if (report.creatorHandle === actorHandle) {
            return false;
          }

          const updatedReports = currentReports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: "actioned" as const,
                  reviewedBy: actorHandle,
                  reviewedAt: Date.now(),
                  resolutionNote: cleanNote,
                  actionTaken: "user_warned" as const,
                }
              : r,
          );

          // Call existing issueWarning logic which increments warnings and handles 5-warning demotion
          get().issueWarning(
            report.creatorHandle,
            `Community report #${report.id}: ${cleanNote}`,
            actorRole,
          );

          const audit: AuditLog = {
            id: uid("audit"),
            actorId: actorHandle,
            actorRole: actorRole === "owner" ? "owner" : actorRole === "super_admin" ? "super_admin" : "admin",
            action: "report_actioned",
            postId: report.postId,
            postCaption: report.postCaption,
            submitterHandle: report.creatorHandle,
            userSelectedCategory: "N/A",
            approvedCategory: "N/A",
            pointsAwarded: 0,
            reason: `Warning issued to @${report.creatorHandle} for report #${report.id}. Content removed. Note: ${cleanNote}`,
            timestamp: Date.now(),
          };

          set({
            reports: updatedReports,
            posts: get().posts.filter((p) => p.id !== report.postId),
            pendingSubmissions: get().pendingSubmissions.filter((p) => p.id !== report.postId),
            auditLogs: [audit, ...get().auditLogs],
          });
          return true;
        }

        return false;
      },

      // Points & Wallet (Private to logged-in user)
      pointsWallet: 70,
      pointsTransactions: INITIAL_POINTS_TXS,
      creatorPopularity: 87400,

      // Streaks & Daily Login Rewards
      streak: DEFAULT_STREAK,
      claimDailyReward: () => {
        const s = get();
        const status = evaluateStreakStatus(s.streak);
        if (!status.canClaim) {
          return {
            success: false,
            pointsAwarded: 0,
            newStreak: s.streak?.currentStreak || 0,
            message: "Daily reward already claimed today! Check back tomorrow.",
          };
        }

        const today = getLocalDateString();
        const newStreak = status.nextStreakOnClaim;
        const pointsAwarded = status.rewardTier.points;
        const bestStreak = Math.max(s.streak?.bestStreak || 0, newStreak);

        const newTx: PointsTransaction = {
          id: uid("tx_daily"),
          userId: s.profile?.handle || "you",
          type: "bonus",
          amount: pointsAwarded,
          postTitle: `🔥 Day ${newStreak} Streak · Daily Login Reward`,
          contentType: "post",
          timestamp: Date.now(),
        };

        const updatedStreak: StreakData = {
          currentStreak: newStreak,
          bestStreak,
          lastClaimDate: today,
          totalDaysClaimed: (s.streak?.totalDaysClaimed || 0) + 1,
        };

        set({
          streak: updatedStreak,
          pointsWallet: (s.pointsWallet || 0) + pointsAwarded,
          pointsTransactions: [newTx, ...(s.pointsTransactions || [])],
        });

        return {
          success: true,
          pointsAwarded,
          newStreak,
          message: `Claimed +${pointsAwarded} RIFF Points for Day ${newStreak} Streak! 🔥`,
        };
      },

      // Withdrawals & Financial Escrow
      withdrawals: INITIAL_WITHDRAWALS,
      requestWithdrawal: (input) => {
        const { emergencyWalletFreeze, pointConversionRate } = get().platformControls;

        if (emergencyWalletFreeze) {
          return {
            success: false,
            message: "Withdrawals are temporarily halted due to an Emergency Platform Payout Freeze. Please try again later.",
          };
        }

        const riffPointsEnabled = get().getSystemConfigValue("riff_points_enabled", "true") !== "false";
        if (!riffPointsEnabled) {
          return {
            success: false,
            message: "RIFF Points reward economy is currently paused by platform administrator.",
          };
        }

        const creatorRewardEnabled = get().getSystemConfigValue("creator_reward_enabled", "true") !== "false";
        if (!creatorRewardEnabled) {
          return {
            success: false,
            message: "Creator monetary rewards and cashouts are currently disabled by platform administrator.",
          };
        }

        const me = get().profile;
        if (me.isWalletFrozen) {
          return {
            success: false,
            message: "Your creator wallet is currently frozen by platform governance. Contact support.",
          };
        }

        const rate = pointConversionRate || 0.5;
        const requiredPoints = Math.ceil(input.amount / rate);

        const minPointsCfg = Number(get().getSystemConfigValue("minimum_withdrawal_points", "1000")) || 1000;
        const maxPointsCfg = Number(get().getSystemConfigValue("maximum_withdrawal_points", "100000")) || 100000;
        const dailyLimitCfg = Number(get().getSystemConfigValue("daily_withdrawal_limit", "100000")) || 100000;

        if (requiredPoints < minPointsCfg) {
          return {
            success: false,
            message: `Minimum withdrawal is ${minPointsCfg.toLocaleString()} points (₹${(minPointsCfg * rate).toLocaleString()}).`,
          };
        }

        if (requiredPoints > maxPointsCfg) {
          return {
            success: false,
            message: `Maximum withdrawal per transaction is ${maxPointsCfg.toLocaleString()} points (₹${(maxPointsCfg * rate).toLocaleString()}).`,
          };
        }

        // Daily limit check across last 24h
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recent24hPoints = (get().withdrawals || [])
          .filter((w) => w.userHandle === me.handle && w.createdAt > oneDayAgo && w.status !== "failed")
          .reduce((sum, w) => sum + (w.pointsEquivalent || Math.ceil(w.amount / rate)), 0);

        if (recent24hPoints + requiredPoints > dailyLimitCfg) {
          return {
            success: false,
            message: `Daily withdrawal limit exceeded. You have withdrawn ${recent24hPoints.toLocaleString()} points in the last 24h (Max: ${dailyLimitCfg.toLocaleString()} pts).`,
          };
        }
        const currentPoints = get().pointsWallet || 0;

        if (currentPoints < requiredPoints) {
          return {
            success: false,
            message: `Insufficient RIFF Points. You need ${requiredPoints.toLocaleString()} points for ₹${input.amount.toLocaleString()} (Available: ${currentPoints.toLocaleString()} pts).`,
          };
        }

        const newPoints = currentPoints - requiredPoints;
        const wthId = uid("wth");
        const newWithdrawal: WithdrawalRequest = {
          id: wthId,
          userId: me.handle,
          userHandle: me.handle,
          userName: me.name,
          amount: input.amount,
          pointsEquivalent: requiredPoints,
          paymentMethod: input.method,
          paymentDetails: input.details,
          status: "pending",
          idempotencyKey: `withdrawal:${wthId}`,
          createdAt: Date.now(),
        };

        const tx: PointsTransaction = {
          id: uid("ptx"),
          userId: me.handle,
          amount: -requiredPoints,
          type: "adjustment",
          postTitle: `Cashout Escrow Hold (₹${input.amount})`,
          contentType: "post",
          timestamp: Date.now(),
        };

        const updatedPeople = get().people.map((p) =>
          p.handle === me.handle ? { ...p, riffPoints: newPoints } : p,
        );

        set({
          pointsWallet: newPoints,
          profile: { ...me, riffPoints: newPoints },
          people: updatedPeople,
          withdrawals: [newWithdrawal, ...get().withdrawals],
          pointsTransactions: [tx, ...get().pointsTransactions],
        });

        return {
          success: true,
          message: `Withdrawal request for ₹${input.amount.toLocaleString()} submitted! Moved to escrow review.`,
          withdrawalId: wthId,
        };
      },

      settleWithdrawal: (withdrawalId, actorRole = "admin", note) => {
        const wth = get().withdrawals.find((w) => w.id === withdrawalId);
        if (!wth || wth.status !== "pending") return false;

        const updatedWithdrawals = get().withdrawals.map((w) =>
          w.id === withdrawalId
            ? {
                ...w,
                status: "completed" as const,
                processedAt: Date.now(),
                adminNote: note || `Payout of ₹${w.amount} approved and settled via ${w.paymentMethod.toUpperCase()}`,
              }
            : w,
        );

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "admin",
          action: "withdrawal_settled",
          postId: "N/A",
          postCaption: `Withdrawal Settled: ₹${wth.amount} via ${wth.paymentMethod.toUpperCase()}`,
          submitterHandle: wth.userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: wth.pointsEquivalent,
          reason: note || `Payout of ₹${wth.amount} settled to creator by ${actorRole}`,
          timestamp: Date.now(),
        };

        const notif: Notification = {
          id: uid("notif"),
          userId: wth.userHandle,
          type: "points_earned",
          title: "Payout Settled! 💰",
          message: `Your withdrawal of ₹${wth.amount} has been successfully processed and transferred to your ${wth.paymentMethod === "upi" ? "UPI account" : "bank account"}.`,
          createdAt: Date.now(),
          isRead: false,
        };

        set({
          withdrawals: updatedWithdrawals,
          auditLogs: [audit, ...get().auditLogs],
          notifications: [notif, ...get().notifications],
        });
        return true;
      },

      rejectAndRefundWithdrawal: (withdrawalId, reason, actorRole = "admin") => {
        const wth = get().withdrawals.find((w) => w.id === withdrawalId);
        if (!wth || wth.status !== "pending") return false;

        const refundPoints = wth.pointsEquivalent;
        const userHandle = wth.userHandle;

        const updatedPeople = get().people.map((p) =>
          p.handle === userHandle ? { ...p, riffPoints: (p.riffPoints || 0) + refundPoints } : p,
        );

        let updatedWallet = get().pointsWallet;
        let updatedProfile = get().profile;
        if (get().profile.handle === userHandle) {
          updatedWallet += refundPoints;
          updatedProfile = { ...updatedProfile, riffPoints: updatedWallet };
        }

        const updatedWithdrawals = get().withdrawals.map((w) =>
          w.id === withdrawalId
            ? {
                ...w,
                status: "failed" as const,
                processedAt: Date.now(),
                adminNote: reason,
              }
            : w,
        );

        const refundTx: PointsTransaction = {
          id: uid("ptx"),
          userId: userHandle,
          amount: refundPoints,
          type: "adjustment",
          postTitle: `Cashout Refund · ${reason}`,
          contentType: "post",
          timestamp: Date.now(),
        };

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "admin",
          action: "withdrawal_refunded",
          postId: "N/A",
          postCaption: `Withdrawal Rejected & Refunded: ₹${wth.amount}`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: refundPoints,
          reason: `Payout rejected: ${reason}. Refunded ${refundPoints} pts back to wallet.`,
          timestamp: Date.now(),
        };

        const notif: Notification = {
          id: uid("notif"),
          userId: userHandle,
          type: "warning_issued",
          title: "Withdrawal Rejected & Refunded ⚠️",
          message: `Your withdrawal request for ₹${wth.amount} was rejected (${reason}). ${refundPoints} points have been refunded to your wallet.`,
          createdAt: Date.now(),
          isRead: false,
        };

        set({
          withdrawals: updatedWithdrawals,
          people: updatedPeople,
          profile: updatedProfile,
          pointsWallet: updatedWallet,
          pointsTransactions: [refundTx, ...get().pointsTransactions],
          auditLogs: [audit, ...get().auditLogs],
          notifications: [notif, ...get().notifications],
        });
        return true;
      },

      flagFreezeAndRejectWithdrawal: (withdrawalId, reason, actorRole = "admin") => {
        const wth = get().withdrawals.find((w) => w.id === withdrawalId);
        if (!wth || wth.status !== "pending") return false;

        const userHandle = wth.userHandle;
        const refundPoints = wth.pointsEquivalent;

        // 1. Freeze user's wallet
        const updatedPeople = get().people.map((p) =>
          p.handle === userHandle ? { ...p, isWalletFrozen: true, riffPoints: (p.riffPoints || 0) + refundPoints } : p,
        );

        let updatedWallet = get().pointsWallet;
        let updatedProfile = get().profile;
        if (get().profile.handle === userHandle) {
          updatedWallet += refundPoints;
          updatedProfile = { ...updatedProfile, isWalletFrozen: true, riffPoints: updatedWallet };
        }

        const updatedWithdrawals = get().withdrawals.map((w) =>
          w.id === withdrawalId
            ? {
                ...w,
                status: "failed" as const,
                processedAt: Date.now(),
                adminNote: `FLAGGED & FROZEN: ${reason}`,
              }
            : w,
        );

        const audit: AuditLog = {
          id: uid("audit"),
          actorId: get().profile.handle,
          actorRole: actorRole === "owner" ? "owner" : "admin",
          action: "withdrawal_frozen",
          postId: "N/A",
          postCaption: `Account Flagged & Frozen on Withdrawal: @${userHandle}`,
          submitterHandle: userHandle,
          userSelectedCategory: "N/A",
          approvedCategory: "N/A",
          pointsAwarded: refundPoints,
          reason: `Suspicious payout attempt flagged: ${reason}. Wallet frozen and ${refundPoints} pts held.`,
          timestamp: Date.now(),
        };

        const notif: Notification = {
          id: uid("notif"),
          userId: userHandle,
          type: "warning_issued",
          title: "Account & Payout Frozen 🚨",
          message: `Your withdrawal for ₹${wth.amount} was flagged for compliance review. Your wallet has been temporarily frozen. Contact governance support.`,
          createdAt: Date.now(),
          isRead: false,
        };

        set({
          withdrawals: updatedWithdrawals,
          people: updatedPeople,
          profile: updatedProfile,
          pointsWallet: updatedWallet,
          auditLogs: [audit, ...get().auditLogs],
          notifications: [notif, ...get().notifications],
        });
        return true;
      },

      // Notifications
      notifications: INITIAL_NOTIFICATIONS,
      markNotificationRead: (id) => {
        set({
          notifications: get().notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        });
      },
      clearAllNotifications: () => {
        set({
          notifications: get().notifications.map((n) => ({ ...n, isRead: true })),
        });
      },

      // Direct Messaging
      chats: CHATS,
      messages: MESSAGES,
      sendTextMessage: (chatId, text) => {
        const msg: Message = {
          id: uid("msg"),
          chatId,
          authorId: YOU_ID,
          kind: "text",
          text: text.trim(),
          createdAt: Date.now(),
        };
        const updatedMessages = [...get().messages, msg];
        const updatedChats = get().chats.map((c) =>
          c.id === chatId ? { ...c, lastMessage: text.trim(), lastAt: Date.now(), unread: 0 } : c,
        );
        set({ messages: updatedMessages, chats: updatedChats });
      },
      sendMemeMessage: (chatId, mediaUrl) => {
        const msg: Message = {
          id: uid("msg"),
          chatId,
          authorId: YOU_ID,
          kind: "meme",
          text: mediaUrl,
          createdAt: Date.now(),
        };
        const updatedMessages = [...get().messages, msg];
        const updatedChats = get().chats.map((c) =>
          c.id === chatId ? { ...c, lastMessage: "Sent a meme 🖼️", lastAt: Date.now(), unread: 0 } : c,
        );
        set({ messages: updatedMessages, chats: updatedChats });
      },
      markChatRead: (chatId) => {
        set({
          chats: get().chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)),
        });
      },

      // -------------------------------------------------------------
      // Backwards Compatibility for existing legacy components
      // -------------------------------------------------------------
      joinedHubIds: [],
      heatedIds: [],
      savedIds: [],
      extraMemes: [],
      extraComments: [],
      extraMessages: [],
      readChatIds: [],
      wallet: 1240,
      txs: STARTER_TX,
      submissions: [],
      battle: BATTLE,
      vote: null,
      imageGens: 0,
      sessionScenes: [],
      toggleHub: (id) => {
        const has = get().joinedHubIds.includes(id);
        set({
          joinedHubIds: has ? get().joinedHubIds.filter((x) => x !== id) : [...get().joinedHubIds, id],
        });
      },
      toggleHeat: (id) => {
        get().toggleLikePost(id);
      },
      toggleSave: (id) => {
        get().toggleSavePost(id);
      },
      postMeme: ({ image, top, bottom, hubId, parentId }) => {
        const meme: Meme = {
          id: uid("m"),
          authorId: YOU_ID,
          hubId,
          image,
          top: top.trim(),
          bottom: bottom.trim(),
          likes: 0,
          remixes: 0,
          comments: 0,
          parentId,
          createdAt: Date.now(),
          heat: 28,
        };
        const extraMemes = [meme, ...get().extraMemes];
        set({ extraMemes });
        return meme;
      },
      addComment: (memeId, text) => {
        get().addCommentToPost(memeId, text);
      },
      sendText: (chatId, text) => {
        get().sendTextMessage(chatId, text);
      },
      sendMeme: (chatId, memeId) => {
        get().sendMemeMessage(chatId, memeId);
      },
      sendSound: (chatId, soundId) => {
        const msg: Message = {
          id: uid("msg"),
          chatId,
          authorId: YOU_ID,
          kind: "sound",
          soundId,
          createdAt: Date.now(),
        };
        set({ messages: [...get().messages, msg] });
      },
      markRead: (chatId) => {
        get().markChatRead(chatId);
      },
      voteBattle: (side) => {
        if (get().vote) return;
        const battle = { ...get().battle };
        if (side === "left") battle.leftVotes += 1;
        else battle.rightVotes += 1;
        set({ vote: side, battle });
      },
      addScene: (src, label) =>
        set({
          sessionScenes: [{ id: uid("sc"), src, label }, ...get().sessionScenes].slice(0, 8),
        }),
      bumpGens: () => set({ imageGens: get().imageGens + 1 }),
    }),
    {
      name: "riff-v2-social",
      version: 8,
      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        // Elevate Abhishek Gawade / default user to Owner
        const existingProfile = persistedState.profile || {};
        const isOwnerCandidate =
          existingProfile.handle === "you" ||
          existingProfile.handle === "abhishek" ||
          existingProfile.name === "You" ||
          !existingProfile.name ||
          existingProfile.name?.toLowerCase().includes("abhishek");

        if (isOwnerCandidate) {
          existingProfile.name = "Abhishek Gawade";
          existingProfile.handle = "abhishek";
          existingProfile.role = "owner";
          existingProfile.bio = "Platform Owner & Founder · RIFF Studio. Building the future of viral media.";
          existingProfile.instagramHandle = existingProfile.instagramHandle || "abhishek_on_riff";
        }

        // Normalize inflated wallet points (e.g. 2840 or 2990) down to realistic creator points (~70 pts)
        let normalizedWallet = typeof persistedState.pointsWallet === "number" ? persistedState.pointsWallet : 70;
        if (normalizedWallet > 200) {
          normalizedWallet = 70;
        }

        // Strip out any obsolete dummy seed posts (post_1 ... post_8, sub_1 ... sub_3, etc.)
        const DUMMY_PREFIXES = ["post_", "sub_", "rej_"];
        const cleanedPosts = Array.isArray(persistedState.posts)
          ? persistedState.posts.filter((p: any) => p && !DUMMY_PREFIXES.some((prefix) => p.id?.startsWith(prefix)))
          : [];

        return {
          ...persistedState,
          profile: existingProfile,
          pointsWallet: normalizedWallet,
          categories: Array.isArray(persistedState.categories) && persistedState.categories.length > 0 ? persistedState.categories : CATEGORIES,
          posts: cleanedPosts,
          pendingSubmissions: Array.isArray(persistedState.pendingSubmissions)
            ? persistedState.pendingSubmissions.filter((p: any) => p && !DUMMY_PREFIXES.some((prefix) => p.id?.startsWith(prefix)))
            : [],
          likedPostIds: Array.isArray(persistedState.likedPostIds)
            ? persistedState.likedPostIds.filter((id: string) => !DUMMY_PREFIXES.some((prefix) => id?.startsWith(prefix)))
            : [],
          savedPostIds: Array.isArray(persistedState.savedPostIds)
            ? persistedState.savedPostIds.filter((id: string) => !DUMMY_PREFIXES.some((prefix) => id?.startsWith(prefix)))
            : [],
          followingUserIds: Array.isArray(persistedState.followingUserIds) ? persistedState.followingUserIds : [],
          mutedCategoryIds: Array.isArray(persistedState.mutedCategoryIds) ? persistedState.mutedCategoryIds : [],
          mutedCreatorHandles: Array.isArray(persistedState.mutedCreatorHandles) ? persistedState.mutedCreatorHandles : [],
          demotedPostIds: Array.isArray(persistedState.demotedPostIds) ? persistedState.demotedPostIds : [],
          comments: Array.isArray(persistedState.comments)
            ? persistedState.comments.filter((c: any) => c && !DUMMY_PREFIXES.some((prefix) => c.postId?.startsWith(prefix)))
            : [],
          userInterestProfile: persistedState.userInterestProfile && typeof persistedState.userInterestProfile === "object" ? persistedState.userInterestProfile : {},
          chats: Array.isArray(persistedState.chats) ? persistedState.chats : CHATS,
          messages: Array.isArray(persistedState.messages) ? persistedState.messages : MESSAGES,
          platformControls: persistedState.platformControls || DEFAULT_PLATFORM_CONTROLS,
          withdrawals: Array.isArray(persistedState.withdrawals) && persistedState.withdrawals.length > 0 ? persistedState.withdrawals : INITIAL_WITHDRAWALS,
          streak: persistedState.streak && typeof persistedState.streak === "object"
            ? { ...DEFAULT_STREAK, ...persistedState.streak }
            : DEFAULT_STREAK,
        };
      },
      partialize: (s) => ({
        profile: s.profile,
        categories: s.categories,
        posts: s.posts,
        pendingSubmissions: s.pendingSubmissions,
        likedPostIds: s.likedPostIds,
        savedPostIds: s.savedPostIds,
        followingUserIds: s.followingUserIds,
        mutedCategoryIds: s.mutedCategoryIds,
        mutedCreatorHandles: s.mutedCreatorHandles,
        demotedPostIds: s.demotedPostIds,
        comments: s.comments,
        pointsWallet: s.pointsWallet,
        pointsTransactions: s.pointsTransactions,
        creatorPopularity: s.creatorPopularity,
        streak: s.streak,
        userInterestProfile: s.userInterestProfile,
        notifications: s.notifications,
        chats: s.chats,
        messages: s.messages,
        auditLogs: s.auditLogs,
        platformControls: s.platformControls,
        withdrawals: s.withdrawals,
      }),
    },
  ),
);

// Backward compatibility helper hooks
export function useMemes(): Meme[] {
  const posts = useRiff((s) => s.posts);
  return posts.map((p) => ({
    id: p.id,
    authorId: p.authorId,
    hubId: p.approvedCategoryId || p.userSelectedCategoryId,
    image: p.mediaUrl,
    top: p.topCaption || p.caption,
    bottom: p.bottomCaption || "",
    likes: p.likes,
    remixes: p.shares,
    comments: p.comments,
    createdAt: p.createdAt,
    heat: Math.min(100, Math.round(p.popularityScore / 1000)),
  }));
}

export function useMeme(id: string | undefined): Meme | undefined {
  const memes = useMemes();
  return memes.find((m) => m.id === id);
}

export function usePost(id: string | undefined): Post | undefined {
  const posts = useRiff((s) => s.posts);
  const pending = useRiff((s) => s.pendingSubmissions);
  return posts.find((p) => p.id === id) || pending.find((p) => p.id === id);
}

export function useComments(postId: string) {
  const comments = useRiff((s) => s.comments);
  return comments.filter((c) => c.postId === postId || c.memeId === postId).sort((a, b) => a.createdAt - b.createdAt);
}

export function useMessages(chatId: string) {
  const messages = useRiff((s) => s.messages);
  return messages.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt - b.createdAt);
}

export function useChats() {
  const chats = useRiff((s) => s.chats);
  return chats.sort((a, b) => b.lastAt - a.lastAt);
}
