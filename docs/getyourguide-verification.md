# GetYourGuide : widget, liens et vérification des traceurs

Vérification du 20 octobre 2026. Le conteneur `data-gyg-*` fourni pour Courchevel configure un widget et contient un lien classique. Ces attributs HTML n’exécutent pas de code et ne prouvent pas, à eux seuls, l’utilisation de cookies.

## Éléments vérifiés

Le code utilise `https://widget.getyourguide.com/dist/pa.umd.production.min.js`, dans l’iframe d’un widget reconnu, et éventuellement sur les pages publiques si l’option d’analyse est acceptée. Il s’agit de la même ressource, et non de deux SDK dont les effets seraient nécessairement indépendants.

La documentation officielle [How to install the Integration Analyzer](https://partner.getyourguide.support/hc/en-us/articles/13980983394333-How-to-install-the-Integration-Analyzer) identifie ce script comme outil d’analyse des liens et widgets. Le fournisseur affirme que l’Integration Analyzer ne dépose pas de cookies tiers. Cette affirmation ne démontre pas l’absence d’autres accès au stockage, de transmission de données ou de traceurs dans le widget.

La documentation officielle [How does the cookie ID tracking work?](https://partner.getyourguide.support/hc/en-us/articles/13981115983133-How-does-the-cookie-ID-tracking-work) décrit l’identifiant partenaire et une attribution reposant sur des cookies first-party GetYourGuide après le clic. Le cookie d’attribution sur la destination doit être distingué du simple lien présent sur Snow Explorer.

## Limite de la vérification réelle

L’accès direct au fichier JavaScript officiel a renvoyé HTTP 403 depuis l’environnement de travail. L’outil de lecture web n’a pas non plus pu ouvrir cette ressource JavaScript. Aucune analyse statique de sa version courante, ni aucun relevé réseau/stockage du widget réel, ne sont donc déclarés effectués. Les tests Chromium utilisent un partenaire local simulé pour vérifier notre code ; ils ne démontrent pas les traceurs employés par GetYourGuide.

Aucune conclusion d’exemption de consentement ou de conformité n’est tirée des seuls attributs HTML ou de l’affirmation relative aux cookies tiers. Le chargement direct demandé précédemment est conservé ; le refus explicite des intégrations est respecté. L’option d’analyse sur l’ensemble du site concerne l’ajout du script dans la page principale ; elle ne garantit pas que le chargeur dans une iframe n’a aucune fonction d’analyse.

## Correction fonctionnelle

Les ancres HTTPS présentes dans le code d’intégration sont rendues indépendamment du cadre externe. Elles restent visibles lors du chargement, après une erreur et après un refus des intégrations. Aucun script, iframe, pixel, attribut d’événement ou lien non HTTPS n’est repris dans cette version de secours. Les paramètres des URL fournies sont conservés ; aucun identifiant partenaire n’est inventé ni ajouté si le lien original n’en contient pas. Les liens externes portent `sponsored noopener noreferrer`.

Le titre du bloc et l’onglet de la station restent présents si ces liens constituent le seul contenu encore affichable. Les blocs désactivés et les éléments désactivés restent masqués. Cette correction n’écrit rien dans les données des stations et ne nécessite aucune migration.

Validation du correctif : les 52 fichiers de tests frontend passent, TypeScript et la compilation de production également. Les nouveaux tests couvrent les liens GetYourGuide avec paramètres, l’exclusion des scripts et des ressources dans le rendu de secours, le refus enregistré, la conservation de la carte et de l’onglet. Chromium vérifie le démontage d’un widget local simulé, un lien encore cliquable après refus vers une destination HTTPS locale, puis le maintien du véritable lien GetYourGuide après rechargement sans requête au fournisseur, sur ordinateur et mobile. Aucun `pageerror` n’a été relevé. Ces contrôles ne constituent pas un audit du JavaScript réel du partenaire.
