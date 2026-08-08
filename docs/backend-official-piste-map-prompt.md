# Prompt backend — lien officiel du plan des pistes

Le front Snow Explorer utilise désormais la propriété optionnelle
`widgets.pistes.officialMapUrl`. Aucun champ station existant ne convient :
`website_url` désigne le site général de la station, tandis que cette nouvelle URL
doit pointer précisément vers la page de son plan des pistes.

## Prompt à transmettre à l'équipe backend

> Ajoute au contrat des widgets d'une station la propriété optionnelle
> `pistes.officialMapUrl` (`string | null`). Elle contient une URL absolue HTTP(S)
> vers la page « plan des pistes » du site officiel de la station.
>
> - Accepte, valide et persiste ce champ dans la route PATCH admin des widgets.
> - Retourne-le dans les routes GET admin et publique des widgets.
> - Une chaîne vide doit être normalisée en `null`.
> - Refuse les protocoles autres que `http:` et `https:` avec une erreur de
>   validation 400 explicite.
> - Ne modifie pas `website_url`, `smallMapUrl` ni `largeMapUrl`.
> - Préserve la compatibilité avec les enregistrements qui ne possèdent pas encore
>   cette propriété (valeur absente ou `null`).
> - Ajoute des tests de sérialisation, de mise à jour, de validation d'URL et de
>   rétrocompatibilité.
>
> Exemple de fragment attendu :
>
> ```json
> {
>   "pistes": {
>     "enabled": true,
>     "smallMapUrl": null,
>     "largeMapUrl": null,
>     "officialMapUrl": "https://station.example/plan-des-pistes"
>   }
> }
> ```

Le front ne présente ce lien de secours que lorsque `smallMapUrl` et
`largeMapUrl` sont toutes les deux absentes.
