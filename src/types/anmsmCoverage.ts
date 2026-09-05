export type CoverageMappingStatus = "matched" | "unmatched" | "mapping_error";
export type CoverageAvailabilityStatus = "available" | "unavailable" | "unknown";
export type CoverageWorkflowStatus = "published" | "ready_to_review" | "to_prepare" | "available_not_imported" | "missing_from_anmsm" | "error" | "unknown";

export interface CoverageResource {
  supported?: boolean | null; available_from_anmsm?: boolean | null; availability_status?: CoverageAvailabilityStatus | null;
  workflow_status?: CoverageWorkflowStatus | null; candidate_id?: string | number | null; candidate_status?: string | null;
  current_published_url?: string | null; candidate_original_url?: string | null; candidate_preview_url?: string | null;
  preparation_required?: boolean | null; error?: string | null; published_source?: string | null;
  needs_station_contact?: boolean | null; contact_reason?: string | null;
}
export interface SnowExplorerCoverageStation {
  station_id: string | number; station_name: string; station_slug?: string | null; station_is_active?: boolean | null;
  anmsm_external_station_id?: string | null; anmsm_station_name?: string | null; mapping_status?: CoverageMappingStatus | null;
  mapping_validated?: boolean | null; last_anmsm_sync_at?: string | null; coverage_status?: string | null;
  needs_station_contact?: boolean | null; needs_availability_control?: boolean | null; missing_resource_types?: Array<"logo" | "piste_map"> | null;
  resources: { logo: CoverageResource; piste_map: CoverageResource };
}
export interface AnmsmOnlyCoverageStation {
  anmsm_external_station_id: string; anmsm_station_name: string; anmsm_station_slug?: string | null; last_seen_at?: string | null;
  logo_available?: boolean | null; piste_map_available?: boolean | null; suggestion?: Record<string, unknown> | string | null; status?: string | null;
}
export interface CoveragePagination { page: number; page_size: number; total: number; total_pages: number }
export interface AnmsmCoverageResponse {
  snow_explorer_stations: SnowExplorerCoverageStation[]; anmsm_only_stations: AnmsmOnlyCoverageStation[];
  stats: Record<string, number>; snow_explorer_pagination: CoveragePagination; anmsm_only_pagination: CoveragePagination;
}
export type CoverageTab = "snow_explorer" | "anmsm_only";
export type CoverageFilter = "all" | "needs_contact" | "availability_control" | "unmatched" | "missing_logo" | "missing_piste_map" | "available_anmsm" | "to_prepare" | "ready_to_review" | "published" | "error" | "active" | "inactive";
export type CoverageSort = "business" | "name_asc" | "name_desc" | "missing_resources" | "coverage_status";
export interface CoverageQuery { tab: CoverageTab; search: string; filter: CoverageFilter; sort: CoverageSort; page: number; page_size: number }
