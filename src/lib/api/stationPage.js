const PUBLIC_STATION_PATH = "/api/resorts/";
const ERROR_BODY_LIMIT = 500;

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function getStationApiBase(env = process.env) {
  const configured =
    env.API_URL ||
    env.BACKEND_URL ||
    env.NEXT_PUBLIC_API_URL ||
    env.SKI_API_URL ||
    env.NEXT_PUBLIC_SKI_API_BASE;

  if (configured) return withoutTrailingSlash(configured);
  if (env.NODE_ENV !== "production") return "http://127.0.0.1:5001";

  throw new Error(
    "[station-page] Missing backend origin: configure API_URL, BACKEND_URL or NEXT_PUBLIC_API_URL",
  );
}

function getSafeStationApiUrl(value) {
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

function stationFromPayload(payload, slug) {
  if (Array.isArray(payload)) {
    return payload.find((resort) => resort?.slug === slug) ?? undefined;
  }
  if (!payload || typeof payload !== "object") return null;
  if (payload.exists === false || payload.found === false || payload.error === "not_found") {
    return undefined;
  }

  const candidate = payload.resort ?? payload.data ?? payload;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  if (typeof candidate.name !== "string" || typeof candidate.slug !== "string") return null;
  return candidate;
}

function isResortInactive(resort) {
  const active = resort.is_active ?? resort.resort_is_active ?? resort.active;
  return active === false;
}

async function loadPublicResort(slug, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const logger = options.logger || console;
  const apiBase = getStationApiBase(options.env || process.env);
  const url = `${apiBase}${PUBLIC_STATION_PATH}${encodeURIComponent(slug)}`;
  const safeUrl = getSafeStationApiUrl(url);

  logger.info("[station-page] API request", { slug, url: safeUrl });

  let response;
  try {
    response = await fetchImpl(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    logger.error("[station-page] API request failed", {
      slug,
      url: safeUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const contentType = response.headers.get("content-type");
  logger.info("[station-page] API response", {
    slug,
    url: safeUrl,
    status: response.status,
    contentType,
  });

  const body = await response.text();
  if (!response.ok) {
    logger.error("[station-page] API error", {
      slug,
      url: safeUrl,
      status: response.status,
      contentType,
      bodyExcerpt: body.slice(0, ERROR_BODY_LIMIT),
    });
    if (response.status === 404) return null;
    throw new Error(`[station-page] Public station API returned HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    logger.error("[station-page] API JSON parsing failed", {
      slug,
      url: safeUrl,
      status: response.status,
      contentType,
      bodyExcerpt: body.slice(0, ERROR_BODY_LIMIT),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const resort = stationFromPayload(payload, slug);
  if (resort === undefined) return null;
  if (!resort) {
    logger.error("[station-page] Invalid API payload", {
      slug,
      url: safeUrl,
      status: response.status,
      contentType,
      bodyExcerpt: body.slice(0, ERROR_BODY_LIMIT),
    });
    throw new Error("[station-page] Public station API returned an invalid payload");
  }

  return resort;
}

module.exports = {
  PUBLIC_STATION_PATH,
  getStationApiBase,
  isResortInactive,
  loadPublicResort,
  stationFromPayload,
};
