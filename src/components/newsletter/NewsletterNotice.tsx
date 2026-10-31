import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./NewsletterNotice.module.css";

export default function NewsletterNotice({ message, onClose, error = false }: { message: string; onClose: () => void; error?: boolean }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let region = document.getElementById("newsletter-notices");
    if (!region) {
      region = document.createElement("div"); region.id = "newsletter-notices";
      document.body.appendChild(region);
    }
    region.className = styles.region;
    setHost(region);
  }, []);
  useEffect(() => {
    if (error) return;
    const timer = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(timer);
  }, [message, onClose, error]);
  return host ? createPortal(<div className={styles.notice} data-error={error || undefined}>
    <span aria-hidden="true" className={styles.icon}>{error ? "!" : "✓"}</span>
    <p role={error ? "alert" : "status"}>{message}</p>
    <button type="button" onClick={onClose} aria-label="Fermer la notification">×</button>
  </div>, host) : null;
}
