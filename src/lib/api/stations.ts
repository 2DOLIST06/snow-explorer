import axios from "@/config/axios";
import type { StationWidgetsConfig } from "@/types/station";

const API_BASE =
  process.env.SKI_API_URL ||
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

export async function fetchStationWidgetsConfig(stationSlug: string): Promise<StationWidgetsConfig> {
  try {
    const url = `${API_BASE}/api/admin/stations/${encodeURIComponent(stationSlug)}/widgets`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok || res.status === 204) {
      return { ...EMPTY_CFG, stationSlug };
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
        ...data.forfaits,
        columns: data.forfaits?.columns || [],
        items: data.forfaits?.items || [],
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
    return { ...EMPTY_CFG, stationSlug };
  }
}
