// src/types/station.ts

export type WebcamItem = {
  id: string;
  title: string;
  thumbUrl: string;          // petite image
  iframeUrl?: string | null; // widget ou flux à embarquer
  pageUrl?: string | null;   // lien externe (fallback)
};

export type ForfaitItem = {
  id: string;
  title: string;             // ex: "Journée Adulte"
  price: string;             // ex: "52,00 €"
  url?: string | null;       // lien d'achat
  note?: string | null;      // ex: "Tarif basse saison"
};

export type StationWidgetsConfig = {
  stationSlug: string;

  // Plan des pistes
  pistes: {
    enabled: boolean;
    smallMapUrl?: string | null;  // image miniature
    largeMapUrl?: string | null;  // image grande (modal)
    caption?: string | null;
  };

  // Météo
  meteo: {
    enabled: boolean;
    iframeUrl?: string | null;    // URL du widget météo
  };

  // Description (HTML depuis éditeur)
  description: {
    enabled: boolean;
    html?: string | null;         // HTML propre (sanitizé côté admin)
    metaTitle?: string | null;
    metaDescription?: string | null;
  };

  // Forfaits
  forfaits: {
    enabled: boolean;
    items: ForfaitItem[];
  };

  // Webcams
  webcams: {
    enabled: boolean;
    items: WebcamItem[];
  };

  // Enneigement
  snow: {
    enabled: boolean;
    iframeUrl?: string | null;    // URL du widget enneigement
  };

  // Snowpark
  snowpark: {
    enabled: boolean;
    mapUrl?: string | null;       // URL du plan (prioritaire)
    imageUrl?: string | null;     // fallback image simple
    caption?: string | null;      // légende
  };
};