import { BetaAnalyticsDataClient } from "@google-analytics/data";

/**
 * GA4 Data API wrapper. Auth via a service-account JSON stored in an env
 * var — base64-encoded to keep it single-line in Vercel's UI. Falls back
 * to raw JSON if the env already contains `{`.
 *
 * Required env:
 *   - GA_PROPERTY_ID (numeric, not the G-XXXX measurement ID)
 *   - GA_SERVICE_ACCOUNT_JSON_BASE64 (preferred) OR GA_SERVICE_ACCOUNT_JSON
 *
 * All fetchers return `null` on config error so the API/UI can fall back
 * gracefully to a "not configured" notice instead of 500-ing.
 */

export interface GaConfig {
    propertyId: string;
    credentials: { client_email: string; private_key: string };
}

let cachedClient: BetaAnalyticsDataClient | null = null;
let cachedConfig: GaConfig | null = null;

function loadConfig(): GaConfig | null {
    const propertyId = process.env.GA_PROPERTY_ID?.trim();
    if (!propertyId) return null;

    const b64 = process.env.GA_SERVICE_ACCOUNT_JSON_BASE64?.trim();
    const raw = process.env.GA_SERVICE_ACCOUNT_JSON?.trim();
    let jsonText: string | null = null;
    if (b64) {
        try { jsonText = Buffer.from(b64, "base64").toString("utf8"); } catch { return null; }
    } else if (raw && raw.startsWith("{")) {
        jsonText = raw;
    }
    if (!jsonText) return null;

    try {
        const parsed = JSON.parse(jsonText);
        if (!parsed.client_email || !parsed.private_key) return null;
        return {
            propertyId,
            credentials: {
                client_email: parsed.client_email,
                // Private keys stored as JSON strings have literal "\n" that
                // need to be real newlines for google-auth to parse them.
                private_key: parsed.private_key.replace(/\\n/g, "\n"),
            },
        };
    } catch {
        return null;
    }
}

function getClient(): BetaAnalyticsDataClient | null {
    if (cachedClient && cachedConfig) return cachedClient;
    const cfg = loadConfig();
    if (!cfg) return null;
    cachedConfig = cfg;
    cachedClient = new BetaAnalyticsDataClient({ credentials: cfg.credentials });
    return cachedClient;
}

export function isGaConfigured(): boolean {
    return !!loadConfig();
}

export interface GaDailyPoint {
    date: string;   // YYYY-MM-DD
    sessions: number;
    users: number;
    pageviews: number;
}

export interface GaTopRow {
    label: string;
    sessions: number;
    users: number;
}

export interface GaReport {
    summary: { sessions: number; users: number; pageviews: number };
    daily: GaDailyPoint[];
    topPages: GaTopRow[];
    topSources: GaTopRow[];
    /** Active users right now (past 30 min) — separate real-time report. */
    activeNow: number;
}

// Most recent error message from fetchGaReport, for surfacing in the
// admin UI when the call fails. Not a real caching pattern — just a
// one-slot diagnostic for the next debug call.
let lastGaError: string | null = null;
export function getLastGaError() { return lastGaError; }

/**
 * Earliest date we want to query. GA was installed on goodvibesclub.ai on
 * 2026-04-14 — anything before that is stale zeros from whenever the
 * property was first provisioned. Clamp all date ranges to this so the
 * charts don't have a long leading flatline.
 */
const GA_MIN_START_DATE = "2026-04-14";

function clampedStartDate(daysBack: number): string {
    const today = new Date();
    const daysBackDate = new Date(today);
    daysBackDate.setUTCDate(daysBackDate.getUTCDate() - daysBack);
    const daysBackIso = daysBackDate.toISOString().slice(0, 10);
    return daysBackIso < GA_MIN_START_DATE ? GA_MIN_START_DATE : daysBackIso;
}

export async function fetchGaReport(daysBack: number = 30): Promise<GaReport | null> {
    const client = getClient();
    const cfg = cachedConfig;
    if (!client || !cfg) return null;

    const property = `properties/${cfg.propertyId}`;
    const endDate = "today";
    const startDate = clampedStartDate(daysBack);

    try {
        const [daily, topPages, topSources, realtime] = await Promise.all([
            client.runReport({
                property,
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: "date" }],
                metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
                orderBys: [{ dimension: { dimensionName: "date" } }],
            }),
            client.runReport({
                property,
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: "pagePath" }],
                metrics: [{ name: "sessions" }, { name: "totalUsers" }],
                orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
                limit: 10,
            }),
            client.runReport({
                property,
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: "sessionSource" }],
                metrics: [{ name: "sessions" }, { name: "totalUsers" }],
                orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
                limit: 10,
            }),
            client.runRealtimeReport({
                property,
                metrics: [{ name: "activeUsers" }],
            }),
        ]);

        const dailyPoints: GaDailyPoint[] = (daily[0].rows || []).map(row => {
            const raw = row.dimensionValues?.[0]?.value || "";
            // GA returns dates as YYYYMMDD; reformat to YYYY-MM-DD.
            const day = raw.length === 8
                ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
                : raw;
            const values = row.metricValues || [];
            return {
                date: day,
                sessions: Number(values[0]?.value || 0),
                users: Number(values[1]?.value || 0),
                pageviews: Number(values[2]?.value || 0),
            };
        });

        const summary = dailyPoints.reduce(
            (acc, p) => ({
                sessions: acc.sessions + p.sessions,
                users: acc.users + p.users,
                pageviews: acc.pageviews + p.pageviews,
            }),
            { sessions: 0, users: 0, pageviews: 0 },
        );

        const topPagesOut: GaTopRow[] = (topPages[0].rows || []).map(row => ({
            label: row.dimensionValues?.[0]?.value || "(unknown)",
            sessions: Number(row.metricValues?.[0]?.value || 0),
            users: Number(row.metricValues?.[1]?.value || 0),
        }));
        const topSourcesOut: GaTopRow[] = (topSources[0].rows || []).map(row => ({
            label: row.dimensionValues?.[0]?.value || "(direct)",
            sessions: Number(row.metricValues?.[0]?.value || 0),
            users: Number(row.metricValues?.[1]?.value || 0),
        }));

        const activeNow = Number(realtime[0].rows?.[0]?.metricValues?.[0]?.value || 0);

        return { summary, daily: dailyPoints, topPages: topPagesOut, topSources: topSourcesOut, activeNow };
    } catch (e) {
        const msg = (e as Error).message || String(e);
        lastGaError = msg;
        console.error("[ga] fetchReport failed:", msg);
        return null;
    }
}
