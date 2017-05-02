var nock = require('nock')
var path = require('path')
var should = require('should')
var dadiStatus = require(path.join(__dirname, '/../dadi/lib'))

describe('DADI Status', function () {
  this.timeout(15000)

  it('should export function', function (done) {
    dadiStatus.should.be.Function
    done()
  })

  it('should raise error when package name is undefined', function (done) {
    var params = {
      site: 'dadi/status/test',
      version: '1.0.0',
      healthCheck: {
        baseUrl: 'http://127.0.0.1:3001',
        authorization: 'Bearer 123abcdef',
        routes: [{
          route: '/xxx',
          expectedResponseTime: 10
        }]
      }
    }

    dadiStatus(params, function (error, result) {
      should.exist(error)
      done()
    })
  })

  it('should raise error when package name is invalid', function (done) {
    var params = {
      site: 'dadi/status/test',
      version: '1.0.0',
      package: 'thisshouldwellbeinvalid',
      healthCheck: {
        baseUrl: 'http://127.0.0.1:3001',
        authorization: 'Bearer 123abcdef',
        routes: [{
          route: '/xxx',
          expectedResponseTime: 10
        }]
      }
    }

    dadiStatus(params, function (error, result) {
      should.exist(result.errors)
      result.errors.should.be.Array
      result.errors.length.should.be.above(0)
      done()
    })
  })

  it('should return data when package name is valid', function (done) {
    var params = {
      site: 'dadi/status/test',
      version: '1.0.0',
      package: '@dadi/web',
      healthCheck: {
        baseUrl: 'http://127.0.0.1:3001',
        authorization: 'Bearer 123abcdef',
        routes: []
      }
    }

    dadiStatus(params, function (error, result) {
      should.exist(result)
      done()
    })
  })

  it('should assign empty array if no configured routes are specifed', function (done) {
    var params = {
      site: 'dadi/status/test',
      version: '1.0.0',
      package: '@dadi/web',
      healthCheck: {
        baseUrl: 'http://127.0.0.1:3001',
        authorization: 'Bearer 123abcdef'
      }
    }

    dadiStatus(params, (err, result) => {
      result.routes.should.be.Array
      result.routes.length.should.eql(0)
      done()
    })
  })

  describe('Health Route Check', function () {
    var params = {
      site: 'dadi/status/test',
      version: '1.0.0',
      package: '@dadi/web',
      healthCheck: {
        baseUrl: 'http://127.0.0.1:3001',
        authorization: 'Bearer 123abcdef',
        routes: [
          {
            route: '/home',
            expectedResponseTime: 10
          }
        ]
      }
    }

    it('should check configured routes and return health info', function (done) {
      var scope = nock('http://127.0.0.1:3001')
        .get('/home')
        .reply(200)

      dadiStatus(params, (err, result) => {
        should.exist(result)
        result.routes.should.be.Array
        result.routes[0].route.should.eql('/home')
        done()
      })
    })

    it('should return "Green" when response time is less than expected', function (done) {
      var scope = nock('http://127.0.0.1:3001')
        .get('/home')
        .reply(200)

      dadiStatus(params, (err, result) => {
        should.exist(result)
        result.routes.should.be.Array
        result.routes[0].healthStatus.should.eql('Green')
        done()
      })
    })

    it('should return "Amber" when response time is less than expected', function (done) {
      var scope = nock('http://127.0.0.1:3001')
        .get('/home')
        .reply(200)

      params.healthCheck.routes[0].expectedResponseTime = 0

      dadiStatus(params, (err, result) => {
        should.exist(result)
        result.routes.should.be.Array
        result.routes[0].healthStatus.should.eql('Amber')
        done()
      })
    })

    it('should return "Red" when response code is not 200', function (done) {
      var scope = nock('http://127.0.0.1:3001')
        .get('/home')
        .reply(400)

      dadiStatus(params, (err, result) => {
        should.exist(result)
        result.routes.should.be.Array
        result.routes[0].healthStatus.should.eql('Red')
        done()
      })
    })

    it('should return any errors encountered', function (done) {
      var scope = nock('http://127.0.0.1:3001')
        .get('/home')
        .replyWithError({'message': 'something awful happened', 'code': 'AWFUL_ERROR'})

      dadiStatus(params, (err, result) => {
        should.exist(result.errors)
        result.errors.should.be.Array
        result.errors.length.should.be.above(0)
        result.errors[0].code.should.eql('AWFUL_ERROR')
        done()
      })
    })
  })
})
