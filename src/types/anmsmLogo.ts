export type AnmsmLogoAlert = { code: string; blocking?: boolean; message?: string };

/** The deployed workspace contract. Snake case is deliberately kept here. */
export type ApiAnmsmCandidate = {
  candidate_id: number;
  checksum: string;
  candidate_preview_url: string | null;
  optimized_size_bytes: number | null;
  warnings?: AnmsmLogoAlert[] | null;
  status: "ready" | "published" | "error";
  error_message: string | null;
};

export type ApiAnmsmMapping = {
  station_id: string;
  station_name: string;
  station_slug: string | null;
  current_logo_url: string | null;
  match_type: string;
};

export type ApiAnmsmSuggestion = {
  station_id: string;
  station_name: string;
  station_slug: string | null;
  score: number;
  match_type: string;
};

export type ApiAnmsmWorkspaceItem = {
  external_station_id: string;
  external_station_name: string;
  anmsm_logo_url: string | null;
  anmsm_logo_checksum: string | null;
  preparation_required: boolean;
  mapping?: ApiAnmsmMapping | null;
  suggestion?: ApiAnmsmSuggestion | null;
  candidate?: ApiAnmsmCandidate | null;
  candidate_id?: number | null;
  candidate_status?: "pending" | "approved" | "error" | null;
  candidate_preview_url?: string | null;
  station_id?: string | null;
  station_name?: string | null;
  current_logo_url?: string | null;
  warnings?: AnmsmLogoAlert[] | null;
};

export type ApiAnmsmWorkspace = {
  rows?: ApiAnmsmWorkspaceItem[] | null;
  stats?: Partial<AnmsmWorkspaceStats> | null;
};

export type AnmsmWorkspaceRow = Omit<ApiAnmsmWorkspaceItem, "candidate" | "mapping" | "suggestion"> & {
  mapping: ApiAnmsmMapping | null;
  suggestion: ApiAnmsmSuggestion | null;
  candidate: (Omit<ApiAnmsmCandidate, "warnings"> & { warnings: AnmsmLogoAlert[] }) | null;
  candidate_id: number | null;
  candidate_status: "pending" | "approved" | "error" | null;
  candidate_preview_url: string | null;
  station_id: string | null;
  station_name: string | null;
  current_logo_url: string | null;
  warnings: AnmsmLogoAlert[];
};

export type AnmsmWorkspaceStats = {
  stations_received: number;
  stations_matched: number;
  stations_unmatched: number;
  logos_available: number;
  logos_without_source: number;
  candidates_pending: number;
  candidates_approved: number;
  candidates_in_error: number;
  candidates_to_prepare: number;
};

export type AnmsmWorkspace = { rows: AnmsmWorkspaceRow[]; stats: AnmsmWorkspaceStats; contractError: string | null };

export type ApiAnmsmPrepareResult = { item: ApiAnmsmWorkspaceItem };
export type AnmsmMappingPayload = { external_station_id: string; station_id: string };
export type AnmsmMappingResult = { ok: boolean; results?: Array<{ ok: boolean; external_station_id: string; station_id: string; error?: string }> };
export type AnmsmResort = { station_id: string; station_name: string; station_slug?: string | null };
export type AnmsmBulkResult = {
  requested: number;
  succeeded: number;
  failed: number;
  results: Array<{ candidate_id: number; ok: boolean; error?: string }>;
};
