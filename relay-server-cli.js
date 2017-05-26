#!/usr/bin/env node
var argv = require("optimist")
    .usage('Usage: $0 --relayPort [port] --servicePort [port] [--auth]')
    .demand(['relayPort', 'servicePort'])
    .boolean('auth')
    .argv;

var options = {
	auth: argv.auth
};

var relayServer = require("./relay-server.js");

var newRelayServer = relayServer.createRelayServer(argv.relayPort, argv.servicePort, options);

process.on("uncaughtException", function (err) {
    console.log(err);
});

process.on("SIGINT", function() {
    newRelayServer.end();    
});