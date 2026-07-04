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

const htmlPath = path.join(__dirname, "infographic.html");
const outputPath = path.join(__dirname, "gvc-self-custody-infographic.png");
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "gvc-infographic-chrome-"));
const htmlUrl = pathToFileURL(htmlPath).href;

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
  "--window-size=1440,3000",
  "--force-device-scale-factor=1",
  "--virtual-time-budget=1800",
  `--screenshot=${outputPath}`,
  htmlUrl,
], {
  stdio: "inherit",
  timeout: 30000,
  killSignal: "SIGTERM",
});

const rendered = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100000;

if (result.status !== 0 && !rendered) {
  console.error("Failed to render gvc-self-custody-infographic.png.");
  console.error(`Chrome status: ${result.status ?? "none"}, signal: ${result.signal ?? "none"}`);
  if (result.error) {
    console.error(result.error.message);
  }
  process.exit(result.status ?? 1);
}

console.log(`Rendered ${outputPath}`);
