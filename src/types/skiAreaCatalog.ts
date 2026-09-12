export type CatalogStationState = "matched" | "missing" | "candidate" | "optional_detail" | "conflict";
export type ExpectationState = "pending" | "needs_review" | "optional_detail" | "linked" | "ignored";

export interface CatalogPreview {
  schema_version: string; catalog_id: string; batch_id: string; sha256: string;
  size_bytes: number; non_exhaustive: boolean; counts: Record<string, number>;
  areas: Array<{ catalog_key: string; name: string; proposed_slug: string; state: "new" | "mapped" | "collision"; ski_area_id: number | null; collision_ski_area_id: number | null }>;
  stations: Array<{ station_ref: string; name: string; state: CatalogStationState; resort_id: string | null; is_active: boolean | null; reason_or_candidates: unknown }>;
  review_proposals: unknown[]; alerts: unknown[];
}

export interface ExpectationSource { publisher: string; url: string; publication_date: string | null; checked_on: string | null }
export interface ExpectedMembership { id: number; catalog_key: string; ski_area_id: number | null; area_name: string; area_kind: string; notes: string | null; sources: ExpectationSource[]; evidence_status: string; relation_kind: string; state: string; decision_origin: string; decision_note: string | null }
export interface CatalogExpectation {
  id: number; catalog_id: string; station_ref: string; name: string; country_code: string | null; department: string | null;
  aliases: string[]; origin_resolution: string; covered_by_resort_ids: string[]; resort_id: string | null;
  resolution_state: ExpectationState; resolution_note: string | null; expected_memberships: ExpectedMembership[];
}
export interface CatalogPagination { page: number; per_page: number; total: number; pages: number }
export interface CatalogImport { id: string; catalog_id: string; batch_id: string; schema_version?: string; status: string; sha256: string; created_at?: string; applied_at: string; preview?: CatalogPreview; result: Record<string, unknown> }
