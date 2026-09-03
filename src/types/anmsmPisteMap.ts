export type PisteMapWarning = { code: string; message: string; blocking: boolean };
export type PisteMapMapping = { station_id: string; station_name: string; station_slug: string | null };
export type PisteMapSuggestion = PisteMapMapping & { score: number; match_type: string };
export type PisteMapCandidate = {
  candidate_id: number; checksum: string; display_url: string | null; width: number | null;
  height: number | null; size_bytes: number | null; status: "ready" | "published" | "error";
  credit: string | null; error_message: string | null; warnings: PisteMapWarning[];
};
export type PisteMapRow = {
  external_station_id: string; external_station_name: string; external_map_id: string;
  title: string; map_type: string | null; source_url: string | null; source_checksum: string | null;
  preparation_required: boolean; mapping: PisteMapMapping | null; suggestion: PisteMapSuggestion | null;
  candidate: PisteMapCandidate | null; candidate_id: number | null; candidate_status: "pending" | "approved" | "error" | null;
  current_map_url: string | null; current_map_width: number | null; current_map_height: number | null;
  current_map_size_bytes: number | null; current_map_credit: string | null; warnings: PisteMapWarning[];
};
export type PisteMapStats = { maps_to_review: number; maps_to_prepare: number; stations_to_map: number; maps_published: number; maps_missing: number; errors: number };
export type PisteMapWorkspace = { rows: PisteMapRow[]; stats: PisteMapStats; contractError: string | null };
export type PisteMapBulkResult = { requested: number; succeeded: number; failed: number; results: Array<{ candidate_id: number; ok: boolean; error?: string }> };
export type PisteMapResort = { station_id: string; station_name: string; station_slug?: string | null };
