# Flux de données de la page publique des forfaits

## Inventaire du rendu

L'annuaire SSR fournit uniquement les informations utilisées pour choisir et
présenter une station : `id`, `slug`, `name`, `is_active`, `region.name` et
`department.name`. Le lien vers la fiche est construit avec le `slug`. Aucun
autre champ du détail station n'est nécessaire.

Deux blocs tarifaires restent indépendants :

- le bloc historique conserve `enabled`, `columns`, `items`, `periods`,
  `season`, `source_url` et `sourceUrl` ;
- le bloc normalisé conserve l'état `is_active`, la saison, l'URL source, les
  périodes triées, les produits, catégories, types de prix, prix fixes ou
  bornes dynamiques, libellés et notes.

Le navigateur appelle désormais seulement
`/api/ski/stations/<slug>-ski-passes`. Le proxy interroge toujours en premier
la source canonique backend `/api/stations/<slug>/ski-passes`. Le détail
`/api/stations/<slug>` n'intervient plus dans ce parcours.

## Compatibilité legacy

Le fallback widgets est volontairement conservateur afin de ne perdre aucun
tarif déjà visible. Il n'est pas appelé lorsque la réponse canonique :

1. embarque `legacy_forfaits` (les champs historiques ci-dessus sont alors
   transmis sans transformation destructive) ; ou
2. déclare explicitement `legacy_required: false`.

Pour toute station dont la réponse canonique ne fournit encore aucun de ces
deux marqueurs, le proxy charge `/api/stations/<slug>/widgets`. La population
exacte du fallback est donc déterminée par le contrat de chaque réponse, sans
liste de slugs fragile codée dans le frontend. Une erreur de ce fallback fait
échouer la réponse complète : les données normalisées ne sont jamais
présentées silencieusement comme un résultat complet si les données legacy
potentiellement visibles n'ont pas pu être vérifiées.

## SSR et URL

L'annuaire est réutilisé tel quel côté client et n'est pas rechargé. La page
n'avait pas de station sélectionnée dans son URL : la sélection est un état
local et l'URL publique reste `/forfaits`. Ajouter un chargement SSR de tarifs
sans paramètre canonique aurait donc changé le contrat d'URL sans bénéfice
immédiat ; cette optimisation n'est pas introduite ici.
