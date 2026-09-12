# Intégration front-end des domaines skiables — audit et contrat requis

## Statut

L'implémentation des domaines skiables est **bloquée par l'absence du contrat API annoncé** : aucun fichier joint, schéma OpenAPI ou document décrivant ces ressources n'est présent dans le dépôt ou dans le prompt reçu par l'environnement.

Conformément à la consigne de ne pas inventer de routes, de champs ou de comportement back-end, aucune page présentée comme opérationnelle et aucun appel réseau spéculatif n'ont été ajoutés.

## Intégrations existantes inspectées

### Routage et rendu public

- Le projet utilise le routeur `pages` de Next.js 14.
- L'annuaire des stations est rendu côté serveur dans `pages/stations/index.tsx` à partir de la ressource publique des stations actives.
- La fiche station est rendue côté serveur dans `pages/stations/[slug].tsx` et agrège la station, ses widgets, ses forfaits et ses médias.
- Les routes publiques existantes emploient des slugs (`/stations/[slug]`, `/regions/[slug]`). Une future convention cohérente serait `/domaines-skiables` et `/domaines-skiables/[slug]`, mais elle doit être confirmée par le produit et ne préjuge pas des routes API.

### Administration et authentification

- Les pages sous `/admin` sont protégées globalement par `AdminAuthProvider` et `AdminRoute` dans `pages/_app.tsx`.
- `src/lib/adminApi.ts` centralise les requêtes administratives, les cookies de session, le jeton CSRF pour les mutations, le renouvellement du jeton et la gestion des réponses 401/403.
- `src/components/admin/AdminBar.tsx` porte la navigation de l'administration.
- Les écrans stations existants se trouvent dans `pages/admin/stations/index.tsx`, `pages/admin/stations/new.tsx` et `pages/admin/stations/[slug].tsx`.

### Formulaires, sélections et médias

- Le formulaire station existant gère les nombres optionnels via une conversion vers `null`, mais certains éditeurs historiques utilisent encore des valeurs par défaut spécifiques à leurs propres contrats. La future saisie des domaines devra conserver une chaîne vide dans l'état du formulaire puis envoyer exactement la valeur d'effacement prévue par le contrat.
- Les sélecteurs de stations existants sont des implémentations locales (par exemple dans les écrans ANMSM) et non un composant générique paginé. Le sélecteur des domaines devra donc avoir un état de sélection indépendant des résultats de recherche et de la page courante.
- `src/lib/stationImageUpload.ts` implémente le contrat d'envoi d'image station ; il ne peut pas être réutilisé pour un domaine sans confirmation explicite d'une route et des catégories de média acceptées.
- Les plans des pistes de station sont normalisés par `src/lib/stationPisteMap.js` et affichés via les champs/widgets station. Le format média d'un domaine (URL directe, objet média, upload multipart, suppression) reste inconnu.

### Métadonnées, sitemap et cache

- Les pages publiques déclarent leurs métadonnées avec `next/head` et des URL canoniques absolues sous `https://www.snow-explorer.com`.
- `pages/sitemap.xml.tsx` produit le sitemap côté serveur ; `src/lib/sitemap.ts` assemble et déduplique les URLs statiques, stations et régions.
- Le sitemap porte un cache CDN `s-maxage=3600, stale-while-revalidate=86400`.
- Les lectures de widgets station utilisent `cache: "no-store"`. L'administration fournit aussi des purges ciblées via `CachePurgeButton`, mais aucune clé, route de purge ou règle de revalidation relative aux domaines n'est documentée.

## Informations indispensables manquantes dans le contrat

Le contrat back-end doit préciser, sans ambiguïté, les éléments suivants avant l'implémentation.

### 1. Ressource publique « domaine »

- Route de liste, méthode, paramètres de pagination, taille maximale et forme de l'enveloppe (`items`, `results`, métadonnées, curseur ou numéro de page).
- Garantie que la liste publique exclut les brouillons, ou champ/filtre exact permettant de le faire.
- Route de détail par slug, méthode, forme de la réponse et statuts HTTP pour un slug absent ou non publié.
- Noms et types exacts de tous les champs : identifiant, nom, slug, statut, description, médias, altitudes, kilomètres, compteurs de pistes par couleur, remontées, dates, saison et horodatages.
- Forme exacte des stations incluses/associées, notamment `id`, `name`, `slug`, état public et champs image utilisables par les cartes.
- Présence des domaines dans la réponse publique d'une station, ou route publique permettant de les charger côté serveur sans requêtes N+1.

### 2. Administration des domaines

- Routes et méthodes exactes pour lister, rechercher, créer, lire, modifier et éventuellement supprimer un domaine.
- Paramètres exacts de recherche, pagination et filtre brouillon/publié, plus la forme du total et du nombre de stations rattachées.
- Valeurs exactes de statut (`draft`/`published`, booléen ou autre) et règles de validation du slug.
- Corps JSON exacts de création et de modification, y compris la distinction PUT/PATCH.
- Sémantique d'effacement de chaque champ facultatif : `null`, chaîne vide, omission, opération JSON Patch ou champ de suppression distinct. Il faut aussi savoir si un champ omis est conservé lors d'une modification.
- Contraintes et précision des champs numériques, en confirmant que zéro est accepté et distinct de l'absence de valeur.
- Format des dates (date civile `YYYY-MM-DD` ou horodatage), format de la saison et fuseau applicable.
- Noms, types et visibilité des champs internes « source » et « date de vérification ».
- Réponses d'erreur structurées (validation, conflit de slug, droits, taille média) à afficher dans le formulaire.

### 3. Relations domaines–stations

- Source de vérité et routes/méthodes exactes pour consulter, ajouter et retirer les rattachements depuis un domaine et depuis une station.
- Corps exact des mutations : remplacement atomique d'une liste d'identifiants, opérations unitaires ou ressource de relation.
- Type des identifiants station/domaine et garanties d'idempotence/concurrence.
- Route de recherche administrateur des stations, paramètres de pagination et forme de réponse à utiliser par le sélecteur.
- Comportement lors du rattachement d'une station inactive ou de la dépublication d'un domaine.
- Garantie qu'une station peut appartenir à plusieurs domaines.

### 4. Médias

- Pour l'image principale et le plan des pistes : champs URL/objet exacts, routes d'upload, méthode, nom de partie multipart, types MIME, limites, réponse et éventuel crédit/légende/texte alternatif.
- Sémantique exacte de remplacement et de suppression d'un média existant.
- Indication si une URL externe peut être saisie ou si seul un média téléversé est accepté.

### 5. Cache et revalidation

- Routes de purge/revalidation à appeler après création, modification, publication, dépublication et changement de relation.
- Méthode, corps, portée (liste domaine, fiche domaine, fiches stations liées, sitemap) et mécanisme d'authentification.
- Si la revalidation doit passer par une route Next.js serveur : nom de la variable d'environnement secrète et contrat back-end, afin que le secret ne soit jamais exposé via `NEXT_PUBLIC_*`.

## Critères de reprise

Dès que ce contrat est fourni, l'intégration pourra être réalisée sans données fictives avec :

1. un client typé public/admin et des normaliseurs stricts ;
2. les écrans admin de liste et d'édition, puis le bloc relationnel de la station ;
3. les pages publiques et les liens réciproques filtrés sur les ressources accessibles ;
4. la navigation, les métadonnées, les URL canoniques et toutes les pages du sitemap ;
5. les tests unitaires du contrat (valeurs absentes, effacement, zéro, pagination, multi-domaines, brouillons) et les parcours intégrés contre l'API disponible.

