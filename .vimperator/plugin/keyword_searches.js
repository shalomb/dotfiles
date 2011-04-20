expandVariable = function (v) {
  var r = '';
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
      r = liberator.globalVariables[v] ||
          liberator.globalVariables[v.substr(1)];
  }
  return r;
}

keySearch = function (keyword, args) {
  args = args.length ? args.map(function (s){ 
        s = s.match(/\s/) ? '"' + s + '"' : s;
        s = s.match(/^\$/) ? expandVariable(s) : s ;
        return s;
      }) : [ window.content.window.getSelection() ];

  var where;
  switch (args[0]) {
    case '+':
      args.shift();
      where = liberator.NEW_WINDOW;
      break;
    case '-':
      args.shift();
      where = liberator.NEW_BACKGROUND_TAB;
      break;
    case '.':
      args.shift();
      where = liberator.CURRENT_TAB;
      break;
    default :
      where = liberator.NEW_TAB;
  }

  var query = escape( args.join(" ") );
  var url = PlacesUtils.getURLAndPostDataForKeyword(keyword)[0].replace('%s', query);
  liberator.open(url, where);
}

genKeywordCommands = function () {
  bookmarks.getKeywords().map(function(keywordSearch) {
      var keyword = keywordSearch['keyword'];
      var title = keywordSearch['title'];
      var url = keywordSearch['url'];
      if (keywordSearch['url'].match(/%s/))
        title = "+ " + title; 
      else
        title = "* " + title;
      if (keywordSearch['url']) {
        commands.addUserCommand(
          [keyword], title, 
          function (args) {
            if (typeof args == 'string')
              args = [args];
            keySearch(keyword, args);
          },
          {},  true
        );
      } 
    });
}

genKeywordCommands();

/*
  - arguments
  - selection
  - global variable
  - current domain
 */
