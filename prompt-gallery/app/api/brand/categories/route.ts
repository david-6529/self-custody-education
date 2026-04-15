import { NextRequest, NextResponse } from "next/server";
import pool, { ensureTable } from "@/lib/db";

// GET — list brand categories
export async function GET() {
  await ensureTable();
  const { rows } = await pool.query("SELECT * FROM brand_categories ORDER BY label");
  return NextResponse.json(rows);
}

// POST — create a new brand category
export async function POST(req: NextRequest) {
  await ensureTable();
  const { slug, label } = await req.json();
  if (!slug || !label) {
    return NextResponse.json({ error: "slug and label required" }, { status: 400 });
  }
  const { rows } = await pool.query(
    "INSERT INTO brand_categories (slug, label) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING RETURNING *",
    [slug, label]
  );
  return NextResponse.json(rows[0] || { slug, label }, { status: 201 });
}

// DELETE — remove a brand category
export async function DELETE(req: NextRequest) {
  await ensureTable();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await pool.query("DELETE FROM brand_categories WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
