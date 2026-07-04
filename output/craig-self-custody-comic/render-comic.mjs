import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const chromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));

if (!chrome) {
  console.error("Could not find Chrome, Chromium, or Edge in /Applications.");
  process.exit(1);
}

const htmlPath = path.join(__dirname, "comic.html");
const outputDir = path.join(__dirname, "pages");
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "craig-comic-chrome-"));
const htmlUrl = pathToFileURL(htmlPath).href;
const pageCount = 12;
const requestedPages = process.argv.slice(2).map((page) => Number(page)).filter((page) => Number.isInteger(page));
const pages = requestedPages.length ? requestedPages : Array.from({ length: pageCount }, (_, index) => index + 1);

fs.mkdirSync(outputDir, { recursive: true });

if (!requestedPages.length) {
  for (const file of fs.readdirSync(outputDir)) {
    const match = file.match(/^page-(\d{2})\.png$/);
    if (match && Number(match[1]) > pageCount) {
      fs.unlinkSync(path.join(outputDir, file));
    }
  }
}

for (const page of pages) {
  if (page < 1 || page > pageCount) {
    console.error(`Page ${page} is outside the 1-${pageCount} range.`);
    process.exit(1);
  }

  const pageName = `page-${String(page).padStart(2, "0")}.png`;
  const outputPath = path.join(outputDir, pageName);
  const result = spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-features=AutofillServerCommunication,InterestFeedContentSuggestions,MediaRouter,OptimizationHints,PaintHolding,Translate",
    "--disable-sync",
    "--hide-scrollbars",
    "--metrics-recording-only",
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    "--run-all-compositor-stages-before-draw",
    `--user-data-dir=${profileDir}`,
    "--window-size=1440,2160",
    "--force-device-scale-factor=1",
    "--virtual-time-budget=1800",
    `--screenshot=${outputPath}`,
    `${htmlUrl}?page=${page}`,
  ], {
    stdio: "inherit",
    timeout: 8000,
    killSignal: "SIGTERM",
  });

  const rendered = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100000;

  if (result.status !== 0 && !rendered) {
    console.error(`Failed to render ${pageName}.`);
    if (result.error) {
      console.error(result.error.message);
    }
    process.exit(result.status ?? 1);
  }

  if (result.signal && rendered) {
    console.log(`Rendered ${outputPath} after stopping Chrome (${result.signal}).`);
  } else {
    console.log(`Rendered ${outputPath}`);
  }
}

console.log(`Done. Rendered ${pages.length} page${pages.length === 1 ? "" : "s"} to ${outputDir}`);
