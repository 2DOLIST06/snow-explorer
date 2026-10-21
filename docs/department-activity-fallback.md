# Remplacement du bloc d’activités par département

## État de livraison : 18 correspondances renseignées, 78 en attente

Le code fourni par l’utilisateur utilise le widget `city`, l’URL `https://widget.getyourguide.com/default/city.frame`, la langue `fr-FR`, le partenaire `32QOCNG` et `data-gyg-location-id="200"`. La localisation attend donc un identifiant GetYourGuide, pas un nom de département. La destination de l’identifiant 200 n’a pas été confirmée ; il n’est associé à aucun département par défaut. Le dépôt contient aussi un ancien exemple Courchevel (`201172`), qui n’est pas une correspondance départementale.

Le format exact fourni est intégré. Seul `data-gyg-location-id` change selon la correspondance centralisée. Les **18 correspondances indiquées comme confirmées par l’utilisateur le 21 octobre 2026** sont renseignées dans `src/lib/departmentActivities.json`. Les **78 autres valeurs restent `null`**. La présence d’un identifiant active le remplacement uniquement pour un bloc vide et un département correspondant ; la priorité au contenu personnalisé reste inchangée.

L’identifiant `173369` proposé pour les Vosges reste exclu : le périmètre département/massif n’est pas confirmé. L’identifiant `159731` reste également exclu du Puy-de-Dôme, puisqu’il correspond au sommet. L’identifiant initial `200` reste sans attribution départementale. Aucun de ces identifiants n’est utilisé comme repli.

## Comportement

La page résout le contenu avant de rendre le composant `ActivitiesBlock` existant. Le composant, son nettoyage HTML, ses liens affiliés et ses scripts ne sont pas modifiés. Aucun deuxième bloc n’est créé. L’emplacement initial en bas, la sélection qui remonte une rubrique en tête, `data-section="activites"`, `activities-heading` et `station-conditions` sont conservés. Le libellé de l’onglet, actuellement au pluriel dans le dépôt, devient exactement « Activité à faire » sur ordinateur et mobile. Le titre des blocs personnalisés conserve le comportement actuel.

La présence de contenu utilise les valeurs enregistrées dans les éléments image, rich et embed, indépendamment de leur activation ou du résultat réseau. Une image invalide ou en erreur, un script bloqué, une iframe et un conteneur partenaire identifié empêchent le remplacement. Les chaînes nulles/vides, espaces, paragraphes vides, `<br>` et espaces insécables seuls sont reconnus comme vides. Les éléments désactivés contenant du contenu empêchent également le remplacement et restent masqués par le rendu existant. Le titre seul ne constitue pas un corps de bloc : l’API attribue déjà un titre par défaut aux blocs sans contenu.

Une erreur HTTP, un délai dépassé ou une réponse d’activités invalide laisse `activitiesLoaded=false`. Une absence de réponse ne constitue pas une preuve de bloc vide et ne déclenche jamais le remplacement.

Le département provient exclusivement de `station.department`. Le code est privilégié quand l’objet expose `code`; les noms enregistrés par l’API actuelle sont réconciliés exactement avec le référentiel, après normalisation des espaces, de la casse, des apostrophes et de l’Unicode. Les identifiants opaques, noms de station, coordonnées et positions du visiteur ne servent jamais à choisir une destination. Un code explicite inconnu ne se rabat pas sur un nom contradictoire.

## Configuration centralisée et correspondances manquantes

`departmentActivities.json` contient les codes, noms, formulations complètes et identifiants de destination GetYourGuide validés par département. Il reprend les **96 départements** de `snow-explorer-api/app/routes/public_departments.py`. Aucun champ station supplémentaire n’est nécessaire.

Renseigner `locationId` avec l’identifiant GetYourGuide validé pour le département de la ligne. Le code français du département reste la clé ; il ne doit jamais être utilisé comme identifiant fournisseur. Aucun autre paramètre du widget n’est modifié. Le code utilise le chargeur GetYourGuide déjà présent dans le dépôt, ajouté une seule fois dans le document isolé du remplacement. Si le fournisseur ne dispose pas de destination départementale correspondante, laisser `locationId: null`.

Départements rencontrés dans les fichiers JSON locaux du projet (imports et exemples) : **11 avec identifiant fourni, 6 sans correspondance activée**.

