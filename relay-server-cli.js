#!/usr/bin/env node
var argv = require("optimist")
    .usage("Usage: $0 --relayPort [port] --servicePort [port]"
    + " [--hostname [IP]] [--secret [key]] [--tls] [--pfx [file]]"
    + " [--passphrase [passphrase]]")
    .demand(['relayPort', 'servicePort'])
    .string('secret')
    .default('tls', false)
    .string('pfx')
    .default('pfx', 'cert.pfx')
    .string('passphrase')
    .default('passphrase', 'abcd')
    .argv;

var options = {
    hostname: argv.hostname,
    secret: argv.secret,
	tls: argv.tls,
    pfx: argv.pfx,
    passphrase: argv.passphrase
};

var relayServer = require("./relay-server.js");

var newRelayServer = relayServer.createRelayServer(argv.relayPort,
argv.servicePort, options);

process.on("uncaughtException", function(err) {
    console.log(err);
});

process.on("SIGINT", function() {
    newRelayServer.end();
});
