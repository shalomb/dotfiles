keyword_manager = {

  get_page_meta : function (p) {
    var metas = window.content.document.getElementsByTagName('meta'); 

    var re = new RegExp(p);
    var result = {};
    for (i=0; i<metas.length; i++) { 
      var meta = metas[i]; 
      ['property','name'].forEach( function(f) {
        if (prop = meta.getAttribute(f)) {
          if (prop.match(re))
            result[prop] = meta.getAttribute('content');
        }
      })
    }
    return result;
  },

  expand_variable : function (v) {
    var r;
    switch (v) {
      case '$SELECTION':
      case '$S':
        r = window.content.window.getSelection();
        break;
      case '$TITLE':
      case '$T':
        r = window.content.document.title;
        break;
      case '$DOMAIN':
      case '$D':
        r = window.content.location.href.match(/([^.]+\.[^.]+)(?:\/)/)[1];
        break;
      case '$FQDN':
        r = window.content.location.href.match(/^(?:(?:ht|f)tp:\/\/)?([^\/]+)(?:\/)?/)[1];
        break;
      case '$FILE':
      case '$F':
        r = window.content.location.href.match(/(?:\/)([^\/]+?)(?:[#?].*?)?$/)[1];
        break;
      case '$URL':
      case '$URI':
        r = window.content.location.href;
        break;
      case '$QUERY_STRING':
        break;
      default :
        r = options[v] ||
            options[v.substr(1)];
    }
    return r;
  },

  gen_keyword_hinter : function () {
    hints.addMode('k', "Generate keyword search input", function(elem) {
      options.keyword_hint = DOM(elem).text();
      if (options.keyword) {
        dactyl.execute( ':' + options.keyword + ' ' + options.keyword_hint);
      }
    });
  },

  search : function (keyword, args) {
    let special = args.bang;

    if (special) {
      options.keyword = keyword;
      hints.show('k');
      return;
    }

    let count   = args.count;
    let arg     = args[0] ? args[0].split(/\s+/).map(function (s){ 
          return (s.match(/^\$/) ? keyword_manager.expand_variable(s) : s);
        }) : [ window.content.window.getSelection() ];

    if ( /^[+\-.]$/.test(arg[arg.length - 1]) ) {
      if ( /^[+\-.]$/.test(arg[0]) )
        arg.shift();
      arg.splice(0, 0, arg.pop());
    }

    var where;
    switch (arg[0]) {
      case '+':
        arg.shift();
        where = dactyl.NEW_WINDOW;
        break;
      case '-':
        arg.shift();
        where = dactyl.NEW_BACKGROUND_TAB;
        break;
      case '.':
        arg.shift();
        where = dactyl.CURRENT_TAB;
        break;
      default :
        where = special ? dactyl.CURRENT_TAB : dactyl.NEW_TAB;
    }
    
    var query = escape( arg.join(" ") );
    var url = PlacesUtils.getURLAndPostDataForKeyword(keyword)[0]
                .replace('%s', query);
    dactyl.open(url, where);
  },

  gen_keyword_commands : function () {
    for (var p in bookmarkcache.keywords) {
      if (bookmarkcache.keywords.hasOwnProperty(p)) {
        var k = bookmarkcache.keywords[p];
        if (k.url) {
          (function (kw) { 
            group.commands.add(
                [kw.keyword.replace(/_/g, '-')],
                kw.url.match(/%s/)
                  ? "+ " + kw.title + ' @ ' + kw.url
                  : "0 " + kw.title + ' @ ' + kw.url,
                function (args) {
                  if (typeof args == 'string')
                    args = [args];
                  keyword_manager.search(kw.keyword, args);
                },
                { 
                  // :help :command-nargs
                  argCount: kw.url.match(/%s/) ? "*" : "?",
                  bang: true,
                  count: true,
                  completer : function (context, args) {
                    // TODO. make this work

                    let wc   = window.content;
                    let href = buffer.doc.baseURI;

                    context.title = ['string', 'source'];
                    context.completions = [
                      [wc.window.getSelection(),           'buffer selection'],
                      [buffer.title,                       'buffer title'],
                      // [options.keyword_hint,               'keyword_hint'],
                      [buffer.doc.baseURI,                 'url'],
                      [buffer.doc.baseURI.match(/#/) ? decodeURIComponent(buffer.doc.baseURI.match(/#(.*)/)[1]) : '',                 'fragment'],
                      [buffer.uri.host,                    'host'],
                      [buffer.uri.asciiHost,               'asciiHost'],
                      [buffer.uri.directory,               'directory'],
                      [buffer.uri.fileName,                'fileName'],
                      [buffer.uri.filePath,                'filePath'],
                      [buffer.uri.path,                    'path'],
                      [buffer.uri.prePath,                 'site'],
                      [buffer.uri.prePath.match(/\./) ? buffer.uri.prePath.match(/([^.\/]+\.[^.]+)$/)[1] : '',                 'domain'],
                      [buffer.uri.prePath.match(/\..*\./) ? buffer.uri.prePath.match(/([^.\/]+\.[^.]+\.[^.]+)$/)[1] : '',         'sub-domain'],
                      [href.match(/\/\/[^\/]+/) ? href.match(/\/\/([^\/]+)/)[1] : '',      'fqdn'],
                      [href.match(/\?/) ? href.match(/([?].*?)?$/)[1] : '',  'query_string'],
                      [buffer.currentWord,                 'current word'],
                      [decodeURIComponent(href.match(/q=/) ? href.match(/q=(.*?)(?:&|#|$)/)[1].replace(/\++/g,' ') : ''), 'query'],
                      // [keyword_manager.get_page_meta('title').map( v => [v.replace(/\n/g, ' '), 'page description'] )],
                    ];

                    ['desc', 'title'].forEach( function(re) {
                      var meta=keyword_manager.get_page_meta(re);
                      for ( var key in meta ) {
                        if (meta.hasOwnProperty(key)) {
                          context.completions.push([meta[key].replace(/[\n\r\t]/g, ''), key]);
                        }
                      }
                    });

                  },
                  literal: 0,
                  privateData: true
              },
              true
            )
          })(k);
        } 
      }
    }
  },

  init : function () {
    this.gen_keyword_commands();
    this.gen_keyword_hinter();
  }

};

keyword_manager.init();

/* TODO.
  - arguments
  - selection
  - global variable
  - refactor completion and variable expansion
 */
