/*
 * SYNOPSIS
 *   clipboard_utils.js - clipboard helper utils
 *
 * DESCRIPTION
 *   Add a :clip command that based on its arguments copies various items to the
 *   clipboard.
 *
 * EXAMPLES
 *   :clip $u     -- copy the page URL
 *   :clip $sel   -- copy the current selection
 *   :clip $t     -- copy the page title
 *   :clip $f     -- copy the URL path
 */

function clipExpand(v) {
  var r;
  switch (v) {
    case '$selection':
    case '$sel':
      r = window.content.window.getSelection();
      break;
    case '$title':
    case '$t':
      r = window.content.document.title;
      break;
    case '$site':
    case '$s':
      r = window.content.location.href.match(/^((?:(?:ht|f)tps?:\/\/)?[^\/]+)(?:\/)?/)[1];
      break;
    case '$fqdn':
    case '$d':
    case '$h':
      r = window.content.location.href.match(/^(?:(?:ht|f)tps?:\/\/)?([^\/]+)(?:\/)?/)[1];
      break;
    case '$query_string':
    case '$q':
      r = window.content.location.href.match(/(?:\/\/)(?:[^\/]+\/)(?:.+?)([?].*?)?$/)[1];
      return;
    case '$path':
    case '$p':
      r = window.content.location.href.match(/(?:\/\/)(?:[^\/]+\/)(.+?)(?:[#?].*?)?$/)[1];
      break;
    case '$url':
    case '$uri':
    case '$u':
      r = window.content.location.href;
      break;
    case '$markdown':
    case '$m':
      r = '[' + clipExpand('$t') + '](' + clipExpand('$u') + ')';
    case '$query_string':
    case '$q':
      break;
    default :
      r=v;
  }
  return r;
}

group.commands.add(
  ['clip','cl'],
  'clipboard utils',
  function (args) {

    if (args.length == 0) {
      args = dactyl.modules.buffer.selection.toString();
      if (! args.length) {
        args = dactyl.modules.buffer.documentURI.spec; // document.href
      }
    }

    if (args.length) {
      args = args.toString();

      var exp = clipExpand(args);

      dactyl.clipboardWrite(exp, true);
    }

  },
  { argCount: '?',
    literal  : Number.MAX_VALUE,
  },
  true
);
