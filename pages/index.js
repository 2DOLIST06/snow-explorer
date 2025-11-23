export default function Home() {
  return (
    <div className="page">
      <div className="card">
        <div className="badge">Site en préparation</div>

        <img
          src="/logo.png"
          alt="Snow Explorer"
          className="logo"
        />

        <h1>Snow Explorer arrive bientôt</h1>
        <p className="subtitle">
          Un nouveau guide des stations de ski se prépare. 
          Compare les domaines, les conditions et les bonnes adresses 
          pour organiser tes séjours à la neige en quelques clics.
        </p>

        <p className="small">
          Ajoute cette page à tes favoris et reviens vite nous voir ⛷️
        </p>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top, #f4f8ff 0, #e3f0ff 40%, #dde9f5 70%, #cedbea 100%);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
        }

        .card {
          max-width: 540px;
          width: 100%;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 18px;
          padding: 28px 24px 24px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.08);
          text-align: center;
          backdrop-filter: blur(8px);
        }

        .badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #1b3a5a;
          background: #e2edff;
          margin-bottom: 14px;
        }

        .logo {
          max-width: 260px;
          width: 60vw;
          height: auto;
          margin: 0 auto 18px;
          display: block;
        }

        h1 {
          font-size: 24px;
          margin: 0 0 12px;
          color: #18314b;
        }

        .subtitle {
          margin: 0 0 14px;
          font-size: 15px;
          line-height: 1.5;
          color: #425772;
        }

        .small {
          margin: 0;
          font-size: 13px;
          color: #6b7b94;
        }

        @media (min-width: 768px) {
          .card {
            padding: 32px 32px 26px;
          }

          h1 {
            font-size: 28px;
          }

          .subtitle {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
