import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  BadgePercent,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Crown,
  Database,
  DollarSign,
  Edit3,
  ExternalLink,
  Flame,
  Globe,
  History,
  Lock,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
  ArrowDown,
  ArrowUp,
  Layers,
  Tag,
  Film,
  Image as ImageIcon,
  Star,
  Pin,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  getOwnerDashboardData,
  getCategoriesWithEarningRules,
  getAdminPermissionsList,
  getAuditLogsList,
  reconcileWithdrawalServerFn,
  adjustUserPointsServerFn,
  createCategoryServerFn,
  updateCategoryServerFn,
  toggleCategoryStatusServerFn,
  reorderCategoriesServerFn,
  setDefaultCategoryServerFn,
  getSystemConfigsServerFn,
  updateSystemConfigServerFn,
  updateSystemConfigsBatchServerFn,
  getSystemConfigAuditHistoryServerFn,
} from "@/lib/riff-data";
import { inr } from "@/lib/utils";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { useRiff } from "@/lib/store";
import type {
  Person,
  Category,
  AuditLog,
  PlatformControls,
  AdminPermission,
  WithdrawalRequest,
  SystemConfigRecord,
  SystemConfigKey,
  SystemConfigCategory,
} from "@/lib/types";
import { OWNER_ONLY_CONFIG_KEYS } from "@/lib/types";

export const Route = createFileRoute("/owner")({
  component: OwnerDashboardPage,
  head: () => ({ meta: [{ title: "Owner Superuser Command Center · RIFF" }] }),
});

const PERMISSION_SCOPES = [
  { id: "campaign.manage", name: "Campaign Admin", desc: "Create, fund & verify brand campaigns" },
  { id: "submission.review", name: "Submissions Admin", desc: "Review & approve creator submissions" },
  { id: "withdrawal.review", name: "Finance Admin", desc: "Approve cash & point payouts" },
  { id: "wallet.freeze", name: "Security Officer", desc: "Targeted freeze/unfreeze creator wallets" },
  { id: "moderation.manage", name: "Moderator", desc: "Handle safety reports & content warnings" },
  { id: "category.manage", name: "Category Admin", desc: "Adjust category tags and points" },
  { id: "audit.view", name: "Auditor", desc: "Inspect immutable platform audit logs" },
];

