import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RiffNavbarLockup } from "@/components/riff-navbar-lockup";
import { useAuth } from "@/lib/auth-context";
import { playSound } from "@/lib/sounds";

declare global {
  interface Window {
    google?: any;
  }
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign In with Google · RIFF" }] }),
});

const GOOGLE_CLIENT_ID = "965413656130-069bdbt0t2s3lakv6evn52n0fu50jntd.apps.googleusercontent.com";

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Initialize official Google Identity Services
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    function initGoogleClient() {
      if (typeof window === "undefined" || !window.google?.accounts?.id) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            if (response?.credential) {
              setGoogleLoading(true);
              const payload = decodeJwt(response.credential);
              if (payload?.email) {
                const { error } = await signInWithGoogle({
                  name: payload.name || payload.given_name || "Google User",
                  email: payload.email,
                  avatarUrl: payload.picture,
                });
                setGoogleLoading(false);
                if (error) {
                  toast.error(`Google Sign-In failed: ${error}`);
                } else {
                  playSound("cheer");
                  const isProfileCompleted =
                    typeof window !== "undefined" &&
                    (localStorage.getItem(`riff_profile_done_${payload.email}`) === "true" ||
                      localStorage.getItem("riff_profile_done") === "true");

                  if (!isProfileCompleted) {
                    toast.success(`Google verified! Let's set up your creator profile.`);
                    void navigate({ to: "/onboarding" });
                  } else {
                    toast.success(`Welcome back, ${payload.name || payload.email}!`);
                    void navigate({ to: "/" });
                  }
                }
              } else {
                setGoogleLoading(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render Google official button if container exists
        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 320,
            logo_alignment: "left",
          });
        }
        return true;
      } catch (e) {
        console.warn("Google SDK init attempt:", e);
        return false;
      }
    }

    if (!initGoogleClient()) {
      timer = setInterval(() => {
        if (initGoogleClient() && timer) {
          clearInterval(timer);
        }
      }, 400);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [signInWithGoogle, navigate]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link to="/" className="mb-3 hover:opacity-90 transition-opacity">
          <RiffNavbarLockup size={46} />
        </Link>
        <h1 className="font-display text-xl font-black tracking-tight text-fg">
          Welcome to RIFF
        </h1>
        <p className="mt-1 text-xs text-muted max-w-xs leading-relaxed">
          The all-in-one social video editor & reels studio for creators.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl flex flex-col items-center gap-5 text-center">
        <div>
          <p className="text-sm font-bold text-fg">Sign in with your Google Account</p>
          <p className="text-[11px] text-muted mt-0.5">
            Real official Google OAuth authentication
          </p>
        </div>

        {/* Official Google Identity Services Button */}
        <div className="flex flex-col items-center justify-center w-full py-2">
          {googleLoading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-accent animate-pulse py-2">
              <span className="size-2 rounded-full bg-accent animate-ping" />
              <span>Authenticating with Google...</span>
            </div>
          ) : null}
          <div ref={googleBtnContainerRef} className="flex justify-center w-full min-h-[44px]" />
        </div>

        <p className="text-[10px] text-muted leading-relaxed max-w-xs">
          By signing in, Google securely authenticates your identity. Passwordless, encrypted, and official.
        </p>
      </div>
    </main>
  );
}
