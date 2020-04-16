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
            res.status(400).send(err)
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            restos.find().count((err, nbRestos) => {
                if (err) res.status(400).send(err)
                else res.status(200).send(nbRestos.toString())
            })
            client.close()
        }
    })
})

app.get('/noms/:specialite', (req,res) => {
    console.log("nouvelle connexion de", req.hostname)
    let specialite = req.params.specialite.split("-").map(v => v.toLowerCase().capitalize()).join(" ");;
    console.log("requete sur", specialite)
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            res.status(400).send(err)
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            let results = restos.find({cuisine:{$regex:".*"+specialite+".*"}}).sort({"borough": 1, "name": 1})
            results.count((err, count) => {
                console.log(count, "spécialités", specialite, "trouvées")
                if(err) {
                    res.status(400).send(err)
                } else {
                    let resultsArray = Array()
                    results.each((err, item) => {
                        if (err) {
                            res.status(400).send(err)
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
            res.status(400).send(err)
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            let results = restos.find({cuisine:{$regex:".*"+specialite+".*"}, borough:quartier}).sort({"borough": 1, "name": 1})
            results.count((err, count) => {
                console.log(count, "spécialités", specialite, "trouvées dans", quartier)
                if(err) {
                    res.status(400).send(err)
                } else {
                    let resultsArray = Array()
                    results.each((err, item) => {
                        if (err) {
                            res.status(400).send(err)
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
        res.status(404).send("Page not found !") //TODO
        return;
    }
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            res.status(400).send(err)
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
                console.log(result)
                if (!result) {
                    res.status(204).send("Aucun résultat !") //TODO
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
    res.status(404).send("Page not found !")
})