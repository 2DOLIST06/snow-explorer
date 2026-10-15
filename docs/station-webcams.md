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

Le bloc privilégie jusqu'à quatre webcams dont le sujet du titre correspond
exactement au nom de station (accents/casse normalisés, séparation par
deux-points, tiret entouré d'espaces ou barre verticale). La ville seule ne
sert pas de correspondance. S'il ne reste aucune correspondance valide,
le bloc affiche les deux premières candidates de proximité, ou une seule
s'il n'y en a qu'une. Si une seule webcam correspond au nom de station,
le bloc la conserve en premier et ajoute la première autre candidate disponible,
sans doublon. Les sélections de deux à quatre correspondances restent inchangées.

La présentation utilise toute la largeur pour une webcam, deux colonnes pour
deux à quatre webcams sur tablette/ordinateur, une colonne sur mobile.
Quatre webcams occupent donc deux rangées de deux images en format 16:9.
Les cartes contiennent l'image et sa légende dans un même cadre sans débordement.

« Voir plus de webcams » apparaît dès qu'il reste des candidates hors du bloc.
La galerie contient tous les résultats valides dans les 30 km, sans filtre
sur le nom, comme le comportement de proximité initial. Le périmètre est
indiqué dans la galerie. Les erreurs d'images retirent les candidates défaillantes
et recalculent la sélection, y compris le repli si la dernière correspondance échoue.

Limite : aucun périmètre local fiable n'est disponible dans ce checkout.
Les résultats de repli et la galerie peuvent inclure des stations voisines.
Une correspondance de titre n'est pas une certification géographique.
Aucun périmètre ni aucune donnée d'appartenance n'est inventé.

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
Seuls le composant Webcams, son libellé de section, le proxy existant, un helper,
les tests associés et ce document changent. Aucun champ SEO ne change.
Le service backend distant n'a pas besoin d'un nouvel endpoint : le proxy Next
existant est enrichi de location et lastUpdated, avec no-store et délai maximal.
Les tests sont synthétiques et ne prétendent pas vérifier des stations réelles
ou la disponibilité réseau des services Windy en production.
