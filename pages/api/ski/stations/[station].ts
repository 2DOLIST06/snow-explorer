import type { NextApiRequest, NextApiResponse } from "next";
import { loadPublicSkiPasses } from "@/lib/publicSkiPasses";

const API_ORIGIN =
  process.env.SKI_API_BASE ||
  process.env.NEXT_PUBLIC_SKI_API_BASE ||
  process.env.SKI_API_URL ||
  process.env.API_URL ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:5001";

const WIDGETS_SUFFIX = "-widgets";
const SKI_PASSES_SUFFIX = "-ski-passes";

async function jsonFromUpstream(url: string) {
  const upstream = await fetch(url, { headers: { Accept: "application/json" } });
  if (!upstream.ok) {
    const error = new Error("upstream_request_failed") as Error & { status?: number };
    error.status = upstream.status;
    throw error;
  }
  return upstream.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const station = Array.isArray(req.query.station) ? req.query.station[0] : req.query.station;
  if (!station?.endsWith(WIDGETS_SUFFIX) && !station?.endsWith(SKI_PASSES_SUFFIX)) {
    return res.status(404).json({ error: "not_found" });
  }

  const isSkiPassRequest = station.endsWith(SKI_PASSES_SUFFIX);
  const slug = station.slice(0, -(isSkiPassRequest ? SKI_PASSES_SUFFIX : WIDGETS_SUFFIX).length);
  if (!slug) return res.status(404).json({ error: "not_found" });

  try {
    if (isSkiPassRequest) {
      const root = API_ORIGIN.replace(/\/$/, "");
      const payload = await loadPublicSkiPasses(
        () => jsonFromUpstream(`${root}/api/stations/${encodeURIComponent(slug)}/ski-passes`),
        () => jsonFromUpstream(`${root}/api/stations/${encodeURIComponent(slug)}/widgets`),
      );
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(payload);
    }
    const upstream = await fetch(
      `${API_ORIGIN.replace(/\/$/, "")}/api/stations/${encodeURIComponent(slug)}/widgets`,
      { headers: { Accept: "application/json" } },
    );
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    res.setHeader("Cache-Control", "no-store");
    return res.send(body);
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (isSkiPassRequest && status === 404) return res.status(404).json({ error: "not_found" });
    return res.status(502).json({ error: isSkiPassRequest ? "ski_passes_upstream_unavailable" : "widgets_upstream_unavailable" });
  }
}
