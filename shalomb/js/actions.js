// Switch to icon-links' native colours on hover
// Probably best refactored
$(function() {
  $('a.icon').hover(
    function() {
      var tc = $(this).attr('class').split(' ').filter(
        function(x){ if (!x.match(/icon/)) { return x; } }
      )
      $(this).toggleClass(['icon', tc, 'hover'].join('-'))
    }
  );
});

// All external hyperlinks to open in a new window
$('.blog a[href ^= "http"]').each(function() {
  $(this).click(function(event) {
    event.preventDefault();
    event.stopPropagation();
    window.open(this.href, '_blank');
  });
});

// Naviate to the tab set in URL fragment to make page components
// bookmarkable/hyperlinkable
// src:
// https://webdesign.tutsplus.com/tutorials/how-to-add-deep-linking-to-the-bootstrap-4-tabs-component--cms-31180
$(document).ready(() => {
  let url = location.href.replace(/\/$/, '');

  // on load set the right tab
  if (url.match(/#\w+\/?$/)) {
    const fragment = url.split("#");
    $('.nav-tabs a[href="#'+fragment[1]+'"]').tab("show");
  }
  history.replaceState(null, null, url);
  setTimeout(() => {
    $(window).scrollTop(0);
  }, 400);

  // non nav-link links (e.g in the body) should be able to link to tabs
  $('a.nav-link-inline').on("click", function() {
    let url = this.href
    const fragment = url.split("#");
    $('.nav-tabs a[href="#'+fragment[1]+'"]').tab("show");
    url += '/';
    history.replaceState(null, null, url);
    setTimeout(() => {
      $(window).scrollTop(0);
    }, 400);
  });

  // set the URL
  $('a.nav-link, a.nav-link-inline').on("click", function() {
    let newUrl;
    const fragment = $(this).attr("href");
    newUrl = url.split("#")[0] + fragment;
    newUrl += '/';
    history.replaceState(null, null, newUrl);
    setTimeout(() => {
      $(window).scrollTop(0);
    }, 400);
  });

  // Set the date in the copyleft footer
  ( function() {
    $('#date').html(strftime('%FT%H:%m:%S%z'))
  })();

});

