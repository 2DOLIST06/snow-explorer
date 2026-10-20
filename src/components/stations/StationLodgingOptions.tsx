import { Hotel, House } from "lucide-react";
import { stationAbritelUrl, stationLodgingUrl } from "@/lib/stationLodging";

type Destination = Parameters<typeof stationLodgingUrl>[0];

export default function StationLodgingOptions({ station }: { station: Destination }) {
  const bookingUrl = stationLodgingUrl(station);
  const abritelUrl = stationAbritelUrl(station);
  if (!bookingUrl || !abritelUrl) return null;

  return <details className="station-lodging">
    <summary className="btn btn--primary"><Hotel size={18} aria-hidden="true" />Voir les logements disponibles</summary>
    <div className="station-lodging-options">
      <p>Où souhaitez-vous chercher votre hébergement ?</p>
      <div className="station-lodging-option">
        <a href={bookingUrl} target="_blank" rel="sponsored noopener noreferrer"><Hotel size={18} aria-hidden="true" />Voir les hôtels avec Booking</a>
        <span>Lien partenaire</span>
      </div>
      <div className="station-lodging-option">
        <a href={abritelUrl} target="_blank" rel="sponsored noopener noreferrer"><House size={18} aria-hidden="true" />Voir les appartements et chalets avec Abritel</a>
        <span>Lien partenaire</span>
      </div>
    </div>
    <style jsx>{`
      .station-lodging { margin-top:16px; }
      .station-lodging summary { display:inline-flex; align-items:center; gap:8px; cursor:pointer; list-style:none; }
      .station-lodging summary::-webkit-details-marker { display:none; }
      .station-lodging summary::after { content:'+'; margin-left:8px; font-size:1.2rem; }
      .station-lodging[open] summary::after { content:'−'; }
      .station-lodging-options { margin-top:12px; padding:16px; border:1px solid #d1dce4; border-radius:14px; background:#fff; }
      .station-lodging-options p { margin:0 0 12px; color:#374151; }
      .station-lodging-option { display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; padding:10px 0; }
      .station-lodging-option + .station-lodging-option { border-top:1px solid #e2e8f0; }
      .station-lodging-option a { display:inline-flex; align-items:center; gap:8px; color:#1d4ed8; font-weight:600; text-decoration:underline; }
      .station-lodging-option a :global(svg) { flex-shrink:0; }
      .station-lodging-option span { font-size:.85rem; color:#536b7d; }
      .station-lodging summary:focus-visible, .station-lodging-option a:focus-visible { outline:3px solid #2563eb; outline-offset:4px; }
      @media(max-width:480px) { .station-lodging summary { box-sizing:border-box; width:100%; } }
    `}</style>
  </details>;
}
