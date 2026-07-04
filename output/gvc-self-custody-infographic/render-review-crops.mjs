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

const cropDir = path.join(__dirname, "review-crops");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gvc-review-crops-"));
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "gvc-review-chrome-"));
const imageUrl = pathToFileURL(path.join(__dirname, "gvc-self-custody-infographic.png")).href;

const crops = [
  { name: "01-hero-basics.png", y: 0, height: 820 },
  { name: "02-wallet-cards.png", y: 820, height: 1030 },
  { name: "03-stack-safety.png", y: 1850, height: 900 },
  { name: "04-footer.png", y: 2620, height: 380 },
];

fs.mkdirSync(cropDir, { recursive: true });

for (const crop of crops) {
  const htmlPath = path.join(tempDir, `${crop.name}.html`);
  const outputPath = path.join(cropDir, crop.name);

  fs.writeFileSync(htmlPath, `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      width: 1440px;
      height: ${crop.height}px;
      margin: 0;
      overflow: hidden;
      background: #050505;
    }

    img {
      position: absolute;
      left: 0;
      top: -${crop.y}px;
      width: 1440px;
      height: 3000px;
      display: block;
    }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="" />
</body>
</html>`);

  const result = spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-sync",
    "--hide-scrollbars",
    "--metrics-recording-only",
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    "--run-all-compositor-stages-before-draw",
    `--user-data-dir=${profileDir}`,
    `--window-size=1440,${crop.height}`,
    "--force-device-scale-factor=1",
    "--virtual-time-budget=1000",
    `--screenshot=${outputPath}`,
    pathToFileURL(htmlPath).href,
  ], {
    stdio: "inherit",
    timeout: 12000,
    killSignal: "SIGTERM",
  });

  const rendered = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 25000;

  if (result.status !== 0 && !rendered) {
    console.error(`Failed to render ${crop.name}.`);
    process.exit(result.status ?? 1);
  }

  console.log(`Rendered ${outputPath}`);
}
