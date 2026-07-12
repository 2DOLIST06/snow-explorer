import Image from "next/image";

const groups = [
  { title: "Découvrir", links: ["Stations", "Destinations", "Domaines skiables", "Bons plans"] },
  { title: "Météo & neige", links: ["Météo des stations", "Prévisions neige", "Webcams", "Bulletins"] },
  { title: "Pratique", links: ["Forfaits", "Activités", "Contact", "Aide"] },
  { title: "Snow Explorer", links: ["À propos", "Mentions légales", "Confidentialité", "Cookies"] },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <div className="brand brand--footer"><Image src="/logo.png" alt="" width={46} height={46} /><span><strong>Snow Explorer</strong><small>Préparer la montagne avec des informations claires, fiables et lisibles.</small></span></div>
          <p>Stations, météo, neige et informations pratiques réunies dans une expérience pensée pour décider vite et partir sereinement.</p>
        </div>
        <nav className="footer-links" aria-label="Liens de pied de page">
          {groups.map((group) => (
            <details key={group.title} open>
              <summary>{group.title}</summary>
              <ul>{group.links.map((link) => <li key={link}><a href="#">{link}</a></li>)}</ul>
            </details>
          ))}
        </nav>
      </div>
      <div className="site-footer__bottom"><span>© {new Date().getFullYear()} Snow Explorer</span><span>Données météo indicatives, à vérifier avant toute sortie.</span></div>
    </footer>
  );
}
