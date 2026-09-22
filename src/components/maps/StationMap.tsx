import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { StationMapItem } from "@/types/stationMap";
import { hasStationCoordinates } from "@/types/stationMap";

type Props = {
  stations: StationMapItem[];
  mode: "overview" | "station";
  ariaLabel?: string;
};

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => any;
  InfoWindow: new () => any;
  LatLngBounds: new () => any;
  marker: { AdvancedMarkerElement: new (options: Record<string, unknown>) => any; PinElement: new (options: Record<string, unknown>) => { element: HTMLElement } };
};

declare global {
  interface Window { google?: { maps?: GoogleMapsApi & { importLibrary?: (name: string) => Promise<unknown> } }; }
}

let mapsPromise: Promise<GoogleMapsApi> | null = null;

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (window.google?.maps?.Map && window.google.maps.marker) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  const promise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const callback = `snowExplorerMapsReady_${Date.now()}`;
    const timeout = window.setTimeout(() => reject(new Error("maps_timeout")), 15000);
    (window as unknown as Record<string, unknown>)[callback] = () => {
      window.clearTimeout(timeout);
      delete (window as unknown as Record<string, unknown>)[callback];
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("maps_unavailable"));
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=marker&callback=${callback}`;
    script.async = true;
    script.onerror = () => reject(new Error("maps_load_failed"));
    document.head.appendChild(script);
  }).catch((error): never => {
    mapsPromise = null;
    throw error;
  });
  mapsPromise = promise;
  return promise;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] || character));
}

function infoWindowHtml(station: StationMapItem): string {
  const place = station.department || station.region;
  return `<article class="station-map-info">${station.logo ? `<img src="${escapeHtml(station.logo)}" alt="Logo de ${escapeHtml(station.name)}" loading="lazy" />` : ""}<div><strong>${escapeHtml(station.name)}</strong>${place ? `<span>${escapeHtml(place)}</span>` : ""}<a href="/stations/${encodeURIComponent(station.slug)}">Voir la station →</a></div></article>`;
}

export default function StationMap({ stations, mode, ariaLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-key" | "error">("loading");
  const labelId = useId();
  const validStations = useMemo(() => stations.filter(hasStationCoordinates), [stations]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  useEffect(() => {
    if (!apiKey || !mapId) {
      setStatus("missing-key");
      return;
    }
    if (!containerRef.current || validStations.length === 0) {
      setStatus("error");
      return;
    }

    let disposed = false;
    let clusterer: MarkerClusterer | undefined;
    const markers: any[] = [];

    loadGoogleMaps(apiKey).then((maps) => {
      if (disposed || !containerRef.current) return;
      const initial = mode === "station"
        ? { lat: validStations[0].latitude, lng: validStations[0].longitude }
        : { lat: 46.603354, lng: 1.888334 };
      const map = new maps.Map(containerRef.current, {
        center: initial,
        zoom: mode === "station" ? 12 : 6,
        mapId,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      const infoWindow = new maps.InfoWindow();
      const bounds = new maps.LatLngBounds();

      validStations.forEach((station) => {
        const position = { lat: station.latitude, lng: station.longitude };
        const pin = new maps.marker.PinElement({
          background: "#0b3d66",
          borderColor: "#ffffff",
          glyphColor: "#ffffff",
          scale: mode === "station" ? 1.15 : 1,
        });
        const marker = new maps.marker.AdvancedMarkerElement({ map: mode === "station" ? map : null, position, title: station.name, content: pin.element });
        marker.addListener("click", () => {
          infoWindow.close();
          infoWindow.setContent(infoWindowHtml(station));
          infoWindow.open({ map, anchor: marker });
        });
        markers.push(marker);
        bounds.extend(position);
      });

      if (mode === "overview") {
        clusterer = new MarkerClusterer({ map, markers });
        if (validStations.length > 1) map.fitBounds(bounds, 48);
        else map.setCenter(initial);
      }
      setStatus("ready");
    }).catch(() => { if (!disposed) setStatus("error"); });

    return () => {
      disposed = true;
      clusterer?.clearMarkers();
      markers.forEach((marker) => { marker.map = null; });
    };
  }, [apiKey, mapId, mode, validStations]);

  const label = ariaLabel || (mode === "station" && validStations[0] ? `Carte de localisation de ${validStations[0].name}` : "Carte des stations de ski en France");
  return (
    <div className={`station-map station-map--${mode}`} aria-labelledby={labelId}>
      <span id={labelId} className="sr-only">{label}</span>
      {status !== "ready" ? <div className="station-map__status" role="status">
        {status === "loading" ? "Chargement de la carte…" : status === "missing-key" ? "La carte est temporairement indisponible (configuration manquante)." : "Impossible de charger la carte pour le moment."}
      </div> : null}
      <div ref={containerRef} className="station-map__canvas" aria-label={label} />
      {mode === "station" && validStations[0] ? <div className="station-map__details">
        <div><strong>{validStations[0].name}</strong>{validStations[0].department ? <span>{validStations[0].department}</span> : null}{validStations[0].region ? <span>{validStations[0].region}</span> : null}</div>
        <a className="btn btn--secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${validStations[0].latitude},${validStations[0].longitude}`)}`} target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>
      </div> : null}
    </div>
  );
}
