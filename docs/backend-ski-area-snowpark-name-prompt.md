# Prompt backend — nom du snowpark d’un domaine skiable

Le front prend désormais en charge `snowpark_name` et `snowparks_count` sur un
domaine skiable. L’API actuelle ne documente ni ne restitue encore le nom : une
évolution backend est donc nécessaire avant de pouvoir enregistrer et afficher
la valeur en production.

## Prompt à transmettre à l’équipe backend

> Ajoute la propriété optionnelle `snowpark_name` (`string | null`) aux domaines
> skiables, sans modifier le champ numérique existant `snowparks_count`.
>
> - Ajoute une colonne texte nullable et une migration rétrocompatible.
> - Accepte `snowpark_name` dans les créations et modifications admin
>   (`POST /api/admin/ski-areas` et `PATCH /api/admin/ski-areas/:id`).
> - Supprime les espaces en début et fin de valeur et transforme une chaîne vide
>   en `null`.
> - Restitue `snowpark_name` et `snowparks_count` dans les réponses admin, les
>   listes publiques, le détail public `/api/ski-areas/:slug` et les domaines
>   imbriqués dans la réponse publique d’une station.
> - Vérifie que les serializers/DTO ne retirent pas ces propriétés.
> - Ajoute des tests couvrant la création, la modification, la suppression avec
>   `null`, la lecture publique et l’inclusion dans une station rattachée.

Exemple attendu :

```json
{
  "snowpark_name": "The Spot",
  "snowparks_count": 1
}
```
