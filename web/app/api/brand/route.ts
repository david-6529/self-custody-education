import { NextRequest, NextResponse } from "next/server";
import pool, { ensureBrandTables } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/brand?category=gifs — public endpoint for builders
export async function GET(req: NextRequest) {
  await ensureBrandTables();
  const category = req.nextUrl.searchParams.get("category");

  let query = "SELECT * FROM brand_assets";
  const params: string[] = [];

  if (category) {
    query += " WHERE category = $1";
    params.push(category);
  }

  query += " ORDER BY category, created_at DESC";

  const { rows } = await pool.query(query, params);

  const { rows: cats } = await pool.query(
    "SELECT * FROM brand_categories ORDER BY label"
  );

  return NextResponse.json({ assets: rows, categories: cats });
}
