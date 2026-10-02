import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Test 1: Seed with the broken draft identical to the user's screenshot
  await page.addInitScript(() => {
    const draft = {
      id: "test-user-broken-draft",
      name: "My RIFF Reel",
      updatedAt: Date.now(),
      clips: [
        {
          id: "clip-part-1",
          name: "ChatGPT Image Sep 28, 2026, 08_19_51 PM.png - Part 1",
          url: "blob:http://localhost:8080/c8734f68-7c87-43f6-9f79-c5c839d3752e",
          duration: 2,
          start: 0,
          end: 2,
          type: "image"
        }
      ],
      selectedClipId: "clip-part-1",
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

  await page.goto("http://localhost:8080/reel-studio", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Measure bounding rects
  const rects = await page.evaluate(() => {
    const frame = document.querySelector(".aspect-\\[9\\/16\\]");
    const photoBadge = document.querySelector(".bg-black\\/75");
    const watermark = document.querySelector(".pointer-events-none");
    const timelineCard = document.querySelector(".min-w-\\[210px\\], .min-w-\\[240px\\]");
    return {
      frame: frame ? frame.getBoundingClientRect() : null,
      photoBadge: photoBadge ? photoBadge.getBoundingClientRect() : null,
      watermark: watermark ? watermark.getBoundingClientRect() : null,
      timelineCard: timelineCard ? timelineCard.getBoundingClientRect() : null,
    };
  });

  console.log("RECTS:", JSON.stringify(rects, null, 2));

  await page.screenshot({ path: "screenshots/reel-fixed-recovery.png" });

  // Test 2: Click "Load Samples" or "+ Media"
  console.log("Clicking 'Samples' tool button...");
  await page.click("button:has-text('Samples')");
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "screenshots/reel-fixed-samples.png" });

  // Test 3: Check master play button
  console.log("Clicking 'Play Reel'...");
  await page.click("button:has-text('Play Reel')");
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "screenshots/reel-fixed-playing.png" });

  console.log("All tests completed successfully!");
  await browser.close();
}

main().catch(console.error);
