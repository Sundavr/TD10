TD10 web Johan Gousset

question 3:
a. db.restos.find().count() -> 25359
b. db.restos.find({borough:"Manhattan"}).count() -> 10259
c. db.restos.find({borough:"Manhattan", cuisine:{$regex:".*Pizza.*"}}).count() -> 458
d. db.restos.find({borough:"Bronx", cuisine:{$regex:".*French.*"}}).count() -> 1
e. db.restos.find({borough:"Manhattan", cuisine:{$regex:".*Pizza.*"}, "grades.grade":"A"}).count() -> 442


Si besoin, le serveur est accessible via l'adresse 'https://goussetjohantd10.herokuapp.com/'
Le git est accessible à l'adresse 'https://github.com/Sundavr/td10'

(dans server.js)
En cas de lancement en local, 2 options pour la BDD sont possibles:
1: Utiliser une BDD locale.
   Dans ce cas, utiliser 'base' comme nom et 'restos' comme collection
2: Utiliser la base hébergée en ligne
Afin de choisir, il faut simplement changer les lignes 3 et 4 (mongoURI), 
et mettre la solution que l'on n'utilise pas en commentaire.

Si besoin, le niveau des logs peut être changé à la ligne 6.