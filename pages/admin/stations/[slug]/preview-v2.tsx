import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import StationV2Page from "@/components/stations/StationV2Page";
import { STATION_V2_SECTIONS, type StationPageSection } from "@/lib/stationV2";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminFetch } from "@/lib/adminApi";
import { normalizeAdminStation, normalizeAdminWidgets } from "@/lib/adminStation";

export default function StationV2Preview() {
  const router = useRouter();
  const auth = useAdminAuth();
  const slug = typeof router.query.slug === "string" ? router.query.slug : "";
  const requestedSection = typeof router.query.section === "string" ? router.query.section : "apercu";
  const section: StationPageSection = requestedSection === "apercu" || STATION_V2_SECTIONS.includes(requestedSection as any) ? requestedSection as StationPageSection : "apercu";
  const [data, setData] = useState<{ station: any; widgets: any } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || auth.status !== "authenticated") return;
    void (async () => {
      const response = await adminFetch(`/api/admin/stations/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!response.ok) { setError(`Prévisualisation indisponible (HTTP ${response.status}).`); return; }
      const payload = await response.json();
      const raw = payload.resort || payload;
      const widgets = normalizeAdminWidgets(payload.widgets || {}, raw);
      const station = normalizeAdminStation(raw, widgets) as any;
      station.page_layout_version = "v2";
      station.v2_contents = raw.v2_contents || raw.v2_content || raw.v2?.sections || {};
      setData({ station, widgets });
    })();
  }, [auth.status, slug]);

  if (auth.status !== "authenticated") return <><Head><meta name="robots" content="noindex, nofollow" /></Head><main style={{ padding: 32 }}>Accès administrateur requis.</main></>;
  if (error) return <><Head><meta name="robots" content="noindex, nofollow" /></Head><main style={{ padding: 32 }}>{error}</main></>;
  if (!data) return <><Head><meta name="robots" content="noindex, nofollow" /></Head><main style={{ padding: 32 }}>Chargement de la prévisualisation…</main></>;
  return <StationV2Page station={data.station} widgets={data.widgets} section={section} preview />;
}
