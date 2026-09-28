import type { NewsletterLanguage, NewsletterPreferencesData, NewsletterSource, SnowAlert, StationPreference, StationSummary } from "@/types/newsletter";
import { ADMIN_API_BASE } from "@/lib/adminApi";

export class NewsletterApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } }); }
  catch { throw new NewsletterApiError(0, "network", "network"); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new NewsletterApiError(response.status, String(data.code || data.error || "request_failed"), String(data.message || data.detail || "request_failed"));
  return data as T;
}
const root = "/api/newsletter";
const resource = (token: string, suffix = "") => `${root}/preferences/${encodeURIComponent(token)}${suffix}`;
export const newsletterApi = {
 subscribe: (body: { email: string; language: NewsletterLanguage; source: NewsletterSource; consent: boolean; station_id?: string | number }) => request<{ token?: string; preferences_url?: string }>(`${ADMIN_API_BASE}${root}/subscribe/`, { method: "POST", body: JSON.stringify(body) }),
  updatePreferences: (token: string, body: { preferences: Record<string, boolean>; frequency: string }) => request<NewsletterPreferencesData>(resource(token), { method: "PUT", body: JSON.stringify(body) }),
  addStation: (token: string, station_id: string | number) => request<StationPreference>(resource(token, "/stations/"), { method: "POST", body: JSON.stringify({ station_id }) }),
  updateStation: (token: string, stationId: string | number, body: Pick<StationPreference, "weather" | "snow_conditions" | "resort_updates" | "weather_frequency">) => request<StationPreference>(resource(token, `/stations/${encodeURIComponent(stationId)}/`), { method: "PUT", body: JSON.stringify(body) }),
  removeStation: (token: string, stationId: string | number) => request<{ preferences?: NewsletterPreferencesData }>(resource(token, `/stations/${encodeURIComponent(stationId)}/`), { method: "DELETE" }),
  createAlert: (token: string, body: Omit<SnowAlert, "id" | "station">) => request<SnowAlert>(resource(token, "/alerts/"), { method: "POST", body: JSON.stringify(body) }),
  updateAlert: (token: string, id: string | number, body: Partial<SnowAlert>) => request<SnowAlert>(resource(token, `/alerts/${encodeURIComponent(id)}/`), { method: "PUT", body: JSON.stringify(body) }),
  removeAlert: (token: string, id: string | number) => request<void>(resource(token, `/alerts/${encodeURIComponent(id)}/`), { method: "DELETE" }),
  unsubscribe: (token: string) => request<{ status?: string }>(`${root}/unsubscribe/${encodeURIComponent(token)}`, { method: "POST" }),
  searchStations: async (query: string) => {
    const rows = await request<any[]>(`/api/ski/resorts/?q=${encodeURIComponent(query)}`);
    return rows.slice(0, 6).map((row): StationSummary => ({ id: row.id, name: row.name, slug: row.slug })).filter((row) => row.id != null && row.name);
  }
};
