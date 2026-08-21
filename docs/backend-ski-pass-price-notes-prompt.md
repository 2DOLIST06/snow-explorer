# Prompt backend — notes étoilées des tarifs de forfaits

Le front distingue volontairement deux propriétés sur un tarif normalisé :

- `label` est le libellé existant d'un tarif dynamique et ne doit pas changer de
  sens ;
- `note` est la nouvelle note optionnelle qui déclenche l'affichage d'une étoile
  rouge et de sa légende sous la grille.

Le front ne peut afficher la note que si l'API conserve puis restitue `note` sur
chaque objet prix. Un JSON utilisant uniquement `label` ne déclenche donc pas la
note étoilée.

## Prompt à transmettre à l'équipe backend

> Ajoute la prise en charge complète de la propriété optionnelle `note`
> (`string | null`) sur chaque tarif de forfait normalisé (« ski pass price »).
> Cette propriété contient le texte de la note étoilée associée à une cellule de
> prix.
>
> ### Modèle et migration
>
> - Ajoute une colonne nullable `note` de type texte à la table qui stocke les
>   prix/tarifs normalisés.
> - La migration doit être rétrocompatible : les tarifs existants conservent
>   `note = null`.
> - Ne renomme, ne réutilise et ne modifie surtout pas la colonne `label` :
>   `label` reste le libellé existant des tarifs dynamiques.
>
> ### Validation et normalisation
>
> - Accepte `note` sous la forme d'une chaîne ou de `null`.
> - Supprime les espaces en début et fin de chaîne.
> - Normalise une chaîne vide en `null`.
> - Refuse toute autre valeur avec une erreur de validation 400 qui indique le
>   chemin précis du tarif concerné.
> - La présence de `note` est autorisée pour un tarif `fixed` comme pour un tarif
>   `dynamic`.
>
> ### Import JSON
>
> - Accepte et valide `note` dans
>   `POST /api/admin/stations/:slug/forfaits/preview`.
> - Inclus `note` dans les données couvertes par le `preview_token`, si le token
>   représente ou signe le contenu prévisualisé.
> - Persiste `note` dans
>   `POST /api/admin/stations/:slug/forfaits/import`.
> - Lors du remplacement complet d'une saison, importe la note de chaque tarif
>   au même titre que `price`, `price_min`, `price_max` et `label`.
>
> ### Lecture et édition
>
> - Retourne systématiquement `note` (`string` ou `null`) sur chaque objet prix
>   dans `GET /api/admin/stations/:slug/ski-passes`.
> - Accepte et persiste `note` dans
>   `PUT /api/admin/stations/:slug/ski-passes/:seasonId`.
> - Retourne `note` sur chaque objet prix dans la route publique
>   `GET /api/stations/:slug/ski-passes`.
> - Vérifie tous les serializers/DTO/schemas de sortie : aucun ne doit supprimer
>   `note` comme propriété inconnue.
>
> ### Compatibilité impérative
>
> - Le comportement actuel de `label` doit rester strictement inchangé.
> - Ne copie pas automatiquement `label` vers `note`, car d'anciens tarifs
>   dynamiques utilisent déjà `label` avec une autre signification.
> - L'absence de `note` ne doit modifier ni le prix, ni le caractère dynamique,
>   ni la visibilité d'un tarif.
>
> ### Tests backend attendus
>
> - Un import preview accepte `note` et la réponse/import final la conserve.
> - Un import suivi du GET public restitue exactement la note normalisée.
> - Le PUT admin permet d'ajouter, modifier et supprimer (`null`) une note.
> - Une note fonctionne sur un prix fixe et sur un prix dynamique.
> - Deux tarifs ayant la même note restituent chacun cette même chaîne (le front
>   se charge de dédupliquer la légende et d'attribuer `*`, `**`, `***`).
> - Un tarif historique sans `note` reste valide.
> - Une valeur non textuelle est refusée avec une erreur 400 explicite.
> - Les tests existants de `label` continuent de passer sans modification de
>   comportement.
>
> Exemple corrigé à accepter, persister et restituer :
>
> ```json
> {
>   "period_id": "early-reduced-1",
>   "category": "adult",
>   "category_label": "Adulte (13 à 64 ans)",
>   "price_type": "fixed",
>   "price": 68.0,
>   "price_min": null,
>   "price_max": null,
>   "label": null,
>   "note": "Des tarifs réduits sont proposés du 5 décembre au 12 décembre 2026 et du 10 avril au 18 avril 2027.",
>   "sort_order": 0
> }
> ```
>
> Exemple dynamique confirmant que les deux champs restent indépendants :
>
> ```json
> {
>   "period_id": "high-season-1",
>   "category": "adult",
>   "category_label": "Adulte (13 à 64 ans)",
>   "price_type": "dynamic",
>   "price": null,
>   "price_min": 55.0,
>   "price_max": 72.0,
>   "label": "Tarif dynamique web",
>   "note": "Tarif hors assurance.",
>   "sort_order": 0
> }
> ```

Une fois cette évolution déployée, vérifier dans la réponse réseau de
`GET /api/stations/:slug/ski-passes` que chaque prix concerné contient bien
`note`. Si le champ est absent à cet endroit, le front ne peut pas produire
l'étoile.
