import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  Ban,
  BookOpen,
  Brain,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  Crown,
  Edit3,
  ExternalLink,
  Film,
  Flag,
  Flame,
  Gavel,
  History,
  Image as ImageIcon,
  Key,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Slash,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  Unlock,
  UserCheck,
  Users,
  UserX,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playSound } from "@/lib/sounds";
import {
  canManagePermissions,
  canManageRoles,
  canPerformModeration,
  hasPermission,
  ROLE_HIERARCHY,
  useRiff,
} from "@/lib/store";
import type {
  AdminPermission,
  Category,
  ContentReport,
  Person,
  Post,
  WithdrawalRequest,
  SystemConfigRecord,
  SystemConfigKey,
  SystemConfigCategory,
} from "@/lib/types";
import {
  ADMIN_PERMISSIONS_CATALOG,
  PERMISSION_PRESETS,
  OWNER_ONLY_CONFIG_KEYS,
} from "@/lib/types";
import {
  getStaffGovernanceServerFn,
  updateStaffRoleServerFn,
  updateStaffPermissionsServerFn,
  reconcileWithdrawalServerFn,
  getSystemConfigsServerFn,
  updateSystemConfigServerFn,
  updateSystemConfigsBatchServerFn,
  getSystemConfigAuditHistoryServerFn,
} from "@/lib/riff-data";
import { cn, inr } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminDashboardPage,
  head: () => ({ meta: [{ title: "Admin & Moderation Console · RIFF" }] }),
});

type Tab = "queue" | "reports" | "withdrawals" | "team" | "roles" | "governance" | "categories" | "audit" | "rules" | "config";

const REJECTION_REASONS = [
  "Inappropriate or offensive content",
  "Low effort / watermark / spam",
  "Copyright violation / repost",
  "Misleading caption or tags",
  "Does not meet category standards",
  "Custom note...",
];

