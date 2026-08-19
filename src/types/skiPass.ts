export type SkiPassPrice = {
  id?: number | string;
  period_id?: number | string;
  category: string;
  category_label: string;
  price_type: "fixed" | "dynamic";
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  label?: string | null;
};

export type SkiPassProduct = {
  id?: number | string;
  name: string;
  duration_days: number | null;
  duration_label: string;
  sort_order: number;
  prices: SkiPassPrice[];
};

export type SkiPassPeriod = {
  id?: number | string;
  name?: string | null;
  start_date: string;
  end_date: string;
  sort_order: number;
};

export type SkiPassSeason = {
  id: number | string;
  season: string;
  currency: string;
  source_url?: string | null;
  periods: SkiPassPeriod[];
  passes: SkiPassProduct[];
};

export type SkiPassAdminResponse = { seasons: SkiPassSeason[] };

export type SkiPassImportResult = {
  success: true;
  station_slug: string;
  season: string;
  periods_count: number;
  passes_count: number;
  prices_count: number;
  message?: string;
};
