var req = require('require-yml');
var conf = req('/root/CompSocAccountManagement/NodeFrontend/config.yml');
var fs = require('fs');
var nodemailer = require("nodemailer");

module.exports = {
    sendTokenMail: async (token, mail) => {
        var MailService = nodemailer.createTransport({
            host: conf.mailhost,
            port: conf.mailport,
            secure: false,
            auth: {
                user: conf.mailuser,
                pass: conf.mailpass,
            },
            // Allow as we are forwarding mail via jump server currently
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false
              }
        });
    
        let info = await MailService.sendMail({
            from: '"CompSoc Admin" <admin@compsoc.ie>', // sender address
            to: mail, // list of receivers
            subject: "CompSoc Profile: Login Link", // Subject line
            html: "https://my.compsoc.ie/auth/login/"+token, // html body
        });
    }
    
}