import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import pool, { ensureTable } from "@/lib/db";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_LEN = 4000;

function validateImage(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return `Unsupported file type: ${file.type || "unknown"}`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File ${file.name} exceeds 10MB limit`;
  }
  if (file.size === 0) {
    return "Empty file";
  }
  return null;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable();

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const prompt = formData.get("prompt") as string;
    const tokenId = formData.get("tokenId") as string;
    const xHandle = formData.get("xHandle") as string;
    const image = formData.get("image") as File;
    const moreDetails = formData.get("moreDetails") as string;

    if (!title || !prompt || !tokenId || !image) {
      return NextResponse.json(
        { error: "Missing required fields: title, prompt, tokenId, image" },
        { status: 400 }
      );
    }

    if (title.length > 200 || prompt.length > MAX_TEXT_LEN || (moreDetails && moreDetails.length > MAX_TEXT_LEN)) {
      return NextResponse.json({ error: "Input exceeds max length" }, { status: 400 });
    }

    const imageErr = validateImage(image);
    if (imageErr) {
      return NextResponse.json({ error: imageErr }, { status: 400 });
    }

    // Upload main image to Vercel Blob
    const blob = await put(
      `prompt-submissions/${Date.now()}-${sanitizeName(image.name)}`,
      image,
      { access: "public", contentType: image.type }
    );

    // Upload reference images if any (validated)
    const refUrls: string[] = [];
    for (let i = 0; i < 10; i++) {
      const refFile = formData.get(`refImage${i}`) as File | null;
      if (!refFile) break;
      const refErr = validateImage(refFile);
      if (refErr) {
        return NextResponse.json({ error: refErr }, { status: 400 });
      }
      const refBlob = await put(
        `prompt-submissions/ref-${Date.now()}-${sanitizeName(refFile.name)}`,
        refFile,
        { access: "public", contentType: refFile.type }
      );
      refUrls.push(refBlob.url);
    }

    // Insert into database
    const { rows } = await pool.query(
      `INSERT INTO prompt_submissions (title, prompt, token_id, image_url, x_handle, more_details, ref_images, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id, title, status, created_at`,
      [title, prompt, tokenId, blob.url, xHandle || null, moreDetails || null, refUrls.length > 0 ? JSON.stringify(refUrls) : null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: any) {
    console.error("Submission error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id, title, prompt, token_id, image_url, x_handle, status, category, generations, more_details, ref_images, requires_ref_images, created_at
       FROM prompt_submissions
       WHERE status = 'approved'
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
