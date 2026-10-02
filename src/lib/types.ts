export type Person = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  role: "creator" | "brand" | "moderator" | "admin" | "super_admin" | "owner";
  followers: number;
  following?: number;
  mark: "you" | "aanya" | "kabir" | "mira" | "zane" | "priya" | "nova" | "pitch";
  instagramHandle?: string;
  creatorPopularity?: number;
  riffPoints?: number;
  warningsCount?: number;
  isBanned?: boolean;
  isWalletFrozen?: boolean;
  permissions?: AdminPermission[];
};

export type AdminPermission =
  | "submission.review"
  | "category.manage"
  | "moderation.manage"
  | "appeal.review"
  | "campaign.manage"
  | "withdrawal.review"
  | "wallet.view"
  | "audit.view"
  | "staff.manage";

export type PermissionCatalogItem = {
  key: AdminPermission;
  name: string;
  description: string;
  category: "moderation" | "economy" | "system";
};

export const ADMIN_PERMISSIONS_CATALOG: PermissionCatalogItem[] = [
  {
    key: "submission.review",
    name: "Review Submissions",
    description: "Inspect, approve, and reject creator content submissions",
    category: "moderation",
  },
  {
    key: "category.manage",
    name: "Manage Categories",
    description: "Reclassify submission tags and tune category points",
    category: "economy",
  },
  {
    key: "moderation.manage",
    name: "Community Moderation",
    description: "Triage reports, issue warnings, and take down flagged content",
    category: "moderation",
  },
  {
    key: "appeal.review",
    name: "Review Appeals",
    description: "Arbitrate disputes and appeals on rejected content",
    category: "moderation",
  },
  {
    key: "campaign.manage",
    name: "Campaign Operations",
    description: "Create, edit, and supervise brand briefs and sponsored challenges",
    category: "economy",
  },
  {
    key: "withdrawal.review",
    name: "Withdrawal Review",
    description: "Inspect creator cashouts and verify payout legitimacy",
    category: "economy",
  },
  {
    key: "wallet.view",
    name: "View Wallets",
    description: "Inspect user balances, transaction histories, and earning ledgers",
    category: "economy",
  },
  {
    key: "audit.view",
    name: "View Audit Trail",
    description: "Read cryptographic governance and operational audit logs",
    category: "system",
  },
  {
    key: "staff.manage",
    name: "Manage Staff Roles",
    description: "Supervise staff, issue warnings, and delegate granular permissions",
    category: "system",
  },
];

export type PermissionPreset = {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  recommendedFor: Person["role"];
};

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: "review_specialist",
    name: "Content Reviewer",
    description: "Focused purely on submission approval, reclassification, and appeals",
    permissions: ["submission.review", "category.manage", "appeal.review"],
    recommendedFor: "admin",
  },
  {
    id: "community_guardian",
    name: "Community Guardian",
    description: "Focused on safety, resolving user reports, and moderation warnings",
    permissions: ["moderation.manage", "submission.review", "appeal.review"],
    recommendedFor: "moderator",
  },
  {
    id: "economy_officer",
    name: "Economy Officer",
    description: "Oversees category reward points, brand briefs, and wallet transactions",
    permissions: ["category.manage", "campaign.manage", "withdrawal.review", "wallet.view"],
    recommendedFor: "admin",
  },
  {
    id: "senior_admin",
    name: "Senior Administrator",
    description: "Comprehensive operational permissions across moderation, economy, and audit",
    permissions: [
      "submission.review",
      "category.manage",
      "moderation.manage",
      "appeal.review",
      "campaign.manage",
      "withdrawal.review",
      "wallet.view",
      "audit.view",
    ],
    recommendedFor: "admin",
  },
];

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  approvalPoints: number;
  status: "active" | "inactive" | "archived";
  sortOrder?: number;
  allowedTypes?: "all" | "post" | "reel";
  requiresReview?: boolean;
  isDefault?: boolean;
  bonusPer1000Views?: number;
  bonusPer100Likes?: number;
  maxRewardCeiling?: number;
};

