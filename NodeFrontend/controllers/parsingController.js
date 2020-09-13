var req = require('require-yml');
var axios = require('axios');
var Promise = require('bluebird');
var conf = req('/root/AccountManagement/NodeFrontend/config.yml');
//var dbController = require('./dbController');
var crypto = require("crypto");
var fs = require('fs');
var ldap = require('ldapjs-promise');
var APIOptions = {
    method: conf.socspostmethod,
    username: conf.socsusername,
    password: conf.socspasswd,
    encodeOutput: true
}

var nextUID;
var pendingOperations = [];

module.exports = async function () {

    var apiResults = await getMemberInfo();
    var currentMembers = await searchReturnAll();
    currentMembers = currentMembers.entries;

    // get next available uidNumber
    nextUID = currentMembers[currentMembers.length - 1]["uidNumber"];
    nextUID++;

    apiResults.forEach(e => {

        var index;

        if (Boolean(currentMembers.find( function (m, key) { index = key; return ( m.mail == e.Email ) } )) || 
                Boolean(currentMembers.find( function (m, key) { index = key; return ( m.mobile == e.PhoneNumber ) } )) ||
                    Boolean(currentMembers.find( function (m, key) { index = key; return ( m.employeeNumber == e.PhoneNumber ) } )))
        {
            // Make sure all attributes are up to date
            var m = currentMembers[index];
            modifyLDAP(m.dn, e, m);
        }
        else
        {
            // if user is not in ldap - add to ldap
            addLDAP(e);
        }
        
    });
}

async function searchReturnAll()
{

    var client = ldap.createClient({
        url: conf.ldapsUrl,
        reconnect: true,
        tlsOptions: {
            host: conf.ldapHost,
            port: conf.ldapPort,
            ca: [fs.readFileSync(conf.tlsCertPath)]
        }
    });
    Promise.promisifyAll(client);

    var searchOptions = {
        scope: 'sub',
        filter: '(uidNumber=*)',
        attributes: ['dn', 'uidNumber', 'uid', 'employeeNumber', 'mail', 'mobile']
    }

    client.bindAsync(conf.bindDn, conf.bindSecret);

    const results = await client.searchReturnAll(conf.searchBase, searchOptions);
    return results;
}

async function doSearch(member) {

    var client = ldap.createClient({
        url: conf.ldapsUrl,
        reconnect: true,
        tlsOptions: {
            host: conf.ldapHost,
            port: conf.ldapPort,
            ca: [fs.readFileSync(conf.tlsCertPath)]
        }
    });
    Promise.promisifyAll(client);

    client.bindAsync(conf.bindDn, conf.bindSecret);

    var searchOptions = {
        scope: 'sub',
        filter: '(employeeNumber='+member.MemberID+')',
        attributes: ['uid']
    }

    await client.searchAsync(conf.searchBase, searchOptions)
        .then(function (res) { // Handle the search result processing
            res.on('searchEntry', function (entry) {
                // If the member exists in ldap with that student ID, it will return true here.
                //console.log(entry.object);
                return true;
            });
            res.on('error', function (err) {
                console.log('Error is', err);
            });
            res.on('end', function (result) {
                //console.log("here1");
            });
        })  
        .catch(function (err) { // Catch potential errors and handle them
            console.error('Error on search', err);
        });

    //client.destroy();
}

async function getMemberInfo() {
    try {
        // Making a post request to socs website to get JSON info
        var res = await axios.post(conf.socsurl, null, { params: APIOptions });
        return res.data.Response.data;
    } catch (err) {
        return err;
    }
}

