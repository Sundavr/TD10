//const mongoURI = "mongodb://127.0.0.1:8081" //pour BDD locale
const mongoURI = "mongodb+srv://Johan:johanDB@cluster0-jtcyb.gcp.mongodb.net/test?retryWrites=true&w=majority"
const logLevel = 'debug' //trace,debug,info,warn,error,fatal
const port = process.env.PORT || 5000

const express = require('express')
const pug = require('pug')
const MongoClient = require('mongodb').MongoClient
const app = express();
const log4js = require('log4js')
log4js.configure({
    appenders: {
      console: {type: 'console', level: 'debug'},
      file: {type: 'file', level: 'info', filename: 'logs/logs.log'},
    },
    categories: {
      default: {appenders: ['console', 'file'], level: logLevel},
    }
})
const logger = log4js.getLogger()
const distanceMax = 500 //distance maximale par défaut pour chercher un restaurant
const maxItemsPerPage = 20 //nombre d'items par défaut par page
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
logger.info('trying to connect to data base ...')
MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
    logger.info('loading ressources from the base ...')
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
                    if (!err) logger.info('server is running on port', port)
                    else logger.fatal(err)
                })
            }).catch(err => {
                logger.fatal(err)
            })
        }).catch(err => {
            logger.fatal(err)
        })
    } else {
        logger.fatal(err)
    }
})

app.all('/:var(index.html)?', (req,res) => {
    logger.debug('new connection from', req.hostname)
    res.status(200).send(pug.renderFile('index.pug', {
        name: req.hostname,
        listSpecialites: listSpecialites,
        distanceMax: distanceMax,
        listQuartiers: listQuartiers
    }))
})

app.get('/nbRestos', (req,res) => {
    logger.debug('new request on nbRestos')
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            res.status(504).send('Impossible de joindre la base de données')
            logger.error(err)
        } else {
            let db = client.db('base')
            let restos = db.collection('restos')
            restos.find().count((err, nbRestos) => {
                if (err) {
                    res.status(500).send("Impossible d'obtenir le nombre de restaurants")
                    logger.warn(err)
                } else {
                    res.status(200).send(nbRestos.toString())
                }
            })
            client.close()
        }
    })
})

function sendRestos(res, client, results, specialite, limit, quartier) {
    results.count((err, nbResults) => {
        logger.debug(nbResults, 'specialities', specialite, 'find')
        if(err) {
            sendError(res, "Impossible d'obtenir le nombre de restaurants trouvés", 500, err)
            logger.warn(err)
        } else {
            results.limit(limit).sort({"borough": 1, "name": 1}).count((err, count) => {
                let resultsArray = Array()
                results.each((err, item) => {
                    if (err) {
                        sendError(res, "Impossible de parcourir les restaurants trouvés", 500, err)
                        logger.warn(err)
                    } else {
                        if (item == null) { //last item
                            client.close()
                            res.status(200).send(pug.renderFile('noms.pug', {
                                count: count,
                                specialite: specialite,
                                quartier: quartier,
                                results: resultsArray,
                                limit: limit,
                                nbResults: nbResults
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
            })
        }
    })
}

app.get('/noms/:specialite', (req,res) => {
    let specialite = req.params.specialite.split("-").map(v => v.toLowerCase().capitalize()).join(" ")
    logger.debug('request on', specialite)
    let limit = parseInt(req.query.limit)
    if (!limit || isNaN(limit)) limit = maxItemsPerPage
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            DBError(res, err)
        } else {
            let restos = client.db('base').collection('restos')
            sendRestos(res, client, restos.find({cuisine:{$regex:".*"+specialite+".*"}}), specialite, limit)
        }
    })
})

app.get('/noms/:quartier/:specialite', (req,res) => {
    let quartier = req.params.quartier.split("-").map(v => v.toLowerCase().capitalize()).join(" ");
    let specialite = req.params.specialite.split("-").map(v => v.toLowerCase().capitalize()).join(" ");
    logger.info('request on', quartier, '/', specialite)
    let limit = parseInt(req.query.limit)
    if (!limit || isNaN(limit)) limit = maxItemsPerPage
    MongoClient.connect(mongoURI, {useUnifiedTopology: true,}, (err, client) => {
        if (err) {
            DBError(res, err)
        } else {
            let restos = client.db('base').collection('restos')
            sendRestos(res, client, restos.find({cuisine:{$regex:".*"+specialite+".*"}, borough:quartier}), specialite, limit, quartier)
        }
    })
})

app.get('/position', (req,res) => {
    let x = parseFloat(req.query.x)
    let y = parseFloat(req.query.y)
    let max = parseFloat(req.query.max)
    if (!max || isNaN(max)) max = distanceMax
    if ((x!=0 && !x) || isNaN(x) || (y!=0 && !y) || isNaN(y)) {
        sendError(res, "Désolé mais les coordonnées données sont incorrectes, veuillez réessayer !", 400)
        logger.info('invalid coordinates : (', x, ',', y, ')')
        return;
    }
    logger.debug('request on position (' + x + ', ' + y + '), max =', max)
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
                    sendError(res, "Désolé mais nous n'avons trouvé aucun restaurant New Yorkais dans les " + max + " mètres autour de votre position.")
                    logger.debug('No restaurant find within', max, 'meters around [',x,',',y,']')
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
            }).catch(err => {
                DBError(res, err)
            })
        }
    })
})

app.all('*', (req,res) => {
    logger.info('invalid request :', req.path)
    sendError(res, "", 404)
})

function DBError(res, err) {
    sendError(res, "Toutes nos excuses mais il semblerait qu'un vilain cafard nous empêche d'accéder à la base de données :(", 504, err)
    logger.error(err)
}

function sendError(res, message, code, err) {
    if (code == undefined) {
        res.status(200).send(pug.renderFile('erreur.pug', {
            errorMessage: message
        }))
    } else {
        res.status(code).send(pug.renderFile('erreur.pug', {
            errorCode : code,
            errorMessage: message
        }))
    }
}