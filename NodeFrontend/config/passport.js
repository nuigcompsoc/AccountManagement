var LdapStrategy = require('passport-ldapauth');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var JWTStrategy = require('passport-jwt').Strategy,
    ExtractJWT = require('passport-jwt').ExtractJwt;
var jwt = require('jsonwebtoken');
var req = require('require-yml');
var conf = req('/root/AccountManagement/NodeFrontend/config.yml');
var fs = require('fs');
var ldapController = require('../controllers/ldapController');

var cookieExtractor = function(req) {
    var token = null;
    if (req && req.cookies) token = req.cookies['jwt'];
    return req.cookies['jwt']
};

var opts = {
    jwtFromRequest: cookieExtractor,
    secretOrKey: conf.jwtSecret
}

passport.use(new JWTStrategy(opts, async function (jwtPayload, done) {
        var user = await ldapController.getMember(jwtPayload.id);
        if (!user) done(null, false, {message: 'User Not Associated With Account'});
        return done(null, user);
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    ldapController.getMember(id, function(user) {
        if (!user) {
            done(err, user);
        } else {
            console.log("Error in deserializing user");
        }
    })
});