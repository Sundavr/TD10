var indexURL = window.location.protocol + "//" + window.location.host;

$(function() {
    $('#undo').click(goToIndex)
})

function goToIndex() {
    document.location.href = indexURL
}