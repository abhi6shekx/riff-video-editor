import { supabase, isSupabaseConfigured } from "../supabase";
import type { Database } from "../database.types";
import { CHATS, HUBS, MESSAGES, YOU_ID } from "../seed";

export type Community = Database["public"]["Tables"]["communities"]["Row"] & {
  is_member?: boolean;
};

export type Conversation = {
  id: string;
  name: string;
  subtitle: string;
  avatar_url?: string;
  last_message?: string;
  last_at: string;
  unread_count: number;
};

export type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  sender?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

function getFallbackCommunities(): Community[] {
  return HUBS.map((h) => ({
    id: h.id,
    name: h.name,
    slug: h.id,
    description: h.bio,
    avatar_url: h.cover,
    cover_url: h.cover,
    owner_id: "00000000-0000-0000-0000-000000000000",
    members_count: h.members,
    created_at: new Date().toISOString(),
    is_member: true,
  }));
}

export async function fetchCommunities(userId?: string): Promise<Community[]> {
  if (!isSupabaseConfigured) return getFallbackCommunities();

  try {
    const { data } = await supabase
      .from("communities")
      .select("*")
      .order("members_count", { ascending: false });

    if (!data || data.length === 0) return getFallbackCommunities();

    let joinedIds: string[] = [];
    if (userId) {
      const { data: members } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);
      joinedIds = (members as any[])?.map((m) => m.community_id) ?? [];
    }

    return (data as any[]).map((c) => ({
      ...c,
      is_member: joinedIds.includes(c.id),
    }));
  } catch {
    return getFallbackCommunities();
  }
}

export async function toggleCommunityMembership(
  communityId: string,
  userId: string,
  currentlyJoined: boolean,
): Promise<boolean> {
  if (!isSupabaseConfigured) return !currentlyJoined;

  try {
    if (currentlyJoined) {
      await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", userId);
      return false;
    } else {
      await supabase.from("community_members").insert({
        community_id: communityId,
        user_id: userId,
      } as any);
      return true;
    }
  } catch {
    return !currentlyJoined;
  }
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  if (!isSupabaseConfigured) {
    return [
      {
        id: "notif_1",
        user_id: userId,
        actor_id: null,
        type: "submission_approved",
        title: "Campaign Approved! 🎉",
        message: "Your submission for 'Make the teal-bone colorway feel inevitable' was approved. ₹2,400 credited.",
        data: {},
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "notif_2",
        user_id: userId,
        actor_id: null,
        type: "like",
        title: "New Likes on your Riff 🔥",
        message: "Kabir Lane and 42 others liked your riff.",
        data: {},
        is_read: true,
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  }

  try {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return (data as unknown as Notification[]) || [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured) {
    return CHATS.map((c) => ({
      id: c.id,
      name: c.name,
      subtitle: c.subtitle,
      avatar_url: `/avatars/${c.mark}.jpg`,
      last_message: c.lastMessage,
      last_at: new Date(c.lastAt).toISOString(),
      unread_count: c.unread,
    }));
  }

  try {
    const { data } = await supabase
      .from("conversation_members")
      .select(`
        conversation_id,
        conversation:conversations(
          id,
          updated_at,
          messages:messages(content, created_at, sender:profiles(display_name))
        )
      `)
      .eq("user_id", userId);

    if (!data || data.length === 0) {
      return CHATS.map((c) => ({
        id: c.id,
        name: c.name,
        subtitle: c.subtitle,
        avatar_url: `/avatars/${c.mark}.jpg`,
        last_message: c.lastMessage,
        last_at: new Date(c.lastAt).toISOString(),
        unread_count: c.unread,
      }));
    }

    return data.map((item: any) => {
      const conv = item.conversation;
      const lastMsg = conv?.messages?.[conv.messages.length - 1];
      return {
        id: conv.id,
        name: "Community Room",
        subtitle: lastMsg ? `${lastMsg.sender?.display_name}: ${lastMsg.content}` : "Active room",
        last_message: lastMsg?.content || "No messages yet",
        last_at: lastMsg?.created_at || conv.updated_at,
        unread_count: 0,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (!isSupabaseConfigured) {
    return MESSAGES.filter((m) => m.chatId === conversationId).map((m) => ({
      id: m.id,
      conversation_id: m.chatId,
      sender_id: m.authorId,
      content: m.text || (m.kind === "meme" ? "Sent a meme" : "Played a sound"),
      media_url: null,
      meme_id: m.memeId ? ("00000000-0000-0000-0000-000000000000" as any) : null,
      sound_id: m.soundId || null,
      created_at: new Date(m.createdAt).toISOString(),
      sender: {
        username: m.authorId === YOU_ID ? "you" : m.authorId,
        display_name: m.authorId === YOU_ID ? "You" : m.authorId,
        avatar_url: `/avatars/${m.authorId}.jpg`,
      },
    }));
  }

  try {
    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles(username, display_name, avatar_url)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return (data as unknown as Message[]) || [];
  } catch {
    return [];
  }
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
  memeId?: string;
  soundId?: string;
}): Promise<Message | null> {
  if (!isSupabaseConfigured) {
    return {
      id: `msg_${Date.now()}`,
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      content: input.content,
      media_url: input.mediaUrl || null,
      meme_id: input.memeId || null,
      sound_id: input.soundId || null,
      created_at: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        content: input.content,
        media_url: input.mediaUrl || null,
        meme_id: input.memeId || null,
        sound_id: input.soundId || null,
      } as any)
      .select(`
        *,
        sender:profiles(username, display_name, avatar_url)
      `)
      .single();

    if (error || !data) return null;
    return data as unknown as Message;
  } catch {
    return null;
  }
}
