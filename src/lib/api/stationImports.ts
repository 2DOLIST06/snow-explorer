import api from "@/config/axios";
import type { AxiosError, AxiosResponse } from "axios";
import type { BulkImportOptions, BulkImportPreview, BulkImportResult, ImportHistoryDetail, ImportHistoryFilters, ImportHistoryResponse, ImportResult, StationImportPreview } from "@/types/stationImport";

export class AdminApiError extends Error { constructor(message: string, public status?: number, public code?: string) { super(message); this.name = "AdminApiError"; } }

function asApiError(error: unknown): AdminApiError {
  const e = error as AxiosError<{ message?: string; detail?: string; code?: string }>;
  const status = e.response?.status;
  const fallback = status === 401 ? "Votre session a expiré. Reconnectez-vous." : status === 403 ? "Vous n’avez pas accès à cette action." : status === 408 ? "La requête a expiré. Réessayez." : "Une erreur serveur est survenue.";
  if (process.env.NODE_ENV === "development") console.error("Administration imports", error);
  return new AdminApiError(e.response?.data?.message || e.response?.data?.detail || fallback, status, e.response?.data?.code);
}

async function request<T>(call: Promise<AxiosResponse<T>>): Promise<T> { try { return (await call).data; } catch (e) { throw asApiError(e); } }
const form = (file: File, extra: Record<string, string> = {}) => { const body = new FormData(); body.append("file", file, file.name); Object.entries(extra).forEach(([k, v]) => body.append(k, v)); return body; };

export const exportStationJson = (id: string) => request(api.get<Blob>(`/api/admin/stations/${encodeURIComponent(id)}/export`, { responseType: "blob" }));
export const exportAllStationsJson = () => request(api.get<Blob>("/api/admin/stations/export", { responseType: "blob" }));
export const downloadStationImportTemplate = () => request(api.get<Blob>("/api/admin/stations/import/template", { responseType: "blob" }));

// Download calls below retain headers, unlike the public Blob helpers above.
export async function getStationExportResponse(id: string) { try { return await api.get<Blob>(`/api/admin/stations/${encodeURIComponent(id)}/export`, { responseType: "blob" }); } catch (e) { throw asApiError(e); } }
export async function getAllStationsExportResponse() { try { return await api.get<Blob>("/api/admin/stations/export", { responseType: "blob" }); } catch (e) { throw asApiError(e); } }
export async function getTemplateResponse() { try { return await api.get<Blob>("/api/admin/stations/import/template", { responseType: "blob" }); } catch (e) { throw asApiError(e); } }
export const previewStationImport = (id: string, file: File) => request(api.post<StationImportPreview>(`/api/admin/stations/${encodeURIComponent(id)}/import/preview`, form(file)));
export const confirmStationImport = (id: string, file: File, previewToken: string) => request(api.post<ImportResult>(`/api/admin/stations/${encodeURIComponent(id)}/import/confirm`, form(file, { preview_token: previewToken })));
const optionFields = (o: BulkImportOptions) => ({ create_missing: String(o.create_missing), transaction: o.transaction });
export const previewBulkStationImport = (file: File, options: BulkImportOptions) => request(api.post<BulkImportPreview>("/api/admin/stations/import/preview", form(file, optionFields(options))));
export const confirmBulkStationImport = (file: File, previewToken: string, options: BulkImportOptions) => request(api.post<BulkImportResult>("/api/admin/stations/import/confirm", form(file, { ...optionFields(options), preview_token: previewToken })));
export const getImportHistory = (filters: ImportHistoryFilters = {}) => request(api.get<ImportHistoryResponse>("/api/admin/stations/import/history", { params: filters }));
export const getImportHistoryDetail = (id: string) => request(api.get<ImportHistoryDetail>(`/api/admin/stations/import/history/${encodeURIComponent(id)}`));

export function downloadBlobResponse(response: AxiosResponse<Blob>, fallback: string) {
  const disposition = String(response.headers["content-disposition"] || "");
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  let filename = fallback;
  try { filename = decodeURIComponent(utf?.[1] || plain?.[1] || fallback); } catch { filename = plain?.[1] || fallback; }
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
