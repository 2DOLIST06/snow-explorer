import LegalPageLayout from "@/components/legal/LegalPageLayout";
import Link from "next/link";

export default function MentionsLegalesPage() {
  return <LegalPageLayout title="Mentions légales" pageTitle="Mentions légales | Snow Explorer" description="Informations légales relatives à l'édition et à l'hébergement de Snow Explorer." canonicalPath="/mentions-legales">
    <section><h2>Éditeur du site</h2><p>Le site Snow Explorer est édité par :</p><address className="legal-page__address">{`2DOLIST SAS
Société par actions simplifiée au capital de 5 000 €
Siège social : 1735 route des Condamines, 06670 Saint-Martin-du-Var, France
SIREN : 948 606 702
SIRET : 948 606 702 00066
RCS Nice : 948 606 702
Code APE : 63.12Z – Portails Internet
N° TVA intracommunautaire : FR71948606702`}</address><p>E-mail : <a href="mailto:support@2dolist.fr">support@2dolist.fr</a></p></section>
    <section><h2>Directeur de la publication</h2><p>Le directeur de la publication est Nicolas Braun, en qualité de président de 2DOLIST SAS.</p></section>
    <section><h2>Hébergement</h2><p>L'interface web de Snow Explorer est hébergée par :</p><address className="legal-page__address">{`Vercel Inc.
440 N Barranca Ave #4133
Covina, CA 91723
États-Unis
Téléphone : +1 559 288 7060`}</address><p>L'API et les services backend utilisés par Snow Explorer sont hébergés par :</p><address className="legal-page__address">{`Render Services, Inc.
525 Brannan Street, Suite 300
San Francisco, CA 94107
États-Unis
Téléphone : +1 415 319 8186`}</address></section>
    <section><h2>Nature du service</h2><p>Snow Explorer est un service d'information consacré aux stations de ski, domaines skiables et activités associées.</p><p>Snow Explorer n'est pas le site officiel des stations et domaines présentés sur le Site.</p><p>Les informations disponibles sur Snow Explorer sont fournies à titre informatif et peuvent évoluer. Pour toute information déterminante concernant notamment les dates d'ouverture, l'état des pistes, les remontées mécaniques, les tarifs, l'enneigement ou les conditions d'accès, l'utilisateur est invité à vérifier les informations directement auprès de la station, du domaine ou de la source officielle concernée.</p><p>Les conditions détaillées d'utilisation du Site sont définies dans les <Link href="/conditions-utilisation">Conditions Générales d'Utilisation</Link> accessibles depuis le pied de page.</p></section>
    <section><h2>Propriété intellectuelle</h2><p>Sauf indication contraire, la structure du Site ainsi que les contenus originaux créés pour Snow Explorer sont la propriété de 2DOLIST SAS ou sont utilisés conformément aux droits dont elle dispose.</p><p>Les marques, noms commerciaux, logos, photographies, cartes, plans et autres contenus appartenant à des tiers restent la propriété de leurs titulaires respectifs.</p><p>La présence d'une marque, d'un logo ou d'une référence à une station ou à un domaine skiable sur Snow Explorer n'implique pas nécessairement l'existence d'un partenariat avec son titulaire.</p></section>
    <section><h2>Liens externes</h2><p>Snow Explorer peut proposer des liens vers les sites officiels de stations, offices de tourisme, exploitants, services météorologiques et autres sites tiers.</p><p>Ces sites sont indépendants de Snow Explorer et 2DOLIST SAS n'est pas responsable de leur contenu ou de leur disponibilité.</p></section>
    <section><h2>Publicité et affiliation</h2><p>Snow Explorer peut être financé en partie par la publicité et par des programmes d'affiliation.</p><p>Certains liens peuvent ainsi permettre à 2DOLIST SAS de percevoir une commission lorsqu'un utilisateur effectue ensuite une réservation ou un achat auprès d'un partenaire.</p><p>La présence d'un lien commercial ou affilié n'a pas pour effet de transformer Snow Explorer en vendeur du produit ou du service concerné lorsque la transaction est conclue directement avec le site tiers.</p></section>
    <section><h2>Données personnelles</h2><p>Pour connaître les conditions dans lesquelles des données personnelles peuvent être traitées lors de l'utilisation de Snow Explorer, l'utilisateur peut consulter la <Link href="/confidentialite">Politique de confidentialité</Link> accessible depuis le pied de page du Site.</p><p>Les informations concernant les cookies et autres traceurs sont disponibles sur la page <Link href="/cookies">Cookies</Link>.</p></section>
    <section><h2>Contact</h2><p>Pour toute demande concernant Snow Explorer :</p><p className="legal-page__contact"><a href="mailto:support@2dolist.fr">support@2dolist.fr</a></p></section>
  </LegalPageLayout>;
}
