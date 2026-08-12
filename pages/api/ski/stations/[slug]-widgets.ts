import type { NextApiRequest, NextApiResponse } from "next";

const API_ORIGIN = process.env.SKI_API_BASE ?? process.env.NEXT_PUBLIC_SKI_API_BASE;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  if (!slug || !API_ORIGIN) {
    return res.status(500).json({ error: "proxy_not_configured" });
  }

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
