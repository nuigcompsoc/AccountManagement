var req = require('require-yml');
var conf = req('/root/AccountManagement/NodeFrontend/config.yml');
var fs = require('fs');
var nodemailer = require("nodemailer");

module.exports = {
    sendTokenMail: async (token, user) => {
        var MailService = nodemailer.createTransport({
            host: conf.mailHost,
            port: conf.mailPort,
            secure: false,
            auth: {
                user: conf.mailUser,
                pass: conf.mailSecret,
            },
            tls: {
                rejectUnauthorized: true
              }
        });
    
        MailService.sendMail({
            from: '"CompSoc Admin" <admin@compsoc.ie>', // sender address
            to: user.mail, // list of receivers
            subject: "CompSoc Profile: Login Link", // Subject line
            //html: "https://my.compsoc.ie/auth/login/"+token, // html body
            html: "<html><body><p>Hi "+user.firstName+",<br><br>Click the following link to <a href='https://my.compsoc.ie/auth/login/"+token+"'><b>log in</b></a>.<br>If you did not request to log in, you can safely ignore this email.<br><br>Le gach dea ghuí ,<br>CompSoc Admins"
        },(err, success) => {
            if (err) console.log(err);
        });
    }
    
}