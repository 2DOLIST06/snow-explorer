import { requireAdminResponse } from "@/lib/adminApi";
import { useState } from "react";

type Props = {
  endpoint: string;
  label: string;
  successMessage: string;
  confirmation?: string;
};

type PurgeState = "normal" | "loading" | "success" | "error";

export default function CachePurgeButton({ endpoint, label, successMessage, confirmation }: Props) {
  const [state, setState] = useState<PurgeState>("normal");
  const [message, setMessage] = useState("");

  async function purge() {
    if (state === "loading") return;
    if (confirmation && !window.confirm(confirmation)) return;

    setState("loading");
    setMessage("");
    try {
      await requireAdminResponse(endpoint, { method: "POST" });
      setState("success");
      setMessage(successMessage);
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "La purge du cache a échoué.");
    }
  }

  return <div className="admin-cache-action">
    <button
      type="button"
      className="btn btn--secondary"
      disabled={state === "loading"}
      onClick={() => void purge()}
    >
      {state === "loading" ? "Purge en cours…" : label}
    </button>
    <div className="admin-cache-action__status" aria-live="polite" aria-atomic="true">
      {message && <p className={`admin-cache-alert admin-cache-alert--${state}`} role={state === "error" ? "alert" : "status"}>{message}</p>}
    </div>
  </div>;
}
