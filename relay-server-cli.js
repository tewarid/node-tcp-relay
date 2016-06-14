#!/usr/bin/env node
var argv = require("optimist")
    .usage('Usage: $0 --relayPort [port] --servicePort [port]')
    .demand(['relayPort', 'servicePort'])
    .argv;

console.info(argv);

var relayServer = require("./relay-server.js");

var newRelayServer = relayServer.createRelayServer(argv.relayPort, argv.servicePort);

process.on("uncaughtException", function (err) {
    console.info(err);
});

process.on("SIGINT", function() {
    newRelayServer.end();    
});