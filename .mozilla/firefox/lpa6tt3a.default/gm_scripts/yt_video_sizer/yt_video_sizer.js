// ==UserScript==
// @name           Youtube Video Sizer
// @namespace      http://userscripts.org
// @description    Enhancement of the `Youtube Cinema Size Enlarger' script.
//                   Improved layout for small notebook screens.
//                   Layout is set only once i.e. onPageLoad.
// @include       http://*.youtube.*/*
// @include       http://youtube.*/*
// @include       https://*.youtube.*/*
// @include       https://youtube.*/*
// ==/UserScript==

function $(id) { 
  var el = document.getElementById(id);
  return el.wrappedJSObject || el;
}

window.setTimeout(
  function () {
    var player              = $("watch-player");

    player.style.marginLeft = (  window.innerWidth >= 960 
                                  ? (985 - window.innerWidth) / 2 
                                  : "0"
                              ) + "px";
    player.style.width      = (window.innerWidth  - 30) + "px";
    player.style.height     = (window.innerHeight - 50) + "px";

  }, 500);

// move the user info bar below the title to below the video
$("watch-panel").insertBefore(
    $("watch-headline-user-info"),
    $("watch-panel").childNodes[0]
  );

// scroll the title+video container into view
$("content-container").scrollIntoView(true);
			
var style_fragment = "                                                        \
  #watch-sidebar {                                                            \
    margin-top: 1px;                                                          \
  }                                                                           \
  #watch-video-container {                                                    \
    background-color: black !important;                                       \
    background-image :                                                        \
      -moz-linear-gradient(center top , black, black) !important;             \
  }                                                                           \
  #watch-headline-user-info,                                                  \
  #watch-headline h1,                                                         \
  #eow-title-input {                                                          \
    display: inline !important; overflow : scroll !important;                 \
  }                                                                           \
  .watch-wide-mode,                                                           \
  #watch-player,                                                              \
  #watch-player {                                                             \
    padding-left:3px!important;                                               \
  }                                                                           \
";

GM_addStyle( style_fragment );

