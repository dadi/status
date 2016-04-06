var http = require('http');
var should = require('should');
var request = require('supertest');
var methods = require('methods');
var Middleware = require('../../index.js');

describe('Middleware', function () {
    it('should call error handler if `next` is called with an error', function (done) {
        var app = new Middleware();

        app.use(function (req, res, next) {
            next(new Error('test error'));
        });

        app.use(function (err, req, res, next) {
            res.end('success');
        });

        request(app.listener)
        .get('/')
        .expect(200)
        .end(function (err, res) {
            if (err) return done(err);

            res.text.should.equal('success');
            done();
        });
    });

    it('should call error handler if a handler throws an error', function (done) {
        var app = new Middleware();

        app.use(function (req, res, next) {
            throw new Error('test error');
        });

        app.use(function (err, req, res, next) {
            res.end('success');
        });

        request(app.listener)
        .get('/')
        .expect(200)
        .end(function (err, res) {
            if (err) return done(err);

            res.text.should.equal('success');
            done();
        });
    });

    describe('HTTP method helpers', function () {
        it('should be added to Middleware instances', function (done) {
            var app = new Middleware();

            methods.forEach(function (meth) {
                app[meth].should.be.Function;
            });

            done();
        });

        it('should filter request types', function (done) {
            var app = new Middleware();

            app.get('/', function (req, res) {
                res.end('success');
            });

            var req = request(app.listener);
            
            req.post('/')
            .expect(404)
            .end(function (err) {
                if (err) return done(err);

                req.get('/')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);

                    res.text.should.equal('success');
                    done();
                });
            });
        });
    });

    describe('`listen` method', function () {
        it('should return a listening HTTP server', function (done) {
            var app = new Middleware();

            var server = app.listen();
            server.should.be.an.instanceOf(http.Server);

            server.close(done);
        });
    });

    describe('`redirect` method', function () {
        it('should be added to the response object', function (done) {
            var app = new Middleware();

            app.use(function (req, res) {
                res.redirect.should.be.Function;
                res.end();
            });

            request(app.listener)
            .get('/')
            .end(done);

        });

        it('should respond with status 302', function (done) {
            var app = new Middleware();

            app.use(function (req, res) {
                res.redirect('/login.html');
            });

            request(app.listener)
            .get('/')
            .expect(302)
            .expect('Location', '/login.html')
            .end(done);
        });
    });

    describe('`send` method', function () {
        it('should be added to the response object', function (done) {
            var app = new Middleware();

            app.use(function (req, res) {
                res.send.should.be.Function;
                res.end();
            });

            request(app.listener)
            .get('/')
            .end(done);

        });

        it('should send JSON if Object is first argument', function (done) {
            var app = new Middleware();

            app.use(function (req, res) {
                res.send({json: 'test'});
            });

            request(app.listener)
            .get('/')
            .expect('Content-Type', 'application/json')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);

                res.body.json.should.equal('test');
                done();
            });
        });

        it('should send status if Number is first argument', function (done) {
            var app = new Middleware();

            app.use(function (req, res) {
                res.send(204);
            });

            request(app.listener)
            .get('/')
            .expect(204)
            .end(done);
        });

        it('should send a arbitrary string if String is first argument', function (done) {
            var app = new Middleware();

            app.use(function (req, res) {
                res.send('foo');
            });

            request(app.listener)
            .get('/')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);

                res.text.should.equal('foo');
                done();
            });
        });
    });

    describe('`unuse` method', function () {
        it('should remove functions from `all` Array', function (done) {
            var app = new Middleware();

            app.use(function () {});
            app.use(function (req, res, next) { next(); });

            app.all.length.should.equal(2);

            app.unuse(function () {});

            app.all.length.should.equal(1);

            done();
        });

        it('should remove functions from the `errors` Array', function (done) {
            var app = new Middleware();

            var err1 = function (err, req, res, next) {};
            var err2 = function (err, req, res, next) { next(err); };
            app.use(err1);
            app.use(err2);

            app.errors.length.should.equal(2);

            app.unuse(err1);

            app.errors.length.should.equal(1);

            done();
        });

        it('should remove a path from the `paths` Array', function (done) {
            var app = new Middleware();

            app.use('/derp', function () {});
            app.use('/foo', function (req, res, next) { next(); });

            app.paths.length.should.equal(2);

            app.unuse('/derp');

            app.paths.length.should.equal(1);

            done();
        });
    });

    describe('`use` method', function () {
        it('should add functions to `all` Array', function (done) {
            var app = new Middleware();

            app.all.length.should.equal(0);

            app.use(function () {});

            app.all.length.should.equal(1);

            done();
        });

        it('should add functions with arity of 4 to the `errors` Array', function (done) {
            var app = new Middleware();

            app.errors.length.should.equal(0);

            app.use(function (err, req, res, next) {});

            app.errors.length.should.equal(1);

            done();
        });

        it('should add a route if the first argument is a string', function (done) {
            var app = new Middleware();

            app.paths.length.should.equal(0);

            app.use('/test', function (req, res, next) {
                res.end('success');
            });

            app.paths.length.should.equal(1);

            request(app.listener)
            .get('/test')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);

                res.text.should.equal('success');
                done();
            });
        });

        it('should sort routes based on optional vs. required parameters', function (done) {
            var app = new Middleware();

            app.use('/:firstparam/:secondparam', function (req, res, next) {
                res.end('fail');
            });

            // '/test/foo' is called first even though its added last, because its params are specific
            app.use('/test/foo', function (req, res, next) {
                res.end('success');
            });

            request(app.listener)
            .get('/test/foo')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);

                res.text.should.equal('success');
                done();
            });

        });

        // TODO: This functionality existed in the `Web` version of this module, so I'm adding a test.
        //       However, I don't entirely understand why its here -JW
        it('should use special sorting for routes containing `/config`', function (done) {
            var app = new Middleware();

            app.use('/test/:name', function (req, res, next) {
                res.end('success');
            });

            app.use('/test/config', function (req, res, next) {
                res.end('fail')
            });

            request(app.listener)
            .get('/test/config')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);

                res.text.should.equal('success');
                done();
            });

        });

        it('should treat the `/404` path as a special case and use it when a path is not found', function (done) {
            var app = new Middleware();

            app.use('/404', function (req, res, next) {
                res.end('success');
            });

            // '/test/foo' is called first even though its added last, because its params are specific
            app.use('/test/foo', function (req, res, next) {
                res.end('fail');
            });

            request(app.listener)
            .get('/test/bar')
            .expect(404)
            .end(function (err, res) {
                if (err) return done(err);

                res.text.should.equal('success');
                done();
            });

        });
    });
});
