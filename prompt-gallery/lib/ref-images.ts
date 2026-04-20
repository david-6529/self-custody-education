// Normalized reference-image shape. Stored in prompt_submissions.ref_images as
// JSON, either as the legacy `string[]` or the new object form. This helper
// always returns the rich shape so call sites don't need to branch.

export interface RefImage {
  url: string;
  title: string | null;
  description: string | null;
}

export function normalizeRefImages(raw: string | null | undefined): RefImage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: RefImage[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        out.push({ url: item, title: null, description: null });
      } else if (item && typeof item === "object" && typeof item.url === "string") {
        out.push({
          url: item.url,
          title: typeof item.title === "string" && item.title.trim() ? item.title : null,
          description:
            typeof item.description === "string" && item.description.trim() ? item.description : null,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeRefImages(refs: RefImage[]): string {
  return JSON.stringify(
    refs.map((r) => ({
      url: r.url,
      title: r.title || null,
      description: r.description || null,
    }))
  );
}
