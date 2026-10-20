import { useEffect, useRef } from "react";
const SCRIPT_ID = "gyg-site-analytics";
export default function PartnerAnalytics({ enabled, onStart }: { enabled: boolean; onStart: () => void }) {
  const start = useRef(onStart); start.current = onStart;
  useEffect(() => {
    if (!enabled) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID; script.async = true; script.defer = true;
    script.src = "https://widget.getyourguide.com/dist/pa.umd.production.min.js";
    script.dataset.gygPartnerId = "32QOCNG";
    document.head.appendChild(script); start.current();
    return () => script.remove();
  }, [enabled]);
  return null;
}
