// src/pages/stations/index.tsx
import React, { useEffect, useState } from "react";
import Link from "next/link";

type Resort = { id: string; name: string; slug: string; region?: { name?: string } };

export default function StationsList() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const query = q.trim();
        const url = query.length
          ? `/api/ski/resorts/?q=${encodeURIComponent(query)}`
          : `/api/ski/resorts/`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("fetch_failed");
        const j: Resort[] = await r.json();
        if (!cancel) setData(j);
      } catch {
        if (!cancel) setData([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 200);

    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Stations</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrer (ex. Auron, Val Thorens...)"
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #ddd",
          borderRadius: 8,
          marginBottom: 12,
        }}
      />

      {loading && <div style={{ color: "#666", marginBottom: 8 }}>Chargement…</div>}

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 8,
        }}
      >
        {data.map((r) => (
          <li
            key={r.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fff",
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div style={{ color: "#666", fontSize: 14 }}>{r.region?.name || ""}</div>
            </div>
            <Link
              href={`/stations/${r.slug}`}
              style={{ fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
            >
              Voir la fiche →
            </Link>
          </li>
        ))}
      </ul>

      {!loading && data.length === 0 && (
        <div style={{ color: "#666", marginTop: 12 }}>Aucun résultat</div>
      )}
    </main>
  );
}
