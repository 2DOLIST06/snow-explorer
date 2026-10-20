import { adminFetch } from "@/lib/adminApi";
export async function activitiesApi<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await adminFetch(`/api/admin/${path}`, { method, ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `Erreur ${response.status} (${payload.error || "serveur"})`);
  return payload;
}
