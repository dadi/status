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
      healthTimeLimit: 200
    };

    dadiStatus(params, function(error, result) {
      should.exist(error);
      done();
    });
  });

  it('should raise error when package name is invalid', function(done) {
    this.timeout(3000);

    var params = {
      healthTimeLimit: 200,
      pkgName: '@dadi-api'
    };

    dadiStatus(params, function(error, result) {
        should.exist(error);
        done();
    });
  });

  it('should return data when package name is valid', function(done) {
    this.timeout(5000);

    var params = {
      healthTimeLimit: 200,
      pkgName: '@dadi/api'
    };

    dadiStatus(params, function(error, result) {
        should.exist(result);
        done();
    });
  });
});
