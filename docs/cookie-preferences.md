# Cookies propres à Snow Explorer

La bannière et « Gérer mes cookies » restent disponibles sur les pages publiques, dans le pied de page et sur `/cookies`. Les réglages peuvent être ouverts explicitement depuis l’administration, sans affichage spontané de la bannière dans cet espace.

Les choix portent uniquement sur les cookies facultatifs propres à Snow Explorer. Aucun cookie facultatif propre au site n’est installé actuellement et l’interface le dit. Le cookie de préférences et la session administrateur sont nécessaires et restent actifs. Accepter ou refuser mémorise la préférence sans prétendre arrêter un service absent.

Le cookie first-party `snow_explorer_preferences`, version 2, contient uniquement `optionalCookies`, une version et la date. Il dure 180 jours, avec `Path=/`, `SameSite=Lax` et `Secure` sous HTTPS. Il ne contient pas de secret. Si son écriture échoue, le choix s’applique en mémoire et un message l’indique. Les anciennes préférences de version 1 sont ignorées et la nouvelle bannière est présentée ; elles ne peuvent plus bloquer les partenaires.

Les bannières, liens affiliés et widgets ne lisent pas ces préférences. Tous les éléments actifs du bloc d’activités restent affichés, avec leur onglet, après acceptation, refus, personnalisation ou rechargement. Le script GetYourGuide est chargé sur les pages publiques indépendamment de la bannière, une seule fois pendant les navigations React. Le refus ne provoque aucun rechargement de page et ne retire aucun script partenaire.

Les iframes isolées, le nettoyage des scripts lors du changement de station, les liens HTTPS de secours et les attributs de sécurité sont conservés. Le chargeur du conteneur GetYourGuide reste ajouté sans doublon. Le bloc ou ses éléments restent masqués si l’administrateur les désactive ; ce réglage éditorial est indépendant des cookies.

Les réglages proposent acceptation, refus et personnalisation des cookies facultatifs du site, avec focus clavier et retour au bouton déclencheur. Ils ne contiennent plus de catégorie GetYourGuide ni de bouton pour désactiver des contenus partenaires. Toute future installation d’un cookie facultatif propre à Snow Explorer devra consulter `preferences.optionalCookies` avant d’activer son service et être ajoutée à la politique cookies. Aucun service hypothétique n’est chargé par cette modification.

Aucune migration ni modification des données des stations. Tests dédiés : stockage et expiration, absence de blocage avec un ancien refus, conservation de l’iframe et du SDK après refus, rechargement avec choix conservé, personnalisation indépendante des partenaires, SDK sans doublon sous React Strict Mode, cookies indisponibles et réglages administrateur.

Validation locale du 20 octobre 2026 : 52 fichiers de tests frontend réussis, sept tests de préférences, TypeScript sans erreur et compilation Next.js de production réussie. Chromium sur ordinateur et mobile vérifie que le refus ou la personnalisation ne démonte ni ne relance l’iframe ou le SDK, ne recharge pas la page et ne retire ni la carte, ni l’onglet, ni le lien affilié. Le widget reste chargé après rechargement avec un refus mémorisé et avec un ancien cookie de refus des partenaires. Aucun `pageerror` sur ces parcours avec partenaires simulés.
