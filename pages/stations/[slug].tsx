import type { GetServerSideProps, NextPage } from "next";

import StationV3Page from "@/components/stations/StationV3Page";
import { fetchStationWidgetsConfig } from "@/lib/api/stations";
import { fetchActiveResortsServer, getDepartmentResorts } from "@/lib/api/resorts";
import { getStationApiBase, isResortInactive, loadStationPageSources, resolveResortRegion } from "@/lib/api/stationPage";
import { resolveStationForfaits } from "@/lib/stationForfaits";
import { resolveStationPisteMap } from "@/lib/stationPisteMap";
import type { SkiAreaPublic } from "@/types/skiArea";
import type { SkiPassSeason } from "@/types/skiPass";
import type { StationWidgetsConfig } from "@/types/station";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
  resort_is_active?: boolean;
  active?: boolean;
  region?: { id?: string; name?: string; slug?: string; country_code?: string };
  region_id?: string | null;
  region_name?: string | null;
  department?: { id?: string; name?: string; slug?: string } | string | null;
  altitude_base_m?: number | null;
  altitude_top_m?: number | null;
  altitude_min_m?: number | null;
  altitude_max_m?: number | null;
  ski_area_km?: number | null;
  lifts_count?: number | null;
  pistes_count?: number | null;
  snowparks_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  description_md?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  season_open_date?: string | null;
  season_close_date?: string | null;
  pistes_small_map_url?: string | null;
  pistes_large_map_url?: string | null;
  pistes_caption?: string | null;
  ski_pass?: SkiPassSeason | null;
  ski_areas?: SkiAreaPublic[];
  v2?: Record<string, unknown> | null;
  public_v2?: Record<string, unknown> | null;
  v2_content?: Record<string, unknown> | null;
  v2_contents?: Record<string, unknown> | null;
  v2_overview_html?: string | null;
  v2_weather_snow_html?: string | null;
  v2_ski_pass_html?: string | null;
  v2_piste_map_html?: string | null;
  v2_webcam_html?: string | null;
  pistes_colors?: Record<string, number | null> | null;
  elevation_drop_m?: number | null;
  vertical_drop_m?: number | null;
  webcams?: unknown[];
};

interface Props {
  resort: Resort;
  cfg: StationWidgetsConfig | null;
  departmentStations: import("@/types/skiArea").StationOption[];
}

// Widget piste colors remain disabled; V3 uses the station's canonical color data.
const SHOW_PISTE_COLOR_DETAILS = false;

const ResortPage: NextPage<Props> = ({ resort, cfg, departmentStations }) => (
  <StationV3Page station={resort} widgets={cfg} departmentStations={departmentStations} />
);

