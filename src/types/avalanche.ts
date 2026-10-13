export type AvalancheMassif = {
  id: number;
  name: string;
  mapping_method: string | null;
};

export type AvalancheRisk = {
  level: number | null;
  label: string | null;
  valid_from: string | null;
  valid_until: string | null;
  issued_at: string | null;
  summary: string | null;
};

export type AvalancheSource = { provider: string; label: string | null; scope: 'massif' };
export type AvalancheAssets = {
  bulletin_pdf_available: boolean;
  risk_image_available: boolean;
  current: boolean;
};
export type AvalancheDisplay = { title: string | null; disclaimer: string | null };
export type StationAvalancheRiskResponse = {
  station: { slug: string; name: string };
  status: 'available' | 'unavailable';
  mapping_status: 'confirmed' | 'ambiguous' | 'unmapped' | null;
  massif: AvalancheMassif | null;
  risk: AvalancheRisk;
  source: AvalancheSource;
  assets: AvalancheAssets;
  unavailable_reason: 'season_ended' | 'no_massif' | 'ambiguous_massif' | 'upstream_unavailable' | 'unsupported_bulletin_schema' | string | null;
  display: AvalancheDisplay;
};
