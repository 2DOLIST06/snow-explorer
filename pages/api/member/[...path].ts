import type { NextApiRequest, NextApiResponse } from "next";
import { ADMIN_API_BASE } from "@/lib/adminApi";

const reads = new Set(["session", "newsletter/access", "newsletter/request", "newsletter/preferences", "newsletter/stations", "newsletter/settings"]);
const writes = new Set(["register", "login", "login-link", "login-link/consume", "login-link/resend", "logout", "password", "newsletter/start", "newsletter/login-link", "newsletter/account-link", "newsletter/draft", "newsletter/apply", "newsletter/request", "newsletter/subscribe", "newsletter/preferences", "newsletter/unsubscribe", "newsletter/stations", "newsletter/settings", "newsletter/follow"]);

/** Keep member cookies on the site's origin, including when Flask is on Render. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  const parts = req.query.path;
  if (!Array.isArray(parts) || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return res.status(404).json({ error: "not_found" });
  const path = parts.join("/");
  const writable = writes.has(path) || /^newsletter\/stations\/[A-Za-z0-9_-]+(?:\/remove)?$/.test(path);
  if (!(req.method === "GET" && reads.has(path)) && !(req.method === "POST" && writable)) {
    res.setHeader("Allow", reads.has(path) ? (writable ? "GET, POST" : "GET") : "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (req.method === "POST") {
    const origin = req.headers.origin;
    try {
      if (!origin || new URL(origin).host !== req.headers.host) throw new Error("origin");
    } catch { return res.status(403).json({ error: "origin_not_allowed" }); }
    if (!req.headers["content-type"]?.startsWith("application/json")) return res.status(415).json({ error: "invalid_request" });
    headers.Origin = origin;
    headers["Content-Type"] = "application/json";
    const csrf = req.headers["x-csrf-token"];
    if (typeof csrf === "string") headers["X-CSRF-Token"] = csrf;
  }
  // Flask decides whether forwarding headers are trusted for rate limiting.
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") headers["X-Forwarded-For"] = forwarded;
  const cookie = req.cookies.member_session;
  if (cookie && /^[A-Za-z0-9_-]+$/.test(cookie)) headers.Cookie = `member_session=${cookie}`;
  try {
    const base = new URL(ADMIN_API_BASE);
    if (base.host === req.headers.host) throw new Error("recursive_member_api");
    const upstream = await fetch(`${ADMIN_API_BASE}/api/member/${path}`, {
      method: req.method, headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
      ...(req.method === "POST" ? { body: JSON.stringify(req.body) } : {}),
    });
    const data = await upstream.json();
    const sessionCookie = upstream.headers.get("set-cookie");
    if (sessionCookie?.startsWith("member_session=")) {
      res.setHeader("Set-Cookie", sessionCookie.replace(/;\s*Domain=[^;]+/ig, "").replace(/;\s*SameSite=[^;]+/ig, "; SameSite=Lax"));
    }
    return res.status(upstream.status).json(data);
  } catch { return res.status(503).json({ error: "member_api_unavailable" }); }
}

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };
