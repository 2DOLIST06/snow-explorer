export type Resort = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  region?: {
    name?: string;
  };
  imageUrl?: string;
};

const RESORTS_PATH = "/api/resorts/";
const BROWSER_RESORTS_PATH = "/api/ski/resorts/";

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Resolve the backend origin for code running on the server (including builds). */
export function getServerApiBase(): string {
  const configuredBase =
    process.env.API_URL ||
    process.env.SKI_API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_SKI_API_BASE;

  if (configuredBase) {
    return withoutTrailingSlash(configuredBase);
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:5001";
  }

  throw new Error(
    "API_URL is required to fetch resorts during a production build " +
      "(NEXT_PUBLIC_API_URL is accepted as a fallback).",
  );
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
