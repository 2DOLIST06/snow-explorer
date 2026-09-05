import type { AnmsmCoverageResponse, CoverageAvailabilityStatus, CoveragePagination, CoverageWorkflowStatus, SnowExplorerCoverageStation } from "@/types/anmsmCoverage";

const mappings = new Set(["matched", "unmatched", "mapping_error"]), availability = new Set(["available", "unavailable", "unknown"]), workflows = new Set(["published", "ready_to_review", "to_prepare", "available_not_imported", "missing_from_anmsm", "error", "unknown"]);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const validInt = (v: unknown, min: number) => typeof v === "number" && Number.isInteger(v) && v >= min;
const pagination = (v: unknown, fallbackTotal: number): CoveragePagination => {
  if (v == null) return { page: 1, page_size: fallbackTotal, total: fallbackTotal, total_pages: fallbackTotal ? 1 : 0 };
  if (!object(v)) throw new Error("Pagination absente ou invalide");
  const page = v.page, pageSize = v.page_size ?? v.per_page, total = v.total, totalPages = v.total_pages ?? v.pages;
  if (!validInt(page, 1) || !validInt(pageSize, 1) || !validInt(total, 0) || !validInt(totalPages, 0)) throw new Error("Nombres de pagination invalides");
  return { page: page as number, page_size: pageSize as number, total: total as number, total_pages: (totalPages as number) || (fallbackTotal ? 1 : 0) };
};
const resource = (v: unknown) => {
  if (!object(v)) throw new Error("Objet de ressource absent");
  if (v.availability_status != null && !availability.has(String(v.availability_status))) throw new Error("Statut de disponibilité non supporté");
  if (v.workflow_status != null && !workflows.has(String(v.workflow_status))) throw new Error("Statut de workflow non supporté");
  return v;
};
export function validateCoverageResponse(payload: unknown): AnmsmCoverageResponse {
  if (!object(payload) || !object(payload.stats) || !Array.isArray(payload.snow_explorer_stations) || !Array.isArray(payload.anmsm_only_stations)) throw new Error("Format de réponse invalide : stats ou collections absentes");
  const stats = Object.fromEntries(Object.entries(payload.stats).filter(([, value]) => typeof value === "number" && Number.isFinite(value))) as Record<string, number>;
  if (Object.keys(stats).length !== Object.keys(payload.stats).length) throw new Error("Format de réponse invalide : compteur non numérique");
  const snow = payload.snow_explorer_stations.map((raw) => { if (!object(raw) || !object(raw.resources)) throw new Error("Objet resources absent sur une station Snow Explorer"); if (raw.mapping_status != null && !mappings.has(String(raw.mapping_status))) throw new Error("Statut de mapping non supporté"); return { ...raw, resources: { logo: resource(raw.resources.logo), piste_map: resource(raw.resources.piste_map) } } as unknown as SnowExplorerCoverageStation; });
  const only = payload.anmsm_only_stations.map(raw => { if (!object(raw)) throw new Error("Station ANMSM invalide"); return raw as unknown as AnmsmCoverageResponse["anmsm_only_stations"][number]; });
  const paginationRoot = object(payload.pagination) ? payload.pagination : {};
  return { snow_explorer_stations: snow, anmsm_only_stations: only, stats, snow_explorer_pagination: pagination(payload.snow_explorer_pagination ?? paginationRoot.snow_explorer, snow.length), anmsm_only_pagination: pagination(payload.anmsm_only_pagination ?? paginationRoot.anmsm_only, only.length) };
}
export const mappingLabel = (v?: string | null) => ({ matched: "Associée", unmatched: "Non associée", mapping_error: "Erreur de correspondance" }[v || ""] || "Non renseigné");
export const availabilityLabel = (v?: CoverageAvailabilityStatus | null) => v ? ({ available: "Disponible chez ANMSM", unavailable: "Non disponible chez ANMSM", unknown: "Disponibilité inconnue" } satisfies Record<CoverageAvailabilityStatus, string>)[v] : "Non renseignée";
export const workflowLabel = (v?: CoverageWorkflowStatus | null) => v ? ({ published: "Publié", ready_to_review: "À vérifier", to_prepare: "À préparer", available_not_imported: "Disponible chez ANMSM", missing_from_anmsm: "Absent chez ANMSM", error: "Erreur", unknown: "Disponibilité inconnue" } satisfies Record<CoverageWorkflowStatus, string>)[v] : "Non renseigné";
export const requestLabel = (row: SnowExplorerCoverageStation) => { if (row.needs_station_contact === true) { const missing = new Set(row.missing_resource_types || []); if (missing.has("logo") && missing.has("piste_map")) return "Logo et plan des pistes à demander"; if (missing.has("logo")) return "Logo à demander"; if (missing.has("piste_map")) return "Plan des pistes à demander"; } return row.needs_availability_control === true ? "Disponibilité ANMSM à contrôler" : "Aucune demande"; };
/** Build only parameters explicitly supported by the coverage API contract. */
export const buildCoverageApiParams = () => new URLSearchParams();

/** CSV export is an existing, separate API contract; UI query state is never copied. */
export const buildCoverageExportApiParams = () => new URLSearchParams({ format: "csv" });
