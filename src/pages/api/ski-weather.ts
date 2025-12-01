// pages/api/ski-weather.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = parseFloat((req.query.lat as string) || "");
  const lon = parseFloat((req.query.lon as string) || "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: "lat & lon requis (ex: ?lat=44.23&lon=6.94)" });
  }

  // Open-Meteo : météo actuelle + neige (journalière) + hauteur de neige si dispo
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("hourly", [
    "temperature_2m",
    "snowfall",
    "snow_depth",
    "wind_speed_10m",
    "precipitation"
  ].join(","));
  url.searchParams.set("daily", [
    "temperature_2m_max",
    "temperature_2m_min",
    "snowfall_sum",
    "snow_depth_max",
    "precipitation_sum"
  ].join(","));

  try {
    const r = await fetch(url.toString(), { headers: { "accept": "application/json" } });
    if (!r.ok) return res.status(r.status).json({ error: "open-meteo error" });
    const data = await r.json();

    // Normalisation minimale pour le widget
    const now = data.current_weather ?? {};
    const daily = data.daily ?? {};
    const todayIdx = 0;

    const payload = {
      updatedAt: new Date().toISOString(),
      current: {
        temperature: now.temperature ?? null,       // °C
        windspeed: now.windspeed ?? null,           // km/h
        winddirection: now.winddirection ?? null,   // °
        weathercode: now.weathercode ?? null,       // pour icône/description
      },
      today: {
        tmin: daily.temperature_2m_min?.[todayIdx] ?? null,
        tmax: daily.temperature_2m_max?.[todayIdx] ?? null,
        snowfall_cm: daily.snowfall_sum?.[todayIdx] ?? null,
        snow_depth_cm: daily.snow_depth_max?.[todayIdx] ?? null,
        precip_mm: daily.precipitation_sum?.[todayIdx] ?? null,
        date: daily.time?.[todayIdx] ?? null,
      },
      nextDays: (daily.time || []).slice(1, 4).map((date: string, i: number) => ({
        date,
        tmin: daily.temperature_2m_min?.[i + 1] ?? null,
        tmax: daily.temperature_2m_max?.[i + 1] ?? null,
        snowfall_cm: daily.snowfall_sum?.[i + 1] ?? null,
        snow_depth_cm: daily.snow_depth_max?.[i + 1] ?? null,
        precip_mm: daily.precipitation_sum?.[i + 1] ?? null,
      })),
    };

    res.status(200).json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "unknown error" });
  }
}
