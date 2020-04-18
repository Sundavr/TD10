$(function() {
    if (parseInt(count) >= parseInt(nbResults)) {
        $('.showMore').hide()
    }
})

function showMore(size) {
    let incrementSize = isNaN($('#incrementSize').val()) || $('#incrementSize').val().length==0 ? +$('#incrementSize').attr('placeholder') : +$('#incrementSize').val()
    let parsedURL = window.location.href.split('limit=')
    let params = [+$('#incrementSize').attr('placeholder')] //par défaut
    if (parsedURL.length > 1)
        params = parsedURL[1].split('&')
    else
        parsedURL[0] += "?"
    if (!size) size = +params[0] + incrementSize
    if (params.length > 1)
        document.location.href = parsedURL[0] + 'limit=' + size + '&' + params.slice(1)
    else
        document.location.href = parsedURL[0] + 'limit=' + size
}

function showAll() {
    showMore(nbResults)
}