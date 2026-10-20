import { useEffect } from "react";
const SCRIPT_ID = "gyg-site-analytics";
export default function PartnerAnalytics({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let script: HTMLScriptElement | null = null;
    // React Strict Mode probes effects with an immediate mount/unmount. Wait
    // one task so that probe never starts a second request to the partner.
    const timer = window.setTimeout(() => {
      if (document.getElementById(SCRIPT_ID)) return;
      script = document.createElement("script");
      script.id = SCRIPT_ID; script.async = true; script.defer = true;
      script.src = "https://widget.getyourguide.com/dist/pa.umd.production.min.js";
      script.dataset.gygPartnerId = "32QOCNG";
      document.head.appendChild(script);
    }, 0);
    return () => { window.clearTimeout(timer); script?.remove(); };
  }, [enabled]);
  return null;
}
