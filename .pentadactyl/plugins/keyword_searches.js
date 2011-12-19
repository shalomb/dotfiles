//#javascript
//
// vi:

/*
 * NAME
 *
 *  Abracadabra  - Ex-mode commands derived from Firefox Smart Searches.
 *
 * SYNOPSIS
 *
 *    :<command> [+|-|.] [searchterm searchterm ...]
 *
 * DESCRIPTION
 *
 *  This plugins scans the user's firefox bookmark collection and creates
 *  a pentadactyl ex-mode command for every smart search found. Arguments,
 *  if passed to the command, are then used as search terms for the 
 *  mapped keyword search and the URL for the keyword search is opened
 *  (in a new tab, by default).
 *
 *  E.g. Assuming a bookmark for http://en.wikipedia.org/wiki/%s exists with 
 *  a keyword 'wiki', then a pentadactyl command named :wiki is created and
 *  can be used like so.
 *
 *    :wiki pentadactyl 
 *
 *  This opens the url 'http://en.wikipedia.org/wiki/pentadactyl' in the 
 *  browser. Note the substitution of %s for the command's argument in 
 *  the bookmarked URL.
 *
 *  Commands take one or more arguments and each must not be quoted.
 *  e.g. Asking a google smart search for a recipe.
 *
 *    :google bbc food recipe for tiramisu
 *
 *  When arguments are not provided to commands expecting arguments,
 *  one of two things can happen. The currently highlighted text is
 *  used as an argument string or an empty (null) argument is passed in 
 *  instead. For the latter case, the resulting URL  might not provide
 *  enough context to the web service to make the request meaningful
 *  and an unfriendly response is to be expected. 
 *
 *  Bookmarks with keywords whose URLs do not contain a %s placeholder
 *  map to commands that do not take any arguments. e.g. launching the 
 *  BBC news website might be as simple as
 *
 *    :bbc
 *
 * BUGS
 *
 *  - Smart searches containing underscores in keywords do not map
 *    to valid pentadactyl commands.
 *
 * TODO
 *
 *  - Provide some completion functions for commands.
 *  - Place searched terms on a stack, so they can be recalled later.
 *  - Fix bugs or implement workarounds.
 *
 * REFERENCES
 *
 * * Smart keywords
 *    http://support.mozilla.com/en-US/kb/Smart%20keywords
 *
 * INSTALLATION
 *  Install this file in the pentadactyl plugins/ directory.
 *    i.e. $HOME/.pentadactyl/plugins or %USERPROFILE%/_pentadactyl/plugins/
 *
 * AUTHOR
 *   Shalom Bhooshi
 *
 * COPYRIGHT
 *   Copyright © 2011, Shalom Bhooshi.  
 * 
 * LICENSE
 *
 *   GPLv3+ - GNU GPL version 3 or later. See http://gnu.org/licenses/gpl.html.
 *   
 *   This is free software: you are free to change and redistribute it.
 *   There is NO WARRANTY, to the extent permitted by law.
 *  
 */

var ABRACADABRA =  {

  expandVariable: function (v) {
    var ret = '';
    var wc = window.content;

    switch (v) {
      case '$SELECTION':
      case '$S':
        ret = wc.window.getSelection();
        break;

      case '$TITLE':
      case '$T':
        ret = wc.document.title;
        break;

      case '$DOMAIN':
      case '$D':
        ret = wc.location.href.match(/([^.]+\.[^.]+)(?:\/)/)[1];
        break;

      case '$FQDN':
        ret = wc.location.href.match(/^(?:(?:ht|f)tp:\/\/)?([^\/]+)(?:\/)?/)[1];
        break;

      case '$FILE':
      case '$F':
        ret = wc.location.href.match(/(?:\/)([^\/]+?)(?:[#?].*?)?$/)[1];
        break;

      case '$URL':
      case '$URI':
        ret = wc.location.href;
        break;

      case '$QUERY_STRING':
        break;

      default :  // TODO : What is this again?? Custom Variables?
        // unknown:0: dactyl#globalVariables is deprecated: 
        // Please use the options system instead
        // resource://dactyl-content/eval.js:1: dactyl#globalVariables is deprecated:
        // Please use the options system instead
        ret = dactyl.globalVariables[v] ||
            dactyl.globalVariables[v.substr(1)];
    }

    return ret;

  },


  do_keyword_search : function (keyword, args) {

    args = args.length ? args.map(function (arg){ 
              arg = arg.match(/\s/) 
                    ? '"' + arg + '"' 
                    : arg; // quote it
              arg = arg.match(/\$/) 
                    ? ABRACADABRA.expandVariable(arg) // expand it
                    : arg;
              return arg;
            }) : [ window.content.window.getSelection() ];

    var WHERE;
    switch (args[0]) {
      case '+':
        args.shift();
        WHERE = dactyl.NEW_WINDOW;
        break;

      case '-':         // TODO '-' seems to be reserved for 
        args.shift();   // internal use and is ignored here.
        WHERE = dactyl.NEW_BACKGROUND_TAB;
        break;

      case '.':
        args.shift();
        WHERE = dactyl.CURRENT_TAB;
        break;

      default :
        WHERE = dactyl.NEW_TAB;
    }

    var query = escape( args.join(" ") );
    // The placeholder substitution part.
    var url = 
      PlacesUtils.getURLAndPostDataForKeyword(keyword)[0]
        .replace('%s', query);

    dactyl.open(url, WHERE);
  },


  register_command : function (keyword, title) {
      group.commands.add(
      [keyword],
      title,
      function (args) {
        if (typeof args == 'string')
          args = [args];
        // The actual keyword substitution is done late just prior to opening
        // the URL. This is to allow the user to make changes to bookmark 
        // properties after pentadactyl is loaded and expect the right thing
        // to be done.
        ABRACADABRA.do_keyword_search(keyword, args);
      },
      { },
      true 
    );
  }

};  // END ABRACADABRA


// bookmarks.getKeywords() is deprecated since vimperator and the 
// current API is not well documented. So we'll do a search for 
// bookmarks using the history service.
//
// Places Developer Guide, Searching Bookmarks
//    https://developer.mozilla.org/en/Places_developer_guide
//

var bookmarks = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                .getService(Ci.nsINavBookmarksService);
var history = Cc["@mozilla.org/browser/nav-history-service;1"]
              .getService(Ci.nsINavHistoryService);

var query = history.getNewQuery();

var folders = [ bookmarks.toolbarFolder,
                bookmarks.bookmarksMenuFolder,
                bookmarks.unfiledBookmarksFolder
              ];
query.setFolders(folders, folders.length);

query.searchTerms = "."; // a literal dot

var options = history.getNewQueryOptions();
options.queryType = options.QUERY_TYPE_BOOKMARKS;

var result = history.executeQuery(query, options);

var resultContainerNode = result.root;

resultContainerNode.containerOpen = true;
for (var i=0; i < resultContainerNode.childCount; ++i) {
  var childNode = resultContainerNode.getChild(i);

  var title    = childNode.title;
  var uri      = childNode.uri;
  var keyword  = PlacesUtils.bookmarks.getKeywordForBookmark(childNode.itemId);

  if ((keyword) && (uri)) {
    if (uri.match(/%s/)) {
      title = "+ " + title; // sign that this command takes args.
    }
    else {
      title = "* " + title; // sign that this doesn't.
    }
    ABRACADABRA.register_command(keyword, title);
  }
}


