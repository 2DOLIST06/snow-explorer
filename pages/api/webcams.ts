import type { NextApiRequest, NextApiResponse } from "next";

function bboxFrom(lat: number, lon: number, km: number) {
  const dLat = km / 110.574;
  const dLon = km / (111.320 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    minLon: lon - dLon,
    maxLat: lat + dLat,
    maxLon: lon + dLon,
  };
}

function mapWebcam(c: any) {
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

  const link =
    c?.urls?.current ||
    c?.urls?.detail ||
    c?.urls?.webcam ||
    null;

  return {
    id: c?.webcamId ?? c?.id ?? null,
    title: c?.title || c?.location?.city || "Webcam",
    preview,
    embed,
    link,
    lat: c?.location?.latitude ?? null,
    lon: c?.location?.longitude ?? null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radiusKm = Number(req.query.radiusKm || 35);
  const apiKey = process.env.WEBCAMS_API_KEY;

  if (!apiKey || Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: "lat, lon et WEBCAMS_API_KEY requis", webcams: [] });
  }

  const headers = {
    "X-WINDY-API-KEY": apiKey,
    accept: "application/json",
  } as const;

  try {
    const p1 = new URLSearchParams({
      nearby: `${lat},${lon},${radiusKm}`,
      include: "images,location,player,urls",
      lang: "fr",
      limit: "50",
    });

    const url1 = `https://api.windy.com/webcams/api/v3/webcams?${p1.toString()}`;
    const r1 = await fetch(url1, { headers });

    if (r1.ok) {
      const j1 = await r1.json();
      const raw1 = Array.isArray(j1?.webcams) ? j1.webcams : [];
      const webcams1 = raw1.map(mapWebcam).filter((w: any) => w.preview);

      if (webcams1.length > 0) {
        return res.status(200).json({ webcams: webcams1 });
      }
    } else {
      const body = await r1.text().catch(() => "");
      console.error("Windy nearby failed:", r1.status, body);
    }
  } catch (e: any) {
    console.error("Windy nearby exception:", e?.message || e);
  }

  try {
    const bb = bboxFrom(lat, lon, radiusKm);

    const p2 = new URLSearchParams({
      bbox: `${bb.maxLat},${bb.maxLon},${bb.minLat},${bb.minLon}`,
      include: "images,location,player,urls",
      lang: "fr",
      limit: "50",
    });

    const url2 = `https://api.windy.com/webcams/api/v3/webcams?${p2.toString()}`;
    const r2 = await fetch(url2, { headers });

    if (!r2.ok) {
      const body = await r2.text().catch(() => "");
      console.error("Windy bbox failed:", r2.status, body);
      return res.status(r2.status).json({ error: body || "Windy bbox failed", webcams: [] });
    }

    const j2 = await r2.json();
    const raw2 = Array.isArray(j2?.webcams) ? j2.webcams : [];
    const webcams2 = raw2.map(mapWebcam).filter((w: any) => w.preview);

    return res.status(200).json({ webcams: webcams2 });
  } catch (e: any) {
    console.error("Windy bbox exception:", e?.message || e);
    return res.status(502).json({ error: e?.message || "fetch error", webcams: [] });
  }
}
