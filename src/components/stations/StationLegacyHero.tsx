import Image from "next/image";
import Link from "next/link";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import FollowStationButton from "@/components/newsletter/FollowStationButton";
import { regionHref } from "@/lib/regions";

export default function StationLegacyHero({ station }: { station: any }) {
  const adminAuth = useAdminAuth();
  const cover = station.cover_image_url || "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg";
  const resortRegionHref = regionHref(station.region);

  return <section className="station-profile-hero">
    <Image src={cover} alt={`Paysage ${station.name}`} fill sizes="(max-width: 640px) calc(100vw - 28px), (max-width: 1280px) calc(100vw - 40px), 1200px" priority className="station-profile-hero__image" />
    <div className="station-profile-hero__overlay" />
    <div className="station-profile-hero__content">
      <p className="eyebrow">Fiche station</p>
      <h1>{station.name}</h1>
      <p>{resortRegionHref ? <Link className="station-profile-hero__region" href={resortRegionHref}>{station.region?.name}</Link> : "Destination montagne"}</p>
      <div className="station-profile-hero__actions">
        <a className="btn btn--secondary" href="#station-conditions">Voir les conditions</a>
        {station.id != null ? <FollowStationButton stationId={station.id} stationName={station.name} /> : null}
        {adminAuth.status === "authenticated" ? <Link className="btn btn--primary" href={`/admin/stations/${encodeURIComponent(station.slug)}`}>Modifier la station</Link> : null}
      </div>
    </div>
  </section>;
}
