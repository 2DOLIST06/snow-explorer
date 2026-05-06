import type { NextApiRequest, NextApiResponse } from "next";

const API =
  process.env.NEXT_PUBLIC_SKI_API_BASE ||
  process.env.SKI_API_URL ||
  process.env.API_URL ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:5001";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).end("Method Not Allowed");
    }

    const { slug } = req.query as { slug: string };
    const r = await fetch(`${API}/api/stations/${encodeURIComponent(slug)}/widgets`);
    const data = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", detail: e?.message });
  }
}
