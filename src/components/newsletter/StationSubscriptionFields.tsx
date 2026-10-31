import { newsletterTopics, weatherTopics, type StationIntent } from "@/lib/newsletter/onboarding";
import type { NewsletterFrequency, WeatherFrequency } from "@/types/newsletter";
import styles from "./StationNewsletterEditor.module.css";

type Props = { value: StationIntent; onChange: (value: StationIntent) => void; disabled?: boolean; fr: boolean };
export default function StationSubscriptionFields({ value, onChange, disabled, fr }: Props) {
  const weather = value.topics.some(topic => weatherTopics.includes(topic));
  const others = newsletterTopics.filter(topic => !weatherTopics.includes(topic.key));
  return <div className={styles.fields}>
    <div className={styles.weatherRow}>
      <label className={styles.topic}><input type="checkbox" aria-label={fr ? "Météo et enneigement" : "Weather and snow conditions"} checked={weather} disabled={disabled} onChange={event => onChange({ ...value, topics: event.target.checked ? Array.from(new Set([...value.topics, ...weatherTopics])) : value.topics.filter(topic => !weatherTopics.includes(topic)), weather_frequency: event.target.checked && value.weather_frequency === "disabled" ? "friday" : value.weather_frequency })} /><span><strong>{fr ? "Météo et enneigement" : "Weather and snow conditions"}</strong><small>{fr ? "Prévisions météo, chutes de neige et état de la neige." : "Weather forecasts, snowfall and snow conditions."}</small></span></label>
      <label className={styles.frequency}>{fr ? "Fréquence météo et neige" : "Weather and snow frequency"}<select aria-label={fr ? "Fréquence météo et neige" : "Weather and snow frequency"} value={value.weather_frequency} disabled={disabled || !weather} onChange={event => onChange({ ...value, topics: Array.from(new Set([...value.topics, ...weatherTopics])), weather_frequency: event.target.value as WeatherFrequency })}>
        <option value="daily">{fr ? "Chaque jour" : "Daily"}</option><option value="friday">{fr ? "Chaque vendredi" : "Every Friday"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="disabled">{fr ? "En pause" : "Paused"}</option>
      </select></label>
    </div>
    <div className={styles.otherRow}>
      <div className={styles.topicGrid}>{others.map(topic => <label className={styles.topic} key={topic.key}>
        <input type="checkbox" checked={value.topics.includes(topic.key)} disabled={disabled} onChange={event => onChange({ ...value, topics: event.target.checked ? [...value.topics, topic.key] : value.topics.filter(key => key !== topic.key) })} /><span>{fr ? topic.fr : topic.en}</span>
      </label>)}</div>
      <label className={styles.frequency}>{fr ? "Fréquence des autres informations" : "Other updates frequency"}<select aria-label={fr ? "Fréquence des autres informations" : "Other updates frequency"} value={value.newsletter_frequency} disabled={disabled || !value.topics.some(topic => !weatherTopics.includes(topic))} onChange={event => onChange({ ...value, newsletter_frequency: event.target.value as NewsletterFrequency })}>
        <option value="immediate">{fr ? "À chaque mise à jour" : "On updates"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option>
      </select></label>
    </div>
  </div>;
}
