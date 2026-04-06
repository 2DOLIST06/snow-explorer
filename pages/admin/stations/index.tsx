import React, { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_SKI_API_BASE || "http://127.0.0.1:5001";

type EndpointStatus = number | "network_error" | "not_tested";

function toRows(payload: any) {
  return (payload?.items || payload || []).map((x: any) => ({
    id: String(x.id || ""),
    slug: x.slug,
    name: x.name,
    latitude: x.latitude,
    longitude: x.longitude,
    region: x?.region?.name || x?.region || null,
  }));
}

export default function AdminStationsList() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr("");

    const status: { stations: EndpointStatus; resortsAdmin: EndpointStatus; resortsPublic: EndpointStatus } = {
      stations: "not_tested",
      resortsAdmin: "not_tested",
      resortsPublic: "not_tested",
    };

    const stationsUrl = `${API}/api/admin/stations/`;
    const resortsAdminUrl = `${API}/api/admin/resorts/`;
    const resortsPublicUrl = `${API}/api/resorts/`;

    const fmtStatus = (value: EndpointStatus) => String(value);
    const diagnostics = () =>
      `stations=${fmtStatus(status.stations)}, resorts=${fmtStatus(status.resortsAdmin)}, public=${fmtStatus(status.resortsPublic)}`;

    try {
      let rows: any[] = [];

      let stationsResp: Response | null = null;
      try {
        stationsResp = await fetch(stationsUrl, { cache: "no-store" });
        status.stations = stationsResp.status;
        console.info(`[AdminStationsList] GET ${stationsUrl} -> ${stationsResp.status}`);
      } catch (e) {
        status.stations = "network_error";
        console.error(`[AdminStationsList] GET ${stationsUrl} -> network_error`, e);
      }

      if (stationsResp?.ok) {
        const stationsJson = await stationsResp.json();
        rows = toRows(stationsJson);
      }

      const shouldTryLegacyAdminResorts =
        !stationsResp?.ok &&
        (status.stations === 404 || status.stations === 405 || status.stations === "network_error");

      if (rows.length === 0 && shouldTryLegacyAdminResorts) {
        try {
          const resortsResp = await fetch(resortsAdminUrl, { cache: "no-store" });
          status.resortsAdmin = resortsResp.status;
          console.info(`[AdminStationsList] GET ${resortsAdminUrl} -> ${resortsResp.status}`);
          if (resortsResp.ok) {
            const resortsJson = await resortsResp.json();
            rows = toRows(resortsJson);
          }
        } catch (e) {
          status.resortsAdmin = "network_error";
          console.error(`[AdminStationsList] GET ${resortsAdminUrl} -> network_error`, e);
        }
      }

      if (rows.length === 0) {
        try {
          const publicResp = await fetch(resortsPublicUrl, { cache: "no-store" });
          status.resortsPublic = publicResp.status;
          console.info(`[AdminStationsList] GET ${resortsPublicUrl} -> ${publicResp.status}`);
          if (publicResp.ok) {
            const publicJson = await publicResp.json();
            rows = toRows(publicJson);
          }
        } catch (e) {
          status.resortsPublic = "network_error";
          console.error(`[AdminStationsList] GET ${resortsPublicUrl} -> network_error`, e);
        }
      }

      setItems(rows);

      if (rows.length === 0) {
        setErr(`Impossible de charger les stations: ${diagnostics()} — API=${API}`);
      } else if (!stationsResp?.ok) {
        setErr(`Données chargées via fallback: ${diagnostics()} — API=${API}`);
      }
    } catch (e: any) {
      setErr(`Erreur API: ${e?.message || "inconnue"} — ${diagnostics()} — API=${API}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(q.toLowerCase()) ||
      (s.slug || "").toLowerCase().includes(q.toLowerCase())
  );

  function slugify(s: string) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const onCreate = async () => {
    try {
      setMsg("Création…");
      const body: any = { name: name.trim() };
      if (slug.trim()) body.slug = slugify(slug);
      if (lat) body.latitude = Number(lat);
      if (lon) body.longitude = Number(lon);
      const r = await fetch(`${API}/api/admin/stations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status === 409) {
        setMsg("Slug déjà existant.");
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await r.json();
      setMsg("Station créée.");
      setName("");
      setSlug("");
      setLat("");
      setLon("");
      await load();
      // rediriger vers la fiche d'édition si tu veux :
      // window.location.href = `/admin/stations/${j.resort.slug}`;
    } catch (e: any) {
      setMsg(`Erreur: ${e?.message || "inconnue"}`);
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>Admin — Stations</h1>
      {msg ? <div style={{ margin: "6px 0", fontSize: 13, color: "#2563eb" }}>{msg}</div> : null}
      {err ? <div style={{ margin: "6px 0", fontSize: 13, color: "#dc2626" }}>Erreur : {err}</div> : null}

      {/* Formulaire de création */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Nouvelle station</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <input
            placeholder="Nom (obligatoire)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
          <input
            placeholder="Slug (optionnel, auto depuis Nom)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
          <input
            placeholder="Latitude (optionnel)"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
          <input
            placeholder="Longitude (optionnel)"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </div>
        <button
          onClick={onCreate}
          style={{
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          Ajouter la station
        </button>
      </section>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher…"
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", margin: "12px 0" }}
      />

      {loading && <div>Chargement…</div>}

      <div style={{ display: "grid", gap: 8, opacity: loading ? 0.6 : 1 }}>
        {filtered.map((s) => (
          <a
            key={s.slug}
            href={`/admin/stations/${s.slug}`}
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#fff",
              textDecoration: "none",
              color: "#111827",
            }}
          >
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {s.slug} — {s.region}
            </div>
          </a>
        ))}

        {!loading && !err && filtered.length === 0 && <div style={{ color: "#6b7280" }}>Aucune station trouvée.</div>}
      </div>
    </main>
  );
}
