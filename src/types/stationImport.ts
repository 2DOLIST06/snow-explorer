export type ImportChangeAction = "add" | "update" | "clear" | "unchanged";

export interface ImportMessage { code: string; path?: string; message: string; blocking?: boolean }
export interface ImportChange { path: string; old_value: unknown; new_value: unknown; action: ImportChangeAction }
export interface ImportTarget { id: string; slug: string; name: string }

export interface StationImportPreview {
  valid: boolean;
  schema_version: string;
  target: ImportTarget;
  changes: ImportChange[];
  unchanged_fields: string[];
  warnings: ImportMessage[];
  errors: ImportMessage[];
  conflicts?: ImportMessage[];
  preview_token?: string;
}

export interface ImportResult { success: boolean; updated_fields: string[]; message?: string }
export type BulkTransaction = "atomic" | "valid_only";
export interface BulkImportOptions { create_missing: boolean; transaction: BulkTransaction }
export type BulkStationStatus = "update" | "create" | "unchanged" | "error";
export interface BulkStationPreview extends StationImportPreview { status: BulkStationStatus; previous_identity?: ImportTarget; new_identity?: ImportTarget }
export interface BulkImportSummary { total: number; existing: number; updates: number; missing: number; creations: number; unchanged: number; errors: number; changed_fields: number }
export interface BulkImportPreview { valid: boolean; schema_version: string; summary: BulkImportSummary; stations: BulkStationPreview[]; warnings: ImportMessage[]; errors: ImportMessage[]; preview_token?: string }
export interface BulkImportResult { success: boolean; summary: BulkImportSummary; stations: BulkStationPreview[]; message?: string }

export interface ImportHistoryFilters { date_from?: string; date_to?: string; administrator?: string; status?: string; type?: "single" | "bulk"; station?: string }
export interface ImportHistoryItem { id: string; created_at: string; administrator: string; type: "single" | "bulk"; filename: string; status: string; stations_analyzed: number; stations_updated: number; stations_created: number; stations_skipped: number; errors_count: number }
export interface ImportHistoryResponse { items: ImportHistoryItem[]; total?: number }
export interface ImportHistoryDetail extends ImportHistoryItem { checksum?: string; changes: ImportChange[]; errors: ImportMessage[]; warnings: ImportMessage[]; stations: ImportTarget[]; rollback_preview_available?: boolean }
