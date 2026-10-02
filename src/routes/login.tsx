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
  const { signIn, signInWithGoogle, signUp, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  const [instagram, setInstagram] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    playSound("pop");
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(`Google Sign-In failed: ${error}`);
      } else {
        playSound("cheer");
        toast.success("Signed in with Google!");
        void navigate({ to: "/" });
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleQuickDemo(demoRole: "creator" | "brand") {
    setLoading(true);
    playSound("pop");
    try {
      await signIn(demoRole === "creator" ? "creator@riff.app" : "brand@nova.com", "demo123");
      playSound("cheer");
      toast.success(`Logged in as demo ${demoRole}!`);
      void navigate({ to: "/" });
    } finally {
      setLoading(false);
    }
  }

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
            ? "Sign in to access your creator wallet and video feed"
            : "Join as a creator or brand to start earning and launching campaigns"}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-5">
        {/* Google 1-Tap Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border bg-white text-gray-900 font-semibold text-sm shadow-sm hover:bg-gray-50 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{googleLoading ? "Connecting..." : "Continue with Google"}</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-surface px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            or with email
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-raised p-1 text-xs font-medium">
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

        {/* Quick Demo Access */}
        <div className="pt-2 border-t border-border flex flex-col gap-2">
          <p className="text-[11px] text-center text-muted font-medium">Quick 1-Tap Demo Access</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("creator")}
              className="py-2 px-3 rounded-xl border border-border bg-raised hover:bg-raised/80 text-[11px] font-semibold text-fg transition-colors"
            >
              Demo Creator 🎬
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("brand")}
              className="py-2 px-3 rounded-xl border border-border bg-raised hover:bg-raised/80 text-[11px] font-semibold text-fg transition-colors"
            >
              Demo Brand 🏢
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
