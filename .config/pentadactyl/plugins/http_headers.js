"use strict";
isGlobalModule = true;

var INFO =
["plugin", { name: "http-headers",
             version: "0.6",
             href: "http://dactyl.sf.net/pentadactyl/plugins#http-headers-plugin",
             summary: "HTTP header info",
             xmlns: "dactyl" },
    ["author", { email: "maglione.k@gmail.com" },
        "Kris Maglione"],
    ["license", { href: "http://opensource.org/licenses/mit-license.php" },
        "MIT"],
    ["project", { name: "Pentadactyl", "min-version": "1.0" }],

    ["p", {},
        "Adds request and response headers to the <ex>:pageinfo</ex> ",
        "command, with the keys ", ["em", {}, "h"], " and ", ["em", {}, "H"], " respectively. ",
        "See also ", ["o", {}, "pageinfo"], "."],

    ["example", {}, ["ex", {}, ":pageinfo hH"]]];

var { Buffer } = require("buffer");

var Controller = Class("Controller", XPCOM(Ci.nsIController), {
    init: function (command, data) {
        this.command = command;
        this.update(data);
    },
    get wrappedJSObject() this,
    supportsCommand: function (cmd) cmd === this.command
});

var HttpObserver = Class("HttpObserver",
    XPCOM([Ci.nsIObserver, Ci.nsISupportsWeakReference, Ci.nsIWebProgressListener]), {

    init: function init() {
        util.addObserver(this);
    },

    cleanup: function cleanup() {
        this.observe.unregister();
    },

    extractHeaders: function extractHeaders(request, type) {
        let major = {}, minor = {};
        request.QueryInterface(Ci.nsIHttpChannelInternal)["get" + type + "Version"](major, minor);

        let headers = [[type.toUpperCase(), "HTTP/" + major.value + "." + minor.value]];
        request["visit" + type + "Headers"]({
            visitHeader: function (header, value) {
                headers.push([header, value]);
            }
        });
        return headers;
    },

    getHeaders: function getHeaders(win, request) {
        request.QueryInterface(Ci.nsIChannel);

        let headers = overlay.getData(win.document, "headers", Object);
        if ("response" in headers)
            return;

        if (win && /^https?$/.test(request.URI.scheme)) {
            if (request instanceof Ci.nsIHttpChannel)
                request.QueryInterface(Ci.nsIHttpChannel);
            else {
                request.QueryInterface(Ci.nsIMultiPartChannel);
                request.baseChannel.QueryInterface(Ci.nsIHttpChannel);
            }

            headers.request  = this.extractHeaders(request, "Request");
            headers.request[0][1] = request.requestMethod + " " +
                request.URI.path + " " + headers.request[0][1];

            try {
                headers.response = this.extractHeaders(request, "Response");
                headers.response[0][1] += " " + request.responseStatus + " " +
                    request.responseStatusText;
            }
            catch (e) {}

            let controller = this.getController(win);
            if (controller)
                win.controllers.removeController(controller);
            win.controllers.appendController(Controller("dactyl-headers", { headers: headers, url: win.document.documentURI }));
        }
    },

    observers: {
        "http-on-examine-response": util.wrapCallback(function onExamineResponse(request, data) {
            request.QueryInterface(Ci.nsIChannel).QueryInterface(Ci.nsIHttpChannel).QueryInterface(Ci.nsIRequest);

            if (request.loadFlags & request.LOAD_DOCUMENT_URI) {
                try {
                    var win = request.notificationCallbacks.getInterface(Ci.nsIDOMWindow);
                }
                catch (e) {
                    return;
                }
                this.getHeaders(win, request);
                try {
                    webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
                }
                catch (e) {}
            }
        })
    },

    onStateChange: util.wrapCallback(function(webProgress, request, stateFlags, status) {
        if ((stateFlags & this.STATE_START) && (stateFlags & this.STATE_IS_DOCUMENT))
            this.getHeaders(webProgress.DOMWindow, request);
        else if ((stateFlags & this.STATE_STOP) && (stateFlags & this.STATE_IS_DOCUMENT)) {
            this.getHeaders(webProgress.DOMWindow, request);
            try {
                webProgress.removeProgressListener(this);
            } catch (e) {}
        }
    }),

    getController: function getController(win) {
        for (let i of util.range(0, win.controllers.getControllerCount())) {
            let controller = win.controllers.getControllerAt(i);
            if (controller.supportsCommand("dactyl-headers") && controller.wrappedJSObject instanceof Controller)
                return controller.wrappedJSObject;
        }
    }
});

let observer = HttpObserver();
let onUnload = observer.closure.cleanup;

function iterHeaders(buffer, type) {
    let win = buffer.focusedFrame;
    let store = win.document[overlay.id];
    if (!store || !store.headers)
        store = observer.getController(win);

    if (store)
        for (let [k, v] of values(store.headers[type] || []))
            yield [k, v];
}

iter({ h: "Request", H: "Response" }).forEach(function ([key, name])
    Buffer.addPageInfoSection(key, name + " Headers", function (verbose) {
        if (verbose)
            return iterHeaders(this, name.toLowerCase())
    }));

/* vim:se sts=4 sw=4 et: */
