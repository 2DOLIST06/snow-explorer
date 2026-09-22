export type SkiAreaStatus = "draft" | "published";

export type StationOption = {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string | null;
  logo_url: string | null;
  is_active?: boolean;
};

import type { SkiPassSeason } from "@/types/skiPass";

export type SkiAreaPublic = {
  id: number;
  name: string;
  slug: string;
  status: "published";
  description: string | null;
  cover_image_url: string | null;
  piste_map_url: string | null;
  altitude_min_m: number | null;
  altitude_max_m: number | null;
  ski_area_km: number | null;
  pistes_count: number | null;
  snowpark_name?: string | null;
  snowparks_count?: number | null;
  green_pistes_count: number | null;
  blue_pistes_count: number | null;
  red_pistes_count: number | null;
  black_pistes_count: number | null;
  lifts_count: number | null;
  forecast_open_date: string | null;
  forecast_close_date: string | null;
  season: string | null;
  ski_pass?: SkiPassSeason | null;
  updated_at: string;
  stations?: StationOption[];
};

export type SkiAreaAdmin = Omit<SkiAreaPublic, "status"> & {
  status: SkiAreaStatus;
  source: string | null;
  verified_at: string | null;
  created_at: string;
};

export type Pagination = { page: number; per_page: number; total: number; pages: number };
export type Paginated<T> = { items: T[]; pagination: Pagination };

export type SkiAreaWrite = {
  name: string;
  slug: string;
  status: SkiAreaStatus;
  description: string | null;
  cover_image_url: string | null;
  piste_map_url: string | null;
  altitude_min_m: number | null;
  altitude_max_m: number | null;
  ski_area_km: number | null;
  pistes_count: number | null;
  snowpark_name: string | null;
  snowparks_count: number | null;
  green_pistes_count: number | null;
  blue_pistes_count: number | null;
  red_pistes_count: number | null;
  black_pistes_count: number | null;
  lifts_count: number | null;
  forecast_open_date: string | null;
  forecast_close_date: string | null;
  season: string | null;
  source: string | null;
  verified_at: string | null;
  station_ids: string[];
};
