/*
 * SYNOPSIS
 *   google_translate - client for google translate
 *
 * DESCRIPTION
 *
 * EXAMPLES
 *   :translate
 *
 * REFERENCES
 *  [Pentadactyl Configuration](http://nakkaya.com/2014/01/26/pentadactyl-configuration/) 
 */

group.commands.add(
  ['translate','trans','tr'],
  'google translate',
  function (args) {
 
    var opts = {};
    _opts = args.string.split(/(?:^|\s+)-/);
    _opts.splice(0,1);
    for (var p in _opts) {
      if( _opts.hasOwnProperty(p) ) {
        if (m = _opts[p].match(/^(\S+)(?:\s+['"]?(\S.*?)['"]?\s*)?$/)) {
          if ( opts[m[1]] ) {
            opts[m[1]] += ' ' + m[2]
          }
          else {
            opts[m[1]] = m[2]
          }
        }
      } 
    } 

    var tl = sl = '';

    // let the source language be of the user's choosing
    if (args.explicitOpts["-sl"]) 
      sl = opts['sl']

    // let the target language be of the user's choosing
    if (args.explicitOpts["-tl"]) 
      tl = opts['tl']

    // guess the source lang from the '<html lang="..">' tag attribute
    if ( !sl )
      sl = content.document.documentElement.lang;

    if ( !sl ) 
      sl=content.document.getElementsByTagName("html")[0].getAttribute('lang');

    // if XML/xHTML, guess lang from the '<html xml:lang="..">' tag attribute
    if ( !sl ) 
      sl=content.document.getElementsByTagName('html')[0].getAttribute('xml:lang');

    // guess lang extracted from a '<meta property='locale|lang' content='..'>'
    if ( !sl ) {
      metas = content.document.getElementsByTagName("meta");
      for (var i in metas) {
        if ( typeof metas[i] !== 'object' )
          continue;

        meta_property = metas[i].getAttribute("http-equiv") ||
                        metas[i].getAttribute("property") ||
                        metas[i].getAttribute("name");

        if ( typeof meta_property !== 'undefined' && meta_property != null ) {
          if ( meta_property.match(/lang|locale/) ) {
            sl = metas[i].getAttribute("content");
            alert( 'p ' + meta_property + ' sl ' + sl );
            if ( sl )
              break;
          }
        }

      }
    }

    if ( !sl ) {
      // clutching at straws
      // try and guess language from 2 letter country code in URI
      w = window.content.location.href;
      if ( m = w.match(/\/\/[^\/]+\.(..)\//) ) {
        sl = m[1]
      }
    }

    tl   = navigator.language || navigator.userLanguage;
    if ( m = tl.match(/^(..)[-_]/) ) {
      tl = m[1];
    }
    else {
      tl = 'en'
    }

    if ( sl ) {
      if ( m = sl.match(/^(..)\s*[,-_]/) )
        sl = m[1];
    }
    else {
      sl = tl
    }

    if ( sl == tl ) {
      dactyl.echoerr(' source and target languages are the same : ' + sl);
      return false;
    }
    dactyl.echo('translating from ' + sl + ' to ' + tl);

    if ( !(args.explicitOpts["-url"]) ) {
      args = dactyl.modules.buffer.selection.toString();
      if (args.length) {
        true;
      }
      else {

        args = 'https://translate.google.com/translate?' +
               'act=url'     +
               '&edit-text=' +
               '&ie=UTF-8'   +
               '&js=y'       +
               '&prev=_t'    +
               '&hl='        + tl +
               '&sl='        + sl +
               '&tl='        + tl +
               '&u='         + encodeURIComponent(
                                dactyl.modules.buffer.documentURI.spec
                              )

       dactyl.execute(":tabopen " + args);
      }
    }

    if (args.length) {
      args = args.toString();
    }

  },
  { argCount: '*',
    bang : false,
    completer : function (context, args) { return true },
    literal  : Number.MAX_VALUE,
    // https://gist.github.com/grassofhust/1403804
    // https://searchcode.com/codesearch/view/37329765/
    options : [
      { names : [ '-sl' ],
        description : 'Source language',
        type : CommandOption.NOARG,
        completer : completion.javascript
      },
      { names : [ '-tl' ],
        description : 'Target language',
        type : CommandOption.NOARG,
        completer : completion.javascript
      },
      { names : [ '-url', '-u' ],
        description : 'URL to translate',
        type : CommandOption.NOARG,
        completer : completion.javascript
      },
    ]
  },
  true
);

