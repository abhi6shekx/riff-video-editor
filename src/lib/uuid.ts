/**
 * Safe UUID generator that works in all environments:
 * - Node.js
 * - Secure HTTPS browser contexts
 * - Insecure HTTP contexts (such as local IP access http://192.168.x.x:8080 on mobile devices)
 */
export function safeRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to manual generator
    }
  }

  // RFC4122 version 4 compliant fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Polyfill window.crypto.randomUUID if in browser and missing (e.g. HTTP on local network)
if (typeof window !== "undefined") {
  try {
    if (!window.crypto) {
      (window as unknown as { crypto: Record<string, unknown> }).crypto = {};
    }
    if (typeof window.crypto.randomUUID !== "function") {
      Object.defineProperty(window.crypto, "randomUUID", {
        value: safeRandomUUID,
        writable: true,
        configurable: true,
      });
    }
  } catch {
    // If window.crypto is sealed or read-only, safeRandomUUID import directly handles it
  }
}
