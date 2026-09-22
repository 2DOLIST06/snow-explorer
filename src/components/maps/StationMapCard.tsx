import { useEffect, useId, useRef, useState } from "react";
import StationMap from "./StationMapDynamic";
import type { StationMapItem } from "@/types/stationMap";
import { hasStationCoordinates } from "@/types/stationMap";

type Props = { station: Partial<StationMapItem> & Pick<StationMapItem, "id" | "name" | "slug"> };

function googleMapsUrl(station: Props["station"]): string {
  const location = [station.name, station.department, station.region, "France"].filter(Boolean).join(", ");
  const query = location || (hasStationCoordinates(station) ? `${station.latitude},${station.longitude}` : station.name);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function StationMapCard({ station }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasCoordinates = hasStationCoordinates(station);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <section className="station-map-card">
    <h2>Carte</h2>
    {hasCoordinates ? <div className="station-map-card__preview">
      <StationMap stations={[station]} mode="preview" />
      <button type="button" onClick={() => setOpen(true)} aria-label={`Agrandir la carte de ${station.name}`}>Agrandir la carte</button>
    </div> : <div className="station-map-card__empty">Coordonnées indisponibles.</div>}
    {open && hasCoordinates ? <div className="station-map-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div className="station-map-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <header><strong id={titleId}>Carte de {station.name}</strong><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Fermer la carte">×</button></header>
        <StationMap stations={[station]} mode="modal" />
        <footer><a href={googleMapsUrl(station)} target="_blank" rel="noopener noreferrer">Voir sur Google Maps <span aria-hidden="true">↗</span></a></footer>
      </div>
    </div> : null}
  </section>;
}
