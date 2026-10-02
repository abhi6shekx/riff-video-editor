/**
 * IndexedDB media store for Reel Editor clips, PIPs and audio.
 * Allows large video and image blobs to persist across tab reloads and HMR restarts.
 */

const DB_NAME = "riff_reel_media_db";
const STORE_NAME = "media_blobs";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to persist media in IndexedDB:", err);
  }
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to retrieve media from IndexedDB:", err);
    return null;
  }
}

export async function deleteMediaBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to delete media from IndexedDB:", err);
  }
}

/**
 * Creates a high quality sample gradient meme slide as a data URL
 * useful for instantaneous testing and broken clip recovery.
 */
export function createSampleSlideDataUrl(title = "RIFF VIRAL REEL", subtitle = "Drop your media or edit this slide"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f0c1b"/>
        <stop offset="40%" stop-color="#18132b"/>
        <stop offset="70%" stop-color="#2a1240"/>
        <stop offset="100%" stop-color="#0a0a0f"/>
      </linearGradient>
      <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d4ff00"/>
        <stop offset="100%" stop-color="#00f0ff"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="25" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="540" cy="800" r="320" fill="#d4ff00" opacity="0.08" filter="url(#glow)"/>
    <circle cx="800" cy="1200" r="280" fill="#00f0ff" opacity="0.06" filter="url(#glow)"/>
    <g transform="translate(540, 760)">
      <circle r="90" fill="#181824" stroke="#d4ff00" stroke-width="6"/>
      <polygon points="-25,-40 50,0 -25,40" fill="#d4ff00"/>
    </g>
    <text x="540" y="960" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="56" fill="url(#neon)" text-anchor="middle" letter-spacing="2">${title}</text>
    <text x="540" y="1030" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="28" fill="#a0a0b8" text-anchor="middle">${subtitle}</text>
    <rect x="340" y="1120" width="400" height="60" rx="30" fill="#d4ff00" opacity="0.15" stroke="#d4ff00" stroke-width="2"/>
    <text x="540" y="1160" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="22" fill="#d4ff00" text-anchor="middle" letter-spacing="1">⚡ POWERED BY RIFF STUDIO</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
