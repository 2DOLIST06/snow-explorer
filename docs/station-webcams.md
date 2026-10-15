# Webcams des stations

## Parcours inspecté
La fiche active est StationV3Page → WebcamsAuto (StationLegacyWebcams) →
GET /api/webcams → Windy Webcams API v3 (nearby, puis bbox en repli).
Le dossier ski-api de ce checkout ne contient pas le code du service distant.
Aucun polygone de station ou de secteur local, ni association Windy vérifiée,
n'a été trouvé dans les types, les appels ou les données accessibles du frontend.
Les relations aux grands domaines ne définissent pas un secteur local.

## Sélection conservatrice
Le rayon de recherche existant de 30 km reste un ensemble de candidats, jamais
une preuve d'appartenance. Une webcam doit avoir un identifiant Windy, une URL
HTTPS d'image actuelle, des coordonnées valides et un sujet de titre exactement
égal au nom de la station (accents/casse normalisés, séparation par deux-points,
tiret entouré d'espaces ou barre verticale). La ville seule n'est pas une preuve.
Les titres d'autres stations et les simples sous-chaînes sont exclus.
Les doublons gardent la capture datée la plus récente, puis le classement utilise
distance au centre et fraîcheur. La grille prend les quatre premières ; la galerie
réutilise exactement le même ensemble. Les erreurs de chargement retirent l'image
et permettent aux candidates suivantes de remonter.

Limite : il s'agit d'une association textuelle prudente, pas d'une délimitation
géographique certifiée. Les sommets ou secteurs nommés sans le nom de station
sont volontairement omis. Un titre Windy erroné ne peut pas être détecté ici.
Une couverture exhaustive et une garantie géographique exigeraient des
associations vérifiées ou des périmètres locaux fiables dans les données source.
Aucune de ces données n'est inventée par cette modification.

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
