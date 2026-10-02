import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MemeCard } from "@/components/meme-card";
import { PersonMark } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  addPostComment,
  fetchPostById,
  fetchPostComments,
  type Comment,
  type Post,
} from "@/lib/services/posts";
import { playSound } from "@/lib/sounds";
import { useMeme, useMemes } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/m/$id")({
  component: MemePage,
  head: () => ({ meta: [{ title: "Riff · Details" }] }),
});

function MemePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const fallbackMeme = useMeme(id);
  const fallbackMemes = useMemes();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      fetchPostById(id, user?.id),
      fetchPostComments(id),
    ]).then(([p, c]) => {
      if (!active) return;
      setPost(p);
      setComments(c);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id, user?.id]);

  const displayedMeme = post || (fallbackMeme ? (fallbackMeme as unknown as Post) : null);
  const remixParent = fallbackMemes.find((m) => m.id === (post?.remix_parent_id || fallbackMeme?.parentId));
  const remixChildren = fallbackMemes.filter((m) => m.parentId === id);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    playSound("pop");
    const userId = user?.id || "00000000-0000-0000-0000-000000000000";
    const newC = await addPostComment(id, userId, text);
    if (newC) {
      setComments((prev) => [...prev, newC]);
    } else {
      setComments((prev) => [
        ...prev,
        {
          id: `c_${Date.now()}`,
          post_id: id,
          user_id: userId,
          content: text.trim(),
          created_at: new Date().toISOString(),
          author: {
            id: userId,
            username: "you",
            display_name: "You",
            avatar_url: "/memes/cat.jpg",
          },
        },
      ]);
    }
    setText("");
  }

  if (loading && !displayedMeme) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!displayedMeme) {
    return (
      <main className="p-8 text-center text-muted">
        Riff missing. <Link to="/" className="text-accent underline">Back to feed</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-3 pb-10">
      <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
        <Link to="/">
          <ChevronLeft className="size-4" />
          Feed
        </Link>
      </Button>

      <MemeCard meme={displayedMeme} />

      {remixParent ? (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Remixed from</h2>
          <MemeCard meme={remixParent as unknown as Post} compact />
        </section>
      ) : null}

      {remixChildren.length ? (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-semibold">Remix chain</h2>
          <div className="grid gap-4">
            {remixChildren.map((m) => (
              <MemeCard key={m.id} meme={m as unknown as Post} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Room notes ({comments.length})</h2>
        <ul className="mb-4 grid gap-3">
          {comments.length === 0 ? <li className="text-sm text-muted">No notes yet. Be the first to drop a note!</li> : null}
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <PersonMark mark="you" size="sm" />
              <div>
                <p className="text-sm">
                  <span className="font-medium">{c.author?.display_name || "Creator"}</span>{" "}
                  <span className="text-xs text-faint">{timeAgo(new Date(c.created_at).getTime())}</span>
                </p>
                <p className="text-sm text-muted">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={handleAddComment}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Leave a note..." />
          <Button type="submit" disabled={!text.trim()}>
            Send
          </Button>
        </form>
      </section>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/studio" search={{ remix: id }}>
            Remix this
          </Link>
        </Button>
      </div>
    </main>
  );
}
