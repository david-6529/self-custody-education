import Script from "next/script";

/**
 * Google Analytics loader. Reads `NEXT_PUBLIC_GA_ID` from env and mounts
 * the gtag bootstrap + config. Renders nothing if the env var is unset,
 * so local dev doesn't pollute the production property unless explicitly
 * configured.
 *
 * Usage: <GoogleAnalytics /> once in the root layout.
 */
export default function GoogleAnalytics() {
    // Trim to survive env-var setters that append a trailing newline
    // (e.g. `echo "..." | vercel env add`). GA silently rejects IDs with
    // whitespace — hits return 204 but Realtime never populates.
    const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
    if (!gaId) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
            </Script>
        </>
    );
}
