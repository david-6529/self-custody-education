import fs from "fs";
import path from "path";

const BASE = "https://prompt-gallery-theta.vercel.app";

async function uploadSingle(filePath, category) {
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".gif": "image/gif",
    ".webp": "image/webp", ".svg": "image/svg+xml",
  };

  const fd = new FormData();
  fd.append("category", category);
  const blob = new Blob([buffer], { type: mimeTypes[ext] || "image/png" });
  fd.append("file0", blob, filename);

  try {
    const res = await fetch(`${BASE}/api/brand/admin`, { method: "POST", body: fd });
    if (res.ok) {
      return true;
    } else {
      const txt = await res.text();
      if (txt.includes("TOO_LARGE")) {
        console.log(`  SKIP (too large): ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
      } else {
        console.log(`  FAIL: ${filename} - ${txt.slice(0, 80)}`);
      }
      return false;
    }
  } catch (e) {
    console.log(`  ERROR: ${filename} - ${e.message}`);
    return false;
  }
}

async function uploadDir(dir, category, label, filter) {
  const files = fs.readdirSync(dir)
    .filter(filter)
    .map(f => path.join(dir, f));

  console.log(`\nUploading ${files.length} files to "${label}" (one at a time)...`);
  let ok = 0, fail = 0;

  for (let i = 0; i < files.length; i++) {
    const success = await uploadSingle(files[i], category);
    if (success) ok++;
    else fail++;
    process.stdout.write(`  ${i + 1}/${files.length} (${ok} ok, ${fail} skipped)\r`);
  }
  console.log(`\n  Done: ${ok} uploaded, ${fail} skipped`);
}

async function main() {
  // GIFs
  await uploadDir(
    "/Users/bryan/Downloads/GVC CLI Assets/GIFs",
    "gifs", "GIFs",
    f => f.endsWith(".gif")
  );

  // Stills (only those not already uploaded - check for ones that failed)
  await uploadDir(
    "/Users/bryan/Downloads/GVC CLI Assets/Stills",
    "backgrounds", "Backgrounds",
    f => /\.(jpg|jpeg|png)$/i.test(f)
  );

  console.log("\nAll done!");
}

main().catch(console.error);
