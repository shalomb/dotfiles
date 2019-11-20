/* autoreload.js - reload page every given interval
 *
 * autoreload.js, Copyright (c) 2011, Shalom Bhooshi <s.bhooshi/gmail.com>
 *
 * This file is released under the GPL license, version 3
 * which can be found at http://www.gnu.org/licenses/gpl-3.0.txt
 * */

"use strict";

// TODO : Get the completion stuff working.
group.commands.add(
  ["al","ar","autoload","autoreload"],
  "autoreload",
  function (args) {

    var href        = dactyl.modules.buffer.documentURI.spec;
    var interval    = args ? args * 1000 : 5000; 
    var target_tab  = getBrowser().selectedTab;

    if (typeof dactyl.plugins.autoreload.buffer_local_scripts == 'undefined') {
      dactyl.plugins.autoreload.buffer_local_scripts = {};
    }

    var bls = dactyl.plugins.autoreload.buffer_local_scripts;

    if (typeof bls[target_tab] == 'undefined')
      bls[target_tab] = {};

    bls = bls[target_tab];

    if (args.bang) {
      // clearinterval
      if (typeof bls.jobid != 'undefined') {
        window.clearInterval( bls.jobid )
        dactyl.echo("Cleared " + bls.jobid );
      }
      // unregister
      bls = undefined;
    }
    else {
      bls.href      = href;
      bls.interval  = interval;
      bls.tab       = target_tab;

      try { // clearinterval
        if (bls.jobid)
          window.clearInterval( bls.jobid );
      } catch (e) {}
      
      bls.func = function () { 
        getBrowser().reloadTab( bls.tab );
      }
      
      // register
      bls.jobid = window.setInterval( bls.func, bls.interval );

      dactyl.echo(
          bls.jobid 
              + ": Every " 
              + bls.interval 
              + " ms, reload " 
              + bls.href,
          commandline.FORCE_MULTILINE
        );
    }

  },
  {
    argCount  : '*',
    literal   : Number.MAX_VALUE,
    bang      : true,
    completer : function(context, args) {
      return undefined;
      //completion.search(context);
    },
    options: [
      {
        names: [],
        description: "Auto Reload",
        //type: CommandOption.NOARG,
        //completer: completion.bookmark
      }
    ]
  },
  true
);

