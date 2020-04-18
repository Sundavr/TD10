var indexURL = window.location.protocol + "//" + window.location.host;

$(function() {
    $.getJSON("nbRestos", (data) => {
        $('#nbRestos').html(data)
    }).fail((error) => {
        errorHandler(error)
    })
})

function findRestaurant() {
    let specialite = $('#specialite').val()
    let quartier = $('#quartier').val()
    if (specialite.length == 0) {
        alert('Veuillez choisir une spécialité')
    } else {
        let URL = indexURL + '/noms'
        if (quartier != '-- optionnel --') {
            URL += '/' + quartier.replace(" ","-")
        }
        document.location.href = URL + '/' + specialite.replace(" ","-")
    }
}

function findFromPosition() {
    let latitude = $('#latitude').val()
    let longitude = $('#longitude').val()
    if (!latitude) {
        $('#latitude').attr("placeholder", "latitude")
        alert("Veuillez renseigner une latitude")
    } else if (!longitude) {
        $('#longitude').attr("placeholder", "longitude")
        alert("Veuillez renseigner une longitude")
    } else {
        let distanceMax = $('#distanceMax').val()
        if (distanceMax) {
            document.location.href = indexURL + '/position?x=' + latitude + "&y=" + longitude + "&max=" + distanceMax;
        } else {
            document.location.href = indexURL + '/position?x=' + latitude + "&y=" + longitude;
        }
    }
}

function errorHandler(error) {
    let res = error.responseJSON
    if (res != undefined) console.log(res.erreur) //json
    else console.log(error) //autre
}