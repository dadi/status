const async = require('async')
const latestVersion = require('latest-version')
const os = require('os')
const request = require('request')

function secondsToString (seconds) {
  let numdays = Math.floor(seconds / 86400)
  let numhours = Math.floor((seconds % 86400) / 3600)
  let numminutes = Math.floor(((seconds % 86400) % 3600) / 60)
  let numseconds = Math.floor(((seconds % 86400) % 3600) % 60)
  return numdays + ' days ' + numhours + ' hours ' + numminutes + ' minutes ' + numseconds + ' seconds'
}

function bytesToSize (input, precision) {
  let unit = ['', 'K', 'M', 'G', 'T', 'P']
  let index = Math.floor(Math.log(input) / Math.log(1024))
  /* istanbul ignore if */
  if (unit >= unit.length) return input + ' B'
  return (input / Math.pow(1024, index)).toFixed(precision) + ' ' + unit[index] + 'B'
}

module.exports = function (params, next) {
  let pkgName = params.package // Package name to get the latest version.
  let site = params.site // The "name" property from the calling app's package.json, used as the website identifier
  let version = params.version // Version of current package
  let baseUrl = params.healthCheck.baseUrl // Request link to connect routes
  let authorization = params.healthCheck.authorization // Required authorization header to request
  let healthRoutes = params.healthCheck.routes || [] // Routes array to check health

  if (pkgName && pkgName !== '') {
    let routesCallbacks = []

    healthRoutes.forEach(route => {
      let start = new Date()

      routesCallbacks.push((cb) => {
        request({
          url: baseUrl + route.route,
          headers: {
            'Authorization': authorization,
            'User-Agent': '@dadi/status'
          }
        }, (err, response, body) => {
          let responseTime = (new Date() - start) / 1000

          let health = {
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
      let usage = process.memoryUsage()

      let data = {
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
