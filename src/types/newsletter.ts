export type NewsletterLanguage = "fr" | "en";
export type NewsletterSource = "footer" | "article" | "page" | "station_page";

export type StationSummary = { id: string | number; name: string; slug?: string };
export type StationPreference = StationSummary & {
  station?: StationSummary;
  weather: boolean;
  snow_conditions: boolean;
  resort_updates: boolean;
  weather_frequency: "daily" | "friday" | "weekly" | "disabled";
};
export type SnowAlert = {
  id: string | number;
  station_id: string | number;
  station?: StationSummary;
  snowfall_cm: number;
  period_hours: 24 | 48 | 72;
  active?: boolean;
};
export type NewsletterPreferencesData = {
  email?: string;
  status?: string;
  consent?: boolean;
  preferences: Record<string, boolean>;
  frequency: "immediate" | "weekly" | "monthly";
  stations: StationPreference[];
  alerts: SnowAlert[];
};
