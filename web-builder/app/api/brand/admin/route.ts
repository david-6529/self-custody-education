import { NextRequest, NextResponse } from "next/server";
import pool, { ensureBrandTables } from "@/lib/db";
import { put, del } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// GET /api/brand/admin — get all assets + stats
export async function GET() {
  await ensureBrandTables();

  const { rows: rawAssets } = await pool.query(
    "SELECT * FROM brand_assets ORDER BY category, created_at DESC"
  );
  const { rows: categories } = await pool.query(
    "SELECT * FROM brand_categories ORDER BY label"
  );

  // Normalize: always expose `categories` as an array
  const assets = rawAssets.map((r) => ({
    ...r,
    categories: r.categories ? JSON.parse(r.categories) : [r.category],
  }));

  // Count per category (using categories array if present, fallback to category)
  const countMap: Record<string, number> = {};
  assets.forEach((a) => {
    const cats: string[] = a.categories || [a.category];
    cats.forEach((cat: string) => {
      countMap[cat] = (countMap[cat] || 0) + 1;
    });
  });

  return NextResponse.json({
    assets,
    categories,
    counts: countMap,
    total: assets.length,
  });
}

// POST /api/brand/admin — upload assets (supports multiple files and multiple categories)
export async function POST(req: NextRequest) {
  const authFail = requireAdmin(req);
  if (authFail) return authFail;

  await ensureBrandTables();

  const formData = await req.formData();
  const category = formData.get("category") as string;
  const categoriesRaw = formData.get("categories") as string | null;

  if (!category) {
    return NextResponse.json({ error: "category required" }, { status: 400 });
  }

  // Parse categories (comma-separated or JSON array), default to [category]
  let categories: string[] = [category];
  if (categoriesRaw) {
    try {
      const parsed = JSON.parse(categoriesRaw);
      if (Array.isArray(parsed)) categories = parsed;
    } catch {
      categories = categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean);
    }
  }

  const uploaded: Record<string, unknown>[] = [];

  const entries = Array.from(formData.entries());
  for (const [key, value] of entries) {
    if (key === "category" || key === "categories") continue;
    if (!(value instanceof File) || value.size === 0) continue;

    if (!ALLOWED_MIME.has(value.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${value.type || "unknown"}` },
        { status: 400 }
      );
    }
    if (value.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File ${value.name} exceeds 10MB limit` },
        { status: 413 }
      );
    }

    const safeName = value.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(
      `brand-assets/${category}/${Date.now()}-${safeName}`,
      value,
      { access: "public", contentType: value.type }
    );

    const { rows } = await pool.query(
      `INSERT INTO brand_assets (filename, image_url, category, categories)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [value.name, blob.url, category, JSON.stringify(categories)]
    );
    uploaded.push(rows[0]);
  }

  return NextResponse.json({ uploaded, count: uploaded.length }, { status: 201 });
}

// PATCH /api/brand/admin — update asset category, categories, tags, filename,
// or swap image_url (used by the retroactive optimizer). When image_url is
// changed, the previous blob is deleted so we don't keep paying for it.
export async function PATCH(req: NextRequest) {
  const authFail = requireAdmin(req);
  if (authFail) return authFail;

  await ensureBrandTables();
  const { id, category, categories, tags, filename, image_url } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (category) {
    await pool.query("UPDATE brand_assets SET category = $1 WHERE id = $2", [category, id]);
  }
  if (Array.isArray(categories)) {
    // Also update the primary category to the first one for backward compat
    const primary = categories[0] || null;
    await pool.query(
      "UPDATE brand_assets SET categories = $1, category = COALESCE($2, category) WHERE id = $3",
      [JSON.stringify(categories), primary, id]
    );
  }
  if (tags !== undefined) {
    await pool.query("UPDATE brand_assets SET tags = $1 WHERE id = $2", [tags, id]);
  }
  if (filename) {
    await pool.query("UPDATE brand_assets SET filename = $1 WHERE id = $2", [filename, id]);
  }
  if (typeof image_url === "string" && image_url) {
    const { rows: prev } = await pool.query(
      "SELECT image_url FROM brand_assets WHERE id = $1",
      [id]
    );
    const oldUrl: string | undefined = prev[0]?.image_url;
    await pool.query("UPDATE brand_assets SET image_url = $1 WHERE id = $2", [image_url, id]);
    if (oldUrl && oldUrl !== image_url) {
      await del(oldUrl).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/brand/admin?id=...
export async function DELETE(req: NextRequest) {
  const authFail = requireAdmin(req);
  if (authFail) return authFail;

  await ensureBrandTables();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { rows } = await pool.query("SELECT image_url FROM brand_assets WHERE id = $1", [id]);
  if (rows[0]?.image_url) {
    await del(rows[0].image_url).catch(() => {});
  }

  await pool.query("DELETE FROM brand_assets WHERE id = $1", [id]);

  return NextResponse.json({ ok: true });
}
