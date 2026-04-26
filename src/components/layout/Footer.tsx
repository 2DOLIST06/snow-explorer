import Image from "next/image";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 36,
        width: "100%",
        background: "linear-gradient(90deg, #0f172a 0%, #1e293b 45%, #0f172a 100%)",
        color: "white",
        padding: "36px 24px 42px",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo.png" alt="Logo Snow Explorer" width={44} height={44} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>Snow Explorer</div>
            <div style={{ opacity: 0.8 }}>Votre référence montagne</div>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Nous contacter</div>
          <div>contact@snowexplorer.fr</div>
          <div>+33 4 00 00 00 00</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Navigation</div>
          <div>Stations</div>
          <div>Forfaits</div>
          <div>Activités</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Informations</div>
          <div>Mentions légales</div>
          <div>Politique de confidentialité</div>
          <div>Partenaires</div>
        </div>
      </div>
    </footer>
  );
}
