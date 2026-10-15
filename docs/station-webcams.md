# Webcams des stations

## Parcours inspecté
La fiche active est StationV3Page → WebcamsAuto (StationLegacyWebcams) →
GET /api/webcams → Windy Webcams API v3 (nearby, puis bbox en repli).
Le dossier ski-api de ce checkout ne contient pas le code du service distant.
Aucun polygone de station ou de secteur local, ni association Windy vérifiée,
n'a été trouvé dans les types, les appels ou les données accessibles du frontend.
Les relations aux grands domaines ne définissent pas un secteur local.

## Sélection du bloc et galerie
Le rayon de recherche existant de 30 km et le classement par distance restent
inchangés. Les candidates doivent avoir un identifiant Windy, une URL HTTPS
d'image actuelle et des coordonnées valides ; les statuts explicitement
inactifs sont exclus. Les doublons gardent la capture datée la plus récente.
La distance prime sur la fraîcheur dans le classement.

Le bloc et les pages dédiées utilisent exactement le même composant WebcamsAuto.
Il privilégie jusqu'à quatre correspondances du nom de station dans le titre.
Si une seule correspondance est disponible, il la conserve en premier et
ajoute la première autre candidate valide, sans doublon. Sans correspondance,
les deux premières candidates de proximité sont affichées si disponibles.

« Voir plus de webcams » apparaît si d'autres candidates valides existent.
La galerie affiche tous les résultats valides dans le rayon initial de 30 km,
sans filtre de nom. Elle annonce ce périmètre. Les erreurs d'image retirent
les candidates concernées et recalculent la sélection. Ce fonctionnement est
commun aux fiches et aux pages dédiées, sans nouvel appel à l'ouverture de la galerie.

La grille conserve le style existant : pleine largeur pour une webcam si
aucune deuxième n'est disponible, deux colonnes pour deux à quatre webcams
sur tablette/ordinateur, une colonne sur mobile.

Limite : aucun périmètre local fiable n'est disponible. Le complément, le repli
et la galerie peuvent inclure des stations voisines dans les 30 km.
Le libellé Windy ne certifie pas l'appartenance. Aucune donnée n'est inventée.

## Rubrique Webcams
Routes : /webcams et /webcams/[slug]. Les anciennes URL
/stations/[slug]/webcams gardent leur redirection existante vers la fiche.
Le header utilise la même liste navItems pour ordinateur et mobile.
L'annuaire réutilise fetchActiveResortsServer, les helpers de recherche
nom/région/département et les styles station-picker/weather-layout existants.
Aucun filtre de disponibilité n'est inventé : la liste annonce une vérification
à l'ouverture. Météo et Plans des pistes n'ont pas de filtres séparés supplémentaires.
Le détail utilise le même annuaire et un seul WebcamsAuto ; l'index ne demande
aucune webcam. Le header reçoit initialStations, évitant un second appel catalogue.
Les liens de l'annuaire ne préchargent pas les détails de toutes les stations.

Le site est actuellement en français sans route de traduction dédiée.
Le modèle Météo/Plans n'a pas de fil d'Ariane : les liens station et retour
à la liste assurent la navigation. Le sélecteur mobile se replie sur le détail,
avec « Changer » et défilement respectant la préférence de mouvement réduit.

SEO : canonical sans paramètres ; /webcams ajouté au sitemap.
Les détails sont volontairement tous noindex,follow et absents du sitemap,
car aucun inventaire vérifié côté serveur ne permet de certifier leur contenu.
Une disponibilité connue au backend permettrait ultérieurement une indexation
sélective ; elle n'est pas nécessaire au fonctionnement. Pas de milliers
d'appels Windy lors du rendu serveur ou de la génération du sitemap.
Slug inconnu/inactif : 404. Catalogue absent : 503, Retry-After et noindex.

## Windy et cache
La clé reste dans WEBCAMS_API_KEY côté serveur. Aucun nouvel endpoint ni lecteur
vidéo n'est ajouté. L'agrandissement reste une image dans une galerie modale.
La source Windy.com est liée dans le bloc et la modale.
Le proxy webcams n'avait pas de cache applicatif à réutiliser ; les caches météo
et ski concernent d'autres données. Le mécanisme no-store déjà utilisé dans les
autres proxies est repris pour éviter de conserver les URLs temporaires Windy.
Le bloc renouvelle sa requête toutes les quatre minutes pendant son montage ;
il ne stocke aucune URL durablement. Les images expirées/en erreur sont retirées.
Il n'y a pas de copie/proxy des images. Seule images.current est utilisée, sans
repli daylight qui associerait une image ancienne à une date actuelle.
lastUpdated fourni par Windy est transmis ; created n'est jamais utilisé.
Les dates absentes, futures ou textuelles sans fuseau sont masquées.

## Portée et validation
La rubrique ajoute deux routes, un annuaire partagé, un chargeur serveur,
une entrée du header et l'URL d'index au sitemap. Les pages Météo/Plans et
les métadonnées des fiches stations restent inchangées. Seule la sélection
du composant Webcams partagé est commune aux fiches et aux pages dédiées.
Le service backend distant n'a pas besoin d'un nouvel endpoint : le proxy Next
existant est enrichi de location et lastUpdated, avec no-store et délai maximal.
Les tests sont synthétiques et ne prétendent pas vérifier des stations réelles
ou la disponibilité réseau des services Windy en production.

Validation navigateur locale : catalogue et images synthétiques, Chromium
1440/1024/390 px. Recherche, navigation desktop/mobile, retour à l'annuaire,
grille 2/1 colonnes, galerie et contrôle du périmètre de proximité, absence de débordement, chargement, erreur/retry, aucune webcam,
slug inconnu (404), catalogue vide (503). Aucun appel Windy sur l'index
ni à l'ouverture de la galerie. Pas de validation Windy en production.

Le lien vers la fiche utilise l'ancre « Voir la station de ski [Nom] ».

Contrôle complémentaire Chromium desktop/mobile : une correspondance complétée
par une deuxième candidate, galerie complète sans requête supplémentaire,
ancre station nominative et absence de débordement.
