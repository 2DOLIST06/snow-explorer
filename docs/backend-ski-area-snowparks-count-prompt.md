# Prompt backend — pré-remplissage du nombre de snowparks des domaines

Le formulaire d’administration calcule désormais `snowparks_count` en additionnant
le nombre de snowparks de toutes les stations rattachées. La valeur reste modifiable
avant l’enregistrement. Pour que le calcul fonctionne sur tous les domaines, les
stations renvoyées par l’API d’administration doivent exposer leur compteur.

## Prompt à transmettre à l’équipe backend

> Pré-remplis `snowparks_count` de chaque domaine skiable avec la somme du nombre
> de snowparks de toutes ses stations rattachées, tout en laissant ce champ
> modifiable par un administrateur.
>
> - Ajoute `snowparks_count` (`number | null`) à chaque station renvoyée par
>   `GET /api/admin/ski-areas/station-options` et dans `ski_area.stations` renvoyé
>   par les routes d’administration des domaines skiables.
> - La valeur d’une station doit provenir de son compteur `snowparks.count`. Une
>   valeur absente ou invalide compte pour zéro.
> - Effectue une migration/backfill de `ski_areas.snowparks_count` pour **tous**
>   les domaines existants, en additionnant les compteurs des stations réellement
>   rattachées. Un domaine sans snowpark doit recevoir `0`.
> - À la création d’un domaine, utilise cette somme comme valeur par défaut si le
>   client n’envoie pas `snowparks_count`.
> - Continue à accepter une valeur explicite dans les créations et modifications
>   admin afin que le total puisse être corrigé manuellement.
> - Ajoute des tests couvrant plusieurs stations, les valeurs nulles, un domaine
>   sans station, le backfill et la conservation d’une modification manuelle.

Exemple de station attendu :

```json
{
  "id": "station-id",
  "name": "Station",
  "slug": "station",
  "snowparks_count": 2
}
```