export type PlatformControls = {
  maintenanceMode: boolean;
  submissionsPaused: boolean;
  renderFarmEcoMode: boolean;
  emergencyWalletFreeze: boolean;
  aiModerationSensitivity: "strict" | "balanced" | "permissive";
  pointConversionRate: number; // e.g. 0.50 (₹0.50 per point)
  minWithdrawalThreshold: number; // e.g. 100 (₹100)
  maxDailyWithdrawalLimit: number; // e.g. 10000 (₹10,000)
  payoutProcessingFeePercent: number; // e.g. 2 (2%)
};

export type WithdrawalRequest = {
  id: string;
  userId: string;
  userHandle: string;
  userName: string;
  amount: number; // INR
  pointsEquivalent: number;
  paymentMethod: "upi" | "bank_transfer";
  paymentDetails: {
    upiId?: string;
    accountNumber?: string;
    ifsc?: string;
    holderName?: string;
    [key: string]: unknown;
  };
  status: "pending" | "processing" | "completed" | "failed";
  idempotencyKey?: string;
  adminNote?: string;
  createdAt: number;
  processedAt?: number;
};

export type ContentType = "post" | "reel" | "gif";
export type ApprovalStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "category_changed"
  | "rejected"
  | "removed";

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorMark?: Person["mark"];
  authorRole?: Person["role"];
  isVerified?: boolean;
  type: ContentType;
  mediaUrl: string;
  caption: string;
  topCaption?: string;
  bottomCaption?: string;
  hashtags: string[];
  userSelectedCategoryId: string;
  approvedCategoryId?: string;
  approvalStatus: ApprovalStatus;
  pointsAwarded: number;
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;
  likes: number;
  views: number;
  comments: number;
  shares: number;
  saves: number;
  createdAt: number;
  aspectRatio?: "9:16" | "1:1" | "4:5";
  musicTrack?: { title: string; artist: string; isTrending?: boolean };
  filter?: string;
  speed?: number;
  stickers?: { emoji: string; x: number; y: number }[];
  location?: string;
  popularityScore: number;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  text: string;
  likes: number;
  createdAt: number;
  parentId?: string; // For nested replies
  memeId?: string; // Backwards compatibility with old seed
};

export type PointsTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: "content_approval" | "bonus" | "adjustment";
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  postId?: string;
  postTitle: string;
  contentType: ContentType;
  timestamp: number;
};

export type ReportStatus = "open" | "reviewed" | "actioned" | "dismissed";
export type ReportActionTaken = "dismissed" | "content_removed" | "user_warned";

export type ContentReport = {
  id: string;
  postId: string;
  postCaption: string;
  postMediaUrl: string;
  postType: ContentType;
  creatorHandle: string;
  creatorRole?: Person["role"];
  reportedBy: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  resolutionNote?: string;
  actionTaken?: ReportActionTaken;
};

export type AuditLog = {
  id: string;
  actorId: string;
  actorRole: "owner" | "super_admin" | "admin" | "moderator" | "system";
  action:
    | "approve"
    | "change_category"
    | "reject"
    | "update_points"
    | "create_category"
    | "category.create"
    | "category.update"
    | "category.status"
    | "category.reorder"
    | "category.default"
    | "delete_post"
    | "issue_warning"
    | "reset_warnings"
    | "arbitrate_review"
    | "demote_admin"
    | "ban_user"
    | "unban_user"
    | "report_actioned"
    | "report_dismissed"
    | "platform_control_update"
    | "wallet_freeze"
    | "wallet_unfreeze"
    | "grant_permission"
    | "revoke_permission"
    | "update_permissions"
    | "staff.permissions_update"
    | "staff.role_change"
    | "adjust_points"
    | "withdrawal_settled"
    | "withdrawal_rejected"
    | "withdrawal_refunded"
    | "withdrawal_frozen"
    | "economy_levers_update"
    | "config.update"
    | "config.batch_update";
  postId?: string;
  postCaption?: string;
  submitterHandle?: string;
  userSelectedCategory?: string;
  approvedCategory?: string;
  pointsAwarded?: number;
  reason?: string;
  resourceType?: string;
  resourceId?: string;
  configKey?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: number;
};

