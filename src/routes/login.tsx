import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { RiffNavbarLockup } from "@/components/riff-navbar-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign In · RIFF" }] }),
});

function LoginPage() {
  const { signIn, signUp, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  const [instagram, setInstagram] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    playSound("pop");

    if (mode === "login") {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      playSound("cheer");
      toast.success("Welcome back to RIFF!");
      void navigate({ to: "/" });
    } else {
      if (!username.trim() || !displayName.trim()) {
        setLoading(false);
        toast.error("Please provide both a display name and username.");
        return;
      }
      const { error } = await signUp(email, password, {
        displayName,
        username: username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
        role,
        instagramHandle: instagram.replace(/^@/, "").trim(),
      });
      setLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      playSound("cheer");
      toast.success("Account created successfully!");
      void navigate({ to: "/" });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link to="/" className="mb-3 hover:opacity-90 transition-opacity">
          <RiffNavbarLockup size={42} />
        </Link>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Sign in to access your creator wallet and feed"
            : "Join as a creator or brand to start earning and launching campaigns"}
        </p>
      </div>

      {!isConfigured ? (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <p className="font-semibold">Supabase Environment Notice</p>
          <p className="mt-1 text-muted">
            Add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> to connect live authentication.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-raised p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={cn(
              "rounded-lg py-2 transition",
              mode === "login" ? "bg-primary text-primary-fg shadow-xs" : "text-muted hover:text-fg",
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={cn(
              "rounded-lg py-2 transition",
              mode === "signup" ? "bg-primary text-primary-fg shadow-xs" : "text-muted hover:text-fg",
            )}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("creator")}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-medium transition",
                      role === "creator" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted",
                    )}
                  >
                    Creator / Memer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("brand")}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-medium transition",
                      role === "brand" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted",
                    )}
                  >
                    Brand / Agency
                  </button>
                </div>
              </div>

              <label className="block text-xs font-medium text-muted">
                Display Name
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Aanya Rao or Nova Brands"
                  className="mt-1"
                />
              </label>

              <label className="block text-xs font-medium text-muted">
                Username
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. aanya_riff"
                  className="mt-1"
                />
              </label>

              {role === "creator" ? (
                <label className="block text-xs font-medium text-muted">
                  Instagram Handle (Optional)
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@aanya.reels"
                    className="mt-1"
                  />
                </label>
              ) : null}
            </>
          ) : null}

          <label className="block text-xs font-medium text-muted">
            Email Address
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </label>

          <label className="block text-xs font-medium text-muted">
            Password
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </label>

          <Button type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Register"}
          </Button>
        </form>
      </div>
    </main>
  );
}
