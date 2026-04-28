import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const revalidate = 60;

const COLLECTION_SLUG = "good-vibes-club";
const LISTINGS_URL = `https://api.opensea.io/api/v2/listings/collection/${COLLECTION_SLUG}/all?limit=100`;
const OFFERS_URL = `https://api.opensea.io/api/v2/offers/collection/${COLLECTION_SLUG}/all?limit=100`;

type Level = { price: number; depth: number };

function bucket(prices: number[]): Level[] {
  const counts = new Map<number, number>();
  for (const p of prices) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()].map(([price, depth]) => ({ price, depth }));
}

async function fetchOpenSeaPrices(url: string, key: string): Promise<number[]> {
  const res = await fetch(url, {
    headers: { accept: "application/json", "x-api-key": key },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const items = data?.listings ?? data?.offers ?? [];
  return items
    .map((l: any) => {
      const raw = l?.price?.current?.value;
      return raw ? Number(raw) / 1e18 : null;
    })
    .filter((p: number | null): p is number => p !== null && p > 0);
}

export async function GET() {
  try {
    const key = process.env.OPENSEA_API_KEY;

    if (key) {
      const [listingPrices, offerPrices] = await Promise.all([
        fetchOpenSeaPrices(LISTINGS_URL, key),
        fetchOpenSeaPrices(OFFERS_URL, key),
      ]);

      if (listingPrices.length || offerPrices.length) {
        const listings = bucket(listingPrices).sort((a, b) => a.price - b.price);
        const offers = bucket(offerPrices).sort((a, b) => b.price - a.price);
        return NextResponse.json(
          {
            listings,
            offers,
            lowestListing: listings[0]?.price ?? null,
            highestOffer: offers[0]?.price ?? null,
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            },
          }
        );
      }
    }

    // Fallback: cache_entries (only useful if the external writer comes back online)
    const { rows } = await pool.query(
      "SELECT value FROM cache_entries WHERE key = 'market-depth-good-vibes-club' LIMIT 1"
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0].value);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
