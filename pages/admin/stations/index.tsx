import React, { useEffect, useState } from "react";
import Link from "next/link";
import BulkImportModal from "@/components/admin/imports/BulkImportModal";
import { downloadBlobResponse, getAllStationsExportResponse, getTemplateResponse } from "@/lib/api/stationImports";

const API = process.env.NEXT_PUBLIC_SKI_API_BASE || "http://127.0.0.1:5001";


function toRows(payload: any) {
  return (payload?.items || payload || []).map((x: any) => ({
    id: String(x.id || ""),
    slug: x.slug,
    name: x.name,
    is_active: x?.is_active ?? true,
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
  const [bulkUpdating, setBulkUpdating] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [download, setDownload] = useState<"all" | "template" | null>(null);

  const runDownload = async (kind: "all" | "template") => {
    setDownload(kind); setErr(""); setMsg(kind === "all" ? "Export en cours…" : "Téléchargement du modèle…");
    try { const response = kind === "all" ? await getAllStationsExportResponse() : await getTemplateResponse(); downloadBlobResponse(response, kind === "all" ? "stations.json" : "modele-stations.json"); setMsg("Téléchargement démarré."); }
    catch (e) { setErr(e instanceof Error ? e.message : "Téléchargement impossible."); setMsg(""); }
    finally { setDownload(null); }
  };

  async function load() {
    setLoading(true);
    setErr("");

    const stationsUrl = `${API}/api/admin/stations/`;

    try {
      const resp = await fetch(stationsUrl, { cache: "no-store" });
      console.info(`[AdminStationsList] GET ${stationsUrl} -> ${resp.status}`);

      if (!resp.ok) {
        throw new Error(`GET ${stationsUrl} failed with ${resp.status}`);
      }

      const json = await resp.json();
      const rows = toRows(json);
      setItems(rows);
    } catch (e: any) {
      setErr(`Impossible de charger les stations: ${e?.message || "inconnue"} — API=${API}`);
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

  const activeCount = items.filter((s) => s?.is_active !== false).length;
  const allDisabled = items.length > 0 && activeCount === 0;

  const patchStationActive = async (stationSlug: string, nextActive: boolean) => {
    const payload = { is_active: Boolean(nextActive) };
    const endpoint = `${API}/api/admin/stations/${encodeURIComponent(stationSlug)}`;

    const r = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    });

    console.info("[AdminStationsList] PATCH toggle", {
      endpoint,
      payload,
      status: r.status,
    });

    if (r.ok) return;

    const text = await r.text();
    if (r.status === 400 && text.includes("is_active_must_be_boolean")) {
      throw new Error('Le backend attend un booléen JSON strict: {"is_active": false}.');
    }

    throw new Error(`PATCH ${stationSlug} failed: ${endpoint} -> ${r.status}: ${text}`);
  };

  const toggleOneStation = async (stationSlug: string, nextActive: boolean) => {
    try {
      setMsg(`Mise à jour de ${stationSlug}…`);
      await patchStationActive(stationSlug, nextActive);
      setItems((prev) => prev.map((x) => (x.slug === stationSlug ? { ...x, is_active: nextActive } : x)));
      await load();
      setMsg(nextActive ? "Station activée." : "Station désactivée.");
    } catch (e: any) {
      setMsg(`Erreur: ${e?.message || "inconnue"}`);
    }
  };

  const toggleAllStations = async (nextActive: boolean) => {
    if (items.length === 0) return;
    setBulkUpdating(true);
    try {
      setMsg(nextActive ? "Activation de toutes les stations…" : "Désactivation de toutes les stations…");
      for (const station of items) {
        await patchStationActive(station.slug, nextActive);
      }
      setItems((prev) => prev.map((x) => ({ ...x, is_active: nextActive })));
      setMsg(nextActive ? "Toutes les stations sont activées." : "Toutes les stations sont désactivées.");
    } catch (e: any) {
      setMsg(`Erreur: ${e?.message || "inconnue"}`);
    } finally {
      setBulkUpdating(false);
    }
  };

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
      <section className="admin-import-actions" aria-labelledby="json-actions-title">
        <div><h2 id="json-actions-title">Import et export JSON</h2><p>Le modèle présente la structure reconnue par l’import. Un champ absent conserve sa valeur actuelle. Une valeur null supprime la valeur lorsque le champ l’autorise.</p></div>
        <div className="admin-import-actions__buttons"><button type="button" className="btn btn--secondary" disabled={download !== null} onClick={() => void runDownload("all")}>{download === "all" ? "Export en cours…" : "Exporter toutes les stations"}</button><button type="button" className="btn btn--primary" onClick={() => setBulkImportOpen(true)}>Importer plusieurs stations</button><button type="button" className="btn btn--secondary" disabled={download !== null} onClick={() => void runDownload("template")}>{download === "template" ? "Téléchargement…" : "Télécharger le modèle JSON"}</button><Link className="btn btn--secondary" href="/admin/imports">Voir l’historique des imports</Link></div>
      </section>
      {msg ? <div aria-live="polite" style={{ margin: "6px 0", fontSize: 13, color: "#2563eb" }}>{msg}</div> : null}
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
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => toggleAllStations(allDisabled)}
          disabled={loading || bulkUpdating}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: loading || bulkUpdating ? "not-allowed" : "pointer",
          }}
        >
          {allDisabled ? "Activer toutes les stations" : "Désactiver toutes les stations"}
        </button>
        <div style={{ alignSelf: "center", fontSize: 12, color: "#6b7280" }}>
          {activeCount}/{items.length} actives
        </div>
      </div>

      {loading && <div>Chargement…</div>}

      <div style={{ display: "grid", gap: 8, opacity: loading ? 0.6 : 1 }}>
        {filtered.map((s) => (
          <div
            key={s.slug}
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <a
              href={`/admin/stations/${s.slug}`}
              style={{
                textDecoration: "none",
                color: "#111827",
                flex: 1,
              }}
            >
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {s.slug} — {s.region} — {s?.is_active === false ? "désactivée" : "active"}
              </div>
            </a>
            <button
              onClick={() => toggleOneStation(s.slug, s?.is_active === false)}
              disabled={loading || bulkUpdating}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: s?.is_active === false ? "#dcfce7" : "#fee2e2",
                color: "#111827",
                cursor: loading || bulkUpdating ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {s?.is_active === false ? "Activer" : "Désactiver"}
            </button>
          </div>
        ))}

        {!loading && !err && filtered.length === 0 && <div style={{ color: "#6b7280" }}>Aucune station trouvée.</div>}
      </div>
      <BulkImportModal open={bulkImportOpen} onClose={() => setBulkImportOpen(false)} onImported={load} />
    </main>
  );
}