/* =========================
 * SSR
 * =======================*/
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;

  // 1) L'endpoint individuel renvoie directement l'objet station. Seul son
  // véritable statut 404 devient une page introuvable ; toute autre erreur
  // amont reste une erreur SSR.
  // Le détail station fournit les données métier (dont `ski_pass` et la
  // région). Seule la configuration des widgets reste sur un second endpoint ;
  // les deux requêtes indépendantes démarrent au même moment.
  const { stationResponse, widgets } = await loadStationPageSources(slug, {
    apiBase: getStationApiBase(),
    loadWidgets: fetchStationWidgetsConfig,
  });
  if (stationResponse.status === 404) {
    return { notFound: true };
  }
  if (!stationResponse.ok) {
    throw new Error(`[stations/[slug]] station API returned HTTP ${stationResponse.status}`);
  }

  const stationPayload: unknown = await stationResponse.json();
  if (
    !stationPayload ||
    typeof stationPayload !== "object" ||
    Array.isArray(stationPayload) ||
    typeof (stationPayload as Resort).name !== "string" ||
    typeof (stationPayload as Resort).slug !== "string"
  ) {
    throw new Error("[stations/[slug]] station API returned an invalid payload");
  }
  const loadedResort = stationPayload as Resort;
  if (isResortInactive(loadedResort)) {
    return { notFound: true };
  }

  // Le détail accepte déjà la région imbriquée et les champs plats historiques.
  // Le backend peut donc ajouter `{ id, name, slug }` sans modifier le contrat.
  const resort = resolveResortRegion(loadedResort) as Resort;

  const publishedSkiAreas = Array.isArray(resort.ski_areas)
    ? resort.ski_areas.filter((area) => area?.status === "published")
    : [];
  let departmentStations: import("@/types/skiArea").StationOption[] = [];
  if (publishedSkiAreas.length === 0 && resort.department) {
    try {
      const activeResorts = await fetchActiveResortsServer();
      departmentStations = getDepartmentResorts(activeResorts, resort.department, resort.slug).map((station) => ({
        id: station.id,
        name: station.name,
        slug: station.slug,
        cover_image_url: station.cover_image_url || null,
        logo_url: station.logo_url || station.logoUrl || null,
        is_active: station.is_active,
      }));
    } catch (error) {
      console.error(`[stations/[slug]] department stations request failed for ${slug}`, error instanceof Error ? error.message : "unknown_error");
    }
  }

  // 2) Widgets config
  let cfg: StationWidgetsConfig | null = widgets.config;
  if (widgets.error) {
    const e: any = widgets.error;
    if (e?.status === 404) {
      console.info(`[stations/[slug]] widgets not configured for ${slug}`);
    } else {
      console.error(`[stations/[slug]] widgets request failed for ${slug}`, e instanceof Error ? e.message : "unknown_error");
    }
    cfg = null;
  }

  const stationForfaits = resolveStationForfaits(cfg?.forfaits, loadedResort.ski_pass);
  const normalizedForfaits = stationForfaits.normalizedForfaits;

  // Une station peut publier un forfait normalisé même sans configuration de
  // widgets legacy. Dans ce cas, conserver un socle désactivé permet tout de
  // même de rendre le forfait fourni par la réponse individuelle.
  if (!cfg && normalizedForfaits) {
    cfg = {
      stationSlug: resort.slug,
      pistes: { enabled: false },
      meteo: { enabled: false },
      description: { enabled: false },
      forfaits: { enabled: false, columns: [], items: [] },
      webcams: { enabled: false, items: [] },
      snow: { enabled: false },
      snowpark: { enabled: false },
    };
  }

  const resolvedPistes = resolveStationPisteMap(resort, cfg?.pistes || {});
  const cleanCfg: StationWidgetsConfig | null = cfg ? {
    stationSlug: resort.slug,
    pistes: {
      enabled: resolvedPistes.enabled,
      smallMapUrl: resolvedPistes.smallMapUrl,
      largeMapUrl: resolvedPistes.largeMapUrl,
      officialMapUrl: resolvedPistes.officialMapUrl,
      caption: resolvedPistes.caption,
      ...(SHOW_PISTE_COLOR_DETAILS && cfg.pistes?.colors ? { colors: cfg.pistes.colors } : {}),
    },
    meteo: { enabled: Boolean(cfg.meteo?.enabled), iframeUrl: cfg.meteo?.iframeUrl || null },
    description: {
      enabled: Boolean(cfg.description?.enabled),
      html: cfg.description?.html || null,
      metaTitle: cfg.description?.metaTitle || null,
      metaDescription: cfg.description?.metaDescription || null,
    },
    forfaits: stationForfaits.forfaits,
    ...(normalizedForfaits ? { normalizedForfaits } : {}),
    webcams: { enabled: Boolean(cfg.webcams?.enabled), items: cfg.webcams?.items || [] },
    snow: {
      enabled: Boolean(cfg.snow?.enabled),
      iframeUrl: cfg.snow?.iframeUrl || null,
      openingDate: cfg.snow?.openingDate || null,
      closingDate: cfg.snow?.closingDate || null,
      ...(cfg.snow?.season ? { season: {
        openingDate: cfg.snow.season.openingDate || null,
        closingDate: cfg.snow.season.closingDate || null,
      } } : {}),
    },
    snowpark: {
      enabled: Boolean(cfg.snowpark?.enabled),
      mapUrl: cfg.snowpark?.mapUrl || null,
      imageUrl: cfg.snowpark?.imageUrl || null,
      caption: cfg.snowpark?.caption || null,
    },
    ...(cfg.remontees ? { remontees: cfg.remontees } : {}),
    ...(cfg.snowparks ? { snowparks: cfg.snowparks } : {}),
  } : null;

  // Ne pas transmettre aveuglément la réponse métier : seules les propriétés
  // effectivement consommées par la fiche publique sont sérialisées.
  const stationForPage: Resort = {
    name: resort.name,
    slug: resort.slug,
    ...(resort.region ? { region: resort.region } : {}),
    ...(resort.department ? { department: resort.department } : {}),
    altitude_base_m: resort.altitude_base_m ?? null,
    altitude_top_m: resort.altitude_top_m ?? null,
    altitude_min_m: resort.altitude_min_m ?? null,
    altitude_max_m: resort.altitude_max_m ?? null,
    ski_area_km: resort.ski_area_km ?? null,
    lifts_count: resort.lifts_count ?? null,
    pistes_count: resort.pistes_count ?? null,
    snowparks_count: resort.snowparks_count ?? null,
    latitude: resort.latitude ?? null,
    longitude: resort.longitude ?? null,
    website_url: resort.website_url ?? null,
    cover_image_url: resort.cover_image_url ?? null,
    logo_url: resort.logo_url ?? null,
    description_md: resort.description_md ?? null,
    meta_title: resort.meta_title ?? null,
    meta_description: resort.meta_description ?? null,
    season_open_date: resort.season_open_date ?? null,
    season_close_date: resort.season_close_date ?? null,
    pistes_small_map_url: resort.pistes_small_map_url ?? null,
    pistes_large_map_url: resort.pistes_large_map_url ?? null,
    pistes_caption: resort.pistes_caption ?? null,
    ski_pass: resort.ski_pass ?? null,
    ski_areas: publishedSkiAreas,
    v2_overview_html: resort.v2_overview_html ?? null,
    v2_weather_snow_html: resort.v2_weather_snow_html ?? null,
    v2_ski_pass_html: resort.v2_ski_pass_html ?? null,
    v2_piste_map_html: resort.v2_piste_map_html ?? null,
    v2_webcam_html: resort.v2_webcam_html ?? null,
    ...(resort.v2 ? { v2: resort.v2 } : {}),
    ...(resort.public_v2 ? { public_v2: resort.public_v2 } : {}),
    ...(resort.v2_content ? { v2_content: resort.v2_content } : {}),
    ...(resort.v2_contents ? { v2_contents: resort.v2_contents } : {}),
    ...(resort.pistes_colors ? { pistes_colors: resort.pistes_colors } : {}),
    elevation_drop_m: resort.elevation_drop_m ?? null,
    vertical_drop_m: resort.vertical_drop_m ?? null,
    ...(Array.isArray(resort.webcams) ? { webcams: resort.webcams } : {}),
  };

  return { props: { resort: stationForPage, cfg: cleanCfg, departmentStations } };
};

export default ResortPage;
