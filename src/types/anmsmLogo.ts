export type AnmsmLogoAlert = { code: string; blocking?: boolean; message?: string };

/** The deployed workspace contract. Snake case is deliberately kept here. */
export type ApiAnmsmCandidate = {
  candidate_id: number;
  checksum: string;
  candidate_preview_url: string | null;
  optimized_size_bytes: number | null;
  warnings: AnmsmLogoAlert[];
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
  mapping: ApiAnmsmMapping | null;
  suggestion: ApiAnmsmSuggestion | null;
  candidate: ApiAnmsmCandidate | null;
};

export type ApiAnmsmWorkspace = {
  items: ApiAnmsmWorkspaceItem[];
  stats: {
    stations_received: number;
    stations_matched: number;
    stations_unmatched: number;
    logos_to_review: number;
    logos_published: number;
    errors: number;
  };
};

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
