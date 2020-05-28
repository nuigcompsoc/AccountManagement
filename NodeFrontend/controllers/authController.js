var express = require('express');
var router = express.Router();
var passport = require('passport');
var bodyParser = require("body-parser");
var jwt = require('jsonwebtoken');
var req = require('require-yml');
var conf = req('/root/CompSocAccountManagement/NodeFrontend/config.yml');
var mailController = require('./mailController');
var ldapController = require('./ldapController');

var tokens = [];

module.exports = {

  login: (req, res, next) => {
      if (!req.isAuthenticated()) res.render('login', {title: 'Login'});
      else res.redirect('/');
  },

  magicLink: (req, res, next) => {

    if (req.isAuthenticated()) res.redirect('/');
    // Checking if token has already been used
    else if (!tokens.includes(req.params.id)) {
      // Verifying the token passed in the URL
      jwt.verify(req.params.id, conf.jwtsecret, function (err, decoded) {
        if (err) return res.status(401).send({error: err});
        var token = jwt.sign({
          id: decoded.id,
        }, conf.jwtsecret);

        // Pushing token to array so it can't be used again
        tokens.push(req.params.id);

        // Logging in and giving new cookie that expires after a month instead of 15 mins
        req.login(ldapController.getMember(decoded.id), {session: false}, (err) => {
          if (err) return res.status(403).json({message: 'Unsuccessful Login!'});
          res.cookie('jwt', token, { maxAge: 1000 * 60 * 60 * 24 * 30 });
          res.redirect('/');
        })
      });
    } else {
      // Token already used
      res.status(401).json({error: "Token already used"});
    }
  },

  loginPost: async (req, res, next) => {
    if (req.body.id) {
      var token = jwt.sign({
          id: req.body.id
      }, conf.jwtsecret, {
        expiresIn: '15m'
      });

      var user = await ldapController.getMember(req.body.id);
      // Sending email with token
      mailController.sendTokenMail(token, user);
      return res.status(200).send({message: "check email"});
    } else {
      return res.status(400).send({error: "No ID Provided"});
    }
  },

  logoutPost: (req, res, next) => {
      res.clearCookie('jwt');
      res.redirect('/');
  }

};
