// src/pages/api/ski/resorts/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import {
  getResortsApiUrl,
  getServerApiBase,
  parseResortsPayload,
} from "@/lib/api/resorts";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const q = (req.query.q ?? "").toString().trim();
      const url = getResortsApiUrl({
        query: q,
        server: true,
      });

      console.log("Resorts backend URL:", url);

      const r = await fetch(url);

      const responseText = await r.text();

      console.log("Resorts backend response:", {
        status: r.status,
        statusText: r.statusText,
        url,
        body: responseText,
      });

      let data: unknown = [];

      try {
        data = responseText ? JSON.parse(responseText) : [];
      } catch {
        data = {
          error: "invalid_json",
          raw: responseText,
        };
      }

      if (!r.ok) {
        return res.status(r.status).json(data);
      }

      return res.status(200).json(parseResortsPayload(data));
    }

    if (req.method === "POST") {
      const apiBase = getServerApiBase();

      const r = await fetch(`${apiBase}/api/admin/resorts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body || {}),
      });

      const data = await r.json().catch(() => ({}));

      return res.status(r.status).json(data);
    }

    res.setHeader("Allow", "GET, POST");

    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    console.error("Resorts proxy error:", e);

    return res.status(500).json({
      error: "proxy_error",
      detail: e?.message,
    });
  }
}
