/*
 * Goo.gl.js - add a 'googl' command 
 *   Returns a goo.gl shortended url for the first of the following
 *     the url supplied as an argument
 *     the current selection
 *     the current page's url
 *
 *  (c) 2011, Shalom Bhooshi
 *  author: "Shalom Bhooshi" <s.bhooshi/gmail.com>
 *  version: 0.1
 */

group.commands.add(
    ['googl','goo','gl'],
    "goo.gl url shortener",
    function(args) {

      if (args.length == 0) {
        args = dactyl.modules.buffer.selection.toString();

        if (! args.length)
          args = dactyl.modules.buffer.documentURI.spec; // document.href
      }

      if (args.length) {
        var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
          .createInstance(Components.interfaces.nsIXMLHttpRequest); 

        config = JSON.parse(
                  io.File('~/.pentadactyl/plugins/google.api.json').read()
                )

        req.open( 'POST',
                  'https://www.googleapis.com/urlshortener/v1/url?key=' +
                    config.google.api.translate.key,
                  true
                );

        req.setRequestHeader("Content-type", "application/json");
        req.setRequestHeader("Accept",       "application/json");

        req.onreadystatechange = function (e) {
          if (req.readyState == 4) {
            if(req.status == 200) {
              var response = eval( '(' + req.responseText + ')' );
              dactyl.clipboardWrite(response.id, true);
              dactyl.echo('goo.gl: ' + response.id + ' -> ' + response.longUrl);
            }
            else {
              alert("req: " + req);
              dactyl.echoerr("Error. goo.gl status : " + req.status + "\n");
            }
          }
        };
        req.send('{"longUrl": "' + args + '"}');
      }
      else {
        dactyl.echoerr("Error. Invalid set of arguments passed. \n");
      }
    },
    { argCount: '?',
      literal  : Number.MAX_VALUE,
    },
    true
  );

