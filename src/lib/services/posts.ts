import { supabase, isSupabaseConfigured } from "../supabase";
import type { Database } from "../database.types";
import { MEMES, PEOPLE } from "../seed";

export type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  author?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  has_liked?: boolean;
  has_saved?: boolean;
};

export type Comment = Database["public"]["Tables"]["post_comments"]["Row"] & {
  author?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

// Seed fallback for unconfigured offline local preview
function getFallbackPosts(): Post[] {
  return MEMES.map((m) => {
    const author = PEOPLE.find((p) => p.id === m.authorId) || PEOPLE[0];
    return {
      id: m.id,
      user_id: author.id,
      community_id: m.hubId || null,
      caption: "",
      top_caption: m.top,
      bottom_caption: m.bottom,
      media_url: m.image,
      media_type: "meme",
      thumbnail_url: null,
      likes_count: m.likes,
      comments_count: m.comments,
      shares_count: m.remixes,
      saves_count: 12,
      views_count: m.likes * 4 + 100,
      remix_parent_id: m.parentId || null,
      created_at: new Date(m.createdAt).toISOString(),
      author: {
        id: author.id,
        username: author.handle,
        display_name: author.name,
        avatar_url: `/avatars/${author.mark}.jpg`,
        is_verified: author.role === "brand",
      },
      has_liked: false,
      has_saved: false,
    };
  });
}

import { getFeedPosts, createPost as serverCreatePost } from "../riff-data";

export async function fetchFeed({
  tab = "for-you",
  query = "",
  userId,
  limit = 20,
  offset = 0,
}: {
  tab?: "for-you" | "hot" | "new" | "following";
  query?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<Post[]> {
  // Always query real posts from PostgreSQL first
  let liveDbPosts: Post[] = [];
  try {
    const dbRows = await getFeedPosts({ data: { limit, offset } });
    if (dbRows && dbRows.length > 0) {
      liveDbPosts = dbRows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        community_id: r.hub_id,
        caption: "",
        top_caption: r.top_text || "",
        bottom_caption: r.bottom_text || "",
        media_url: r.image_url,
        media_type: "meme",
        thumbnail_url: null,
        likes_count: 12,
        comments_count: 0,
        shares_count: 1,
        saves_count: 2,
        views_count: 48,
        remix_parent_id: r.parent_id,
        created_at: r.created_at,
        author: {
          id: r.user_id,
          username: r.user_id === "you" || r.user_id === "dev-user" ? "you" : "creator",
          display_name: r.user_id === "you" || r.user_id === "dev-user" ? "You" : "Creator",
          avatar_url: "/avatars/you.jpg",
          is_verified: false,
        },
        has_liked: false,
        has_saved: false,
      }));
    }
  } catch {}

  let posts = [...liveDbPosts, ...getFallbackPosts()];
  if (tab === "hot") posts.sort((a, b) => b.likes_count - a.likes_count);
  if (tab === "new") posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (query) {
    const q = query.toLowerCase();
    posts = posts.filter(
      (p) =>
        p.top_caption.toLowerCase().includes(q) ||
        p.bottom_caption.toLowerCase().includes(q) ||
        p.author?.display_name.toLowerCase().includes(q),
    );
  }
  return posts.slice(offset, offset + limit);
}

export async function fetchPostById(id: string, userId?: string): Promise<Post | null> {
  if (!isSupabaseConfigured) {
    const post = getFallbackPosts().find((p) => p.id === id);
    return post ?? null;
  }

  try {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        author:profiles(id, username, display_name, avatar_url, is_verified)
      `)
      .eq("id", id)
      .single();

    if (error || !data) return null;

    let has_liked = false;
    let has_saved = false;
    if (userId) {
      const [{ data: like }, { data: save }] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", userId).eq("post_id", id).maybeSingle(),
        supabase.from("post_saves").select("post_id").eq("user_id", userId).eq("post_id", id).maybeSingle(),
      ]);
      has_liked = Boolean(like);
      has_saved = Boolean(save);
    }

    return { ...(data as any), has_liked, has_saved } as Post;
  } catch {
    return null;
  }
}

export async function createPost(input: {
  userId: string;
  mediaUrl: string;
  topCaption?: string;
  bottomCaption?: string;
  caption?: string;
  mediaType?: "meme" | "image" | "video" | "gif";
  communityId?: string;
  remixParentId?: string;
}): Promise<{ post: Post | null; error: string | null }> {
  try {
    const postId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const res = await serverCreatePost({
      data: {
        id: postId,
        image: input.mediaUrl,
        top: input.topCaption || input.caption || "",
        bottom: input.bottomCaption || "",
        hubId: input.communityId,
        parentId: input.remixParentId,
      },
    });

    const createdPost: Post = {
      id: res.id || postId,
      user_id: input.userId,
      community_id: input.communityId || null,
      caption: input.caption || "",
      top_caption: input.topCaption || "",
      bottom_caption: input.bottomCaption || "",
      media_url: input.mediaUrl,
      media_type: input.mediaType || "meme",
      thumbnail_url: null,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      saves_count: 0,
      views_count: 1,
      remix_parent_id: input.remixParentId || null,
      created_at: new Date().toISOString(),
      author: {
        id: input.userId,
        username: "you",
        display_name: "You",
        avatar_url: "/avatars/you.jpg",
        is_verified: false,
      },
    };

    return { post: createdPost, error: null };
  } catch (err: unknown) {
    return { post: null, error: err instanceof Error ? err.message : "Failed to create post" };
  }
}

export async function toggleLikePost(postId: string, userId: string, currentlyLiked: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return !currentlyLiked;
  try {
    if (currentlyLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
      try {
        await supabase.rpc("decrement_post_likes", { p_id: postId });
      } catch {}
      return false;
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
      try {
        await supabase.rpc("increment_post_likes", { p_id: postId });
      } catch {}
      return true;
    }
  } catch {
    return !currentlyLiked;
  }
}

export async function toggleSavePost(postId: string, userId: string, currentlySaved: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return !currentlySaved;
  try {
    if (currentlySaved) {
      await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", userId);
      return false;
    } else {
      await supabase.from("post_saves").insert({ post_id: postId, user_id: userId });
      return true;
    }
  } catch {
    return !currentlySaved;
  }
}

export async function fetchPostComments(postId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await supabase
      .from("post_comments")
      .select(`
        *,
        author:profiles(id, username, display_name, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    return (data as unknown as Comment[]) || [];
  } catch {
    return [];
  }
}

export async function addPostComment(postId: string, userId: string, content: string): Promise<Comment | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: userId, content: content.trim() })
      .select(`
        *,
        author:profiles(id, username, display_name, avatar_url)
      `)
      .single();

    if (error || !data) return null;
    return data as unknown as Comment;
  } catch {
    return null;
  }
}

export async function reportContent(input: {
  reporterId: string;
  targetType: "post" | "comment" | "user" | "submission";
  targetId: string;
  reason: string;
}): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) return { success: true, error: null };
  try {
    const { error } = await supabase.from("reports").insert({
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
    } as any);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Report failed" };
  }
}
