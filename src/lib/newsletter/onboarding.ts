import type { NewsletterFrequency, NewsletterLanguage, NewsletterPreferenceKey, WeatherFrequency } from "@/types/newsletter";

export const newsletterTopics: { key: NewsletterPreferenceKey; fr: string; en: string }[] = [
  { key: "weather", fr: "Météo", en: "Weather" },
  { key: "snowfall", fr: "Chutes de neige", en: "Snowfall" },
  { key: "snow_conditions", fr: "État de la neige", en: "Snow conditions" },
  { key: "opening_closing", fr: "Ouvertures et fermetures", en: "Opening and closing dates" },
  { key: "lift_updates", fr: "Pistes et remontées", en: "Slopes and lifts" },
  { key: "ski_pass_updates", fr: "Forfaits de ski", en: "Ski passes" },
  { key: "resort_updates", fr: "Actualités de la station", en: "Resort news" },
  { key: "articles", fr: "Articles sur cette station", en: "Articles about this resort" },
];
export type StationIntent = {
  station_id: string | number;
  station_name: string;
  topics: NewsletterPreferenceKey[];
  newsletter_frequency: NewsletterFrequency;
  weather_frequency: WeatherFrequency;
};
export type NewsletterIntent = { stations: StationIntent[]; articles?: boolean; consent: boolean; language: NewsletterLanguage; source: string };
export function stationIntent(id: string | number, name: string, topic: NewsletterPreferenceKey): StationIntent {
  return { station_id: id, station_name: name, topics: [topic], newsletter_frequency: "weekly", weather_frequency: "friday" };
}
export function accountNewsletterHref(id: string | number, name: string, topic: NewsletterPreferenceKey) {
  return `/mon-compte?${new URLSearchParams({ station_id: String(id), station_name: name, topic })}`;
}
export function intentFromQuery(query: Record<string, string | string[] | undefined>): NewsletterIntent | null {
  const { station_id, station_name, topic } = query;
  if (typeof station_id !== "string" || !station_id || station_id.length > 255 || typeof topic !== "string" || !newsletterTopics.some(item => item.key === topic)) return null;
  return { stations: [stationIntent(station_id, typeof station_name === "string" ? station_name.slice(0, 200) : station_id, topic as NewsletterPreferenceKey)], consent: true, language: "fr", source: "station_page" };
}
export function loginDestination(query: Record<string, string | string[] | undefined>) {
  const intent = intentFromQuery(query);
  const station = intent?.stations[0];
  return station ? accountNewsletterHref(station.station_id, station.station_name, station.topics[0]) : "/mon-compte";
}
