import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

const API = process.env.NEXT_PUBLIC_SKI_API_BASE || "http://127.0.0.1:5001";

type RegionRow = { id: string; name: string; country_code?: string };
type DepartmentRow = { code: string; name: string; region_id: string };

type ResortType = {
  id?: string;
  name?: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  description_md?: string | null;
  region_id?: string | null;
  department?: string | null;
  region?: { id?: string; name?: string; country_code?: string } | null;

  // ✅ NOUVEAUX CHAMPS
  altitude_min_m?: number | null;
  altitude_max_m?: number | null;
  season_open_date?: string | null;   // 'YYYY-MM-DD'
  season_close_date?: string | null;  // 'YYYY-MM-DD'

  // ✅ Plan des pistes stocké dans la table resort
  pistes_small_map_url?: string | null;
  pistes_large_map_url?: string | null;
};

// helpers
const toNumberOrNull = (v: string): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toIntOrZero = (v: string): number => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

// === Helpers image (resize via Canvas) ===
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image"));
    };
    img.src = url;
  });
}

async function resizeImageToWidth(
  file: File,
  targetWidth: number,
  mimeOut: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.85
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const w = (img as any).naturalWidth || img.width;
  const h = (img as any).naturalHeight || img.height;
  if (!w || !h) throw new Error("Dimensions image invalides");

  const outWidth = Math.min(targetWidth, w);
  const outHeight = Math.round((outWidth / w) * h);

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  if (mimeOut === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outWidth, outHeight);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outWidth, outHeight);

  return await new Promise<Blob>((resolve, reject) => {
    if (mimeOut === "image/png") {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob PNG a échoué"))), "image/png");
    } else {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob JPEG a échoué"))), "image/jpeg", quality);
    }
  });
}

function getFileBaseAndExt(filename: string): { base: string; ext: string } {
  const i = filename.lastIndexOf(".");
  if (i <= 0) return { base: filename, ext: "" };
  return { base: filename.slice(0, i), ext: filename.slice(i + 1).toLowerCase() };
}

function buildSmallFilename(original: string, preferJpeg = true): string {
  const { base, ext } = getFileBaseAndExt(original);
  if (preferJpeg) return `${base}-small.jpg`;
  if (ext === "png") return `${base}-small.png`;
  return `${base}-small.jpg`;
}

