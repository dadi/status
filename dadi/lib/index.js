var _ = require('underscore')
var async = require('async')
var latestVersion = require('latest-version')
var os = require('os')
var request = require('request')

function secondsToString (seconds) {
  var numdays = Math.floor(seconds / 86400)
  var numhours = Math.floor((seconds % 86400) / 3600)
  var numminutes = Math.floor(((seconds % 86400) % 3600) / 60)
  var numseconds = Math.floor(((seconds % 86400) % 3600) % 60)
  return numdays + ' days ' + numhours + ' hours ' + numminutes + ' minutes ' + numseconds + ' seconds'
}

function bytesToSize (input, precision) {
  var unit = ['', 'K', 'M', 'G', 'T', 'P']
  var index = Math.floor(Math.log(input) / Math.log(1024))
  /* istanbul ignore if */
  if (unit >= unit.length) return input + ' B'
  return (input / Math.pow(1024, index)).toFixed(precision) + ' ' + unit[index] + 'B'
}

module.exports = function (params, next) {
  var pkgName = params.package // Package name to get the latest version.
  var site = params.site // The "name" property from the calling app's package.json, used as the website identifier
  var version = params.version // Version of current package
  var baseUrl = params.healthCheck.baseUrl // Request link to connect routes
  var authorization = params.healthCheck.authorization // Required authorization header to request
  var healthRoutes = params.healthCheck.routes || [] // Routes array to check health

  if (pkgName && pkgName !== '') {
    var routesCallbacks = []

    _.each(healthRoutes, (route) => {
      var start = new Date()

      routesCallbacks.push((cb) => {
        request({
          url: baseUrl + route.route,
          headers: {
            'Authorization': authorization,
            'User-Agent': '@dadi/status'
          }
        }, (err, response, body) => {
          var responseTime = (new Date() - start) / 1000

          var health = {
            route: route.route,
            status: response ? response.statusCode : 'Unknown',
            expectedResponseTime: route.expectedResponseTime,
            responseTime: responseTime
          }

          health.responseTime = responseTime

          if (!err && response.statusCode === 200) {
            if (responseTime < route.expectedResponseTime) {
              health.healthStatus = 'Green'
            } else {
              health.healthStatus = 'Amber'
            }
          } else {
            health.healthStatus = 'Red'
          }

          cb(err, health)
        })
      })
    })

    async.parallel(routesCallbacks, (err, health) => {
      var usage = process.memoryUsage()

      var data = {
        service: {
          site: site,
          package: pkgName,
          versions: {
            current: version
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
      }

      if (err) {
        data.errors = data.errors || []
        data.errors.push(err)
      }

      latestVersion(pkgName).then((latestVersion) => {
        data.service.versions.latest = latestVersion
        next(null, data)
      }).catch((err) => {
        data.service.versions.latest = '0'

        data.errors = data.errors || []
        data.errors.push(err)

        next(null, data)
      })
    })
  } else {
    next('Please pass package name to get latest version of that package.')
  }
}
