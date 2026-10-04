import "@/lib/uuid";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppFrame } from "@/components/app-frame";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "RIFF";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "RIFF · Social First Creator Feed" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { name: "theme-color", content: "#080808" },
      {
        name: "description",
        content: "Chat in memes. Remix culture. Get paid when brands want in.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
    ],
    scripts: [
      { src: "https://accounts.google.com/gsi/client", async: true, defer: true },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("riff_active_theme")||"dark";document.documentElement.setAttribute("data-theme",t);if(t==="light"){document.documentElement.classList.add("light");document.documentElement.classList.remove("dark");}else{document.documentElement.classList.add("dark");document.documentElement.classList.remove("light");}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <TooltipProvider delayDuration={250}>
            <AppFrame>
              <Outlet />
            </AppFrame>
            <PwaInstallBanner />
            <Toaster
              theme="dark"
              position="top-center"
              toastOptions={{
                style: {
                  background: "var(--color-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-fg)",
                },
              }}
            />
          </TooltipProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
