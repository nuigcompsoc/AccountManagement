var express = require('express');
var router = express.Router();
var passport = require('passport');
var rootController = require('../controllers/rootController');

router.get('/', passport.authenticate('jwt', {session: false, failureRedirect: '/auth/login'}), rootController.root);

module.exports = router;
