export interface ImportMessage { code: string; path?: string; message: string; blocking?: boolean }
export type ImportChange = {
  action: "add" | "update" | "clear" | "unchanged";
  new_value: unknown;
  old_value: unknown;
  path: string;
};
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
export type StationImportPreviewItem = {
  id: string | null;
  name: string;
  slug: string;
  status: "create" | "update" | "unchanged" | "error";
  changes: ImportChange[];
};
export type StationImportPreviewResponse = {
  checksum: string;
  errors: unknown[];
  preview_token: string;
  stations: StationImportPreviewItem[];
  summary: {
    errors: number;
    existing: number;
    missing: number;
    total: number;
    unchanged: number;
  };
  valid: boolean;
  warnings: unknown[];
};
export interface BulkImportSummary { total: number; existing: number; updates: number; missing: number; creations: number; unchanged: number; errors: number; changed_fields: number }
export type BulkImportPreview = StationImportPreviewResponse;
export interface BulkImportResult { success: boolean; summary: BulkImportSummary; stations: StationImportPreviewItem[]; message?: string }

export interface ImportHistoryFilters { date_from?: string; date_to?: string; administrator?: string; status?: string; type?: "single" | "bulk"; station?: string }
export interface ImportHistoryItem { id: string; created_at: string; administrator: string; type: "single" | "bulk"; filename: string; status: string; stations_analyzed: number; stations_updated: number; stations_created: number; stations_skipped: number; errors_count: number }
export interface ImportHistoryResponse { items: ImportHistoryItem[]; total?: number }
export interface ImportHistoryDetail extends ImportHistoryItem { checksum?: string; changes: ImportChange[]; errors: ImportMessage[]; warnings: ImportMessage[]; stations: ImportTarget[]; rollback_preview_available?: boolean }
