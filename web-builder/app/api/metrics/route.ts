import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureMetricsTables, insertSnapshot, getHistoricalSeries } from "@/lib/metrics-db";
import { fetchGaReport, isGaConfigured, getLastGaError } from "@/lib/ga";

export const dynamic = "force-dynamic";

const NPM_PACKAGE = process.env.NPM_PACKAGE_NAME || "create-gvc-app";
const GITHUB_REPO = process.env.GITHUB_REPO || "brydisanto/gvc-builder-kit";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Read-only metrics aggregator. Pulls live from npm + GitHub, persists a
 * snapshot row on every call (so historical charts accumulate), returns
 * live + historical in a single payload for the admin dashboard.
 *
 * Graceful degradation:
 *   - No GITHUB_TOKEN or insufficient scope → public endpoints still work,
 *     traffic fields come back as null. UI shows "PAT scope too narrow".
 *   - npm endpoint down → npm fields are null, everything else still loads.
 */
export async function GET(req: NextRequest) {
    const unauth = requireAdmin(req);
    if (unauth) return unauth;

    await ensureMetricsTables();

    const today = new Date();
    // npm chart starts when tracking went live on 2026-04-14 (or 90 days
    // back, whichever is more recent — keeps legacy pre-launch noise out
    // of the chart even once we're more than 90 days past launch).
    const TRACKING_START = new Date("2026-04-14T00:00:00Z");
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    const npmStart = ninetyDaysAgo < TRACKING_START ? TRACKING_START : ninetyDaysAgo;

    // Run all fetches in parallel, defend against any one failing.
    const [npmLast30, npmRange, ghRepo, ghReleases, ghViews, ghClones, ghReferrers, ghPaths, gaReport] = await Promise.all([
        fetchNpmTotal(30),
        fetchNpmDaily(formatDate(npmStart), formatDate(today)),
        fetchGhRepo(),
        fetchGhReleases(),
        fetchGhTraffic("views"),
        fetchGhTraffic("clones"),
        fetchGhPopular("referrers"),
        fetchGhPopular("paths"),
        fetchGaReport(30),
    ]);

    // Persist today's snapshot (best-effort — failure doesn't block the response).
    try {
        await insertSnapshot({
            ts: new Date(),
            stars: ghRepo?.stargazers_count ?? 0,
            forks: ghRepo?.forks_count ?? 0,
            openIssues: ghRepo?.open_issues_count ?? 0,
            npmTotal: npmLast30?.downloads ?? 0,
            views14d: ghViews?.count ?? 0,
            uniqueVisitors14d: ghViews?.uniques ?? 0,
            clones14d: ghClones?.count ?? 0,
            uniqueCloners14d: ghClones?.uniques ?? 0,
        });
    } catch (e) {
        console.error("[metrics] snapshot insert failed", e);
    }

    const historical = await getHistoricalSeries(90).catch(() => []);

    return NextResponse.json({
        config: {
            npmPackage: NPM_PACKAGE,
            githubRepo: GITHUB_REPO,
            hasGithubToken: !!GITHUB_TOKEN,
            gaConfigured: isGaConfigured(),
        },
        ga: gaReport,
        gaError: gaReport ? null : getLastGaError(),
        npm: {
            last30Days: npmLast30?.downloads ?? null,
            daily: npmRange?.downloads ?? [],
        },
        github: {
            stars: ghRepo?.stargazers_count ?? null,
            forks: ghRepo?.forks_count ?? null,
            watchers: ghRepo?.subscribers_count ?? null,
            openIssues: ghRepo?.open_issues_count ?? null,
            latestRelease: ghReleases?.[0] ? {
                tag: ghReleases[0].tag_name,
                publishedAt: ghReleases[0].published_at,
                url: ghReleases[0].html_url,
            } : null,
            traffic: {
                views14d: ghViews,
                clones14d: ghClones,
                referrers: ghReferrers,
                paths: ghPaths,
                trafficAccessible: !!ghViews || !!ghClones,
            },
        },
        history: historical,
    });
}

// ---- helpers ----

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

async function fetchNpmTotal(lastNDays: number): Promise<{ downloads: number; start: string; end: string } | null> {
    try {
        const res = await fetch(`https://api.npmjs.org/downloads/point/last-${lastNDays === 30 ? "month" : "week"}/${NPM_PACKAGE}`, {
            next: { revalidate: 600 },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

async function fetchNpmDaily(start: string, end: string): Promise<{ downloads: Array<{ day: string; downloads: number }>; start: string; end: string } | null> {
    try {
        const res = await fetch(`https://api.npmjs.org/downloads/range/${start}:${end}/${NPM_PACKAGE}`, {
            next: { revalidate: 600 },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

function ghHeaders(): HeadersInit {
    const h: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (GITHUB_TOKEN) h.Authorization = `Bearer ${GITHUB_TOKEN}`;
    return h;
}

async function fetchGhRepo() {
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
            headers: ghHeaders(),
            next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

async function fetchGhReleases() {
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=1`, {
            headers: ghHeaders(),
            next: { revalidate: 600 },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

interface TrafficResp {
    count: number;
    uniques: number;
    views?: Array<{ timestamp: string; count: number; uniques: number }>;
    clones?: Array<{ timestamp: string; count: number; uniques: number }>;
}

async function fetchGhTraffic(kind: "views" | "clones"): Promise<TrafficResp | null> {
    if (!GITHUB_TOKEN) return null;
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/traffic/${kind}`, {
            headers: ghHeaders(),
            cache: "no-store",
        });
        // 403 here typically means PAT scope too narrow (needs `repo` or
        // fine-grained "Administration: Read").
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

async function fetchGhPopular(kind: "referrers" | "paths"): Promise<Array<{ referrer?: string; path?: string; count: number; uniques: number }> | null> {
    if (!GITHUB_TOKEN) return null;
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/traffic/popular/${kind}`, {
            headers: ghHeaders(),
            cache: "no-store",
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}
