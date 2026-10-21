# Remplacement du bloc d’activités par département

## État de livraison : brouillon, codes fournisseur manquants

Le code GetYourGuide annoncé dans la demande n’a pas été joint au message et aucun fichier fourni ne le contient. Le dépôt contient un exemple de test avec `data-gyg-location-id="201172"`, ciblé sur Courchevel, et le partenaire `32QOCNG`. Cet identifiant de ville n’est pas une destination départementale. Il n’a été repris pour aucun département. Le véritable contrat de destination et les paramètres d’affiliation du widget demandé restent à vérifier sur le code fourni.

En conséquence, les 96 entrées `widget` de `src/lib/departmentActivities.json` sont explicitement `null`. Aucun widget de remplacement réel n’est actuellement activé. Cette PR prépare et vérifie le mécanisme ; elle ne doit pas être présentée comme une intégration GetYourGuide terminée. Il faut fournir le code original puis les destinations départementales validées avant activation.

## Comportement

La page résout le contenu avant de rendre le composant `ActivitiesBlock` existant. Le composant, son nettoyage HTML, ses liens affiliés et ses scripts ne sont pas modifiés. Aucun deuxième bloc n’est créé. L’emplacement initial en bas, la sélection qui remonte une rubrique en tête, `data-section="activites"`, `activities-heading` et `station-conditions` sont conservés. Le libellé de l’onglet, actuellement au pluriel dans le dépôt, devient exactement « Activité à faire » sur ordinateur et mobile. Le titre des blocs personnalisés conserve le comportement actuel.

La présence de contenu utilise les valeurs enregistrées dans les éléments image, rich et embed, indépendamment de leur activation ou du résultat réseau. Une image invalide ou en erreur, un script bloqué, une iframe et un conteneur partenaire identifié empêchent le remplacement. Les chaînes nulles/vides, espaces, paragraphes vides, `<br>` et espaces insécables seuls sont reconnus comme vides. Les éléments désactivés contenant du contenu empêchent également le remplacement et restent masqués par le rendu existant. Le titre seul ne constitue pas un corps de bloc : l’API attribue déjà un titre par défaut aux blocs sans contenu.

Une erreur HTTP, un délai dépassé ou une réponse d’activités invalide laisse `activitiesLoaded=false`. Une absence de réponse ne constitue pas une preuve de bloc vide et ne déclenche jamais le remplacement.

Le département provient exclusivement de `station.department`. Le code est privilégié quand l’objet expose `code`; les noms enregistrés par l’API actuelle sont réconciliés exactement avec le référentiel, après normalisation des espaces, de la casse, des apostrophes et de l’Unicode. Les identifiants opaques, noms de station, coordonnées et positions du visiteur ne servent jamais à choisir une destination. Un code explicite inconnu ne se rabat pas sur un nom contradictoire.

## Configuration centralisée et correspondances manquantes

`departmentActivities.json` contient les codes, noms, formulations complètes et codes de widget vérifiés par département. Il reprend les **96 départements** de `snow-explorer-api/app/routes/public_departments.py`. Aucun champ station supplémentaire n’est nécessaire.

Après réception et examen du code fournisseur, renseigner uniquement les entrées validées avec `widget: { "html": "CODE ORIGINAL CIBLÉ SUR CE DÉPARTEMENT", "origins": ["ORIGINES HTTPS NÉCESSAIRES"] }`. Conserver le partenaire, les liens et leurs paramètres d’affiliation ; modifier uniquement le ciblage nécessaire. Le HTML complet permet de conserver le contrat réel du fournisseur sans supposer qu’un texte ou un identifiant inventé est accepté. Si un département n’a pas de destination fournisseur correspondante, laisser `widget: null`.

Départements rencontrés dans les fichiers JSON locaux du projet (imports et exemples), tous sans widget départemental validé :

| Code | Département | Formulation du H2 après « Activité à faire » |
| --- | --- | --- |
| 01 | Ain | dans l’Ain |
| 04 | Alpes-de-Haute-Provence | dans les Alpes-de-Haute-Provence |
| 05 | Hautes-Alpes | dans les Hautes-Alpes |
| 06 | Alpes-Maritimes | dans les Alpes-Maritimes |
| 09 | Ariège | en Ariège |
| 15 | Cantal | dans le Cantal |
| 25 | Doubs | dans le Doubs |
| 31 | Haute-Garonne | en Haute-Garonne |
| 38 | Isère | dans l’Isère |
| 39 | Jura | dans le Jura |
| 63 | Puy-de-Dôme | dans le Puy-de-Dôme |
| 64 | Pyrénées-Atlantiques | dans les Pyrénées-Atlantiques |
| 65 | Hautes-Pyrénées | dans les Hautes-Pyrénées |
| 66 | Pyrénées-Orientales | dans les Pyrénées-Orientales |
| 73 | Savoie | en Savoie |
| 74 | Haute-Savoie | en Haute-Savoie |
| 88 | Vosges | dans les Vosges |

Aucun département des fichiers locaux examinés ne manque au référentiel. Cette analyse ne constitue pas un audit de la base de production. `departmentActivityGaps(values)` distingue `unknown_department` et `missing_widget` pour contrôler un futur export. Les 79 autres départements du référentiel ont aussi une formulation mais restent sans widget validé.

## Chargement et navigation

Les remplacements utilisent les mêmes iframes isolées, CSP, adaptation de hauteur et styles fluides que les widgets personnalisés. La résolution est mémorisée pour ne pas redémarrer un widget lors d’un changement d’état sans rapport. La clé de station existante démonte le cadre et ses écouteurs lors du changement de station. Un script ne peut donc pas conserver la destination de la station précédente.

Le chargeur GetYourGuide déjà présent dans `widgetDocument` n’est ajouté qu’en l’absence de sa balise dans le code embarqué. L’analytique GetYourGuide globale existante n’est pas modifiée. Une bibliothèque présente dans le document parent ne peut pas être réutilisée depuis un cadre opaque : le chargeur reste unique par document isolé, comme pour les intégrations actuelles. Aucun appel hypothétique de rafraîchissement du SDK n’est ajouté.

## Vérifications

- Suite frontend : `npm test`, 55 fichiers réussis.
- Typage : `npx tsc --noEmit`, réussi.
- Compilation : `npm run build`, réussie.
- Tests métier : contenu vide, HTML d’éditeur vide, textes, images invalides, scripts bloqués, conteneurs partenaires, éléments désactivés, API indisponible, département absent/inconnu, code contradictoire et widgets manquants.
- Chromium sur une page de vérification temporaire : un seul bloc en bas, passage entre deux stations sans rechargement, conservation des contenus personnalisés, absence de remplacement pour un département inconnu ou des données indisponibles, libellé et sélection de l’onglet, ancres conservées, aucune erreur JavaScript de page et aucun débordement horizontal à 390 px. Les ressources externes sont simulées ou bloquées ; ce contrôle ne valide pas l’exécution réelle chez GetYourGuide. La route temporaire est supprimée avant livraison.
- Test React : passage entre deux départements, remplacement du document iframe, retrait des écouteurs, priorité au texte/image/script personnalisé et disparition en cas de destination inconnue.

Les tests utilisent un partenaire synthétique HTTPS, sans faux identifiants GetYourGuide dans la configuration. Le rendu et le ciblage réels chez GetYourGuide restent à vérifier après réception du code et des correspondances validées.
