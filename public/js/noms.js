$(function() {
    if (parseInt(count) >= parseInt(nbResults)) {
        $('.showMore').hide()
    }
})

function showMore(size) {
    let baseSize = +$('#incrementSize').attr('placeholder')
    let incrementSize = isNaN($('#incrementSize').val()) || $('#incrementSize').val().length==0 ? baseSize : +$('#incrementSize').val()
    let parsedURL = window.location.href.split('limit=')
    let params = [baseSize] //par défaut
    if (parsedURL.length > 1)
        params = parsedURL[1].split('&')
    else
        if (parsedURL[0].includes("?"))
            parsedURL[0] = parsedURL[0].replace("limit","") + "&"
        else
            parsedURL[0] = parsedURL[0].replace("limit","") + "?"
    if (!size) size = isNaN(params[0]) || params[0] < 1 ? baseSize + incrementSize : +params[0] + incrementSize
    if (size > nbResults) size = nbResults
    if (params.length > 1)
        document.location.href = parsedURL[0] + 'limit=' + size + '&' + params.slice(1)
    else
        document.location.href = parsedURL[0] + 'limit=' + size
}

function showAll() {
    showMore(nbResults)
}