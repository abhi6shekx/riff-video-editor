import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const logs = [];
  page.on("console", (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    logs.push(`[PAGE ERROR] ${err.toString()}`);
  });

  await page.goto("http://localhost:8080/reel-studio", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "screenshots/reel-studio-test.png" });

  console.log("LOGS:");
  console.log(logs.join("\n"));

  await browser.close();
}

main().catch(console.error);
