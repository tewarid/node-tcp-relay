#!/usr/bin/env node
var argv = require("optimist")
    .usage("Usage: $0 --host [host] --port [port] --relayHost [host]"
    + " --relayPort [port] [--numConn [count]] [--secret [key]] [--tls]"
    + " [--rejectUnauthorized]")
    .demand(['host', 'port', 'relayHost', 'relayPort'])
    .default('numConn', 1)
    .default('tls', false)
    .default('rejectUnauthorized', false)
    .argv;

var options = {
    numConn: argv.numConn,
	tls: argv.tls,
    secret: argv.secret,
    rejectUnauthorized: argv.rejectUnauthorized
};

var relayClient = require("./relay-client.js");

var newRelayClient = relayClient.createRelayClient(argv.host, argv.port,
    argv.relayHost, argv.relayPort, options);

process.on("uncaughtException", function(err) {
    console.log(err);
});

process.on("SIGINT", function() {
    newRelayClient.end();
});