export type Notification = {
  id: string;
  userId: string;
  type:
    | "post_approved"
    | "category_changed"
    | "post_rejected"
    | "points_earned"
    | "like"
    | "comment"
    | "follow"
    | "featured"
    | "warning_issued"
    | "demoted"
    | "account_banned";
  title: string;
  message: string;
  points?: number;
  postId?: string;
  createdAt: number;
  isRead: boolean;
};

export type UserInterestProfile = Record<string, number>; // categoryId -> weight 0.0 - 1.0

// Backwards compatibility types
export type Hub = {
  id: string;
  name: string;
  tag: string;
  category: string;
  cover: string;
  members: number;
  bio: string;
};

export type Template = {
  id: string;
  src: string;
  label: string;
};

export type Meme = {
  id: string;
  authorId: string;
  hubId?: string;
  image: string;
  top: string;
  bottom: string;
  likes: number;
  remixes: number;
  comments: number;
  parentId?: string;
  createdAt: number;
  heat: number;
};

export type Brief = {
  id: string;
  brandId: string;
  hubId: string;
  title: string;
  pitch: string;
  cover: string;
  prize: number;
  payout: number;
  slots: number;
  taken: number;
  deadline: number;
  requirements: string[];
};

export type Chat = {
  id: string;
  kind: "dm" | "squad" | "hub";
  name: string;
  subtitle: string;
  mark: Person["mark"] | "squad" | "hub";
  memberIds: string[];
  lastMessage: string;
  lastAt: number;
  unread: number;
};

export type MsgKind = "text" | "meme" | "sound";

export type Message = {
  id: string;
  chatId: string;
  authorId: string;
  kind: MsgKind;
  text?: string;
  memeId?: string;
  soundId?: string;
  createdAt: number;
};

export type Tx = {
  id: string;
  label: string;
  amount: number;
  at: number;
};

export type Submission = {
  briefId: string;
  memeId: string;
  at: number;
};

export type Battle = {
  id: string;
  leftId: string;
  rightId: string;
  leftVotes: number;
  rightVotes: number;
};

// ==========================================
// Step 30: System Configuration Types
// ==========================================

export type SystemConfigKey =
  // Platform
  | "maintenance_mode"
  | "new_registrations_enabled"
  | "platform_enabled"
  // Content
  | "max_upload_size_mb"
  | "max_reel_duration_seconds"
  | "max_post_images"
  | "max_caption_length"
  | "allowed_media_types"
  // Moderation
  | "default_submission_status"
  | "auto_review_enabled"
  | "auto_review_threshold"
  | "report_threshold"
  | "auto_hide_report_threshold"
  // Economy
  | "riff_points_enabled"
  | "points_per_approved_post"
  | "points_per_approved_reel"
  | "minimum_withdrawal_points"
  | "maximum_withdrawal_points"
  | "daily_withdrawal_limit"
  | "creator_reward_enabled"
  // Notifications
  | "push_notifications_enabled"
  | "email_notifications_enabled"
  | "notification_batching_enabled"
  // Security
  | "session_duration_hours"
  | "login_rate_limit"
  | "otp_rate_limit"
  | "password_attempt_limit"
  | "suspicious_login_detection_enabled";

export type SystemConfigCategory =
  | "platform"
  | "content"
  | "moderation"
  | "economy"
  | "notifications"
  | "security";

export type SystemConfigValueType = "boolean" | "integer" | "decimal" | "string" | "json";

export interface SystemConfigRecord {
  id: string;
  key: SystemConfigKey;
  value: string;
  defaultValue?: string;
  valueType: SystemConfigValueType;
  category: SystemConfigCategory;
  description: string;
  isPublic: boolean;
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
}

export type SystemConfigUpdate = {
  key: SystemConfigKey;
  value: string | number | boolean | any[];
  reason?: string;
};

export const OWNER_ONLY_CONFIG_KEYS: readonly SystemConfigKey[] = [
  "maintenance_mode",
  "new_registrations_enabled",
  "platform_enabled",
  "session_duration_hours",
  "login_rate_limit",
  "otp_rate_limit",
  "password_attempt_limit",
  "suspicious_login_detection_enabled",
  "riff_points_enabled",
  "creator_reward_enabled",
  "minimum_withdrawal_points",
  "maximum_withdrawal_points",
  "daily_withdrawal_limit",
] as const;
