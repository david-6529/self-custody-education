import { NextResponse } from "next/server";
import pool, { GVC_IMAGE_FILTER } from "@/lib/db";

export const revalidate = 60;

const OPENSEA_LISTINGS_URL =
  "https://api.opensea.io/api/v2/listings/collection/good-vibes-club/all?limit=50";

async function fetchOpenSeaFloor(): Promise<number | null> {
  const key = process.env.OPENSEA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(OPENSEA_LISTINGS_URL, {
      headers: { accept: "application/json", "x-api-key": key },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const listings = data?.listings ?? [];
    const prices = listings
      .map((l: any) => {
        const raw = l?.price?.current?.value;
        return raw ? Number(raw) / 1e18 : null;
      })
      .filter((p: number | null): p is number => p !== null && p > 0);
    if (!prices.length) return null;
    return Math.min(...prices);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Live computation only. The cache_entries short-circuit was removed because
    // nothing in this repo refreshes `collection-stats` and stale rows were being
    // served indefinitely. Vercel's edge cache (revalidate=60 + s-maxage below)
    // already absorbs upstream load.
    const [ethRes, vibestrRes, openSeaFloor, depthRes, salesStats] = await Promise.all([
      // ETH price
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        { next: { revalidate: 60 } }
      ).then((r) => r.json()).catch(() => null),

      // VIBESTR price
      fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0xd0cC2b0eFb168bFe1f94a948D8df70FA10257196",
        { next: { revalidate: 60 } }
      ).then((r) => r.json()).catch(() => null),

      // Live floor from OpenSea (source of truth, requires OPENSEA_API_KEY)
      fetchOpenSeaFloor(),

      // Floor price from market-depth cache (kept as a fallback in case the
      // external cache_entries writer comes back online)
      pool.query(
        "SELECT value FROM cache_entries WHERE key = 'market-depth-good-vibes-club' LIMIT 1"
      ).catch(() => ({ rows: [] })),

      // Volume and sales count from price_cache — GVC only
      pool.query(
        `SELECT
          COUNT(*) as total_sales,
          SUM(price_eth) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as volume_24h,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as sales_24h
        FROM price_cache
        WHERE price_eth > 0 AND image_url LIKE $1`,
        [GVC_IMAGE_FILTER]
      ),
    ]);

    const ethPrice = ethRes?.ethereum?.usd ?? 0;
    const vibestrPrice = parseFloat(vibestrRes?.pairs?.[0]?.priceUsd ?? "0");

    // Floor price priority: OpenSea live → market-depth cache → 7d MIN sale
    let floorPrice = openSeaFloor ?? 0;
    if (!floorPrice && depthRes.rows.length) {
      const depth = depthRes.rows[0].value;
      floorPrice = depth.lowestListing ?? 0;
    }
    if (!floorPrice) {
      const fallback = await pool.query(
        "SELECT MIN(price_eth) as floor FROM price_cache WHERE price_eth > 0.1 AND created_at > NOW() - INTERVAL '7 days' AND image_url LIKE $1",
        [GVC_IMAGE_FILTER]
      );
      floorPrice = parseFloat(fallback.rows[0]?.floor) || 0;
    }

    const stats = salesStats.rows[0];
    const volume24h = parseFloat(stats.volume_24h) || 0;

    const data = {
      floorPrice,
      floorPriceUsd: floorPrice * ethPrice,
      marketCap: floorPrice * 6969,
      marketCapUsd: floorPrice * 6969 * ethPrice,
      totalSales: parseInt(stats.total_sales) || 0,
      volume24h,
      volume24hUsd: volume24h * ethPrice,
      sales24h: parseInt(stats.sales_24h) || 0,
      ethPrice,
      vibestrPriceUsd: vibestrPrice,
    };

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