function OwnerDashboardPage() {
  const { user } = useAuth();

  // Store bindings
  const profile = useRiff((s) => s.profile);
  const setProfile = useRiff((s) => s.setProfile);
  const people = useRiff((s) => s.people) || [];
  const storeCategories = useRiff((s) => s.categories) || [];
  const storeAuditLogs = useRiff((s) => s.auditLogs) || [];
  const posts = useRiff((s) => s.posts) || [];
  const pendingSubmissions = useRiff((s) => s.pendingSubmissions) || [];
  const removedSubmissions = useRiff((s) => s.removedSubmissions) || [];
  const reports = useRiff((s) => s.reports) || [];
  const pointsWallet = useRiff((s) => s.pointsWallet) || 0;
  const platformControls = useRiff((s) => s.platformControls) || {
    maintenanceMode: false,
    submissionsPaused: false,
    renderFarmEcoMode: false,
    emergencyWalletFreeze: false,
    aiModerationSensitivity: "balanced",
    pointConversionRate: 0.5,
    minWithdrawalThreshold: 100,
    maxDailyWithdrawalLimit: 10000,
    payoutProcessingFeePercent: 2,
  };

  // Withdrawals & Financial Escrow
  const withdrawals = useRiff((s) => s.withdrawals) || [];
  const settleWithdrawal = useRiff((s) => s.settleWithdrawal);
  const rejectAndRefundWithdrawal = useRiff((s) => s.rejectAndRefundWithdrawal);
  const flagFreezeAndRejectWithdrawal = useRiff((s) => s.flagFreezeAndRejectWithdrawal);
  const updateEconomyLevers = useRiff((s) => s.updateEconomyLevers);

  // Store actions
  const updatePlatformControls = useRiff((s) => s.updatePlatformControls);
  const updateCategoryEarningRules = useRiff((s) => s.updateCategoryEarningRules);
  const addCategory = useRiff((s) => s.addCategory);
  const createCategory = useRiff((s) => s.createCategory);
  const updateCategory = useRiff((s) => s.updateCategory);
  const toggleCategoryStatus = useRiff((s) => s.toggleCategoryStatus);
  const reorderCategories = useRiff((s) => s.reorderCategories);
  const setDefaultCategory = useRiff((s) => s.setDefaultCategory);
  const updateUserRole = useRiff((s) => s.updateUserRole);
  const toggleUserWalletFreeze = useRiff((s) => s.toggleUserWalletFreeze);
  const grantUserPermission = useRiff((s) => s.grantUserPermission);
  const revokeUserPermission = useRiff((s) => s.revokeUserPermission);
  const adjustUserPoints = useRiff((s) => s.adjustUserPoints);
  const storeSystemConfigs = useRiff((s) => s.systemConfigs) || [];
  const updateSystemConfig = useRiff((s) => s.updateSystemConfig);
  const batchUpdateSystemConfigs = useRiff((s) => s.batchUpdateSystemConfigs);
  const setSystemConfigs = useRiff((s) => s.setSystemConfigs);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "overview" | "controls" | "rbac" | "economy" | "finance" | "audit" | "config"
  >("overview");

  // System Configuration State
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

  // Telemetry fallback / server data
  const [serverStats, setServerStats] = useState<{
    totalVolume: number;
    creatorPayouts: number;
    platformReserve: number;
  } | null>(null);

  // Category Edit Modal State
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatSlug, setEditCatSlug] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");
  const [editCatDesc, setEditCatDesc] = useState("");
  const [editCatStatus, setEditCatStatus] = useState<"active" | "inactive" | "archived">("active");
  const [editCatAllowedTypes, setEditCatAllowedTypes] = useState<"all" | "post" | "reel">("all");
  const [editCatRequiresReview, setEditCatRequiresReview] = useState(true);
  const [editCatIsDefault, setEditCatIsDefault] = useState(false);
  const [editBasePoints, setEditBasePoints] = useState(15);
  const [editBonusViews, setEditBonusViews] = useState(5);
  const [editBonusLikes, setEditBonusLikes] = useState(2);
  const [editMaxReward, setEditMaxReward] = useState(100);
  const [editReason, setEditReason] = useState("");

  // Create Category Modal State
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("✨");
  const [newCatPoints, setNewCatPoints] = useState(20);
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatAllowedTypes, setNewCatAllowedTypes] = useState<"all" | "post" | "reel">("all");
  const [newCatRequiresReview, setNewCatRequiresReview] = useState(true);
  const [newCatIsDefault, setNewCatIsDefault] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [catStatusFilter, setCatStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("all");

  // RBAC Permission Delegation State
  const [delegateHandle, setDelegateHandle] = useState("");
  const [delegatePerm, setDelegatePerm] = useState<AdminPermission>("submission.review");
  const [teamSearch, setTeamSearch] = useState("");

  // Wallet Emergency Freeze State
  const [freezeHandle, setFreezeHandle] = useState("");
  const [freezeReason, setFreezeReason] = useState("");

  // Direct Points Adjustment State
  const [adjustHandle, setAdjustHandle] = useState("");
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState("");

  // Economy Levers Configuration State
  const [leversRate, setLeversRate] = useState<number>(platformControls.pointConversionRate ?? 0.5);
  const [leversMin, setLeversMin] = useState<number>(platformControls.minWithdrawalThreshold ?? 100);
  const [leversMaxDaily, setLeversMaxDaily] = useState<number>(platformControls.maxDailyWithdrawalLimit ?? 10000);
  const [leversFee, setLeversFee] = useState<number>(platformControls.payoutProcessingFeePercent ?? 2);
  const [leversReason, setLeversReason] = useState<string>("");

  // Withdrawal Arbitration Queue State
  const [withdrawalFilter, setWithdrawalFilter] = useState<"pending" | "completed" | "failed" | "all">("pending");
  const [arbitrationModal, setArbitrationModal] = useState<{
    wth: WithdrawalRequest;
    action: "reject" | "flag_freeze";
  } | null>(null);
  const [arbitrationNote, setArbitrationNote] = useState("");

  // Sync levers state if platformControls updates
  useEffect(() => {
    setLeversRate(platformControls.pointConversionRate ?? 0.5);
    setLeversMin(platformControls.minWithdrawalThreshold ?? 100);
    setLeversMaxDaily(platformControls.maxDailyWithdrawalLimit ?? 10000);
    setLeversFee(platformControls.payoutProcessingFeePercent ?? 2);
  }, [platformControls.pointConversionRate, platformControls.minWithdrawalThreshold, platformControls.maxDailyWithdrawalLimit, platformControls.payoutProcessingFeePercent]);

  // Audit Filter & Search
  const [auditFilter, setAuditFilter] = useState<
    "all" | "rbac" | "economy" | "security" | "moderation"
  >("all");
  const [auditSearch, setAuditSearch] = useState("");

  // Role Switching for Developer / Testing
  const myRole = (profile?.role as Person["role"]) || "creator";
  const isActualOwner = myRole === "owner";

  // Optional background fetch of server telemetry
  useEffect(() => {
    let mounted = true;
    async function loadServerTelemetry() {
      try {
        const [dashRes] = await Promise.all([getOwnerDashboardData()]);
        if (mounted && dashRes?.stats) {
          setServerStats({
            totalVolume: dashRes.stats.totalVolume,
            creatorPayouts: dashRes.stats.creatorPayouts,
            platformReserve: dashRes.stats.platformReserve,
          });
        }
      } catch {
        // Graceful fallback to client-side store values
      }
    }
    loadServerTelemetry();
    return () => {
      mounted = false;
    };
  }, []);

  // System Config loading & audit history
  useEffect(() => {
    let mounted = true;
    async function loadConfigs() {
      try {
        const configs = await getSystemConfigsServerFn();
        if (mounted && configs && Array.isArray(configs)) {
          setSystemConfigs(configs);
        }
      } catch (err) {
        // Fallback to store
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

  const handleConfigDraftChange = (key: string, val: string) => {
    setDraftConfigs((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleResetDrafts = () => {
    setDraftConfigs({});
    toast.info("Unsaved configuration drafts discarded.");
  };

  const handleSaveSingleConfig = async (key: SystemConfigKey) => {
    const record = storeSystemConfigs.find((c) => c.key === key);
    if (!record) return;
    const val = draftConfigs[key] !== undefined ? draftConfigs[key] : record.value;
    try {
      setIsSavingConfig(true);
      const res = await updateSystemConfigServerFn({
        data: {
          key,
          value: val,
          reason: configReason.trim() || `Owner updated system configuration ${key}`,
        },
      });
      if (res.ok) {
        updateSystemConfig(key, val, configReason.trim() || `Owner updated system configuration ${key}`);
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

  const handleBatchSaveConfigs = async () => {
    const dirtyKeys = Object.keys(draftConfigs).filter((k) => {
      const orig = storeSystemConfigs.find((c) => c.key === k)?.value ?? "";
      return draftConfigs[k] !== orig;
    });
    if (dirtyKeys.length === 0) {
      toast.info("No modified configurations to save.");
      return;
    }
    const updates = dirtyKeys.map((k) => ({
      key: k as SystemConfigKey,
      value: draftConfigs[k],
    }));
    try {
      setIsSavingConfig(true);
      const res = await updateSystemConfigsBatchServerFn({
        data: {
          updates,
          reason: configReason.trim() || `Owner batch updated ${updates.length} configurations`,
        },
      });
      if (res.ok) {
        batchUpdateSystemConfigs(
          updates,
          configReason.trim() || `Owner batch updated ${updates.length} configurations`,
        );
        setDraftConfigs({});
        setConfigReason("");
        playSound("cheer");
        fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 40);
        toast.success(`Successfully saved ${updates.length} system configurations!`);
        loadConfigAudit();
      }
    } catch (err: any) {
      playSound("pop");
      toast.error(err?.message || "Failed to batch save configurations");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Quick Role Switcher handler for Owner testing
  function handleSwitchMyRole(targetRole: Person["role"]) {
    setProfile({ role: targetRole });
    playSound("pop");
    toast.success(`Role switched to ${targetRole.toUpperCase()}. Testing active permissions.`);
  }

  // Handle Category Rule & Details Save
  function handleSaveCategoryRule(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCat) return;

    const payload = {
      name: editCatName.trim() || editingCat.name,
      slug: editCatSlug.trim().toLowerCase() || editingCat.slug,
      description: editCatDesc.trim(),
      icon: editCatIcon.trim() || editingCat.icon,
      status: editCatStatus,
      allowedTypes: editCatAllowedTypes,
      requiresReview: editCatRequiresReview,
      approvalPoints: Number(editBasePoints) || editingCat.approvalPoints,
      isDefault: editCatIsDefault,
      reason: editReason.trim() || `Owner updated category "${editingCat.name}" settings`,
    };

    const res = updateCategory(editingCat.id, payload, payload.reason);
    if (!res.success) {
      toast.error(res.message);
      return;
    }

    updateCategoryEarningRules(
      editingCat.id,
      {
        approvalPoints: payload.approvalPoints,
        bonusPer1000Views: editBonusViews,
        bonusPer100Likes: editBonusLikes,
        maxRewardCeiling: editMaxReward,
        status: payload.status === "archived" ? "inactive" : payload.status,
      },
      payload.reason,
    );

    updateCategoryServerFn({
      data: {
        id: editingCat.id,
        ...payload,
      },
    }).catch(() => {});

    playSound("cheer");
    toast.success(`Updated "${payload.name}" configuration successfully!`);
    setEditingCat(null);
  }

  // Handle Add Category
  function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim() || !newCatSlug.trim()) {
      toast.error("Category name and slug are required.");
      return;
    }

    const payload = {
      name: newCatName.trim(),
      slug: newCatSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      description: newCatDesc.trim() || `${newCatName.trim()} content and memes`,
      icon: newCatIcon.trim() || "✨",
      approvalPoints: Number(newCatPoints) || 15,
      allowedTypes: newCatAllowedTypes,
      requiresReview: newCatRequiresReview,
      isDefault: newCatIsDefault,
      status: "active" as const,
      reason: `Owner created category "${newCatName.trim()}" (+${newCatPoints} pts, type: ${newCatAllowedTypes})`,
    };

    const res = createCategory(payload);
    if (!res.success) {
      toast.error(res.message);
      return;
    }

    createCategoryServerFn({ data: payload }).catch(() => {});

    playSound("cheer");
    fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 35);
    toast.success(`Created category "${newCatName.trim()}" with +${payload.approvalPoints} pts reward!`);
    setShowAddCatModal(false);
    setNewCatName("");
    setNewCatSlug("");
    setNewCatDesc("");
    setNewCatIcon("✨");
    setNewCatPoints(20);
    setNewCatAllowedTypes("all");
    setNewCatRequiresReview(true);
    setNewCatIsDefault(false);
  }

  // Handle Toggle Category Status (Active <-> Inactive)
  function handleToggleStatus(cat: Category) {
    const res = toggleCategoryStatus(cat.id);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    const nextStatus = cat.status === "active" ? "inactive" : "active";
    toggleCategoryStatusServerFn({ data: { id: cat.id, status: nextStatus } }).catch(() => {});
    toast.success(`Category "${cat.name}" is now ${nextStatus}.`);
  }

  // Handle Set Default Category
  function handleSetDefault(cat: Category) {
    const res = setDefaultCategory(cat.id);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setDefaultCategoryServerFn({ data: { id: cat.id } }).catch(() => {});
    toast.success(`"${cat.name}" is now the default platform fallback category.`);
  }

  // Handle Move Category Up / Down
  function handleMoveCategory(catId: string, direction: "up" | "down") {
    const sorted = [...storeCategories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const idx = sorted.findIndex((c) => c.id === catId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const temp = sorted[idx];
    sorted[idx] = sorted[targetIdx];
    sorted[targetIdx] = temp;

    const orderedIds = sorted.map((c) => c.id);
    reorderCategories(orderedIds);
    reorderCategoriesServerFn({ data: { orderedIds } }).catch(() => {});
    toast.success("Category sort order updated.");
  }

  // Handle Grant Permission
  function handleGrantPermissionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!delegateHandle.trim()) return;

    const cleanHandle = delegateHandle.replace(/^@/, "").trim();
    const target = people.find((p) => p.handle.toLowerCase() === cleanHandle.toLowerCase());

    if (!target) {
      toast.error(`User @${cleanHandle} not found in user directory.`);
      return;
    }

    grantUserPermission(target.handle, delegatePerm);
    playSound("cheer");
    toast.success(`Granted ${delegatePerm} to @${target.handle}!`);
    setDelegateHandle("");
  }

  // Handle Wallet Freeze / Unfreeze
  function handleToggleFreeze(freeze: boolean) {
    if (!freezeHandle.trim()) {
      toast.error("Please enter a user handle.");
      return;
    }
    const cleanHandle = freezeHandle.replace(/^@/, "").trim();
    const target = people.find((p) => p.handle.toLowerCase() === cleanHandle.toLowerCase());

    if (!target) {
      toast.error(`User @${cleanHandle} not found.`);
      return;
    }

    toggleUserWalletFreeze(
      target.handle,
      freeze,
      freezeReason.trim() || (freeze ? "Emergency security hold" : "Owner unfreeze"),
    );

    playSound("pop");
    toast.success(freeze ? `Wallet @${target.handle} FROZEN.` : `Wallet @${target.handle} RESTORED.`);
    setFreezeHandle("");
    setFreezeReason("");
  }

  // Handle Direct Points Adjustment
  async function handleAdjustPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustHandle.trim() || adjustAmount === 0) return;

    const cleanHandle = adjustHandle.replace(/^@/, "").trim();
    const target = people.find((p) => p.handle.toLowerCase() === cleanHandle.toLowerCase());

    if (!target) {
      toast.error(`User @${cleanHandle} not found.`);
      return;
    }

    const reason = adjustReason.trim() || "Owner manual points adjustment";

    adjustUserPoints(target.handle, adjustAmount, reason);
    playSound("cheer");
    toast.success(
      `Adjusted @${target.handle}'s balance by ${adjustAmount > 0 ? "+" : ""}${adjustAmount} pts!`,
    );

    try {
      await adjustUserPointsServerFn({
        data: {
          targetUserId: target.handle,
          deltaPoints: adjustAmount,
          reason,
        },
      });
    } catch {}

    setAdjustHandle("");
    setAdjustAmount(100);
    setAdjustReason("");
  }

  // Handle Save Economy Levers
  function handleSaveEconomyLevers(e: React.FormEvent) {
    e.preventDefault();
    updateEconomyLevers(
      {
        pointConversionRate: Number(leversRate),
        minWithdrawalThreshold: Number(leversMin),
        maxDailyWithdrawalLimit: Number(leversMaxDaily),
        payoutProcessingFeePercent: Number(leversFee),
      },
      leversReason.trim() || "Owner calibrated platform economy levers",
    );
    playSound("cheer");
    toast.success("Platform Economy Levers updated and logged to audit trail!");
    setLeversReason("");
  }

  // Handle Settle Withdrawal Payout
  function handleSettleWithdrawal(wth: WithdrawalRequest) {
    const success = settleWithdrawal(wth.id, myRole);
    if (success) {
      playSound("cheer");
      fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 40);
      toast.success(`Settled ₹${wth.amount.toLocaleString()} payout to @${wth.userHandle}!`);
      reconcileWithdrawalServerFn({
        data: {
          withdrawalId: wth.id,
          event: "transfer.processed",
          reason: `Settled by ${myRole} via Owner Command Center`,
        },
      }).catch(() => {});
    } else {
      toast.error("Failed to settle withdrawal.");
    }
  }

  // Handle Arbitration Submit (Reject & Refund OR Flag & Freeze)
  function handleArbitrationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arbitrationModal) return;
    const note =
      arbitrationNote.trim() ||
      (arbitrationModal.action === "reject"
        ? "Rejected during compliance review"
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

  // Filtered Team
  const filteredTeam = people.filter(
    (p) =>
      p.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      p.handle.toLowerCase().includes(teamSearch.toLowerCase()) ||
      p.role.toLowerCase().includes(teamSearch.toLowerCase()),
  );

  // Filtered Audit Logs
  const filteredAuditLogs = storeAuditLogs.filter((log) => {
    if (auditFilter === "rbac") {
      if (
        log.action !== "demote_admin" &&
        log.action !== "grant_permission" &&
        log.action !== "revoke_permission"
      ) {
        return false;
      }
    } else if (auditFilter === "economy") {
      if (
        log.action !== "update_points" &&
        log.action !== "create_category" &&
        log.action !== "adjust_points"
      ) {
        return false;
      }
    } else if (auditFilter === "security") {
      if (
        log.action !== "platform_control_update" &&
        log.action !== "wallet_freeze" &&
        log.action !== "wallet_unfreeze" &&
        log.action !== "ban_user" &&
        log.action !== "unban_user"
      ) {
        return false;
      }
    } else if (auditFilter === "moderation") {
      if (
        log.action !== "approve" &&
        log.action !== "reject" &&
        log.action !== "change_category" &&
        log.action !== "issue_warning" &&
        log.action !== "delete_post" &&
        log.action !== "report_actioned"
      ) {
        return false;
      }
    }

    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.actorId.toLowerCase().includes(q) ||
        (log.submitterHandle && log.submitterHandle.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q)) ||
        (log.postCaption && log.postCaption.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate live platform financial numbers
  const totalCirculatingPoints = people.reduce((acc, p) => acc + (p.riffPoints || 0), 0) + pointsWallet;
  const totalApprovedContent = posts.length;
  const frozenUsers = people.filter((p) => p.isWalletFrozen);

  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === "pending").length;
  const completedWithdrawalsCount = withdrawals.filter((w) => w.status === "completed").length;
  const failedWithdrawalsCount = withdrawals.filter((w) => w.status === "failed").length;

  const totalSettledInr = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((acc, w) => acc + w.amount, 0);

  const totalPendingEscrowInr = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((acc, w) => acc + w.amount, 0);

  const totalLockedFrozenPoints = frozenUsers.reduce((acc, u) => acc + (u.riffPoints || 0), 0);

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === "all") return true;
    return w.status === withdrawalFilter;
  });

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-28">
      {/* IMPERSONATION NOTICE IF TESTING NON-OWNER ROLE */}
      {!isActualOwner && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs flex items-center justify-between text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <span>
              <strong>Owner Test Mode Active:</strong> You are currently impersonating{" "}
              <span className="font-bold underline">{myRole.toUpperCase()}</span>. Full platform
              superuser capabilities remain accessible in this tab.
            </span>
          </div>
          <button
            onClick={() => handleSwitchMyRole("owner")}
            className="rounded-lg bg-amber-500 px-3 py-1 text-[11px] font-black text-black hover:bg-amber-400 transition"
          >
            Restore Owner Superuser
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="border-b border-white/10 bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  RIFF Owner Command Center
                </h1>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-black">
                  PLATFORM ROOT AUTHORITY
                </Badge>
              </div>
              <p className="text-xs text-white/50">
                System Governance, RBAC Delegation, Category Economy & Platform Kill Switches
              </p>
            </div>
          </div>

          {/* ROLE SWITCHER TOOLBAR */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-white/40 text-[11px]">Active Role:</span>
              <select
                value={myRole}
                onChange={(e) => handleSwitchMyRole(e.target.value as Person["role"])}
                className="bg-transparent font-bold text-amber-400 text-xs outline-none cursor-pointer"
              >
                <option value="owner" className="bg-[#111] text-white">👑 Owner</option>
                <option value="super_admin" className="bg-[#111] text-white">⚡ Super Admin</option>
                <option value="admin" className="bg-[#111] text-white">🛡️ Admin</option>
                <option value="moderator" className="bg-[#111] text-white">🧹 Moderator</option>
                <option value="creator" className="bg-[#111] text-white">🎨 Creator</option>
              </select>
            </div>

            <Link
              to="/admin"
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl transition"
            >
              <Shield className="size-3.5 text-sky-400" />
              <span>Admin Queue</span>
            </Link>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar border-t border-white/5 pt-1">
          {[
            { id: "overview", label: "Overview & Health", icon: Activity },
            { id: "controls", label: "Platform Controls", icon: Sliders },
            { id: "config", label: `System Config (${storeSystemConfigs.length})`, icon: Settings },
            { id: "rbac", label: `Admins & Delegation (${people.length})`, icon: Users },
            { id: "economy", label: `Category Economy (${storeCategories.length})`, icon: DollarSign },
            {
              id: "finance",
              label: `Finance & Escrow (${withdrawals.filter((w) => w.status === "pending").length})`,
              icon: Wallet,
            },
            { id: "audit", label: `Audit Trail (${storeAuditLogs.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-amber-400 text-amber-400 bg-amber-400/10"
                    : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ========================================================= */}
        {/* 1. OVERVIEW & TELEMETRY TAB */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-1">
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>Gross Platform Volume</span>
                  <DollarSign className="size-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {inr(serverStats?.totalVolume || 148500)}
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                  <ArrowUpRight className="size-3" /> +22.4% this week
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-1">
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>Points in Circulation</span>
                  <Sparkles className="size-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {totalCirculatingPoints.toLocaleString()} pts
                </div>
                <div className="text-[11px] text-white/50 pt-1">
                  100% Solvency · No deficits
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-1">
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>Content Moderation Queue</span>
                  <Activity className="size-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {pendingSubmissions.length}
                </div>
                <div className="text-[11px] text-sky-400 pt-1">
                  {totalApprovedContent} live reels & posts
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-1">
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>Safety Reports</span>
                  <AlertOctagon className="size-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-400">
                  {reports.filter((r) => r.status === "open").length} Open
                </div>
                <div className="text-[11px] text-white/50 pt-1">
                  {removedSubmissions.length} removed from feed
                </div>
              </div>
            </div>

            {/* SYSTEM INFRASTRUCTURE & HEALTH */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Server className="size-4 text-emerald-400" />
                    Platform Subsystem Infrastructure
                  </h3>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                    100% OPERATIONAL
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Database className="size-3.5 text-sky-400" /> PGLite / Storage Engine
                      </span>
                      <span className="text-emerald-400 text-[10px] font-bold">ONLINE</span>
                    </div>
                    <p className="text-[11px] text-white/40">Zero latency local state persistence with server sync</p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Cpu className="size-3.5 text-[#d4ff00]" /> Reel Studio Render Farm
                      </span>
                      <span className="text-emerald-400 text-[10px] font-bold">ACTIVE</span>
                    </div>
                    <p className="text-[11px] text-white/40">
                      {platformControls.renderFarmEcoMode ? "Eco Mode (720p throttled)" : "1080p High-Throughput Engine"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-purple-400" /> Automated Moderation
                      </span>
                      <span className="text-emerald-400 text-[10px] font-bold uppercase">
                        {platformControls.aiModerationSensitivity}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40">Multi-stage perceptual hashing & text filters active</p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Globe className="size-3.5 text-emerald-400" /> Creator Submissions Gate
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          platformControls.submissionsPaused ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {platformControls.submissionsPaused ? "PAUSED" : "OPEN"}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40">
                      {platformControls.submissionsPaused
                        ? "Creator uploads temporarily held by Owner"
                        : "Creators actively publishing memes & reels"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold">Governance Hierarchy Rule:</span> Owners cannot be demoted or warned. Admins with 5 warnings are automatically demoted to Creators.
                  </div>
                  <Link to="/admin">
                    <Button size="sm" className="bg-amber-500 text-black font-bold h-7 text-xs">
                      Open Admin View
                    </Button>
                  </Link>
                </div>
              </div>

              {/* QUICK KILL-SWITCH CARD */}
              <div className="rounded-2xl border border-rose-500/20 bg-[#111114] p-5 space-y-4">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertOctagon className="size-4" />
                  <h3 className="text-sm font-bold">Emergency Platform Controls</h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Trigger global platform state overrides. Every change is immutably timestamped in the audit log.
                </p>

                <div className="space-y-2 pt-1 text-xs">
                  <button
                    onClick={() => {
                      const next = !platformControls.submissionsPaused;
                      updatePlatformControls(
                        { submissionsPaused: next },
                        next ? "Owner paused creator submissions" : "Owner resumed creator submissions",
                      );
                      toast.info(next ? "Submissions PAUSED" : "Submissions RESUMED");
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                      platformControls.submissionsPaused
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <span>{platformControls.submissionsPaused ? "⏸ Submissions Paused" : "▶ Submissions Open"}</span>
                    <span className="text-[10px] uppercase font-mono">Toggle</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = !platformControls.maintenanceMode;
                      updatePlatformControls(
                        { maintenanceMode: next },
                        next ? "Owner triggered maintenance mode" : "Owner deactivated maintenance mode",
                      );
                      toast.warning(next ? "Maintenance Mode ENABLED" : "Maintenance Mode DISABLED");
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                      platformControls.maintenanceMode
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <span>{platformControls.maintenanceMode ? "🚧 Maintenance Active" : "🟢 Platform Live"}</span>
                    <span className="text-[10px] uppercase font-mono">Toggle</span>
                  </button>

                  <button
                    onClick={() => {
                      const next = !platformControls.emergencyWalletFreeze;
                      updatePlatformControls(
                        { emergencyWalletFreeze: next },
                        next ? "Owner initiated Global Payout Freeze" : "Owner cleared Global Payout Freeze",
                      );
                      toast.error(next ? "Global Payouts FROZEN" : "Global Payouts UNLOCKED");
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                      platformControls.emergencyWalletFreeze
                        ? "bg-red-500/30 border-red-500/60 text-red-200 font-bold"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <span>{platformControls.emergencyWalletFreeze ? "🔒 Global Payouts Frozen" : "🔓 Payouts Normal"}</span>
                    <span className="text-[10px] uppercase font-mono">Toggle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. PLATFORM CONTROLS TAB */}
        {/* ========================================================= */}
        {activeTab === "controls" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">Platform Switches & Feature Flags</h2>
              <p className="text-xs text-white/50">
                Direct platform runtime settings. Changes take effect instantly for all visitors, creators, and moderators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Submission Gate Switch */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-emerald-400" />
                    <h3 className="font-bold text-sm">Creator Content Submission Gate</h3>
                  </div>
                  <Badge
                    className={
                      platformControls.submissionsPaused
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }
                  >
                    {platformControls.submissionsPaused ? "PAUSED" : "ACTIVE"}
                  </Badge>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Controls whether creators can submit new memes and reels into the contest queue. When paused, creators see an informative queue maintenance notice.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      const next = !platformControls.submissionsPaused;
                      updatePlatformControls(
                        { submissionsPaused: next },
                        next ? "Creator submissions paused by owner" : "Creator submissions enabled by owner",
                      );
                      playSound("pop");
                      toast.info(next ? "Submissions paused." : "Submissions enabled.");
                    }}
                    className={`w-full font-bold text-xs h-9 ${
                      platformControls.submissionsPaused
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "bg-rose-500 text-white hover:bg-rose-400"
                    }`}
                  >
                    {platformControls.submissionsPaused ? "Resume Creator Submissions" : "Pause Creator Submissions"}
                  </Button>
                </div>
              </div>

              {/* Maintenance Mode Switch */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Power className="size-4 text-amber-400" />
                    <h3 className="font-bold text-sm">Platform Maintenance Mode</h3>
                  </div>
                  <Badge
                    className={
                      platformControls.maintenanceMode
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }
                  >
                    {platformControls.maintenanceMode ? "MAINTENANCE" : "LIVE"}
                  </Badge>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Puts the platform in read-only mode during major database upgrades or migrations. Admins and owners retain bypass privileges.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      const next = !platformControls.maintenanceMode;
                      updatePlatformControls(
                        { maintenanceMode: next },
                        next ? "Maintenance mode enabled" : "Maintenance mode disabled",
                      );
                      playSound("pop");
                      toast.warning(next ? "Maintenance mode activated." : "Platform returned to live.");
                    }}
                    variant="outline"
                    className={`w-full font-bold text-xs h-9 border-white/20 ${
                      platformControls.maintenanceMode ? "text-amber-300 border-amber-500/40 bg-amber-500/10" : ""
                    }`}
                  >
                    {platformControls.maintenanceMode ? "Deactivate Maintenance" : "Activate Maintenance Mode"}
                  </Button>
                </div>
              </div>

              {/* Reel Studio Engine Mode */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4 text-[#d4ff00]" />
                    <h3 className="font-bold text-sm">Reel Studio Render Farm Mode</h3>
                  </div>
                  <Badge className="bg-[#d4ff00]/20 text-[#d4ff00] border-[#d4ff00]/30 text-[10px]">
                    {platformControls.renderFarmEcoMode ? "ECO 720P" : "FULL 1080P"}
                  </Badge>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Choose between high-definition 1080×1920 WebCodecs rendering and lightweight client-side Eco mode during peak contest traffic hours.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      const next = !platformControls.renderFarmEcoMode;
                      updatePlatformControls(
                        { renderFarmEcoMode: next },
                        next ? "Eco mode enabled for render farm" : "1080p high performance enabled",
                      );
                      playSound("pop");
                      toast.success(next ? "Eco Render Mode Active." : "1080p Full Performance Mode Active.");
                    }}
                    variant="outline"
                    className="w-full font-bold text-xs h-9 border-white/15 hover:bg-white/10"
                  >
                    {platformControls.renderFarmEcoMode ? "Switch to 1080p High Performance" : "Switch to Eco Render Mode"}
                  </Button>
                </div>
              </div>

              {/* AI Moderation Sensitivity */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-purple-400" />
                    <h3 className="font-bold text-sm">AI Moderation Sensitivity</h3>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase">
                    {platformControls.aiModerationSensitivity}
                  </Badge>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Adjust strictness of perceptual hash duplicates and text safety filters for incoming memes and reels.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {(["permissive", "balanced", "strict"] as const).map((sens) => (
                    <button
                      key={sens}
                      onClick={() => {
                        updatePlatformControls(
                          { aiModerationSensitivity: sens },
                          `AI moderation sensitivity set to ${sens}`,
                        );
                        playSound("pop");
                        toast.success(`Moderation set to ${sens.toUpperCase()}`);
                      }}
                      className={`rounded-xl border py-2 text-xs font-bold capitalize transition ${
                        platformControls.aiModerationSensitivity === sens
                          ? "border-purple-400 bg-purple-500/20 text-purple-200"
                          : "border-white/10 bg-black/40 text-white/60 hover:text-white"
                      }`}
                    >
                      {sens}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency Platform Payout Freeze (Killswitch) */}
              <div
                className={`rounded-2xl border p-5 space-y-3 transition-all ${
                  platformControls.emergencyWalletFreeze
                    ? "border-rose-500/60 bg-rose-950/40 shadow-[0_0_25px_rgba(244,63,94,0.25)]"
                    : "border-white/10 bg-[#111114]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertOctagon
                      className={`size-4 ${
                        platformControls.emergencyWalletFreeze ? "text-rose-400 animate-pulse" : "text-emerald-400"
                      }`}
                    />
                    <h3 className="font-bold text-sm">Emergency Platform Payout Freeze</h3>
                  </div>
                  <Badge
                    className={
                      platformControls.emergencyWalletFreeze
                        ? "bg-rose-500/30 text-rose-300 border-rose-500/50 animate-pulse font-black"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }
                  >
                    {platformControls.emergencyWalletFreeze ? "KILLSWITCH ENGAGED" : "PAYOUTS UNRESTRICTED"}
                  </Badge>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  System-wide emergency circuit breaker. When engaged, all creator cashouts, points redemptions, and banking transfers are instantly locked platform-wide.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      const next = !platformControls.emergencyWalletFreeze;
                      updatePlatformControls(
                        { emergencyWalletFreeze: next },
                        next
                          ? "Owner engaged Emergency Platform Payout Killswitch"
                          : "Owner lifted Emergency Platform Payout Freeze",
                      );
                      playSound(next ? "pop" : "cheer");
                      if (next) {
                        toast.error("🚨 EMERGENCY KILLSWITCH ACTIVE: All creator withdrawals frozen platform-wide.");
                      } else {
                        toast.success("Platform withdrawals restored to normal operation.");
                      }
                    }}
                    className={`w-full font-bold text-xs h-9 ${
                      platformControls.emergencyWalletFreeze
                        ? "bg-emerald-500 text-black hover:bg-emerald-400 font-black"
                        : "bg-rose-600 text-white hover:bg-rose-500 font-black shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                    }`}
                  >
                    {platformControls.emergencyWalletFreeze ? "Lift Emergency Freeze & Restore Payouts" : "⚠️ Engage Emergency Payout Freeze"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Platform Economy Calibration & Conversion Levers */}
            <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <BadgePercent className="size-4 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">Platform Economy Levers & Calibration</h3>
                    <p className="text-[11px] text-white/50">
                      Configure monetary redemption rates, cashout thresholds, daily velocity limits, and transaction fees.
                    </p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono font-bold">
                  1,000 pts = ₹{((platformControls.pointConversionRate ?? 0.5) * 1000).toLocaleString()}
                </Badge>
              </div>

              <form onSubmit={handleSaveEconomyLevers} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1.5">
                    <label className="block text-white/60 font-medium">Points Conversion Rate (₹/pt)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="5.0"
                        value={leversRate}
                        onChange={(e) => setLeversRate(Number(e.target.value))}
                        className="bg-black/60 border-white/10 font-mono text-amber-300 font-bold text-sm h-8"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-white/40 block">
                      Creator gets ₹{leversRate} for each approved RIFF point
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1.5">
                    <label className="block text-white/60 font-medium">Min Withdrawal Threshold (₹)</label>
                    <Input
                      type="number"
                      step="50"
                      min="50"
                      max="10000"
                      value={leversMin}
                      onChange={(e) => setLeversMin(Number(e.target.value))}
                      className="bg-black/60 border-white/10 font-mono text-emerald-400 font-bold text-sm h-8"
                      required
                    />
                    <span className="text-[10px] text-white/40 block">
                      Min cashout balance (={Math.ceil(leversMin / (leversRate || 0.5))} pts)
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1.5">
                    <label className="block text-white/60 font-medium">Daily Creator Payout Limit (₹)</label>
                    <Input
                      type="number"
                      step="1000"
                      min="500"
                      max="100000"
                      value={leversMaxDaily}
                      onChange={(e) => setLeversMaxDaily(Number(e.target.value))}
                      className="bg-black/60 border-white/10 font-mono text-sky-400 font-bold text-sm h-8"
                      required
                    />
                    <span className="text-[10px] text-white/40 block">
                      Max cumulative 24h withdrawal per creator
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1.5">
                    <label className="block text-white/60 font-medium">Platform Processing Fee (%)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="15"
                      value={leversFee}
                      onChange={(e) => setLeversFee(Number(e.target.value))}
                      className="bg-black/60 border-white/10 font-mono text-purple-400 font-bold text-sm h-8"
                      required
                    />
                    <span className="text-[10px] text-white/40 block">
                      Gateway & settlement operational fee
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <div className="flex-1 w-full">
                    <Input
                      placeholder="Mandatory calibration reason for audit log (e.g. Q3 creator incentive program update)..."
                      value={leversReason}
                      onChange={(e) => setLeversReason(e.target.value)}
                      className="bg-black/60 border-white/10 text-xs text-white h-9"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-9 px-5 shrink-0"
                  >
                    Save Economy Parameters & Log Audit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. RBAC & DELEGATION TAB */}
        {/* ========================================================= */}
        {activeTab === "rbac" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Grant Permission Scope Card */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="size-4 text-amber-400" />
                  <h3 className="font-bold text-sm">Delegate Granular Permission Scope</h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Assign specific capabilities without granting full superuser permissions.
                </p>

                <form onSubmit={handleGrantPermissionSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-white/40 mb-1">User Handle</label>
                    <Input
                      placeholder="e.g. 'aanya' or 'kabir'"
                      value={delegateHandle}
                      onChange={(e) => setDelegateHandle(e.target.value)}
                      className="bg-black/60 border-white/10 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/40 mb-1">Permission Scope</label>
                    <select
                      value={delegatePerm}
                      onChange={(e) => setDelegatePerm(e.target.value as AdminPermission)}
                      className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-white text-xs outline-none"
                    >
                      {PERMISSION_SCOPES.map((scope) => (
                        <option key={scope.id} value={scope.id} className="bg-[#111]">
                          {scope.id} ({scope.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-9"
                  >
                    Delegate Capability
                  </Button>
                </form>
              </div>

              {/* Team Directory & Roles */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-sky-400" />
                    <h3 className="font-bold text-sm">Platform Staff & User Directory ({people.length})</h3>
                  </div>
                  <div className="relative">
                    <Search className="size-3.5 absolute left-3 top-2.5 text-white/40" />
                    <input
                      placeholder="Search by name, handle, role..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="rounded-xl border border-white/10 bg-black/60 pl-8 pr-3 py-1.5 text-xs text-white outline-none w-56 focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredTeam.map((person) => {
                    const isSelf = person.handle === profile?.handle;
                    const isLockedOwner = person.role === "owner";
                    const userPerms = person.permissions || [];
                    const warnings = person.warningsCount || 0;

                    return (
                      <div key={person.id} className="py-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-amber-400 shrink-0">
                              {person.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white truncate">{person.name}</span>
                                <span className="text-white/40 text-[11px]">@{person.handle}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                    YOU
                                  </span>
                                )}
                                {person.isWalletFrozen && (
                                  <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                                    <Lock className="size-2.5" /> FROZEN
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-white/40 pt-0.5">
                                <span>{person.followers.toLocaleString()} followers</span>
                                <span>•</span>
                                <span className="font-mono text-emerald-400 font-bold">
                                  {person.riffPoints || 0} pts
                                </span>
                                {warnings > 0 && (
                                  <>
                                    <span>•</span>
                                    <span
                                      className={`font-bold ${
                                        warnings >= 5 ? "text-rose-400" : "text-amber-400"
                                      }`}
                                    >
                                      ⚠️ {warnings}/5 warnings
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Role Selector */}
                          <div className="flex items-center gap-2">
                            <select
                              value={person.role}
                              disabled={isLockedOwner && !isSelf}
                              onChange={(e) => {
                                updateUserRole(person.handle, e.target.value as Person["role"]);
                                playSound("pop");
                                toast.success(`Changed @${person.handle} role to ${e.target.value}.`);
                              }}
                              className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 outline-none disabled:opacity-50"
                            >
                              <option value="creator" className="bg-[#111] text-white">Creator</option>
                              <option value="brand" className="bg-[#111] text-white">Brand</option>
                              <option value="moderator" className="bg-[#111] text-white">Moderator</option>
                              <option value="admin" className="bg-[#111] text-white">Admin</option>
                              <option value="super_admin" className="bg-[#111] text-white">Super Admin</option>
                              <option value="owner" className="bg-[#111] text-white">Owner</option>
                            </select>
                          </div>
                        </div>

                        {/* Delegated Capabilities List */}
                        {userPerms.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pl-10">
                            <span className="text-[10px] text-white/40">Capabilities:</span>
                            {userPerms.map((perm) => (
                              <span
                                key={perm}
                                className="inline-flex items-center gap-1 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-sky-300 font-mono"
                              >
                                <span>{perm}</span>
                                <button
                                  onClick={() => revokeUserPermission(person.handle, perm)}
                                  className="text-white/40 hover:text-rose-400"
                                  title="Revoke permission"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. CATEGORY ECONOMY & GLOBAL CONTENT CONTROLS TAB */}
        {/* ========================================================= */}
        {activeTab === "economy" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Tag className="size-5 text-amber-400" />
                  <span>Global Content & Category Controls</span>
                </h2>
                <p className="text-xs text-white/50">
                  Manage categories, content-type restrictions (Memes vs Reels), auto-approval policies, display order, and dynamic RIFF Points rewards.
                </p>
              </div>
              <Button
                onClick={() => setShowAddCatModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md"
              >
                <Plus className="size-4" />
                <span>Create New Category</span>
              </Button>
            </div>

            {/* Category Governance KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-3.5 space-y-1">
                <span className="text-[11px] text-white/40 block font-medium">Total Categories</span>
                <span className="text-xl font-bold font-mono text-white">{storeCategories.length}</span>
                <span className="text-[10px] text-white/30 block">Global Taxonomy</span>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
                <span className="text-[11px] text-emerald-400/70 block font-medium">Active Categories</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {storeCategories.filter((c) => c.status === "active").length}
                </span>
                <span className="text-[10px] text-emerald-400/50 block">Submissions Open</span>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
                <span className="text-[11px] text-amber-400/70 block font-medium">Default Fallback</span>
                <span className="text-sm font-bold truncate text-amber-300 block">
                  {storeCategories.find((c) => c.isDefault)?.name || "Relatable"}
                </span>
                <span className="text-[10px] text-amber-400/50 block font-mono">Platform Fallback</span>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 space-y-1">
                <span className="text-[11px] text-sky-400/70 block font-medium">Average Reward</span>
                <span className="text-xl font-bold font-mono text-sky-300">
                  {Math.round(
                    storeCategories.reduce((acc, c) => acc + (c.approvalPoints || 10), 0) /
                      (storeCategories.length || 1),
                  )}{" "}
                  pts
                </span>
                <span className="text-[10px] text-sky-400/50 block">Per Approved Post</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-2xl p-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 size-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by category name or #slug..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                {(["all", "active", "inactive", "archived"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setCatStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                      catStatusFilter === st
                        ? "bg-amber-500 text-black shadow-sm"
                        : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeCategories
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
                      className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 transition ${
                        cat.status === "active"
                          ? "border-white/10 bg-[#111114]"
                          : cat.status === "archived"
                            ? "border-rose-500/20 bg-rose-950/10 opacity-70"
                            : "border-amber-500/20 bg-amber-950/10"
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-3xl">{cat.icon}</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-sm text-white">{cat.name}</h3>
                                {cat.isDefault && (
                                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-bold flex items-center gap-1 py-0 px-1.5">
                                    <Star className="size-2.5 fill-amber-300" />
                                    <span>DEFAULT</span>
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-white/40 font-mono">
                                #{cat.slug} · Priority #{cat.sortOrder || idx + 1}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              className={`text-[9px] font-bold uppercase tracking-wider ${
                                cat.status === "active"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : cat.status === "archived"
                                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              }`}
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
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              cat.allowedTypes === "post"
                                ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                : cat.allowedTypes === "reel"
                                  ? "bg-pink-500/10 text-pink-300 border-pink-500/30"
                                  : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                            }`}
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
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              cat.requiresReview === false
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            <Shield className="size-2.5" />
                            <span>
                              {cat.requiresReview === false ? "Auto-Approve" : "Review Required"}
                            </span>
                          </span>
                        </div>

                        <p className="text-xs text-white/50 mt-2 line-clamp-2 leading-relaxed">
                          {cat.description || "No description configured."}
                        </p>
                      </div>

                      {/* Economy Breakdown */}
                      <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 space-y-1 text-xs">
                        <div className="flex justify-between text-white/50 text-[11px]">
                          <span>Approval Points:</span>
                          <span className="text-white font-mono font-bold">+{cat.approvalPoints} pts</span>
                        </div>
                        <div className="flex justify-between text-white/50 text-[11px]">
                          <span>Per 1K Views:</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            +{cat.bonusPer1000Views ?? 5} pts
                          </span>
                        </div>
                        <div className="flex justify-between text-white/50 text-[11px]">
                          <span>Per 100 Likes:</span>
                          <span className="text-sky-400 font-mono font-bold">
                            +{cat.bonusPer100Likes ?? 2} pts
                          </span>
                        </div>
                        <div className="flex justify-between text-white/50 text-[11px] border-t border-white/5 pt-1">
                          <span>Reward Cap:</span>
                          <span className="text-amber-400 font-mono font-bold">
                            {cat.maxRewardCeiling ?? 100} pts
                          </span>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5">
                          {/* Reorder Up/Down */}
                          <div className="flex items-center rounded-lg border border-white/10 bg-black/60 p-0.5">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveCategory(cat.id, "up")}
                              className="p-1 text-white/50 hover:text-white disabled:opacity-20 transition"
                              title="Move Category Up in Menu"
                            >
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveCategory(cat.id, "down")}
                              className="p-1 text-white/50 hover:text-white disabled:opacity-20 transition"
                              title="Move Category Down in Menu"
                            >
                              <ArrowDown className="size-3.5" />
                            </button>
                          </div>

                          {/* Quick Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cat)}
                            className={`flex-1 text-[11px] font-bold h-7 rounded-lg border px-2 flex items-center justify-center gap-1 transition ${
                              cat.status === "active"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {cat.status === "active" ? (
                              <>
                                <Pause className="size-3" />
                                <span>Pause Submissions</span>
                              </>
                            ) : (
                              <>
                                <Play className="size-3" />
                                <span>Enable Category</span>
                              </>
                            )}
                          </button>

                          {/* Set Default */}
                          {!cat.isDefault && cat.status === "active" && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(cat)}
                              className="h-7 px-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-amber-500/20 text-white/70 hover:text-amber-300 text-[10px] font-bold transition flex items-center gap-1"
                              title="Make Default Platform Fallback"
                            >
                              <Star className="size-3" />
                              <span>Make Default</span>
                            </button>
                          )}
                        </div>

                        {/* Edit Button */}
                        <Button
                          onClick={() => {
                            setEditingCat(cat);
                            setEditCatName(cat.name);
                            setEditCatSlug(cat.slug);
                            setEditCatIcon(cat.icon);
                            setEditCatDesc(cat.description || "");
                            setEditCatStatus(cat.status || "active");
                            setEditCatAllowedTypes(cat.allowedTypes || "all");
                            setEditCatRequiresReview(cat.requiresReview !== false);
                            setEditCatIsDefault(Boolean(cat.isDefault));
                            setEditBasePoints(cat.approvalPoints);
                            setEditBonusViews(cat.bonusPer1000Views ?? 5);
                            setEditBonusLikes(cat.bonusPer100Likes ?? 2);
                            setEditMaxReward(cat.maxRewardCeiling ?? 100);
                            setEditReason("");
                          }}
                          variant="outline"
                          className="w-full text-xs h-7 border-white/10 hover:bg-white/10 font-bold"
                        >
                          <Edit3 className="size-3 mr-1.5" /> Configure Rules & Economy
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* EDIT CATEGORY MODAL */}
            {editingCat && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#121214] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{editCatIcon}</span>
                      <div>
                        <h3 className="font-bold text-base text-white">Configure {editingCat.name}</h3>
                        <span className="text-[11px] text-white/40 font-mono">#{editingCat.slug}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingCat(null)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveCategoryRule} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1">
                        <label className="block text-white/50 mb-1">Icon</label>
                        <Input
                          value={editCatIcon}
                          onChange={(e) => setEditCatIcon(e.target.value)}
                          className="bg-black/60 border-white/10 text-center text-lg text-white"
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-white/50 mb-1">Category Name</label>
                        <Input
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="bg-black/60 border-white/10 text-white font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-white/50 mb-1">URL Slug</label>
                        <Input
                          value={editCatSlug}
                          onChange={(e) => setEditCatSlug(e.target.value)}
                          className="bg-black/60 border-white/10 font-mono text-white text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 mb-1">Category Status</label>
                        <select
                          value={editCatStatus}
                          onChange={(e) => setEditCatStatus(e.target.value as any)}
                          className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="active">Active (Submissions Open)</option>
                          <option value="inactive">Inactive (Submissions Paused)</option>
                          <option value="archived">Archived (Hidden from Menu)</option>
                        </select>
                      </div>
                    </div>

                    {/* Content Type Rules & Approval Requirement */}
                    <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/5 p-3 rounded-xl">
                      <div>
                        <label className="block text-white/50 mb-1 font-semibold">Content Type Allowed</label>
                        <select
                          value={editCatAllowedTypes}
                          onChange={(e) => setEditCatAllowedTypes(e.target.value as any)}
                          className="w-full rounded-md border border-white/10 bg-black/80 px-2.5 py-1.5 text-xs text-amber-300 font-bold outline-none"
                        >
                          <option value="all">All Formats (Memes & Reels)</option>
                          <option value="post">Memes Only (1:1 / 4:5 Posts)</option>
                          <option value="reel">Reels Only (9:16 Video Reels)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/50 mb-1 font-semibold">Moderation Rule</label>
                        <select
                          value={editCatRequiresReview ? "review" : "auto"}
                          onChange={(e) => setEditCatRequiresReview(e.target.value === "review")}
                          className="w-full rounded-md border border-white/10 bg-black/80 px-2.5 py-1.5 text-xs text-emerald-300 font-bold outline-none"
                        >
                          <option value="review">Moderator Review Required</option>
                          <option value="auto">Auto-Approve Community Posts</option>
                        </select>
                      </div>
                    </div>

                    {/* Default Category Switch */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/10 bg-black/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCatIsDefault}
                        onChange={(e) => setEditCatIsDefault(e.target.checked)}
                        className="size-4 accent-amber-400 rounded"
                      />
                      <div>
                        <span className="text-white font-bold block text-xs">Default Fallback Category</span>
                        <span className="text-[10px] text-white/50 block">
                          Used automatically if creator omits category or selected category becomes disabled.
                        </span>
                      </div>
                    </label>

                    <div>
                      <label className="block text-white/50 mb-1">Description</label>
                      <Input
                        value={editCatDesc}
                        onChange={(e) => setEditCatDesc(e.target.value)}
                        placeholder="Content guidance for creators..."
                        className="bg-black/60 border-white/10 text-white"
                      />
                    </div>

                    {/* Dynamic Earning Levers */}
                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                      <div>
                        <label className="block text-white/50 mb-1">Base Approval Points</label>
                        <Input
                          type="number"
                          value={editBasePoints}
                          onChange={(e) => setEditBasePoints(Number(e.target.value))}
                          className="bg-black/60 border-white/10 font-mono text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 mb-1">Bonus / 1,000 Views</label>
                        <Input
                          type="number"
                          value={editBonusViews}
                          onChange={(e) => setEditBonusViews(Number(e.target.value))}
                          className="bg-black/60 border-white/10 font-mono text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-white/50 mb-1">Bonus / 100 Likes</label>
                        <Input
                          type="number"
                          value={editBonusLikes}
                          onChange={(e) => setEditBonusLikes(Number(e.target.value))}
                          className="bg-black/60 border-white/10 font-mono text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 mb-1">Max Reward Ceiling</label>
                        <Input
                          type="number"
                          value={editMaxReward}
                          onChange={(e) => setEditMaxReward(Number(e.target.value))}
                          className="bg-black/60 border-white/10 font-mono text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/50 mb-1">Audit Log Rationale</label>
                      <Input
                        placeholder="e.g. Creator demand, policy change, content restriction"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className="bg-black/60 border-white/10 text-white"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={() => setEditingCat(null)}
                        variant="outline"
                        className="flex-1 border-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black"
                      >
                        Save Category & Log Audit
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ADD CATEGORY MODAL */}
            {showAddCatModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#121214] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Plus className="size-4 text-amber-400" />
                      <span>Create New Content Category</span>
                    </h3>
                    <button
                      onClick={() => setShowAddCatModal(false)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1">
                        <label className="block text-white/50 mb-1">Icon</label>
                        <Input
                          value={newCatIcon}
                          onChange={(e) => setNewCatIcon(e.target.value)}
                          className="bg-black/60 border-white/10 text-center text-lg text-white"
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-white/50 mb-1">Category Name</label>
                        <Input
                          placeholder="e.g. Standup & Comedy"
                          value={newCatName}
                          onChange={(e) => {
                            setNewCatName(e.target.value);
                            setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                          }}
                          className="bg-black/60 border-white/10 text-white font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-white/50 mb-1">URL Slug</label>
                        <Input
                          value={newCatSlug}
                          onChange={(e) => setNewCatSlug(e.target.value)}
                          className="bg-black/60 border-white/10 font-mono text-white text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 mb-1">Approval Base Points</label>
                        <Input
                          type="number"
                          value={newCatPoints}
                          onChange={(e) => setNewCatPoints(Number(e.target.value))}
                          className="bg-black/60 border-white/10 font-mono text-white text-xs"
                          required
                        />
                      </div>
                    </div>

                    {/* Content Type & Approval Rules */}
                    <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/5 p-3 rounded-xl">
                      <div>
                        <label className="block text-white/50 mb-1 font-semibold">Format Restriction</label>
                        <select
                          value={newCatAllowedTypes}
                          onChange={(e) => setNewCatAllowedTypes(e.target.value as any)}
                          className="w-full rounded-md border border-white/10 bg-black/80 px-2 py-1.5 text-xs text-amber-300 font-bold outline-none"
                        >
                          <option value="all">All Formats (Memes & Reels)</option>
                          <option value="post">Memes Only (Posts)</option>
                          <option value="reel">Reels Only (9:16 Video)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/50 mb-1 font-semibold">Review Requirement</label>
                        <select
                          value={newCatRequiresReview ? "review" : "auto"}
                          onChange={(e) => setNewCatRequiresReview(e.target.value === "review")}
                          className="w-full rounded-md border border-white/10 bg-black/80 px-2 py-1.5 text-xs text-emerald-300 font-bold outline-none"
                        >
                          <option value="review">Requires Moderator Review</option>
                          <option value="auto">Auto-Approve Live to Feed</option>
                        </select>
                      </div>
                    </div>

                    {/* Set as Default Checkbox */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/10 bg-black/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCatIsDefault}
                        onChange={(e) => setNewCatIsDefault(e.target.checked)}
                        className="size-4 accent-amber-400 rounded"
                      />
                      <div>
                        <span className="text-white font-bold block text-xs">Set as Default Platform Category</span>
                        <span className="text-[10px] text-white/50 block">
                          Fallback category for undefined submissions or disabled categories.
                        </span>
                      </div>
                    </label>

                    <div>
                      <label className="block text-white/50 mb-1">Description</label>
                      <Input
                        placeholder="What kind of content belongs here..."
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                        className="bg-black/60 border-white/10 text-white"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={() => setShowAddCatModal(false)}
                        variant="outline"
                        className="flex-1 border-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black"
                      >
                        Create Category
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. FINANCIAL GOVERNANCE & WALLETS TAB */}
        {/* ========================================================= */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            {/* Header & Killswitch Alert */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>Financial Solvency & Escrow Governance</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono font-bold">
                    ESCROW RECONCILED
                  </Badge>
                </h2>
                <p className="text-xs text-white/50">
                  Track platform liability, settle creator payout queues, and safeguard liquidity with audited arbitration.
                </p>
              </div>

              {platformControls.emergencyWalletFreeze && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-pulse">
                  <AlertOctagon className="size-4 text-rose-400" />
                  <span>EMERGENCY FREEZE ENGAGED: CASHOUTS BLOCKED</span>
                </div>
              )}
            </div>

            {/* 4 Solvency Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Points Liability */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium">Circulating Liability</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {inr(totalCirculatingPoints * (platformControls.pointConversionRate ?? 0.5))}
                </div>
                <p className="text-[11px] text-white/40 flex items-center justify-between">
                  <span>{totalCirculatingPoints.toLocaleString()} pts</span>
                  <span className="text-amber-400/80 font-mono">₹{platformControls.pointConversionRate ?? 0.5}/pt</span>
                </p>
              </div>

              {/* 2. Cumulative Settled Payouts */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium">Settled Payouts</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {inr(totalSettledInr)}
                </div>
                <p className="text-[11px] text-white/40 flex items-center justify-between">
                  <span>{completedWithdrawalsCount} completed</span>
                  <span className="text-emerald-400/80 font-mono">Verified bank/UPI</span>
                </p>
              </div>

              {/* 3. Pending Escrow Queue */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium">Pending Escrow</span>
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-sky-300">
                  {inr(totalPendingEscrowInr)}
                </div>
                <p className="text-[11px] text-white/40 flex items-center justify-between">
                  <span>{pendingWithdrawalsCount} pending</span>
                  <span className="text-sky-400/80 font-mono">Needs arbitration</span>
                </p>
              </div>

              {/* 4. Frozen Accounts & Escrow */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium">Frozen Wallets</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <Lock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-rose-400">
                  {frozenUsers.length} <span className="text-sm font-normal text-white/50">wallets</span>
                </div>
                <p className="text-[11px] text-white/40 flex items-center justify-between">
                  <span>{totalLockedFrozenPoints.toLocaleString()} pts locked</span>
                  <span className="text-rose-400/80 font-mono">Halted</span>
                </p>
              </div>
            </div>

            {/* PENDING WITHDRAWALS ARBITRATION QUEUE */}
            <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">Creator Cashout & Escrow Arbitration Queue</h3>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-mono font-bold">
                      {pendingWithdrawalsCount} PENDING
                    </Badge>
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Process creator cashouts. Approvals mark transfers settled; rejections return escrow to user balance; flags freeze the account.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex bg-black/60 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
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
                          ? "bg-amber-500/20 text-amber-300 font-black"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table of Withdrawals */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/40 text-white/40 border-b border-white/10 text-[10px] uppercase font-mono tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Creator</th>
                      <th className="py-2.5 px-3">Payout Method & Details</th>
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
                                <div className="text-[11px] text-white/40 font-mono">@{w.userHandle}</div>
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
                                <div className="text-[10px] text-white/40">
                                  A/C Holder: {String(w.paymentDetails.holderName)}
                                </div>
                              )}
                              <div className="text-[10px] text-white/30">
                                Requested {new Date(w.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-sm text-white">{inr(w.amount)}</span>
                            {platformControls.payoutProcessingFeePercent > 0 && (
                              <div className="text-[10px] text-white/40">
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
                                <AlertOctagon className="size-2.5" /> Refunded / Failed
                              </span>
                            )}
                            {w.adminNote && (
                              <div className="text-[10px] text-white/40 max-w-[180px] truncate mt-0.5">
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
                                  variant="outline"
                                  onClick={() => {
                                    setArbitrationModal({ wth: w, action: "reject" });
                                    setArbitrationNote("");
                                  }}
                                  className="h-7 px-2 border-white/10 hover:border-amber-400/50 hover:bg-amber-500/10 text-amber-300 text-[11px] rounded-lg"
                                >
                                  Reject & Refund
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setArbitrationModal({ wth: w, action: "flag_freeze" });
                                    setArbitrationNote("");
                                  }}
                                  className="h-7 px-2 border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-[11px] rounded-lg"
                                >
                                  <Lock className="size-3 mr-0.5" />
                                  Freeze
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-white/30 italic">
                                {isCompleted ? `Processed ${w.processedAt ? new Date(w.processedAt).toLocaleDateString() : "OK"}` : "Closed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredWithdrawals.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-white/40">
                          No withdrawal records matching current filter ({withdrawalFilter}).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECONDARY CONTROLS: TARGETED WALLET FREEZE & POINTS ADJUSTMENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emergency Wallet Freeze */}
              <div className="rounded-2xl border border-rose-500/20 bg-[#111114] p-5 space-y-4">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertOctagon className="size-4" />
                  <h3 className="font-bold text-sm">Targeted Creator Wallet Freeze</h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Freeze a suspicious creator or brand account. Freezing halts points transfers and locks withdrawals immediately.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-white/40 mb-1">User Handle</label>
                    <Input
                      placeholder="e.g. 'kabir' or '@kabir'"
                      value={freezeHandle}
                      onChange={(e) => setFreezeHandle(e.target.value)}
                      className="bg-black/60 border-white/10 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-white/40 mb-1">Reason for Audit Log</label>
                    <Input
                      placeholder="e.g. Copyright infringement report or bot activity"
                      value={freezeReason}
                      onChange={(e) => setFreezeReason(e.target.value)}
                      className="bg-black/60 border-white/10 text-xs"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => handleToggleFreeze(true)}
                      className="flex-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-bold h-9"
                    >
                      <Lock className="size-3.5 mr-1" /> Freeze Wallet
                    </Button>
                    <Button
                      onClick={() => handleToggleFreeze(false)}
                      variant="outline"
                      className="flex-1 border-white/15 text-white/80 hover:bg-white/10 text-xs font-bold h-9"
                    >
                      <Unlock className="size-3.5 mr-1" /> Restore Wallet
                    </Button>
                  </div>
                </div>

                {/* List of Currently Frozen Wallets */}
                {frozenUsers.length > 0 && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <h4 className="text-xs font-bold text-rose-400">
                      Currently Frozen Accounts ({frozenUsers.length}):
                    </h4>
                    <div className="space-y-1.5">
                      {frozenUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs"
                        >
                          <span className="font-semibold text-white">@{user.handle}</span>
                          <button
                            onClick={() => {
                              toggleUserWalletFreeze(user.handle, false, "Owner manual unfreeze");
                              playSound("pop");
                              toast.success(`Unfrozen @${user.handle}`);
                            }}
                            className="text-[10px] text-emerald-400 hover:underline font-bold"
                          >
                            Unfreeze
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Points Adjustment */}
              <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 space-y-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <Wallet className="size-4" />
                  <h3 className="font-bold text-sm">Direct Creator Points Adjustment</h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Credit bonus contest rewards or debit points for policy corrections directly into any creator&apos;s wallet.
                </p>

                <form onSubmit={handleAdjustPoints} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-white/40 mb-1">User Handle</label>
                    <Input
                      placeholder="e.g. 'aanya' or '@you'"
                      value={adjustHandle}
                      onChange={(e) => setAdjustHandle(e.target.value)}
                      className="bg-black/60 border-white/10 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/40 mb-1">
                      Delta Points (Positive to award, Negative to deduct)
                    </label>
                    <Input
                      type="number"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(Number(e.target.value))}
                      className="bg-black/60 border-white/10 font-mono text-white text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/40 mb-1">Adjustment Reason (Mandatory Audit)</label>
                    <Input
                      placeholder="e.g. Creator contest winner bonus"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="bg-black/60 border-white/10 text-xs"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-9"
                  >
                    Execute Points Transaction & Log Audit
                  </Button>
                </form>
              </div>
            </div>

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
                        <p className="text-[11px] text-white/50">
                          Audited Financial Governance Action
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setArbitrationModal(null)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  {/* Summary of withdrawal */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-white/50">Creator:</span>
                      <span className="font-bold text-white">@{arbitrationModal.wth.userHandle} ({arbitrationModal.wth.userName})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Requested Amount:</span>
                      <span className="font-mono font-bold text-white">{inr(arbitrationModal.wth.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Escrow Value:</span>
                      <span className="font-mono text-amber-400 font-bold">{arbitrationModal.wth.pointsEquivalent.toLocaleString()} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Payout Destination:</span>
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
                      <label className="block text-white/50 mb-1">
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
                        variant="outline"
                        className="flex-1 border-white/10"
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

        {/* ========================================================= */}
        {/* 6. IMMUTABLE AUDIT TRAIL TAB */}
        {/* ========================================================= */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Immutable System Audit Trail</h2>
                <p className="text-xs text-white/50">
                  Chronological cryptographically-traced log of all permissions, economics, moderation, and wallet actions.
                </p>
              </div>

              {/* Sub-filters & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-black/60 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "rbac", label: "RBAC" },
                      { id: "economy", label: "Economy" },
                      { id: "security", label: "Security" },
                      { id: "moderation", label: "Moderation" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setAuditFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        auditFilter === f.id
                          ? "bg-amber-500/20 text-amber-300 font-black"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="size-3.5 absolute left-3 top-2.5 text-white/40" />
                  <input
                    placeholder="Search logs..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black/60 pl-8 pr-3 py-1.5 text-xs text-white outline-none w-44 focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111114] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/60 text-white/40 border-b border-white/10 text-[10px] uppercase font-mono tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target / Content</th>
                      <th className="py-3 px-4">Points</th>
                      <th className="py-3 px-4">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAuditLogs.map((log) => {
                      const isOwnerActor = log.actorRole === "owner";
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-white/40 whitespace-nowrap font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-white">@{log.actorId}</span>{" "}
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isOwnerActor
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-white/10 text-white/50"
                              }`}
                            >
                              {log.actorRole}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                log.action.includes("freeze") || log.action === "reject"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : log.action === "approve"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : log.action.includes("permission") || log.action.includes("role")
                                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                      : "bg-white/10 text-white/70 border border-white/15"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white/80">
                            {log.submitterHandle && (
                              <span className="font-semibold text-amber-300 mr-1">
                                @{log.submitterHandle}
                              </span>
                            )}
                            <span className="text-white/60 truncate max-w-xs block">
                              {log.postCaption || log.approvedCategory || log.postId || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                            {log.pointsAwarded ? (
                              <span
                                className={
                                  log.pointsAwarded > 0 ? "text-emerald-400" : "text-rose-400"
                                }
                              >
                                {log.pointsAwarded > 0 ? "+" : ""}
                                {log.pointsAwarded} pts
                              </span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white/50 max-w-xs truncate">
                            {log.reason || "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAuditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-white/40">
                          No audit trail records matching query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* TAB 7: SYSTEM CONFIGURATION */}
        {/* ================================================= */}
        {activeTab === "config" && (
          <div className="space-y-6">
            {/* Header & Stats Banner */}
            <div className="rounded-3xl border border-white/10 bg-[#0f0f12] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 size-60 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <Settings className="size-6 animate-[spin_10s_linear_infinite]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      Centralized System Configuration
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-black">
                        SERVER-AUTHORITATIVE
                      </Badge>
                    </h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      Configure dynamic runtime policies across platform infrastructure, content limits, AI moderation, economy thresholds, and security parameters.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      getSystemConfigsServerFn().then((cfgs) => {
                        if (cfgs && Array.isArray(cfgs)) {
                          setSystemConfigs(cfgs);
                          toast.success("System configurations refreshed from database.");
                        }
                      });
                      loadConfigAudit();
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Refresh</span>
                  </button>

                  {Object.keys(draftConfigs).some(
                    (k) => draftConfigs[k] !== (storeSystemConfigs.find((c) => c.key === k)?.value ?? ""),
                  ) && (
                    <Button
                      onClick={handleBatchSaveConfigs}
                      disabled={isSavingConfig}
                      className="rounded-xl bg-[#d4ff00] hover:bg-[#c2eb00] text-black font-black text-xs h-9 px-4 shadow-[0_0_20px_rgba(212,255,0,0.2)]"
                    >
                      {isSavingConfig ? "Saving Changes..." : "Save All Changes"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/5">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-3">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                    Total Parameters
                  </span>
                  <div className="text-xl font-black text-white mt-1">
                    {storeSystemConfigs.length}
                  </div>
                </div>

                <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-3">
                  <span className="text-[10px] uppercase font-bold text-amber-400/70 tracking-wider">
                    Owner Protected
                  </span>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    {storeSystemConfigs.filter((c) => OWNER_ONLY_CONFIG_KEYS.includes(c.key as any)).length}
                  </div>
                </div>

                <div className="bg-black/40 border border-sky-500/20 rounded-2xl p-3">
                  <span className="text-[10px] uppercase font-bold text-sky-400/70 tracking-wider">
                    Public Exposed
                  </span>
                  <div className="text-xl font-black text-sky-300 mt-1">
                    {storeSystemConfigs.filter((c) => c.isPublic).length}
                  </div>
                </div>

                <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-3">
                  <span className="text-[10px] uppercase font-bold text-purple-400/70 tracking-wider">
                    Modified Staged
                  </span>
                  <div className="text-xl font-black text-purple-300 mt-1">
                    {
                      Object.keys(draftConfigs).filter(
                        (k) => draftConfigs[k] !== (storeSystemConfigs.find((c) => c.key === k)?.value ?? ""),
                      ).length
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Staged Changes Action Banner */}
            {Object.keys(draftConfigs).some(
              (k) => draftConfigs[k] !== (storeSystemConfigs.find((c) => c.key === k)?.value ?? ""),
            ) && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-lg backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-amber-200">
                        {
                          Object.keys(draftConfigs).filter(
                            (k) =>
                              draftConfigs[k] !== (storeSystemConfigs.find((c) => c.key === k)?.value ?? ""),
                          ).length
                        }{" "}
                        Configuration Change(s) Staged
                      </div>
                      <div className="text-xs text-amber-300/60">
                        Changes are held in memory. Click Save to persist to database and create audit trail entries.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="text"
                      placeholder="Audit reason (optional)..."
                      value={configReason}
                      onChange={(e) => setConfigReason(e.target.value)}
                      className="h-9 w-60 bg-black/60 border-amber-500/30 text-xs text-white placeholder:text-amber-300/40"
                    />
                    <Button
                      size="sm"
                      onClick={handleBatchSaveConfigs}
                      disabled={isSavingConfig}
                      className="h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-4"
                    >
                      {isSavingConfig ? "Saving..." : "Save All"}
                    </Button>
                    <button
                      type="button"
                      onClick={handleResetDrafts}
                      className="h-9 rounded-xl border border-white/10 px-3 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap ${
                        isActive
                          ? "bg-amber-500 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                          : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative sm:w-64">
                <Search className="size-4 text-white/40 absolute left-3 top-2.5" />
                <Input
                  type="text"
                  placeholder="Filter parameters..."
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

                  return (
                    <div
                      key={c.key}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isDirty
                          ? "border-amber-500/60 bg-[#16130b] shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                          : "border-white/10 bg-[#0c0c0e] hover:border-white/20"
                      }`}
                    >
                      <div>
                        {/* Badges Bar */}
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
                              {c.category}
                            </span>
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-mono text-white/40">
                              {c.valueType}
                            </span>
                            {isOwnerOnly && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-black">
                                👑 OWNER ONLY
                              </Badge>
                            )}
                            {c.isPublic && (
                              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[9px] font-bold">
                                🌐 PUBLIC
                              </Badge>
                            )}
                          </div>

                          {isDirty && (
                            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-black animate-pulse">
                              MODIFIED
                            </span>
                          )}
                        </div>

                        {/* Key Name & Description */}
                        <div className="font-mono text-xs font-bold text-amber-300 break-all">
                          {c.key}
                        </div>
                        <p className="text-xs text-white/60 mt-1 leading-relaxed">
                          {c.description || "Platform operational setting"}
                        </p>

                        {/* Interactive Editor Input */}
                        <div className="mt-4">
                          {c.valueType === "boolean" ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfigDraftChange(
                                    c.key,
                                    currentVal === "true" ? "false" : "true",
                                  )
                                }
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  currentVal === "true"
                                    ? "bg-emerald-500 text-black font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    : "bg-white/10 text-white/50 hover:bg-white/15"
                                }`}
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
                          ) : c.valueType === "integer" ? (
                            <Input
                              type="number"
                              step="1"
                              value={currentVal}
                              onChange={(e) => handleConfigDraftChange(c.key, e.target.value)}
                              className="h-9 bg-black/60 border-white/10 font-mono text-xs text-white rounded-xl"
                            />
                          ) : c.valueType === "decimal" ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={currentVal}
                              onChange={(e) => handleConfigDraftChange(c.key, e.target.value)}
                              className="h-9 bg-black/60 border-white/10 font-mono text-xs text-white rounded-xl"
                            />
                          ) : c.valueType === "json" ? (
                            <div className="space-y-1">
                              <textarea
                                rows={2}
                                value={currentVal}
                                onChange={(e) => handleConfigDraftChange(c.key, e.target.value)}
                                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 font-mono text-xs text-white focus:outline-none focus:border-amber-500/50"
                              />
                              <div className="flex items-center justify-between text-[10px]">
                                {(() => {
                                  try {
                                    JSON.parse(currentVal);
                                    return <span className="text-emerald-400">✓ Valid JSON</span>;
                                  } catch {
                                    return (
                                      <span className="text-rose-400">✗ Invalid JSON syntax</span>
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          ) : (
                            <Input
                              type="text"
                              value={currentVal}
                              onChange={(e) => handleConfigDraftChange(c.key, e.target.value)}
                              className="h-9 bg-black/60 border-white/10 font-mono text-xs text-white rounded-xl"
                            />
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                        <span className="truncate max-w-[180px]">
                          Default:{" "}
                          <span className="font-mono text-white/60">
                            {c.defaultValue ?? "—"}
                          </span>
                        </span>

                        {isDirty && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next = { ...draftConfigs };
                                delete next[c.key];
                                setDraftConfigs(next);
                              }}
                              className="text-white/40 hover:text-white px-1.5 py-0.5 text-[11px]"
                            >
                              Revert
                            </button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveSingleConfig(c.key as SystemConfigKey)}
                              disabled={isSavingConfig}
                              className="h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] px-2.5"
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

            {/* System Configuration Audit Trail */}
            <div className="rounded-3xl border border-white/10 bg-[#0f0f12] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-amber-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    System Configuration Audit Trail
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadConfigAudit}
                  className="flex items-center gap-1 text-xs text-white/50 hover:text-white"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Refresh Trail</span>
                </button>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Config Key</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Change (Old → New)</th>
                      <th className="py-2.5 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {configAuditHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-white/40 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white/80">
                          {log.actorId}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-300 font-bold">
                          {log.key || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span className="text-white/40">{log.oldValue || "—"}</span>
                          <span className="text-white/20 mx-1.5">→</span>
                          <span className="text-emerald-400 font-bold">{log.newValue || "—"}</span>
                        </td>
                        <td className="py-2.5 px-3 text-white/50 max-w-xs truncate">
                          {log.reason || "—"}
                        </td>
                      </tr>
                    ))}
                    {configAuditHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-white/30">
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
      </div>
    </div>
  );
}
