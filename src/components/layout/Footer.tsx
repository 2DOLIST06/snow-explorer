import Image from "next/image";
import Link from "next/link";

const groups = [
  // TODO: ajouter les URL absentes lorsque les pages correspondantes existeront.
  { title: "Découvrir", links: [{ label: "Stations", href: "/stations" }] },
  { title: "Météo & neige", links: [{ label: "Météo des stations", href: "/meteo" }] },
  { title: "Pratique", links: [{ label: "Forfaits", href: "/forfaits" }, { label: "Contact", href: "/contact" }] },
  { title: "Snow Explorer", links: [{ label: "CGU", href: "/conditions-utilisation" }, { label: "Mentions légales", href: "/mentions-legales" }, { label: "Confidentialité", href: "/confidentialite" }, { label: "Cookies", href: "/cookies" }] },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <div className="brand brand--footer"><Image src="/logo.png" alt="Snow Explorer" width={46} height={46} /><span><strong>Snow Explorer</strong><small>Préparer la montagne avec des informations claires, fiables et lisibles.</small></span></div>
          <p>Stations, météo, neige et informations pratiques réunies dans une expérience pensée pour décider vite et partir sereinement.</p>
        </div>
        <nav className="footer-links" aria-label="Liens de pied de page">
          {groups.map((group) => (
            <details key={group.title} open>
              <summary>{group.title}</summary>
              <ul>{group.links.map((link) => <li key={link.label}>{link.href ? <Link href={link.href}>{link.label}</Link> : <span>{link.label}</span>}</li>)}</ul>
            </details>
          ))}
        </nav>
      </div>
      <div className="site-footer__bottom"><span>© {new Date().getFullYear()} Snow Explorer</span><span>Données météo indicatives, à vérifier avant toute sortie.</span></div>
    </footer>
  );
}
