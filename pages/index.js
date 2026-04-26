export default function Home() {
  return (
    <div className="page">
      <main className="hero">
        <div className="overlay" />
        <div className="content">
          <h1>Snow Explorer arrive bientôt</h1>
          <p>
            Un nouveau guide des stations de ski se prépare. Comparez les domaines,
            les conditions et les bonnes adresses pour organiser vos séjours à la neige.
          </p>
        </div>
      </main>

      <style jsx>{`
        .page { min-height: 100vh; background: #eaf2ff; }
        .hero {
          min-height: calc(100vh - 160px);
          position: relative;
          background-image: url('https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg');
          background-size: cover;
          background-position: center;
          display: grid;
          place-items: center;
        }
        .overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.62), rgba(2, 6, 23, 0.35));
        }
        .content {
          position: relative;
          z-index: 2;
          max-width: 760px;
          text-align: center;
          color: white;
          padding: 24px;
        }
        h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.2rem); }
        p { margin: 0; font-size: 1.1rem; line-height: 1.55; }
      `}</style>
    </div>
  );
}
