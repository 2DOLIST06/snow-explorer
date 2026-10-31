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
export type NewsletterIntent = { stations: StationIntent[]; articles?: boolean; newsletter_frequency?: NewsletterFrequency; consent: boolean; language: NewsletterLanguage; source: string };
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

export function intentPreferences(row: StationIntent): import("@/types/newsletter").StationTopics {
  return {
    snowfall_enabled: row.topics.includes("snowfall"), snow_conditions_enabled: row.topics.includes("snow_conditions"),
    weather_enabled: row.topics.includes("weather"), resort_updates_enabled: row.topics.includes("resort_updates"),
    articles_enabled: row.topics.includes("articles"), opening_closing_enabled: row.topics.includes("opening_closing"),
    lift_updates_enabled: row.topics.includes("lift_updates"), ski_pass_updates_enabled: row.topics.includes("ski_pass_updates"),
    newsletter_frequency: row.newsletter_frequency, weather_frequency: row.weather_frequency,
  };
}
export function settingsIntent(value: import("@/types/newsletter").StationSettings): StationIntent {
  return { station_id: value.station.id, station_name: value.station.name,
    topics: newsletterTopics.filter(topic => value.preferences[`${topic.key}_enabled`]).map(topic => topic.key),
    newsletter_frequency: value.preferences.newsletter_frequency, weather_frequency: value.preferences.weather_frequency };
}
export function subscriptionSummary(row: StationIntent, fr: boolean): string {
  if (!row.topics.length) return fr ? "Aucune information sélectionnée" : "No updates selected";
  const weather = { daily: fr ? "chaque jour" : "daily", friday: fr ? "chaque vendredi" : "every Friday", weekly: fr ? "chaque semaine" : "weekly", disabled: fr ? "en pause" : "paused" };
  const other = { immediate: fr ? "à chaque mise à jour" : "on updates", weekly: fr ? "chaque semaine" : "weekly", monthly: fr ? "chaque mois" : "monthly" };
  const labels = row.topics.map(key => key === "weather" ? `${fr ? "Météo" : "Weather"} : ${weather[row.weather_frequency]}` : (newsletterTopics.find(topic => topic.key === key)?.[fr ? "fr" : "en"] || key));
  return labels.join(" · ") + (row.topics.some(key => key !== "weather") ? ` — ${other[row.newsletter_frequency]}` : "");
}


export function mergeNewsletterChoice(current: NewsletterIntent, proposed: NewsletterIntent | null): NewsletterIntent {
  if (!proposed) return current;
  const stations = current.stations.map(row => ({ ...row, topics: [...row.topics] }));
  for (const row of proposed.stations) {
    const index = stations.findIndex(existing => String(existing.station_id) === String(row.station_id));
    if (index < 0) stations.push(row);
    else {
      const old = stations[index];
      stations[index] = { ...old, topics: [...new Set([...old.topics, ...row.topics])],
        weather_frequency: row.topics.includes("weather") && !old.topics.includes("weather") ? row.weather_frequency : old.weather_frequency };
    }
  }
  return { ...current, ...("articles" in proposed ? { articles: proposed.articles } : {}), ...("newsletter_frequency" in proposed ? { newsletter_frequency: proposed.newsletter_frequency } : {}), stations };
}
