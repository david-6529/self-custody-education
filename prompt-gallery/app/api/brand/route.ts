import { NextRequest, NextResponse } from "next/server";
import pool, { ensureTable } from "@/lib/db";

// GET /api/brand?category=gifs — public endpoint for builders
export async function GET(req: NextRequest) {
  await ensureTable();
  const category = req.nextUrl.searchParams.get("category");

  let query = "SELECT * FROM brand_assets";
  const params: string[] = [];

  if (category) {
    query += " WHERE category = $1";
    params.push(category);
  }

  query += " ORDER BY category, created_at DESC";

  const { rows } = await pool.query(query, params);

  // Also return available categories
  const { rows: cats } = await pool.query(
    "SELECT * FROM brand_categories ORDER BY label"
  );

  return NextResponse.json({ assets: rows, categories: cats });
}