export function AdminDashboardPage() {
  const pendingSubmissions = useRiff((s) => s.pendingSubmissions);
  const rejectedSubmissions = useRiff((s) => s.rejectedSubmissions) || [];
  const posts = useRiff((s) => s.posts);
  const categories = useRiff((s) => s.categories);
  const auditLogs = useRiff((s) => s.auditLogs);
  const people = useRiff((s) => s.people);
  const reports = useRiff((s) => s.reports) || [];
  const resolveReport = useRiff((s) => s.resolveReport);
  const approveSubmission = useRiff((s) => s.approveSubmission);
  const rejectSubmission = useRiff((s) => s.rejectSubmission);
  const restoreRejectedSubmission = useRiff((s) => s.restoreRejectedSubmission);
  const reclassifyPost = useRiff((s) => s.reclassifyPost);
  const deletePost = useRiff((s) => s.deletePost);
  const issueWarning = useRiff((s) => s.issueWarning);
  const resetUserWarnings = useRiff((s) => s.resetUserWarnings);
  const banUser = useRiff((s) => s.banUser);
  const unbanUser = useRiff((s) => s.unbanUser);
  const updateUserRole = useRiff((s) => s.updateUserRole);
  const updateCategoryPoints = useRiff((s) => s.updateCategoryPoints);
  const addCategory = useRiff((s) => s.addCategory);
  const createCategory = useRiff((s) => s.createCategory);
  const updateCategory = useRiff((s) => s.updateCategory);
  const toggleCategoryStatus = useRiff((s) => s.toggleCategoryStatus);
  const reorderCategories = useRiff((s) => s.reorderCategories);
  const setDefaultCategory = useRiff((s) => s.setDefaultCategory);
  const rawProfile = useRiff((s) => s.profile);
  const setProfile = useRiff((s) => s.setProfile);
  const myProfile = rawProfile || { name: "You", handle: "you", role: "creator" };

  // Withdrawals store bindings
  const withdrawals = useRiff((s) => s.withdrawals) || [];
  const settleWithdrawal = useRiff((s) => s.settleWithdrawal);
  const rejectAndRefundWithdrawal = useRiff((s) => s.rejectAndRefundWithdrawal);
  const flagFreezeAndRejectWithdrawal = useRiff((s) => s.flagFreezeAndRejectWithdrawal);
  const platformControls = useRiff((s) => s.platformControls) || {
    emergencyWalletFreeze: false,
    pointConversionRate: 0.5,
    minWithdrawalThreshold: 100,
    maxDailyWithdrawalLimit: 10000,
    payoutProcessingFeePercent: 2,
  };

  const myRole = (myProfile.role as Person["role"]) || "creator";
  const isStaff = myRole === "moderator" || myRole === "admin" || myRole === "super_admin" || myRole === "owner";
  const isSuperAdminOrOwner = myRole === "super_admin" || myRole === "owner";
  const isSuperAdmin = myRole === "super_admin";
  const isOwner = myRole === "owner";

  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const [queueSubTab, setQueueSubTab] = useState<"pending" | "rejected">("pending");

  // Governance Tab state
  const [governanceFilter, setGovernanceFilter] = useState<"all" | "admin" | "moderator" | "at_risk">("all");
  const [governanceSearch, setGovernanceSearch] = useState("");

  // Withdrawals tab state
  const [withdrawalFilter, setWithdrawalFilter] = useState<"pending" | "completed" | "failed" | "all">("pending");
  const [arbitrationModal, setArbitrationModal] = useState<{
    wth: WithdrawalRequest;
    action: "reject" | "flag_freeze";
  } | null>(null);
  const [arbitrationNote, setArbitrationNote] = useState("");

  if (!isStaff) {
    return (
      <div className="flex min-h-[80vh] w-full flex-col items-center justify-center p-6 text-center text-white">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
          <ShieldAlert className="size-8" />
        </div>
        <span className="mb-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
          403 Forbidden
        </span>
        <h1 className="font-display text-2xl font-black tracking-tight text-white">
          Admin Access Restricted
        </h1>
        <p className="mt-2 max-w-md text-xs text-white/50 leading-relaxed">
          The Admin Review &amp; Moderation Console is strictly restricted to authorized RIFF Admins, Moderators, and Governance staff. Your account (@{myProfile.handle}) has {myRole.toUpperCase()} permissions.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#d4ff00] px-5 text-xs font-black text-black hover:opacity-90 transition-opacity"
          >
            Return to Home Feed
          </Link>
          <button
            type="button"
            onClick={() => {
              setProfile({ role: "super_admin" });
              toast.info("Switched to Super Admin role for testing.");
            }}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 px-4 text-xs font-bold text-white transition-colors"
          >
            Test as Super Admin ⚡
          </button>
        </div>
      </div>
    );
  }

  // Reclassification state
  const [changingCatForId, setChangingCatForId] = useState<string | null>(null);
  const [selectedOverrideCat, setSelectedOverrideCat] = useState<string>("");

  // Rejection modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customReasonNote, setCustomReasonNote] = useState("");

  // Category Management & Filtering state
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [catStatusFilter, setCatStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("all");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("✨");
  const [newCatPoints, setNewCatPoints] = useState(15);
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatAllowedTypes, setNewCatAllowedTypes] = useState<"all" | "post" | "reel">("all");
  const [newCatRequiresReview, setNewCatRequiresReview] = useState(true);
  const [newCatIsDefault, setNewCatIsDefault] = useState(false);

  // Issue Warning Modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningUserHandle, setWarningUserHandle] = useState("");
  const [warningReasonInput, setWarningReasonInput] = useState("");

  // Reports state
  const [reportFilter, setReportFilter] = useState<"all" | "open" | "actioned" | "dismissed">("open");
  const [resolvingReport, setResolvingReport] = useState<ContentReport | null>(null);
  const [resolutionAction, setResolutionAction] = useState<"dismiss" | "remove_content" | "warn_user">("dismiss");
  const [resolutionNote, setResolutionNote] = useState("");

  // Search and category filter for Team tab
  const [teamSearch, setTeamSearch] = useState("");
  const [teamSubCategory, setTeamSubCategory] = useState<"team" | "creators">("team");

  // Audit tab filters
  const [auditFilter, setAuditFilter] = useState<
    "all" | "approvals" | "rejections" | "reports" | "disciplinary"
  >("all");
  const [auditSearch, setAuditSearch] = useState("");

  const setUserPermissions = useRiff((s) => s.setUserPermissions);

  // Permission Checks based on current user
  const canReviewSubmissions = hasPermission(myProfile, "submission.review");
  const canManageCategories = hasPermission(myProfile, "category.manage");
  const canManageModeration = hasPermission(myProfile, "moderation.manage");
  const canReviewAppeals = hasPermission(myProfile, "appeal.review");
  const canManageCampaigns = hasPermission(myProfile, "campaign.manage");
  const canReviewWithdrawals = hasPermission(myProfile, "withdrawal.review");
  const canViewWallets = hasPermission(myProfile, "wallet.view");
  const canViewAudit = hasPermission(myProfile, "audit.view");
  const canManageStaff = isSuperAdminOrOwner || hasPermission(myProfile, "staff.manage");

  // Granular Permission Management Modal State
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState<Person | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<AdminPermission[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [permsAuditReason, setPermsAuditReason] = useState("");
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // System Configuration State
  const storeSystemConfigs = useRiff((s) => s.systemConfigs) || [];
  const updateSystemConfig = useRiff((s) => s.updateSystemConfig);
  const setSystemConfigs = useRiff((s) => s.setSystemConfigs);

  const [configCategoryFilter, setConfigCategoryFilter] = useState<"all" | SystemConfigCategory>("all");
  const [configSearch, setConfigSearch] = useState("");
  const [draftConfigs, setDraftConfigs] = useState<Record<string, string>>({});
  const [configAuditHistory, setConfigAuditHistory] = useState<
    Array<{
      id: string;
      actorId: string;
      actorRole: string;
      action: string;
      key: string;
      oldValue: string;
      newValue: string;
      reason: string;
      timestamp: number;
    }>
  >([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configReason, setConfigReason] = useState("");

  const canEditOperationalConfig = isSuperAdminOrOwner;

  useEffect(() => {
    let mounted = true;
    async function loadConfigs() {
      try {
        const configs = await getSystemConfigsServerFn();
        if (mounted && configs && Array.isArray(configs)) {
          setSystemConfigs(configs);
        }
      } catch (err) {
        // Fallback
      }
    }
    loadConfigs();
    return () => {
      mounted = false;
    };
  }, [setSystemConfigs]);

  const loadConfigAudit = async () => {
    try {
      const logs = await getSystemConfigAuditHistoryServerFn({ data: { limit: 50 } });
      if (logs && Array.isArray(logs)) {
        setConfigAuditHistory(logs);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === "config") {
      loadConfigAudit();
    }
  }, [activeTab]);

  const handleAdminSaveConfig = async (key: SystemConfigKey) => {
    if (!canEditOperationalConfig) {
      toast.error("Permission denied: Super Admin or Owner role required to edit system configuration.");
      return;
    }
    if (OWNER_ONLY_CONFIG_KEYS.includes(key as any) && !isOwner) {
      toast.error("Permission denied: This setting is restricted to Owner root authority.");
      return;
    }
    const record = storeSystemConfigs.find((c) => c.key === key);
    if (!record) return;
    const val = draftConfigs[key] !== undefined ? draftConfigs[key] : record.value;
    try {
      setIsSavingConfig(true);
      const res = await updateSystemConfigServerFn({
        data: {
          key,
          value: val,
          reason: configReason.trim() || `Admin (@${myProfile.handle}) updated system config ${key}`,
        },
      });
      if (res.ok) {
        updateSystemConfig(key, val, configReason.trim() || `Admin (@${myProfile.handle}) updated system config ${key}`);
        setDraftConfigs((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        playSound("cheer");
        toast.success(`Updated ${key} successfully!`);
        loadConfigAudit();
      }
    } catch (err: any) {
      playSound("pop");
      toast.error(err?.message || `Failed to update ${key}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Server sync for staff governance records
  useEffect(() => {
    let isMounted = true;
    async function loadServerStaff() {
      try {
        const data = await getStaffGovernanceServerFn();
        if (!isMounted || !data?.staff) return;
        for (const s of data.staff) {
          if (s.permissions && s.permissions.length > 0) {
            const localPerson = people.find((p) => p.handle === s.username);
            if (localPerson && (!localPerson.permissions || localPerson.permissions.length === 0)) {
              setUserPermissions(s.username, s.permissions as AdminPermission[], "owner");
            }
          }
        }
      } catch {
        // Fallback gracefully to seed store
      }
    }
    loadServerStaff();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleOpenPermissionsModal(staff: Person) {
    setSelectedStaffForPerms(staff);
    const existing = (staff.permissions as AdminPermission[]) || [];
    setSelectedPerms([...existing]);
    const match = PERMISSION_PRESETS.find(
      (preset) =>
        preset.permissions.length === existing.length &&
        preset.permissions.every((p) => existing.includes(p)),
    );
    setSelectedPresetId(match?.id || null);
    setPermsAuditReason("");
  }

  function handleTogglePerm(permKey: AdminPermission) {
    if (!selectedStaffForPerms) return;
    if (selectedStaffForPerms.role === "owner") return;
    if (myRole === "super_admin" && (selectedStaffForPerms.role === "super_admin" || permKey === "staff.manage")) {
      return;
    }

    setSelectedPerms((prev) => {
      const next = prev.includes(permKey)
        ? prev.filter((p) => p !== permKey)
        : [...prev, permKey];

      const match = PERMISSION_PRESETS.find(
        (preset) =>
          preset.permissions.length === next.length &&
          preset.permissions.every((p) => next.includes(p)),
      );
      setSelectedPresetId(match?.id || null);
      return next;
    });
  }

  function handleApplyPreset(preset: (typeof PERMISSION_PRESETS)[0]) {
    if (!selectedStaffForPerms || selectedStaffForPerms.role === "owner") return;
    let perms = [...preset.permissions];
    if (myRole === "super_admin") {
      perms = perms.filter((p) => p !== "staff.manage");
    }
    setSelectedPerms(perms);
    setSelectedPresetId(preset.id);
    playSound("pop");
    toast.info(`Applied "${preset.name}" preset.`);
  }

  function handleSelectAllPerms() {
    if (!selectedStaffForPerms || selectedStaffForPerms.role === "owner") return;
    let all = ADMIN_PERMISSIONS_CATALOG.map((c) => c.key);
    if (myRole === "super_admin") {
      all = all.filter((p) => p !== "staff.manage");
    }
    setSelectedPerms(all);
    setSelectedPresetId(null);
  }

  function handleClearAllPerms() {
    if (!selectedStaffForPerms || selectedStaffForPerms.role === "owner") return;
    setSelectedPerms([]);
    setSelectedPresetId(null);
  }

  async function handleSavePermissions() {
    if (!selectedStaffForPerms) return;
    setIsSavingPerms(true);
    try {
      try {
        await updateStaffPermissionsServerFn({
          data: {
            targetUserId: selectedStaffForPerms.handle,
            permissions: selectedPerms,
            reason: permsAuditReason.trim() || undefined,
          },
        });
      } catch (err: any) {
        console.warn("Server permission update note:", err?.message || err);
      }

      const success = setUserPermissions(
        selectedStaffForPerms.handle,
        selectedPerms,
        myRole,
        permsAuditReason.trim() || undefined,
      );

      if (success) {
        playSound("cheer");
        toast.success(
          `Updated permissions for @${selectedStaffForPerms.handle} (${selectedPerms.length} active).`,
        );
        setSelectedStaffForPerms(null);
      } else {
        toast.error(`Permission denied: Cannot update permissions for @${selectedStaffForPerms.handle}.`);
      }
    } finally {
      setIsSavingPerms(false);
    }
  }

  function handleApproveDefault(sub: Post) {
    approveSubmission(sub.id);
    playSound("cheer");
    const cat = categories.find((c) => c.id === sub.userSelectedCategoryId) || categories[0];
    toast.success(`Approved as ${cat.name}! +${cat.approvalPoints} RIFF Points credited to @${sub.authorHandle}.`);
  }

  function handleApproveReclassified(subId: string) {
    if (!selectedOverrideCat) return;
    approveSubmission(subId, selectedOverrideCat);
    playSound("cheer");
    const cat = categories.find((c) => c.id === selectedOverrideCat) || categories[0];
    toast.success(`Reclassified & Approved as ${cat.name}! +${cat.approvalPoints} RIFF Points credited.`);
    setChangingCatForId(null);
    setSelectedOverrideCat("");
  }

  function handleRejectSubmit() {
    if (!rejectingId) return;
    const finalReason =
      rejectionReason === "Custom note..."
        ? customReasonNote.trim()
        : customReasonNote.trim()
          ? `${rejectionReason}: ${customReasonNote.trim()}`
          : rejectionReason;

    if (!finalReason) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    rejectSubmission(rejectingId, finalReason);
    playSound("pop");
    toast.info("Submission rejected and logged to audit.");
    setRejectingId(null);
    setCustomReasonNote("");
    setRejectionReason(REJECTION_REASONS[0]);
  }

  function handleRestoreSubmission(subId: string) {
    restoreRejectedSubmission(subId);
    playSound("pop");
    toast.success("Submission restored back to pending Review Queue!");
  }

  const staffMembers = people.filter(
    (p) => p.role === "admin" || p.role === "moderator",
  );
  const atRiskStaffCount = staffMembers.filter((s) => (s.warningsCount || 0) >= 3).length;

  const filteredStaff = staffMembers.filter((p) => {
    if (governanceFilter === "admin" && p.role !== "admin") return false;
    if (governanceFilter === "moderator" && p.role !== "moderator") return false;
    if (governanceFilter === "at_risk" && (p.warningsCount || 0) < 3) return false;
    if (governanceSearch.trim()) {
      const q = governanceSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        (p.bio && p.bio.toLowerCase().includes(q))
      );
    }
    return true;
  });

  function handleSwitchMyRole(role: Person["role"], presetPermissions?: AdminPermission[]) {
    let perms: AdminPermission[] = presetPermissions || [];
    if (!presetPermissions) {
      if (role === "owner") {
        perms = ADMIN_PERMISSIONS_CATALOG.map((c) => c.key);
      } else if (role === "super_admin") {
        perms = ADMIN_PERMISSIONS_CATALOG.filter((c) => c.key !== "staff.manage").map((c) => c.key);
      } else if (role === "admin") {
        perms = ["submission.review", "category.manage", "appeal.review", "withdrawal.review"];
      } else if (role === "moderator") {
        perms = ["moderation.manage", "submission.review"];
      } else {
        perms = [];
      }
    }
    setProfile({ role, permissions: perms });
    playSound("pop");
    toast.info(`Switched test role to ${role?.toUpperCase()} (${perms.length} perms active)`);
  }

  function handleResetWarnings(handle: string) {
    const success = resetUserWarnings(handle, "Senior governance cleared warning record", myRole);
    if (success) {
      playSound("cheer");
      toast.success(`Cleared all warnings for @${handle}.`);
    } else {
      toast.error(`Permission denied: Cannot reset warnings for @${handle}.`);
    }
  }

  function handleQuickRoleChange(handle: string, targetRole: Person["role"]) {
    const success = updateUserRole(handle, targetRole, myRole);
    if (success) {
      playSound("cheer");
      toast.success(`Updated @${handle}'s role to ${targetRole.toUpperCase()}.`);
    } else {
      toast.error(`Permission denied: Cannot assign ${targetRole} to @${handle}.`);
    }
  }

  function handleSettleWithdrawal(wth: WithdrawalRequest) {
    if (!canReviewWithdrawals) {
      toast.error("Permission denied: You need withdrawal.review permission.");
      return;
    }
    const success = settleWithdrawal(wth.id, myRole);
    if (success) {
      playSound("cheer");
      toast.success(`Settled ₹${wth.amount.toLocaleString()} payout to @${wth.userHandle}!`);
      reconcileWithdrawalServerFn({
        data: {
          withdrawalId: wth.id,
          event: "transfer.processed",
          reason: `Settled by ${myRole} (@${myProfile.handle}) via Admin Console`,
        },
      }).catch(() => {});
    } else {
      toast.error("Failed to settle withdrawal.");
    }
  }

  function handleArbitrationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arbitrationModal) return;
    if (!canReviewWithdrawals) {
      toast.error("Permission denied: You need withdrawal.review permission.");
      return;
    }
    const note =
      arbitrationNote.trim() ||
      (arbitrationModal.action === "reject"
        ? "Rejected during admin compliance review"
        : "Flagged & frozen for suspicious activity");

    if (arbitrationModal.action === "reject") {
      const success = rejectAndRefundWithdrawal(arbitrationModal.wth.id, note, myRole);
      if (success) {
        playSound("pop");
        toast.info(
          `Withdrawal rejected. ${arbitrationModal.wth.pointsEquivalent.toLocaleString()} pts refunded to @${arbitrationModal.wth.userHandle}.`,
        );
        reconcileWithdrawalServerFn({
          data: {
            withdrawalId: arbitrationModal.wth.id,
            event: "transfer.failed",
            reason: note,
          },
        }).catch(() => {});
      }
    } else {
      const success = flagFreezeAndRejectWithdrawal(arbitrationModal.wth.id, note, myRole);
      if (success) {
        playSound("pop");
        toast.error(`Account @${arbitrationModal.wth.userHandle} wallet FROZEN and payout halted!`);
        reconcileWithdrawalServerFn({
          data: {
            withdrawalId: arbitrationModal.wth.id,
            event: "transfer.failed",
            reason: `Account Flagged & Frozen: ${note}`,
          },
        }).catch(() => {});
      }
    }
    setArbitrationModal(null);
    setArbitrationNote("");
  }

  function handleIssueWarningSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!warningUserHandle || !warningReasonInput.trim()) return;
    const targetUser = people.find((p) => p.handle === warningUserHandle);
    const success = issueWarning(warningUserHandle, warningReasonInput.trim(), myRole);
    if (success) {
      playSound("pop");
      const newCount = (targetUser?.warningsCount || 0) + 1;
      if (newCount >= 5 && (targetUser?.role === "admin" || targetUser?.role === "moderator")) {
        toast.error(`🚨 @${warningUserHandle} reached 5 warnings and was automatically DEMOTED to Creator!`);
      } else {
        toast.warning(`Warning issued to @${warningUserHandle}! (Warning ${newCount}/5)`);
      }
    } else {
      toast.error(`Permission denied: You cannot warn @${warningUserHandle} under RIFF governance hierarchy.`);
    }
    setShowWarningModal(false);
    setWarningUserHandle("");
    setWarningReasonInput("");
  }

  function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim() || !newCatSlug.trim()) return;

    createCategory({
      id: `cat_${newCatSlug.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name: newCatName.trim(),
      slug: newCatSlug.trim().toLowerCase(),
      description: newCatDesc.trim() || `${newCatName} content and memes`,
      icon: newCatIcon.trim() || "✨",
      approvalPoints: Number(newCatPoints) || 10,
      status: "active",
      sortOrder: categories.length + 1,
      allowedTypes: newCatAllowedTypes,
      requiresReview: newCatRequiresReview,
      isDefault: newCatIsDefault,
    });

    toast.success(`Category "${newCatName}" created with +${newCatPoints} pts reward!`);
    setShowAddCatModal(false);
    setNewCatName("");
    setNewCatSlug("");
    setNewCatIcon("✨");
    setNewCatPoints(15);
    setNewCatDesc("");
    setNewCatAllowedTypes("all");
    setNewCatRequiresReview(true);
    setNewCatIsDefault(false);
  }

  function handleEditCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;

    updateCategory(editingCategory.id, {
      name: editingCategory.name.trim(),
      slug: editingCategory.slug.trim().toLowerCase(),
      icon: editingCategory.icon.trim() || "✨",
      description: editingCategory.description.trim(),
      approvalPoints: Number(editingCategory.approvalPoints) || 10,
      status: editingCategory.status,
      allowedTypes: editingCategory.allowedTypes || "all",
      requiresReview: editingCategory.requiresReview !== false,
      isDefault: editingCategory.isDefault || false,
    });

    toast.success(`Category "${editingCategory.name}" updated successfully.`);
    setEditingCategory(null);
  }

  function handleMoveCategory(catId: string, direction: "up" | "down") {
    const sorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const currIndex = sorted.findIndex((c) => c.id === catId);
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const temp = sorted[currIndex];
    sorted[currIndex] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    const orderedIds = sorted.map((c) => c.id);
    reorderCategories(orderedIds);
    toast.success("Category display priority reordered.");
  }

  const teamMembers = people.filter((p) =>
    ["owner", "super_admin", "admin", "moderator"].includes(p.role || "")
  );
  const platformCreators = people.filter((p) =>
    !["owner", "super_admin", "admin", "moderator"].includes(p.role || "")
  );

  const filteredTeamMembers = teamMembers.filter(
    (p) =>
      p.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      p.handle.toLowerCase().includes(teamSearch.toLowerCase()) ||
      (p.role && p.role.toLowerCase().includes(teamSearch.toLowerCase()))
  );

  const filteredCreators = platformCreators.filter(
    (p) =>
      p.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      p.handle.toLowerCase().includes(teamSearch.toLowerCase()) ||
      (p.role && p.role.toLowerCase().includes(teamSearch.toLowerCase()))
  );

  const filteredPeople = teamSubCategory === "team" ? filteredTeamMembers : filteredCreators;

  const openReportsCount = reports.filter((r) => r.status === "open").length;

  const filteredReports = reports.filter((r) => {
    if (reportFilter === "all") return true;
    return r.status === reportFilter;
  });

  function handleOpenResolveModal(
    report: ContentReport,
    defaultAction: "dismiss" | "remove_content" | "warn_user",
  ) {
    setResolvingReport(report);
    setResolutionAction(defaultAction);
    if (defaultAction === "dismiss") {
      setResolutionNote("No policy violation found. Content adheres to community standards.");
    } else if (defaultAction === "remove_content") {
      setResolutionNote("Content violates community guidelines and has been removed.");
    } else {
      setResolutionNote("Severe violation. Creator issued formal warning and content removed.");
    }
  }

  function handleResolveReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvingReport) return;
    const success = resolveReport(
      resolvingReport.id,
      resolutionAction,
      resolutionNote.trim() || undefined,
    );
    if (success) {
      playSound("pop");
      if (resolutionAction === "dismiss") {
        toast.info(`Report #${resolvingReport.id} dismissed.`);
      } else if (resolutionAction === "remove_content") {
        toast.warning("Content removed and report marked as actioned.");
      } else {
        toast.error(`Creator @${resolvingReport.creatorHandle} warned and content removed.`);
      }
      setResolvingReport(null);
      setResolutionNote("");
    } else {
      toast.error("You do not have permission to moderate this user/report.");
    }
  }

  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === "pending").length;
  const completedWithdrawalsCount = withdrawals.filter((w) => w.status === "completed").length;
  const failedWithdrawalsCount = withdrawals.filter((w) => w.status === "failed").length;

  const totalSettledInr = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((acc, w) => acc + w.amount, 0);

  const totalPendingEscrowInr = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((acc, w) => acc + w.amount, 0);

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === "all") return true;
    return w.status === withdrawalFilter;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (
      auditFilter === "approvals" &&
      log.action !== "approve" &&
      log.action !== "change_category"
    ) {
      return false;
    }
    if (auditFilter === "rejections" && log.action !== "reject") {
      return false;
    }
    if (
      auditFilter === "reports" &&
      log.action !== "report_actioned" &&
      log.action !== "report_dismissed"
    ) {
      return false;
    }
    if (
      auditFilter === "disciplinary" &&
      log.action !== "issue_warning" &&
      log.action !== "demote_admin" &&
      log.action !== "ban_user" &&
      log.action !== "unban_user"
    ) {
      return false;
    }

    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.actorId.toLowerCase().includes(q) ||
        (log.submitterHandle && log.submitterHandle.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-20">
      {/* TEST / IMPERSONATION NOTICE */}
      {myRole !== "owner" && (
        <div className="mb-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <span>
              <strong>Staff Role Active:</strong> You are currently testing with{" "}
              <span className="font-bold underline uppercase text-amber-300">{myRole}</span> permissions. Actions are strictly gated by RIFF governance rules.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSwitchMyRole("owner")}
            className="rounded-xl bg-amber-500 px-3 py-1 text-[11px] font-black text-black hover:bg-amber-400 transition"
          >
            Restore Owner
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4 mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex size-8 items-center justify-center rounded-xl bg-accent/20 text-accent border border-accent/30">
              <Shield className="size-4" />
            </span>
            <h1 className="font-display text-2xl font-black tracking-tight text-fg">
              RIFF Moderation & Governance
            </h1>
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border",
              myRole === "owner" && "bg-purple-500/20 border-purple-500/40 text-purple-300",
              myRole === "super_admin" && "bg-amber-500/20 border-amber-500/40 text-amber-300",
              myRole === "admin" && "bg-sky-500/20 border-sky-500/40 text-sky-300",
              myRole === "moderator" && "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
            )}>
              {myRole.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Review submissions, reassign categories, enforce 5-warning demotions, and supervise staff.
          </p>
        </div>

        {/* Role Switcher Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-surface/90 border border-white/10 rounded-2xl px-2.5 py-1 text-xs">
            <span className="text-muted text-[11px] font-semibold">Test As:</span>
            <select
              value={myRole}
              onChange={(e) => handleSwitchMyRole(e.target.value as Person["role"])}
              className="bg-transparent font-bold text-accent text-xs outline-none cursor-pointer"
            >
              <option value="owner" className="bg-[#111] text-white">👑 Owner</option>
              <option value="super_admin" className="bg-[#111] text-white">⚡ Super Admin</option>
              <option value="admin" className="bg-[#111] text-white">🛡️ Admin</option>
              <option value="moderator" className="bg-[#111] text-white">🧹 Moderator</option>
              <option value="creator" className="bg-[#111] text-white">🎨 Creator (Locked)</option>
            </select>
          </div>

          {isOwner && (
            <Link
              to="/owner"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-xs font-black text-amber-300 hover:bg-amber-500/25 transition-all"
            >
              <Crown className="size-3.5" />
              <span>Owner Center</span>
            </Link>
          )}
        </div>
      </div>

      {/* Console Navigation Tabs */}
      <div className="flex items-center rounded-2xl bg-surface/90 border border-white/10 p-1 flex-wrap gap-1 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all relative",
            activeTab === "queue"
              ? "bg-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              : "text-muted hover:text-fg",
          )}
        >
          <span>Review Queue</span>
          {pendingSubmissions.length > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-amber-400 text-black text-[9px] font-black">
              {pendingSubmissions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all relative",
            activeTab === "reports"
              ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              : "text-muted hover:text-fg",
          )}
        >
          <Flag className="size-3.5" />
          <span>Reports</span>
          {openReportsCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black border border-white/20">
              {openReportsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("withdrawals")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all relative",
            activeTab === "withdrawals"
              ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] font-black"
              : "text-muted hover:text-fg",
          )}
        >
          <Wallet className="size-3.5" />
          <span>Payouts</span>
          {pendingWithdrawalsCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-400 text-black text-[9px] font-black">
              {pendingWithdrawalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
            activeTab === "team"
              ? "bg-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-black"
              : "text-muted hover:text-fg",
          )}
        >
          <Users className="size-3.5" />
          <span>Team ({teamMembers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
            activeTab === "roles"
              ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] font-black"
              : "text-muted hover:text-fg",
          )}
        >
          <Shield className="size-3.5" />
          <span>Roles</span>
        </button>

        {/* ⚡ Super Admin Governance Tab */}
        {isSuperAdminOrOwner && (
          <button
            type="button"
            onClick={() => setActiveTab("governance")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all relative",
              activeTab === "governance"
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] font-black"
                : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10",
            )}
          >
            <Zap className="size-3.5 fill-current" />
            <span>⚡ Super Admin</span>
            {atRiskStaffCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black border border-white/20">
                {atRiskStaffCount}
              </span>
            )}
          </button>
        )}

          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "categories"
                ? "bg-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                : "text-muted hover:text-fg",
            )}
          >
            <span>Economy ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "audit"
                ? "bg-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                : "text-muted hover:text-fg",
            )}
          >
            <History className="size-3.5" />
            <span>Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "rules"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                : "text-muted hover:text-fg",
            )}
          >
            <BookOpen className="size-3.5" />
            <span>Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === "config"
                ? "bg-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-black"
                : "text-muted hover:text-fg",
            )}
          >
            <Sliders className="size-3.5" />
            <span>Config ({storeSystemConfigs.length})</span>
          </button>
        </div>

      {/* 1. Review Queue Tab */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Sub-tab selection strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/80 border border-white/10 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQueueSubTab("pending")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
                  queueSubTab === "pending"
                    ? "bg-amber-400 text-black shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>🟡 Pending Review</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-black">
                  {pendingSubmissions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQueueSubTab("rejected")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
                  queueSubTab === "rejected"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>❌ Rejected Submissions</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-black">
                  {rejectedSubmissions.length}
                </span>
              </button>
            </div>

            <span className="text-[11px] text-muted">
              ⚡ Admin posts auto-publish. Creator submissions require moderator review.
            </span>
          </div>

          {/* Permission Warning Banner if Review is Restricted */}
          {!canReviewSubmissions && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Read-Only Review Queue:</strong> Your account (@{myProfile.handle}) does not have the{" "}
                  <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">submission.review</code> permission. Approving, reclassifying, and rejecting submissions is disabled.
                </span>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] uppercase font-mono">
                Permission Required
              </Badge>
            </div>
          )}

          {/* Pending Submissions View */}
          {queueSubTab === "pending" && (
            <>
              {pendingSubmissions.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center">
                  <span className="text-4xl">🎉</span>
                  <h3 className="font-display text-base font-bold text-fg mt-3">Queue is completely clear!</h3>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    All creator submissions have been reviewed, categorized, and points credited.
                  </p>
                  <Link to="/studio">
                    <Button size="sm" className="mt-4 rounded-xl bg-accent text-black font-bold">
                      Create a Test Submission
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingSubmissions.map((sub) => {
                    const selectedCat =
                      categories.find((c) => c.id === sub.userSelectedCategoryId) || categories[0];
                    const isChanging = changingCatForId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className="overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-xl backdrop-blur-xl transition-all"
                      >
                        {/* Media Preview */}
                        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                          {sub.type === "reel" ||
                          sub.mediaUrl?.endsWith(".mp4") ||
                          sub.mediaUrl?.endsWith(".webm") ||
                          sub.mediaUrl?.startsWith("blob:") ? (
                            <video
                              src={sub.mediaUrl}
                              controls
                              playsInline
                              className="size-full object-cover"
                            />
                          ) : (
                            <img
                              src={sub.mediaUrl}
                              alt="Submission preview"
                              className="size-full object-cover"
                            />
                          )}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/15">
                            <span>{sub.type === "reel" ? "🎬 Reel" : "📸 Post"}</span>
                            <span>•</span>
                            <span>@{sub.authorHandle}</span>
                          </div>
                          <div className="absolute top-2 right-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-black text-amber-300">
                            🟡 UNDER REVIEW
                          </div>

                          {(sub.topCaption || sub.bottomCaption) && (
                            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2">
                              <p className="font-impact text-center text-xs font-black uppercase text-white shadow-black drop-shadow">
                                {sub.topCaption}
                              </p>
                              <p className="font-impact text-center text-xs font-black uppercase text-white shadow-black drop-shadow">
                                {sub.bottomCaption}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="p-4 space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-fg">@{sub.authorHandle}</span>
                              <span className="text-[10px] text-muted">
                                {Math.max(1, Math.round((Date.now() - sub.createdAt) / 60000))}m ago
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-1 line-clamp-2">{sub.caption}</p>
                          </div>

                          {/* Category Selection Status */}
                          <div className="rounded-2xl border border-white/10 bg-raised/50 p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-muted">Poster Selected Category:</span>
                              <span className="font-bold text-fg flex items-center gap-1">
                                <span>{selectedCat.icon}</span>
                                <span>{selectedCat.name}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted">Associated Reward:</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                +{selectedCat.approvalPoints} RIFF Points
                              </span>
                            </div>
                          </div>

                          {/* Category Override Selector */}
                          {isChanging && (
                            <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3 space-y-2 animate-in fade-in duration-150">
                              <label className="block text-[11px] font-bold text-accent">
                                Reclassify Category &amp; Override Reward:
                              </label>
                              <select
                                value={selectedOverrideCat || sub.userSelectedCategoryId}
                                onChange={(e) => setSelectedOverrideCat(e.target.value)}
                                className="w-full rounded-xl border border-white/20 bg-surface p-2 text-xs font-bold text-fg focus:outline-none"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.icon} {c.name} (+{c.approvalPoints} pts)
                                  </option>
                                ))}
                              </select>
                              <p className="text-[10px] text-amber-300">
                                ⚠️ Note: Reclassifying an Admin's post generates 1 warning. After 5 warnings, the admin is automatically demoted.
                              </p>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setChangingCatForId(null)}
                                  className="h-7 text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveReclassified(sub.id)}
                                  className="h-7 rounded-xl bg-accent text-black font-bold text-xs"
                                >
                                  Reclassify & Approve
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {!isChanging && (
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              <Button
                                size="sm"
                                disabled={!canReviewSubmissions}
                                onClick={() => handleApproveDefault(sub)}
                                className={cn(
                                  "h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm",
                                  !canReviewSubmissions && "opacity-40 cursor-not-allowed hover:bg-emerald-500",
                                )}
                              >
                                <Check className="size-3.5 stroke-[3]" />
                                <span>Approve (+{selectedCat.approvalPoints})</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="subtle"
                                disabled={!canReviewSubmissions || !canManageCategories}
                                onClick={() => {
                                  setChangingCatForId(sub.id);
                                  setSelectedOverrideCat(sub.userSelectedCategoryId);
                                }}
                                className={cn(
                                  "h-9 rounded-xl text-[11px] font-bold border border-white/10 hover:border-accent text-accent",
                                  (!canReviewSubmissions || !canManageCategories) && "opacity-40 cursor-not-allowed",
                                )}
                              >
                                <span>Reclassify</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canReviewSubmissions}
                                onClick={() => setRejectingId(sub.id)}
                                className={cn(
                                  "h-9 rounded-xl text-[11px] font-bold text-rose-400 hover:bg-rose-500/10",
                                  !canReviewSubmissions && "opacity-40 cursor-not-allowed hover:bg-transparent",
                                )}
                              >
                                <X className="size-3.5 mr-0.5" />
                                <span>Reject</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Rejected Submissions History View */}
          {queueSubTab === "rejected" && (
            <>
              {rejectedSubmissions.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center">
                  <span className="text-4xl">🛡️</span>
                  <h3 className="font-display text-base font-bold text-fg mt-3">No rejected submissions</h3>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    Rejected posts are held here for transparency and audit compliance.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rejectedSubmissions.map((sub) => {
                    const selectedCat =
                      categories.find((c) => c.id === sub.userSelectedCategoryId) || categories[0];

                    return (
                      <div
                        key={sub.id}
                        className="overflow-hidden rounded-3xl border border-rose-500/20 bg-surface/90 shadow-xl backdrop-blur-xl transition-all"
                      >
                        {/* Media Preview */}
                        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center grayscale">
                          {sub.type === "reel" ||
                          sub.mediaUrl?.endsWith(".mp4") ||
                          sub.mediaUrl?.endsWith(".webm") ||
                          sub.mediaUrl?.startsWith("blob:") ? (
                            <video
                              src={sub.mediaUrl}
                              controls
                              playsInline
                              className="size-full object-cover opacity-60"
                            />
                          ) : (
                            <img
                              src={sub.mediaUrl}
                              alt="Rejected submission"
                              className="size-full object-cover opacity-60"
                            />
                          )}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/15">
                            <span>{sub.type === "reel" ? "🎬 Reel" : "📸 Post"}</span>
                            <span>•</span>
                            <span>@{sub.authorHandle}</span>
                          </div>
                          <div className="absolute top-2 right-2 rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[9px] font-black text-rose-300">
                            ❌ REJECTED
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="p-4 space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-fg">@{sub.authorHandle}</span>
                              <span className="text-[10px] text-muted">
                                {sub.reviewedAt
                                  ? `${Math.max(1, Math.round((Date.now() - sub.reviewedAt) / 60000))}m ago`
                                  : "Recently"}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-1 line-clamp-2">{sub.caption}</p>
                          </div>

                          {/* Rejection Details */}
                          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between text-rose-300">
                              <span className="font-semibold">Rejection Reason:</span>
                              <span className="text-[10px] text-muted">
                                Reviewer: @{sub.reviewedBy || "moderator"}
                              </span>
                            </div>
                            <p className="text-xs text-rose-400 font-medium">
                              "{sub.rejectionReason || "Did not meet community standards"}"
                            </p>
                          </div>

                          {/* Restore Button */}
                          <div className="pt-1 flex items-center justify-end">
                            <Button
                              size="sm"
                              variant="subtle"
                              onClick={() => handleRestoreSubmission(sub.id)}
                              className="h-8 rounded-xl text-xs font-bold border border-white/10 hover:border-amber-400 text-amber-300 gap-1.5"
                            >
                              <RotateCcw className="size-3" />
                              <span>Re-evaluate / Move to Pending</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 2. Community Reports & Safety Tab */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {/* Header & Sub-filter selection strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/80 border border-white/10 p-3 rounded-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setReportFilter("open")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
                  reportFilter === "open"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>🟡 Open Reports</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-black">
                  {openReportsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilter("actioned")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
                  reportFilter === "actioned"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>✅ Actioned</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-black">
                  {reports.filter((r) => r.status === "actioned").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilter("dismissed")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
                  reportFilter === "dismissed"
                    ? "bg-zinc-700 text-white shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>⚪ Dismissed</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-black">
                  {reports.filter((r) => r.status === "dismissed").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilter("all")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5",
                  reportFilter === "all"
                    ? "bg-accent text-black shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>All ({reports.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-muted">
              🛡️ Reports trigger automatic content removal or creator warnings with audit logs.
            </span>
          </div>

          {/* Permission Warning Banner if Moderation is Restricted */}
          {!canManageModeration && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Read-Only Moderation:</strong> Your account (@{myProfile.handle}) does not have the{" "}
                  <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">moderation.manage</code> permission. Resolving community reports and issuing disciplinary actions is disabled.
                </span>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] uppercase font-mono">
                Permission Required
              </Badge>
            </div>
          )}

          {filteredReports.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center">
              <span className="text-4xl">✨</span>
              <h3 className="font-display text-base font-bold text-fg mt-3">
                No reports found in this view
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                {reportFilter === "open"
                  ? "All reported content has been resolved by the moderation team."
                  : "No community reports matching this status filter."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredReports.map((report) => {
                const isOpen = report.status === "open";
                const isActioned = report.status === "actioned";
                const isDismissed = report.status === "dismissed";

                return (
                  <div
                    key={report.id}
                    className={cn(
                      "overflow-hidden rounded-3xl border bg-surface/90 shadow-xl backdrop-blur-xl transition-all flex flex-col justify-between",
                      isOpen
                        ? "border-rose-500/30"
                        : isActioned
                          ? "border-emerald-500/30"
                          : "border-white/10 opacity-75",
                    )}
                  >
                    {/* Media preview and banner */}
                    <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                      <img
                        src={report.postMediaUrl}
                        alt="Reported content preview"
                        className={cn(
                          "size-full object-cover",
                          !isOpen && "grayscale opacity-60",
                        )}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/15">
                        <span>{report.postType === "reel" ? "🎬 Reel" : "📸 Post"}</span>
                        <span>•</span>
                        <span>@{report.creatorHandle}</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        {isOpen && (
                          <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[9px] font-black text-rose-300">
                            🟡 OPEN REPORT
                          </span>
                        )}
                        {isActioned && (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                            ✅ ACTIONED
                          </span>
                        )}
                        {isDismissed && (
                          <span className="rounded-full bg-zinc-800 border border-white/20 px-2 py-0.5 text-[9px] font-black text-zinc-300">
                            ⚪ DISMISSED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Report Information */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-fg flex items-center gap-1.5">
                            <span className="text-muted">Creator:</span>
                            <span className="text-white">@{report.creatorHandle}</span>
                            {report.creatorRole && report.creatorRole !== "creator" && (
                              <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-bold text-purple-300 uppercase">
                                {report.creatorRole}
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted">
                            {Math.max(1, Math.round((Date.now() - report.createdAt) / 60000))}m ago
                          </span>
                        </div>

                        {/* Caption preview */}
                        <p className="text-xs text-muted line-clamp-2 italic">
                          "{report.postCaption}"
                        </p>

                        {/* Violation Reason & Reporter */}
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <Flag className="size-3" />
                              <span>Reason: {report.reason}</span>
                            </span>
                            <span className="text-[10px] text-muted">
                              Reported by @{report.reportedBy}
                            </span>
                          </div>
                          {report.details && (
                            <p className="text-[11px] text-muted leading-relaxed pt-1 border-t border-rose-500/10">
                              <strong className="text-fg">Note:</strong> "{report.details}"
                            </p>
                          )}
                        </div>

                        {/* Reviewed Resolution if closed */}
                        {!isOpen && (
                          <div className="rounded-2xl border border-white/10 bg-raised/50 p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted">
                                Reviewed by @{report.reviewedBy || "moderator"}
                              </span>
                              <span className="font-mono text-[10px] font-bold uppercase text-accent">
                                {report.actionTaken?.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-xs text-fg leading-relaxed">
                              "{report.resolutionNote || "Resolution logged."}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons if open */}
                      {isOpen && (
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!canManageModeration}
                            onClick={() => handleOpenResolveModal(report, "dismiss")}
                            className={cn(
                              "h-8 rounded-xl text-xs font-bold text-muted hover:text-white",
                              !canManageModeration && "opacity-40 cursor-not-allowed",
                            )}
                          >
                            <span>Dismiss</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="subtle"
                            disabled={!canManageModeration}
                            onClick={() => handleOpenResolveModal(report, "remove_content")}
                            className={cn(
                              "h-8 rounded-xl text-xs font-bold text-amber-300 border border-amber-500/30 hover:bg-amber-500/10",
                              !canManageModeration && "opacity-40 cursor-not-allowed",
                            )}
                          >
                            <Trash2 className="size-3 mr-1" />
                            <span>Remove Content</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="subtle"
                            disabled={!canManageModeration}
                            onClick={() => handleOpenResolveModal(report, "warn_user")}
                            className={cn(
                              "h-8 rounded-xl text-xs font-bold text-rose-300 border border-rose-500/40 hover:bg-rose-500/10",
                              !canManageModeration && "opacity-40 cursor-not-allowed",
                            )}
                          >
                            <AlertTriangle className="size-3 mr-1" />
                            <span>Warn & Remove</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Payouts & Withdrawals Queue Tab */}
      {activeTab === "withdrawals" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/80 border border-white/10 p-4 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-emerald-400" />
                <h2 className="font-display text-sm font-bold text-fg">
                  Creator Cashout & Escrow Arbitration Queue
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono font-bold">
                  {pendingWithdrawalsCount} PENDING
                </Badge>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Review and settle pending creator withdrawals. Approving verifies UPI/bank transfers; rejecting refunds escrow back to creator wallet; flagging halts transfers and freezes the account.
              </p>
            </div>

            {platformControls.emergencyWalletFreeze && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-pulse shrink-0">
                <AlertTriangle className="size-4 text-rose-400" />
                <span>KILLSWITCH: CASHOUTS FROZEN</span>
              </div>
            )}
          </div>

          {/* Least-Privilege Permission Check */}
          {!canReviewWithdrawals ? (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center space-y-3 shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
                <Lock className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white">Least-Privilege Payout Access Restricted</h3>
              <p className="text-xs text-amber-200/80 max-w-md mx-auto leading-relaxed">
                Reviewing, approving, and arbitrating creator cashouts requires the{" "}
                <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold">withdrawal.review</code> permission delegated by Platform Governance.
              </p>
              <div className="pt-2 text-[11px] text-muted">
                <span>Active role: </span>
                <span className="font-bold uppercase text-white">{myRole}</span>
                <span className="mx-2">•</span>
                <span>Active permissions: </span>
                <span className="font-mono text-white/80">
                  {(myProfile.permissions || []).length > 0 ? (myProfile.permissions || []).join(", ") : "None"}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Financial Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-surface/60 p-3.5 space-y-1">
                  <span className="text-[11px] text-muted font-medium">Pending Escrow Queue</span>
                  <div className="text-xl font-black font-mono text-sky-300">
                    {inr(totalPendingEscrowInr)}
                  </div>
                  <span className="text-[10px] text-muted">{pendingWithdrawalsCount} cashouts awaiting action</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-surface/60 p-3.5 space-y-1">
                  <span className="text-[11px] text-muted font-medium">Cumulative Settled Payouts</span>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    {inr(totalSettledInr)}
                  </div>
                  <span className="text-[10px] text-muted">{completedWithdrawalsCount} successful creator payouts</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-surface/60 p-3.5 space-y-1">
                  <span className="text-[11px] text-muted font-medium">Conversion Policy</span>
                  <div className="text-xl font-black font-mono text-amber-400">
                    ₹{platformControls.pointConversionRate ?? 0.5}/pt
                  </div>
                  <span className="text-[10px] text-muted">Min: ₹{platformControls.minWithdrawalThreshold ?? 100} • Fee: {platformControls.payoutProcessingFeePercent ?? 2}%</span>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex bg-surface/80 border border-white/10 rounded-xl p-1 text-[11px] font-bold w-fit">
                {[
                  { id: "pending", label: `Pending (${pendingWithdrawalsCount})` },
                  { id: "completed", label: `Settled (${completedWithdrawalsCount})` },
                  { id: "failed", label: `Failed/Refunded (${failedWithdrawalsCount})` },
                  { id: "all", label: `All (${withdrawals.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setWithdrawalFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-lg transition ${
                      withdrawalFilter === tab.id
                        ? "bg-emerald-500 text-black font-black"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Withdrawals Table */}
              <div className="rounded-2xl border border-white/10 bg-surface/80 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/40 text-muted border-b border-white/10 text-[10px] uppercase font-mono tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Creator</th>
                        <th className="py-2.5 px-3">Payment Details</th>
                        <th className="py-2.5 px-3">Amount (INR)</th>
                        <th className="py-2.5 px-3">Points Escrow</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Arbitration Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredWithdrawals.map((w) => {
                        const isPending = w.status === "pending";
                        const isCompleted = w.status === "completed";
                        const isFailed = w.status === "failed";

                        return (
                          <tr key={w.id} className="hover:bg-white/[0.02] transition">
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs text-amber-300">
                                  {w.userName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-xs">{w.userName}</div>
                                  <div className="text-[11px] text-muted font-mono">@{w.userHandle}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-semibold text-white">
                                  <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-mono font-bold">
                                    {w.paymentMethod === "upi" ? "UPI ID" : "Bank IMPS"}
                                  </span>
                                  <span className="font-mono text-[11px] text-sky-300">
                                    {w.paymentMethod === "upi"
                                      ? String(w.paymentDetails?.upiId || "N/A")
                                      : `${String(w.paymentDetails?.accountNumber || "N/A")} (${String(w.paymentDetails?.ifsc || "")})`}
                                  </span>
                                </div>
                                {w.paymentMethod === "bank_transfer" && w.paymentDetails?.holderName && (
                                  <div className="text-[10px] text-muted">
                                    A/C Holder: {String(w.paymentDetails.holderName)}
                                  </div>
                                )}
                                <div className="text-[10px] text-muted/60">
                                  Requested {new Date(w.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-sm text-white">{inr(w.amount)}</span>
                              {platformControls.payoutProcessingFeePercent > 0 && (
                                <div className="text-[10px] text-muted">
                                  Fee: {platformControls.payoutProcessingFeePercent}% (net {inr(Math.round(w.amount * (1 - platformControls.payoutProcessingFeePercent / 100)))})
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-mono font-semibold text-amber-400">
                                {w.pointsEquivalent.toLocaleString()} pts
                              </span>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Clock className="size-2.5" /> Pending Review
                                </span>
                              )}
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="size-2.5" /> Settled
                                </span>
                              )}
                              {isFailed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <AlertTriangle className="size-2.5" /> Refunded / Failed
                                </span>
                              )}
                              {w.adminNote && (
                                <div className="text-[10px] text-muted max-w-[180px] truncate mt-0.5">
                                  Note: {w.adminNote}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSettleWithdrawal(w)}
                                    className="h-7 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] rounded-lg shadow-sm flex items-center gap-1"
                                  >
                                    <Check className="size-3" />
                                    <span>Approve & Settle</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="subtle"
                                    onClick={() => {
                                      setArbitrationModal({ wth: w, action: "reject" });
                                      setArbitrationNote("");
                                    }}
                                    className="h-7 px-2 border border-white/10 hover:border-amber-400/50 hover:bg-amber-500/10 text-amber-300 text-[11px] rounded-lg"
                                  >
                                    Reject & Refund
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="subtle"
                                    onClick={() => {
                                      setArbitrationModal({ wth: w, action: "flag_freeze" });
                                      setArbitrationNote("");
                                    }}
                                    className="h-7 px-2 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-[11px] rounded-lg"
                                  >
                                    <Lock className="size-3 mr-0.5" />
                                    Freeze
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted/60 italic">
                                  {isCompleted ? `Processed ${w.processedAt ? new Date(w.processedAt).toLocaleDateString() : "OK"}` : "Closed"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredWithdrawals.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted">
                            No withdrawal records matching current filter ({withdrawalFilter}).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ARBITRATION CONFIRMATION MODAL */}
          {arbitrationModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-[#121214] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    {arbitrationModal.action === "reject" ? (
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <RotateCcw className="size-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <Lock className="size-4" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {arbitrationModal.action === "reject"
                          ? "Reject Withdrawal & Refund Escrow"
                          : "Flag Suspicious Payout & Freeze Wallet"}
                      </h3>
                      <p className="text-[11px] text-muted">
                        Audited Financial Governance Action
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setArbitrationModal(null)}
                    className="text-muted hover:text-white"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Summary of withdrawal */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted">Creator:</span>
                    <span className="font-bold text-white">@{arbitrationModal.wth.userHandle} ({arbitrationModal.wth.userName})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Requested Amount:</span>
                    <span className="font-mono font-bold text-white">{inr(arbitrationModal.wth.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Escrow Value:</span>
                    <span className="font-mono text-amber-400 font-bold">{arbitrationModal.wth.pointsEquivalent.toLocaleString()} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Payout Destination:</span>
                    <span className="font-mono text-sky-300">
                      {arbitrationModal.wth.paymentMethod === "upi"
                        ? String(arbitrationModal.wth.paymentDetails?.upiId || "N/A")
                        : `${String(arbitrationModal.wth.paymentDetails?.accountNumber || "N/A")} (${String(arbitrationModal.wth.paymentDetails?.ifsc || "")})`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  {arbitrationModal.action === "reject"
                    ? `Rejecting will halt this cashout transaction and credit back ${arbitrationModal.wth.pointsEquivalent.toLocaleString()} points into @${arbitrationModal.wth.userHandle}'s wallet immediately.`
                    : `Flagging will mark this cashout as fraudulent, FREEZE @${arbitrationModal.wth.userHandle}'s wallet, block future payouts, and log an emergency security infraction.`}
                </p>

                <form onSubmit={handleArbitrationSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-muted mb-1">
                      Arbitration Reason (Mandatory Audit Trail Note)
                    </label>
                    <Input
                      placeholder={
                        arbitrationModal.action === "reject"
                          ? "e.g. Invalid UPI VPA address or KYC discrepancy"
                          : "e.g. Bot traffic detected / abnormal points spike"
                      }
                      value={arbitrationNote}
                      onChange={(e) => setArbitrationNote(e.target.value)}
                      className="bg-black/60 border-white/10 text-white"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => setArbitrationModal(null)}
                      variant="ghost"
                      className="flex-1 border border-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className={`flex-1 font-bold ${
                        arbitrationModal.action === "reject"
                          ? "bg-amber-500 hover:bg-amber-400 text-black"
                          : "bg-rose-500 hover:bg-rose-400 text-white"
                      }`}
                    >
                      {arbitrationModal.action === "reject"
                        ? "Confirm Reject & Refund"
                        : "Confirm Freeze & Halt Payout"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Team Management Tab */}
      {activeTab === "team" && (
        <div className="space-y-5">
          {/* Category Switcher & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/80 border border-border p-3.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setTeamSubCategory("team")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                  teamSubCategory === "team"
                    ? "bg-[#d4ff00] text-black shadow-sm font-black"
                    : "text-muted hover:text-fg bg-raised border border-border",
                )}
              >
                <Users className="size-3.5" />
                <span>Core Team ({teamMembers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTeamSubCategory("creators")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                  teamSubCategory === "creators"
                    ? "bg-[#d4ff00] text-black shadow-sm font-black"
                    : "text-muted hover:text-fg bg-raised border border-border",
                )}
              >
                <Sparkles className="size-3.5" />
                <span>Platform Creators ({platformCreators.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveTab("roles")}
                className="h-9 rounded-xl text-xs font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20 gap-1.5"
              >
                <Shield className="size-3.5" />
                <span>View Roles Matrix ➔</span>
              </Button>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted" />
                <Input
                  placeholder={teamSubCategory === "team" ? "Search team..." : "Search creators..."}
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="h-9 text-xs pl-8 w-44 bg-surface rounded-xl border-border"
                />
              </div>
            </div>
          </div>

          {/* Sub-Category 1: Core Team */}
          {teamSubCategory === "team" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-sm font-bold text-fg flex items-center gap-2">
                  <span>Core Team & Platform Leadership</span>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-black uppercase">
                    Root Sovereign
                  </Badge>
                </h2>
                <p className="text-[11px] text-muted">
                  Active administrators and root staff with elevated operational access. All mock staff have been cleared.
                </p>
              </div>

              {/* Team Members List (Only Owner) */}
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredTeamMembers.map((person) => {
                  const warnings = person.warningsCount || 0;
                  const isBanned = person.isBanned || false;
                  const role = person.role;

                  return (
                    <div
                      key={person.id}
                      className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-surface/95 to-surface/80 p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex size-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 text-sm">
                              👑
                            </span>
                            <h3 className="font-display text-sm font-black text-fg">{person.name}</h3>
                            <Badge className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-purple-500/20 border-purple-500/40 text-purple-300">
                              {role.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-muted">@{person.handle}</p>
                          <p className="text-[11px] text-muted/90 mt-1 leading-relaxed">{person.bio}</p>
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] font-mono font-black text-emerald-400">
                            🛡️ Root Sovereign
                          </span>
                        </div>
                      </div>

                      {/* Permissions Strip */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted font-bold">Authority:</span>
                          <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-[9px] font-bold text-purple-300">
                            👑 Root Authority (All 9 Perms Active)
                          </span>
                        </div>

                        {isSuperAdminOrOwner && (
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() => handleOpenPermissionsModal(person)}
                            className="h-7 px-2.5 text-[10px] font-bold rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1"
                          >
                            <ShieldCheck className="size-3" />
                            <span>Manage Perms</span>
                          </Button>
                        )}
                      </div>

                      {/* Security Bar */}
                      <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-xs">
                        <span className="text-[10px] font-mono text-muted">
                          Protected Root Account · Cannot be warned, demoted or banned
                        </span>
                        <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px] font-bold">
                          Owner
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Single Owner Status Banner */}
              <div className="rounded-2xl border border-dashed border-border bg-raised/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-fg">Sole Platform Owner Governance</h4>
                    <p className="text-[11px] text-muted max-w-lg mt-0.5">
                      Only the Platform Owner (@abhishek) is in the Core Team. All demo and mock staff accounts have been removed. You can promote creators to Moderator or Admin anytime.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTeamSubCategory("creators")}
                  className="h-8 text-xs font-bold rounded-xl border-border shrink-0 gap-1"
                >
                  <Plus className="size-3.5" />
                  <span>Promote Creator to Team</span>
                </Button>
              </div>
            </div>
          )}

          {/* Sub-Category 2: Platform Creators */}
          {teamSubCategory === "creators" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-sm font-bold text-fg flex items-center gap-2">
                  <span>Platform Creators Directory ({filteredCreators.length})</span>
                  <Badge className="bg-white/10 text-muted border-border text-[10px] font-black uppercase">
                    Community Tier
                  </Badge>
                </h2>
                <p className="text-[11px] text-muted">
                  General creators on RIFF. You can inspect warnings, moderate accounts, or promote creators to Team roles below.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredCreators.map((person) => {
                  const warnings = person.warningsCount || 0;
                  const isBanned = person.isBanned || false;
                  const role = person.role;

                  return (
                    <div
                      key={person.id}
                      className={cn(
                        "rounded-3xl border bg-surface/90 p-4 shadow-md backdrop-blur-xl flex flex-col justify-between space-y-3",
                        isBanned ? "border-rose-500/40 bg-rose-950/10" : "border-border",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-sm font-bold text-fg">{person.name}</h3>
                            <Badge className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-white/10 border-border text-muted">
                              {role.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-muted">@{person.handle}</p>
                          <p className="text-[11px] text-muted/80 mt-1 line-clamp-1">{person.bio}</p>
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-col items-end gap-1">
                          {isBanned ? (
                            <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[9px] font-black text-rose-400">
                              BANNED 🚫
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-mono font-black border",
                                warnings >= 5
                                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                                  : warnings > 0
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                              )}
                            >
                              ⚠️ {warnings}/5 Warnings
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap text-xs">
                        {myRole === "owner" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted font-bold">Assign Role:</span>
                            <select
                              value={person.role}
                              onChange={(e) => {
                                const newR = e.target.value as Person["role"];
                                const success = updateUserRole(person.handle, newR, myRole);
                                if (success) {
                                  playSound("cheer");
                                  toast.success(`Updated @${person.handle}'s role to ${newR.toUpperCase()}.`);
                                } else {
                                  toast.error(`Permission denied updating role.`);
                                }
                              }}
                              className="rounded-xl border border-border bg-raised p-1.5 text-[11px] font-bold text-fg"
                            >
                              <option value="creator">Creator</option>
                              <option value="brand">Brand</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-muted/60 uppercase">
                            Role: {person.role}
                          </span>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          {canPerformModeration(myRole, person.role) && (
                            <Button
                              size="sm"
                              variant="subtle"
                              onClick={() => {
                                setWarningUserHandle(person.handle);
                                setShowWarningModal(true);
                              }}
                              className="h-7 text-[10px] font-bold rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                            >
                              <AlertTriangle className="size-3 mr-1" />
                              Warn
                            </Button>
                          )}

                          {isSuperAdminOrOwner && canPerformModeration(myRole, person.role) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (isBanned) {
                                  unbanUser(person.handle, myRole);
                                  toast.info(`Unbanned @${person.handle}.`);
                                } else {
                                  banUser(person.handle, "Violation of platform guidelines", myRole);
                                  toast.error(`Banned @${person.handle}. Posts removed.`);
                                }
                              }}
                              className={cn(
                                "h-7 text-[10px] font-bold rounded-xl",
                                isBanned
                                  ? "text-emerald-400 hover:bg-emerald-500/10"
                                  : "text-rose-400 hover:bg-rose-500/10",
                              )}
                            >
                              {isBanned ? "Unban" : "Ban User"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3.5 Dedicated Roles & Governance Matrix Tab */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-surface/90 to-surface/80 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 text-sm">
                    🛡️
                  </span>
                  <h2 className="font-display text-base font-black text-fg">
                    Platform Roles & Permissions Matrix
                  </h2>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-black uppercase">
                    Governance Hierarchy
                  </Badge>
                </div>
                <p className="text-xs text-muted max-w-2xl">
                  Constitutional authority tiers, warning thresholds, demotion protocols, and assigned permission privileges for each role.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("team")}
                className="h-9 px-3.5 text-xs font-bold rounded-xl border-border bg-surface text-fg hover:bg-raised gap-1.5 self-start md:self-auto shadow-xs"
              >
                <Users className="size-3.5" />
                <span>Manage Core Team ({teamMembers.length})</span>
              </Button>
            </div>
          </div>

          {/* 5 Roles Breakdown Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. OWNER */}
            <div className="rounded-3xl border border-purple-500/30 bg-surface/95 p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👑</span>
                    <div>
                      <h3 className="font-display text-sm font-black text-fg">Owner</h3>
                      <p className="text-[10px] font-mono text-purple-400">Apex Founder (Tier 5)</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-bold">
                    {teamMembers.filter((m) => m.role === "owner").length} Active
                  </Badge>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Full sovereign control. Unrestricted bypass over submissions, categories, escrows, database configs, and staff appointments.
                </p>

                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span>Warning Policy:</span>
                    <span className="font-bold text-purple-300">Protected Root (Immune)</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Active Perms:</span>
                    <span className="font-bold text-purple-300">9 of 9 (Full Access)</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-muted/80 pt-2 border-t border-border">
                Assigned to: @abhishek
              </div>
            </div>

            {/* 2. SUPER ADMIN */}
            <div className="rounded-3xl border border-amber-500/30 bg-surface/95 p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h3 className="font-display text-sm font-black text-fg">Super Admin</h3>
                      <p className="text-[10px] font-mono text-amber-400">Executive Governance (Tier 4)</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">
                    {teamMembers.filter((m) => m.role === "super_admin").length} Active
                  </Badge>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Supervises staff accountability, enforces compliance, issues disciplinary warnings, reviews escrow payouts, and tunes economy.
                </p>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span>Warning Policy:</span>
                    <span className="font-bold text-amber-300">5 Warnings = Demotion</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Active Perms:</span>
                    <span className="font-bold text-amber-300">8 of 9 Permissions</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-muted/80 pt-2 border-t border-border">
                Appointed by: Platform Owner
              </div>
            </div>

            {/* 3. ADMIN */}
            <div className="rounded-3xl border border-sky-500/30 bg-surface/95 p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <h3 className="font-display text-sm font-black text-fg">Admin</h3>
                      <p className="text-[10px] font-mono text-sky-400">Operations Curator (Tier 3)</p>
                    </div>
                  </div>
                  <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] font-bold">
                    {teamMembers.filter((m) => m.role === "admin").length} Active
                  </Badge>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Reviews creator submissions, curates trending categories, manages reward point rates, and arbitrates rejected content appeals.
                </p>

                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span>Warning Policy:</span>
                    <span className="font-bold text-sky-300">5 Warnings = Demotion</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Active Perms:</span>
                    <span className="font-bold text-sky-300">3 of 9 Permissions</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-muted/80 pt-2 border-t border-border">
                Supervised by: Super Admin & Owner
              </div>
            </div>

            {/* 4. MODERATOR */}
            <div className="rounded-3xl border border-emerald-500/30 bg-surface/95 p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚖️</span>
                    <div>
                      <h3 className="font-display text-sm font-black text-fg">Moderator</h3>
                      <p className="text-[10px] font-mono text-emerald-400">Content Compliance (Tier 2)</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
                    {teamMembers.filter((m) => m.role === "moderator").length} Active
                  </Badge>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Resolves user reports, issues content takedowns, flags guideline violations, and verifies submission queue items.
                </p>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span>Warning Policy:</span>
                    <span className="font-bold text-emerald-300">5 Warnings = Demotion</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Active Perms:</span>
                    <span className="font-bold text-emerald-300">2 of 9 Permissions</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-muted/80 pt-2 border-t border-border">
                Supervised by: Admins & Owner
              </div>
            </div>

            {/* 5. CREATOR */}
            <div className="rounded-3xl border border-border bg-surface/95 p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎨</span>
                    <div>
                      <h3 className="font-display text-sm font-black text-fg">Creator</h3>
                      <p className="text-[10px] font-mono text-muted">Community Creator (Tier 1)</p>
                    </div>
                  </div>
                  <Badge className="bg-white/10 text-muted border-border text-[10px] font-bold">
                    {platformCreators.length} Active
                  </Badge>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Standard community member. Creates reels, earns RIFF points, participates in sponsor campaigns, and requests cashouts.
                </p>

                <div className="rounded-xl border border-border bg-raised p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span>Warning Policy:</span>
                    <span className="font-bold text-amber-400">5 Warnings = Suspension</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Staff Perms:</span>
                    <span className="font-bold text-muted">0 (Public User)</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-muted/80 pt-2 border-t border-border">
                Standard platform participant
              </div>
            </div>
          </div>

          {/* Granular Permissions Matrix Table */}
          <div className="rounded-3xl border border-border bg-surface/95 p-5 shadow-xl space-y-4">
            <div>
              <h3 className="font-display text-sm font-bold text-fg flex items-center gap-2">
                <Scale className="size-4 text-purple-400" />
                <span>Granular Permissions Matrix by Role</span>
              </h3>
              <p className="text-[11px] text-muted">
                Detailed constitutional capability map across every system authority level.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] text-muted font-bold">
                    <th className="py-2.5 pr-4">System Capability</th>
                    <th className="py-2.5 px-3 text-center text-purple-400">Owner</th>
                    <th className="py-2.5 px-3 text-center text-amber-400">Super Admin</th>
                    <th className="py-2.5 px-3 text-center text-sky-400">Admin</th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">Moderator</th>
                    <th className="py-2.5 pl-3 text-center text-muted">Creator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-[11px]">
                  {[
                    {
                      name: "submission.review",
                      desc: "Review & approve pending video reels in review queue",
                      owner: true,
                      super: true,
                      admin: true,
                      mod: true,
                      creator: false,
                    },
                    {
                      name: "category.manage",
                      desc: "Configure reward economy, category multipliers & limits",
                      owner: true,
                      super: true,
                      admin: true,
                      mod: false,
                      creator: false,
                    },
                    {
                      name: "appeal.review",
                      desc: "Arbitrate disputes and re-examine rejected submissions",
                      owner: true,
                      super: true,
                      admin: true,
                      mod: false,
                      creator: false,
                    },
                    {
                      name: "moderation.manage",
                      desc: "Resolve user reports, remove posts & issue warnings",
                      owner: true,
                      super: true,
                      admin: false,
                      mod: true,
                      creator: false,
                    },
                    {
                      name: "withdrawal.review",
                      desc: "Arbitrate, approve & settle creator escrow cashouts",
                      owner: true,
                      super: true,
                      admin: false,
                      mod: false,
                      creator: false,
                    },
                    {
                      name: "campaign.manage",
                      desc: "Create and supervise brand sponsorship campaigns",
                      owner: true,
                      super: true,
                      admin: false,
                      mod: false,
                      creator: false,
                    },
                    {
                      name: "wallet.view",
                      desc: "Inspect platform payout balances & treasury escrows",
                      owner: true,
                      super: true,
                      admin: false,
                      mod: false,
                      creator: false,
                    },
                    {
                      name: "audit.view",
                      desc: "Inspect immutable platform governance audit trail",
                      owner: true,
                      super: true,
                      admin: false,
                      mod: false,
                      creator: false,
                    },
                    {
                      name: "staff.manage",
                      desc: "Assign roles, demote staff & configure permission tiers",
                      owner: true,
                      super: false,
                      admin: false,
                      mod: false,
                      creator: false,
                    },
                  ].map((perm) => (
                    <tr key={perm.name} className="hover:bg-raised/40 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="font-mono font-bold text-fg">{perm.name}</div>
                        <div className="text-[10px] text-muted">{perm.desc}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                        {perm.owner ? "✓" : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                        {perm.super ? "✓" : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-sky-400">
                        {perm.admin ? "✓" : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                        {perm.mod ? "✓" : "—"}
                      </td>
                      <td className="py-2.5 pl-3 text-center font-mono text-muted/40">
                        {perm.creator ? "✓" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2.5 Super Admin Governance Tab */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface/90 to-surface/80 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <Zap className="size-4" />
                  </span>
                  <h2 className="font-display text-base font-black text-fg">
                    Super Admin Operational Governance
                  </h2>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-black uppercase">
                    Staff Authority Tier 4
                  </Badge>
                </div>
                <p className="text-xs text-muted max-w-2xl leading-relaxed">
                  Super Admins manage staff accountability, enforce the 5-warning demotion protocol, promote/demote between Creator, Moderator, and Admin tiers, arbitrate contentious reviews, and tune the reward economy.
                </p>
              </div>

              {/* Quick Action Button */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setWarningUserHandle("");
                    setWarningReasonInput("");
                    setShowWarningModal(true);
                  }}
                  className="rounded-xl bg-amber-500 text-black font-black text-xs gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:bg-amber-400"
                >
                  <AlertTriangle className="size-3.5 stroke-[2.5]" />
                  <span>Issue Disciplinary Warning</span>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3">
                <span className="text-[10px] text-muted font-bold block uppercase tracking-wider">Monitored Staff</span>
                <span className="font-mono text-xl font-black text-fg mt-0.5 block">{staffMembers.length}</span>
                <span className="text-[10px] text-muted">Admins &amp; Moderators</span>
              </div>
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3">
                <span className="text-[10px] text-amber-400/90 font-bold block uppercase tracking-wider">At-Risk Staff</span>
                <span className="font-mono text-xl font-black text-amber-400 mt-0.5 block">{atRiskStaffCount}</span>
                <span className="text-[10px] text-amber-400/70">&ge;3/5 Warnings</span>
              </div>
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3">
                <span className="text-[10px] text-sky-400/90 font-bold block uppercase tracking-wider">Review Queue</span>
                <span className="font-mono text-xl font-black text-sky-400 mt-0.5 block">{pendingSubmissions.length}</span>
                <span className="text-[10px] text-sky-400/70">Awaiting Arbitration</span>
              </div>
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3">
                <span className="text-[10px] text-emerald-400/90 font-bold block uppercase tracking-wider">Economy Sinks</span>
                <span className="font-mono text-xl font-black text-emerald-400 mt-0.5 block">{categories.length}</span>
                <span className="text-[10px] text-emerald-400/70">Calibrated Categories</span>
              </div>
            </div>
          </div>

          {/* Section 1: Staff Accountability & 5-Warning Demotion Protocol */}
          <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-accent" />
                  <h3 className="font-display text-sm font-bold text-fg">
                    Staff Accountability &amp; 5-Warning Demotion Monitor
                  </h3>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  Admins and Moderators with 5 warnings are automatically demoted to Creator with privileges revoked.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center rounded-xl bg-raised border border-white/10 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setGovernanceFilter("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all",
                      governanceFilter === "all" ? "bg-accent text-black font-black" : "text-muted hover:text-fg",
                    )}
                  >
                    All ({staffMembers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGovernanceFilter("admin")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all",
                      governanceFilter === "admin" ? "bg-sky-500 text-white font-black" : "text-muted hover:text-fg",
                    )}
                  >
                    Admins ({staffMembers.filter((s) => s.role === "admin").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGovernanceFilter("moderator")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all",
                      governanceFilter === "moderator" ? "bg-emerald-500 text-white font-black" : "text-muted hover:text-fg",
                    )}
                  >
                    Mods ({staffMembers.filter((s) => s.role === "moderator").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGovernanceFilter("at_risk")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1",
                      governanceFilter === "at_risk" ? "bg-rose-500 text-white font-black" : "text-amber-400 hover:text-amber-300",
                    )}
                  >
                    <span>⚠️ At Risk</span>
                    <span className="font-mono text-[10px]">({atRiskStaffCount})</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted" />
                  <Input
                    placeholder="Search staff..."
                    value={governanceSearch}
                    onChange={(e) => setGovernanceSearch(e.target.value)}
                    className="h-8 text-xs pl-8 w-36 bg-raised rounded-xl border-white/10"
                  />
                </div>
              </div>
            </div>

            {/* Constitutional Alert Box */}
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block text-amber-300">Constitutional Protocol Enforcement:</span>
                <span className="text-muted leading-relaxed">
                  Every category misclassification or guideline violation increments a staff member&apos;s warning tally. Upon reaching <strong>5 warnings</strong>, the system triggers instantaneous demotion to Creator tier, flushes staff privileges, and writes to the immutable audit log.
                </span>
              </div>
            </div>

            {/* Staff Cards Grid */}
            {filteredStaff.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-muted text-xs">
                No staff members found matching the selected filter.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredStaff.map((staff) => {
                  const warnings = staff.warningsCount || 0;
                  const isDemoted = warnings >= 5;
                  const isAtRisk = warnings >= 3 && warnings < 5;

                  return (
                    <div
                      key={staff.id}
                      className={cn(
                        "rounded-2xl border p-4 backdrop-blur-md flex flex-col justify-between space-y-3 transition-all",
                        isDemoted
                          ? "border-rose-500/50 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                          : isAtRisk
                            ? "border-amber-500/40 bg-amber-950/15"
                            : "border-white/10 bg-raised/70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-sm font-bold text-fg">{staff.name}</h4>
                            <Badge
                              className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                staff.role === "admin"
                                  ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                              )}
                            >
                              {staff.role}
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-muted">@{staff.handle}</p>
                          <p className="text-[11px] text-muted/80 mt-1 line-clamp-1">{staff.bio}</p>
                        </div>

                        {/* Status Tag */}
                        <div className="shrink-0 text-right">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-mono font-black border inline-block",
                              isDemoted
                                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                                : isAtRisk
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  : warnings > 0
                                    ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                            )}
                          >
                            {isDemoted
                              ? "DEMOTED ⚠️"
                              : isAtRisk
                                ? `AT RISK (${warnings}/5)`
                                : warnings > 0
                                  ? `NOTICED (${warnings}/5)`
                                  : "GOOD STANDING"}
                          </span>
                        </div>
                      </div>

                      {/* 5-Pip Warning Meter */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted font-bold text-[10px] uppercase tracking-wider">
                            Disciplinary Meter
                          </span>
                          <span className="font-mono text-xs font-bold text-fg">
                            {warnings} / 5 Warnings
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((pipIndex) => {
                            const isFilled = warnings >= pipIndex;
                            return (
                              <div
                                key={pipIndex}
                                className={cn(
                                  "h-2.5 flex-1 rounded-full transition-all",
                                  isFilled
                                    ? pipIndex >= 5
                                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                                      : pipIndex >= 3
                                        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                                        : "bg-yellow-400"
                                    : "bg-white/10",
                                )}
                              />
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted italic">
                          {isDemoted
                            ? "Auto-demotion triggered. Position reverted to Creator."
                            : isAtRisk
                              ? "Critical: Only 1-2 warnings remaining before auto-demotion!"
                              : "Staff member in good operational standing."}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs">
                        {/* Super Admin Delegation Controls */}
                        <div className="flex items-center gap-1.5">
                          {staff.role === "moderator" ? (
                            <Button
                              size="sm"
                              variant="subtle"
                              onClick={() => handleQuickRoleChange(staff.handle, "admin")}
                              className="h-7 text-[10px] font-bold rounded-xl border border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                            >
                              <Shield className="size-3 mr-1" />
                              Promote to Admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="subtle"
                              onClick={() => handleQuickRoleChange(staff.handle, "moderator")}
                              className="h-7 text-[10px] font-bold rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                            >
                              Demote to Mod
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickRoleChange(staff.handle, "creator")}
                            className="h-7 text-[10px] font-bold rounded-xl text-muted hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            Revert to Creator
                          </Button>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                          {/* Granular Permissions Button */}
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() => handleOpenPermissionsModal(staff)}
                            className="h-7 text-[10px] font-bold rounded-xl border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 gap-1"
                          >
                            <ShieldCheck className="size-3" />
                            <span>Perms ({(staff.permissions || []).length})</span>
                          </Button>

                          {/* Reset Warnings */}
                          {warnings > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetWarnings(staff.handle)}
                              className="h-7 text-[10px] font-bold rounded-xl text-muted hover:text-emerald-300 hover:bg-emerald-500/10"
                              title="Clear disciplinary record"
                            >
                              <RotateCcw className="size-3 mr-1" />
                              Reset
                            </Button>
                          )}

                          {/* Issue Warning */}
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() => {
                              setWarningUserHandle(staff.handle);
                              setShowWarningModal(true);
                            }}
                            className="h-7 text-[10px] font-bold rounded-xl border border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                          >
                            <AlertTriangle className="size-3 mr-1" />
                            Warn (+1)
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Escalated Review Arbitration Queue */}
          <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-accent" />
                  <h3 className="font-display text-sm font-bold text-fg">
                    Senior Review Arbitration Queue
                  </h3>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  Arbitrate category misclassifications, resolve rejected content appeals, and override reviewer errors.
                </p>
              </div>
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] font-black">
                {pendingSubmissions.length} PENDING ARBITRATION
              </Badge>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-muted text-xs">
                No submissions currently pending arbitration. Review queue is fully cleared!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSubmissions.slice(0, 4).map((sub) => {
                  const selectedCategory = categories.find((c) => c.id === sub.userSelectedCategoryId);

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-white/10 bg-raised/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-xs font-bold text-fg">
                            {sub.caption || sub.topCaption || "Untitled Content"}
                          </span>
                          <span className="font-mono text-[10px] text-muted">@{sub.authorHandle}</span>
                          <Badge className="bg-white/10 text-fg text-[9px] border-white/20">
                            {selectedCategory?.icon} {selectedCategory?.name || sub.userSelectedCategoryId}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted line-clamp-1">
                          Media: {sub.mediaUrl || "Live video clip"} · Aspect: {sub.aspectRatio || "9:16"}
                        </p>
                      </div>

                      {/* Senior Arbitration Actions */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleApproveDefault(sub)}
                          className="h-8 rounded-xl bg-accent text-black font-black text-xs gap-1 hover:bg-accent/90"
                        >
                          <Check className="size-3.5 stroke-[3]" />
                          <span>Arbitrate &amp; Approve</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="subtle"
                          onClick={() => {
                            setRejectingId(sub.id);
                            setCustomReasonNote("Super Admin Arbitrated Rejection");
                          }}
                          className="h-8 rounded-xl text-xs font-bold text-rose-300 border border-rose-500/30 hover:bg-rose-500/10"
                        >
                          <X className="size-3.5" />
                          <span>Reject</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setWarningUserHandle(sub.authorHandle);
                            setWarningReasonInput("Category misclassification on submission");
                            setShowWarningModal(true);
                          }}
                          className="h-8 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/10"
                          title="Warn Submitter"
                        >
                          <AlertTriangle className="size-3.5 mr-1" />
                          <span>Warn Creator</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Category Economy Calibration (Super Admin Points Levers) */}
          <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="size-4 text-emerald-400" />
                  <h3 className="font-display text-sm font-bold text-fg">
                    Category Economy Calibration (Super Admin Levers)
                  </h3>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  Tune submission reward points across categories to direct creator incentives without accessing root payout freezes.
                </p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-black">
                {categories.length} ACTIVE CATEGORIES
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-white/10 bg-raised/70 p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <h4 className="font-display text-xs font-bold text-fg">{cat.name}</h4>
                      <span className="text-[10px] text-muted font-mono font-bold">
                        +{cat.approvalPoints} pts / approval
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newPts = Math.max(5, cat.approvalPoints - 5);
                        updateCategoryPoints(cat.id, newPts);
                        toast.info(`Set ${cat.name} to ${newPts} pts`);
                      }}
                      className="size-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-black text-muted flex items-center justify-center transition"
                    >
                      -5
                    </button>
                    <span className="font-mono text-xs font-black w-8 text-center text-accent">
                      {cat.approvalPoints}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newPts = cat.approvalPoints + 5;
                        updateCategoryPoints(cat.id, newPts);
                        toast.info(`Set ${cat.name} to ${newPts} pts`);
                      }}
                      className="size-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-black text-accent flex items-center justify-center transition"
                    >
                      +5
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Constitutional Separation of Platform Powers */}
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-surface/90 to-surface/80 p-5 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Gavel className="size-4 text-purple-400" />
              <h3 className="font-display text-sm font-bold text-fg">
                Constitutional Separation of Platform Powers
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              RIFF maintains a rigorous 5-tier constitutional authority matrix. Powers are strictly segregated so daily operational staff cannot tamper with treasury locks or sovereignty kill switches.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
              <div className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                  <Crown className="size-3.5" />
                  <span>👑 Owner (Tier 5)</span>
                </div>
                <ul className="text-[11px] text-muted space-y-1 list-disc list-inside">
                  <li>Root System Sovereignty</li>
                  <li>Platform Kill Switches</li>
                  <li>Emergency Wallet Freeze</li>
                  <li>Assign Super Admins &amp; Owners</li>
                  <li>Global Payout Freezes</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                  <Zap className="size-3.5" />
                  <span>⚡ Super Admin (Tier 4)</span>
                </div>
                <ul className="text-[11px] text-muted space-y-1 list-disc list-inside">
                  <li>Lead Staff Operations</li>
                  <li>5-Warning Demotion Protocol</li>
                  <li>Creator &harr; Mod &harr; Admin Delegation</li>
                  <li>Senior Review Arbitration</li>
                  <li>Calibrate Category Points</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-sky-500/40 bg-sky-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-sky-300 font-bold text-xs">
                  <Shield className="size-3.5" />
                  <span>🛡️ Admin (Tier 3)</span>
                </div>
                <ul className="text-[11px] text-muted space-y-1 list-disc list-inside">
                  <li>Submission Queue Triage</li>
                  <li>Approve &amp; Award Points</li>
                  <li>Category Reclassification</li>
                  <li>Community Content Reports</li>
                  <li>Cannot Assign Roles or Warn Peers</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                  <ShieldAlert className="size-3.5" />
                  <span>🧹 Moderator (Tier 2)</span>
                </div>
                <ul className="text-[11px] text-muted space-y-1 list-disc list-inside">
                  <li>Community Report Resolution</li>
                  <li>Flag Inappropriate Content</li>
                  <li>Remove Abusive Media</li>
                  <li>Zero Economic Access</li>
                  <li>Zero Role Management</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Global Content & Category Controls Tab */}
      {activeTab === "categories" && !canManageCategories ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-12 text-center max-w-lg mx-auto backdrop-blur-xl shadow-xl">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto mb-4 shadow-[0_0_25px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-fg">
            Category Management Restricted
          </h3>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            Your staff account (@{myProfile.handle}) lacks the{" "}
            <code className="bg-black/40 px-1.5 py-0.5 rounded text-rose-300 font-mono">category.manage</code>{" "}
            permission required to manage content categories, format restrictions, and reward economics.
          </p>
        </div>
      ) : activeTab === "categories" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-accent" />
                <h2 className="font-display text-sm font-bold text-fg">
                  Global Content & Category Controls
                </h2>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Manage categories, content-type format restrictions (memes vs reels), review policies, priority ordering, and RIFF Points rewards.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddCatModal(true)}
              className="rounded-xl bg-accent text-black font-bold text-xs gap-1.5 shrink-0 hover:bg-accent/90 shadow-sm"
            >
              <Plus className="size-3.5 stroke-[3]" />
              <span>Create Category</span>
            </Button>
          </div>

          {/* Category KPI Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-surface/80 p-3.5 space-y-1">
              <span className="text-[11px] text-muted block font-medium">Total Categories</span>
              <span className="text-xl font-bold font-mono text-fg">{categories.length}</span>
              <span className="text-[10px] text-muted/60 block">Configured</span>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
              <span className="text-[11px] text-emerald-400/80 block font-medium">Active Categories</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {categories.filter((c) => c.status === "active").length}
              </span>
              <span className="text-[10px] text-emerald-400/50 block">Submissions Open</span>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
              <span className="text-[11px] text-amber-400/80 block font-medium">Default Fallback</span>
              <span className="text-sm font-bold truncate text-amber-300 block">
                {categories.find((c) => c.isDefault)?.name || "Relatable"}
              </span>
              <span className="text-[10px] text-amber-400/50 block font-mono">Platform Fallback</span>
            </div>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 space-y-1">
              <span className="text-[11px] text-sky-400/80 block font-medium">Average Reward</span>
              <span className="text-xl font-bold font-mono text-sky-300">
                {Math.round(
                  categories.reduce((acc, c) => acc + (c.approvalPoints || 10), 0) /
                    (categories.length || 1),
                )}{" "}
                pts
              </span>
              <span className="text-[10px] text-sky-400/50 block">Per Approved Post</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface/80 border border-white/10 rounded-2xl p-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 size-4 text-muted" />
              <input
                type="text"
                placeholder="Search by category name or #slug..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-raised pl-9 pr-3 py-1.5 text-xs text-fg placeholder:text-muted/50 outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {(["all", "active", "inactive", "archived"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCatStatusFilter(st)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition",
                    catStatusFilter === st
                      ? "bg-accent text-black shadow-sm"
                      : "bg-white/5 text-muted hover:text-fg hover:bg-white/10",
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories
              .filter((cat) => {
                const matchSearch =
                  cat.name.toLowerCase().includes(catSearch.toLowerCase()) ||
                  cat.slug.toLowerCase().includes(catSearch.toLowerCase());
                const matchStatus = catStatusFilter === "all" || cat.status === catStatusFilter;
                return matchSearch && matchStatus;
              })
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((cat, idx, arr) => {
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;

                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "rounded-3xl border p-4 flex flex-col justify-between space-y-3 transition shadow-sm backdrop-blur-md",
                      cat.status === "active"
                        ? "border-white/10 bg-surface/90"
                        : cat.status === "archived"
                          ? "border-rose-500/20 bg-rose-950/10 opacity-70"
                          : "border-amber-500/20 bg-amber-950/10",
                    )}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl">{cat.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-display text-sm font-bold text-fg">{cat.name}</h3>
                              {cat.isDefault && (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-bold flex items-center gap-1 py-0 px-1.5">
                                  <Star className="size-2.5 fill-amber-300" />
                                  <span>DEFAULT</span>
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted font-mono">
                              #{cat.slug} · Priority #{cat.sortOrder || idx + 1}
                            </span>
                          </div>
                        </div>

                        {/* Status & Points Badges */}
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-wider",
                              cat.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : cat.status === "archived"
                                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-400 border-amber-500/30",
                            )}
                          >
                            {cat.status === "active" ? "Active" : cat.status === "archived" ? "Archived" : "Paused"}
                          </Badge>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-mono font-bold">
                            +{cat.approvalPoints} pts
                          </Badge>
                        </div>
                      </div>

                      {/* Rules Badges: Content Type & Approval Policy */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            cat.allowedTypes === "post"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                              : cat.allowedTypes === "reel"
                                ? "bg-pink-500/10 text-pink-300 border-pink-500/30"
                                : "bg-sky-500/10 text-sky-300 border-sky-500/30",
                          )}
                        >
                          {cat.allowedTypes === "post" ? (
                            <ImageIcon className="size-2.5" />
                          ) : cat.allowedTypes === "reel" ? (
                            <Film className="size-2.5" />
                          ) : (
                            <Layers className="size-2.5" />
                          )}
                          <span>
                            {cat.allowedTypes === "post"
                              ? "Memes Only"
                              : cat.allowedTypes === "reel"
                                ? "Reels Only"
                                : "All Formats"}
                          </span>
                        </span>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            cat.requiresReview === false
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/30",
                          )}
                        >
                          <CheckCircle2 className="size-2.5" />
                          <span>{cat.requiresReview === false ? "Auto-Approve" : "Review Required"}</span>
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted mt-2 leading-relaxed">
                        {cat.description || "No description provided."}
                      </p>
                    </div>

                    {/* Footer Controls & Priority Reordering */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted">Reward pts:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateCategoryPoints(cat.id, Math.max(5, cat.approvalPoints - 5))}
                            className="flex size-6 items-center justify-center rounded-lg bg-raised hover:bg-white/10 text-xs font-bold text-muted"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs font-bold text-fg w-8 text-center">
                            {cat.approvalPoints}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCategoryPoints(cat.id, cat.approvalPoints + 5)}
                            className="flex size-6 items-center justify-center rounded-lg bg-raised hover:bg-white/10 text-xs font-bold text-accent"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveCategory(cat.id, "up")}
                            className="size-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-muted hover:text-fg transition"
                            title="Move Priority Up"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveCategory(cat.id, "down")}
                            className="size-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-muted hover:text-fg transition"
                            title="Move Priority Down"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          {!cat.isDefault && cat.status === "active" && (
                            <button
                              type="button"
                              onClick={() => {
                                setDefaultCategory(cat.id);
                                toast.success(`"${cat.name}" is now the default fallback category.`);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-muted hover:text-amber-300 text-[10px] font-bold transition flex items-center gap-1"
                              title="Set as Platform Default"
                            >
                              <Star className="size-2.5" />
                              <span>Set Default</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              toggleCategoryStatus(cat.id);
                              toast.info(
                                cat.status === "active"
                                  ? `Paused submissions for "${cat.name}".`
                                  : `Activated submissions for "${cat.name}".`,
                              );
                            }}
                            className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold transition",
                              cat.status === "active"
                                ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
                            )}
                          >
                            {cat.status === "active" ? "Pause" : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingCategory(cat)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-fg text-xs transition"
                            title="Edit Category Rules"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 4. Audit Trail Tab */}
      {activeTab === "audit" && !canViewAudit ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-12 text-center max-w-lg mx-auto backdrop-blur-xl shadow-xl">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto mb-4 shadow-[0_0_25px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="size-7" />
          </div>
          <h3 className="font-display text-base font-bold text-fg">
            Audit Trail Access Restricted
          </h3>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            Your staff account (@{myProfile.handle}) lacks the{" "}
            <code className="bg-black/40 px-1.5 py-0.5 rounded text-rose-300 font-mono">audit.view</code>{" "}
            permission required to inspect the cryptographic platform audit trail.
          </p>
        </div>
      ) : activeTab === "audit" && (
        <div className="space-y-4">
          {/* Audit Controls & Filter Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/80 border border-white/10 p-3 rounded-2xl">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setAuditFilter("all")}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold transition-all",
                  auditFilter === "all"
                    ? "bg-accent text-black shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>All ({auditLogs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditFilter("approvals")}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1",
                  auditFilter === "approvals"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>✅ Approvals</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditFilter("rejections")}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1",
                  auditFilter === "rejections"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>❌ Rejections</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditFilter("reports")}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1",
                  auditFilter === "reports"
                    ? "bg-amber-400 text-black shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>🛡️ Reports</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditFilter("disciplinary")}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1",
                  auditFilter === "disciplinary"
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-muted hover:text-fg bg-white/5",
                )}
              >
                <span>⚠️ Warnings &amp; Bans</span>
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted" />
              <Input
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="h-8 text-xs pl-8 w-44 bg-surface rounded-xl border-white/10"
              />
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-surface/50 p-12 text-center text-xs text-muted">
              No audit log entries matching your active filter or search.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-xl backdrop-blur-xl">
              <div className="divide-y divide-white/5">
                {filteredAuditLogs.map((log) => (
                  <div key={log.id} className="p-4 text-xs space-y-2 hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            log.action === "approve" && "bg-emerald-400",
                            log.action === "change_category" && "bg-accent",
                            log.action === "demote_admin" && "bg-purple-400 animate-pulse",
                            log.action === "issue_warning" && "bg-amber-400",
                            log.action === "ban_user" && "bg-rose-500",
                            log.action === "delete_post" && "bg-rose-400",
                            log.action === "reject" && "bg-rose-400",
                            log.action === "report_actioned" && "bg-rose-500",
                            log.action === "report_dismissed" && "bg-zinc-400",
                          )}
                        />
                        <span className="font-bold text-fg capitalize">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-mono text-muted uppercase">
                          By @{log.actorId} ({log.actorRole})
                        </span>
                        {log.submitterHandle && (
                          <span className="text-[10px] text-accent font-mono">
                            Target: @{log.submitterHandle}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted font-mono">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-muted text-[11px] leading-relaxed">
                      {log.reason}
                    </p>

                    {(log.approvedCategory || log.pointsAwarded !== undefined) && (
                      <div className="flex items-center gap-3 text-[10px] text-muted font-mono pt-1">
                        {log.approvedCategory && (
                          <span>Category: <strong className="text-fg">{log.approvedCategory}</strong></span>
                        )}
                        {log.pointsAwarded !== undefined && log.pointsAwarded > 0 && (
                          <span className="text-emerald-400 font-bold">
                            Reward: +{log.pointsAwarded} pts
                          </span>
                        )}
                        {log.postCaption && (
                          <span className="truncate italic max-w-xs text-white/40">
                            "{log.postCaption}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Platform Rules & Guidelines Tab */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
              <BookOpen className="size-5 text-accent" />
              <span>RIFF Platform Rules & Governance Policy</span>
            </h2>
            <p className="text-xs text-muted mt-1">
              Official community standards, admin category auto-approval rules, and moderation hierarchy policies.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Rule 1 */}
            <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="size-20 text-accent" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-accent/20 text-accent font-bold text-xs">
                  01
                </span>
                <h3 className="font-display text-sm font-bold text-fg">
                  Admin Auto-Publishing Policy
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Posts and reels created by <strong className="text-fg">Admin</strong>, <strong className="text-fg">Super Admin</strong>, or <strong className="text-fg">Owner</strong> are automatically approved and published instantly into the selected category. Category reward points are credited automatically. Normal creator posts undergo review in the Review Queue.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="rounded-3xl border border-amber-500/30 bg-amber-950/10 p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertTriangle className="size-20 text-amber-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs">
                  02
                </span>
                <h3 className="font-display text-sm font-bold text-amber-300">
                  5-Warning Demotion Rule
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                If an Admin posts in an incorrect category, a Super Admin or Owner will reclassify the category. Reclassifying an Admin's post generates 1 category warning. Upon receiving <strong className="text-rose-400">5 warnings</strong>, the Admin is <strong className="text-rose-400">automatically demoted to Creator status</strong>.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="rounded-3xl border border-purple-500/30 bg-purple-950/10 p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Crown className="size-20 text-purple-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 font-bold text-xs">
                  03
                </span>
                <h3 className="font-display text-sm font-bold text-purple-300">
                  Moderation Hierarchy
                </h3>
              </div>
              <div className="text-xs text-muted space-y-1.5">
                <p><strong className="text-purple-300">Owner:</strong> Full authority to ban/unban accounts, assign roles, delete posts, & configure category rewards.</p>
                <p><strong className="text-amber-300">Super Admin:</strong> Can delete posts and issue warnings to Admins & Creators; can reclassify Admin posts.</p>
                <p><strong className="text-sky-300">Admin / Moderator:</strong> Can delete creator posts and issue warnings to Creators.</p>
              </div>
            </div>

            {/* Rule 4 */}
            <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Award className="size-20 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  04
                </span>
                <h3 className="font-display text-sm font-bold text-fg">
                  Category Points & Content Standards
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Creators earn points upon post approval based on the category's point value. Spam, watermarked reposts, misleading captions, or inappropriate content will be rejected by moderators.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. System Configuration Tab */}
      {activeTab === "config" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/20 text-accent border border-accent/30 shadow-md">
                  <Sliders className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg font-bold text-fg">
                      System Configuration &amp; Policies
                    </h2>
                    <Badge
                      className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                        isOwner && "bg-purple-500/20 border-purple-500/40 text-purple-300",
                        isSuperAdmin && "bg-amber-500/20 border-amber-500/40 text-amber-300",
                        !isSuperAdminOrOwner && "bg-sky-500/20 border-sky-500/40 text-sky-300",
                      )}
                    >
                      {isOwner
                        ? "👑 Owner Root Authority"
                        : isSuperAdmin
                          ? "⚡ Super Admin (Operational)"
                          : "🛡️ Read-Only Audit"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {isOwner
                      ? "Full authority to configure all runtime parameters, security limits, and platform policies."
                      : isSuperAdmin
                        ? "Operational management access. Owner-only security and platform core settings remain locked."
                        : "Read-only inspection of active system configuration parameters and policies."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    getSystemConfigsServerFn().then((cfgs) => {
                      if (cfgs && Array.isArray(cfgs)) {
                        setSystemConfigs(cfgs);
                        toast.success("Configurations refreshed.");
                      }
                    });
                    loadConfigAudit();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-raised px-3 py-1.5 text-xs font-bold text-fg hover:bg-white/10 transition"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Informational Guidance Notice */}
            {!canEditOperationalConfig && (
              <div className="mt-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 p-3 text-xs text-sky-200 flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-sky-400 shrink-0" />
                <span>
                  <strong>Read-Only Mode:</strong> As an Admin, you can inspect runtime system configuration values. Modifying parameters requires Super Admin or Owner privileges.
                </span>
              </div>
            )}

            {isSuperAdmin && !isOwner && (
              <div className="mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200 flex items-center gap-2.5">
                <Lock className="size-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Least-Privilege Guard:</strong> Core security thresholds and platform kill-switches (maintenance mode, emergency freezes) are reserved for the Platform Owner.
                </span>
              </div>
            )}
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  "all",
                  "platform",
                  "content",
                  "moderation",
                  "economy",
                  "notifications",
                  "security",
                ] as const
              ).map((cat) => {
                const isActive = configCategoryFilter === cat;
                const count =
                  cat === "all"
                    ? storeSystemConfigs.length
                    : storeSystemConfigs.filter((c) => c.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setConfigCategoryFilter(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap",
                      isActive
                        ? "bg-accent text-black font-black shadow-sm"
                        : "bg-surface text-muted hover:text-fg hover:bg-raised",
                    )}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative sm:w-60">
              <Search className="size-4 text-muted absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Search config..."
                value={configSearch}
                onChange={(e) => setConfigSearch(e.target.value)}
                className="pl-9 h-9 bg-surface border-white/10 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Config Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeSystemConfigs
              .filter((c) => {
                if (configCategoryFilter !== "all" && c.category !== configCategoryFilter) {
                  return false;
                }
                if (configSearch.trim()) {
                  const q = configSearch.toLowerCase();
                  return (
                    c.key.toLowerCase().includes(q) ||
                    (c.description && c.description.toLowerCase().includes(q)) ||
                    c.category.toLowerCase().includes(q) ||
                    c.value.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .map((c) => {
                const currentVal =
                  draftConfigs[c.key] !== undefined ? draftConfigs[c.key] : c.value;
                const isDirty =
                  draftConfigs[c.key] !== undefined && draftConfigs[c.key] !== c.value;
                const isOwnerOnly = OWNER_ONLY_CONFIG_KEYS.includes(c.key as any);
                const isLockedForMe = isOwnerOnly && !isOwner;
                const canEditThis = canEditOperationalConfig && !isLockedForMe;

                return (
                  <div
                    key={c.key}
                    className={cn(
                      "rounded-3xl border p-5 flex flex-col justify-between transition-all",
                      isDirty && "border-accent bg-accent/5 shadow-md",
                      !isDirty && isLockedForMe && "border-amber-500/20 bg-amber-950/10",
                      !isDirty && !isLockedForMe && "border-white/10 bg-surface/90 hover:border-white/20",
                    )}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                            {c.category}
                          </span>
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-mono text-muted">
                            {c.valueType}
                          </span>
                          {isOwnerOnly && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-black">
                              🔒 OWNER ONLY
                            </Badge>
                          )}
                          {c.isPublic && (
                            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[9px] font-bold">
                              🌐 PUBLIC
                            </Badge>
                          )}
                        </div>

                        {isDirty && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-black text-black animate-pulse">
                            STAGED
                          </span>
                        )}
                      </div>

                      {/* Key & Description */}
                      <div className="font-mono text-xs font-bold text-fg break-all">
                        {c.key}
                      </div>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        {c.description || "Runtime operational setting"}
                      </p>

                      {/* Editor / Read-only Control */}
                      <div className="mt-4">
                        {isLockedForMe || !canEditThis ? (
                          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-raised/60 p-2.5">
                            <span className="font-mono text-xs font-bold text-fg">
                              {c.valueType === "boolean"
                                ? c.value === "true"
                                  ? "🟢 ENABLED (true)"
                                  : "⚪ DISABLED (false)"
                                : c.value}
                            </span>
                            <Lock className="size-3.5 text-muted" />
                          </div>
                        ) : c.valueType === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDraftConfigs((prev) => ({
                                  ...prev,
                                  [c.key]: currentVal === "true" ? "false" : "true",
                                }))
                              }
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                currentVal === "true"
                                  ? "bg-emerald-500 text-black font-black shadow-sm"
                                  : "bg-white/10 text-muted hover:bg-white/15 hover:text-fg",
                              )}
                            >
                              {currentVal === "true" ? (
                                <Check className="size-3.5 stroke-[3]" />
                              ) : (
                                <X className="size-3.5" />
                              )}
                              <span>
                                {currentVal === "true" ? "ENABLED (true)" : "DISABLED (false)"}
                              </span>
                            </button>
                          </div>
                        ) : c.valueType === "integer" || c.valueType === "decimal" ? (
                          <Input
                            type="number"
                            step={c.valueType === "integer" ? "1" : "0.01"}
                            value={currentVal}
                            onChange={(e) =>
                              setDraftConfigs((prev) => ({
                                ...prev,
                                [c.key]: e.target.value,
                              }))
                            }
                            className="h-9 bg-raised border-white/10 font-mono text-xs text-fg rounded-xl"
                          />
                        ) : c.valueType === "json" ? (
                          <div className="space-y-1">
                            <textarea
                              rows={2}
                              value={currentVal}
                              onChange={(e) =>
                                setDraftConfigs((prev) => ({
                                  ...prev,
                                  [c.key]: e.target.value,
                                }))
                              }
                              className="w-full bg-raised border border-white/10 rounded-xl p-2 font-mono text-xs text-fg focus:outline-none focus:border-accent"
                            />
                            <div className="flex items-center justify-between text-[10px]">
                              {(() => {
                                try {
                                  JSON.parse(currentVal);
                                  return <span className="text-emerald-400">✓ Valid JSON</span>;
                                } catch {
                                  return <span className="text-rose-400">✗ Invalid JSON</span>;
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <Input
                            type="text"
                            value={currentVal}
                            onChange={(e) =>
                              setDraftConfigs((prev) => ({
                                ...prev,
                                [c.key]: e.target.value,
                              }))
                            }
                            className="h-9 bg-raised border-white/10 font-mono text-xs text-fg rounded-xl"
                          />
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-muted">
                      <span className="truncate max-w-[180px]">
                        Default:{" "}
                        <span className="font-mono text-fg/70">{c.defaultValue ?? "—"}</span>
                      </span>

                      {canEditThis && isDirty && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...draftConfigs };
                              delete next[c.key];
                              setDraftConfigs(next);
                            }}
                            className="text-muted hover:text-fg px-1.5 py-0.5 text-[11px]"
                          >
                            Revert
                          </button>
                          <Button
                            size="sm"
                            onClick={() => handleAdminSaveConfig(c.key as SystemConfigKey)}
                            disabled={isSavingConfig}
                            className="h-6 rounded-lg bg-accent text-black font-black text-[10px] px-2.5 hover:bg-accent/90"
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* System Config Audit Trail */}
          <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="size-4 text-accent" />
                <h3 className="text-xs font-bold text-fg uppercase tracking-wider">
                  System Configuration Audit Log
                </h3>
              </div>
              <button
                type="button"
                onClick={loadConfigAudit}
                className="flex items-center gap-1 text-xs text-muted hover:text-fg"
              >
                <RefreshCw className="size-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-muted font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Key</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Value (Old → New)</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {configAuditHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 text-muted whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-fg">
                        {log.actorId}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-accent font-bold">
                        {log.key || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-md bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className="text-muted">{log.oldValue || "—"}</span>
                        <span className="text-muted/40 mx-1.5">→</span>
                        <span className="text-emerald-400 font-bold">{log.newValue || "—"}</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted max-w-xs truncate">
                        {log.reason || "—"}
                      </td>
                    </tr>
                  ))}
                  {configAuditHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted">
                        No system configuration audit logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-sm font-bold text-rose-400 flex items-center gap-1.5">
                <X className="size-4" />
                <span>Reject Creator Submission</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRejectingId(null);
                  setCustomReasonNote("");
                }}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-fg">Primary Reason</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-raised p-2.5 text-xs font-semibold text-fg focus:outline-none"
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted">
                {rejectionReason === "Custom note..."
                  ? "Required Moderation Note"
                  : "Additional Feedback / Notes (Optional)"}
              </label>
              <textarea
                value={customReasonNote}
                onChange={(e) => setCustomReasonNote(e.target.value)}
                placeholder="Give constructive feedback so the creator knows how to improve..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-raised p-2.5 text-xs text-fg focus:outline-none resize-none"
              />
            </div>

            <p className="text-[10px] text-muted">
              ℹ️ The creator will receive a direct notification with this reason. This action is permanently logged to the RIFF Audit Trail.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRejectingId(null);
                  setCustomReasonNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRejectSubmit}
                disabled={rejectionReason === "Custom note..." && !customReasonNote.trim()}
                className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleIssueWarningSubmit}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-surface p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                <span>Issue Moderation Warning</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">User Handle</label>
              <Input
                value={warningUserHandle}
                onChange={(e) => setWarningUserHandle(e.target.value)}
                placeholder="e.g. alex.admin"
                required
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Reason for Warning</label>
              <Input
                value={warningReasonInput}
                onChange={(e) => setWarningReasonInput(e.target.value)}
                placeholder="e.g. Category misclassification or mild guideline violation"
                required
                className="text-xs"
              />
            </div>

            <p className="text-[10px] text-amber-300">
              ⚡ Warning count increments by 1. If an Admin reaches 5 warnings, they are demoted to Creator.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowWarningModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-amber-500 text-black font-bold">
                Send Warning
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Create Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleCreateCategory}
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <Plus className="size-4" />
                </span>
                <h3 className="font-display text-sm font-bold text-fg">Create Global Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Category Name</label>
                <Input
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (!newCatSlug) setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  placeholder="e.g. Gaming & Esports"
                  required
                  className="text-xs bg-raised border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Emoji Icon</label>
                <Input
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  placeholder="🎮"
                  required
                  className="text-xs text-center bg-raised border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Slug Identifier</label>
                <Input
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="gaming"
                  required
                  className="text-xs font-mono bg-raised border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Approval Reward (Pts)</label>
                <Input
                  type="number"
                  value={newCatPoints}
                  onChange={(e) => setNewCatPoints(Number(e.target.value))}
                  min={5}
                  max={200}
                  required
                  className="text-xs font-mono text-emerald-400 font-bold bg-raised border-white/10 rounded-xl"
                />
              </div>
            </div>

            {/* Allowed Content Formats */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Allowed Content Types (Format Restriction)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "all", label: "All Formats", icon: Layers, desc: "Memes & Reels" },
                    { id: "post", label: "Memes Only", icon: ImageIcon, desc: "Standard Images" },
                    { id: "reel", label: "Reels Only", icon: Film, desc: "9:16 Video Studio" },
                  ] as const
                ).map((fmt) => {
                  const Icon = fmt.icon;
                  const isSelected = newCatAllowedTypes === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setNewCatAllowedTypes(fmt.id)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition flex flex-col justify-between space-y-1",
                        isSelected
                          ? "border-accent bg-accent/15 text-accent shadow-sm"
                          : "border-white/10 bg-raised/50 text-muted hover:text-fg hover:bg-raised",
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Icon className="size-3.5" />
                        <span>{fmt.label}</span>
                      </div>
                      <span className="text-[10px] opacity-70">{fmt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Policy Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-raised/40 p-3 cursor-pointer hover:bg-raised/70 transition">
                <input
                  type="checkbox"
                  checked={newCatRequiresReview}
                  onChange={(e) => setNewCatRequiresReview(e.target.checked)}
                  className="size-4 rounded accent-accent"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-fg block">Require Staff Review</span>
                  <span className="text-[10px] text-muted block">
                    Unchecked = Auto-approves directly to feed
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-raised/40 p-3 cursor-pointer hover:bg-raised/70 transition">
                <input
                  type="checkbox"
                  checked={newCatIsDefault}
                  onChange={(e) => setNewCatIsDefault(e.target.checked)}
                  className="size-4 rounded accent-accent"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-fg block">Platform Default</span>
                  <span className="text-[10px] text-muted block">Fallback if creator leaves category blank</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Description</label>
              <Input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Brief description for creators and reviewers..."
                className="text-xs bg-raised border-white/10 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button size="sm" variant="ghost" onClick={() => setShowAddCatModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-accent text-black font-bold hover:bg-accent/90">
                Create Category
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleEditCategorySubmit}
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{editingCategory.icon}</span>
                <div>
                  <h3 className="font-display text-sm font-bold text-fg">
                    Edit Category: {editingCategory.name}
                  </h3>
                  <span className="text-[10px] text-muted font-mono">#{editingCategory.slug}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Category Name</label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  required
                  className="text-xs bg-raised border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Emoji Icon</label>
                <Input
                  value={editingCategory.icon}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                  required
                  className="text-xs text-center bg-raised border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Status</label>
                <select
                  value={editingCategory.status}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      status: e.target.value as "active" | "inactive" | "archived",
                    })
                  }
                  className="w-full rounded-xl bg-raised border border-white/10 px-3 py-2 text-fg text-xs outline-none"
                >
                  <option value="active" className="bg-[#111]">Active (Submissions Open)</option>
                  <option value="inactive" className="bg-[#111]">Inactive (Submissions Paused)</option>
                  <option value="archived" className="bg-[#111]">Archived (Read Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Approval Reward (Pts)</label>
                <Input
                  type="number"
                  value={editingCategory.approvalPoints}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, approvalPoints: Number(e.target.value) })
                  }
                  min={5}
                  max={200}
                  required
                  className="text-xs font-mono text-emerald-400 font-bold bg-raised border-white/10 rounded-xl"
                />
              </div>
            </div>

            {/* Allowed Content Formats */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Allowed Content Types (Format Restriction)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "all", label: "All Formats", icon: Layers, desc: "Memes & Reels" },
                    { id: "post", label: "Memes Only", icon: ImageIcon, desc: "Standard Images" },
                    { id: "reel", label: "Reels Only", icon: Film, desc: "9:16 Video Studio" },
                  ] as const
                ).map((fmt) => {
                  const Icon = fmt.icon;
                  const isSelected = (editingCategory.allowedTypes || "all") === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setEditingCategory({ ...editingCategory, allowedTypes: fmt.id })}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition flex flex-col justify-between space-y-1",
                        isSelected
                          ? "border-accent bg-accent/15 text-accent shadow-sm"
                          : "border-white/10 bg-raised/50 text-muted hover:text-fg hover:bg-raised",
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Icon className="size-3.5" />
                        <span>{fmt.label}</span>
                      </div>
                      <span className="text-[10px] opacity-70">{fmt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Policy Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-raised/40 p-3 cursor-pointer hover:bg-raised/70 transition">
                <input
                  type="checkbox"
                  checked={editingCategory.requiresReview !== false}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, requiresReview: e.target.checked })
                  }
                  className="size-4 rounded accent-accent"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-fg block">Require Staff Review</span>
                  <span className="text-[10px] text-muted block">
                    Unchecked = Auto-approves directly to feed
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-raised/40 p-3 cursor-pointer hover:bg-raised/70 transition">
                <input
                  type="checkbox"
                  checked={editingCategory.isDefault || false}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, isDefault: e.target.checked })
                  }
                  className="size-4 rounded accent-accent"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-fg block">Platform Default</span>
                  <span className="text-[10px] text-muted block">Fallback category if none provided</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Description</label>
              <Input
                value={editingCategory.description}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                placeholder="Brief description for creators..."
                className="text-xs bg-raised border-white/10 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-accent text-black font-bold hover:bg-accent/90">
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Report Modal */}
      {resolvingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleResolveReportSubmit}
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <Shield className="size-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-fg">
                    Resolve Community Report #{resolvingReport.id}
                  </h3>
                  <p className="text-[10px] text-muted">
                    Reported content by @{resolvingReport.creatorHandle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolvingReport(null)}
                className="text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Target Post Context */}
            <div className="rounded-2xl border border-white/10 bg-raised/50 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">Reported Violation:</span>
                <span className="font-mono text-rose-400 font-bold">{resolvingReport.reason}</span>
              </div>
              <p className="text-xs text-muted line-clamp-2 italic">
                "{resolvingReport.postCaption}"
              </p>
              {resolvingReport.details && (
                <p className="text-[11px] text-amber-300/80">
                  <strong>User Note:</strong> {resolvingReport.details}
                </p>
              )}
            </div>

            {/* Action Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted">Select Moderation Action:</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setResolutionAction("dismiss");
                    setResolutionNote("No violation found. Content adheres to community standards.");
                  }}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    resolutionAction === "dismiss"
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-white/10 bg-surface/50 hover:bg-white/5",
                  )}
                >
                  <div className="text-xs font-bold text-fg">⚪ Dismiss</div>
                  <div className="text-[10px] text-muted mt-1 leading-snug">
                    No violation. Content remains live.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResolutionAction("remove_content");
                    setResolutionNote("Content violates community guidelines and has been taken down.");
                  }}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    resolutionAction === "remove_content"
                      ? "border-amber-400 bg-amber-400/10 shadow-sm"
                      : "border-white/10 bg-surface/50 hover:bg-white/5",
                  )}
                >
                  <div className="text-xs font-bold text-amber-300">🟡 Remove Content</div>
                  <div className="text-[10px] text-muted mt-1 leading-snug">
                    Take down post from feeds.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResolutionAction("warn_user");
                    setResolutionNote("Severe violation. Creator issued moderation warning and content removed.");
                  }}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    resolutionAction === "warn_user"
                      ? "border-rose-500 bg-rose-500/10 shadow-sm"
                      : "border-white/10 bg-surface/50 hover:bg-white/5",
                  )}
                >
                  <div className="text-xs font-bold text-rose-400">🔴 Warn & Remove</div>
                  <div className="text-[10px] text-muted mt-1 leading-snug">
                    Remove post + issue strike (5-warning demotion).
                  </div>
                </button>
              </div>
            </div>

            {/* Resolution Note */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-muted">Resolution Note / Reason</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setResolutionNote("No violation found - conforms to community rules.")}
                    className="text-[10px] text-accent hover:underline"
                  >
                    Clean
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setResolutionNote("Violates hate speech and harassment guidelines.")}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Hate
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setResolutionNote("Unoriginal spam, repost, or watermark violation.")}
                    className="text-[10px] text-amber-300 hover:underline"
                  >
                    Spam
                  </button>
                </div>
              </div>
              <Input
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Official reason for this resolution..."
                required
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setResolvingReport(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className={cn(
                  "rounded-xl font-bold",
                  resolutionAction === "dismiss"
                    ? "bg-accent text-black"
                    : resolutionAction === "remove_content"
                      ? "bg-amber-400 text-black"
                      : "bg-rose-500 text-white",
                )}
              >
                Confirm Resolution
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Granular Staff Permission Management Modal */}
      {selectedStaffForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-surface/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-fg">
                      Granular Staff Permissions
                    </h3>
                    <Badge
                      className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                        selectedStaffForPerms.role === "owner" && "bg-purple-500/20 border-purple-500/40 text-purple-300",
                        selectedStaffForPerms.role === "super_admin" && "bg-amber-500/20 border-amber-500/40 text-amber-300",
                        selectedStaffForPerms.role === "admin" && "bg-sky-500/20 border-sky-500/40 text-sky-300",
                        selectedStaffForPerms.role === "moderator" && "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                      )}
                    >
                      {selectedStaffForPerms.role}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-muted mt-0.5">
                    {selectedStaffForPerms.name} (@{selectedStaffForPerms.handle})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffForPerms(null)}
                className="rounded-xl p-1.5 text-muted hover:text-fg hover:bg-white/10 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Constitutional Notice Banner */}
            {selectedStaffForPerms.role === "owner" ? (
              <div className="rounded-2xl bg-purple-500/10 border border-purple-500/30 p-3.5 flex items-start gap-2.5 text-xs text-purple-200">
                <Crown className="size-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-purple-300">Platform Owner Root Privilege:</span>
                  <span className="text-muted leading-relaxed">
                    The Platform Owner holds all system, economy, and operational privileges unconditionally. Granular permissions cannot be revoked or altered.
                  </span>
                </div>
              </div>
            ) : myRole === "super_admin" && selectedStaffForPerms.role === "super_admin" ? (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-amber-300">Constitutional Boundary:</span>
                  <span className="text-muted leading-relaxed">
                    Super Admins cannot modify permissions for peer Super Admins. Only the Platform Owner has authority over Tier 4 staff.
                  </span>
                </div>
              </div>
            ) : myRole === "super_admin" ? (
              <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 p-3 flex items-start gap-2.5 text-xs text-sky-200">
                <Zap className="size-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-sky-300">Super Admin Delegation:</span>
                  <span className="text-muted leading-relaxed">
                    You can delegate operational permissions for Admins and Moderators. Root staff delegation (<code className="bg-black/30 px-1 py-0.5 rounded text-sky-200 font-mono">staff.manage</code>) is reserved for Platform Owner.
                  </span>
                </div>
              </div>
            ) : null}

            {/* Quick Preset Selector */}
            {selectedStaffForPerms.role !== "owner" && !(myRole === "super_admin" && selectedStaffForPerms.role === "super_admin") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-bold uppercase tracking-wider text-[10px]">
                    ⚡ Quick Permission Presets
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPerms}
                      className="text-[11px] text-accent font-bold hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-muted">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllPerms}
                      className="text-[11px] text-muted hover:text-fg"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PERMISSION_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={cn(
                          "rounded-2xl border p-2.5 text-left transition-all flex flex-col justify-between space-y-1.5",
                          isSelected
                            ? "border-accent bg-accent/15 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                            : "border-white/10 bg-raised/60 hover:bg-raised hover:border-white/20",
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-display text-xs font-bold text-fg">
                            {preset.name}
                          </span>
                          {isSelected && <Check className="size-3.5 text-accent stroke-[3]" />}
                        </div>
                        <span className="text-[10px] text-muted line-clamp-1">
                          {preset.permissions.length} perms · for {preset.recommendedFor}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Granular Permission Checklist Grouped by Category */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[46vh]">
              {(["moderation", "economy", "system"] as const).map((catKey) => {
                const groupPerms = ADMIN_PERMISSIONS_CATALOG.filter((p) => p.category === catKey);
                const groupTitle =
                  catKey === "moderation"
                    ? "Content Review & Moderation"
                    : catKey === "economy"
                      ? "Reward Economy & Creator Wallets"
                      : "Governance & System Administration";

                return (
                  <div key={catKey} className="space-y-2">
                    <h4 className="font-display text-xs font-bold text-fg/80 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-accent" />
                      <span>{groupTitle}</span>
                    </h4>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {groupPerms.map((perm) => {
                        const isChecked = selectedStaffForPerms.role === "owner" || selectedPerms.includes(perm.key);
                        const isLockedForSuperAdmin = myRole === "super_admin" && perm.key === "staff.manage";
                        const isReadOnly =
                          selectedStaffForPerms.role === "owner" ||
                          (myRole === "super_admin" && selectedStaffForPerms.role === "super_admin") ||
                          isLockedForSuperAdmin;

                        return (
                          <div
                            key={perm.key}
                            onClick={() => {
                              if (!isReadOnly) handleTogglePerm(perm.key);
                            }}
                            className={cn(
                              "rounded-2xl border p-3 flex items-start gap-3 transition-all select-none",
                              isReadOnly
                                ? "opacity-60 cursor-not-allowed bg-black/30 border-white/5"
                                : isChecked
                                  ? "border-accent/50 bg-accent/10 cursor-pointer hover:border-accent"
                                  : "border-white/10 bg-raised/50 cursor-pointer hover:bg-raised hover:border-white/20",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isReadOnly}
                              onChange={() => {}}
                              className="size-4 rounded-md accent-accent shrink-0 mt-0.5 cursor-pointer"
                            />
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-display text-xs font-bold text-fg">
                                  {perm.name}
                                </span>
                                {isLockedForSuperAdmin && (
                                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[9px] font-mono">
                                    Owner Only
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                                {perm.description}
                              </p>
                              <code className="text-[10px] font-mono text-muted/60 block">
                                {perm.key}
                              </code>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Audit Reason Input */}
              {selectedStaffForPerms.role !== "owner" && !(myRole === "super_admin" && selectedStaffForPerms.role === "super_admin") && (
                <div className="pt-2">
                  <label className="block text-xs text-muted mb-1 font-bold">
                    Audit Log Justification (Optional)
                  </label>
                  <Input
                    value={permsAuditReason}
                    onChange={(e) => setPermsAuditReason(e.target.value)}
                    placeholder="e.g. Delegated review and moderation permissions for campaign arbitration"
                    className="text-xs bg-raised border-white/10 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-muted">
                {selectedStaffForPerms.role === "owner"
                  ? "All 9 Permissions Root-Active"
                  : `${selectedPerms.length} / ${ADMIN_PERMISSIONS_CATALOG.length} Permissions Active`}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedStaffForPerms(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>

                {selectedStaffForPerms.role !== "owner" && !(myRole === "super_admin" && selectedStaffForPerms.role === "super_admin") && (
                  <Button
                    size="sm"
                    disabled={isSavingPerms}
                    onClick={handleSavePermissions}
                    className="rounded-xl bg-accent text-black font-black text-xs gap-1.5 hover:bg-accent/90 shadow-md"
                  >
                    {isSavingPerms ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5 stroke-[3]" />
                    )}
                    <span>Save Permissions</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
