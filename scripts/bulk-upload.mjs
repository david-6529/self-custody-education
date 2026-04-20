import fs from "fs";
import path from "path";

const BASE = "https://prompt-gallery-theta.vercel.app";

// First ensure the "badges" category exists
async function ensureBadgesCategory() {
  await fetch(`${BASE}/api/brand/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "badges", label: "Badges" }),
  });
  console.log("Ensured 'badges' category exists");
}

async function uploadBatch(files, category, label) {
  console.log(`\nUploading ${files.length} files to "${label}" (${category})...`);
  let uploaded = 0;
  let failed = 0;

  // Upload in batches of 3 to avoid timeouts
  for (let i = 0; i < files.length; i += 3) {
    const batch = files.slice(i, i + 3);
    const fd = new FormData();
    fd.append("category", category);

    for (let j = 0; j < batch.length; j++) {
      const filePath = batch[j];
      const buffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".gif": "image/gif",
        ".webp": "image/webp", ".svg": "image/svg+xml",
      };
      const blob = new Blob([buffer], { type: mimeTypes[ext] || "image/png" });
      fd.append(`file${j}`, blob, filename);
    }

    try {
      const res = await fetch(`${BASE}/api/brand/admin`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        uploaded += data.count || 0;
      } else {
        const err = await res.text();
        console.error(`  Batch ${i / 3 + 1} failed: ${err}`);
        failed += batch.length;
      }
    } catch (e) {
      console.error(`  Batch ${i / 3 + 1} error: ${e.message}`);
      failed += batch.length;
    }

    // Progress
    const total = Math.min(i + 3, files.length);
    process.stdout.write(`  ${total}/${files.length} processed\r`);
  }

  console.log(`  Done: ${uploaded} uploaded, ${failed} failed`);
}

async function main() {
  await ensureBadgesCategory();

  // 1. GIFs
  const gifDir = "/Users/bryan/Downloads/GVC CLI Assets/GIFs";
  const gifs = fs.readdirSync(gifDir)
    .filter(f => f.endsWith(".gif"))
    .map(f => path.join(gifDir, f));
  await uploadBatch(gifs, "gifs", "GIFs");

  // 2. Stills -> backgrounds
  const stillDir = "/Users/bryan/Downloads/GVC CLI Assets/Stills";
  const stills = fs.readdirSync(stillDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .map(f => path.join(stillDir, f));
  await uploadBatch(stills, "backgrounds", "Backgrounds");

  // 3. Badges
  const badgeDir = "/Users/bryan/gvc-builder-kit/assets/badges";
  const badges = fs.readdirSync(badgeDir)
    .filter(f => /\.(webp|png|jpg|svg)$/i.test(f))
    .map(f => path.join(badgeDir, f));
  await uploadBatch(badges, "badges", "Badges");

  // 4. Logos & Icons
  const logos = [
    "/Users/bryan/gvc-builder-kit/prompt-gallery/public/shaka.png",
    "/Users/bryan/gvc-builder-kit/prompt-gallery/public/gvc-logotype.svg",
  ];
  await uploadBatch(logos, "logos", "Logos & Icons");

  console.log("\nAll done!");
}

main().catch(console.error);
