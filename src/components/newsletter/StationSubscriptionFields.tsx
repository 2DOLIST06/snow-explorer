import { newsletterTopics, type StationIntent } from "@/lib/newsletter/onboarding";
import type { NewsletterFrequency, WeatherFrequency } from "@/types/newsletter";
import styles from "./StationNewsletterEditor.module.css";

type Props = { value: StationIntent; onChange: (value: StationIntent) => void; disabled?: boolean; fr: boolean };
export default function StationSubscriptionFields({ value, onChange, disabled, fr }: Props) {
  return <div className={styles.fields}>
    <div className={styles.topicGrid}>{newsletterTopics.map(topic => <label className={styles.topic} key={topic.key}>
      <input type="checkbox" checked={value.topics.includes(topic.key)} disabled={disabled} onChange={event => onChange({ ...value,
        topics: event.target.checked ? [...value.topics, topic.key] : value.topics.filter(key => key !== topic.key),
        weather_frequency: topic.key === "weather" && event.target.checked && value.weather_frequency === "disabled" ? "friday" : value.weather_frequency,
      })} /><span>{fr ? topic.fr : topic.en}</span>
    </label>)}</div>
    <div className={styles.frequencies}>
      {value.topics.includes("weather") && <label>{fr ? "Recevoir la météo" : "Receive weather"}<select aria-label={fr ? "Fréquence météo" : "Weather frequency"} value={value.weather_frequency} disabled={disabled} onChange={event => onChange({ ...value, weather_frequency: event.target.value as WeatherFrequency })}>
        <option value="daily">{fr ? "Chaque jour" : "Daily"}</option><option value="friday">{fr ? "Chaque vendredi" : "Every Friday"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="disabled">{fr ? "En pause" : "Paused"}</option>
      </select></label>}
      {value.topics.some(topic => topic !== "weather") && <label>{fr ? "Recevoir les autres informations" : "Receive other updates"}<select aria-label={fr ? "Fréquence des autres informations" : "Other updates frequency"} value={value.newsletter_frequency} disabled={disabled} onChange={event => onChange({ ...value, newsletter_frequency: event.target.value as NewsletterFrequency })}>
        <option value="immediate">{fr ? "À chaque mise à jour" : "On updates"}</option><option value="weekly">{fr ? "Chaque semaine" : "Weekly"}</option><option value="monthly">{fr ? "Chaque mois" : "Monthly"}</option>
      </select></label>}
    </div>
  </div>;
}
