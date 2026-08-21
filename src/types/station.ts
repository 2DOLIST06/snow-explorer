export type WebcamItem = {
  id: string;
  title: string;
  thumbUrl: string;
  iframeUrl?: string | null;
  pageUrl?: string | null;
};

export type ForfaitColumn = {
  id: string;
  label: string;
};

export type ForfaitItem = {
  id: string;
  title: string;
  prices: Record<string, string>;

  // Compat ancienne structure en lecture
  columns?: Array<{
    id?: string;
    label?: string;
    value?: string;
  }>;
  price?: string;
  url?: string | null;
  note?: string | null;
};

export type ForfaitPrice = { price_type?: "fixed" | "dynamic" | string; type?: string; price?: string | number | null; amount?: string | number | null; price_min?: string | number | null; price_max?: string | number | null; label?: string | null; note?: string | null; category_id?: string; category_label?: string; category?: { id?: string; key?: string; label?: string; name?: string } };
export type ForfaitProduct = { id?: string; label?: string; name?: string; title?: string; duration_label?: string; prices?: ForfaitPrice[] | Record<string, ForfaitPrice | string | number>; rates?: ForfaitPrice[]; tariffs?: ForfaitPrice[] };
export type ForfaitPeriod = { id?: string; label?: string; name?: string; start_date?: string; end_date?: string; startDate?: string; endDate?: string; sort_order?: number; source_url?: string; sourceUrl?: string; categories?: Array<{ id?: string; key?: string; label?: string; name?: string }>; passes?: ForfaitProduct[]; products?: ForfaitProduct[]; forfaits?: ForfaitProduct[]; items?: ForfaitProduct[] };
export type ForfaitSeason = { label?: string; name?: string; source_url?: string | null; sourceUrl?: string | null; periods?: ForfaitPeriod[]; pricing_periods?: ForfaitPeriod[] };

export type StationWidgetsConfig = {
  stationSlug: string;

  pistes: {
    enabled: boolean;
    smallMapUrl?: string | null;
    largeMapUrl?: string | null;
    officialMapUrl?: string | null;
    caption?: string | null;
    colors?: {
      green?: number;
      blue?: number;
      red?: number;
      black?: number;
    };
  };

  meteo: {
    enabled: boolean;
    iframeUrl?: string | null;
  };

  description: {
    enabled: boolean;
    html?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
  };

  forfaits: {
    enabled: boolean;
    columns: ForfaitColumn[];
    items: ForfaitItem[];
    periods?: ForfaitPeriod[];
    season?: string | ForfaitSeason | null;
    source_url?: string | null;
    sourceUrl?: string | null;
  };

  normalizedForfaits?: {
    enabled: boolean;
    columns: ForfaitColumn[];
    items: ForfaitItem[];
    periods: ForfaitPeriod[];
    season?: string | ForfaitSeason | null;
    source_url?: string | null;
  };

  webcams: {
    enabled: boolean;
    items: WebcamItem[];
  };

  snow: {
    enabled: boolean;
    iframeUrl?: string | null;
    openingDate?: string | null;
    closingDate?: string | null;
    season?: {
      openingDate?: string | null;
      closingDate?: string | null;
    };
  };

  snowpark: {
    enabled: boolean;
    mapUrl?: string | null;
    imageUrl?: string | null;
    caption?: string | null;
    logoUrl?: string | null;
    descriptionHtml?: string | null;
  };

  snowparks?: {
    count?: number;
  };

  remontees?: {
    tireFesses?: number;
    telesieges?: number;
    telepheriques?: number;
  };
};
