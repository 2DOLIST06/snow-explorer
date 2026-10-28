import React, { useCallback } from 'react';
import { fetchStationAvalancheRisk, hasAvailableRisk, hasCurrentBulletinPdf, hasIdentifiedMassif } from '@/lib/api/avalanche';
import { useWeatherResource, type WeatherResource } from '@/components/weather/useWeatherResource';
import type { StationAvalancheRiskResponse } from '@/types/avalanche';
import styles from './StationAvalancheRisk.module.css';

function bulletinDate(value: string | null): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AvalancheRiskPanel({ resource, slug }: { resource: WeatherResource<StationAvalancheRiskResponse>; slug: string }) {
  const data = resource.data;
  // No guessed massif on loading, errors, or unresolved mappings.
  if (resource.loading || resource.error || !data || !hasIdentifiedMassif(data) || !data.massif) return null;
  const available = hasAvailableRisk(data);
  const dates = [
    ['Valable à partir du', data.risk.valid_from],
    ['Valable jusqu’au', data.risk.valid_until],
    ['Publié le', data.risk.issued_at],
  ] as const;
  return <section className={styles.panel}>
    <div className={styles.heading}>
      <h3>Risque d’avalanche — massif : {data.massif.name}</h3>
      <span className="badge">Météo-France</span>
    </div>
    {available ? <>
      <p className={styles.level}><strong>{data.risk.level} / 5</strong><span>{data.risk.label}</span></p>
      <p>Bulletin Météo-France en cours de validité</p>
      <dl className={styles.dates}>{dates.map(([label, value]) => {
        const formatted = bulletinDate(value);
        return formatted && value ? <div key={label}><dt>{label}</dt><dd><time dateTime={value}>{formatted} (heure de Paris)</time></dd></div> : null;
      })}</dl>
      {data.risk.summary && <p className={styles.summary}>{data.risk.summary}</p>}
    </> : <p>Bulletin avalanche Météo-France actuellement indisponible pour ce massif.</p>}
    <p className={styles.disclaimer}>{data.display.disclaimer?.trim() || `Ce niveau de danger concerne le massif : ${data.massif.name}. Il ne constitue pas une évaluation du risque propre à la station, aux pistes sécurisées ou à un itinéraire précis. Les conditions peuvent varier localement.`}</p>
    <p className={styles.source}>Source : Météo-France</p>
    {hasCurrentBulletinPdf(data) && <a className={styles.pdf} href={`/api/stations/${encodeURIComponent(slug)}/avalanche-risk/pdf`} target="_blank" rel="noopener noreferrer">Consulter le bulletin complet Météo-France</a>}
  </section>;
}

type Props = { slug: string; active?: boolean; initialData?: StationAvalancheRiskResponse | null };

function AvalancheResource({ slug, active = true, initialData }: Props) {
  const load = useCallback((signal: AbortSignal) => fetchStationAvalancheRisk(slug, signal), [slug]);
  const resource = useWeatherResource(load, initialData, active);
  return <AvalancheRiskPanel resource={resource} slug={slug} />;
}

export default function StationAvalancheRisk({ slug, ...props }: Props) {
  // Clear the resource before rendering a different station, including before effects.
  return <AvalancheResource key={slug} slug={slug} {...props} />;
}
