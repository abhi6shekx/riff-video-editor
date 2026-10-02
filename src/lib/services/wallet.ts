import { supabase, isSupabaseConfigured } from "../supabase";
import type { Database } from "../database.types";
import { STARTER_TX } from "../seed";

export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletTransaction = Database["public"]["Tables"]["wallet_transactions"]["Row"];
export type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"] & {
  user?: {
    username: string;
    display_name: string;
  };
};

const DEMO_WALLET: Wallet = {
  user_id: "00000000-0000-0000-0000-000000000000",
  available_balance: 1240.0,
  pending_balance: 3600.0,
  lifetime_earnings: 4840.0,
  total_withdrawn: 0.0,
  updated_at: new Date().toISOString(),
};

const DEMO_TRANSACTIONS: WalletTransaction[] = STARTER_TX.map((tx) => ({
  id: tx.id,
  user_id: "00000000-0000-0000-0000-000000000000",
  type: "campaign_reward",
  amount: tx.amount,
  reference_id: null,
  description: tx.label,
  status: "completed",
  created_at: new Date(tx.at).toISOString(),
}));

import {
  getWalletData,
  getWalletTransactionsList,
  getWithdrawalsList,
  requestWithdrawalServerFn,
  reconcileWithdrawalServerFn,
} from "../riff-data";

export async function fetchWallet(userId: string): Promise<Wallet> {
  try {
    const data = await getWalletData({ data: { userId } });
    if (data) {
      return {
        user_id: data.user_id,
        available_balance: data.balance,
        pending_balance: data.pending_balance,
        lifetime_earnings: data.lifetime_earned,
        total_withdrawn: data.total_withdrawn,
        updated_at: new Date().toISOString(),
      };
    }
  } catch {}
  return DEMO_WALLET;
}

export async function fetchTransactions(userId: string): Promise<WalletTransaction[]> {
  try {
    const txs = await getWalletTransactionsList({ data: { userId } });
    if (txs && txs.length > 0) {
      return txs.map((t) => ({
        id: t.id,
        user_id: t.user_id,
        type: t.kind === "credit" ? ("campaign_reward" as const) : ("withdrawal" as const),
        amount: Number(t.amount),
        reference_id: t.reference_id,
        description: t.label,
        status: "completed",
        created_at: t.created_at,
      }));
    }
  } catch {}
  return DEMO_TRANSACTIONS;
}

export async function requestWithdrawal(input: {
  userId: string;
  amount: number;
  paymentMethod: "upi" | "bank_transfer";
  paymentDetails: { vpa?: string; account_number?: string; ifsc?: string; account_holder?: string };
}): Promise<{ success: boolean; error: string | null }> {
  if (input.amount < 100) {
    return { success: false, error: "Minimum withdrawal amount is ₹100." };
  }

  try {
    const res = await requestWithdrawalServerFn({
      data: {
        amount: input.amount,
        method: input.paymentMethod,
        details: input.paymentDetails,
      },
    });

    if (res && ("success" in res ? res.success : "ok" in res ? (res as any).ok : false)) {
      return { success: true, error: null };
    }
    return { success: false, error: "Withdrawal request failed." };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Withdrawal request failed" };
  }
}

export async function fetchWithdrawals(userId?: string): Promise<Withdrawal[]> {
  try {
    const list = await getWithdrawalsList({ data: { userId } });
    if (list && list.length > 0) {
      return list.map((w) => ({
        id: w.id,
        user_id: w.user_id,
        amount: Number(w.amount),
        payment_method: w.payment_method as any,
        payment_details: (typeof w.payment_details === "string" ? JSON.parse(w.payment_details) : w.payment_details) || {},
        status: w.status as any,
        idempotency_key: w.idempotency_key,
        admin_note: null,
        created_at: w.created_at,
        processed_at: w.processed_at,
        user: {
          username: "creator",
          display_name: "Creator",
        },
      }));
    }
  } catch {}
  return [];
}

export async function processWithdrawal(
  withdrawalId: string,
  status: "completed" | "rejected",
  adminNote?: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await reconcileWithdrawalServerFn({
      data: {
        withdrawalId,
        event: status === "completed" ? "transfer.processed" : "transfer.failed",
        reason: adminNote,
      },
    });

    if (res.status === "completed" || res.status === "failed") {
      return { success: true, error: null };
    }
    return { success: false, error: "Settlement failed" };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to process withdrawal" };
  }
}

