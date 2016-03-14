var url = require('url');
var latestVersion = require('latest-version');
var os = require('os');
var _ = require('underscore');
var request = require('request');
var async = require('async');

function secondsToString(seconds) {
  var numdays = Math.floor(seconds / 86400);
  var numhours = Math.floor((seconds % 86400) / 3600);
  var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
  var numseconds = Math.floor(((seconds % 86400) % 3600) % 60);
  return numdays + " days " + numhours + " hours " + numminutes + " minutes " + numseconds + " seconds";
};

function bytesToSize(input, precision) {
  var unit = ['', 'K', 'M', 'G', 'T', 'P'];
  var index = Math.floor(Math.log(input) / Math.log(1024));
  if (unit >= unit.length) return input + ' B';
  return (input / Math.pow(1024, index)).toFixed(precision) + ' ' + unit[index] + 'B';
};

module.exports = function (params, next) {
  var version = params.version, //Version of current package
      requestLink = params.requestLink,  //Request link to connect routes
      authorization = params.authorization, //Required authorization header to request
      healthRoutes = params.healthRoutes || [], //Routes array to check health
      pkgName = params.pkgName;	// Package name to get the latest version.
  
  if(pkgName && pkgName !== '') {
    latestVersion(pkgName).then(function(latestVersion) {
      var routesCallbacks = [];
      _.each(healthRoutes, function(route) {
        var start = new Date();
        routesCallbacks.push(function(cb) {
          request({
            url: requestLink + route.route, 
            headers: {
              'Authorization': authorization
            }
          }, function(err, response, body) {
            var responseTime = (new Date() - start) / 1000;
            var usage = process.memoryUsage();
            var health = {
              route: route.route,
              responseTime: responseTime
            }
            health.responseTime = responseTime;
            if (!err && response.statusCode == 200) {
              if(responseTime < route.expectedResponseTime) {
                health.healthStatus = 'Green';
              } else {
                health.healthStatus = 'Amber';
              }
            } else {
              health.healthStatus = 'Red';
            }
            cb(err, health);
          });
        });
      });
      async.parallel(routesCallbacks, function(err, health) {
        var usage = process.memoryUsage();
        var data = {
          service: {
            name: pkgName,
            versions: {
              current: version,
              latest: latestVersion
            }
          },
          process: {
            pid: process.pid,
            uptime: process.uptime(),
            uptimeFormatted: secondsToString(process.uptime()),
            versions: process.versions
          },
          memory: {
            rss: bytesToSize(usage.rss, 3),
            heapTotal: bytesToSize(usage.heapTotal, 3),
            heapUsed: bytesToSize(usage.heapUsed, 3)
          },
          system: {
            platform: os.platform(),
            release: os.release(),
            hostname: os.hostname(),
            memory: {
              free: bytesToSize(os.freemem(), 3),
              total: bytesToSize(os.totalmem(), 3)
            },
            load: os.loadavg(),
            uptime: os.uptime(),
            uptimeFormatted: secondsToString(os.uptime())
          },
          routes: health
        };
        next(null, data);
      });
      
    }).catch(function (err) {
      next(err);
    });
  } else {
    next('Please pass package name to get latest version of that package.');
  }
};