// ;e opens this settings page

// unmap e/d scroll half page up/down
const unmaps = [
  'e', 'e',
  '<Ctrl-b>', '<Ctrl-f>'
];

unmaps.forEach((u) => {
  api.unmap(u);
});

// remap for a vim-like experience
api.map('<Ctrl-b>', 'u');
api.map('<Ctrl-f>', 'd');
api.map('U', 'X');


// in find mode
api.vmap('<Ctrl-[>', '<Esc>');

// an example to create a new mapping `ctrl-y`
api.mapkey('<Ctrl-y>', 'Show me the money', function() {
  api.Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
});

// an example to replace `T` with `gt`, click `Default mappings` to see how `T` works.
api.map('gt', 'T');

api.unmap('S');
api.mapkey('S', '#8Open opened URL in current tab', 'Normal.openOmnibar({type: "URLs", extra: "getTabURLs"})');

api.unmap('ymm');
api.mapkey('ymm', '#7Copy the current URL as a markdown link to the clipboard', function() {
  api.Clipboard.write('[' + window.location.hostname + ': ' + document.title + '](' + window.location.href + ')');
});

// an example to remove mapkey `Ctrl-i`
api.unmap('<ctrl-i>');

// omnibar
api.cmap('<Ctrl-n>', '<Tab>');
api.cmap('<Ctrl-p>', '<Shift-Tab>');

api.mapkey('<Space>', 'Choose a tab with omnibar', function() {
  api.Front.openOmnibar({ type: "Tabs" });
});

api.mapkey('ou', '#8Open AWS services', function() {
  var services = Array.from(top.document.querySelectorAll('#awsc-services-container li[data-service-href]')).map(function(li) {
    return {
      title: li.querySelector("span.service-label").textContent,
      url: li.getAttribute('data-service-href')
    };
  });
  if (services.length === 0) {
    services = Array.from(top.document.querySelectorAll('div[data-testid="awsc-nav-service-list"] li[data-testid]>a')).map(function(a) {
      return {
        title: a.innerText,
        url: a.href
      };
    });
  }
  api.Front.openOmnibar({ type: "UserURLs", extra: services });
}, { domain: /console.amazonaws|console.aws.amazon.com/i });

settings.lurkingPattern = /.*onetakeda.atlassian.net/i;
api.Hints.setCharacters('yuiophjklnm'); // for right hand

settings.showModeStatus = false;        // Whether always to show mode status.
settings.hintAlign = "left";

// search engines

api.addSearchAlias('d', 'duckduckgo', 'https://duckduckgo.com/?q=', 's', 'https://duckduckgo.com/ac/?q=', function(response) {
  var res = JSON.parse(response.text);
  return res.map(function(r) {
    return r.phrase;
  });
});


// set theme
settings.theme = `
.sk_theme {
    font-family: Input Sans Condensed, Charcoal, sans-serif;
    font-size: 10pt;
    background: #24272e;
    color: #abb2bf;
}
.sk_theme tbody {
    color: #fff;
}
.sk_theme input {
    color: #d0d0d0;
}
.sk_theme .url {
    color: #61afef;
}
.sk_theme .annotation {
    color: #56b6c2;
}
.sk_theme .omnibar_highlight {
    color: #528bff;
}
.sk_theme .omnibar_timestamp {
    color: #e5c07b;
}
.sk_theme .omnibar_visitcount {
    color: #98c379;
}
.sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) {
    background: #303030;
}
.sk_theme #sk_omnibarSearchResult ul li.focused {
    background: #3e4452;
}
#sk_status, #sk_find {
    font-size: 20pt;
}`;
// click `Save` button to make above settings to take effect.</ctrl-i></ctrl-y>

