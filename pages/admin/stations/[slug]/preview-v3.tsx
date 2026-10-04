import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import StationV3Page from "@/components/stations/StationV3Page";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminFetch } from "@/lib/adminApi";
import { normalizeAdminStation, normalizeAdminWidgets } from "@/lib/adminStation";
import { resolveStationForfaits } from "@/lib/stationForfaits";

export default function StationV3Preview() {
  const router = useRouter();
  const auth = useAdminAuth();
  const slug = typeof router.query.slug === "string" ? router.query.slug : "";
  const [data, setData] = useState<{ station: any; widgets: any } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || auth.status !== "authenticated") return;
    void (async () => {
      const response = await adminFetch(`/api/admin/stations/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!response.ok) { setError(`Prévisualisation indisponible (HTTP ${response.status}).`); return; }
      const payload = await response.json();
      const raw = payload.resort || payload;
      const widgets: any = normalizeAdminWidgets(payload.widgets || {}, raw);
      Object.assign(widgets, resolveStationForfaits(widgets.forfaits, raw.ski_pass));
      const station = normalizeAdminStation(raw, widgets) as any;
      station.v2_contents = raw.v2_contents || raw.v2_content || raw.v2?.sections || {};
      setData({ station, widgets });
    })().catch((reason) => setError(reason instanceof Error ? reason.message : "Prévisualisation indisponible."));
  }, [auth.status, slug]);

  if (auth.status !== "authenticated") return <><Head><meta name="robots" content="noindex, nofollow" /></Head><main style={{ padding: 32 }}>Accès administrateur requis.</main></>;
  if (error) return <><Head><meta name="robots" content="noindex, nofollow" /></Head><main style={{ padding: 32 }}>{error}</main></>;
  if (!data) return <><Head><meta name="robots" content="noindex, nofollow" /></Head><main style={{ padding: 32 }}>Chargement de la prévisualisation…</main></>;
  return <StationV3Page station={data.station} widgets={data.widgets} preview />;
}
