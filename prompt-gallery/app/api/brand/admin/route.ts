import { NextRequest, NextResponse } from "next/server";
import pool, { ensureTable } from "@/lib/db";
import { put, del } from "@vercel/blob";

// GET /api/brand/admin — get all assets + stats
export async function GET() {
  await ensureTable();

  const { rows: assets } = await pool.query(
    "SELECT * FROM brand_assets ORDER BY category, created_at DESC"
  );
  const { rows: categories } = await pool.query(
    "SELECT * FROM brand_categories ORDER BY label"
  );

  // Count per category
  const { rows: counts } = await pool.query(
    "SELECT category, COUNT(*) as count FROM brand_assets GROUP BY category"
  );
  const countMap: Record<string, number> = {};
  counts.forEach((r: any) => { countMap[r.category] = parseInt(r.count); });

  return NextResponse.json({
    assets,
    categories,
    counts: countMap,
    total: assets.length,
  });
}

// POST /api/brand/admin — upload assets (supports multiple files)
export async function POST(req: NextRequest) {
  await ensureTable();

  const formData = await req.formData();
  const category = formData.get("category") as string;

  if (!category) {
    return NextResponse.json({ error: "category required" }, { status: 400 });
  }

  const uploaded: any[] = [];

  // Process all file entries
  const entries = Array.from(formData.entries());
  for (const [key, value] of entries) {
    if (key === "category") continue;
    if (!(value instanceof File) || value.size === 0) continue;

    const blob = await put(
      `brand-assets/${category}/${Date.now()}-${value.name}`,
      value,
      { access: "public" }
    );

    const { rows } = await pool.query(
      `INSERT INTO brand_assets (filename, image_url, category)
       VALUES ($1, $2, $3) RETURNING *`,
      [value.name, blob.url, category]
    );
    uploaded.push(rows[0]);
  }

  return NextResponse.json({ uploaded, count: uploaded.length }, { status: 201 });
}

// PATCH /api/brand/admin — update asset category or tags
export async function PATCH(req: NextRequest) {
  await ensureTable();
  const { id, category, tags, filename } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (category) {
    await pool.query("UPDATE brand_assets SET category = $1 WHERE id = $2", [category, id]);
  }
  if (tags !== undefined) {
    await pool.query("UPDATE brand_assets SET tags = $1 WHERE id = $2", [tags, id]);
  }
  if (filename) {
    await pool.query("UPDATE brand_assets SET filename = $1 WHERE id = $2", [filename, id]);
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/brand/admin?id=...
export async function DELETE(req: NextRequest) {
  await ensureTable();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Get URL to delete from blob storage
  const { rows } = await pool.query("SELECT image_url FROM brand_assets WHERE id = $1", [id]);
  if (rows[0]?.image_url) {
    await del(rows[0].image_url).catch(() => {});
  }

  await pool.query("DELETE FROM brand_assets WHERE id = $1", [id]);

  return NextResponse.json({ ok: true });
}
