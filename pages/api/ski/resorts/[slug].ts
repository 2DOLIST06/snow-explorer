// src/pages/api/ski/resorts/[slug].ts
import type { NextApiRequest, NextApiResponse } from "next";

const API = process.env.SKI_API_URL || "http://127.0.0.1:5001";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { slug } = req.query as { slug: string };

    if (req.method === "GET") {
      const r = await fetch(`${API}/api/resorts/${encodeURIComponent(slug)}`);
      if (!r.ok) return res.status(r.status).json({ error: "not_found" });
      const data = await r.json();
      return res.status(200).json(data);
    }

    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", detail: e?.message });
  }
}