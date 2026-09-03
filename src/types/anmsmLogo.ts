export type AnmsmLogoStatus = "pending" | "updated" | "approved" | "ignored" | "processing" | "error";
export type AnmsmLogoAlertCode = "extreme_horizontal_ratio" | "extreme_vertical_ratio" | "low_visual_occupancy" | "large_transparent_margins" | "low_source_resolution" | "source_over_size_limit" | "optimized_file_over_50kb" | "download_failed" | "unsupported_format" | "conversion_failed" | "transparency_lost" | "station_mapping_required" | "s3_upload_failed";
export type AnmsmLogoAlert = { code: AnmsmLogoAlertCode | string; blocking?: boolean; message?: string };
export type ApiLogoVersion = { id: string; url?: string | null; created_at?: string | null; status?: string; checksum?: string | null };
export type AnmsmLogoVersion = { id: string; url?: string | null; createdAt?: string | null; status?: string; checksum?: string | null };

/** Raw contract returned by the Flask API. UI code must never consume this type directly. */
export type ApiLogoCandidate = {
  id: string;
  station_id?: string | number | null; station_name?: string | null; station_slug?: string | null; external_station_id?: string | number | null;
  anmsm_media_id?: string | number | null; anmsm_title?: string | null; anmsm_credit?: string | null;
  source_url?: string | null; source_format?: string | null; source_width?: number | null; source_height?: number | null; source_size_bytes?: number | null; source_checksum?: string | null;
  optimized_url?: string | null; optimized_s3_key?: string | null; optimized_width?: number | null; optimized_height?: number | null; optimized_size_bytes?: number | null;
  content_width?: number | null; content_height?: number | null; aspect_ratio?: number | null; visual_occupancy_width?: number | null; visual_occupancy_height?: number | null;
  current_logo_url?: string | null; previous_logo_url?: string | null; detected_at?: string | null; checked_at?: string | null;
  status: AnmsmLogoStatus | string; warnings?: Array<AnmsmLogoAlert | string> | null; alerts?: Array<AnmsmLogoAlert | string> | null;
  error_code?: string | null; error_message?: string | null; versions?: ApiLogoVersion[]; can_restore?: boolean;
};

export type AnmsmLogoCandidate = {
  id: string;
  stationId?: string | number | null; stationName?: string | null; stationSlug?: string | null; externalStationId?: string | number | null;
  anmsmMediaId?: string | number | null; anmsmTitle?: string | null; anmsmCredit?: string | null;
  sourceUrl?: string | null; sourceFormat?: string | null; sourceWidth?: number | null; sourceHeight?: number | null; sourceSizeBytes?: number | null; sourceChecksum?: string | null;
  optimizedUrl?: string | null; optimizedS3Key?: string | null; optimizedWidth?: number | null; optimizedHeight?: number | null; optimizedSizeBytes?: number | null;
  contentWidth?: number | null; contentHeight?: number | null; aspectRatio?: number | null; visualOccupancyWidth?: number | null; visualOccupancyHeight?: number | null;
  currentLogoUrl: string | null; previousLogoUrl: string | null; detectedAt?: string | null; checkedAt?: string | null;
  status: AnmsmLogoStatus | string; warnings: Array<AnmsmLogoAlert | string>; errorCode?: string | null; errorMessage?: string | null;
  versions?: AnmsmLogoVersion[]; canRestore?: boolean;
};
export type AnmsmLogoFilters = { search?: string; status?: string; category?: string; sort?: string; page?: number; per_page?: number };
export type ApiLogoList = { items: ApiLogoCandidate[]; page: number; per_page: number; total: number; pages: number };
export type AnmsmLogoList = { items: AnmsmLogoCandidate[]; page: number; perPage: number; total: number; pages: number };
export type AnmsmSelection = { candidate_ids: string[]; total: number };
export type AnmsmActionFailure = { candidate_id: string; station_name?: string; error: string };
export type AnmsmBulkResult = { requested: number; succeeded: number; failed: number; failures: AnmsmActionFailure[] };
export type AnmsmSyncStats = { stations_received?: number; stations_matched?: number; stations_unmatched?: number; logos_created?: number; logos_updated?: number; logos_unchanged?: number; stations_without_logo?: number; conversions_succeeded?: number; errors?: number; duration_seconds?: number };
export type AnmsmSyncFailure = { station_id?: string | number | null; station_name?: string | null; external_station_id?: string | number | null; error?: string; message?: string };
export type AnmsmSyncBatch = { processed: number; total: number; has_more: boolean; next_cursor: string | null };
export type AnmsmSyncResult = { ok: boolean; message?: string; stats?: AnmsmSyncStats; batch: AnmsmSyncBatch; errors?: AnmsmSyncFailure[]; failures?: AnmsmSyncFailure[]; already_running?: boolean };

export type AnmsmResort = { id: string | number; name: string; slug?: string | null; linked_anmsm_station_id?: string | number | null };
export type ApiMappingSuggestion = { match_type: string; name: string; score: number; slug: string; station_id: string };
export type ApiStationMappingItem = { external_name: string; external_station_id: string; logo: { credit: string | null; title: string | null; url: string | null } | null; mapping: unknown | null; suggestions: ApiMappingSuggestion[] };
export type ApiStationMappingsResponse = { ok: boolean; items: ApiStationMappingItem[]; pagination: { page: number; pages: number; per_page: number; total: number }; stats: { matched: number; received: number; unmatched: number; without_logo: number } };
export type AnmsmMappingSuggestion = { matchType: string; name: string; score: number; slug: string; stationId: string };
export type AnmsmStationMapping = { externalName: string; externalStationId: string; logo: { credit: string | null; title: string | null; url: string | null } | null; mapping: unknown | null; suggestions: AnmsmMappingSuggestion[] };
export type AnmsmMappingStats = { matched: number; received: number; unmatched: number; withoutLogo: number };
export type AnmsmMappingList = { ok: boolean; items: AnmsmStationMapping[]; stats: AnmsmMappingStats; pagination: { page: number; totalPages: number; perPage: number; total: number } };
export type AnmsmMappingPayload = { external_station_id: string | number; station_id: string | number };
export type AnmsmMappingLineResult = { ok: boolean; external_station_id: string | number; station_id: string | number; error?: string };
export type AnmsmMappingResult = { ok: boolean; results?: AnmsmMappingLineResult[] };
