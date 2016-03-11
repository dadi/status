var url = require('url');
var latestVersion = require('latest-version');
var os = require('os');
var _ = require('underscore');
var request = require('request');
var async = require('async');

var DadiStaus = function (params, next) {
  var unit = ['', 'K', 'M', 'G', 'T', 'P'];
  var version = params.version, //Version of current package
      requestLink = params.requestLink,  //Request link to connect routes
      authorization = params.authorization, //Required authorization header to request
      healthRoutes = params.healthRoutes || [], //Routes array to check health
      healthTimeLimit = params.healthTimeLimit, //Time limit to receive data
      pkgName = params.pkgName;	// Package name to get the latest version.
  
  //Return size with unit
  var bytesToSize = function(input, precision) {
    var index = Math.floor(Math.log(input) / Math.log(1024));
    if (unit >= unit.length) return input + ' B';
    return (input / Math.pow(1024, index)).toFixed(precision) + ' ' + unit[index] + 'B';
  };

  if(pkgName && pkgName !== '') {
    latestVersion(pkgName).then(function(result) {
      var routesCallbacks = [];
      _.each(healthRoutes, function(route) {
        var start = new Date();
        routesCallbacks.push(function(cb) {
          request({
            url: requestLink + route, 
            headers: {
              'Authorization': authorization
            }
          }, function(err, response, body) {
            var responseTime = (new Date() - start) / 1000;
            var usage = process.memoryUsage();
            var health = {
              route: route,
              pid: process.pid,
              uptime: process.uptime()+' seconds',
              memory: {
                rss: bytesToSize(usage.rss, 3),
                heapTotal: bytesToSize(usage.heapTotal, 3),
                heapUsed: bytesToSize(usage.heapUsed, 3)
              }
            };
            health.responseTime = responseTime;
            if (!err && response.statusCode == 200) {
              if(responseTime < healthTimeLimit) {
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
          current_version: version,
          memory_usage: {
            rss: bytesToSize(usage.rss, 3),
            heapTotal: bytesToSize(usage.heapTotal, 3),
            heapUsed: bytesToSize(usage.heapUsed, 3)
          },
          uptime: process.uptime()+' seconds',
          load_avg: os.loadavg(),
          latest_version: result,
          routes_health: health
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

module.exports = DadiStaus;