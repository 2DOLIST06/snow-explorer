import { ADMIN_API_BASE } from "@/lib/adminApi";
import type { ApiDataResponse, NewsletterPreferencesData, NewsletterPreferencesUpdate, NewsletterSubscribePayload, NewsletterSubscribeResult, SnowAlert, SnowAlertInput, StationPreference, StationPreferenceUpdate, StationSummary } from "@/types/newsletter";

export class NewsletterApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${ADMIN_API_BASE}${path}`, { ...init, headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } }); }
  catch { throw new NewsletterApiError(0, "network", "network"); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new NewsletterApiError(response.status, String(data.code || data.error || "request_failed"), String(data.message || data.detail || "request_failed"));
  return data as T;
}
const root = "/api/newsletter";
const preferenceResource = (token: string, suffix = "") => `${root}/preferences/${encodeURIComponent(token)}${suffix}`;
const unwrap = <T,>(response: ApiDataResponse<T>): T => response.data;
export const newsletterApi = {
  subscribe: async (body: NewsletterSubscribePayload) => unwrap(await request<ApiDataResponse<NewsletterSubscribeResult>>(`${root}/subscribe`, { method: "POST", body: JSON.stringify(body) })),
  preferences: async (token: string) => unwrap(await request<ApiDataResponse<NewsletterPreferencesData>>(`${root}/preferences?token=${encodeURIComponent(token)}`)),
  updatePreferences: async (token: string, body: NewsletterPreferencesUpdate) => unwrap(await request<ApiDataResponse<NewsletterPreferencesData>>(`${root}/preferences?token=${encodeURIComponent(token)}`, { method: "PUT", body: JSON.stringify(body) })),
  addStation: async (token: string, station_id: string | number) => unwrap(await request<ApiDataResponse<StationPreference>>(preferenceResource(token, "/stations"), { method: "POST", body: JSON.stringify({ station_id }) })),
  updateStation: async (token: string, stationId: string | number, body: StationPreferenceUpdate) => unwrap(await request<ApiDataResponse<StationPreference>>(preferenceResource(token, `/stations/${encodeURIComponent(stationId)}`), { method: "PUT", body: JSON.stringify(body) })),
  removeStation: (token: string, stationId: string | number) => request<void>(preferenceResource(token, `/stations/${encodeURIComponent(stationId)}`), { method: "DELETE" }),
  createAlert: async (token: string, body: SnowAlertInput) => unwrap(await request<ApiDataResponse<SnowAlert>>(preferenceResource(token, "/alerts"), { method: "POST", body: JSON.stringify(body) })),
  updateAlert: async (token: string, id: string | number, body: Partial<SnowAlertInput>) => unwrap(await request<ApiDataResponse<SnowAlert>>(preferenceResource(token, `/alerts/${encodeURIComponent(id)}`), { method: "PUT", body: JSON.stringify(body) })),
  removeAlert: (token: string, id: string | number) => request<void>(preferenceResource(token, `/alerts/${encodeURIComponent(id)}`), { method: "DELETE" }),
  unsubscribe: (token: string) => request<ApiDataResponse<{ status: string }>>(`${root}/unsubscribe`, { method: "POST", body: JSON.stringify({ token }) }),
  searchStations: async (query: string) => {
    const response = await request<ApiDataResponse<StationSummary[]> | StationSummary[]>(`/api/stations/search?q=${encodeURIComponent(query)}`);
    const rows = Array.isArray(response) ? response : response.data;
    return rows.slice(0, 6);
  },
};
