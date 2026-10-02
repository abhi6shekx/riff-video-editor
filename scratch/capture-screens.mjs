import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("./screenshots", { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Open home page
  await page.goto("http://127.0.0.1:8080", { waitUntil: "networkidle" });
  
  // Click 'Skip to feed' if visible
  const skipBtn = await page.$("text=Skip to feed");
  if (skipBtn) {
    await skipBtn.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: "./screenshots/01-feed.png" });

  // 2. Open Briefs
  await page.goto("http://127.0.0.1:8080/briefs", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./screenshots/02-briefs.png" });

  // 3. Open Studio
  await page.goto("http://127.0.0.1:8080/studio", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./screenshots/03-studio.png" });

  // 4. Open Wallet / Profile (You)
  await page.goto("http://127.0.0.1:8080/you", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./screenshots/04-you.png" });

  // 5. Open Admin Panel
  await page.goto("http://127.0.0.1:8080/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./screenshots/05-admin.png" });

  await browser.close();
  console.log("Screenshots captured successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
