const express = require('express')
const pug = require('pug')
const MongoClient = require('mongodb').MongoClient
const app = express();
const port = process.env.PORT || 5000
//const mongoURI = "mongodb://127.0.0.1:8081" //en local
const mongoURI = "mongodb+srv://Johan:johanDB@cluster0-jtcyb.gcp.mongodb.net/test?retryWrites=true&w=majority"
const distanceMax = 500 //distance maximale par défaut pour chercher un restaurant
let publicDir = __dirname + '/public' // rep contenant les fichiers

app.set('port', (port))
app.use(express.static(publicDir))
app.use('/noms', express.static(publicDir))

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

var listSpecialites = []
var listQuartiers = []
console.log("trying to connect to data base ...")
MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
    console.log("loading ressources from the base ...")
    if (!err) {
        let db = client.db('base')
        let restos = db.collection('restos')
        restos.distinct('cuisine').then(v => {
            let reg=/^[a-zàäâéèêëïîöôùüû\s]*$/i
            listSpecialites = v.flatMap(spec => spec.replace(/ *\([^)]*\) */g, "")
                                                    .split("/")
                                                    .flatMap(spec2 => spec2.split(",")[0]))
                                .filter(onlyUnique)
                                .filter(spec => reg.test(spec))
                                .sort()
            restos.distinct('borough').then(v => {
                listQuartiers = v
                client.close()
                app.listen(port, (err) => {
                    if (!err) console.log('server is running on port', port)
                    else console.log(err)
                })
            })
        })
    } else {
        console.log(err)
    }
})

app.all('/:var(index.html)?', (req,res) => {
    console.log("nouvelle connexion de", req.hostname)
    res.status(200).send(pug.renderFile('index.pug', {
        name: req.hostname,
        listSpecialites: listSpecialites,
        distanceMax: distanceMax,
        listQuartiers: listQuartiers
    }))
})

app.get('/nbRestos', (req,res) => {
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            res.status(504).send("Impossible de joindre la base de données")
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            restos.find().count((err, nbRestos) => {
                if (err) res.status(500).send("Impossible d'obtenir le nombre de restaurants")
                else res.status(200).send(nbRestos.toString())
            })
            client.close()
        }
    })
})

app.get('/noms/:specialite', (req,res) => {
    console.log("nouvelle connexion de", req.hostname)
    let specialite = req.params.specialite.split("-").map(v => v.toLowerCase().capitalize()).join(" ")
    console.log("requete sur", specialite)
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            DBError(res, err)
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            let results = restos.find({cuisine:{$regex:".*"+specialite+".*"}}).sort({"borough": 1, "name": 1})
            results.count((err, count) => {
                console.log(count, "spécialités", specialite, "trouvées")
                if(err) {
                    sendError(res, "Impossible d'obtenir le nombre de restaurants trouvés", 500, err)
                } else {
                    let resultsArray = Array()
                    results.each((err, item) => {
                        if (err) {
                            sendError(res, "Impossible de parcourir les restaurants trouvés", 500, err)
                        } else {
                            if (item == null) { //last item
                                client.close()
                                res.status(200).send(pug.renderFile('noms.pug', {
                                    count: count,
                                    specialite: specialite,
                                    results: resultsArray
                                }))
                            } else {
                                resultsArray.push({
                                    name: item.name,
                                    address: item.address,
                                    borough: item.borough.toUpperCase()
                                })
                            }
                        }
                    })
                }
            })
            
        }
    })
})

app.get('/noms/:quartier/:specialite', (req,res) => {
    let quartier = req.params.quartier.split("-").map(v => v.toLowerCase().capitalize()).join(" ");
    let specialite = req.params.specialite.split("-").map(v => v.toLowerCase().capitalize()).join(" ");
    console.log("requete sur", quartier, "/", specialite)
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            DBError(res, err)
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            let results = restos.find({cuisine:{$regex:".*"+specialite+".*"}, borough:quartier}).sort({"borough": 1, "name": 1})
            results.count((err, count) => {
                console.log(count, "spécialités", specialite, "trouvées dans", quartier)
                if(err) {
                    sendError(res, "Impossible d'obtenir le nombre de restaurants trouvés", 500, err)
                } else {
                    let resultsArray = Array()
                    results.each((err, item) => {
                        if (err) {
                            sendError(res, "Impossible de parcourir les restaurants trouvés", 500, err)
                        } else {
                            if (item == null) { //last item
                                client.close()
                                res.status(200).send(pug.renderFile('noms.pug', {
                                    count: count,
                                    specialite: specialite,
                                    results: resultsArray,
                                    quartier: quartier
                                }))
                            } else {
                                resultsArray.push({
                                    name: item.name,
                                    address: item.address,
                                    borough: item.borough.toUpperCase()
                                })
                            }
                        }
                    })
                }
            })
        }
    })
})

app.get('/position', (req,res) => {
    let x = parseFloat(req.query.x)
    let y = parseFloat(req.query.y)
    let max = parseFloat(req.query.max)
    if (!max || isNaN(max)) max = distanceMax
    if (!x || isNaN(x) || !y || isNaN(y)) {
        sendError(res, "Désolé mais les coordonnées données sont incorrectes, veuillez réessayer !", 400)
        return;
    }
    console.log("requete sur position (" + x + ", " + y + "), max =", max)
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            DBError(res, err)
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            restos.findOne({
                "address.coord":{
                    $nearSphere:{
                        $geometry: { type: "Point", coordinates :  [x, y] }, 
                        $maxDistance: max
                    }
                }
            }).then(result => {
                client.close()
                if (!result) {
                    sendError(res, "Désolé mais nous n'avons trouvé aucun restaurant dans les " + max + " mètres autour de votre position.")
                } else {
                    res.status(200).send(pug.renderFile('resto.pug', {
                        name: result.name,
                        address: result.address,
                        specialite: result.cuisine,
                        borough: result.borough,
                        id: result.restaurant_id,
                        grades: result.grades
                    }))
                }
            })
        }
    })
})

app.all('*', (req,res) => {
    console.log("invalid request")
    sendError(res, "", 404)
})

function DBError(res, err) {
    sendError(res, "Toutes nos excuses mais il semblerait qu'un vilain cafard nous empêche d'accéder à la base de données :(", 504, err)
}

function sendError(res, message, code, err) {
    if (code == undefined) {
        res.status(200).send(pug.renderFile('erreur.pug', {
            errorMessage: "Toutes nos excuses mais il semblerait qu'un vilain cafard nous empêche d'accéder à la base de données :("
        }))
    } else {
        res.status(code).send(pug.renderFile('erreur.pug', {
            errorCode : code,
            errorMessage: message
        }))
    }
    if (err) console.log(err)
}