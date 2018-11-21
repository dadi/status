# DADI Status

[![npm (scoped)](https://img.shields.io/npm/v/@dadi/status.svg?maxAge=10800&style=flat-square)](https://www.npmjs.com/package/@dadi/status)
[![Coverage Status](https://coveralls.io/repos/github/dadi/status/badge.svg?branch=master)](https://coveralls.io/github/dadi/status?branch=master)
[![Build Status](https://travis-ci.org/dadi/status.svg?branch=master)](https://travis-ci.org/dadi/status)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

## Overview

DADI Status returns a JSON object containing information about an application's platform, process and health state.

### Data returned

* Latest version of the specified NPM module (e.g. @dadi/web)
* Node version
* Process ID
* Process uptime
* Process memory usage
* Hostname
* System platform and version
* System Uptime
* Memory, free and total
* Current load averages

### Health Check Routes

In addition to system information, if a collection of routes are specified DADI Status will send a request to each
one and return data about the response:

```
  "routes": [
    {
      "route": "/movies/latest",
      "status": 200,
      "responseTime": 0.039,
      "healthStatus": "Green"
    }
  ]
```

### User-Agent identifier

DADI Status passes a User-Agent header to idenitify itself when making health check requests. The following header is used:

```
'User-Agent': '@dadi/status'
```

## Usage

### Install

```
npm install @dadi/status --save
```

### Add a route

```js
var dadiStatus = require('@dadi/status')

app.use('/api/status', function(req, res, next) {
  var params = {
    site: "WC?",
    package: '@dadi/web',
    version: version,
    healthCheck: {
      baseUrl: 'http://127.0.0.1:3001',
      authorization: 'Bearer 123abcdef',
      routes: [{
        route: '/movies/latest',
        expectedResponseTime: 10
      }]
    }
  }

  dadiStatus(params, function(err, data) {
    if (err) return next(err)
    var resBody = JSON.stringify(data, null, 2)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('content-length', Buffer.byteLength(resBody))
    res.end(resBody)
  })
})
```

### Sample response

```
{
  "service": {
    "site": "WC?",
    "package": "@dadi/web",
    "versions": {
      "current": "1.1.2",
      "latest": "1.1.2"
    }
  },
  "process": {
    "pid": 19463,
    "uptime": 3.523,
    "uptimeFormatted": "0 days 0 hours 0 minutes 3 seconds",
    "versions": {
      "http_parser": "2.3",
      "node": "0.12.0",
      "v8": "3.28.73",
      "uv": "1.0.2",
      "zlib": "1.2.8",
      "modules": "14",
      "openssl": "1.0.1l"
    }
  },
  "memory": {
    "rss": "86.508 MB",
    "heapTotal": "65.771 MB",
    "heapUsed": "32.938 MB"
  },
  "system": {
    "platform": "darwin",
    "release": "14.5.0",
    "hostname": "hudson",
    "memory": {
      "free": "37.781 MB",
      "total": "8.000 GB"
    },
    "load": [
      2.2958984375,
      2.27197265625,
      2.25927734375
    ],
    "uptime": 155084,
    "uptimeFormatted": "1 days 19 hours 4 minutes 44 seconds"
  },
  "routes": [
    {
      "route": "/movies/latest",
      "responseTime": 0.039,
      "healthStatus": "Green"
    }
  ]
}
```

## Licence

Copyright notice<br />
(C) 2018 DADI+ Limited <support@dadi.co><br />
All rights reserved

This product is part of DADI.<br />
DADI is free software; you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation; either version 2 of
the License, or (at your option) any later version ("the AGPL").
**If you wish to use DADI outside the scope of the AGPL, please
contact us at info@dadi.co for details of alternative licence
arrangements.**

**This product may be distributed alongside other components
available under different licences (which may not be AGPL). See
those components themselves, or the documentation accompanying
them, to determine what licences are applicable.**

DADI is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

The GNU Affero General Public License (AGPL) is available at
http://www.gnu.org/licenses/agpl-3.0.en.html.<br />

This copyright notice MUST APPEAR in all copies of the product!


