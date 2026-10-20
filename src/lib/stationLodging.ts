// Same CJ Booking deep-link campaign as 2Dolist.
const CJ_BOOKING_BASE = "https://www.kqzyfj.com/click-101532582-11795698?url=";

type StationDestination = {
  name?: string | null;
  department?: string | { name?: string | null } | null;
  region?: { name?: string | null } | null;
  region_name?: string | null;
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function stationLodgingUrl(station: StationDestination): string | null {
  const name = text(station.name);
  if (!name) return null;

  const department = text(typeof station.department === "string" ? station.department : station.department?.name);
  const region = text(station.region?.name) || text(station.region_name);
  const params = new URLSearchParams({ ss: [name, department || region, "France"].filter(Boolean).join(" ") });
  const destination = `https://www.booking.com/searchresults.html?${params.toString()}`;
  return `${CJ_BOOKING_BASE}${encodeURIComponent(destination)}`;
}

// Partnerize camref supplied by the Abritel widget. The search URL follows
// Expedia Group's Abritel search configuration; no widget script is required.
const ABRITEL_TRACKING_BASE = "https://vrbo.prf.hn/click/camref:1011l5gxsq/destination:";

export function stationAbritelUrl(station: StationDestination): string | null {
  const name = text(station.name);
  if (!name) return null;

  const department = text(typeof station.department === "string" ? station.department : station.department?.name);
  const region = text(station.region?.name) || text(station.region_name);
  const params = new URLSearchParams({
    destination: [name, department || region, "France"].filter(Boolean).join(" "),
    siteid: "9003013",
    langid: "1036",
  });
  return `${ABRITEL_TRACKING_BASE}${encodeURIComponent(`https://www.abritel.fr/search?${params.toString()}`)}`;
}
