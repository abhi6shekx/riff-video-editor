import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
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

  // Google Account Chooser Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleNameInput, setGoogleNameInput] = useState("");
  const [googleEmailInput, setGoogleEmailInput] = useState("");

  function openGoogleAuth() {
    playSound("pop");
    setShowGoogleModal(true);
  }

  async function handleGoogleSignIn(customInfo?: { email: string; name: string }) {
    setGoogleLoading(true);
    playSound("pop");
    try {
      const { error } = await signInWithGoogle(customInfo);
      if (error) {
        toast.error(`Google Sign-In failed: ${error}`);
      } else {
        playSound("cheer");
        toast.success(`Signed in as ${customInfo?.name || "Google User"}!`);
        setShowGoogleModal(false);
        void navigate({ to: "/" });
      }
    } finally {
      setGoogleLoading(false);
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
          onClick={openGoogleAuth}
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

      </div>

      {/* Google Account Chooser Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-white text-gray-900 shadow-2xl p-6 border border-gray-100 flex flex-col gap-4">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* Google Header */}
            <div className="flex flex-col items-center text-center gap-1.5 pt-1">
              <svg className="size-8" viewBox="0 0 24 24">
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
              <h3 className="text-base font-bold text-gray-900 mt-1">Sign in with Google</h3>
              <p className="text-xs text-gray-500">to continue to <strong className="text-gray-700">RIFF Video Studio</strong></p>
            </div>

            {/* Account Card (Shown when details entered) */}
            {(googleNameInput.trim() || googleEmailInput.trim()) && (
              <div className="border border-gray-200 rounded-2xl p-3.5 flex items-center gap-3 bg-gray-50/70 transition-colors">
                <div className="size-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {((googleNameInput.trim()[0] || googleEmailInput.trim()[0] || "U")).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {googleNameInput.trim() || "Google Creator"}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {googleEmailInput.trim() || "creator@gmail.com"}
                  </p>
                </div>
                <div className="size-2 rounded-full bg-emerald-500 shrink-0" title="Ready" />
              </div>
            )}

            {/* Google Account Inputs */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-[11px] font-semibold text-gray-600">
                Enter your Google Account
              </label>
              <input
                type="text"
                value={googleNameInput}
                onChange={(e) => setGoogleNameInput(e.target.value)}
                placeholder="Full Name (e.g. Rahul Sharma)"
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 text-gray-800 bg-white"
              />
              <input
                type="email"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="Google Email (e.g. yourname@gmail.com)"
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 text-gray-800 bg-white"
              />
            </div>

            {/* Privacy / Security Notice */}
            <p className="text-[10px] text-gray-400 leading-relaxed text-center">
              Google will securely share your name, email address, and profile picture with RIFF.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleGoogleSignIn({
                    name: googleNameInput.trim() || "Google Creator",
                    email: googleEmailInput.trim() || "creator@gmail.com",
                  })
                }
                disabled={googleLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {googleLoading
                  ? "Signing in..."
                  : googleNameInput.trim()
                    ? `Continue as ${googleNameInput.trim().split(" ")[0]}`
                    : "Continue with Google"}
              </button>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-full py-2 rounded-xl text-gray-500 hover:text-gray-800 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
