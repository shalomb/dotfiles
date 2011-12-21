/*
 *  .pentadactyl/plugins/status_bar_addons.js 
 *    - Add some firefox artefacts to the status bar.
 * 
 *  (c) 2011, Shalom Bhooshi <s.bhooshi/gmail.com>
 */

/* Add the Firefox menu to the statusbar
 */
(function(){
  try{
    $ = function (n) { return document.getElementById(n); }
    
    // TODO: this currently requires a browser restart for changes to
    // be effected.
    if ( !$('mainmenu') ) {
      var m = document.createElement('menu');
        m.setAttribute('id', 'mainmenu');
        m.setAttribute('accesskey', 'M');
        m.setAttribute('label', '\u2191M');
        m.style.fontWeight = 'bold';
        m.style.color="black";
      
      $("menubar-items").style.backgroundColor = "white";
      $("menubar-items").style.marginRight = "-8px";
      $("menubar-items").style.marginLeft = "-4px";

      var mp = document.createElement('menupopup');
        mp.setAttribute('id', 'mainmenu_popup');
        m.appendChild(mp);

      var c = $('main-menubar').childNodes;
      while (typeof c[0] != 'undefined') {
        c[0].style.fontWeight = 'bold';
        mp.appendChild(c[0]);
      }

      var createMenuItem = function (label,command) {
        var mi = document.createElement('menuitem');
          mi.setAttribute('label', label);
          mi.setAttribute('oncommand',command);
        return mi;
      }
      var me = document.createElement('menu');
        me.setAttribute('id','util_menu');
        me.setAttribute('label','utils');
        me.style.fontWeight = 'bold';
        
      var mep = document.createElement('menupopup');
        mep.setAttribute('label','1');
        mep.setAttribute('accesskey','k');
        mep.setAttribute('id','util_menu_popup');
        mep.appendChild(createMenuItem('about:config','dactyl.open("about:config")'));
        mep.appendChild(createMenuItem('Inspect Document', 'inspectDOMDocument(document)'))
        mep.appendChild(createMenuItem('Toggle GreaseMonkey', 'GM_setEnabled(!GM_getEnabled())'))
        mep.appendChild(createMenuItem('dactyl.startup()', 'dactyl.startup()'))
        me.appendChild(mep);
        mp.appendChild(me);

    $("main-menubar").appendChild(m);              // on the menubar
    $("status-bar").insertBefore($("menubar-items"),$("status-bar").childNodes[0]);
    // $('contentAreaContextMenu').appendChild(m);    // on the context menu
    }
  } catch (e) {
    dactyl.echoerr("error creating main menu: " + e)
  }

})();



/* #203  	 replace security button with the site identification button
 */
(function () {
  $ = function (n) { return document.getElementById(n); }
  let box = document.getElementById("identity-box");
  box.style.marginLeft = "10px";
  box.style.marginRight = "2px";
  $("status-bar").insertBefore(box,$("status-bar").childNodes[1]);
})();



/* #17  	 Show the feed-button in the statusbar
 */
(function(){
  var statusPanel = document.createElement("statusbarpanel");
  statusPanel.setAttribute("id", "buttons-panel-clone");
  // statusPanel.appendChild(document.getElementById("feed-button"));
  statusPanel.appendChild(document.getElementById("star-button"));
  statusPanel.firstChild.setAttribute("style", "padding: 0; max-height: 16px;");
  document.getElementById("status-bar")
    .insertBefore(statusPanel, document.getElementById("security-button"));
})();			


