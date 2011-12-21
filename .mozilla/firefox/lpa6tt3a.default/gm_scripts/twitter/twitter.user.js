// ==UserScript==
// @name           Twitter URL Deshortener
// @namespace      http://fcmartins.net
// @include        http://twitter.com/*
// @include        https://twitter.com/*
// ==/UserScript==

function expandURL() {
  Array.forEach(document.getElementsByTagName("a"), function(element, index, array) {
    if(element.className.indexOf("twitter-timeline-link") != -1) {
      var url = element.getAttribute("data-ultimate-url") ? element.getAttribute("data-ultimate-url") : element.getAttribute("data-expanded-url");
      element.setAttribute("href", url);
      element.removeAttribute("title");
      var children = Array.filter(element.childNodes, function(element, index, array) {
        return element.nodeName === "#text";
      });
      Array.forEach(children, function(element, index, array) {
        element.nodeValue = url;
      });
    }
  });    
}

function button() {
  var bar = document.getElementById("new-tweets-bar");
  if(bar) {
    bar.addEventListener("click", function() {
      window.setTimeout(expandURL, 5000);
    }, false);
  }
}

var timeoutId;

function onScroll(e) {
  if(timeoutId) {
    window.clearTimeout(timeoutId);
  }
  timeoutId = window.setTimeout(expandURL, 2000);
}

window.setTimeout(expandURL, 5000);
window.addEventListener("scroll", onScroll, false);
window.setInterval(button, 30000);
