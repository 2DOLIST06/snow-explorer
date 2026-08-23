export const INDEXNOW_KEY = "7ccf80d73d9243f6b722189d96607f40";
export const INDEXNOW_HOST = "www.snow-explorer.com";
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY_LOCATION = `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_MAX_URLS = 10_000;

export function isIndexNowUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.host === INDEXNOW_HOST && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getIndexNowUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isIndexNowUrl))];
}
