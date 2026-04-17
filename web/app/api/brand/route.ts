import { NextRequest, NextResponse } from "next/server";
import pool, { ensureBrandTables } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/brand?category=gifs — public endpoint for builders
export async function GET(req: NextRequest) {
  await ensureBrandTables();
  const category = req.nextUrl.searchParams.get("category");

  // Fetch all; filter by category client-side-style using the JSON categories array
  let query = "SELECT * FROM brand_assets";
  const params: string[] = [];

  if (category) {
    // Match if primary category OR categories JSON array contains the slug
    query += " WHERE category = $1 OR categories LIKE $2";
    params.push(category, `%"${category}"%`);
  }

  query += " ORDER BY category, created_at DESC";

  const { rows } = await pool.query(query, params);

  // Normalize: always expose `categories` as an array on each asset
  const assets = rows.map((r) => ({
    ...r,
    categories: r.categories ? JSON.parse(r.categories) : [r.category],
  }));

  const { rows: cats } = await pool.query(
    "SELECT * FROM brand_categories ORDER BY label"
  );

  return NextResponse.json({ assets, categories: cats });
}
