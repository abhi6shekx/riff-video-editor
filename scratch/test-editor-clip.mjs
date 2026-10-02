import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Pre-seed localStorage with a clip like in the user screenshot
  await page.addInitScript(() => {
    const draft = {
      id: "test-proj",
      name: "My RIFF Reel",
      updatedAt: Date.now(),
      clips: [
        {
          id: "clip-1",
          name: "ChatGPT Image Sep 28, 2026, 08_19_51 PM.png - Part 1",
          url: "blob:http://localhost:8080/non-existent-blob-url-1234",
          duration: 2,
          start: 0,
          end: 2,
          type: "image"
        }
      ],
      selectedClipId: "clip-1",
      speed: 1,
      muted: false,
      filter: "Normal",
      aspectRatio: "9:16",
      transition: "none",
      textLayers: [],
      pipLayers: [],
      audioTracks: []
    };
    localStorage.setItem("riff_active_reel_draft", JSON.stringify(draft));
  });

  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[PAGE ERROR] ${err.toString()}`));

  await page.goto("http://localhost:8080/reel-studio");
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "screenshots/dead-blob-simulation.png" });

  const previewHtml = await page.$eval(".aspect-\\[9\\/16\\]", el => el.outerHTML).catch(e => e.message);
  console.log("PREVIEW CONTAINER HTML:\n", previewHtml);

  await browser.close();
}

main().catch(console.error);
