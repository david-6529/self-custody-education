import { NextResponse } from "next/server";

export const revalidate = 60;

const COLLECTION_SLUG = "good-vibes-club";
const PAGE_LIMIT = 200;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: raw } = await params;
    const address = raw.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid address" },
        { status: 400 }
      );
    }

    const key = process.env.OPENSEA_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Server missing OPENSEA_API_KEY" },
        { status: 503 }
      );
    }

    const tokens: string[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL(
        `https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts`
      );
      url.searchParams.set("collection", COLLECTION_SLUG);
      url.searchParams.set("limit", String(PAGE_LIMIT));
      if (cursor) url.searchParams.set("next", cursor);

      const res = await fetch(url.toString(), {
        headers: { accept: "application/json", "x-api-key": key },
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `OpenSea ${res.status}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const page = (data?.nfts ?? []) as Array<{ identifier?: string }>;
      for (const nft of page) {
        if (nft.identifier) tokens.push(nft.identifier);
      }
      cursor = data?.next || undefined;
    } while (cursor);

    return NextResponse.json(
      { address, tokens, count: tokens.length },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
