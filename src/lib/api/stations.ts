import axios from "@/config/axios";
import type { StationWidgetsConfig } from "@/types/station";

const API_BASE =
  process.env.NEXT_PUBLIC_SKI_API_BASE ||
  process.env.SKI_API_URL ||
  process.env.API_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5001";

const EMPTY_CFG: StationWidgetsConfig = {
  stationSlug: "",
  pistes: { enabled: false, smallMapUrl: null, largeMapUrl: null, caption: null },
  meteo: { enabled: false, iframeUrl: null },
  description: { enabled: false, html: null, metaTitle: null, metaDescription: null },
  forfaits: { enabled: false, columns: [], items: [] },
  webcams: { enabled: false, items: [] },
  snow: { enabled: false, iframeUrl: null },
  snowpark: { enabled: false, mapUrl: null, imageUrl: null, caption: null },
};

function normalizedForfaits(payload: any) {
  const mode = payload?.mode || payload?.ski_pass_mode;
  const season = payload?.season || (Array.isArray(payload?.seasons) ? payload.seasons.find((value: any) => value?.enabled !== false && value?.is_active !== false) : null);
  const enabled = payload?.enabled ?? payload?.is_active ?? payload?.active ?? season?.enabled ?? season?.is_active ?? season?.active;
  if (mode === "legacy" || enabled !== true || !season?.id) return null;
  const passes = Array.isArray(season.passes) ? season.passes : Array.isArray(season.products) ? season.products : [];
  const periods = (season.periods || []).map((period: any) => ({
    ...period,
    passes: passes.map((product: any) => ({
      ...product,
      prices: (product.prices || []).filter((price: any) => String(price.period_id) === String(period.id)),
    })),
  }));
  return { mode: "normalized", enabled: true, season: season.season, currency: season.currency, source_url: season.source_url, columns: [], items: [], periods };
}

export async function fetchStationWidgetsConfig(stationSlug: string): Promise<StationWidgetsConfig> {
  try {
    // A normalized season is authoritative. Widgets are requested afterwards only
    // for the other blocks, and their legacy forfaits value is never allowed to
    // overwrite an existing normalized grid.
    const normalizedResponse = await fetch(`${API_BASE}/api/stations/${encodeURIComponent(stationSlug)}/ski-passes`, {
      headers: { accept: "application/json" }, cache: "no-store",
    });
    let normalized = null;
    if (normalizedResponse.ok) normalized = normalizedForfaits(await normalizedResponse.json());
    // A missing/unavailable normalized grid must not hide a valid legacy grid.
    const url = `${API_BASE}/api/stations/${encodeURIComponent(stationSlug)}/widgets`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    console.info(`[fetchStationWidgetsConfig] GET ${url} -> ${res.status}`);

    if (res.status === 404) {
      if (normalized) {
        return { ...EMPTY_CFG, stationSlug, forfaits: { ...EMPTY_CFG.forfaits, ...normalized } };
      }
      const notFoundError: any = new Error("widgets_not_found");
      notFoundError.status = 404;
      throw notFoundError;
    }

    if (!res.ok || res.status === 204) {
      return normalized
        ? { ...EMPTY_CFG, stationSlug, forfaits: { ...EMPTY_CFG.forfaits, ...normalized } }
        : { ...EMPTY_CFG, stationSlug };
    }

    const data = (await res.json()) as StationWidgetsConfig;

    return {
      ...EMPTY_CFG,
      ...data,
      stationSlug,
      pistes: {
        ...EMPTY_CFG.pistes,
        ...data.pistes,
      },
      meteo: {
        ...EMPTY_CFG.meteo,
        ...data.meteo,
      },
      description: {
        ...EMPTY_CFG.description,
        ...data.description,
      },
      forfaits: {
        ...EMPTY_CFG.forfaits,
        ...(normalized || data.forfaits),
        columns: normalized?.columns || data.forfaits?.columns || [],
        items: normalized?.items || data.forfaits?.items || [],
        periods: normalized?.periods || data.forfaits?.periods || (typeof data.forfaits?.season === "object" ? data.forfaits.season?.periods || data.forfaits.season?.pricing_periods : undefined) || [],
      },
      webcams: {
        ...EMPTY_CFG.webcams,
        ...data.webcams,
        items: data.webcams?.items || [],
      },
      snow: {
        ...EMPTY_CFG.snow,
        ...data.snow,
      },
      snowpark: {
        ...EMPTY_CFG.snowpark,
        ...data.snowpark,
      },
    };
  } catch (err) {
    console.error("❌ fetchStationWidgetsConfig error:", err);
    throw err;
  }
}
