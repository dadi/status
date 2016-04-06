/*
 *  Generic middleware processor, extend at your leisure
 *
 *         
 *    - Handles Routing and pre routing middleware designed as functions with arity (req, res, next)
 *    - Error handling is done al la Express/Connect via function.length detection, i.e. function (err, req, res, next) {}
 *      is added to the Error middleware stack
 */


var http = require('http');
var url = require('url');
var pathToRegexp = require('path-to-regexp');
var raven = require('raven');
var _ = require('underscore');
var methods = require('methods');


/**
 * Represents the main server.
 * @constructor
 */
var Api = function () {
    this.paths = [];
    this.all = [];
    this.errors = [];

    // permanently bind context to listener
    this.listener = this.listener.bind(this);
};

/**
 *  Connects a handler to a specific path
 *  @param {String} path
 *  @param {Controller} handler
 *  @return undefined
 *  @api public
 */
Api.prototype.use = function (path, handler) {

    if (typeof path === 'function') {
        if (path.length === 4) return this.errors.push(path);
        return this.all.push(path);
    }

    var regex = pathToRegexp(path);

    this.paths.push({
        path: path,
        order: routePriority(path, regex.keys),
        handler: handler,
        regex: regex
    });

    this.paths.sort(function (a, b) {
        return b.order - a.order;
    });
};

/**
 *  Removes a handler or removes the handler attached to a specific path
 *  @param {String} path
 *  @return undefined
 *  @api public
 */
Api.prototype.unuse = function (path) {
    var indx = 0;
    if (typeof path === 'function') {
        if (path.length === 4) {
            // TODO: I'm leaving this as is to ensure backwards compat isn't broken. The issue is we `unuse`
            //       error handlers by reference, generic middleware by string comparison, and paths 
            //       by pathname.  Next code review we should look into being more consistent -JW
            indx = this.errors.indexOf(path);
            return !!~indx && this.errors.splice(indx, 1);
        }

        // temporary container for this.all, because we don't
        // want to modify an Array while iterating over it
        var all = _.clone(this.all);
        var functionStr = path.toString();
        _.each(this.all, function (func) {
            if (func.toString() === functionStr) {
                return all.splice(indx, 1);
            }
            else {
                indx++;
            }
        }, this);

        this.all = all;

    }
    var existing = _.findWhere(this.paths, { path: path });
    this.paths = _.without(this.paths, existing);
};

/**
 *  Create app.[http verb] methods, e.g. `app.post('path', function (req, res, next) { ... });` 
 *  @param {String} path
 *  @param {Controller} handler
 *  @return undefined
 *  @api public
 */

methods.forEach(function (method) {
    Api.prototype[method] = function (path, handler) {

        this.use(path, function (req, res, next) {
            var reqMethod = typeof req.method === 'string' && req.method.toLowerCase();

            if (reqMethod === method) {
                handler(req, res, next);
                return;
            }

            next();
        });
    };
});

/**
 *  convenience method that creates http server and attaches listener
 *  @param {Number} port
 *  @param {String} host
 *  @param {Number} backlog
 *  @param {Function} [done]
 *  @return http.Server
 *  @api public
 */
Api.prototype.listen = function (port, host, backlog, done) {
    return http.createServer(this.listener).listen(port, host, backlog, done);
};

/**
 *  listener function to be passed to node's `createServer`
 *  @param {http.IncomingMessage} req
 *  @param {http.ServerResponse} res
 *  @return undefined
 *  @api public
 */
Api.prototype.listener = function (req, res) {

    // clone the middleware stack
    var stack = this.all.slice(0);
    var path = url.parse(req.url).pathname;

    req.paths = [];

    res = addHelpers(res);

    // get matching routes, and add req.params
    var matches = this._match(path, req);
    var originalReqParams = req.params;

    var doStack = function (i) {
        return function (err) {

            if (err) return errStack(0)(err);

            // add the original params back, in case a middleware
            // has modified the current req.params
            _.extend(req.params, originalReqParams);

            // TODO: do we need to use try/catch here?  it has a significant negative impact on performance -JW
            try {
              stack[i](req, res, doStack(++i));
            }
            catch (e) {
              return errStack(0)(e);
            }
        };
    };

    var self = this;
    var errStack = function (i) {
        return function (err) {
            self.errors[i](err, req, res, errStack(++i));
        };
    };

    // add path specific handlers
    stack = stack.concat(matches);

    // add 404 handler
    stack.push(notFound(this, req, res));

    // start going through the middleware/routes
    doStack(0)();
};

/**
 *  Check if any of the registered routes match the current url, if so populate `req.params`
 *  @param {String} path
 *  @param {http.IncomingMessage} req
 *  @return Array
 *  @api private
 */
Api.prototype._match = function (path, req) {
    var paths = this.paths;
    var matches = [];
    var handlers = [];

    // always add params object to avoid need for checking later
    req.params = {};

    for (i = 0; i < paths.length; i++) {
        var match = paths[i].regex.exec(path);

        if (!match) { continue; }

        req.paths.push(paths[i].path);

        var keys = paths[i].regex.keys;
        handlers.push(paths[i].handler);

        match.forEach(function (k, i) {
            var keyOpts = keys[i] || {};
            if (match[i + 1] && keyOpts.name && !req.params[keyOpts.name]) req.params[keyOpts.name] = match[i + 1];
        });

    }

    return handlers;
};

module.exports = Api;

/**
 *  inspect the route path and keys 
 *  @param {String} path
 *  @param {Array} keys
 *  @api private
 */
function routePriority(path, keys) {

    var tokens = pathToRegexp.parse(path);

    var staticRouteLength = 0;
    if (typeof tokens[0] === 'string') {
        staticRouteLength = _.compact(tokens[0].split('/')).length;
    }

    var requiredParamLength = _.filter(keys, function (key) {
        return !key.optional;
    }).length;

    var optionalParamLength = _.filter(keys, function (key) {
        return key.optional;
    }).length;

    var order = (staticRouteLength * 5) + (requiredParamLength * 2) + (optionalParamLength);
    if (path.indexOf('/config') > 0) order = -10;

    return order;
}

// Default 404
function notFound(api, req, res) {
    return function () {

        res.statusCode = 404;

        // look for a 404 page that has been loaded
        // along with the rest of the API, and call its
        // handler if it exists

        var path = _.findWhere(api.paths, { path: '/404' });
        if (path) {
            path.handler(req, res);
        }
        // otherwise, respond with default message
        else {
            res.end('Not Found');
        }
    };
}

// add helper functions to the request object
function addHelpers(res) {
    res.redirect = function (location) {
        this.writeHead(302, {'Location': location});
        this.end();
    };

    res.send = function (arg) {
        var contentType = res.getHeader('content-type');

        // JSON
        if (typeof arg === 'object') {
            var chunk = JSON.stringify(arg);
            chunk = new Buffer(chunk);

            this.setHeader('Content-Type', 'application/json');
            this.setHeader('Content-Length', chunk.length);

            return this.end(chunk);
        }

        if (typeof arg === 'number') {
            this.statusCode = arg;
            return this.end();
        }

        return this.end(arg);
    };

    return res;
}
