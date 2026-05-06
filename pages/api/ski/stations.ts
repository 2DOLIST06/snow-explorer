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

    const q = (req.query.q ?? "").toString().trim();
    const url = q.length
      ? `${API}/api/admin/stations/?q=${encodeURIComponent(q)}`
      : `${API}/api/admin/stations/`;

    const r = await fetch(url);
    const data = await r.json().catch(() => []);
    const list = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];
    return res.status(r.ok ? 200 : r.status).json(list);
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", detail: e?.message });
  }
}
