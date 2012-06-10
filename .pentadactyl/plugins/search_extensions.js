"use strict";

/*
 *  Install a wikipedia command
 */

// Object Literal
var Abra =  {

  expandVariable : function (v) {
    var ret = '';
    var buffer = dactyl.modules.buffer;
    
    switch (v) {
      case '$S': // case '$SELECTION':
        ret =  buffer.selection.toString();
        break;

      case '$T': // case '$TITLE':
        ret = buffer.title;
        break;

      case '$D': // case '$DOMAIN':
      case '$H': // case '$HOST':
        ret = buffer.documentURI.host;
        break;

      case '$P': // case '$PATH':
        ret = buffer.documentURI.path;
        break;

      case '$U': // case '$URI':
        ret = buffer.documentURI.spec;
        break;

      case '$Q': // case '$QUERY_STRING':
        ret = buffer.documentURI.path.match(/(?:\?)(.*)$/);
        break;

      case '$M': // case '$MEMORY':
        return typeof m !== 'undefined' ? m : undefined;
        break

      default :  
        ret = undefined;
        break;
    }

    return ret;
  
  },

  expandVariables : function ( instr ) {
    return instr.replace(/(\$[\w\d_]+)/g, function(m){
      return Abra.expandVariable(m);
    })
  },

  searchString : function ( args ) {
    if (args.length == 0) return undefined;

    args = args.length ? args.map(function (arg){ 
          arg = arg.toString();

          arg = arg.match(/\$[\w\d_]+/) 
                ? Abra.expandVariables(arg) // expand it
                : arg;

          // arg = arg.match(/\s/) 
          //       ? '"' + arg + '"'  // quote it
          //       : arg; 

          return arg;
        }) : [ window.content.window.getSelection() ];

    var c = [];
    args.forEach(function(e){
      //e = e.replace(/^"|"$/g, '')
      e.split(/\s+/).forEach(function(s){
        c.push(s)
      })
    })
    return unescape( c.join(" ") );
  },
}



// TODO : Get the completion stuff working.
group.commands.add(
  ["s"],
  "Search Extensions",
  function (args) {
    var cmd = Abra.searchString(args);
    dactyl.execute(cmd);
    dactyl.echo(cmd, commandline.FORCE_MULTILINE);
  },
  {
    argCount: '*',
    literal  : Number.MAX_VALUE,
    completer: function(context, args) {
      // return completion.bookmark(context, args, '');
      return completion.search(context);
    },
    options: [
      {
        names: [],
        description: "Search Extensions",
        //type: CommandOption.NOARG,
        //completer: completion.bookmark
      }
    ]
  },
  true
);

