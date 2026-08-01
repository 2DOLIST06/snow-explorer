// src/pages/api/ski/resorts/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getResortsApiUrl,
  getServerApiBase,
  parseResortsPayload,
} from "@/lib/api/resorts";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const q = (req.query.q ?? "").toString().trim();
      const url = getResortsApiUrl({ query: q, server: true });
      const r = await fetch(url);
      const data = await r.json().catch(() => []);
      if (!r.ok) {
        return res.status(r.status).json(data);
      }

      // The public backend can return either a bare array or a paginated
      // object. Browser consumers all expect this proxy to expose an array.
      return res.status(200).json(parseResortsPayload(data));
    }

    if (req.method === "POST") {
      const apiBase = getServerApiBase();
      const r = await fetch(`${apiBase}/api/admin/resorts/`, {
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
