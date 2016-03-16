var should = require('should');
var http = require('http');
var dadiStatus = require(__dirname + '/../dadi/lib');

describe('DADI Status', function () {
  it('should export function', function (done) {
    dadiStatus.should.be.Function;
    done();
  });

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

    dadiStatus(params, function(error, result) {
      should.exist(error);
      done();
    });
  });

  it('should raise error when package name is invalid', function(done) {
    this.timeout(3000);

    var params = {
      site: 'dadi/status/test',
      version: '1.0.0',
      package: 'xxx',
      healthCheck: {
        baseUrl: 'http://127.0.0.1:3001',
        authorization: 'Bearer 123abcdef',
        routes: [{
          route: '/xxx',
          expectedResponseTime: 10
        }]
      }
    }

    dadiStatus(params, function(error, result) {
        should.exist(error);
        done();
    });
  });

  it('should return data when package name is valid', function(done) {
    this.timeout(5000);

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

    dadiStatus(params, function(error, result) {
        should.exist(result);
        done();
    });
  });
});
