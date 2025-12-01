// src/pages/api/ski/resorts/index.ts
import type { NextApiRequest, NextApiResponse } from "next";

const API = process.env.SKI_API_URL || "http://127.0.0.1:5001";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const q = (req.query.q ?? "").toString().trim();
      // ✅ ici on utilise les backticks pour interpoler la variable API
      const url = q.length
        ? `${API}/api/resorts/?q=${encodeURIComponent(q)}`
        : `${API}/api/resorts/`;
      const r = await fetch(url);
      const data = await r.json().catch(() => []);
      return res.status(r.ok ? 200 : r.status).json(data);
    }

    if (req.method === "POST") {
      const r = await fetch(`${API}/api/admin/resorts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", detail: e?.message });
  }
}
