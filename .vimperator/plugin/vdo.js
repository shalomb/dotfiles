vmsg = function (vtitle, vtext) {

  var vdo = $('<div>')
    .attr('id', 'vdo')
    .css({ backgroundColor: '#3f3f3f', color: 'white', display: 'block', textAlign: 'center', zIndex: '2', textAlign: 'left', position: 'absolute', })
    .appendTo($('#content').parent()); //.appendTo($('#browser').parent());

  var vdo_header = $('<div>')
    .attr('id', 'vdo_header')
    .css({display: 'block', color: 'white', backgroundColor: '#4f4f4f', height: '20px', textAlign: 'left', display: 'block', verticalAlign: 'bottom', width: '100%' })
    .appendTo('#vdo')

  var vdo_title = $('<div>')
    .attr('id', 'vdo_title')
    .css({ position: 'relative', left: '0', width: '98%', marginTop: '0.5%', marginLeft: '0.75%', fontWeight: 'bold', fontSize: '10pt' })
    .text(vtitle)
    .click( function(){ $('#vdo').fadeOut(250, function() { $('#vdo').remove() }) } )
    .appendTo('#vdo_header');

  var vdo_exit = $('<div>')
    .attr('id', 'vdo_exit')
    .text('X')
    .attr('href', '#')
    .css({ cursor: 'pointer', height: '11px', fontSize: '10pt', fontWeight: 'bold', verticalAlign: 'middle', position: 'relative', marginTop: '-0.5%', right: '10px',
      })
    .click( function(){ $('#vdo').remove() } )
    .appendTo('#vdo_header');

  var vdo_body = $('<div>')
    .attr('id', 'vdo_body')
    .css({ clear: 'both', height: 'auto', color: 'white', margin: '0.125em', padding: '0.5em', display: 'block', overflow: 'auto', maxHeight: '175px', })
    .appendTo('#vdo');

  $('<p>') 
    .text(vtext)
    .appendTo('#vdo_body')

  // TODO: not really sure why I need to do this after appending stuff to vdo_body,
  // doing it before has unintended effects.
  $('p')
    .css({ textAlign: 'justify', width: '97%', margin: '0.125em auto', display: 'block', })
    .click( function(){  $(this).animate({backgroundColor: 'red'},3000) } )
}

/*
var doc = content.document
var div = doc.body.appendChild(doc.createElement("div"))
div.setAttribute("style",
  "position: fixed; top: 100px; left: 100px; height: 10em; width: 20em;"
  + "border: 2px outset orange; background-color: cornsilk;"
  )
var btn = div.appendChild(doc.createElement("div"))
btn.setAttribute("style", "position: absolute; bottom: 1ex; right: 1ex;")
btn.setAttribute("onclick", "document.body.removeChild(this.parentNode)")
btn.appendChild(doc.createTextNode("Close"))
*/

