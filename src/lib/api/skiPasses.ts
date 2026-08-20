import { adminFetch } from "@/lib/adminApi";
import type { SkiPassAdminResponse, SkiPassSeason } from "@/types/skiPass";

const endpoint = (slug: string) => `${"/api"}/admin/stations/${encodeURIComponent(slug)}/ski-passes`;

async function errorMessage(response: Response) {
  const body = await response.clone().json().catch(() => null);
  return body?.message || body?.error || `Erreur HTTP ${response.status}`;
}

export async function getAdminSkiPasses(slug: string): Promise<SkiPassAdminResponse> {
  const response = await adminFetch(endpoint(slug), { cache: "no-store" });
  if (!response.ok) throw new Error(await errorMessage(response));
  const body = await response.json();
  if (!body || !Array.isArray(body.seasons)) throw new Error("Réponse forfaits invalide : seasons est absent.");
  return body;
}

export async function saveAdminSkiPassSeason(slug: string, season: SkiPassSeason): Promise<void> {
  if (!season.id) throw new Error("Impossible d’enregistrer une saison sans identifiant DB.");
  const response = await adminFetch(`${endpoint(slug)}/${encodeURIComponent(String(season.id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(season),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const body = await response.json().catch(() => null);
  if (body?.success !== true) throw new Error(body?.message || "Le backend n’a pas confirmé la sauvegarde.");
}

export async function setAdminSkiPassSeasonActive(slug: string, seasonId: string | number, isActive: boolean): Promise<void> {
  const response = await adminFetch(`${endpoint(slug)}/${encodeURIComponent(String(seasonId))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const body = await response.json().catch(() => null);
  if (body?.success !== true) throw new Error(body?.message || "Le backend n’a pas confirmé la modification de l’affichage public.");
}
