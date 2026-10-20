import { useState } from "react";
import { uploadStationImage } from "@/lib/stationImageUpload";
export default function ActivityImageInput({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div><label>URL HTTPS de l’image<input value={value} onChange={e => onChange(e.target.value)} /></label>
    <label>Téléverser une image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return;
      setBusy(true); setError("");
      try { onChange(await uploadStationImage(file)); } catch (err) { setError(err instanceof Error ? err.message : "Échec du téléversement"); } finally { setBusy(false); }
    }} /></label>{busy && <p role="status">Téléversement…</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
