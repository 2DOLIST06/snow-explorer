import { useCookiePreferences } from "@/contexts/CookiePreferencesContext";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default function CookiesPage() {
  const { openSettings } = useCookiePreferences();
  return <LegalPageLayout title="Politique relative aux cookies" pageTitle="Cookies | Snow Explorer" description="Informations sur les cookies et préférences de Snow Explorer." canonicalPath="/cookies">
    <section><h2>Les cookies de Snow Explorer</h2><p>Un cookie est une information enregistrée dans votre navigateur. Snow Explorer utilise les cookies nécessaires à la mémorisation de vos préférences et à la sécurité de l’administration.</p></section>
    <section><h2>Cookies nécessaires</h2><ul>
      <li><strong>Préférences cookies :</strong> <code>snow_explorer_preferences</code> mémorise votre choix pendant 180 jours. Il ne contient pas de mot de passe.</li>
      <li><strong>Session administrateur :</strong> un cookie de session permet aux administrateurs de se connecter. Il ne sert pas au suivi publicitaire.</li>
    </ul><p>Ces cookies nécessaires restent actifs pour assurer leur fonction.</p></section>
    <section><h2>Cookies facultatifs Snow Explorer</h2><p>Aucun cookie facultatif propre à Snow Explorer n’est installé actuellement. La bannière permet de mémoriser votre préférence d’acceptation ou de refus de ces cookies.</p></section>
    <section><h2>Publicité, affiliation et activités</h2><p>Les bannières, liens affiliés et widgets d’activités restent accessibles quel que soit votre choix dans notre bannière cookies. Les préférences Snow Explorer ne désactivent pas ces contenus.</p><p>Certains liens vous dirigent vers un site partenaire. Lors de votre visite sur ce site, sa propre politique de confidentialité s’applique. Vous pouvez notamment consulter la <a href="https://www.getyourguide.com/privacy_policy" target="_blank" rel="noopener noreferrer">politique de confidentialité GetYourGuide</a>.</p></section>
    <section><h2>Modifier ses préférences</h2><p>Utilisez « Gérer mes cookies » en pied de page ou le bouton ci-dessous. Vous pouvez tout accepter, tout refuser ou personnaliser les cookies facultatifs de Snow Explorer sans modifier l’affichage des activités.</p><button type="button" className="btn" onClick={openSettings}>Gérer mes cookies</button></section>
    <section><h2>Contact</h2><p><a href="mailto:support@2dolist.fr">support@2dolist.fr</a></p></section>
  </LegalPageLayout>;
}
