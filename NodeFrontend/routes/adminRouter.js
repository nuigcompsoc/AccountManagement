var express = require('express');
var router = express.Router();
var adminController = require('../controllers/adminController');

//router.get('/', passport.authenticate('jwt', {session: false, failureRedirect: '/auth/login'}), adminController.root);

module.exports = router;