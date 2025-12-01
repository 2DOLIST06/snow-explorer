// src/pages/api/webcams.ts
import type { NextApiRequest, NextApiResponse } from "next";

function bboxFrom(lat: number, lon: number, km: number) {
  const dLat = km / 110.574;
  const dLon = km / (111.320 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - dLat, minLon: lon - dLon, maxLat: lat + dLat, maxLon: lon + dLon };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radiusKm = Number(req.query.radiusKm || 35);
  const apiKey = process.env.WEBCAMS_API_KEY;

  if (!apiKey || Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: "lat, lon et WEBCAMS_API_KEY requis" });
  }

  const headers = { "X-WINDY-API-KEY": apiKey, accept: "application/json" } as const;

  const p1 = new URLSearchParams({
    nearby: `${lat},${lon},${radiusKm}`,
    include: "images,location,player,urls",
    lang: "fr",
    limit: "50",
  });
  const url1 = `https://api.windy.com/webcams/api/v3/webcams?${p1.toString()}`;

  try {
    const r1 = await fetch(url1, { headers });
    if (r1.ok) {
      const j = await r1.json();
      const raw = j?.webcams ?? [];
      const webcams = raw.map((c: any) => {
        const preview =
          c?.images?.current?.preview ||
          c?.images?.daylight?.preview ||
          c?.images?.current?.icon ||
          null;

        const embed =
          c?.player?.day?.embed ||
          c?.player?.lifetime?.embed ||
          c?.player?.live?.embed ||
          null;

        return {
          id: c?.webcamId ?? c?.id ?? null,
          title: c?.title || c?.location?.city || "Webcam",
          preview,
          embed,
          link: c?.urls?.current || null,
          lat: c?.location?.latitude ?? null,
          lon: c?.location?.longitude ?? null,
        };
      });
      return res.status(200).json({ webcams });
    }
  } catch {
    // fallback ensuite
  }

  const bb = bboxFrom(lat, lon, radiusKm);
  const p2 = new URLSearchParams({
    westLon: String(bb.minLon),
    southLat: String(bb.minLat),
    eastLon: String(bb.maxLon),
    northLat: String(bb.maxLat),
    include: "images,location,player,urls",
    lang: "fr",
    limit: "50",
  });
  const url2 = `https://api.windy.com/webcams/api/v3/webcams?${p2.toString()}`;

  try {
    const r2 = await fetch(url2, { headers });
    const j2 = await r2.json().catch(() => ({}));
    const raw = j2?.webcams ?? [];
    const webcams = raw.map((c: any) => {
      const preview =
        c?.images?.current?.preview ||
        c?.images?.daylight?.preview ||
        c?.images?.current?.icon ||
        null;

      const embed =
        c?.player?.day?.embed ||
        c?.player?.lifetime?.embed ||
        c?.player?.live?.embed ||
        null;

      return {
        id: c?.webcamId ?? c?.id ?? null,
        title: c?.title || c?.location?.city || "Webcam",
        preview,
        embed,
        link: c?.urls?.current || null,
        lat: c?.location?.latitude ?? null,
        lon: c?.location?.longitude ?? null,
      };
    });
    return res.status(r2.status).json({ webcams });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || "fetch error", webcams: [] });
  }
}
