import React, { useState } from "react";

type Props = {
  smallMapUrl?: string | null;
  largeMapUrl?: string | null;
  caption?: string | null;
  enabled?: boolean;
};

const StationPistesCard: React.FC<Props> = ({ smallMapUrl, largeMapUrl, caption, enabled }) => {
  const [open, setOpen] = useState(false);
  if (!enabled && !smallMapUrl) return null;

  const cardStyle: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: 12,
    /* rendu compact dans la colonne droite */
    maxWidth: 360,
    display: "inline-block",
    outline: "2px dashed #f59e0b"
  };

  const thumbWrap: React.CSSProperties = {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%", // 16:9
    overflow: "hidden",
    borderRadius: 10,
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    cursor: "pointer",
  };

  const thumbImg: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  const modalOverlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalBox: React.CSSProperties = {
    position: "relative",
    maxWidth: "90vw",
    maxHeight: "90vh",
    background: "#fff",
    borderRadius: 12,
    padding: 12,
  };

  const closeBtn: React.CSSProperties = {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 18,
    lineHeight: "30px",
    textAlign: "center",
    cursor: "pointer",
  };

  return (
    <section style={cardStyle}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>Plan des pistes</h2>

      {smallMapUrl ? (
        <div style={thumbWrap} onClick={() => setOpen(true)} aria-label="Voir le plan des pistes">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={smallMapUrl} alt={caption || "Plan des pistes"} style={thumbImg} />
        </div>
      ) : (
        <div style={{ fontSize: 14, color: "#6b7280" }}>Miniature non configurée.</div>
      )}

      {caption ? <p style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>{caption}</p> : null}

      {open && (
        <div style={modalOverlay} onClick={() => setOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setOpen(false)} aria-label="Fermer">×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {largeMapUrl ? (
              <img
                src={largeMapUrl}
                alt={caption || "Plan des pistes"}
                /* taille réelle dans la limite de la fenêtre */
                style={{
                  width: "auto",
                  height: "auto",
                  maxWidth: "96vw",
                  maxHeight: "90vh",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            ) : (
              <p style={{ fontSize: 14 }}>Agrandissement non configuré.</p>
            )}
            {caption ? <p style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>{caption}</p> : null}
          </div>
        </div>
      )}
    </section>
  );
};

export default StationPistesCard;