| Code | Département | Identifiant GetYourGuide | Formulation du H2 après « Activité à faire » |
| --- | --- | --- | --- |
| 01 | Ain | 247436 | dans l’Ain |
| 04 | Alpes-de-Haute-Provence | 247540 | dans les Alpes-de-Haute-Provence |
| 05 | Hautes-Alpes | Non confirmé | dans les Hautes-Alpes |
| 06 | Alpes-Maritimes | 167019 | dans les Alpes-Maritimes |
| 09 | Ariège | 247575 | en Ariège |
| 15 | Cantal | Non confirmé | dans le Cantal |
| 25 | Doubs | 247435 | dans le Doubs |
| 31 | Haute-Garonne | 247573 | en Haute-Garonne |
| 38 | Isère | Non confirmé | dans l’Isère |
| 39 | Jura | 247437 | dans le Jura |
| 63 | Puy-de-Dôme | Non confirmé | dans le Puy-de-Dôme |
| 64 | Pyrénées-Atlantiques | 247572 | dans les Pyrénées-Atlantiques |
| 65 | Hautes-Pyrénées | 247574 | dans les Hautes-Pyrénées |
| 66 | Pyrénées-Orientales | 247576 | dans les Pyrénées-Orientales |
| 73 | Savoie | Non confirmé | en Savoie |
| 74 | Haute-Savoie | 120865 | en Haute-Savoie |
| 88 | Vosges | Non activé : périmètre de 173369 à vérifier | dans les Vosges |

Les sept autres correspondances fournies et activées dans le référentiel sont :

| Code | Département | Identifiant GetYourGuide |
| --- | --- | --- |
| 07 | Ardèche | 248284 |
| 11 | Aude | 259128 |
| 2B | Haute-Corse | 150371 |
| 30 | Gard | 222497 |
| 67 | Bas-Rhin | 186738 |
| 68 | Haut-Rhin | 247438 |
| 84 | Vaucluse | 185371 |

Codes sans correspondance activée (**78**) : 02, 03, 05, 08, 10, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 29, 2A, 32, 33, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 69, 70, 71, 72, 73, 75, 76, 77, 78, 79, 80, 81, 82, 83, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95.

Aucun département des fichiers locaux examinés ne manque au référentiel. Cette analyse ne constitue pas un audit de la base de production. `departmentActivityGaps(values)` distingue `unknown_department` et `missing_destination_id` pour contrôler un futur export.

Les identifiants et leur statut proviennent du tableau fourni par l’utilisateur. Les liens GetYourGuide associés dans ce tableau sont conservés ci-dessous comme provenance ; ils ne constituent pas une vérification indépendante de tous les identifiants ni du rendu du widget :

- Alpes-de-Haute-Provence : https://www.getyourguide.com/alpes-de-haute-provence-l247540/day-trips-tc172/
- Ariège / Pyrénées : https://www.getyourguide.com/fr-fr/ariege-l247575/
- Ain / Jura : https://www.getyourguide.com/en-au/ain-france-l247436/
- Bas-Rhin / Vosges : https://www.getyourguide.com/de-de/departement-bas-rhin-l186738/
- Ardèche / Massif central : https://www.getyourguide.com/fr-fr/ardeche-l248284/

## Chargement et navigation

Les remplacements utilisent les mêmes iframes isolées, CSP, adaptation de hauteur et styles fluides que les widgets personnalisés. La résolution est mémorisée pour ne pas redémarrer un widget lors d’un changement d’état sans rapport. La clé de station existante démonte le cadre et ses écouteurs lors du changement de station. Un script ne peut donc pas conserver la destination de la station précédente.

Le remplacement ajoute explicitement une seule balise vers le chargeur GetYourGuide déjà utilisé dans le dépôt. L’URL du chargeur est partagée avec `widgetDocument`, dont le comportement de chargement des intégrations personnalisées reste inchangé. L’analytique GetYourGuide globale existante n’est pas modifiée. Une bibliothèque présente dans le document parent ne peut pas être réutilisée depuis un cadre opaque : le chargeur reste unique par document isolé, comme pour les intégrations actuelles. Aucun appel hypothétique de rafraîchissement du SDK n’est ajouté.

## Vérifications

- Suite frontend : `npm test`, 55 fichiers réussis.
- Typage : `npx tsc --noEmit`, réussi.
- Compilation : `npm run build`, réussie.
- Tests métier : contenu vide, HTML d’éditeur vide, textes, images invalides, scripts bloqués, conteneurs partenaires, éléments désactivés, API indisponible, département absent/inconnu, code contradictoire et widgets manquants.
- Chromium sur une page de vérification temporaire : un seul bloc en bas, passage entre deux stations sans rechargement, conservation des contenus personnalisés, absence de remplacement pour un département inconnu ou des données indisponibles, libellé et sélection de l’onglet, ancres conservées, aucune erreur JavaScript de page et aucun débordement horizontal à 390 px. Les ressources externes sont simulées ou bloquées ; ce contrôle ne valide pas l’exécution réelle chez GetYourGuide. La route temporaire est supprimée avant livraison.
- Test React : passage entre deux départements, remplacement du document iframe, retrait des écouteurs, priorité au texte/image/script personnalisé et disparition en cas de destination inconnue.

Les tests utilisent le format fourni, avec des identifiants synthétiques explicitement réservés aux tests, jamais placés dans la configuration de production. Les 18 correspondances fournies sont testées dans la résolution du bloc et les destinations non confirmées restent désactivées. Le rendu et le ciblage réels chez GetYourGuide restent à vérifier avec le service fournisseur ; aucun déploiement n’est effectué.
