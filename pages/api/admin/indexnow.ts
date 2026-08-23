import type { NextApiRequest, NextApiResponse } from "next";
import { timingSafeEqual } from "node:crypto";
import { getServerApiBase } from "@/lib/api/resorts";
import {
  getIndexNowUrls,
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  INDEXNOW_MAX_URLS,
} from "@/lib/indexNow";

function tokensMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function isAuthenticatedAdmin(req: NextApiRequest): Promise<boolean> {
  const cookie = req.headers.cookie;
  const csrf = req.headers["x-csrf-token"];
  if (!cookie || typeof csrf !== "string") return false;

  const adminSessionPath = ["", "api", "admin", "auth", "session"].join("/");
  const response = await fetch(`${getServerApiBase()}${adminSessionPath}`, {
    headers: { accept: "application/json", cookie },
    cache: "no-store",
  });
  if (!response.ok) return false;
  const session = await response.json();
  return session?.authenticated === true && typeof session?.csrf_token === "string" && tokensMatch(session.csrf_token, csrf);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    if (!(await isAuthenticatedAdmin(req))) return res.status(401).json({ error: "unauthorized" });
  } catch {
    return res.status(503).json({ error: "admin_session_unavailable" });
  }

  const urls = getIndexNowUrls(req.body?.urls);
  if (urls.length === 0) return res.status(400).json({ error: "no_valid_urls" });
  if (urls.length > INDEXNOW_MAX_URLS) return res.status(400).json({ error: "too_many_urls", limit: INDEXNOW_MAX_URLS });

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList: urls,
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      return res.status(502).json({ error: "indexnow_rejected", status: response.status, detail });
    }
    return res.status(200).json({ submitted: urls.length });
  } catch {
    return res.status(502).json({ error: "indexnow_unavailable" });
  }
}