async function addLDAP(member) {

    var client = ldap.createClient({
        url: conf.ldapsUrl,
        reconnect: true,
        tlsOptions: {
            host: conf.ldapHost,
            port: conf.ldapPort,
            ca: [fs.readFileSync(conf.tlsCertPath)]
        }
    });
    Promise.promisifyAll(client);

    if (!member.FirstName) member.FirstName = 'N/A';
    if (!member.LastName) member.LastName = 'N/A';
    if (!member.PhoneNumber) member.PhoneNumber = 'N/A';
    var uid = member.Email.split("@")[0].replace('.', '');

    if (member.Email && member.MemberID)
    {
        var entry = {
            cn: member.FirstName + " " + member.LastName,
            mail: [member.Email],
            employeeNumber: member.MemberID,
            gecos: member.FirstName + " " + member.LastName,
            gidNumber: '100',
            givenName: member.FirstName,
            homeDirectory: '/home/users/' + uid,
            loginShell: '/bin/bash',
            mobile: member.PhoneNumber,
            objectClass: ['inetOrgPerson', 'posixAccount', 'top', 'shadowAccount'],
            userPassword: crypto.randomBytes(20).toString('hex'),
            shadowMax: '99999',
            shadowWarning: '7',
            sn: member.LastName,
            uidNumber: nextUID
        };

        nextUID++;

        // client.bind sets up for authentication
        client.bindAsync(conf.bindDn, conf.bindSecret);

        client.addAsync('uid=' + uid + ',ou=inactivepeople,' + conf.searchBase, entry, function(err) {
            if (err) {
                console.log(member);
                console.log(entry);
                console.log(err);
                return false;
            }
        });

        return true;
    }
    else
    {
        return false;
    }
}

async function modifyLDAP(uidPath, apiMemberInfo, ldapMemberInfo) {

    if (apiMemberInfo.PhoneNumber != ldapMemberInfo.mobile && apiMemberInfo.PhoneNumber != '') 
    {
        var client = ldap.createClient({
            url: conf.ldapsUrl,
            reconnect: true,
            tlsOptions: {
                host: conf.ldapHost,
                port: conf.ldapPort,
                ca: [fs.readFileSync(conf.tlsCertPath)]
            }
        });
        Promise.promisifyAll(client);

        // client.bind sets up for authentication
        client.bindAsync(conf.bindDn, conf.bindSecret);

        if (ldapMemberInfo.mobile == undefined)
        {
            var operation = 'add';
        }
        else
        {
            var operation = 'replace';
        }

        var change = new ldap.Change({
            operation: operation,
            modification: {
                mobile: apiMemberInfo.PhoneNumber
            }
        });

        client.modifyAsync(uidPath, change, function (err) {
            if (err)
            {
                console.log(err);
                console.log(apiMemberInfo);
            }
        });
    }

    if (apiMemberInfo.Email != ldapMemberInfo.mail && apiMemberInfo.Email != undefined) 
    {

        var client = ldap.createClient({
            url: conf.ldapsUrl,
            reconnect: true,
            tlsOptions: {
                host: conf.ldapHost,
                port: conf.ldapPort,
                ca: [fs.readFileSync(conf.tlsCertPath)]
            }
        });
        Promise.promisifyAll(client);

        // client.bind sets up for authentication
        client.bindAsync(conf.bindDn, conf.bindSecret);

        if (ldapMemberInfo.mail == undefined)
        {
            var operation = 'add';
        }
        else
        {
            var operation = 'replace';
        }

        var change = new ldap.Change({
            operation: operation,
            modification: {
                mail: apiMemberInfo.Email
            }
        });

        client.modifyAsync(uidPath, change);
    }

    if (apiMemberInfo.MemberID != ldapMemberInfo.employeeNumber && apiMemberInfo.MemberID != undefined) 
    {

        var client = ldap.createClient({
            url: conf.ldapsUrl,
            reconnect: true,
            tlsOptions: {
                host: conf.ldapHost,
                port: conf.ldapPort,
                ca: [fs.readFileSync(conf.tlsCertPath)]
            }
        });
        Promise.promisifyAll(client);

        // client.bind sets up for authentication
        client.bindAsync(conf.bindDn, conf.bindSecret);

        if (ldapMemberInfo.employeeNumber == undefined)
        {
            var operation = 'add';
        }
        else
        {
            var operation = 'replace';
        }

        var change = new ldap.Change({
            operation: operation,
            modification: {
                employeeNumber: apiMemberInfo.MemberID
            }
        });

        client.modifyAsync(uidPath, change);
    }

}