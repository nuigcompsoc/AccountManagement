var req = require('require-yml');
var conf = req('/root/CompSocAccountManagement/NodeFrontend/config.yml');
var fs = require('fs');
var ldap = require('ldapjs');
var client = ldap.createClient({
    url: conf.url,
    reconnect: true,
    tlsOptions: {
        host: conf.ldaphost,
        port: conf.ldapport,
        ca: [fs.readFileSync(conf.tlsCertPath)]
    }
});

module.exports = {
    getMember: (id) => {
        return new Promise(resolve => {
            // for now we'll assume the function only recieves one member at a time
            // We're filtering by the student's ID and just returning their username but we don't need to
            var searchOptions = {
                scope: 'sub',
                filter: '(employeeNumber='+id+')',
                attributes: ['uid', 'givenName', 'surname', 'mail', 'mobile']
            }

            // client search queries LDAP
            client.search(conf.searchBase, searchOptions, function(err, res) {
                if (err)
                    console.log(err);
                    
                res.on('searchEntry', function (entry) {
                    // If the member exists in ldap with that student ID, it will return true here.
                    let user = {
                        firstName: entry.object.givenName,
                        surname: entry.object.sn,
                        mail: entry.object.mail,
                        mobile: entry.object.mobile,
                        uid: entry.object.uid,
                        id: id
                    }
                    resolve(user);
                });
                // Member is not in LDAP
                //resolve(null);
            });
        });
    },

    pushMember: (user) => {
        console.log("pushing " + user);
    }
}