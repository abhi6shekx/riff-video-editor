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
                  toast.success(`Welcome back, ${payload.name || payload.email}!`);
                  void navigate({ to: "/" });
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

  // Real Google OAuth Popup trigger
  function handleGoogleOAuthPopup() {
    playSound("pop");

    if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
      setGoogleLoading(true);
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "email profile openid",
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setGoogleLoading(false);
              toast.error(`Google Sign-In error: ${tokenResponse.error}`);
              return;
            }

            if (tokenResponse?.access_token) {
              try {
                // Fetch actual user profile from Google UserInfo API
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await res.json();

                if (userInfo?.email) {
                  const { error } = await signInWithGoogle({
                    name: userInfo.name || userInfo.given_name || "Google User",
                    email: userInfo.email,
                    avatarUrl: userInfo.picture,
                  });
                  setGoogleLoading(false);
                  if (error) {
                    toast.error(`Google Sign-In failed: ${error}`);
                  } else {
                    playSound("cheer");
                    toast.success(`Welcome, ${userInfo.name || userInfo.email}!`);
                    void navigate({ to: "/" });
                  }
                  return;
                }
              } catch (err) {
                console.error("Failed to fetch Google profile:", err);
                toast.error("Could not retrieve Google profile.");
              }
            }
            setGoogleLoading(false);
          },
          error_callback: (err: any) => {
            setGoogleLoading(false);
            if (err?.type !== "popup_closed") {
              toast.error("Google sign-in was cancelled.");
            }
          },
        });

        // Opens actual Google accounts.google.com authentication popup
        client.requestAccessToken({ prompt: "select_account" });
      } catch (err) {
        setGoogleLoading(false);
        console.error("Google OAuth trigger failed:", err);
        if (window.google?.accounts?.id) {
          window.google.accounts.id.prompt();
        }
      }
    } else if (typeof window !== "undefined" && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast.error("Google Services is loading. Please try again in a few seconds.");
    }
  }

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

        {/* Real Google Interactive Button */}
        <button
          type="button"
          onClick={handleGoogleOAuthPopup}
          disabled={googleLoading}
          className="w-full max-w-[320px] flex items-center justify-center gap-3 py-3.5 px-5 rounded-full border border-gray-200 bg-white text-gray-800 font-bold text-sm shadow-md hover:bg-gray-50 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        >
          <svg className="size-5 shrink-0" viewBox="0 0 24 24">
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
          <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
        </button>

        {/* Fallback Google Identity Services rendered button */}
        <div ref={googleBtnContainerRef} className="flex justify-center min-h-[40px] empty:hidden" />

        <p className="text-[10px] text-muted leading-relaxed max-w-xs">
          By signing in, Google securely authenticates your identity. Passwordless, encrypted, and official.
        </p>
      </div>
    </main>
  );
}
