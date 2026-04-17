import { NextRequest, NextResponse } from "next/server";
import pool, { ensureBrandTables } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureBrandTables();
  const { rows } = await pool.query("SELECT * FROM brand_categories ORDER BY label");
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authFail = requireAdmin(req);
  if (authFail) return authFail;

  await ensureBrandTables();
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

export async function PATCH(req: NextRequest) {
  const authFail = requireAdmin(req);
  if (authFail) return authFail;

  await ensureBrandTables();
  const { id, slug, label } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (slug) {
    const { rows } = await pool.query("SELECT slug FROM brand_categories WHERE id = $1", [id]);
    if (rows[0]) {
      await pool.query("UPDATE brand_assets SET category = $1 WHERE category = $2", [slug, rows[0].slug]);
    }
    await pool.query("UPDATE brand_categories SET slug = $1 WHERE id = $2", [slug, id]);
  }
  if (label) {
    await pool.query("UPDATE brand_categories SET label = $1 WHERE id = $2", [label, id]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authFail = requireAdmin(req);
  if (authFail) return authFail;

  await ensureBrandTables();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await pool.query("DELETE FROM brand_categories WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
