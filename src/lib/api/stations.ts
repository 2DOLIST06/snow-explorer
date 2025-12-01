import axios from "@/config/axios";
import type { StationWidgetsConfig } from "@/types/station";

const API_BASE = process.env.NEXT_PUBLIC_SKI_API_BASE || "http://127.0.0.1:5001";

const EMPTY_CFG: StationWidgetsConfig = {
  stationSlug: "",
  pistes: { enabled: false, smallMapUrl: null, largeMapUrl: null, caption: null },
  meteo: { enabled: false, iframeUrl: null },
  description: { enabled: false, html: null, metaTitle: null, metaDescription: null },
  forfaits: { enabled: false, items: [] },
  webcams: { enabled: false, items: [] },
  snow: { enabled: false, iframeUrl: null },
  snowpark: { enabled: false, mapUrl: null, imageUrl: null, caption: null },
};

export async function fetchStationWidgetsConfig(stationSlug: string): Promise<StationWidgetsConfig> {
  try {
    const url = `${API_BASE}/api/stations/${stationSlug}/widgets`;
    const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as StationWidgetsConfig;

    // merge sécurité
    return { ...EMPTY_CFG, ...data, stationSlug };
  } catch (err) {
    console.error("❌ fetchStationWidgetsConfig error:", err);
    return { ...EMPTY_CFG, stationSlug };
  }
}