export default function AdminStationEdit() {
  const { query } = useRouter();
  const slug = String(query.slug || "");

  const [loading, setLoading] = useState(true);
  const [resort, setResort] = useState<ResortType | null>(null);
  const [widgets, setWidgets] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // listes pour les <select>
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);

  // ——— helpers pour garantir l’option courante dans les listes ———
  const ensureRegionInList = (
    list: RegionRow[],
    rid: string | null | undefined,
    rname?: string | null
  ): RegionRow[] => {
    if (!rid) return list;
    const has = list.some((x) => x.id.toLowerCase() === rid.toLowerCase());
    return has ? list : [...list, { id: rid, name: rname || rid, country_code: "FR" }];
  };

  const ensureDepartmentInList = (
    list: DepartmentRow[],
    dep: string | null | undefined,
    rid: string | null | undefined
  ): DepartmentRow[] => {
    if (!dep) return list;
    const has = list.some((x) => x.name === dep);
    return has ? list : [...list, { code: "", name: dep, region_id: (rid || "").toString() }];
  };

  const load = async (mySlug: string) => {
    setLoading(true);
    setErr("");
    try {
      // 1) station + widgets
      let url = `${API}/api/admin/stations/${mySlug}`;
      let r = await fetch(url, { cache: "no-store" });
      if (!r.ok) {
        url = `${API}/api/admin/resorts/${mySlug}`;
        r = await fetch(url, { cache: "no-store" });
      }
      if (!r.ok) throw new Error(`HTTP ${r.status} (${url})`);
      const j = await r.json();

            const rcv: ResortType = j.resort || j;
      const normalized: ResortType = {
        ...rcv,
        region_id: rcv.region_id ?? rcv.region?.id ?? null,
        department: rcv.department ?? null,
        altitude_min_m: rcv.altitude_min_m ?? null,
        altitude_max_m: rcv.altitude_max_m ?? null,
        season_open_date: rcv.season_open_date ?? null,
        season_close_date: rcv.season_close_date ?? null,
        pistes_small_map_url: rcv.pistes_small_map_url ?? null,
        pistes_large_map_url: rcv.pistes_large_map_url ?? null,
      };
      setResort(normalized);


      // defaults widgets
      const w = j.widgets || {};
      if (!w.pistes) w.pistes = {};
      if (!w.pistes.colors) w.pistes.colors = { green: 0, blue: 0, red: 0, black: 0 };
      if (!w.snowparks) w.snowparks = { count: 0 };
      if (!w.remontees) w.remontees = { tireFesses: 0, telesieges: 0, telepheriques: 0 };
      if (!w.forfaits) w.forfaits = { enabled: false, items: [] };
      if (!Array.isArray(w.forfaits.items)) w.forfaits.items = [];
      setWidgets(w);

      // 2) régions
      const rr = await fetch(`${API}/api/regions`, { cache: "no-store" });
      let regs: RegionRow[] = rr.ok ? await rr.json() : [];
      regs = ensureRegionInList(regs, normalized.region_id, normalized.region?.name || null);
      regs.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, "fr"));
      setRegions(regs);

      // 3) départements
      const rid = (normalized.region_id || "").toLowerCase();
      const depUrl = rid
        ? `${API}/api/departments?region_id=${encodeURIComponent(rid)}`
        : `${API}/api/departments`;
      const dr = await fetch(depUrl, { cache: "no-store" });
      let deps: DepartmentRow[] = dr.ok ? await dr.json() : [];
      deps = ensureDepartmentInList(deps, normalized.department || null, normalized.region_id || null);
      deps.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
      setDepartments(deps);
    } catch (e: any) {
      setErr(e?.message || "Erreur API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    load(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // recharger les départements si region_id change côté UI
  useEffect(() => {
    const rid = (resort?.region_id || "").toLowerCase();
    if (!resort) return;
    (async () => {
      if (!rid) {
        setDepartments((prev) =>
          ensureDepartmentInList(prev, resort.department || null, null)
        );
        return;
      }
      try {
        const r = await fetch(`${API}/api/departments?region_id=${encodeURIComponent(rid)}`, { cache: "no-store" });
        let deps: DepartmentRow[] = r.ok ? await r.json() : [];
        deps = ensureDepartmentInList(deps, resort.department || null, resort.region_id || null);
        deps.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
        setDepartments(deps);
      } catch {
        setDepartments((prev) =>
          ensureDepartmentInList(prev, resort.department || null, resort.region_id || null)
        );
      }
    })();
  }, [resort?.region_id]);

    const patchResort = async () => {
    if (!resort) return;
    setMsg("Enregistrement…");
    setErr("");

    try {
      const payload: ResortType = {
        ...resort,

        // 🔹 on force les champs plan des pistes à partir des widgets si besoin
        pistes_large_map_url:
          resort.pistes_large_map_url ?? (widgets?.pistes?.largeMapUrl || null),
        pistes_small_map_url:
          resort.pistes_small_map_url ?? (widgets?.pistes?.smallMapUrl || null),

        region_id: resort.region_id ?? resort.region?.id ?? null,
        region: undefined,
      };

      // debug si besoin
      console.log("PATCH resort payload =", payload);

      const r = await fetch(`${API}/api/admin/stations/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`PATCH failed ${r.status}: ${txt}`);
      }
      await load(slug);
      setMsg("Infos enregistrées.");
    } catch (e: any) {
      setErr(e?.message || "Erreur API");
      setMsg("");
    }
  };


  const patchWidgets = async () => {
    setMsg("Enregistrement widgets…");
    setErr("");
    try {
      const r = await fetch(`${API}/api/admin/stations/${slug}/widgets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widgets),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`PATCH widgets failed ${r.status}: ${txt}`);
      }
      await load(slug);
      setMsg("Widgets enregistrés.");
    } catch (e: any) {
      setErr(e?.message || "Erreur API");
      setMsg("");
    }
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        Chargement…
      </main>
    );
  }
  if (err) {
    return (
      <main style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px", color: "#dc2626" }}>
        Erreur : {err}
      </main>
    );
  }
  if (!resort) return <main>Not found</main>;

  const setW = (path: string, val: any) => {
    const parts = path.split(".");
    const copy = { ...widgets };
    let cur: any = copy;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      cur[k] = cur[k] ?? {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = val;
    setWidgets(copy);
  };

  // gestion des forfaits (UI structurée)
  type ForfaitItem = { id?: string; title?: string; price?: string; url?: string };
  const forfaitItems: ForfaitItem[] = widgets?.forfaits?.items || [];

  const addForfait = () => {
    const next = [...forfaitItems, { id: `f${Date.now()}`, title: "", price: "", url: "" }];
    setW("forfaits.items", next);
  };
  const updateForfait = (idx: number, key: keyof ForfaitItem, value: string) => {
    const next = forfaitItems.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
    setW("forfaits.items", next);
  };
  const removeForfait = (idx: number) => {
    const next = forfaitItems.filter((_, i) => i !== idx);
    setW("forfaits.items", next);
  };

  // ========= Upload S3 (pré-signé) =========
  async function uploadWithPresign(file: File): Promise<string> {
    const r = await fetch(`${API}/api/s3/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name })
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Presign error ${r.status}: ${t}`);
    }
    const { uploadUrl, publicUrl } = await r.json();
    const put = await fetch(uploadUrl, { method: "PUT", body: file });
    if (!put.ok) {
      const t = await put.text();
      throw new Error(`S3 PUT failed ${put.status}: ${t}`);
    }
    return publicUrl;
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const publicUrl = await uploadWithPresign(file);
      setResort((prev) => ({ ...(prev || {}), cover_image_url: publicUrl }));
      setMsg("Image uploadée.");
    } catch (e: any) {
      setErr(e?.message || "Erreur upload");
    }
  }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const publicUrl = await uploadWithPresign(file);
      setResort((prev) => ({ ...(prev || {}), logo_url: publicUrl }));
      setMsg("Logo uploadé.");
    } catch (e: any) {
      setErr(e?.message || "Erreur upload logo");
    }
  }


  // handler générique pour widgets.*.* champs
  function handleFileUploadTo(path: string) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const publicUrl = await uploadWithPresign(file);
        setW(path, publicUrl);
        setMsg("Image uploadée.");
      } catch (e: any) {
        setErr(e?.message || "Erreur upload");
      }
    };
  }

  // === Upload large + génération auto small ===
  async function uploadLargeAndAutoSmall(
    file: File,
    {
      smallWidth = 800,
      smallMime = "image/jpeg" as "image/jpeg" | "image/png",
      smallQuality = 0.85,
    } = {}
  ): Promise<{ largeUrl: string; smallUrl: string }> {
    const largeUrl = await uploadWithPresign(file);

    const smallBlob = await resizeImageToWidth(file, smallWidth, smallMime, smallQuality);

    const smallName = buildSmallFilename(file.name, smallMime === "image/jpeg");
    const presignSmall = await fetch(`${API}/api/s3/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: smallName }),
    });
    if (!presignSmall.ok) {
      const t = await presignSmall.text();
      throw new Error(`Presign small error ${presignSmall.status}: ${t}`);
    }
    const { uploadUrl: smallUploadUrl, publicUrl: smallPublicUrl } = await presignSmall.json();

    const putSmall = await fetch(smallUploadUrl, { method: "PUT", body: smallBlob });
    if (!putSmall.ok) {
      const t = await putSmall.text();
      throw new Error(`S3 PUT small failed ${putSmall.status}: ${t}`);
    }

    return { largeUrl, smallUrl: smallPublicUrl };
  }

  async function handleUploadPistesLargeAutoSmall(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setMsg("Upload du plan en cours…");
    setErr("");
    const { largeUrl, smallUrl } = await uploadLargeAndAutoSmall(file, {
      smallWidth: 800,
      smallMime: "image/jpeg",
      smallQuality: 0.85,
    });

    // ✅ widgets (StationWidgets)
    setW("pistes.largeMapUrl", largeUrl);
    setW("pistes.smallMapUrl", smallUrl);

    // ✅ resort (table resort → colonnes pistes_*_map_url)
    setResort((prev) => ({
      ...(prev || {}),
      pistes_large_map_url: largeUrl,
      pistes_small_map_url: smallUrl,
    }));

    setMsg("Plan des pistes uploadé (grand + petit).");
  } catch (e: any) {
    setErr(e?.message || "Erreur upload plan");
    setMsg("");
  } finally {
    (e.target as HTMLInputElement).value = "";
  }
}

  // =========================================

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>
          Admin — {resort.name}{" "}
          <span style={{ color: "#6b7280", fontSize: 14 }}>({slug})</span>
        </h1>
        <button
          onClick={() => load(slug)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
        >
          Rafraîchir
        </button>
      </div>

      {msg ? <div style={{ margin: "8px 0", fontSize: 13, color: "#2563eb" }}>{msg}</div> : null}

      {/* Infos */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Infos</h2>

        {/* aperçu base */}
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          En base → region_id: <b>{resort.region_id || "—"}</b> • department:{" "}
          <b>{resort.department || "—"}</b>
          {resort.region?.name ? (
            <>
              {" "}
              • region.name: <b>{resort.region.name}</b>
            </>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Nom
            <input
              value={resort.name || ""}
              onChange={(e) => setResort({ ...resort, name: e.target.value })}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </label>

          <label>
            Latitude
            <input
              value={resort.latitude ?? ""}
              onChange={(e) =>
                setResort({
                  ...resort,
                  latitude: toNumberOrNull(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </label>

          <label>
            Longitude
            <input
              value={resort.longitude ?? ""}
              onChange={(e) =>
                setResort({
                  ...resort,
                  longitude: toNumberOrNull(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </label>

          {/* Région (select) */}
          <label>
            Région
            <select
              value={resort.region_id ?? ""}
              onChange={(e) =>
                setResort({
                  ...resort,
                  region_id: e.target.value || null,
                })
              }
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <option value="">— choisir —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          {/* Département (select filtré) */}
          <label>
            Département
            <select
              value={resort.department ?? ""}
              onChange={(e) =>
                setResort({ ...resort, department: e.target.value || null })
              }
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <option value="">— choisir —</option>
              {departments.map((d) => (
                <option key={`${d.region_id}-${d.code}-${d.name}`} value={d.name}>
                  {d.name}{d.code ? ` (${d.code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Site web
            <input
              value={resort.website_url || ""}
              onChange={(e) =>
                setResort({ ...resort, website_url: e.target.value })
              }
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </label>

          {/* ✅ Cover image : input + upload S3 + preview */}
          <label>
            Cover image
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={resort.cover_image_url || ""}
                onChange={(e) =>
                  setResort({ ...resort, cover_image_url: e.target.value })
                }
                placeholder="URL publique (auto-remplie après upload)"
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              />
              {resort.cover_image_url ? (
                <img
                  src={resort.cover_image_url}
                  alt="Cover preview"
                  style={{ maxWidth: 360, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              ) : null}
            </div>
          </label>

                    {/* ✅ Logo station : input + upload S3 + preview */}
          <label>
            Logo station
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={resort.logo_url || ""}
                onChange={(e) =>
                  setResort({ ...resort, logo_url: e.target.value })
                }
                placeholder="URL publique du logo (auto-remplie après upload)"
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              />
              {resort.logo_url ? (
                <img
                  src={resort.logo_url}
                  alt="Logo station"
                  style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8, border: "1px solid #e5e7eb", objectFit: "contain" }}
                />
              ) : null}
            </div>
          </label>


          <label>
            Description (Markdown/HTML)
            <textarea
              value={resort.description_md || ""}
              onChange={(e) =>
                setResort({ ...resort, description_md: e.target.value })
              }
              rows={6}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontFamily: "monospace",
              }}
            />
          </label>

          {/* ✅ Altitudes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label>
              Altitude min (m)
              <input
                value={resort.altitude_min_m ?? ""}
                onChange={(e) =>
                  setResort({ ...resort, altitude_min_m: toNumberOrNull(e.target.value) })
                }
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>
            <label>
              Altitude max (m)
              <input
                value={resort.altitude_max_m ?? ""}
                onChange={(e) =>
                  setResort({ ...resort, altitude_max_m: toNumberOrNull(e.target.value) })
                }
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>
          </div>

          {/* ✅ Dates d'ouverture/fermeture */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label>
              Ouverture (saison) — AAAA-MM-JJ
              <input
                type="date"
                value={resort.season_open_date || ""}
                onChange={(e) =>
                  setResort({ ...resort, season_open_date: e.target.value || null })
                }
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>
            <label>
              Fermeture (saison) — AAAA-MM-JJ
              <input
                type="date"
                value={resort.season_close_date || ""}
                onChange={(e) =>
                  setResort({ ...resort, season_close_date: e.target.value || null })
                }
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>
          </div>
        </div>

        <button
          onClick={patchResort}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          Enregistrer
        </button>
      </section>

      {/* ✅ Pistes & Snowpark (chiffres) */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Pistes & Snowpark</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
          <label>
            Vertes
            <input
              type="number"
              min={0}
              value={widgets?.pistes?.colors?.green ?? 0}
              onChange={(e) => setW("pistes.colors.green", toIntOrZero(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </label>
          <label>
            Bleues
            <input
              type="number"
              min={0}
              value={widgets?.pistes?.colors?.blue ?? 0}
              onChange={(e) => setW("pistes.colors.blue", toIntOrZero(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </label>
          <label>
            Rouges
            <input
              type="number"
              min={0}
              value={widgets?.pistes?.colors?.red ?? 0}
              onChange={(e) => setW("pistes.colors.red", toIntOrZero(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </label>
          <label>
            Noires
            <input
              type="number"
              min={0}
              value={widgets?.pistes?.colors?.black ?? 0}
              onChange={(e) => setW("pistes.colors.black", toIntOrZero(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          <label>
            Snowparks (nombre)
            <input
              type="number"
              min={0}
              value={widgets?.snowparks?.count ?? 0}
              onChange={(e) => setW("snowparks.count", toIntOrZero(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </label>
        </div>

        <button
  onClick={() => {
    patchWidgets();
    patchResort();
  }}
  style={{
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
  }}
>
  Enregistrer
</button>

      </section>

      {/* Plan des pistes (auto small depuis large) */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Plan des pistes</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Activer
            <input
              type="checkbox"
              checked={!!widgets?.pistes?.enabled}
              onChange={(e) => setW("pistes.enabled", e.target.checked)}
            />
          </label>

          {/* Large map URL + upload (déclenche auto-small) */}
          <label>
            Large map URL
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={widgets?.pistes?.largeMapUrl || ""}
                onChange={(e) => setW("pistes.largeMapUrl", e.target.value)}
                placeholder="URL grande carte…"
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadPistesLargeAutoSmall}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              />
            </div>
          </label>

          {/* Small map URL (auto) — lecture seule */}
          <label>
            Small map URL (auto)
            <input
              value={widgets?.pistes?.smallMapUrl || ""}
              readOnly
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                color: "#6b7280",
              }}
            />
          </label>

          <label>
            Légende
            <input
              value={widgets?.pistes?.caption || ""}
              onChange={(e) => setW("pistes.caption", e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </label>

          {(widgets?.pistes?.largeMapUrl || widgets?.pistes?.smallMapUrl) ? (
            <div
              style={{
                marginTop: 6,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                overflow: "hidden",
                background: "#fff",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0,
              }}
            >
              <div style={{ borderRight: "1px solid #e5e7eb" }}>
                <div style={{ padding: 8, fontSize: 12, color: "#6b7280" }}>Small</div>
                {widgets?.pistes?.smallMapUrl ? (
                  <img
                    src={widgets?.pistes?.smallMapUrl}
                    alt="Prévisualisation small"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                ) : (
                  <div style={{ padding: 12, fontSize: 12, color: "#9ca3af" }}>—</div>
                )}
              </div>
              <div>
                <div style={{ padding: 8, fontSize: 12, color: "#6b7280" }}>Large</div>
                {widgets?.pistes?.largeMapUrl ? (
                  <img
                    src={widgets?.pistes?.largeMapUrl}
                    alt="Prévisualisation large"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                ) : (
                  <div style={{ padding: 12, fontSize: 12, color: "#9ca3af" }}>—</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

                <button
          onClick={() => {
            patchWidgets();
            patchResort();
          }}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          Enregistrer
        </button>

      </section>

      {/* Description HTML */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Description (widgets.description.html)</h2>
        <label>
          Activer
          <input
            type="checkbox"
            checked={!!widgets?.description?.enabled}
            onChange={(e) => setW("description.enabled", e.target.checked)}
          />
        </label>
        <textarea
          value={widgets?.description?.html || ""}
          onChange={(e) => setW("description.html", e.target.value)}
          rows={8}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={patchWidgets}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          Enregistrer
        </button>
      </section>

      {/* Snowpark (plan/image d'aperçu) */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Snowpark (aperçu visuel)</h2>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Activer
            <input
              type="checkbox"
              checked={!!widgets?.snowpark?.enabled}
              onChange={(e) => setW("snowpark.enabled", e.target.checked)}
            />
          </label>

          <label>
            Plan (mapUrl)
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={widgets?.snowpark?.mapUrl || ""}
                onChange={(e) => setW("snowpark.mapUrl", e.target.value)}
                placeholder="https://.../plan-snowpark.svg|png|jpg"
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUploadTo("snowpark.mapUrl")}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              />
            </div>
          </label>

          <label>
            Image (imageUrl) — optionnel
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={widgets?.snowpark?.imageUrl || ""}
                onChange={(e) => setW("snowpark.imageUrl", e.target.value)}
                placeholder="https://.../snowpark.jpg"
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUploadTo("snowpark.imageUrl")}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              />
            </div>
          </label>

          <label>
            Légende
            <input
              value={widgets?.snowpark?.caption || ""}
              onChange={(e) => setW("snowpark.caption", e.target.value)}
              placeholder="Nom du secteur, année, source, etc."
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </label>

          <label>
            Logo snowpark (logoUrl)
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={widgets?.snowpark?.logoUrl || ""}
                onChange={(e) => setW("snowpark.logoUrl", e.target.value)}
                placeholder="https://.../logo-snowpark.png"
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUploadTo("snowpark.logoUrl")}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              />
              {widgets?.snowpark?.logoUrl ? (
                <img
                  src={widgets?.snowpark?.logoUrl}
                  alt="Logo snowpark"
                  style={{
                    maxWidth: 160,
                    maxHeight: 160,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    objectFit: "contain",
                  }}
                />
              ) : null}
            </div>
          </label>

                    <label>
            Description du snowpark (HTML)
            <textarea
              value={widgets?.snowpark?.descriptionHtml || ""}
              onChange={(e) => setW("snowpark.descriptionHtml", e.target.value)}
              rows={6}
              placeholder="<p>Contenu HTML de la description du snowpark…</p>"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontFamily: "monospace",
              }}
            />
          </label>


          {(widgets?.snowpark?.mapUrl || widgets?.snowpark?.imageUrl) ? (
            <div
              style={{
                marginTop: 6,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <img
                src={widgets?.snowpark?.mapUrl || widgets?.snowpark?.imageUrl}
                alt={widgets?.snowpark?.caption || "Aperçu snowpark"}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          ) : null}
        </div>

        <button
          onClick={patchWidgets}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          Enregistrer
        </button>
      </section>

      {/* ✅ Forfaits — édition par lignes */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Forfaits</h2>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          Activer
          <input
            type="checkbox"
            checked={!!widgets?.forfaits?.enabled}
            onChange={(e) => setW("forfaits.enabled", e.target.checked)}
          />
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          {forfaitItems.map((it, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 8,
                display: "grid",
                gridTemplateColumns: "2fr 1fr 2fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                placeholder="Nom du forfait (ex: Journée Adulte)"
                value={it.title || ""}
                onChange={(e) => updateForfait(idx, "title", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <input
                placeholder="Prix (ex: 45,00 €)"
                value={it.price || ""}
                onChange={(e) => updateForfait(idx, "price", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <input
                placeholder="URL (optionnel)"
                value={it.url || ""}
                onChange={(e) => updateForfait(idx, "url", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <button
                onClick={() => removeForfait(idx)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                title="Supprimer la ligne"
              >
                Suppr.
              </button>
            </div>
          ))}

          <div>
            <button
              onClick={addForfait}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
            >
              + Ajouter une ligne
            </button>
          </div>
        </div>

        <button
          onClick={patchWidgets}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          Enregistrer
        </button>
      </section>
    </main>
  );
}
