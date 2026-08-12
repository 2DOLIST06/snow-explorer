import type { NextApiRequest, NextApiResponse } from "next";

const API_ORIGIN =
  process.env.SKI_API_BASE ||
  process.env.NEXT_PUBLIC_SKI_API_BASE ||
  process.env.SKI_API_URL ||
  process.env.API_URL ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:5001";

const WIDGETS_SUFFIX = "-widgets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const station = Array.isArray(req.query.station) ? req.query.station[0] : req.query.station;
  if (!station?.endsWith(WIDGETS_SUFFIX)) {
    return res.status(404).json({ error: "not_found" });
  }

  const slug = station.slice(0, -WIDGETS_SUFFIX.length);
  if (!slug) return res.status(404).json({ error: "not_found" });

  try {
    const upstream = await fetch(
      `${API_ORIGIN.replace(/\/$/, "")}/api/stations/${encodeURIComponent(slug)}/widgets`,
      { headers: { Accept: "application/json" } },
    );
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    res.setHeader("Cache-Control", "no-store");
    return res.send(body);
  } catch {
    return res.status(502).json({ error: "widgets_upstream_unavailable" });
  }
}
