import React, { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_SKI_API_BASE || "http://127.0.0.1:5001";

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
    try {
      setLoading(true); setErr("");
      // 1) tente l'endpoint "stations" (nouveau)
      let url = `${API}/api/admin/stations/`;
      let r = await fetch(url, { cache: "no-store" });
      // 2) fallback vers "resorts" (ancien nom)
      if (!r.ok) {
        url = `${API}/api/admin/resorts/`;
        r = await fetch(url, { cache: "no-store" });
      }
      if (!r.ok) throw new Error(`HTTP ${r.status} (${url})`);
      const j = await r.json();
      const rows = (j.items || j || []).map((x: any) => ({
        id: String(x.id || ""),
        slug: x.slug,
        name: x.name,
        latitude: x.latitude,
        longitude: x.longitude,
        region: x?.region?.name || x?.region || null,
      }));
      // 3) si toujours vide → fallback public
      if (rows.length > 0) {
        setItems(rows);
      } else {
        const r2 = await fetch(`${API}/api/resorts/`, { cache: "no-store" });
        if (r2.ok) {
          const j2 = await r2.json();
          const pub = (j2.items || j2 || []).map((x: any) => ({
            id: String(x.id || ""),
            slug: x.slug,
            name: x.name,
            latitude: x.latitude,
            longitude: x.longitude,
            region: x?.region?.name || x?.region || null,
          }));
          setItems(pub);
        } else {
          setItems([]);
        }
      }
    } catch (e:any) {
      setErr((e?.message || "Erreur API") + ` — API=${API}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((s) =>
    (s.name || "").toLowerCase().includes(q.toLowerCase()) ||
    (s.slug || "").toLowerCase().includes(q.toLowerCase())
  );

  function slugify(s: string) {
    return s.toLowerCase().trim()
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
      if (r.status === 409) { setMsg("Slug déjà existant."); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setMsg("Station créée.");
      setName(""); setSlug(""); setLat(""); setLon("");
      await load();
      // rediriger vers la fiche d'édition si tu veux :
      // window.location.href = `/admin/stations/${j.resort.slug}`;
    } catch (e:any) {
      setMsg(`Erreur: ${e?.message || "inconnue"}`);
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>Admin — Stations</h1>
      {msg ? <div style={{ margin:"6px 0", fontSize:13, color:"#2563eb" }}>{msg}</div> : null}
      {err ? <div style={{ margin:"6px 0", fontSize:13, color:"#dc2626" }}>Erreur : {err}</div> : null}

      {/* Formulaire de création */}
      <section style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:12, marginBottom:12 }}>
        <h2 style={{ margin:0, fontSize:16 }}>Nouvelle station</h2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
          <input placeholder="Nom (obligatoire)" value={name} onChange={e=>setName(e.target.value)}
                 style={{ padding:8, border:"1px solid #e5e7eb", borderRadius:8 }} />
          <input placeholder="Slug (optionnel, auto depuis Nom)" value={slug} onChange={e=>setSlug(e.target.value)}
                 style={{ padding:8, border:"1px solid #e5e7eb", borderRadius:8 }} />
          <input placeholder="Latitude (optionnel)" value={lat} onChange={e=>setLat(e.target.value)}
                 style={{ padding:8, border:"1px solid #e5e7eb", borderRadius:8 }} />
          <input placeholder="Longitude (optionnel)" value={lon} onChange={e=>setLon(e.target.value)}
                 style={{ padding:8, border:"1px solid #e5e7eb", borderRadius:8 }} />
        </div>
        <button onClick={onCreate} style={{ marginTop:8, padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff" }}>
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
          <a key={s.slug} href={`/admin/stations/${s.slug}`} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", textDecoration: "none", color: "#111827" }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{s.slug} — {s.region}</div>
          </a>
        ))}
        {!loading && !err && filtered.length === 0 && (
     <div style={{ color:"#6b7280" }}>Aucune station trouvée.</div>
   )}
      </div>
    </main>
  );
}
