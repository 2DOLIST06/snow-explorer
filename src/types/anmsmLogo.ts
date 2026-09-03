export type AnmsmLogoStatus = "pending" | "updated" | "approved" | "ignored" | "processing" | "error";
export type AnmsmLogoAlertCode = "extreme_horizontal_ratio" | "extreme_vertical_ratio" | "low_visual_occupancy" | "large_transparent_margins" | "low_source_resolution" | "source_over_size_limit" | "optimized_file_over_50kb" | "download_failed" | "unsupported_format" | "conversion_failed" | "transparency_lost" | "station_mapping_required" | "s3_upload_failed";
export type AnmsmLogoAlert = { code: AnmsmLogoAlertCode | string; blocking?: boolean; message?: string };
export type AnmsmLogoVersion = { id: string; url?: string | null; created_at?: string | null; status?: string; checksum?: string | null };
export type AnmsmLogoCandidate = { id: string; station_id?: string | number | null; station_name?: string | null; station_slug?: string | null; anmsm_station_id?: string | number | null; anmsm_title?: string | null; credit?: string | null; current_logo_url?: string | null; optimized_logo_url?: string | null; source_logo_url?: string | null; original_format?: string | null; original_width?: number | null; original_height?: number | null; final_width?: number | null; final_height?: number | null; original_size_bytes?: number | null; optimized_size_bytes?: number | null; aspect_ratio?: number | null; visual_occupancy?: number | null; checksum?: string | null; alerts?: Array<AnmsmLogoAlert | string>; status: AnmsmLogoStatus | string; first_detected_at?: string | null; last_checked_at?: string | null; anmsm_modified_at?: string | null; technical_error?: string | null; versions?: AnmsmLogoVersion[]; can_restore?: boolean };
export type AnmsmLogoFilters = { search?: string; status?: string; category?: string; sort?: string; page?: number; per_page?: number };
export type AnmsmLogoList = { items: AnmsmLogoCandidate[]; page: number; per_page: number; total: number; pages: number };
export type AnmsmSelection = { candidate_ids: string[]; total: number };
export type AnmsmActionFailure = { candidate_id: string; station_name?: string; error: string };
export type AnmsmBulkResult = { requested: number; succeeded: number; failed: number; failures: AnmsmActionFailure[] };
export type AnmsmSyncStats = { stations_received?: number; stations_matched?: number; stations_unmatched?: number; logos_created?: number; logos_updated?: number; logos_unchanged?: number; stations_without_logo?: number; conversions_succeeded?: number; errors?: number; duration_seconds?: number };
export type AnmsmSyncResult = { ok: boolean; stats?: AnmsmSyncStats; already_running?: boolean };

export type AnmsmResort = { id: string | number; name: string; slug?: string | null; linked_anmsm_station_id?: string | number | null };
export type AnmsmStationMapping = {
  anmsm_station_id: string | number;
  anmsm_station_name: string;
  anmsm_logo_url?: string | null;
  resort?: AnmsmResort | null;
  suggested_resort?: AnmsmResort | null;
  suggestion_type?: "exact" | "approximate" | string | null;
  suggestion_score?: number | null;
  status?: "matched" | "unmatched" | string;
};
export type AnmsmMappingStats = { stations_received: number; stations_matched: number; stations_unmatched: number; stations_without_logo: number };
export type AnmsmMappingList = { items: AnmsmStationMapping[]; stats: AnmsmMappingStats; page: number; per_page: number; total: number; pages: number };
export type AnmsmMappingFailure = { anmsm_station_id: string | number; error: string };
export type AnmsmMappingResult = { requested: number; succeeded: number; failed: number; failures?: AnmsmMappingFailure[] };
