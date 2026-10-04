export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string;
          role: "creator" | "brand" | "moderator" | "admin" | "super_admin" | "owner";
          is_verified: boolean;
          instagram_handle: string | null;
          instagram_verified: boolean;
          followers_count: number;
          following_count: number;
          campaigns_completed: number;
          total_earnings: number;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string;
          role?: "creator" | "brand" | "moderator" | "admin" | "super_admin" | "owner";
          is_verified?: boolean;
          instagram_handle?: string | null;
          instagram_verified?: boolean;
          followers_count?: number;
          following_count?: number;
          campaigns_completed?: number;
          total_earnings?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      brands: {
        Row: {
          id: string;
          owner_id: string;
          company_name: string;
          logo_url: string | null;
          website: string | null;
          description: string | null;
          verified: boolean;
          total_spend: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          company_name: string;
          logo_url?: string | null;
          website?: string | null;
          description?: string | null;
          verified?: boolean;
          total_spend?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["brands"]["Insert"]>;
      };
      communities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          avatar_url: string | null;
          cover_url: string | null;
          owner_id: string;
          members_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          owner_id: string;
          members_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["communities"]["Insert"]>;
      };
      community_members: {
        Row: {
          community_id: string;
          user_id: string;
          role: "member" | "moderator" | "admin";
          joined_at: string;
        };
        Insert: {
          community_id: string;
          user_id: string;
          role?: "member" | "moderator" | "admin";
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_members"]["Insert"]>;
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          community_id: string | null;
          caption: string;
          top_caption: string;
          bottom_caption: string;
          media_url: string;
          media_type: "meme" | "image" | "video" | "gif";
          thumbnail_url: string | null;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          saves_count: number;
          views_count: number;
          remix_parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          community_id?: string | null;
          caption?: string;
          top_caption?: string;
          bottom_caption?: string;
          media_url: string;
          media_type?: "meme" | "image" | "video" | "gif";
          thumbnail_url?: string | null;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          saves_count?: number;
          views_count?: number;
          remix_parent_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_likes"]["Insert"]>;
      };
      post_saves: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_saves"]["Insert"]>;
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_comments"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          brand_id: string;
          title: string;
          description: string;
          cover_url: string | null;
          objective: string;
          content_type: "meme" | "reel" | "ugc";
          total_budget: number;
          reward_per_creator: number;
          maximum_creators: number;
          slots_taken: number;
          deadline: string;
          guidelines_do: string[];
          guidelines_dont: string[];
          mandatory_hashtags: string[];
          mandatory_mentions: string[];
          status: "draft" | "published" | "paused" | "closed";
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          title: string;
          description: string;
          cover_url?: string | null;
          objective: string;
          content_type?: "meme" | "reel" | "ugc";
          total_budget: number;
          reward_per_creator: number;
          maximum_creators: number;
          slots_taken?: number;
          deadline: string;
          guidelines_do?: string[];
          guidelines_dont?: string[];
          mandatory_hashtags?: string[];
          mandatory_mentions?: string[];
          status?: "draft" | "published" | "paused" | "closed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      campaign_submissions: {
        Row: {
          id: string;
          campaign_id: string;
          creator_id: string;
          post_id: string | null;
          content_url: string;
          external_url: string | null;
          status: "pending" | "under_review" | "approved" | "rejected" | "paid";
          review_note: string | null;
          payout_amount: number;
          submitted_at: string;
          reviewed_at: string | null;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          creator_id: string;
          post_id?: string | null;
          content_url: string;
          external_url?: string | null;
          status?: "pending" | "under_review" | "approved" | "rejected" | "paid";
          review_note?: string | null;
          payout_amount?: number;
          submitted_at?: string;
          reviewed_at?: string | null;
          paid_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_submissions"]["Insert"]>;
      };
      wallets: {
        Row: {
          user_id: string;
          available_balance: number;
          pending_balance: number;
          lifetime_earnings: number;
          total_withdrawn: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          available_balance?: number;
          pending_balance?: number;
          lifetime_earnings?: number;
          total_withdrawn?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wallets"]["Insert"]>;
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "campaign_reward" | "bonus" | "referral" | "withdrawal" | "refund" | "adjustment";
          amount: number;
          reference_id: string | null;
          description: string;
          status: "pending" | "completed" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "campaign_reward" | "bonus" | "referral" | "withdrawal" | "refund" | "adjustment";
          amount: number;
          reference_id?: string | null;
          description: string;
          status?: "pending" | "completed" | "failed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wallet_transactions"]["Insert"]>;
      };
      withdrawals: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          payment_method: "upi" | "bank_transfer";
          payment_details: Json;
          status: "pending" | "processing" | "completed" | "rejected";
          admin_note: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          payment_method: "upi" | "bank_transfer";
          payment_details: Json;
          status?: "pending" | "processing" | "completed" | "rejected";
          admin_note?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["withdrawals"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: "like" | "comment" | "follow" | "submission_approved" | "submission_rejected" | "reward_paid" | "campaign_new" | "message";
          title: string;
          message: string;
          data: Json;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: "like" | "comment" | "follow" | "submission_approved" | "submission_rejected" | "reward_paid" | "campaign_new" | "message";
          title: string;
          message: string;
          data?: Json;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "post" | "comment" | "user" | "submission";
          target_id: string;
          reason: string;
          status: "pending" | "reviewed" | "dismissed" | "action_taken";
          action_taken: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "post" | "comment" | "user" | "submission";
          target_id: string;
          reason: string;
          status?: "pending" | "reviewed" | "dismissed" | "action_taken";
          action_taken?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversation_members"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          media_url: string | null;
          meme_id: string | null;
          sound_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          media_url?: string | null;
          meme_id?: string | null;
          sound_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_post_likes: {
        Args: { p_id: string };
        Returns: void;
      };
      decrement_post_likes: {
        Args: { p_id: string };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
