// src/pages/admin/stations/new.tsx
import React, { useState } from "react";
import Link from "next/link";

export default function NewResort() {
  const [msg, setMsg] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const form = e.currentTarget as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form).entries());
    const amenities = (data.amenities as string || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    // utilise le proxy Next.js (évite CORS)
    const r = await fetch("/api/ski/resorts/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        slug: data.slug,
        region_id: data.region_id,
        region_name: data.region_name,
        country_code: (data.country_code as string || "FR").toUpperCase(),
        altitude_base_m: Number(data.altitude_base_m || 0) || null,
        altitude_top_m: Number(data.altitude_top_m || 0) || null,
        ski_area_km: Number(data.ski_area_km || 0) || null,
        lifts_count: Number(data.lifts_count || 0) || null,
        pistes_count: Number(data.pistes_count || 0) || null,
        latitude: Number(data.latitude || 0) || null,
        longitude: Number(data.longitude || 0) || null,
        website_url: data.website_url,
        cover_image_url: data.cover_image_url,
        amenities,
        description_md: data.description_md,
      }),
    });

    const json = await r.json().catch(() => ({}));

    if (r.ok) {
      setMsg(
        <div>
          ✅ Station créée: <b>{json.resort_id}</b>.{" "}
          <Link href={`/stations/${String(data.slug)}`}>Aller à la fiche →</Link>
        </div>
      );
      form.reset();
    } else {
      setMsg(`❌ ${json.error || "Erreur"}`);
    }

    setLoading(false);
  }

  const input = (n: string, l: string, p: any = {}) => (
    <div style={{ display: "grid", gap: 6 }}>
      <label htmlFor={n} style={{ fontWeight: 600 }}>{l}</label>
      <input id={n} name={n} {...p} style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }} />
    </div>
  );

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Nouvelle station</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        {input("name", "Nom *", { required: true, placeholder: "Val Thorens" })}
        {input("slug", "Slug *", { required: true, placeholder: "val-thorens" })}
        {input("region_id", "ID région *", { required: true, placeholder: "auvergne-rhone-alpes" })}
        {input("region_name", "Nom région *", { required: true, placeholder: "Auvergne-Rhône-Alpes" })}
        {input("country_code", "Pays *", { required: true, defaultValue: "FR" })}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {input("altitude_base_m", "Altitude base (m)", { type: "number" })}
          {input("altitude_top_m", "Altitude sommet (m)", { type: "number" })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {input("ski_area_km", "Km de pistes", { type: "number", step: "0.1" })}
          {input("lifts_count", "Nb remontées", { type: "number" })}
          {input("pistes_count", "Nb pistes", { type: "number" })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {input("latitude", "Latitude", { type: "number", step: "0.000001" })}
          {input("longitude", "Longitude", { type: "number", step: "0.000001" })}
        </div>

        {input("website_url", "Site officiel", { placeholder: "https://..." })}
        {input("cover_image_url", "Image couverture (CloudFront)", { placeholder: "https://d38x6kuhd141c9.cloudfront.net/Auron.webp" })}
        {input("amenities", "Équipements (CSV)", { placeholder: "snowpark,night_ski,kids_area" })}

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="description_md" style={{ fontWeight: 600 }}>Description (Markdown)</label>
          <textarea
            id="description_md"
            name="description_md"
            rows={6}
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontFamily: "inherit" }}
            placeholder="Présentation de la station..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 16px", borderRadius: 10, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700 }}
        >
          {loading ? "Enregistrement…" : "Créer la station"}
        </button>

        {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
      </form>
    </main>
  );
}
