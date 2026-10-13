import type { StationAvalancheRiskResponse } from '@/types/avalanche';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Treat incomplete and unknown upstream values as unavailable. Never infer a label. */
export function normalizeAvalancheRisk(payload: unknown): StationAvalancheRiskResponse {
  const data = record(payload);
  const station = record(data.station);
  const massif = record(data.massif);
  const risk = record(data.risk);
  const assets = record(data.assets);
  const display = record(data.display);
  const source = record(data.source);
  const mapping = data.mapping_status;
  return {
    station: { slug: text(station.slug) ?? '', name: text(station.name) ?? '' },
    status: data.status === 'available' ? 'available' : 'unavailable',
    mapping_status: mapping === 'confirmed' || mapping === 'ambiguous' || mapping === 'unmapped' ? mapping : null,
    massif: typeof massif.id === 'number' && Number.isFinite(massif.id) && text(massif.name)
      ? { id: massif.id, name: text(massif.name)!, mapping_method: text(massif.mapping_method) } : null,
    risk: {
      level: typeof risk.level === 'number' && Number.isInteger(risk.level) && risk.level >= 1 && risk.level <= 5 ? risk.level : null,
      label: text(risk.label), valid_from: text(risk.valid_from), valid_until: text(risk.valid_until),
      issued_at: text(risk.issued_at), summary: text(risk.summary),
    },
    source: { provider: 'Météo-France', label: text(source.label), scope: 'massif' },
    assets: { bulletin_pdf_available: assets.bulletin_pdf_available === true, risk_image_available: assets.risk_image_available === true, current: assets.current === true },
    unavailable_reason: text(data.unavailable_reason),
    display: { title: text(display.title), disclaimer: text(display.disclaimer) },
  };
}

export function hasIdentifiedMassif(data: StationAvalancheRiskResponse): boolean {
  return data.massif !== null && data.mapping_status !== 'unmapped' && data.mapping_status !== 'ambiguous'
    && data.unavailable_reason !== 'no_massif' && data.unavailable_reason !== 'ambiguous_massif';
}
export function hasAvailableRisk(data: StationAvalancheRiskResponse): boolean {
  return hasIdentifiedMassif(data) && data.status === 'available'
    && Number.isInteger(data.risk.level) && data.risk.level !== null && data.risk.level >= 1 && data.risk.level <= 5
    && typeof data.risk.label === 'string' && data.risk.label.trim().length > 0;
}
export function hasCurrentBulletinPdf(data: StationAvalancheRiskResponse): boolean {
  return hasAvailableRisk(data) && data.assets.bulletin_pdf_available === true && data.assets.current === true;
}

export async function fetchStationAvalancheRisk(slug: string, signal?: AbortSignal): Promise<StationAvalancheRiskResponse> {
  const response = await fetch(`/api/stations/${encodeURIComponent(slug)}/avalanche-risk`, {
    signal, cache: 'no-store', headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Bulletin indisponible');
  const data = normalizeAvalancheRisk(await response.json());
  if (data.station.slug !== slug) throw new Error('Bulletin indisponible');
  return data;
}
