export type Resort = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  region?: {
    id?: string;
    name?: string;
    slug?: string;
    country_code?: string;
    updated_at?: string | null;
  };
  logo_url?: string | null;
  logoUrl?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const RESORTS_PATH = "/api/resorts/";
const BROWSER_RESORTS_PATH = "/api/ski/resorts/";

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Resolve the backend origin for code running on the server (including builds). */
export function getServerApiBases(): string[] {
  const configuredBases = [
    process.env.API_URL,
    process.env.SKI_API_URL,
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_SKI_API_BASE,
  ].filter((value): value is string => Boolean(value));

  if (configuredBases.length > 0) {
    return [...new Set(configuredBases.map(withoutTrailingSlash))];
  }

  if (process.env.NODE_ENV !== "production") {
    return ["http://127.0.0.1:5001"];
  }

  throw new Error(
    "API_URL is required to fetch resorts during a production build " +
      "(NEXT_PUBLIC_API_URL is accepted as a fallback).",
  );
}

export function getServerApiBase(): string {
  return getServerApiBases()[0];
}

export function getServerResortsApiUrls(): string[] {
  return getServerApiBases().map((base) => `${base}${RESORTS_PATH}?active=true`);
}

/** Use the same backend resource through the same-origin proxy in browsers. */
export function getResortsApiUrl(options?: {
  query?: string;
  server?: boolean;
}): string {
  const base = options?.server
    ? `${getServerApiBase()}${RESORTS_PATH}`
    : BROWSER_RESORTS_PATH;
  const query = options?.query?.trim();

  return query ? `${base}?q=${encodeURIComponent(query)}` : base;
}

/** Remove credentials and query values before an API URL is written to build logs. */
export function getSafeApiUrlForLogs(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    return url.toString();
  } catch {
    return "[invalid API URL]";
  }
}

export function parseResortsPayload(payload: unknown): Resort[] {
  let candidates: unknown = payload;

  if (!Array.isArray(candidates) && candidates && typeof candidates === "object") {
    const objectPayload = candidates as Record<string, unknown>;
    candidates = Array.isArray(objectPayload.results)
      ? objectPayload.results
      : Array.isArray(objectPayload.data)
        ? objectPayload.data
        : Array.isArray(objectPayload.items)
          ? objectPayload.items
          : [];
  }

  return Array.isArray(candidates) ? (candidates as Resort[]) : [];
}

export function getValidActiveResorts(resorts: Resort[]): Resort[] {
  return resorts.filter(
    (resort) =>
      resort?.is_active === true &&
      typeof resort.id === "string" &&
      resort.id.trim().length > 0 &&
      typeof resort.name === "string" &&
      resort.name.trim().length > 0 &&
      typeof resort.slug === "string" &&
      resort.slug.trim().length > 0,
  );
}

/** Return the most recently added stations first without mutating the API payload. */
export function getLatestAddedResorts(resorts: Resort[], limit = 6): Resort[] {
  return resorts
    .map((resort, index) => ({ resort, index }))
    .sort((a, b) => {
      const aTimestamp = Date.parse(a.resort.created_at || "");
      const bTimestamp = Date.parse(b.resort.created_at || "");
      const aHasDate = Number.isFinite(aTimestamp);
      const bHasDate = Number.isFinite(bTimestamp);

      if (aHasDate && bHasDate && aTimestamp !== bTimestamp) {
        return bTimestamp - aTimestamp;
      }
      if (aHasDate !== bHasDate) {
        return aHasDate ? -1 : 1;
      }

      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ resort }) => resort);
}

/** Fetch the public station directory for a server-rendered page. */
export async function fetchActiveResortsServer(): Promise<Resort[]> {
  const failures: string[] = [];

  for (const url of getServerResortsApiUrls()) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) {
        failures.push(`${getSafeApiUrlForLogs(url)} returned ${response.status}`);
        continue;
      }

      return getValidActiveResorts(parseResortsPayload(await response.json()))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    } catch (error) {
      failures.push(
        `${getSafeApiUrlForLogs(url)} failed: ${error instanceof Error ? error.message : "unknown_error"}`,
      );
      // A deployment can define multiple backend origins; try the next one.
    }
  }

  console.error("[resorts] Unable to fetch the public resort directory", failures.join("; "));
  return [];
}
