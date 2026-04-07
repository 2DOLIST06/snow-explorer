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

export type StationWidgetsConfig = {
  stationSlug: string;

  pistes: {
    enabled: boolean;
    smallMapUrl?: string | null;
    largeMapUrl?: string | null;
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
