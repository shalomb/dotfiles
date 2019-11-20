opensearch_manager = {
  get_page_search : function (p) {
    var links = window.content.document.getElementsByTagName('link'); 

    var re = new RegExp(p);
    var result = {};

    for (i=0; i<links.length; i++) { 
      var link = links[i]; 
      if (rel = link.getAttribute('rel')) {
        if ( rel.match(/search/i) ) {
          result['href']  = link.getAttribute('href');
          result['title'] = link.getAttribute('title');
          result['type']  = link.getAttribute('type');
        }
      }
    }

    return result;
  },

  search : function (args) {

    var self = this;
    var search_href;
    if ( search = this.get_page_search() ) {
      if (search.hasOwnProperty('href')) {
        search_href = search.href;
      }
    }

    if ( search_href ) {
      search_href = search_href.match(/^\//) ?
                      buffer.uri.prePath + search_href : 
                      search_href.match(/https?:\/\//) ?
                        search_href :
                        buffer.uri.prePath + '/' + buffer.uri.directory +
                          '/' + search_href;

      var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
        .createInstance(Components.interfaces.nsIXMLHttpRequest); 

      req.open( 'GET', search_href, true);

      // req.setRequestHeader("Content-type", "text/xml");
      req.setRequestHeader("Accept",       "text/xml");

      req.onreadystatechange = function (e) {
        if (req.readyState == 4) {
          if(req.status == 200) {
            var dp       = new DOMParser();
            var doc      = dp.parseFromString(req.responseText, "text/xml");
            var url      = doc.getElementsByTagName("Url")[0];
            var template = url.getAttribute('template');
            search_href  = template.replace(
                            '{searchTerms}', encodeURIComponent(args)
                           );
            dactyl.execute(":tabopen " + search_href);
          }
        }
      };

      req.send();
    }
    else {
      search_href = 'https://encrypted.google.com/webhp?q=site:' +
                     encodeURIComponent(buffer.uri.prePath + ' ' + args)
      dactyl.execute(":tabopen " + search_href);
    }

  },

  init : function () {
    var self = this;

    group.commands.add(
      ['opensearch', 'os'],
      'open search',
      function (args) {
        self.search( args );
      },
      { 
        // :help :command-nargs
        argCount: '*',
        bang: true,
        count: true,
        completer : function (context, args) {
        },
        literal: 0,
        privateData: true
      },
      true
    );
  }
};

opensearch_manager.init();
