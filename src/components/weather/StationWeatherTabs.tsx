import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ObservedConditions, ForecastConditions, useStationWeatherResources, type StationWeatherProps } from './StationWeather';
import StationAvalancheRisk from '@/components/avalanche/StationAvalancheRisk';
import styles from './StationWeatherTabs.module.css';

const tabs = ['Observations', 'Prévisions', 'Avalanche'] as const;

function WeatherTabsContent(props: StationWeatherProps) {
  const { observations, forecasts } = useStationWeatherResources(props);
  const [selected, setSelected] = useState(0);
  const id = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }
  return <div className={styles.tabs}>
    <div className={styles.tablist} role="tablist" aria-label="Météo et enneigement">
      {tabs.map((label, index) => <button key={label} ref={(element) => { buttons.current[index] = element; }}
        type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`}
        aria-selected={selected === index} tabIndex={selected === index ? 0 : -1}
        onClick={() => setSelected(index)} onKeyDown={(event) => navigate(event, index)}>{label}</button>)}
    </div>
    {tabs.map((label, index) => <div key={label} className={styles.panel} role="tabpanel"
      id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index} tabIndex={0}>
      {index === 0 && <ObservedConditions resource={observations} headingLevel={props.headingLevel} />}
      {index === 1 && <ForecastConditions resource={forecasts} headingLevel={props.headingLevel} />}
      {index === 2 && <StationAvalancheRisk slug={props.slug} active={props.active} initialData={props.initialAvalanche} />}
    </div>)}
  </div>;
}

export default function StationWeatherTabs(props: StationWeatherProps) {
  // Reset selection and resources before painting a different station.
  return <WeatherTabsContent key={JSON.stringify([props.slug, props.latitude, props.longitude])} {...props} />;
}
